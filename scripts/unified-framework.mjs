import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const [command, ...args] = process.argv.slice(2);
if (!["dev", "build", "start"].includes(command)) {
  console.error("Usa dev, build o start.");
  process.exit(1);
}
process.chdir(projectRoot);
try {
  loadEnvFile(new URL("../.env.local", import.meta.url));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

// Build only compiles the application. Database access starts with Node at runtime.
if (command !== "build") {
  let configured = false;
  try {
    const url = new URL(process.env.DATABASE_URL);
    configured = process.env.DEMO_MODE === "true"
      && ["postgres:", "postgresql:"].includes(url.protocol)
      && url.pathname === "/observatorio_puebla_test";
  } catch { /* Report configuration without displaying the connection string. */ }
  if (!configured) {
    console.error("Configura .env.local con npm run configurar y prepara PostgreSQL con npm run db:up antes de iniciar.");
    process.exit(1);
  }
}

await import("./sync-pdfjs.mjs");
const cli = new URL("../node_modules/next/dist/bin/next", import.meta.url);
const hasOption = (...names) => args.some(arg => names.some(name => arg === name || arg.startsWith(`${name}=`)));
const defaults = command === "build" ? [] : [
  ...(!hasOption("--hostname", "-H") ? ["--hostname", "127.0.0.1"] : []),
  ...(!hasOption("--port", "-p") ? ["--port", "5173"] : []),
];
process.argv = [process.execPath, fileURLToPath(cli), command, ...defaults, ...args];
await import(cli.href);
