# Observatorio Gastronómico de Puebla

Aplicación unificada basada en la entrega del creador de la base de datos. Su panel Next.js, modelos, formularios de recetas/ingredientes/cocineras, podcast, recetarios PDF y autenticación tienen prioridad cuando coinciden con la aplicación anterior. Se conservan los módulos propios de mercados, protección legal, mapa independiente, red de conocimiento, búsqueda y línea de tiempo.

## Iniciar en Windows o Linux

Requisitos: Node.js **22.13 o superior**, npm y Docker Desktop con el motor Linux iniciado. Los comandos se ejecutan desde la raíz de este repositorio, donde está `package.json`.

```bash
npm ci
npm run configurar
npm run db:up
npm run auth:setup -- tu_correo@dominio.com
npm run dev
```

`auth:setup` entrega un enlace de activación de un solo uso para la primera cuenta administradora. Con el servidor iniciado, abre ese enlace, establece tu contraseña e inicia sesión en **http://localhost:5173**. No existe una contraseña predeterminada. La activación inicial no cambia una cuenta que ya haya sido activada.

`configurar` crea `.env.local` con una contraseña de PostgreSQL aleatoria sin sobrescribir configuraciones existentes. La configuración anterior `.env` no se usa para este panel. `db:up` prepara una base local independiente en el puerto **55433**, con el volumen **ogp_unificado_data**: no borra los volúmenes ni las bases del observatorio anterior. No se crean recetas, cuentas ni personas de demostración durante la inicialización. Los módulos con ejemplos visuales de la entrega siguen conservando esos ejemplos como material de demostración.

Si Windows bloquea el puerto, cambia **POSTGRES_PORT y el puerto de DATABASE_URL** en `.env.local` al mismo valor libre. Las contraseñas se aplican al crear el volumen; modificar el archivo no cambia una contraseña de PostgreSQL ya instalada. Consulta [el arranque completo para Windows](docs/ARRANQUE_WINDOWS.md).

Para conservar los datos al detener PostgreSQL: `npm run db:stop`. Para compilar y ejecutar la compilación:

```bash
npm run build
npm start
```

Desarrollo y compilación usan el mismo servidor Next.js de Node. No requieren Bash, Cloudflare ni una cuenta de Sites.

Si ya ejecutaste la entrega del autor, puedes reutilizar su `.env.local` y su PostgreSQL: ejecuta `npm run db:migrate` y `npm run dev`, sin crear otra cuenta. La guía de Windows incluye este caso.

## Prioridad de las dos entregas

| Área | Versión integrada |
| --- | --- |
| Panel, navegación y estilos generales | Entrega del creador de la BD |
| Recetas y su editor | Entrega del creador; borradores guardados en PostgreSQL |
| Ingredientes, cocineras y podcast | Entrega del creador; almacenamiento local de sus formularios |
| Recetarios PDF | Entrega del creador |
| Usuarios, roles y acceso | Sesiones y cuentas de la entrega del creador |
| Mercados y tianguis | Catálogo, ficha y captura anteriores dentro del panel nuevo |
| Protección legal, búsqueda y red | Módulos anteriores adaptados a los catálogos unificados |
| Mapa | Mapa del resumen del creador y mapa independiente conservado en `/mapa` |
| Memoria histórica | Línea de tiempo de cinco épocas y doce hitos; `/memoria` y `/linea-de-tiempo` |
| Datos complementarios de cocineras | Memoria oral, linaje, colectivo, establecimientos y vínculos conservados como campos adicionales |

El esquema de dominio del autor coincide con el esquema existente. El inicializador instala `ogp` solo cuando no existe y añade las migraciones de acceso y formularios del panel de forma transaccional e idempotente. No reinstala tablas ya existentes ni elimina información. Conserva los SQL y la implementación anterior como referencia en el historial y las carpetas heredadas.

## Datos anteriores y procedencia

En **Acervo → Registros anteriores** puedes revisar los registros del navegador de la versión anterior y descargar un respaldo. La importación es explícita: las fichas coincidentes por nombre conservan la versión del creador; las recetas importadas se crean como borradores con los permisos de la cuenta actual. Los registros incompletos requieren completar sus datos antes de importarlos. No se convierten ejemplos ni estados de interfaz en publicaciones verificadas.

Los almacenes del navegador pertenecen a su dominio y puerto: para recuperar registros anteriores debes abrir el panel en el mismo navegador y origen donde se capturaron. No se borran automáticamente los almacenes antiguos. Los adjuntos que antes se guardaron con una URL temporal necesitan volver a adjuntarse si esa URL ya venció. La entrega del autor usa almacenamiento distinto para sus módulos; no todos los formularios se guardan en PostgreSQL. Los indicadores generales, rankings y ejemplos de los módulos del autor siguen siendo ilustrativos y no deben interpretarse como un censo de la base.

Consulta [los criterios de integración](docs/INTEGRACION_AUTOR.md), el [README original de la entrega](docs/README_ENTREGA_AUTOR.md) y sus documentos conservados en `docs/autor/`. Los textos originales que describen otras formas de arranque no sustituyen los comandos de este README.

## Comprobaciones

```bash
npm test
npm run check
npm run lint
npm run build
# Prueba completa con Docker y Playwright instalados:
npm run test:integration
```

Las pruebas de navegador requieren Playwright y Chromium. Las pruebas de integración deben usar una base aislada y credenciales de prueba; nunca datos de producción. Los scripts históricos de `tests/` que arrancaban Vite/PostgreSQL por separado documentan la versión anterior y no son el flujo actual del panel.

## Recetario PDF

La entrega incluye el lector y la referencia «Puebla, la cocina de México», pero el ZIP no contiene su archivo PDF. La biblioteca muestra esa ausencia sin intentar abrir un libro inexistente. Para habilitarlo, incorpora el archivo real autorizado como `assets/recetarios/cocina-dig-2.pdf` y recarga el panel. No se agregó un PDF ficticio.

## Línea de tiempo

Selecciona una época o recorre sus hitos con anterior/siguiente. La búsqueda encuentra años, ingredientes y platillos, y el enlace conserva la época y el hito al recargar. Las ilustraciones vectoriales son locales; los relatos tradicionales se distinguen de hechos documentados y el hito UNESCO enlaza a la inscripción de la cocina tradicional mexicana.
