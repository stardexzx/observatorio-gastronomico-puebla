# PostgreSQL del Observatorio Gastronómico de Puebla

Esquema inicial para PostgreSQL 16 o superior con PostGIS 3.x y `btree_gist`. No contiene datos del mockup, cuentas, contraseñas ni municipios inventados. Se ejecuta sobre una base nueva y crea el esquema `ogp`.

## Instalación

El administrador de PostgreSQL debe crear previamente una base vacía y disponer de permisos para instalar extensiones, o pedir al proveedor que habilite `postgis` y `btree_gist`.

Desde la raíz del proyecto:

```sh
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f database/observatorio_puebla.sql
```

`DATABASE_URL` es la conexión que configure el usuario; no hay una conexión predeterminada. Alternativamente abrir `observatorio_puebla.sql` en el editor SQL de pgAdmin y ejecutarlo sobre una base vacía. El archivo es SQL puro y se ejecuta en una sola transacción: un fallo revierte la instalación completa.

No ejecutarlo de nuevo sobre una base ya instalada. Falla si `ogp` existe; no elimina ni reinicializa datos. Las modificaciones posteriores deben ser migraciones nuevas.

## Archivos

| Archivo | Contenido |
|---|---|
| `observatorio_puebla.sql` | Instalación completa, agrupada en una transacción |
| `migrations/001_schema.sql` | Tablas, claves, PostGIS, índices y restricciones |
| `migrations/002_workflow.sql` | Revisiones, permisos, validación, publicación y auditoría |
| `migrations/003_catalogs.sql` | Catálogos, roles, permisos y plantillas iniciales |
| `migrations/004_public_views.sql` | Lecturas públicas, búsqueda, mapa, red e indicadores |
| `migrations/005_integrity.sql` | Identidad de fichas, consentimientos y tareas externas |
| `tests/integrity.sql` | Pruebas transaccionales con datos sintéticos y ROLLBACK |
| `tests/validate_syntax.py` | Validación de sintaxis SQL/PL/pgSQL y referencias estructurales |

El archivo único y las migraciones son dos presentaciones del mismo esquema. Usar una de ellas para instalar; no ambas. Las migraciones separadas tienen transacciones individuales y se ejecutan en orden numérico. El archivo único es la opción preferida para una instalación inicial atómica.

## Decisiones de implementación

- Cada ficha de dominio utiliza el mismo UUID que su fila en `registros`. No hay un segundo `registro_id` dentro de la ficha. El tipo generado y una FK compuesta impiden vincularla con el tipo incorrecto.
- Crear un registro y su ficha en la misma transacción. Una comprobación diferida exige que exista la ficha antes de COMMIT.
- Nombre y padre cuando corresponda son mínimos de creación. Los demás campos pueden quedar incompletos como borrador. Los requisitos de publicación se comprueban al enviar y publicar.
- El contenido enviado se copia desde las tablas de trabajo a `registro_revisiones`; luego se sella. Fuentes, territorios, archivos y dependencias de esa revisión también quedan congelados.
- Una evaluación corresponde a una revisión y es inmutable. Si se solicitan correcciones, enviar otra revisión. Autovalidación permitida con los roles adecuados.
- Publicar sustituye la publicación anterior sin perder su historial. La API pública lee las revisiones aprobadas, nunca las tablas de trabajo.
- Las dependencias obligatorias deben estar publicadas. Las opcionales privadas no aparecen en la red pública. Retirar una preparación oculta sus variantes mediante comprobación de dependencias, preservando su historial interno.
- Las temporadas admiten meses no continuos o una descripción de periodo/festividad. Las comprobaciones diferidas permiten insertar temporada y meses en una transacción.
- Ubicaciones de mercados sin periodos solapados. Un establecimiento tiene una sola ubicación vigente; las fechas finales son exclusivas.
- Relación municipio/localidad con claves INEGI como texto. Las geometrías requieren SRID 4326. No se crean automáticamente los datos territoriales: deben importarse de la fuente real.
- El catálogo mundial se usa para ingredientes. La cobertura del mapa municipal cuenta vínculos explícitos de municipio/localidad en Puebla, sin distribuir datos estatales o regionales arbitrariamente.
- Archivos en almacenamiento externo. Publicación exige URL pública estable para los archivos visibles; evidencias privadas usan clave externa y acceso temporal gestionado por el backend.
- Fuentes restringidas necesitan `cita_publica` para poder citarse en una ficha sin revelar su referencia interna. El equipo debe redactarla sin datos privados.
- El catálogo de idiomas, especialidades y regiones queda vacío hasta contar con datos revisados. Los tipos y categorías iniciales sí se incluyen.

