import { randomBytes } from "node:crypto";
import { writeFile, readFile, chmod } from "node:fs/promises";
import { parseEnv } from "node:util";
const admin = randomBytes(24).toString("hex");
const reader = randomBytes(24).toString("hex");
try {
  await writeFile(
    new URL("../.env", import.meta.url),
    `VITE_DATA_SOURCE=demo\nAPI_PORT=3001\nPOSTGRES_PORT=5432\nPOSTGRES_PASSWORD=${admin}\nOGP_API_PASSWORD=${reader}\nDATABASE_URL=postgresql://ogp_web:${reader}@127.0.0.1:5432/observatorio\n`,
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    "Configuración local creada en .env. Inicia la base con npm run db:up.",
  );
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log("Se conservan los valores existentes de .env.");
}
const file = new URL("../.env", import.meta.url);
const contents = await readFile(file, "utf8");
const values = parseEnv(contents);
const editorialPassword =
  values.EDITOR_DB_PASSWORD ||
  (values.EDITOR_DATABASE_URL
    ? decodeURIComponent(new URL(values.EDITOR_DATABASE_URL).password)
    : "") ||
  randomBytes(24).toString("hex");
const editorUrl = new URL(
  values.DATABASE_URL || "postgresql://ogp_web@127.0.0.1:5432/observatorio",
);
editorUrl.username = "ogp_editor_web";
editorUrl.password = editorialPassword;
const additions = {
  EDITOR_DB_PASSWORD: editorialPassword,
  EDITOR_DATABASE_URL: editorUrl.toString(),
  EDITOR_EMAIL: "editor@ogp.local",
  EDITOR_NAME: "Equipo editorial",
  EDITOR_PASSWORD: randomBytes(20).toString("hex"),
};
const missing = Object.entries(additions).filter(([name]) => !values[name]);
let updated = contents;
for (const [name, value] of missing) {
  if (name in values)
    updated = updated.replace(
      new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=.*$`, "m"),
      () => `${name}=${value}`,
    );
  else updated = updated.trimEnd() + `\n${name}=${value}\n`;
}
if (updated !== contents) await writeFile(file, updated);
await chmod(file, 0o600);
console.log(
  "Acceso editorial configurado en .env; no se muestran las credenciales.",
);
