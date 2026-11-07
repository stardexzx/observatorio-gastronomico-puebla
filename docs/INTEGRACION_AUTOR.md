# Criterios de integración

La base de la integración es el ZIP `observador-gastronomico-main.zip` aportado por el usuario con su aplicación `observatorio-dashboard`. Se conserva su arquitectura Next.js en la raíz para mantener un único panel y una única autenticación. Los módulos coincidentes de la entrega del creador de la BD prevalecen sobre los de la versión React/Vite anterior.

## Correspondencias

- El panel de resumen, recetas, ingredientes, cocineras, podcast, recetarios PDF y cuentas proceden de la entrega nueva.
- La red de conocimiento, el mapa, la memoria histórica y el contenido institucional se adaptan desde los módulos anteriores. Mercados queda en espera tanto en usuario como en admin, sin listas ni captura; Protección legal mantiene solo el apartado reservado. Acervo vuelve a sus cinco opciones originales. El código de captura anterior se conserva como referencia; las rutas de Mercados no habilitan esos formularios.
- La línea de tiempo conserva épocas, hitos, búsqueda, enlaces e historial, adaptados al router Next.js.
- La capa de datos de compatibilidad resuelve recetas, cocineras e ingredientes contra los catálogos del autor. Los datos propios de mercados y las fichas históricas conservan sus almacenes anteriores.
- Las URLs antiguas de captura de recetas/cocineras ya no montan sus editores de la versión Vite. Se utilizan los formularios de la entrega nueva. La captura de mercados mantiene su módulo específico.

## Persistencia y cambios de esquema

El SQL de dominio `ogp` de ambas entregas es funcionalmente el mismo; las diferencias encontradas son comentarios. Para un esquema existente se aplican únicamente las migraciones incrementales del panel. `app_auth` y `demo.recipe_forms` se agregan sin borrar los registros de dominio ni las tablas de la integración previa.

La preparación de la aplicación no ejecuta `scripts/setup-demo.mjs`: ese script original incorpora ejemplos y no forma parte del arranque unificado. Las cuentas se activan a petición del operador mediante el script de activación del autor. Los ejemplos de código se conservan como referencia y no se cargan automáticamente en los catálogos.

Las configuraciones de PostgreSQL anteriores siguen separadas del nuevo archivo `.env.local`. El volumen de Docker de la aplicación unificada tiene nombre propio y no sustituye el volumen `ogp_data` de la versión previa. Una instalación existente con datos solo debe conectarse después de comprobar el nombre esperado de base y los permisos del propietario.

## Registros locales anteriores

La pantalla de registros anteriores conserva la posibilidad de descargar la información completa. La importación presenta los registros y sus requisitos, omite coincidencias con la versión prioritaria y crea borradores, sin atribuirles validaciones ni consentimientos oficiales. Los datos que no puedan mapearse siguen disponibles en el respaldo.

## Alcance del acceso

La página abre sin sesión para consulta pública. Las herramientas de captura y administración exigen las sesiones de la entrega nueva; los controles reales no dependen de roles guardados en el navegador. Recetas, ingredientes, cocineras y podcast guardan sus formularios en PostgreSQL. Publicar requiere administración o revisión y crea una versión pública separada; los borradores no se exponen. Las publicaciones originales aprobadas de ogp tienen prioridad sobre copias del panel. La migración 008 conserva la línea de tiempo editorial en la BD y permite publicarla junto al catálogo.

SHA-256 de la entrega recibida: `e9a71922b2f889b9eee0605d3b94b7479717efe6a3de53f8bf33e4744e704869`.

## Archivo del recetario no incluido

El ZIP recibido no contiene archivos PDF, aunque su catálogo referencia `cocina-dig-2.pdf`. Se conserva el lector del autor, pero la página comprueba los archivos disponibles antes de montarlo. Sin el adjunto se muestra la referencia como pendiente; la API devuelve una ausencia explícita y no un fallo de servicio. El archivo real puede incorporarse a `assets/recetarios/cocina-dig-2.pdf` para habilitar el lector. No se sustituyó por contenido ficticio.

## Navegación y lectura pública

- Acervo: Recetas, Recetario, Ingredientes, Mercados y tianguis, Cocineras y cocineros.
- Datos y análisis: Reportes y Red de conocimiento.
- Conocer el observatorio: Memoria histórica y Acerca del Observatorio.
- Podcast: capítulos publicados, sin controles de captura para visitantes.

El endpoint de consulta `/api/public/catalog` devuelve proyecciones explícitas de campos públicos. Las fuentes originales se consultan mediante `ogp.v_fichas_publicas`; las nuevas capturas del panel usan snapshots aprobados en `demo.public_catalog_versions`. Se omiten contactos, informantes, documentos privados y relaciones a borradores. Las imágenes originalmente aprobadas de la BD conservan su visibilidad; las capturas del panel publican por ahora su información textual y mantienen adjuntos privados.

El resumen, los reportes y el mapa calculan sus cifras a partir de esas publicaciones en ambas sesiones. Los registros privados se consultan en Acervo y no incrementan los totales públicos. Los datos ilustrativos de la entrega se conservan como referencia de código, pero ya no se usan en esas pantallas. Los antiguos archivos localStorage/IndexedDB no se convierten automáticamente en publicaciones y permanecen disponibles para respaldo e importación explícita desde el menú del equipo.
