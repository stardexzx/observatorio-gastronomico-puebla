# Persistencia de Recetas

Estado actual: `recipeDataMode = "postgres"`. Listado, creación, edición y eliminación usan la API de PostgreSQL configurada en `.env.local`. La interfaz no muestra avisos ni nombres de base de datos. No se alteraron credenciales ni se importaron automáticamente los registros de IndexedDB.

`npm run dev` usa Next.js sobre Node en el puerto 5173 cuando la configuración local tiene `DEMO_MODE=true`; los pools de PostgreSQL necesitan un proceso persistente. El perfil administrado de Sites conserva su arranque anterior.

`data/recipe-data-mode.ts` selecciona el origen de datos. En modo `local`, la lista, la creación y la edición usan IndexedDB (`ogp-frontend-recipes-v1`), incluyendo los archivos adjuntos. Se cargan seis recetas de ejemplo al abrir por primera vez. La información persiste al recargar en el mismo navegador y origen.

Las rutas `/api/recipes` y `/api/recipes/[id]` responden 503 antes de importar la capa de PostgreSQL cuando está activo este modo. No se modifican credenciales, tablas ni registros existentes. La implementación original se conserva en `data/recipe-storage-postgres.ts`.

Para volver a las pruebas independientes, cambiar `recipeDataMode` a `"local"`. Los registros de pruebas locales no se transfieren automáticamente a PostgreSQL.

Las fotografías admiten JPG, PNG y WEBP hasta 8 MB; los audios, MP3, M4A y WAV hasta 20 MB. En modo local los archivos se guardan en el navegador. En el prototipo PostgreSQL se conservan provisionalmente como data URLs dentro de `demo.recipe_forms`, con tipo y tamaño validados. El alojamiento externo y su normalización editorial siguen pendientes; no se publican archivos en servicios externos.

El menú de tres puntos de cada fila permite eliminar una receta tras confirmación. En modo local, la operación conserva la ficha en IndexedDB con `localDeletedAt` y la excluye del catálogo y del editor. Las fichas eliminadas no se vuelven a generar como ejemplos cuando el catálogo queda vacío; un editor abierto previamente tampoco puede guardarlas de nuevo. En PostgreSQL, DELETE verifica al actor y su permiso de edición y marca `ogp.registros.archivado_en` dentro de una transacción, sin borrar la ficha, sus relaciones o auditoría.

En Fuentes, «Entrevista de campo» muestra únicamente informante, rol y fecha de entrevista. Su completitud depende de nombre y fecha, sin exigir la referencia oculta. Las demás fuentes muestran referencia y, debajo, enlace opcional (`sourceUrl`) y fecha de consulta en dos columnas adaptables. Las fichas existentes reciben un enlace vacío al normalizarse; cambiar de tipo conserva los datos previamente capturados. La capa de demo PostgreSQL también conserva el campo en su formulario provisional, sin modificar el esquema. Los estados de borrador y revisión se conservan en el formulario provisional; no equivalen a una validación o publicación editorial real.

Prueba de reconexión: `node --env-file=.env.local test/reconnected-recipes.mjs` comprueba API, guardado, pasos, enlace y fecha de fuente, adjuntos, estado, persistencia directa en PostgreSQL y archivo. Crea únicamente una ficha sintética propia que queda archivada al terminar. Los demás módulos conservan sus fuentes de datos actuales.
