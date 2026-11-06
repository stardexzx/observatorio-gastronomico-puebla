import { readFile } from "node:fs/promises";
import { loadEnvFile } from "node:process";
import pg from "pg";

// The unified app uses its own configuration, never the legacy .env file.
try {
  loadEnvFile(new URL("../.env.local", import.meta.url));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
let connection;
try {
  connection = new URL(process.env.DATABASE_URL);
} catch { /* Keep credentials out of errors and logs. */ }
if (process.env.DEMO_MODE !== "true" || !connection
    || !["postgres:", "postgresql:"].includes(connection.protocol)
    || connection.pathname !== "/observatorio_puebla_test") {
  console.error("Falta la configuración local de observatorio_puebla_test. Ejecuta npm run configurar y revisa .env.local.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
const sqlFile = async relative => {
  const sql = await readFile(new URL(`../database/${relative}`, import.meta.url), "utf8");
  // Installation and incremental SQL files also run on their own. Here all of
  // them share one transaction, so remove only standalone transaction markers.
  return sql.replace(/^(?:BEGIN|COMMIT);\s*$/gm, "");
};
let transaction = false;
try {
  await client.connect();
  await client.query("BEGIN");
  transaction = true;
  await client.query("SELECT pg_advisory_xact_lock(982341)");
  const { rows: [state] } = await client.query("SELECT to_regnamespace('ogp') IS NOT NULL AS installed");
  if (!state.installed) await client.query(await sqlFile("observatorio_puebla.sql"));
  for (const migration of ["006_consultar_fichas_tipo.sql", "006_login.sql", "007_panel_forms.sql"]) {
    await client.query(await sqlFile(`migrations/${migration}`));
  }
  await client.query("COMMIT");
  transaction = false;
  console.log(`PostgreSQL preparado: ${state.installed ? "esquema existente conservado" : "esquema inicial instalado"} y migraciones del panel aplicadas. No se crearon cuentas ni fichas.`);
} catch (error) {
  if (transaction) await client.query("ROLLBACK").catch(() => {});
  const code = /^[A-Z0-9_]+$/i.test(error.code ?? "") ? ` (${error.code})` : "";
  console.error(`No se pudo preparar PostgreSQL${code}. Comprueba Docker Desktop, .env.local y el puerto configurado. La inicialización no elimina datos.`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
