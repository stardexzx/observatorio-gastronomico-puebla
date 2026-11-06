# Podcast

- `/podcast`: catálogo con búsqueda y filtros de estado.
- `/podcast/[id]`: ficha, reproductor y edición.
- La navegación principal y la búsqueda de secciones incluyen Podcast.

Se añaden episodios pegando enlaces de videos de YouTube. Se aceptan enlaces watch, youtu.be, shorts y live; no se importan listas. El título se captura manualmente. La vista previa y las miniaturas usan el identificador validado, nunca una URL arbitraria. La disponibilidad y el permiso de inserción dependen de YouTube.

Un borrador requiere título y enlace válido. Publicar exige además descripción. Se puede editar un episodio publicado o devolverlo a borrador. No se permiten dos fichas para el mismo video. Las relaciones con recetas e ingredientes conservan sus identificadores; el municipio usa su clave de catálogo. Los participantes son texto editorial.

## Persistencia y alcance actual

Las fichas se conservan en localStorage (`observatorio-podcast-v1`) en el mismo navegador y origen, siguiendo la fase actual de pruebas sin PostgreSQL. No se cargan episodios ficticios. El estado Publicado es un estado de la ficha dentro de este prototipo: no publica en YouTube ni crea una publicación compartida en un servidor. No hay autenticación o permisos nuevos en este módulo.

No se suben archivos, no se extraen automáticamente metadatos y no se sincroniza una lista. Una fase posterior deberá sustituir `readEpisodes` y `saveEpisode` por una API autenticada, mapear fichas a las entidades editoriales de episodios del esquema ogp y enlazar el identificador de YouTube como referencia externa. La sincronización deberá consultar una lista desde el backend, evitar duplicados por identificador de video e importar como borradores para revisión, sin sobrescribir textos editoriales.

## Comprobaciones

`node --test test/podcast-data.test.mjs` comprueba enlaces, persistencia, edición, duplicados y errores de almacenamiento. `npm run check` valida tipos.

## Presentación del catálogo

El listado usa tarjetas horizontales con portada 16:9 de 200 px, título y descripción de hasta dos líneas, datos disponibles de participantes/municipio/fecha y estado discreto. Portada y acción «Abrir episodio» llevan a la ficha con reproductor; el catálogo no carga iframes. En móvil se apila la portada sobre el contenido, sin desbordamiento horizontal.

Cada tarjeta ofrece «Editar episodio», «Ver en YouTube» y, en las publicadas, «Pasar a borrador». La edición se abre directamente sobre el catálogo; crear conserva la navegación a la nueva ficha. Las pruebas visuales se hicieron con una ruta temporal de ejemplos que se retiró sin añadir episodios al catálogo del usuario.

El menú de cada tarjeta incluye «Eliminar episodio» para borradores y publicados. La acción abre una confirmación con el título y aclara que no elimina el video de YouTube. Confirmar retira la ficha guardada y actualiza tarjetas y contadores; Cancelar no modifica el catálogo. El aviso ofrece Deshacer durante ocho segundos y vuelve a guardar la ficha si no existe un conflicto de video duplicado. Un fallo de almacenamiento conserva los datos y muestra un error. Las pruebas cubren eliminación selectiva, catálogo vacío, recuperación y fallos de escritura; se verificó en navegador con una ficha temporal retirada al terminar.
