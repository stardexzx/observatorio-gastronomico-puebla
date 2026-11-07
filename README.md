# Observatorio Gastronómico de Puebla

Aplicación unificada basada en la entrega del creador de la base de datos. Su panel Next.js, modelos, formularios de recetas/ingredientes/cocineras, podcast, recetarios PDF y autenticación tienen prioridad cuando coinciden con la aplicación anterior. La entrada principal es pública y de solo lectura; el equipo entra por «Acceso del equipo». Los roles administrador, revisor y capturista conservan sus herramientas de trabajo.

## Iniciar en Windows o Linux

Requisitos: Node.js **22.13 o superior**, npm y Docker Desktop con el motor Linux iniciado. Los comandos se ejecutan desde la raíz de este repositorio, donde está `package.json`.

```bash
npm ci
npm run configurar
npm run db:up
npm run dev
```

Abre **http://localhost:5173** para consultar el observatorio sin cuenta. Para crear la primera cuenta del equipo, ejecuta `npm run auth:setup -- tu_correo@dominio.com`, abre el enlace de activación y establece tu contraseña. No existe una contraseña predeterminada; las cuentas existentes se conservan.

`configurar` crea `.env.local` con una contraseña de PostgreSQL aleatoria sin sobrescribir configuraciones existentes. La configuración anterior `.env` no se usa para este panel. `db:up` prepara una base local independiente en el puerto **55433**, con el volumen **ogp_unificado_data**: no borra los volúmenes ni las bases del observatorio anterior. No se crean recetas, cuentas ni personas de demostración durante la inicialización. La inicialización conserva la línea de tiempo editorial del proyecto en PostgreSQL; no añade registros ficticios al acervo. El resumen administrativo original mantiene sus indicadores ilustrativos, separados del resumen público calculado con publicaciones.

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
| Ingredientes, cocineras y podcast | Formularios del creador, ahora guardados en PostgreSQL mediante APIs con sesión |
| Recetarios PDF | Entrega del creador |
| Usuarios, roles y acceso | Sesiones y cuentas de la entrega del creador |
| Mercados y tianguis | Apartado público en espera del desarrollo administrativo |
| Protección legal | Apartado reservado, sin contenido público por ahora |
| Datos y análisis | Reportes con cifras reales y red de conocimiento de registros publicados |
| Mapa | Consulta de publicaciones por municipio, conserva colores cartográficos y usa controles del panel |
| Conocer el observatorio | Memoria histórica (5 épocas y 12 hitos en BD) y Acerca del observatorio |
| Datos complementarios de cocineras | Memoria oral, linaje, colectivo, establecimientos y vínculos conservados como campos adicionales |

El esquema de dominio del autor coincide con el esquema existente. El inicializador instala `ogp` solo cuando no existe y añade las migraciones de acceso y formularios del panel de forma transaccional e idempotente. No reinstala tablas ya existentes ni elimina información. Conserva los SQL y la implementación anterior como referencia en el historial y las carpetas heredadas.

## Datos anteriores y procedencia

En **Menú del equipo → Registros anteriores** puedes revisar los registros del navegador de la versión anterior y descargar un respaldo. La importación es explícita: las fichas coincidentes por nombre conservan la versión del creador; las recetas importadas se crean como borradores con los permisos de la cuenta actual. Los registros incompletos requieren completar sus datos antes de importarlos. No se convierten ejemplos ni estados de interfaz en publicaciones verificadas.

Los almacenes del navegador pertenecen a su dominio y puerto: para recuperar registros anteriores debes abrir el panel en el mismo navegador y origen donde se capturaron. No se borran automáticamente los almacenes antiguos. Los adjuntos que antes se guardaron con una URL temporal necesitan volver a adjuntarse si esa URL ya venció. Los catálogos nuevos de cocineras, ingredientes y podcast se guardan en PostgreSQL. Los archivos locales de la entrega anterior se conservan, pero no se publican ni importan automáticamente. El resumen público y sus reportes reflejan exclusivamente publicaciones; la vista administrativa original mantiene sus indicadores de demostración.

Consulta [los criterios de integración](docs/INTEGRACION_AUTOR.md), el [README original de la entrega](docs/README_ENTREGA_AUTOR.md) y sus documentos conservados en `docs/autor/`. Los textos originales que describen otras formas de arranque no sustituyen los comandos de este README.

## Comprobaciones

```bash
npm test
npm run check
npm run lint
npm run build
# Prueba completa con Docker y Playwright instalados:
npm run test:public
```

Las pruebas de navegador requieren Playwright y Chromium. Las pruebas de integración deben usar una base aislada y credenciales de prueba; nunca datos de producción. Los scripts históricos de `tests/` que arrancaban Vite/PostgreSQL por separado documentan la versión anterior y no son el flujo actual del panel.

## Recetario PDF

La entrega incluye el lector y la referencia «Puebla, la cocina de México», pero el ZIP no contiene su archivo PDF. La biblioteca muestra esa ausencia sin intentar abrir un libro inexistente. Para habilitarlo, incorpora el archivo real autorizado como `assets/recetarios/cocina-dig-2.pdf` y recarga el panel. No se agregó un PDF ficticio.

## Línea de tiempo

Selecciona una época o recorre sus hitos con anterior/siguiente. La búsqueda encuentra años, ingredientes y platillos, y el enlace conserva la época y el hito al recargar. Las ilustraciones vectoriales son locales; los relatos tradicionales se distinguen de hechos documentados y el hito UNESCO enlaza a la inscripción de la cocina tradicional mexicana.

## Consulta pública y publicación

Acervo contiene exactamente Recetas, Recetario, Ingredientes, Mercados y tianguis y Cocineras y cocineros. Datos y análisis agrupa Reportes y Red de conocimiento. Conocer el observatorio agrupa Memoria histórica y Acerca.

Las lecturas públicas usan `/api/public/catalog` sin sesión. Solo devuelve versiones aprobadas originales de `ogp.v_fichas_publicas` o versiones expresamente publicadas desde el panel. La entrega original de la BD tiene prioridad ante duplicados. Borradores, datos de contacto e información privada de informantes no forman parte de esa respuesta. Las fichas públicas enlazan solo registros también publicados.

Administración y revisión pueden publicar o retirar fichas; capturista captura borradores y los envía a revisión. En recetas, publicar crea una versión pública independiente: los cambios posteriores del borrador no alteran lo publicado hasta que el equipo lo actualice. Cocineras requiere autorización de la persona para publicar. La retirada o revocación se refleja al volver a consultar.

Después de actualizar una instalación existente ejecuta `npm run db:migrate` antes de `npm run dev`. La migración 008 añade catálogos del panel, versiones públicas y contenido editorial sin borrar datos. El PDF pendiente sigue mostrándose como «Próximamente» hasta incorporar el archivo real.
