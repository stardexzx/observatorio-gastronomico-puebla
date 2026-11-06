# Demo local con PostgreSQL

El proyecto original de Descargas no se modifica. Esta copia conserva sus carpetas y nombres.

## Arranque

1. Iniciar Postgres.app.
2. Desde esta carpeta, ejecutar `npm run dev:demo`.
3. Abrir http://127.0.0.1:3000/recetas.

La configuración está en `.env.local` (ignorado por Git). `.env.example` muestra el formato sin credenciales. La demo exige `observatorio_puebla_test` y escucha solo en el equipo local. El inicio de sesión y el actor de captura ya usan cuentas y sesiones verificadas. Véase `docs/inicio-sesion.md` para activar la primera cuenta. La configuración local continúa restringida a este equipo.

## Preparación inicial

Con el esquema `ogp` instalado, ejecutar `npm run demo:setup` una vez. Es repetible y conserva fichas existentes. Crea un capturista de demostración, dos borradores sintéticos y la tabla auxiliar `demo.recipe_forms`.

## Guion de presentación

1. Abrir Recetas: el listado consulta PostgreSQL, sin ejemplos de respaldo en localStorage.
2. Crear una receta con nombre y municipio.
3. Editar descripción, ingredientes y pasos. Esperar «Guardado».
4. Volver al catálogo, buscar el nombre y recargar la página.
5. Mostrar en DBeaver, conectado a observatorio_puebla_test:

```sql
SELECT r.id, r.titulo, r.descripcion, p.nombre AS preparacion
FROM ogp.recetas_documentadas r
JOIN ogp.preparaciones p ON p.id = r.preparacion_id;
SELECT receta_id, orden, instrucciones FROM ogp.receta_pasos ORDER BY receta_id, orden;
SELECT ri.receta_id, i.nombre, ri.orden FROM ogp.receta_ingredientes ri JOIN ogp.ingredientes i ON i.id=ri.ingrediente_id;
```

## Alcance

Crear, listar, buscar y editar borradores con UUID reales. Registro y ficha se crean en una transacción; se comprueban permisos, auditoría y restricciones diferidas. Nombre, descripción, preparación, vigencia, ocasión, pasos e ingredientes se escriben en las tablas del dominio. Cada receta nueva crea su preparación padre; elegir una preparación existente queda pendiente.

El resto del formulario se conserva como captura provisional en `demo.recipe_forms`, vinculada a la receta. Municipios seleccionados no son una importación oficial ni crean vínculos territoriales verificados. Técnicas se relacionan con el catálogo si coinciden; las demás quedan provisionales en el formulario. Fuentes, temporadas y testimonios pendientes de normalización editorial. Los estados de borrador/revisión y los adjuntos se conservan provisionalmente en el JSON del formulario; no se simulan publicaciones ni consentimientos. Los adjuntos se validan antes de guardarse y su almacenamiento externo queda pendiente. Los otros módulos conservan sus datos simulados sin avisos técnicos de conexión en la interfaz.

## Validación realizada

Las pruebas de integridad de `database/tests/integrity.sql` terminaron sin errores en PostgreSQL. Se verificó en navegador la creación y edición de una ficha. `npm run check` comprueba TypeScript. `npm run demo:test` usa la ficha sintética «Receta de presentación · prueba», creada en esa verificación, para comprobar API, persistencia y rollback ante fallo.

## Limpiar el catálogo antes de presentar

En DBeaver, conectado a `observatorio_puebla_test`, ejecutar completo `test/archivar_recetas_demo.sql`. Después recargar el catálogo. Archiva las recetas asociadas a `demo.recipe_forms` que estaban activas al ejecutar el script; no borra datos. Las nuevas capturas sí aparecen. Los registros archivados conservan pasos, ingredientes, preparación y auditoría para consulta. El editor y la API de guardado rechazan las recetas archivadas.

Para revisar solo recetas activas, unir `ogp.recetas_documentadas.id` con `ogp.registros.id` y filtrar `archivado_en IS NULL`. Para restaurar una ficha archivada, actualizar `ogp.registros.archivado_en = NULL` por su UUID. El script de configuración no debe usarse como limpieza: conserva los datos existentes.
