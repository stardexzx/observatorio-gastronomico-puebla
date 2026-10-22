import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const admin = randomBytes(24).toString('hex');
const reader = randomBytes(24).toString('hex');
try {
  await writeFile(new URL('../.env', import.meta.url), `VITE_DATA_SOURCE=database\nAPI_PORT=3001\nPOSTGRES_PORT=5432\nPOSTGRES_PASSWORD=${admin}\nOGP_API_PASSWORD=${reader}\nDATABASE_URL=postgresql://ogp_web:${reader}@127.0.0.1:5432/observatorio\n`, { flag: 'wx', mode: 0o600 });
  console.log('Configuración local creada en .env. Inicia la base con npm run db:up.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('.env ya existe; se conserva sin cambios.');
}
