import { spawnSync } from "node:child_process";

// La compilación actual permanece desconectada aunque exista un .env anterior.
const result = spawnSync(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "build", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: { ...process.env, VITE_DATA_SOURCE: "demo" },
  },
);
process.exitCode = result.status ?? 1;
