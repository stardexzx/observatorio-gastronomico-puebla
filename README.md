# Observatorio Gastronómico de Puebla

Frontend React/Vite con el diseño y el mapa de navegación del primer repositorio, conectado al esquema PostgreSQL/PostGIS del archivo `observador-gastronomico (2).zip` mediante una API pública de consulta y un área editorial autenticada para cocineras y cocineros.

## Ejecutar con PostgreSQL

Requisitos: Node.js 20.19+ o 22.12+ (validado con 24.19), npm, Docker y Docker Compose.

```bash
npm ci
npm run configurar
npm run db:up
npm run dev
```

`configurar` genera `.env` con contraseñas aleatorias para desarrollo. Nunca sobrescribe un archivo existente. `db:up` inicia PostgreSQL 16/PostGIS 3.5; en un volumen nuevo instala el esquema original y después aplica las migraciones de consulta, captura y cartografía. Importa los 217 municipios incluidos en el HTML de referencia y conserva las geometrías existentes. `dev` inicia la API y Vite; usa la dirección que indique Vite. Para detener la base conservando sus datos: `npm run db:stop`.

El ZIP contiene el esquema y los catálogos auxiliares, **sin fichas publicadas ni una segunda interfaz**. Por eso una instalación nueva muestra colecciones vacías y contadores en cero. Los datos sintéticos de las pruebas viven en bases temporales separadas que se eliminan al terminar. No se presentan los mocks como publicaciones reales.

## Revisar el diseño sin base de datos

```bash
npm run dev:demo
```

El modo de demostración conserva los JSON originales y muestra una etiqueta que los identifica. En el modo `database`, una caída de la API muestra un error; no cambia silenciosamente a datos ficticios. La selección se realiza con `VITE_DATA_SOURCE=database` o `demo`. Al cambiarla, reinicia Vite; para producción, vuelve a compilar.

## Qué quedó conectado

- Recetas: búsqueda, paginación, ingredientes y cantidades, pasos, técnicas, fuentes y relaciones públicas.
- Mercados: catálogo, fichas, horarios, dirección y coordenadas publicadas.
- Cocineras y cocineros: registro, borradores, revisión, consentimiento y publicación reales; campos de ambos HTML, fotografías e historia oral persistentes. [Guía de captura](docs/CAPTURA_COCINERAS.md).
- Protección legal: instrumentos publicados, situación, autoridad y fuentes.
- Mapa: 217 municipios, selección desde la captura, capas por tipo, búsqueda, periodo de publicación, zoom y apertura de fichas. Los conteos se calculan en PostgreSQL y los puntos precisos se reservan a coordenadas públicas documentadas.
- Red de conocimiento: relaciones públicas; por defecto una subred de las 24 publicaciones más recientes y sus conexiones. `?registro=UUID` centra la consulta en una ficha.
- Inicio y reportes: conteos y evolución mensual de las versiones públicas activas. Descarga de indicadores en JSON.
- Búsqueda global, podcasts/episodios y contenido institucional «Acerca».

Se conservan los grupos **Inicio, Explorar, Conocer el Observatorio, Comunidad y Datos y Análisis**, además de las rutas existentes. Las rutas auxiliares `/buscar` y `/registro/:id` permiten abrir resultados sin reorganizar los menús.

`/admin` contiene ahora la captura autenticada de cocineras, cocineros y colectivos. Usa las credenciales locales `EDITOR_EMAIL` y `EDITOR_PASSWORD`, guardadas de forma privada en `.env`. La cuenta inicial se crea una vez y los reinicios no restauran permisos retirados. La edición utiliza una conexión PostgreSQL separada de la consulta pública.

Memoria, experiencias, captura de otros tipos de registro y administración de usuarios/roles siguen pendientes. Los formularios combinan los campos de `observatorio-pruebas (1).html` con el diseño aceptado de `OGP_Mockup_navegacion.html`; ver [criterios y referencias](docs/REFERENCIAS.md).

## Base de datos existente

1. Si la base está vacía, instala `database/observatorio_puebla.sql` con un administrador. El script original crea el esquema `ogp`; no lo vuelvas a ejecutar sobre un esquema existente.
2. Ejecuta `database/public_api.sql`. Es una extensión de lectura que se puede volver a aplicar.
3. Crea un login PostgreSQL y concédele el rol `ogp_lector`. Configura su contraseña de forma segura con `\password` en psql.
4. Configura `DATABASE_URL` en `.env` con ese login. No uses una cuenta administradora para servir la web. Las credenciales de la base nunca llevan prefijo `VITE_`.

Para habilitar además la captura y la capa municipal sobre una base existente, completa las variables `EDITOR_*`, define `ADMIN_DATABASE_URL` con acceso de migración a esa misma base y ejecuta `npm run db:migrate`. La API utiliza después sus conexiones de lectura/edición; no la conexión administradora. El script conserva el SQL original y las geometrías ya documentadas.

Las contraseñas generadas por `configurar` solo se aplican al crear el volumen. Cambiar `.env` no modifica usuarios de una base ya inicializada. Para otro puerto local, cambia `POSTGRES_PORT` y el puerto de `DATABASE_URL`; `API_PORT` controla el puerto de la API.

La consulta pública usa `v_fichas_publicas` y un rol de lectura sin acceso a tablas privadas ni escritura. La captura usa otro rol de base de datos, sesiones autenticadas, comprobación del origen y los permisos del actor de la sesión; no acepta actores ni SQL enviados por el cliente.

## Comprobaciones

```bash
npm test                  # Contrato HTTP, validación y manejo de errores
npm run db:test           # Pruebas de integridad originales, con ROLLBACK
npm run test:db           # Integración pública y editorial en bases temporales
npm run build
```

La integración crea bases `ogp_test_*` y `ogp_editor_test_*`, instala el esquema desde cero, publica registros sintéticos y prueba lectura, búsqueda, paginación, mapa, indicadores, permisos y retirada de contenidos. Requiere el administrador de desarrollo generado por `configurar`; no debe ejecutarse con credenciales de producción.

Para incluir la comprobación de escritorio y móvil del navegador, instala Python Playwright y Chromium (ya disponibles en el entorno en la nube) y ejecuta:

```bash
OGP_BROWSER_TESTS=1 npm run test:db
```

## Compilación y despliegue

```bash
npm run build
npm run api
# En otra terminal:
npm run preview
```

Vite y su preview reenvían `/api` a la API local. En un despliegue real, sirve `dist` con fallback a `index.html` para las rutas React y reenvía `/api` a `server/index.mjs` mediante el proxy del servidor. La API escucha en loopback. Configura TLS del proxy y de PostgreSQL según tu proveedor, manteniendo la verificación de certificados. Conserva el host de origen al reenviar las solicitudes a la API y establece `COOKIE_SECURE=1` para las sesiones editoriales en HTTPS.

Los procesos no se conservan al restaurar una máquina: inicia de nuevo la base y `npm run dev`. No subas `.env` ni los datos del volumen a Git.
