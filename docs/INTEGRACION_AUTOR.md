# Criterios de integración

La base de la integración es el ZIP `observador-gastronomico-main.zip` aportado por el usuario con su aplicación `observatorio-dashboard`. Se conserva su arquitectura Next.js en la raíz para mantener un único panel y una única autenticación. Los módulos coincidentes de la entrega del creador de la BD prevalecen sobre los de la versión React/Vite anterior.

## Correspondencias

- El panel de resumen, recetas, ingredientes, cocineras, podcast, recetarios PDF y cuentas proceden de la entrega nueva.
- Mercados, instrumentos legales, red de conocimiento, búsqueda general y contenido institucional se adaptan desde los módulos anteriores. Sus enlaces de navegación abren las rutas concretas, no anclas del resumen.
- La línea de tiempo conserva épocas, hitos, búsqueda, enlaces e historial, adaptados al router Next.js.
- La capa de datos de compatibilidad resuelve recetas, cocineras e ingredientes contra los catálogos del autor. Los datos propios de mercados y las fichas históricas conservan sus almacenes anteriores.
- Las URLs antiguas de captura de recetas/cocineras ya no montan sus editores de la versión Vite. Se utilizan los formularios de la entrega nueva. La captura de mercados mantiene su módulo específico.

## Persistencia y cambios de esquema

El SQL de dominio `ogp` de ambas entregas es funcionalmente el mismo; las diferencias encontradas son comentarios. Para un esquema existente se aplican únicamente las migraciones incrementales del panel. `app_auth` y `demo.recipe_forms` se agregan sin borrar los registros de dominio ni las tablas de la integración previa.

La preparación de la aplicación no ejecuta `scripts/setup-demo.mjs`: ese script original incorpora ejemplos y no forma parte del arranque unificado. Las cuentas se activan a petición del operador mediante el script de activación del autor. Los ejemplos visuales ya incluidos en sus catálogos se conservan como demostración.

Las configuraciones de PostgreSQL anteriores siguen separadas del nuevo archivo `.env.local`. El volumen de Docker de la aplicación unificada tiene nombre propio y no sustituye el volumen `ogp_data` de la versión previa. Una instalación existente con datos solo debe conectarse después de comprobar el nombre esperado de base y los permisos del propietario.

## Registros locales anteriores

La pantalla de registros anteriores conserva la posibilidad de descargar la información completa. La importación presenta los registros y sus requisitos, omite coincidencias con la versión prioritaria y crea borradores, sin atribuirles validaciones ni consentimientos oficiales. Los datos que no puedan mapearse siguen disponibles en el respaldo.

## Alcance del acceso

El panel adopta las sesiones y controles de la entrega nueva: es necesario iniciar sesión para entrar a sus secciones. Los controles de acceso de PostgreSQL y de sus APIs no se sustituyen por roles guardados en el navegador. Los formularios locales de los módulos del autor conservan su alcance de demostración; no equivalen a publicaciones del flujo editorial de la base.

SHA-256 de la entrega recibida: `e9a71922b2f889b9eee0605d3b94b7479717efe6a3de53f8bf33e4744e704869`.

## Archivo del recetario no incluido

El ZIP recibido no contiene archivos PDF, aunque su catálogo referencia `cocina-dig-2.pdf`. Se conserva el lector del autor, pero la página comprueba los archivos disponibles antes de montarlo. Sin el adjunto se muestra la referencia como pendiente; la API devuelve una ausencia explícita y no un fallo de servicio. El archivo real puede incorporarse a `assets/recetarios/cocina-dig-2.pdf` para habilitar el lector. No se sustituyó por contenido ficticio.
