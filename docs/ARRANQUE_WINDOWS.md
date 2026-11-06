# Ejecutar el observatorio unificado en Windows

Los comandos se ejecutan desde la raíz del proyecto, donde están `package.json` y `compose.yaml`, en CMD o PowerShell. Se necesita Node.js 22.13 o superior (se recomienda Node.js 24 LTS), npm y Docker Desktop iniciado con contenedores Linux. La misma secuencia funciona en Linux y macOS con Docker Compose disponible.

## Primera ejecución

```sh
npm ci
npm run configurar
npm run db:up
```

`configurar` crea `.env.local` con una contraseña aleatoria sin mostrarla. Si ya existe, conserva su contenido. La base se llama `observatorio_puebla_test` y usa el puerto local `55433`, para evitar el conflicto habitual con otra instalación en `5432`. No se reutiliza el archivo `.env` de la versión previa.

`db:up` espera a que PostgreSQL/PostGIS esté listo e instala el esquema cuando la base está vacía. Sobre una base instalada aplica únicamente las migraciones adicionales. La operación es transaccional y no crea cuentas, recetas ni otros registros de muestra. El proyecto Docker `ogp_unificado` usa el volumen `ogp_unificado_data`; los contenedores y volúmenes antiguos de `ogp` permanecen disponibles.

Con la base preparada, crea el enlace de activación para tu correo real:

```sh
node --env-file=.env.local scripts/setup-login.mjs tu-correo@ejemplo.com
npm run dev
```

Abre el enlace de activación que imprime el comando y establece tu contraseña, de 12 a 128 caracteres. Caduca a las 24 horas y solo se usa para la primera cuenta de administrador. No hay contraseña predeterminada. Después inicia sesión en <http://localhost:5173>. Si la cuenta ya está activada, no vuelvas a ejecutar el comando de activación: usa el inicio de sesión habitual. Las siguientes cuentas se administran dentro del panel.

## Si ya instalaste la entrega del creador de la BD

Puedes reutilizar esa base y sus cuentas. Copia su `.env.local` a la raíz del proyecto unificado, conserva su `DATABASE_URL` y `DEMO_MODE=true`, e inicia el mismo PostgreSQL que ya usabas. Después ejecuta:

```sh
npm ci
npm run db:migrate
npm run dev
```

En este caso no necesitas crear otro contenedor ni generar otra cuenta. Si usaste el contenedor `ogp-autor-db`, puedes iniciarlo con `docker start ogp-autor-db`. Mantén el mismo puerto de su conexión. `db:migrate` añade únicamente lo que falte y conserva las recetas y credenciales existentes. No ejecutes `db:up` para crear un segundo contenedor sobre el mismo puerto ocupado.

## Siguientes ejecuciones

```sh
npm run db:up
npm run dev
```

Para detener la aplicación, pulsa `Ctrl+C`. Para detener PostgreSQL conservando los datos:

```sh
npm run db:stop
```

## Comprobar y compilar

```sh
npm run check
npm run lint
node --test test/*.test.mjs
npm run build
npm run start
```

La compilación usa Next.js sobre Node y no necesita conectarse a PostgreSQL. Para ejecutar el servidor compilado, la base debe estar iniciada y `.env.local` configurado; se abre en <http://localhost:5173>. La sincronización de los archivos de PDF.js se realiza antes de `dev`, `build` y `start`. Los datos de conexión son exclusivamente del servidor.

## Si aparece un error

- **No se encuentra `dockerDesktopLinuxEngine`:** abre Docker Desktop, espera a que termine de iniciar y comprueba que esté usando contenedores Linux. Después repite `npm run db:up`.
- **Puerto ocupado o acceso al socket denegado:** cambia `POSTGRES_PORT` en `.env.local` por un puerto libre y actualiza también el puerto de `DATABASE_URL`. Repite `npm run db:up`. El puerto interno del contenedor sigue siendo `5432`.
- **Error PostgreSQL `28P01`:** comprueba que la contraseña de `DATABASE_URL` coincida con `POSTGRES_PASSWORD` y con la que se utilizó al crear el volumen. Cambiar una variable no cambia la contraseña de un servidor ya creado. Conserva `.env.local`; no elimines volúmenes para corregirlo. Si falta la configuración original, recupera o cambia la contraseña con el administrador de PostgreSQL.
- **Ya tenías `.env.local`:** revisa que incluya las cuatro variables de `.env.example`, con el mismo puerto y contraseña en ambas representaciones. `npm run configurar` no sobrescribe archivos existentes.

Para aplicar de nuevo las migraciones sin reiniciar el contenedor:

```sh
npm run db:migrate
```

No ejecutes el instalador SQL inicial manualmente sobre un esquema existente. Las recetas se crean desde el panel; los datos locales anteriores del navegador no se importan automáticamente a PostgreSQL. El documento [inicio-sesion.md](inicio-sesion.md) describe las cuentas y sesiones.
