# Observatorio Gastronómico de Puebla

Frontend React/Vite con el diseño y el mapa de navegación del primer repositorio, conectado al esquema PostgreSQL/PostGIS del archivo `observador-gastronomico (2).zip` mediante una API de lectura pública.

## Ejecutar con PostgreSQL

Requisitos: Node.js 20.19+ o 22.12+ (validado con 24.19), npm, Docker y Docker Compose.

```bash
npm ci
npm run configurar
npm run db:up
npm run dev
```

`configurar` genera `.env` con contraseñas aleatorias para desarrollo. Nunca sobrescribe un archivo existente. `db:up` inicia PostgreSQL 16/PostGIS 3.5 y, en un volumen nuevo, instala el esquema original, el adaptador de lectura y el usuario `ogp_web`. `dev` inicia la API y Vite; usa la dirección que indique Vite. Para detener la base conservando sus datos: `npm run db:stop`.

El ZIP contiene el esquema y los catálogos auxiliares, **sin fichas publicadas ni una segunda interfaz**. Por eso una instalación nueva muestra colecciones vacías y contadores en cero. Los datos sintéticos de las pruebas viven en una base temporal separada que se elimina al terminar. No se presentan los mocks como publicaciones reales.

## Revisar el diseño sin base de datos

```bash
npm run dev:demo
```

El modo de demostración conserva los JSON originales y muestra una etiqueta que los identifica. En el modo `database`, una caída de la API muestra un error; no cambia silenciosamente a datos ficticios. La selección se realiza con `VITE_DATA_SOURCE=database` o `demo`. Al cambiarla, reinicia Vite; para producción, vuelve a compilar.

## Qué quedó conectado

- Recetas: búsqueda, paginación, ingredientes y cantidades, pasos, técnicas, fuentes y relaciones públicas.
- Mercados: catálogo, fichas, horarios, dirección y coordenadas publicadas.
- Cocineras y cocineros: semblanzas, especialidades, lenguas y consulta sujeta al consentimiento del esquema.
- Protección legal: instrumentos publicados, situación, autoridad y fuentes.
- Mapa: ubicaciones PostGIS de mercados publicados sobre el mapa hexagonal del diseño original. La posición visual es esquemática; cada ficha conserva sus coordenadas documentadas.
- Red de conocimiento: relaciones públicas; por defecto una subred de las 24 publicaciones más recientes y sus conexiones. `?registro=UUID` centra la consulta en una ficha.
- Inicio y reportes: conteos y evolución mensual de las versiones públicas activas. Descarga de indicadores en JSON.
- Búsqueda global, podcasts/episodios y contenido institucional «Acerca».

Se conservan los grupos **Inicio, Explorar, Conocer el Observatorio, Comunidad y Datos y Análisis**, además de las rutas existentes. Las rutas auxiliares `/buscar` y `/registro/:id` permiten abrir resultados sin reorganizar los menús.

`/admin`, `/memoria` y `/experiencias` siguen como secciones pendientes. La conexión implementada es de **consulta pública**. Las funciones editoriales del SQL se conservan, pero no se exponen como endpoints: captura, revisión, publicación, invitaciones y gestión de permisos necesitan una integración de identidad y pantallas administrativas aparte. No hay un acceso administrativo simulado.

## Base de datos existente

1. Si la base está vacía, instala `database/observatorio_puebla.sql` con un administrador. El script original crea el esquema `ogp`; no lo vuelvas a ejecutar sobre un esquema existente.
2. Ejecuta `database/public_api.sql`. Es una extensión de lectura que se puede volver a aplicar.
3. Crea un login PostgreSQL y concédele el rol `ogp_lector`. Configura su contraseña de forma segura con `\password` en psql.
4. Configura `DATABASE_URL` en `.env` con ese login. No uses una cuenta administradora para servir la web. Las credenciales de la base nunca llevan prefijo `VITE_`.

Las contraseñas generadas por `configurar` solo se aplican al crear el volumen. Cambiar `.env` no modifica usuarios de una base ya inicializada. Para otro puerto local, cambia `POSTGRES_PORT` y el puerto de `DATABASE_URL`; `API_PORT` controla el puerto de la API.

La API usa consultas parametrizadas y funciones que leen `v_fichas_publicas`. No recibe actores editoriales ni SQL del cliente. El usuario de la API no puede leer las tablas privadas ni ejecutar publicación o revocación.

## Comprobaciones

```bash
npm test                  # Contrato HTTP, validación y manejo de errores
npm run db:test           # Pruebas de integridad originales, con ROLLBACK
npm run test:db           # Integración en una base temporal; requiere db:up y .env local
npm run build
```

La integración crea una base `ogp_test_*`, instala el esquema desde cero, publica registros sintéticos y prueba lectura, búsqueda, paginación, mapa, indicadores, permisos y retirada de contenidos. Requiere el administrador de desarrollo generado por `configurar`; no debe ejecutarse con credenciales de producción.

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

Vite y su preview reenvían `/api` a la API local. En un despliegue real, sirve `dist` con fallback a `index.html` para las rutas React y reenvía `/api` a `server/index.mjs` mediante el proxy del servidor. La API escucha en loopback. Configura TLS del proxy y de PostgreSQL según tu proveedor, manteniendo la verificación de certificados.

Los procesos no se conservan al restaurar una máquina: inicia de nuevo la base y `npm run dev`. No subas `.env` ni los datos del volumen a Git.
