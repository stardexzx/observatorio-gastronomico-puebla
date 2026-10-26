import pg from "pg";
import {
  normalizePerson,
  validateSubmission,
  decodeUpload,
  fail,
  roles,
} from "./editor-validation.mjs";
import {
  verifyPassword,
  hashPassword,
  sessionHash,
  newSession,
} from "./auth.mjs";

export function createEditorStore(connectionString) {
  const pool = new pg.Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
  });
  pool.on("error", (error) =>
    console.error("Conexión editorial interrumpida:", error.code || "error"),
  );
  let dummyHash;
  async function transaction(actor, work) {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT set_config('ogp.actor_id',$1,true)", [actor.id]);
      const result = await work(c);
      await c.query("COMMIT");
      return result;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  async function requirePermission(
    c,
    actor,
    action,
    id = null,
    module = "persona",
  ) {
    const { rows } = await c.query(
      "SELECT ogp.tiene_permiso($1,$2,$3,$4) AS ok",
      [actor.id, module, action, id],
    );
    if (!rows[0].ok) fail(403, "Tu cuenta no tiene permiso para esta acción.");
  }
  async function row(c, actor, id, lock = false) {
    const { rows } = await c.query(
      `SELECT p.id,p.nombre_publico,p.semblanza,p.trayectoria,r.creado_por,e.datos,e.version,e.enviada_version,e.fuente_id,e.consentimiento_id,
   v.estado_ultima_revision,v.ultima_revision_id,v.revision_publica_id FROM ogp.personas p JOIN ogp.registros r ON r.id=p.id
   LEFT JOIN ogp.editor_personas e ON e.persona_id=p.id LEFT JOIN ogp.v_estado_editorial v ON v.id=p.id WHERE p.id=$1 ${lock ? "FOR UPDATE OF r" : ""}`,
      [id],
    );
    if (!rows[0]) fail(404, "No se encontró la ficha.");
    const own = rows[0].creado_por === actor.id;
    const check = await c.query(
      "SELECT ogp.tiene_permiso($1,'persona','validar',$2) OR ogp.tiene_permiso($1,'persona','publicar',$2) OR ogp.tiene_permiso($1,'persona','editar',$2) OR ($3::boolean AND ogp.tiene_permiso($1,'persona','crear')) OR ogp.tiene_permiso($1,'consentimientos','validar') AS ok",
      [actor.id, id, own],
    );
    if (!check.rows[0].ok) fail(403, "No tienes acceso a esta ficha.");
    return rows[0];
  }
  async function detail(c, actor, id) {
    const r = await row(c, actor, id);
    const files = (
      await c.query(
        "SELECT id,clase,nombre,mime,metadatos,octet_length(contenido) AS size FROM ogp.editor_archivos WHERE persona_id=$1 ORDER BY creado_en",
        [id],
      )
    ).rows;
    const consent = r.consentimiento_id
      ? (
          await c.query(
            "SELECT id,estado,verificado_en,ogp.consentimiento_valido(id) AS vigente FROM ogp.consentimientos WHERE id=$1",
            [r.consentimiento_id],
          )
        ).rows[0]
      : null;
    const data = r.datos || {
      name: r.nombre_publico,
      biography: r.semblanza || "",
      trajectory: r.trayectoria || "",
    };
    return {
      id,
      data,
      version: r.version || 0,
      status:
        r.enviada_version && r.version > r.enviada_version
          ? "borrador"
          : r.estado_ultima_revision,
      revisionId: r.ultima_revision_id,
      publishedRevisionId: r.revision_publica_id,
      consent,
      files,
    };
  }
  async function sync(c, actor, id, data, previous) {
    const municipality = (
      await c.query(
        "SELECT territorio_id FROM ogp.municipios_puebla WHERE cvegeo=$1",
        [data.municipalityCode],
      )
    ).rows[0];
    if (!municipality) fail(422, "El municipio no está disponible.");
    for (const [field, type] of [
      ["recipeIds", "receta"],
      ["marketIds", "mercado"],
    ]) {
      if (data[field].length) {
        const result = await c.query(
          "SELECT count(*) FROM ogp.v_fichas_publicas WHERE tipo=$1 AND registro_id=ANY($2::uuid[])",
          [type, data[field]],
        );
        if (Number(result.rows[0].count) !== data[field].length)
          fail(
            422,
            "Alguna ficha relacionada ya no está publicada. Actualiza la selección.",
          );
      }
    }
    if (data.mediaIds.length) {
      const result = await c.query(
        "SELECT count(*) FROM ogp.editor_archivos WHERE persona_id=$1 AND id=ANY($2::uuid[]) AND clase<>'consentimiento'",
        [id, data.mediaIds],
      );
      if (Number(result.rows[0].count) !== data.mediaIds.length)
        fail(422, "Algún archivo no pertenece a esta ficha.");
    }
    await c.query(
      "UPDATE ogp.personas SET nombre_publico=$2,semblanza=$3,trayectoria=$4,experiencia_estimada_anios=$5,experiencia_fecha_referencia=$6 WHERE id=$1",
      [
        id,
        data.name,
        data.biography || null,
        data.trajectory || null,
        data.yearsExperience,
        data.experienceDate,
      ],
    );
    await c.query(
      "DELETE FROM ogp.persona_tipos_participacion WHERE persona_id=$1",
      [id],
    );
    const code =
      data.role === "Portadora o portador de saberes"
        ? "saberes"
        : data.role === "Colectivo comunitario"
          ? "otra"
          : "cocina";
    await c.query(
      "INSERT INTO ogp.persona_tipos_participacion SELECT $1,id FROM ogp.tipos_participacion WHERE codigo=$2",
      [id, code],
    );
    for (const [field, table, relation, column] of [
      ["languages", "lenguas", "persona_lenguas", "lengua_id"],
      [
        "specialties",
        "especialidades",
        "persona_especialidades",
        "especialidad_id",
      ],
    ]) {
      await c.query(`DELETE FROM ogp.${relation} WHERE persona_id=$1`, [id]);
      for (const label of data[field]) {
        const term = (
          await c.query(
            `INSERT INTO ogp.${table}(codigo,nombre) VALUES('captura-'||md5(lower($1)),$1) ON CONFLICT(codigo) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING id`,
            [label],
          )
        ).rows[0];
        await c.query(
          `INSERT INTO ogp.${relation}(persona_id,${column}) VALUES($1,$2)`,
          [id, term.id],
        );
      }
    }
    let source = previous?.fuente_id;
    await c.query("DELETE FROM ogp.persona_fuentes WHERE persona_id=$1", [id]);
    await c.query("DELETE FROM ogp.persona_territorios WHERE persona_id=$1", [
      id,
    ]);
    if (data.source.type && data.source.reference) {
      const type = (
        await c.query(
          "SELECT id,nombre FROM ogp.tipos_fuente WHERE codigo=$1 AND activo",
          [data.source.type],
        )
      ).rows[0];
      if (!type) fail(422, "Selecciona un tipo de fuente disponible.");
      if (source)
        await c.query(
          "UPDATE ogp.fuentes SET tipo_id=$2,titulo=$3,referencia=$4,cita_publica=$4,fecha_consulta=coalesce($5,current_date) WHERE id=$1",
          [
            source,
            type.id,
            `${type.nombre}: ${data.name}`,
            data.source.reference,
            data.source.consultationDate,
          ],
        );
      else
        source = (
          await c.query(
            "INSERT INTO ogp.fuentes(tipo_id,titulo,referencia,cita_publica,fecha_consulta,visibilidad,creado_por) VALUES($1,$2,$3,$3,coalesce($4,current_date),'publico',$5) RETURNING id",
            [
              type.id,
              `${type.nombre}: ${data.name}`,
              data.source.reference,
              data.source.consultationDate,
              actor.id,
            ],
          )
        ).rows[0].id;
      await c.query(
        "INSERT INTO ogp.persona_fuentes(persona_id,fuente_id,afirmacion) VALUES($1,$2,$3)",
        [id, source, "Documentación de la ficha y sus elementos públicos."],
      );
      await c.query(
        "INSERT INTO ogp.persona_territorios(persona_id,territorio_id,tipo_vinculo,fuente_id,descripcion_publica) VALUES($1,$2,'documentacion',$3,$4)",
        [id, municipality.territorio_id, source, data.community],
      );
    }
    let consent = previous?.consentimiento_id;
    const cc = data.consent,
      complete =
        cc.requested &&
        cc.authorizer &&
        cc.capacity &&
        cc.date &&
        cc.scope &&
        cc.allowedUse;
    if (complete) {
      const previousConsent = consent
        ? (
            await c.query(
              "SELECT estado FROM ogp.consentimientos WHERE id=$1",
              [consent],
            )
          ).rows[0]
        : null;
      const unchanged =
        previous?.datos?.consent &&
        JSON.stringify(normalizePerson(previous.datos).consent) ===
          JSON.stringify(cc);
      if (
        !previousConsent ||
        (["activo", "revocado", "sustituido"].includes(
          previousConsent.estado,
        ) &&
          !unchanged)
      )
        consent = null;
      if (!consent)
        consent = (
          await c.query(
            "INSERT INTO ogp.consentimientos(persona_id,autoriza,calidad_autorizante,fecha,vence_en,alcance,uso_permitido,creado_por) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",
            [
              id,
              cc.authorizer,
              cc.capacity,
              cc.date,
              cc.expires,
              cc.scope,
              cc.allowedUse,
              actor.id,
            ],
          )
        ).rows[0].id;
      else if (previousConsent.estado === "pendiente")
        await c.query(
          "UPDATE ogp.consentimientos SET autoriza=$2,calidad_autorizante=$3,fecha=$4,vence_en=$5,alcance=$6,uso_permitido=$7 WHERE id=$1",
          [
            consent,
            cc.authorizer,
            cc.capacity,
            cc.date,
            cc.expires,
            cc.scope,
            cc.allowedUse,
          ],
        );
    }
    await c.query(
      "UPDATE ogp.editor_personas SET datos=$2,fuente_id=$3,consentimiento_id=$4,actualizada_en=now() WHERE persona_id=$1",
      [id, JSON.stringify(data), source || null, consent || null],
    );
    await c.query("UPDATE ogp.registros SET actualizado_en=now() WHERE id=$1", [
      id,
    ]);
  }
  return {
    close: () => pool.end(),
    async login(email, password) {
      const r = (
        await pool.query(
          "SELECT u.id,c.password_hash FROM ogp.usuarios u JOIN ogp.editor_credenciales c ON c.usuario_id=u.id WHERE u.correo=$1 AND u.estado='activo'",
          [email.toLowerCase().trim()],
        )
      ).rows[0];
      dummyHash ||= await hashPassword("not-a-login-password");
      if (
        !(await verifyPassword(password, r?.password_hash || dummyHash)) ||
        !r
      )
        fail(401, "Correo o contraseña incorrectos.");
      const token = newSession();
      await pool.query("DELETE FROM ogp.editor_sesiones WHERE vence_en<=now()");
      await pool.query(
        "INSERT INTO ogp.editor_sesiones(token_hash,usuario_id) VALUES($1,$2)",
        [sessionHash(token), r.id],
      );
      return { token, user: await this.session(token) };
    },
    async session(token) {
      if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
      const r = (
        await pool.query(
          "SELECT u.id,u.nombre AS name,u.correo AS email FROM ogp.editor_sesiones s JOIN ogp.usuarios u ON u.id=s.usuario_id WHERE s.token_hash=$1 AND s.vence_en>now() AND u.estado='activo'",
          [sessionHash(token)],
        )
      ).rows[0];
      if (!r) return null;
      const flags = (
        await pool.query(
          "SELECT ogp.tiene_permiso($1,'persona','crear') AS crear,ogp.tiene_permiso($1,'persona','editar') AS editar,ogp.tiene_permiso($1,'persona','validar') AS validar,ogp.tiene_permiso($1,'persona','publicar') AS publicar,ogp.tiene_permiso($1,'persona','retirar') AS retirar,ogp.tiene_permiso($1,'consentimientos','validar') AS consentimiento",
          [r.id],
        )
      ).rows[0];
      return { ...r, permissions: flags };
    },
    async logout(token) {
      if (token)
        await pool.query(
          "DELETE FROM ogp.editor_sesiones WHERE token_hash=$1",
          [sessionHash(token)],
        );
    },
    async options(actor, search = "") {
      return transaction(actor, async (c) => {
        if (!Object.values(actor.permissions).some(Boolean))
          fail(403, "No tienes permisos editoriales.");
        const sources = (
          await c.query(
            "SELECT codigo AS code,nombre AS name FROM ogp.tipos_fuente WHERE activo ORDER BY nombre",
          )
        ).rows;
        const municipalities = (
          await c.query("SELECT ogp.consultar_municipios() AS items")
        ).rows[0].items;
        const recipes = (
          await c.query(
            "SELECT registro_id AS id,contenido#>>'{ficha,titulo}' AS name FROM ogp.consultar_fichas('receta',$1,100,0)",
            [search],
          )
        ).rows;
        const markets = (
          await c.query(
            "SELECT registro_id AS id,contenido#>>'{ficha,nombre}' AS name FROM ogp.consultar_fichas('mercado',$1,100,0)",
            [search],
          )
        ).rows;
        return { roles, sources, municipalities, recipes, markets };
      });
    },
    async list(actor, { search = "", status = "" } = {}) {
      return transaction(actor, async (c) => {
        const { rows } = await c.query(
          `SELECT p.id,p.nombre_publico AS name,e.version,e.enviada_version,e.datos->>'municipalityCode' AS municipality_code,e.datos->>'community' AS community,
     CASE WHEN e.version>coalesce(e.enviada_version,0) THEN 'borrador' ELSE v.estado_ultima_revision END AS status,r.actualizado_en AS updated_at,
     t.nombre AS municipality FROM ogp.personas p JOIN ogp.registros r ON r.id=p.id LEFT JOIN ogp.editor_personas e ON e.persona_id=p.id
     LEFT JOIN ogp.v_estado_editorial v ON v.id=p.id LEFT JOIN ogp.municipios_puebla m ON m.cvegeo=e.datos->>'municipalityCode'
     LEFT JOIN ogp.territorios t ON t.id=m.territorio_id
     WHERE r.archivado_en IS NULL AND ((r.creado_por=$1 AND ogp.tiene_permiso($1,'persona','crear')) OR ogp.tiene_permiso($1,'persona','validar',p.id) OR ogp.tiene_permiso($1,'persona','publicar',p.id) OR ogp.tiene_permiso($1,'persona','editar',p.id) OR ogp.tiene_permiso($1,'consentimientos','validar'))
     AND (p.nombre_publico ILIKE '%'||$2||'%' OR coalesce(e.datos->>'community','') ILIKE '%'||$2||'%') ORDER BY r.actualizado_en DESC LIMIT 200`,
          [actor.id, search],
        );
        return {
          items: rows.filter((r) => !status || r.status === status),
          limited: rows.length === 200,
        };
      });
    },
    detail: (actor, id) => transaction(actor, (c) => detail(c, actor, id)),
    async create(actor, input) {
      const data = normalizePerson(input);
      return transaction(actor, async (c) => {
        await requirePermission(c, actor, "crear");
        const id = (
          await c.query("SELECT ogp.crear_registro($1,'persona') AS id", [
            actor.id,
          ])
        ).rows[0].id;
        await c.query(
          "INSERT INTO ogp.personas(id,nombre_publico) VALUES($1,$2)",
          [id, data.name],
        );
        await c.query(
          "INSERT INTO ogp.editor_personas(persona_id) VALUES($1)",
          [id],
        );
        await sync(c, actor, id, data, null);
        return detail(c, actor, id);
      });
    },
    async save(actor, id, input, version) {
      const data = normalizePerson(input);
      return transaction(actor, async (c) => {
        await requirePermission(c, actor, "editar", id);
        const previous = await row(c, actor, id, true);
        if (!Number.isInteger(version) || version !== (previous.version || 0))
          fail(
            409,
            "La ficha cambió en otra sesión. Recarga antes de volver a guardar.",
          );
        if (
          previous.datos &&
          JSON.stringify(normalizePerson(previous.datos)) ===
            JSON.stringify(data)
        )
          return detail(c, actor, id);
        await c.query(
          "INSERT INTO ogp.editor_personas(persona_id,version) VALUES($1,0) ON CONFLICT DO NOTHING",
          [id],
        );
        await sync(c, actor, id, data, previous);
        await c.query(
          "UPDATE ogp.editor_personas SET version=version+1 WHERE persona_id=$1",
          [id],
        );
        return detail(c, actor, id);
      });
    },
    async upload(actor, id, payload) {
      const file = decodeUpload(payload);
      return transaction(actor, async (c) => {
        await requirePermission(c, actor, "editar", id);
        await row(c, actor, id);
        const r = (
          await c.query(
            "INSERT INTO ogp.editor_archivos(persona_id,clase,nombre,mime,contenido,metadatos) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,clase,nombre,mime,metadatos,octet_length(contenido) AS size",
            [
              id,
              file.kind,
              file.name,
              file.mime,
              file.bytes,
              JSON.stringify(file.meta),
            ],
          )
        ).rows[0];
        return r;
      });
    },
    async privateFile(actor, id) {
      return transaction(actor, async (c) => {
        const r = (
          await c.query(
            "SELECT persona_id,nombre,mime,contenido FROM ogp.editor_archivos WHERE id=$1",
            [id],
          )
        ).rows[0];
        if (!r) fail(404, "Archivo no encontrado.");
        await row(c, actor, r.persona_id);
        return r;
      });
    },
    async action(actor, id, action, payload = {}) {
      return transaction(actor, async (c) => {
        const r = await row(c, actor, id, true),
          data = r.datos;
        if (!data) fail(422, "Guarda la ficha antes de continuar.");
        if (action === "verificar-consentimiento") {
          await requirePermission(c, actor, "validar", null, "consentimientos");
          if (
            !data.consent?.requested ||
            !r.consentimiento_id ||
            !data.consent.evidenceId
          )
            fail(
              422,
              "Completa la autorización y adjunta la evidencia privada antes de verificar.",
            );
          const file = (
            await c.query(
              "SELECT * FROM ogp.editor_archivos WHERE id=$1 AND persona_id=$2 AND clase='consentimiento'",
              [data.consent.evidenceId, id],
            )
          ).rows[0];
          if (!file) fail(422, "La evidencia no pertenece a esta ficha.");
          let evidence = file.archivo_evidencia_id;
          if (!evidence) {
            evidence = (
              await c.query(
                "INSERT INTO ogp.archivos(proveedor,clave_externa,nombre,tipo_mime,estado,visibilidad,creado_por) VALUES('ogp-postgres',$1,$2,$3,'disponible','restringido',$4) RETURNING id",
                [file.id, file.nombre, file.mime, actor.id],
              )
            ).rows[0].id;
            await c.query(
              "UPDATE ogp.editor_archivos SET archivo_evidencia_id=$2 WHERE id=$1",
              [file.id, evidence],
            );
          }
          await c.query(
            "INSERT INTO ogp.consentimiento_archivos VALUES($1,$2) ON CONFLICT DO NOTHING",
            [r.consentimiento_id, evidence],
          );
          await c.query(
            "INSERT INTO ogp.consentimiento_registros VALUES($1,$2) ON CONFLICT DO NOTHING",
            [r.consentimiento_id, id],
          );
          const state = (
            await c.query("SELECT ogp.consentimiento_valido($1) AS ok", [
              r.consentimiento_id,
            ])
          ).rows[0];
          if (!state.ok)
            await c.query("SELECT ogp.activar_consentimiento($1,$2)", [
              actor.id,
              r.consentimiento_id,
            ]);
        } else if (action === "enviar") {
          await requirePermission(c, actor, "enviar", id);
          validateSubmission(data);
          if (
            !(
              await c.query("SELECT ogp.consentimiento_valido($1) AS ok", [
                r.consentimiento_id,
              ])
            ).rows[0].ok
          )
            fail(422, "El consentimiento necesita verificación vigente.");
          await c.query("SELECT ogp.enviar_revision($1,$2)", [actor.id, id]);
          await c.query(
            "UPDATE ogp.editor_personas SET enviada_version=version WHERE persona_id=$1",
            [id],
          );
        } else if (action === "revisar" || action === "publicar") {
          if (!r.ultima_revision_id || r.version !== r.enviada_version)
            fail(409, "Hay cambios sin enviar a revisión.");
          if (action === "revisar") {
            await requirePermission(c, actor, "validar", id);
            if (!["validado", "correcciones"].includes(payload.verdict))
              fail(422, "Selecciona el dictamen.");
            if (payload.verdict === "correcciones" && !payload.notes?.trim())
              fail(422, "Describe las correcciones necesarias.");
            await c.query("SELECT ogp.evaluar_revision($1,$2,$3,$4)", [
              actor.id,
              r.ultima_revision_id,
              payload.verdict,
              (payload.notes || "").slice(0, 4000) || null,
            ]);
          } else {
            await requirePermission(c, actor, "publicar", id);
            await c.query("SELECT ogp.publicar_revision($1,$2)", [
              actor.id,
              r.ultima_revision_id,
            ]);
          }
        } else if (action === "revocar-consentimiento") {
          if (!r.consentimiento_id)
            fail(422, "No hay un consentimiento para revocar.");
          await c.query("SELECT ogp.revocar_consentimiento($1,$2)", [
            actor.id,
            r.consentimiento_id,
          ]);
        } else if (action === "retirar") {
          if (!payload.notes?.trim()) fail(422, "Indica el motivo del retiro.");
          await c.query("SELECT ogp.retirar_publicacion($1,$2,$3)", [
            actor.id,
            id,
            payload.notes.slice(0, 4000),
          ]);
        } else fail(404, "Acción no encontrada.");
        return detail(c, actor, id);
      });
    },
  };
}
