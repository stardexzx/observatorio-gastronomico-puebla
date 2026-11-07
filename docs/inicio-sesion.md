# Inicio de sesión del panel

Correo y contraseña son los únicos campos del acceso habitual en `/iniciar-sesion`. Al validar las credenciales, el servidor responde siempre con `/`: Administrador, Capturista y Revisor aterrizan en el Resumen, independientemente de la página que intentaron abrir antes. El rol no se recibe del formulario ni se lee de localStorage.

## Rutas e identidad

Las páginas del panel se agrupan en `app/(panel)` sin cambiar sus URLs. Su layout permite visitantes sin sesión para mostrar las vistas públicas de lectura. Las páginas de administración y captura conservadas exigen sesión; en los catálogos, la página elige la versión pública o administrativa según la sesión. La sección Administración exige además Administrador. Las APIs de recetas devuelven 401 sin sesión y comprueban permisos para escritura; el Revisor no dispone de captura. El actor de creación/edición/archivo se deriva de la sesión, sustituyendo el actor fijo anterior en auditoría. El administrador puede trabajar en las recetas existentes mediante asignación explícita de captura dentro de la transacción.

El menú de perfil muestra nombre, correo y rol de la persona autenticada. Roles y permisos se presenta únicamente al Administrador. Cerrar sesión elimina la sesión del servidor y la cookie y devuelve al Resumen público. Las transiciones de autenticación recargan el documento para descartar estados y rutas del usuario anterior.

## Credenciales y sesiones

La migración `database/migrations/006_login.sql` añade `app_auth.credentials`, `sessions`, `login_attempts` y `activations`, con referencias a `ogp.usuarios`. No elimina registros del dominio. El administrador recibe también los permisos de captura del panel, sin incorporar las facultades sensibles de los roles complementarios históricos.

Contraseñas con scrypt, sal aleatoria por cuenta y comparación constante. La contraseña original no se conserva ni se registra. Las sesiones duran ocho horas: token aleatorio de 32 bytes en cookie HttpOnly, SameSite=Lax, Secure en producción. La base almacena el SHA-256 del token, no su valor utilizable. Se comprueban estado de usuario, caducidad y rol actual desde el servidor. Cinco intentos fallidos por correo bloquean nuevos intentos durante la ventana de 15 minutos; los mensajes de credenciales son genéricos. Los POST de autenticación exigen origen propio y JSON.

Referencia técnica: [Node.js Crypto](https://nodejs.org/download/release/v24.8.0/docs/api/crypto.html). El diseño de sesiones de base de datos sigue la guía de autenticación instalada con esta versión de Next.js (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`).

## Activación inicial

Con PostgreSQL local disponible y la base instalada:

```sh
node --env-file=.env.local scripts/setup-login.mjs CORREO_DEL_ADMINISTRADOR
```

El comando instala la migración y entrega un enlace de un solo uso válido durante 24 horas. Solo el primer administrador abre ese enlace y establece directamente su contraseña, de 12 a 128 caracteres. No se generan contraseñas predeterminadas ni se solicitan por chat. Al terminar vuelve al formulario de inicio de sesión. Si ya hay credenciales activadas, el comando se niega a sustituirlas. Un enlace vencido se puede regenerar antes de activar la primera cuenta.

No hay registro público ni recuperación automática de contraseña. La activación pública solo admite la primera cuenta de administrador, mientras no exista ninguna credencial. Después, únicamente una sesión de Administrador puede crear cuentas y asignar contraseñas desde Perfil → Roles y permisos → Gestionar personas. El menú de tres puntos de cada persona incluye «Asignar contraseña»; no se muestran contraseñas existentes. Capturistas y revisores no tienen acceso a estas acciones, incluido mediante llamadas directas a la API.

`/api/administracion/personas` comprueba sesión, rol y origen, valida los datos y guarda nombre, correo, rol y hash de contraseña en el servidor. Los cambios de identidad, rol o contraseña revocan las sesiones de la persona; si el administrador modifica su propia cuenta, vuelve a iniciar sesión. No se puede retirar el propio rol de administrador ni dejar el sistema sin administrador. Los cambios son transaccionales y usan un bloqueo compartido con la configuración inicial. Las asignaciones locales anteriores no se convierten automáticamente en cuentas. La matriz de acceso por sección sigue siendo una configuración local de interfaz; no es autoridad de seguridad.

El acceso tiene formulario a la izquierda y fotografía del Zócalo de Puebla a la derecha. En pantallas pequeñas se prioriza el formulario sin fotografía. La fuente y licencia CC0 de la imagen están en `public/images/README.md`.

## Verificación

- `node --test test/auth-passwords.test.mjs`: hashes, claves incorrectas, límites y tokens.
- `node --env-file=.env.local test/auth-flow.mjs`: activación, los tres roles al Resumen, acceso anónimo, administración, APIs, actor real, cierre de sesión, revocación y bloqueo de intentos. Usa cuentas sintéticas que se desactivan al terminar; no modifica la contraseña de la cuenta inicial.
- Las pruebas antiguas `test/reconnected-recipes.mjs` y `test/demo-postgres.mjs` requieren ahora `TEST_SESSION_COOKIE` de una sesión autenticada. No hay excepciones de autenticación para las pruebas.

Mantener el servidor restringido a loopback durante esta fase. El despliegue público deberá usar HTTPS y un dominio de origen definido, revisar recuperación de cuentas y límites globales de intentos, y migrar el catálogo administrativo de permisos según el modelo final de tres roles.

## Lectura pública

No se necesita cuenta para consultar el observatorio. «Acceso del equipo» abre el inicio de sesión de administrador, revisor o capturista. La vista pública no permite registrar ni editar contenido; usa únicamente el catálogo de publicaciones aprobadas. Capturista puede crear borradores; administrador y revisor pueden publicar o retirar las versiones públicas. Recetas mantiene una copia aprobada independiente mientras se edita el borrador.