## Acceso, autenticación y responsabilidades del backend

Los roles `capturista`, `revisor`, etc. son roles de la aplicación, no cuentas de conexión de PostgreSQL. Autenticación todavía no está implementada. `usuarios.proveedor_auth` e `identificador_auth` permiten incorporar el proveedor elegido después.

Las funciones reciben UUID de actor. El backend debe derivarlo de una sesión autenticada; nunca aceptar un actor arbitrario del navegador. SQL comprueba permisos registrados, pero no autentica por sí solo la identidad enviada. El backend también debe autorizar cada edición directa de tablas y cada consulta de datos restringidos.

No se concede acceso a tablas ni funciones al rol PostgreSQL `PUBLIC`. No exponer una conexión propietaria, las tablas internas ni funciones administrativas directamente a clientes públicos. Las tablas no tienen RLS vinculada a un proveedor de autenticación todavía: esta versión utiliza un backend interno de confianza y entradas públicas limitadas.

Para atribuir las modificaciones directas a la persona autenticada, establecer por transacción:

```sql
BEGIN;
-- El valor lo obtiene el backend de su sesión autenticada.
SELECT set_config('ogp.actor_id', 'UUID_DEL_USUARIO', true);
-- Operaciones autorizadas de captura dentro de la transacción.
COMMIT;
```

El ejemplo requiere sustituir el UUID. No deja un actor persistente en el pool de conexiones. Los registros de auditoría guardan operación e identificadores, sin copiar contactos, contraseñas, tokens o documentos. El propietario de PostgreSQL puede alterar cualquier objeto: la inmutabilidad protege el uso ordinario, no a un administrador del servidor.

Al preparar despliegue, un administrador puede crear un rol de lectura SIN LOGIN y conceder únicamente:

```sql
CREATE ROLE ogp_lectura NOLOGIN;
GRANT USAGE ON SCHEMA ogp TO ogp_lectura;
GRANT EXECUTE ON FUNCTION ogp.consultar_fichas(text,text,integer,integer) TO ogp_lectura;
GRANT EXECUTE ON FUNCTION ogp.consultar_indicadores() TO ogp_lectura;
GRANT EXECUTE ON FUNCTION ogp.consultar_mapa(uuid) TO ogp_lectura;
GRANT EXECUTE ON FUNCTION ogp.consultar_red(uuid) TO ogp_lectura;
```

Es un ejemplo opcional, no se ejecuta durante instalación. Estas funciones de lectura tienen `SECURITY DEFINER` y ruta de búsqueda fija; solo devuelven proyecciones públicas. No conceder CREATE en `ogp` ni en los esquemas de su ruta de búsqueda a ese rol. El backend administrativo necesita una cuenta separada y permisos limitados según su implementación.

## Primeras cuentas y datos

No hay usuarios iniciales ni contraseña de administrador. El responsable del despliegue debe incorporar una identidad autenticada real, asignarle los roles necesarios y registrar `usuario_modulos` para sus ámbitos. El administrador no recibe automáticamente los roles editoriales.

Los roles base son combinables. Se agregan roles explícitos para importación, verificación de consentimientos, consulta de datos restringidos y generación de reportes. Esos permisos sensibles no se conceden por defecto a todos los revisores o administradores.

