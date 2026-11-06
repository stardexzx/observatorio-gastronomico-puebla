import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";

const password = randomBytes(32).toString("hex");
const contents = [
  "# Configuración del panel unificado. Este archivo no se sube a Git.",
  "DEMO_MODE=true",
  "POSTGRES_PORT=55433",
  `POSTGRES_PASSWORD=${password}`,
  `DATABASE_URL=postgresql://ogp_admin:${password}@127.0.0.1:55433/observatorio_puebla_test`,
  "",
].join("\n");
try {
  await writeFile(new URL("../.env.local", import.meta.url), contents, { flag: "wx", mode: 0o600 });
  console.log("Configuración creada en .env.local. Inicia Docker Desktop y ejecuta npm run db:up. No se generaron cuentas ni recetas.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log("Se conserva .env.local sin cambios. Comprueba su configuración en docs/ARRANQUE_WINDOWS.md antes de iniciar PostgreSQL.");
}
