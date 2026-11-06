# Administración del equipo

Entrada desde perfil → Roles y permisos.

- `/administracion/roles`: pantalla principal, tabla de los tres roles, conteos de personas y secciones accesibles, buscador y menú de cada rol.
- `/administracion/roles/accesos`: matriz completa de acceso con Guardar y Cancelar.
- `/administracion/roles/[rol]/permisos`: misma matriz, destacando el rol elegido.
- `/administracion/personas`: tabla con nombre, correo y rol; búsqueda, filtro y selección múltiple.
- `/administracion/roles/[rol]/personas`: personas asignadas al rol y acceso a la vista del equipo completo.

Solo existen Administrador, Capturista y Revisor en este frontend. No se crean ni eliminan tipos de rol. Una persona puede tener uno de esos roles o quedar sin asignación. Se pueden registrar y editar personas, cambiar su rol individualmente desde los tres puntos o asignarlo a varias seleccionadas. El correo es único sin distinguir mayúsculas. El catálogo comienza vacío y no contiene identidades ficticias. Cancelar los formularios no guarda cambios.

La matriz conserva `observatorio-role-access-v1`; el equipo se guarda en `observatorio-team-members-v1`. No se pierden los accesos configurados previamente. Los conteos se leen al abrir la pantalla principal. Guardar accesos afecta qué secciones figuran permitidas para un rol, no facultades de editar o publicar. Administrar roles queda fijado al Administrador en la matriz.

El perfil ya usa la sesión autenticada y la sección Administración exige el rol Administrador en el servidor. Registrar personas en este catálogo local todavía no crea cuentas, verifica correos ni envía invitaciones. Las asignaciones se conservan en el navegador, sin modificar los permisos efectivos de las sesiones o conceder acceso real a nuevas cuentas. La fase de backend deberá conectar identidad autenticada, roles y comprobaciones por operación. El navegador no constituye una fuente de autorización.

La base de datos desconectada mantiene las definiciones históricas de ocho roles. Antes de reconectarla, preparar una migración revisada hacia los tres roles aprobados que reasigne facultades sin perder usuarios ni permisos. Esta interfaz de acceso por sección no decide el reparto de publicación, importación o lectura de datos restringidos.

Validación: `node --test test/team-members.test.mjs` cubre creación, edición, correos duplicados, asignación individual y múltiple, retirada de rol, roles inválidos y errores de almacenamiento. Navegador: navegación desde el menú de perfil y entre pantalla principal, permisos y personas; formularios y sus tres opciones de rol. TypeScript y lint de los archivos modificados.

## Cuentas y contraseñas
La gestión de personas usa ahora la API administrativa y cuentas reales del servidor. La administración asigna contraseña al crear la cuenta y puede sustituirla desde el menú de la persona. No hay autoservicio de contraseñas. La matriz de accesos conserva su funcionamiento local anterior; las menciones anteriores a almacenamiento local de personas describen la versión previa.

## Rediseño de navegación (noviembre de 2026)
Las vistas comparten un encabezado y tres pestañas: Personas, Roles y Permisos. Roles muestra una tabla compacta con avatares, cantidad de personas, accesos y enlaces directos. Personas reúne nombre y correo en una celda, fecha de alta y selector de rol que abre confirmación antes de guardar; conserva las acciones de edición y contraseña. Permisos permite buscar secciones, filtrar por rol y usar interruptores accesibles con guardado explícito y descarte. La sección de administración permanece bloqueada para capturistas y revisores. La matriz de accesos conserva su almacenamiento local; las cuentas y los roles se gestionan en el servidor.
Los estilos del módulo viven en `modules/roles/administration.module.css` para aislarlos de las reglas generales. La captura `docs/roles-redesign.png` usa datos de ejemplo de una ruta temporal eliminada después de la revisión visual.

En Personas, la columna Acciones tiene lápiz (solo nombre/correo), papelera (confirmación y retirada del equipo mediante desactivación) y menú de tres puntos (rol/contraseña). La eliminación revoca sesiones y bloquea futuros inicios de sesión; conserva la identidad y los registros documentados. No permite eliminar la cuenta propia ni dejar el sistema sin administrador. Prueba de integración: `test/auth-flow.mjs`.
