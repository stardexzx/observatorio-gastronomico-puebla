import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { hashPassword } from "../server/auth.mjs";
if (existsSync(".env")) loadEnvFile(".env");
const missing = [
  "DATABASE_URL",
  "EDITOR_DATABASE_URL",
  "EDITOR_DB_PASSWORD",
  "EDITOR_EMAIL",
  "EDITOR_NAME",
  "EDITOR_PASSWORD",
].filter((key) => !process.env[key]);
if (missing.length || process.env.EDITOR_PASSWORD.length < 12) {
  console.error(
    "Configura las variables de edición y una contraseña de al menos 12 caracteres antes de migrar. Ejecuta npm run configurar para generar valores locales.",
  );
  process.exit(1);
}
process.env.EDITOR_EMAIL = process.env.EDITOR_EMAIL.trim().toLowerCase();
const url = new URL(process.env.DATABASE_URL);
const pool = new pg.Pool(
  process.env.ADMIN_DATABASE_URL
    ? { connectionString: process.env.ADMIN_DATABASE_URL }
    : {
        host: url.hostname,
        port: Number(url.port || 5432),
        database: url.pathname.slice(1),
        user: "ogp_admin",
        password: process.env.POSTGRES_PASSWORD,
      },
);
const client = await pool.connect();
try {
  for (const name of ["public_api.sql", "editorial.sql", "municipal_map.sql"])
    await client.query(
      await readFile(new URL(`../database/${name}`, import.meta.url), "utf8"),
    );
  await client.query("BEGIN");
  const role = await client.query(
    "SELECT 1 FROM pg_roles WHERE rolname='ogp_editor_web'",
  );
  if (!role.rowCount) {
    const sql = await client.query(
      "SELECT format('CREATE ROLE ogp_editor_web LOGIN PASSWORD %L',$1::text) AS statement",
      [process.env.EDITOR_DB_PASSWORD],
    );
    await client.query(sql.rows[0].statement);
  }
  await client.query("GRANT ogp_editor_api TO ogp_editor_web");
  const existing = await client.query(
    "SELECT id FROM ogp.usuarios WHERE correo=$1",
    [process.env.EDITOR_EMAIL],
  );
  let actor = existing.rows[0]?.id;
  if (!actor)
    actor = (
      await client.query(
        "INSERT INTO ogp.usuarios(correo,nombre,estado) VALUES($1,$2,'activo') RETURNING id",
        [process.env.EDITOR_EMAIL, process.env.EDITOR_NAME],
      )
    ).rows[0].id;
  const initialized = await client.query(
    "INSERT INTO ogp.editor_credenciales(usuario_id,password_hash) VALUES($1,$2) ON CONFLICT DO NOTHING",
    [actor, await hashPassword(process.env.EDITOR_PASSWORD)],
  );
  if (initialized.rowCount) {
    await client.query(
      "INSERT INTO ogp.usuario_roles(usuario_id,rol_id) SELECT $1,id FROM ogp.roles WHERE codigo IN ('capturista','revisor','publicador','verificador_consentimientos') ON CONFLICT DO NOTHING",
      [actor],
    );
    await client.query(
      "INSERT INTO ogp.usuario_modulos(usuario_id,modulo) SELECT $1::uuid,codigo FROM ogp.tipos_registro UNION SELECT $1::uuid,'consentimientos' ON CONFLICT DO NOTHING",
      [actor],
    );
  }
  const reference =
    "adjunto:observatorio-pruebas:5171086752a987b7baf7ee50630de1bb6e00ef198361bfcd5b40791030107dd5";
  let source = (
    await client.query("SELECT id FROM ogp.fuentes WHERE referencia=$1", [
      reference,
    ])
  ).rows[0]?.id;
  if (!source)
    source = (
      await client.query(
        "INSERT INTO ogp.fuentes(tipo_id,titulo,referencia,cita_publica,visibilidad,creado_por) SELECT id,$1,$2,$3,'publico',$4 FROM ogp.tipos_fuente WHERE codigo='datos' RETURNING id",
        [
          "Capa municipal del HTML de referencia",
          reference,
          "Límites municipales incorporados del HTML aportado; atribución declarada: INEGI, Marco Geoestadístico diciembre de 2025.",
          actor,
        ],
      )
    ).rows[0].id;
  const geo = JSON.parse(
    await readFile(
      new URL("../public/maps/puebla-municipios.geojson", import.meta.url),
      "utf8",
    ),
  );
  for (const f of geo.features) {
    const code = f.properties.cvegeo;
    let territory = (
      await client.query(
        "SELECT territorio_id FROM ogp.municipios_puebla WHERE cvegeo=$1",
        [code],
      )
    ).rows[0]?.territorio_id;
    if (!territory)
      territory = (
        await client.query(
          "INSERT INTO ogp.territorios(tipo_id,nombre,fuente_id) SELECT id,$1,$2 FROM ogp.tipos_territorio WHERE codigo='municipio' RETURNING id",
          [f.properties.nomgeo, source],
        )
      ).rows[0].id;
    await client.query(
      "INSERT INTO ogp.municipios_puebla(territorio_id,cve_mun,geometria,version_fuente,fuente_id) VALUES($1,$2,ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($3),4326))),'Adjunto HTML; atribución INEGI dic. 2025',$4) ON CONFLICT(territorio_id) DO UPDATE SET geometria=coalesce(ogp.municipios_puebla.geometria,EXCLUDED.geometria),version_fuente=CASE WHEN ogp.municipios_puebla.geometria IS NULL THEN EXCLUDED.version_fuente ELSE ogp.municipios_puebla.version_fuente END,fuente_id=CASE WHEN ogp.municipios_puebla.geometria IS NULL THEN EXCLUDED.fuente_id ELSE ogp.municipios_puebla.fuente_id END",
      [territory, code.slice(2), JSON.stringify(f.geometry), source],
    );
  }
  await client.query("COMMIT");
  console.log(
    "Migraciones aplicadas: edición autenticada y 217 municipios. Credenciales conservadas en .env.",
  );
} catch (error) {
  await client.query("ROLLBACK");
  console.error(
    "No se pudieron aplicar las migraciones:",
    error.code || error.name,
  );
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
