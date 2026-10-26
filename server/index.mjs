import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { createStore } from "./database.mjs";
import { createApi } from "./app.mjs";
import { createEditorStore } from "./editor-store.mjs";
if (existsSync(".env")) loadEnvFile(".env");
if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL. Configura .env siguiendo README.md.");
  process.exit(1);
}
const store = createStore(process.env.DATABASE_URL);
const editor = process.env.EDITOR_DATABASE_URL
  ? createEditorStore(process.env.EDITOR_DATABASE_URL)
  : null;
const server = createApi(store, {
  editor,
  secureCookies:
    process.env.COOKIE_SECURE === "1" || process.env.NODE_ENV === "production",
  onError: (error) =>
    console.error("Operación fallida:", error.code || error.status || "error"),
});
server.listen(Number(process.env.API_PORT || 3001), "127.0.0.1", () =>
  console.log("API pública iniciada."),
);
server.on("error", (error) => {
  console.error("No se pudo iniciar la API:", error.code);
  store.close();
  editor?.close();
  process.exitCode = 1;
});
let closing = false;
function close() {
  if (closing) return;
  closing = true;
  server.close(() => Promise.all([store.close(), editor?.close()]));
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
