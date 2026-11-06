import { Pool } from "pg";
const globalDb = globalThis as unknown as { demoPool?: Pool };
export const pool = globalDb.demoPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 4, connectionTimeoutMillis: 5000 });
if (process.env.NODE_ENV !== "production") globalDb.demoPool = pool;
export function requireDemo() {
  if (process.env.DEMO_MODE !== "true" || !process.env.DATABASE_URL) throw new Error("La demo local no está configurada.");
  if (new URL(process.env.DATABASE_URL).pathname !== "/observatorio_puebla_test") throw new Error("La demo requiere observatorio_puebla_test.");
}
