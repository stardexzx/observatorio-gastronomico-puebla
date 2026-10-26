import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import pg from "pg";
import { createStore } from "../server/database.mjs";
import { createEditorStore } from "../server/editor-store.mjs";
import { createApi } from "../server/app.mjs";
import { hashPassword } from "../server/auth.mjs";
const name = `ogp_editor_test_${randomBytes(6).toString("hex")}`,
  url = new URL(process.env.DATABASE_URL);
const config = {
  host: url.hostname,
  port: Number(url.port || 5432),
  user: "ogp_admin",
  password: process.env.POSTGRES_PASSWORD,
};
const admin = new pg.Pool({ ...config, database: "postgres" });
const file = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const password = "password-sintetico-exclusivo-de-pruebas";
let owner,
  store,
  editor,
  server,
  base,
  cookie,
  id,
  data,
  record,
  created = false,
  photoId,
  audioId,
  evidenceId;
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK9sAAAAASUVORK5CYII=";
async function account(email, roles) {
  const actor = (
    await owner.query(
      "INSERT INTO ogp.usuarios(correo,nombre,estado) VALUES($1,$2,'activo') RETURNING id",
      [email, email],
    )
  ).rows[0].id;
  await owner.query("INSERT INTO ogp.editor_credenciales VALUES($1,$2)", [
    actor,
    await hashPassword(password),
  ]);
  await owner.query(
    "INSERT INTO ogp.usuario_roles(usuario_id,rol_id) SELECT $1,id FROM ogp.roles WHERE codigo=ANY($2::text[])",
    [actor, roles],
  );
  await owner.query(
    "INSERT INTO ogp.usuario_modulos VALUES($1,'persona'),($1,'consentimientos')",
    [actor],
  );
  return actor;
}
before(async () => {
  await admin.query(`CREATE DATABASE ${name}`);
  created = true;
  owner = new pg.Pool({ ...config, database: name });
  for (const script of [
    "database/observatorio_puebla.sql",
    "database/public_api.sql",
    "database/editorial.sql",
    "database/municipal_map.sql",
    "tests/fixtures/publications.sql",
  ])
    await owner.query(await file(script));
  const actor = await account("editor-test@invalid.example", [
    "capturista",
    "revisor",
    "publicador",
    "verificador_consentimientos",
  ]);
  await account("captura-test@invalid.example", ["capturista"]);
  const source = (await owner.query("SELECT id FROM ogp.fuentes LIMIT 1"))
    .rows[0].id;
  const geo = JSON.parse(await file("public/maps/puebla-municipios.geojson"));
  for (const f of geo.features) {
    let territory = (
      await owner.query(
        "SELECT territorio_id FROM ogp.municipios_puebla WHERE cvegeo=$1",
        [f.properties.cvegeo],
      )
    ).rows[0]?.territorio_id;
    if (!territory)
      territory = (
        await owner.query(
          "INSERT INTO ogp.territorios(tipo_id,nombre) SELECT id,$1 FROM ogp.tipos_territorio WHERE codigo='municipio' RETURNING id",
          [f.properties.nomgeo],
        )
      ).rows[0].id;
    await owner.query(
      "INSERT INTO ogp.municipios_puebla(territorio_id,cve_mun,geometria,version_fuente,fuente_id) VALUES($1,$2,ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($3),4326))),'Referencia HTML para pruebas',$4) ON CONFLICT(territorio_id) DO UPDATE SET geometria=EXCLUDED.geometria",
      [territory, f.properties.cve_mun, JSON.stringify(f.geometry), source],
    );
  }
  url.pathname = "/" + name;
  store = createStore(url.toString());
  const editUrl = new URL(process.env.EDITOR_DATABASE_URL);
  editUrl.pathname = "/" + name;
  editor = createEditorStore(editUrl.toString());
  server = createApi(store, {
    editor,
    onError: (error) => {
      if (!error.status)
        console.log("SQL diagnostic:", error.code, error.message);
    },
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
  const login = await call("editor/session", {
    method: "POST",
    body: { email: "editor-test@invalid.example", password },
    auth: false,
  });
  cookie = login.response.headers.get("set-cookie").split(";")[0];
  assert.equal(login.response.status, 200);
  const recipe = (await call("recetas")).body.items[0].id,
    market = (await call("mercados")).body.items[0].id;
  data = {
    name: "Persona registrada sintética",
    role: "Cocinera tradicional",
    municipalityCode: "21114",
    community: "Comunidad de prueba",
    region: "Región documentada",
    biography: "Semblanza sintética para la integración.",
    trajectory: "Trayectoria sintética.",
    quote: "Frase pública autorizada.",
    collective: "Colectivo de prueba",
    establishment: "Cocina de prueba",
    recognitions: "Reconocimiento documentado de prueba",
    lineage: ["Generación anterior", "Transmisión actual"],
    languages: ["Español", "Náhuatl"],
    specialties: ["Moles", "Tamales"],
    yearsExperience: 20,
    experienceDate: "2025-01-01",
    students: 12,
    recipeIds: [recipe],
    marketIds: [market],
    mediaIds: [],
    source: {
      type: "entrevista",
      reference: "Cita pública sintética.",
      consultationDate: "2025-01-01",
    },
    consent: {
      requested: true,
      authorizer: "AUTORIZANTE PRIVADO DE PRUEBA",
      capacity: "Titular",
      date: "2025-01-01",
      expires: null,
      scope: "Ficha y multimedia de prueba",
      allowedUse: "Consulta en el Observatorio",
      evidenceId: "",
    },
  };
});
after(async () => {
  if (server) await new Promise((r) => server.close(r));
  if (store) await store.close();
  if (editor) await editor.close();
  if (owner) await owner.end();
  if (created) await admin.query(`DROP DATABASE ${name} WITH(FORCE)`);
  await admin.end();
});
async function call(
  path,
  { method = "GET", body, auth = true, origin = base } = {},
) {
  const response = await fetch(`${base}/api/${path}`, {
    method,
    headers: {
      ...(auth && cookie ? { Cookie: cookie } : {}),
      ...(method !== "GET"
        ? { "Content-Type": "application/json", Origin: origin }
        : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = response.headers
    .get("content-type")
    ?.startsWith("application/json")
    ? await response.json()
    : Buffer.from(await response.arrayBuffer());
  return { response, body: result };
}
async function ok(path, opts, expected = 200) {
  const r = await call(path, opts);
  assert.equal(
    r.response.status,
    expected,
    `${path}: ${JSON.stringify(r.body)}`,
  );
  return r.body;
}
async function action(action, body = {}) {
  record = await ok(`editor/personas/${id}/${action}`, {
    method: "POST",
    body,
  });
  return record;
}
test("el mapa importa 217 municipios sin inventar registros ni puntos de personas", async () => {
  const map = await ok("mapa-municipal?tipos=persona");
  assert.equal(map.features.length, 217);
  assert.equal(new Set(map.features.map((f) => f.properties.code)).size, 217);
  assert.equal(map.points.length, 0);
  assert.ok(map.features.every((f) => f.geometry.type === "MultiPolygon"));
  assert.ok(map.features.some((f) => f.properties.total === 0));
  assert.equal(
    (await call("mapa-municipal?desde=2026-99-30")).response.status,
    400,
  );
  assert.equal(
    (await call("mapa-municipal?tipos=usuario")).response.status,
    400,
  );
});
test("captura requiere sesión, origen correcto y permisos; no acepta actores del cliente", async () => {
  assert.equal(
    (await call("editor/personas", { auth: false })).response.status,
    401,
  );
  assert.equal(
    (
      await call("editor/personas", {
        method: "POST",
        body: data,
        origin: "https://ajeno.invalid",
      })
    ).response.status,
    403,
  );
  const result = await ok(
    "editor/personas",
    {
      method: "POST",
      body: { ...data, actorId: "00000000-0000-0000-0000-000000000000" },
    },
    201,
  );
  record = result;
  id = result.id;
  assert.equal((await call(`cocineras/${id}`)).response.status, 404);
  assert.equal(
    (await ok("mapa-municipal?tipos=persona")).records.some((r) => r.id === id),
    false,
  );
  assert.equal(
    (await call(`editor/personas/${id}/enviar`, { method: "POST", body: {} }))
      .response.status,
    422,
  );
  const stored = (
    await owner.query("SELECT creado_por FROM ogp.registros WHERE id=$1", [id])
  ).rows[0].creado_por;
  assert.notEqual(stored, "00000000-0000-0000-0000-000000000000");
});
test("fotografía, audio y evidencia persisten; se validan formatos y acceso privado", async () => {
  const malformed = await call(`editor/personas/${id}/archivos`, {
    method: "POST",
    body: {
      kind: "foto",
      name: "fake.png",
      mime: "image/png",
      base64: Buffer.from("<script>bad</script>").toString("base64"),
    },
  });
  assert.equal(malformed.response.status, 422);
  const photo = await ok(
    `editor/personas/${id}/archivos`,
    {
      method: "POST",
      body: {
        kind: "foto",
        name: "retrato.png",
        mime: "image/png",
        base64: png,
        title: "Retrato de prueba",
        credit: "Autor de prueba",
        license: "Permiso de prueba",
        alt: "Retrato sintético para comprobar el formulario",
      },
    },
    201,
  );
  photoId = photo.id;
  const wav = Buffer.alloc(48);
  wav.write("RIFF");
  wav.writeUInt32LE(40, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(4, 40);
  const audio = await ok(
    `editor/personas/${id}/archivos`,
    {
      method: "POST",
      body: {
        kind: "audio",
        name: "historia.wav",
        mime: "audio/wav",
        base64: wav.toString("base64"),
        title: "Historia oral de prueba",
        credit: "Entrevista de prueba",
        license: "Autorización de prueba",
        date: "2025-01-01",
      },
    },
    201,
  );
  audioId = audio.id;
  const evidence = await ok(
    `editor/personas/${id}/archivos`,
    {
      method: "POST",
      body: {
        kind: "consentimiento",
        name: "evidencia.pdf",
        mime: "application/pdf",
        base64: Buffer.from(
          "%PDF-1.4\nDocumento sintético de prueba\n%%EOF",
        ).toString("base64"),
      },
    },
    201,
  );
  evidenceId = evidence.id;
  data = {
    ...data,
    mediaIds: [photoId, audioId],
    consent: { ...data.consent, evidenceId },
  };
  record = await ok(`editor/personas/${id}`, {
    method: "PUT",
    body: { data, version: record.version },
  });
  assert.equal((await call(`media/${photoId}`)).response.status, 404);
  assert.equal((await call(`media/${evidenceId}`)).response.status, 404);
  assert.equal(
    (await call(`editor/archivos/${evidenceId}`, { auth: false })).response
      .status,
    401,
  );
  assert.equal(
    (await call(`editor/archivos/${evidenceId}`)).response.status,
    200,
  );
  const persisted = await ok(`editor/personas/${id}`);
  assert.equal(persisted.data.lineage[0], "Generación anterior");
  assert.equal(persisted.files.length, 3);
});
test("verificar, enviar, revisar y publicar conecta campos completos y conteos municipales", async () => {
  await action("verificar-consentimiento");
  assert.equal(record.consent.vigente, true);
  await action("enviar");
  assert.equal(record.status, "en_revision");
  await action("revisar", { verdict: "validado" });
  assert.equal(record.status, "validado");
  await action("publicar");
  assert.equal(record.status, "publicado");
  const result = await ok(`cocineras/${id}`);
  assert.equal(result.q, data.quote);
  assert.equal(result.org, data.collective);
  assert.equal(result.es, data.establishment);
  assert.equal(result.est, 12);
  assert.equal(result.oral[0].metadatos.title, "Historia oral de prueba");
  assert.equal(result.photos[0].url, `/api/media/${photoId}`);
  assert.equal(result.rec, 1);
  assert.equal(result.mer, 1);
  assert.ok(!JSON.stringify(result).includes("AUTORIZANTE PRIVADO DE PRUEBA"));
  assert.ok(!JSON.stringify(result).includes(evidenceId));
  assert.equal((await call(`media/${photoId}`)).response.status, 200);
  assert.equal((await call(`media/${audioId}`)).response.status, 200);
  assert.equal((await call(`media/${evidenceId}`)).response.status, 404);
  const map = await ok("mapa-municipal?tipos=persona&municipio=21114");
  assert.ok(map.records.some((r) => r.id === id));
  assert.equal(
    map.features.find((f) => f.properties.code === "21114").properties.total,
    2,
  );
});
test("control de versiones y permisos impiden perder cambios o publicar con otro actor", async () => {
  const stale = record.version;
  data = { ...data, quote: "Cambio interno aún no publicado." };
  record = await ok(`editor/personas/${id}`, {
    method: "PUT",
    body: { data, version: record.version },
  });
  assert.equal(
    (
      await call(`editor/personas/${id}`, {
        method: "PUT",
        body: { data, version: stale },
      })
    ).response.status,
    409,
  );
  assert.equal((await ok(`cocineras/${id}`)).q, "Frase pública autorizada.");
  assert.equal(
    (await call(`editor/personas/${id}/publicar`, { method: "POST", body: {} }))
      .response.status,
    409,
  );
  const session = await call("editor/session", {
    method: "POST",
    body: { email: "captura-test@invalid.example", password },
    auth: false,
  });
  const original = cookie;
  cookie = session.response.headers.get("set-cookie").split(";")[0];
  assert.equal(
    (
      await call(`editor/personas/${id}/revisar`, {
        method: "POST",
        body: { actorId: record.data.id, verdict: "validado" },
      })
    ).response.status,
    403,
  );
  cookie = original;
});
test("revocar consentimiento oculta la ficha, sus archivos y su aportación al mapa", async () => {
  await action("revocar-consentimiento");
  assert.equal((await call(`cocineras/${id}`)).response.status, 404);
  assert.equal((await call(`media/${photoId}`)).response.status, 404);
  assert.equal((await call(`media/${audioId}`)).response.status, 404);
  const map = await ok("mapa-municipal?tipos=persona&municipio=21114");
  assert.ok(!map.records.some((r) => r.id === id));
  assert.equal(
    map.features.find((f) => f.properties.code === "21114").properties.total,
    1,
  );
});
test(
  "captura y mapa funcionan en navegador de escritorio y móvil",
  { skip: process.env.OGP_BROWSER_TESTS !== "1" },
  async () => {
    const { createServer: createVite } = await import("vite");
    const vite = await createVite({
      server: {
        host: "127.0.0.1",
        port: 0,
        proxy: { "/api": { target: base, changeOrigin: false } },
      },
    });
    try {
      await vite.listen();
      const run = await promisify(execFile)(
        "python",
        [
          "tests/editorial_browser.py",
          `http://127.0.0.1:${vite.httpServer.address().port}`,
        ],
        {
          env: { ...process.env, OGP_TEST_EDITOR_PASSWORD: password },
          timeout: 90000,
        },
      );
      console.log(run.stdout);
    } finally {
      await vite.close();
    }
  },
);