Antes de publicar fichas territoriales, importar el catálogo oficial de Puebla. El estado debe registrarse como tipo `estado`, con una `referencias_territoriales.identificador_externo = '21'` respaldada por fuente. Los municipios deben estar en `municipios_puebla`, con claves reales, fuente y versión. No se ejecutan peticiones a INEGI, Google ni almacenamiento desde estas migraciones.

## Funciones de trabajo

| Función | Uso |
|---|---|
| `crear_registro(usuario, tipo)` | Crear identidad; completar la ficha en la misma transacción |
| `enviar_revision(usuario, registro)` | Crear y sellar una revisión desde datos de trabajo |
| `evaluar_revision(usuario, revision, dictamen, observaciones)` | Validar o solicitar correcciones |
| `publicar_revision(usuario, revision)` | Publicar una revisión evaluada |
| `retirar_publicacion(usuario, registro, motivo)` | Retirar conservando historial |
| `activar_consentimiento(usuario, consentimiento)` | Verificar autorización con evidencia privada |
| `revocar_consentimiento(usuario, consentimiento)` | Bloquear autorización y encolar seguimiento externo |
| `consultar_fichas(tipo, busqueda, limite, offset)` | Leer fichas públicas con búsqueda y paginación |
| `consultar_mapa(municipio)` | Obtener puntos públicos de mercados como GeoJSON |
| `consultar_red(registro)` | Obtener conexiones públicas del registro |

Vistas internas como `v_estado_editorial` solo sirven al backend dentro del ámbito autorizado. La semántica de suficiencia de una fuente, clasificación jurídica y alcance de una autorización exige revisión humana; los controles SQL no la determinan automáticamente.

## Procesos que requieren aplicación

La base prepara datos y colas; no sustituye servicios externos. Queda por implementar autenticación, API, cargas y verificación real de archivos, consulta a INEGI/proveedores, importaciones, generación física de PDF/CSV/XLSX y procesamiento de tareas externas.

Al revocar un consentimiento, las lecturas públicas consultan su vigencia y bloquean los usos ligados a la revisión. Las referencias a archivos autorizados se filtran y se generan tareas para retirar acceso externo y revisar reportes. Un worker debe ejecutarlas, purgar cachés y comprobar vencimientos por fecha. Las copias ya descargadas fuera del sistema no se recuperan mediante SQL.

El equipo debe vincular a cada revisión los consentimientos que realmente requiere. Una ficha de persona exige autorización propia; una receta sin persona identificada no exige una cuenta o una persona ficticia. El SQL no puede detectar por sí solo nombres o testimonios escritos libremente que también necesiten autorización.

## Validación

Pruebas de integración, con PostgreSQL/PostGIS instalado:

```sh
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f database/tests/integrity.sql
```

Ejecutarlas en una base de pruebas. Verifican receta parcial, autovalidación, permisos, ingrediente/variedad, cantidades, inmutabilidad, publicación única, auditoría y dependencia de la preparación. Usan datos sintéticos y terminan con ROLLBACK.

Validación sintáctica opcional con Python y `pglast` instalado:

```sh
python3 database/tests/validate_syntax.py
```

Estado al entregar: se validaron sintaxis SQL, cuerpos PL/pgSQL y referencias estructurales con `pglast`. No se ejecutó instalación ni pruebas de integración sobre un servidor: en el entorno de trabajo no hay PostgreSQL, PostGIS ni Docker. El análisis sintáctico no comprueba el comportamiento real de triggers, permisos, extensiones o concurrencia.

## Referencias técnicas

- Las claves compuestas, restricciones y exclusiones siguen los mecanismos de [restricciones de PostgreSQL](https://www.postgresql.org/docs/16/ddl-constraints.html).
- Las políticas RLS requieren diseñar la identidad de sesión; esta entrega aún no las conecta a autenticación. [Seguridad por fila de PostgreSQL](https://www.postgresql.org/docs/16/ddl-rowsecurity.html).
- La validez geométrica utiliza [ST_IsValid de PostGIS](https://postgis.net/docs/ST_IsValid.html).
