# Modelo de datos del Observatorio Gastronómico de Puebla

Fecha: 12 de octubre de 2026. Estado: definición consolidada con esquema SQL inicial generado. No se ha instalado en un servidor.

Código y decisiones de implementación: [Guía PostgreSQL](../../database/README.md). Cada ficha de dominio usa el mismo UUID de `registros`; no duplica un segundo campo `registro_id` dentro de la ficha.

Documento principal para revisión integral: [Definición completa](definicion-completa-revision.md). Reúne requisitos de todos los módulos, catálogos iniciales, criterios de publicación e indicadores; sus propuestas nuevas requieren revisión del usuario.

## 1. Alcance y acuerdos

- El observatorio opera únicamente en Puebla. Los territorios del mundo se utilizan como contexto de producción, disponibilidad y uso de ingredientes.
- El visitante consulta sin cuenta. Las cuentas son para el equipo interno.
- Una preparación general tiene varias recetas documentadas. Las revisiones editoriales de una ficha no son nuevas variantes gastronómicas.
- Los ingredientes tienen variedades, nombres locales, temporadas y relaciones territoriales. Producción, cosecha, disponibilidad y mayor uso son conceptos distintos.
- Se documentan personas; colectivos quedan fuera del alcance inicial.
- Mercados y tianguis tienen una ubicación fija vigente inicialmente. Se conserva historial y se prepara la futura ampliación a ubicaciones por día.
- Se contempla importación de mercados en lote. El proveedor no está elegido: hay que evaluar cobertura, permisos de almacenamiento y costos.
- Expedientes legales e instrumentos emitidos son entidades diferentes. Vincular una preparación no extiende automáticamente la protección a sus recetas.
- Los archivos se alojan externamente. La base conserva referencias, metadatos y permisos.
- Podcast se incluye. Memoria histórica y experiencias de turistas quedan para después.
- La red de conocimiento se deriva de relaciones del catálogo.
- Una persona puede capturar y validar su propia información con los roles correspondientes. Publicar exige permiso adicional.

## 2. Convenciones propuestas

- PostgreSQL y PostGIS como base técnica propuesta, pendiente de implementación.
- Claves primarias internas UUID, fechas de auditoría con zona horaria y claves INEGI como texto para conservar ceros iniciales.
- Tablas principales: `id`, `creado_en`, `actualizado_en`, `creado_por`. Las fichas publicables incorporan `registro_id` único.
- Catálogos pequeños usan `id`, `codigo` único, `nombre`, `activo`.
- Campos de fecha histórica pueden quedar vacíos o acompañarse de precisión y texto original; no inventar fechas exactas.
- Los nombres no son claves únicas: dos personas, mercados o variantes pueden llamarse igual.
- Las tablas puente tienen claves foráneas e índices en ambos extremos. La unicidad depende de la relación; no impide varias evidencias o participaciones válidas.
- Las claves foráneas impiden referencias inexistentes. La eliminación física de contenido publicado queda restringida; retirar publicación conserva historial.
- Los campos marcados como obligatorios para publicar pueden faltar durante el borrador.
- No usar una tabla genérica `tipo_entidad + entidad_id` para relaciones del catálogo: cada vínculo tendrá claves foráneas verificables.

## 3. Territorio

| Tabla | Campos principales y restricciones |
|---|---|
| `territorios` | `id`, `tipo_id`, `nombre`, `codigo_pais` opcional, `geometria` opcional, fuente y fecha de referencia. País, estado, municipio, localidad o región. |
| `tipos_territorio` | Catálogo de tipos. |
| `territorio_relaciones` | `territorio_id`, `territorio_contenedor_id`, `tipo_relacion`, vigencia opcional. Sin autorrelaciones; evitar ciclos de pertenencia. Permite regiones superpuestas. |
| `municipios_puebla` | `territorio_id` PK/FK, `cve_ent`, `cve_mun`, `cvegeo` única, geometría municipal y versión de la fuente. `cve_ent = '21'`. |
| `localidades_puebla` | `territorio_id` PK/FK, `municipio_id` FK, clave INEGI única cuando exista, geometría opcional. |
| `referencias_territoriales` | Fuente, identificador externo, fecha de corte y versión de geometría asociada a un territorio. |

Las regiones internas de Puebla necesitan una clasificación con nombre y fuente; no asumir que toda región tiene una delimitación oficial única. Los domicilios de mercados deben referir a un municipio de Puebla. La procedencia internacional de un ingrediente no lo incorpora al mapa público de establecimientos.

## 4. Preparaciones y recetas documentadas

| Tabla | Campos principales |
|---|---|
| `preparaciones` | `registro_id`, nombre principal, descripción general, categoría. |
| `preparacion_nombres` | Preparación, nombre alternativo, lengua y territorio opcionales, fuente. |
| `recetas_documentadas` | `registro_id`, `preparacion_id` obligatorio, título, descripción, rendimiento textual, fecha y contexto de documentación. |
| `receta_pasos` | Receta, orden positivo, instrucciones; orden único dentro de la receta. |
| `receta_ingredientes` | Receta, ingrediente, variedad opcional, cantidad numérica opcional, unidad opcional, cantidad textual, forma de uso, grupo y orden. |
| `tecnicas` / `receta_tecnicas` | Catálogo de técnicas y vínculo con receta, con observaciones. |
| `receta_personas` | Receta, persona, tipo de participación, observaciones y evidencia. |
| `receta_territorios` | Receta, territorio, vínculo: origen declarado, documentación o práctica actual, con evidencia. |

Los mínimos de publicación y el tratamiento de documentación parcial se detallan en [Preparaciones y recetas: campos y publicación](preparaciones-recetas.md). Incluyen fuentes, vínculo documentado con Puebla y validación de la revisión exacta. La documentación histórica incompleta puede publicarse como parcial con limitaciones explícitas. El usuario aprobó estos criterios el 12 de octubre de 2026.

Restricciones: cantidad numérica positiva cuando exista; variedad debe pertenecer al ingrediente seleccionado mediante restricción compuesta; cada renglón debe identificar un ingrediente. La misma receta puede repetirlo en diferentes grupos. No imponer conversiones a expresiones como “un puñado”.

## 5. Ingredientes y variedades

| Tabla | Campos principales |
|---|---|
| `ingredientes` | `registro_id`, nombre, categoría, descripción, nombre científico opcional. |
| `ingrediente_variedades` | `registro_id`, ingrediente obligatorio, nombre y características distintivas. |
| `ingrediente_nombres` / `variedad_nombres` | Entidad, nombre alternativo, lengua, contexto territorial y fuente. |
| `ingrediente_territorios` / `variedad_territorios` | Territorio, tipo de relación: origen histórico, cultivo, recolección, producción, venta o uso; descripción y evidencia. |
| `ingrediente_temporadas` / `variedad_temporadas` | Territorio, tipo de temporada, todo el año o meses, contexto/festividad, descripción y referencia temporal. |
| `ingrediente_produccion` / `variedad_produccion` | Territorio, periodo, cantidad, unidad, métrica, método y fuente. Solo cifras documentadas. |

Para meses no continuos se usan `ingrediente_temporada_meses` y `variedad_temporada_meses`: temporada + mes entre 1 y 12, combinación única. Permite noviembre–febrero y temporadas fragmentadas. `todo_el_ano` y la selección de meses deben ser coherentes.

Publicación: nombre, clasificación, descripción y evidencia; en variedades también ingrediente padre y rasgos que las distinguen. Temporadas y distribución no son obligatorias si no están documentadas.

La clasificación “principales regiones productoras” se calcula solo con métricas, periodos y unidades comparables. La ausencia de datos no equivale a producción cero. No almacenar rankings manuales ni mezclar presencia documentada con volumen de producción.

## 6. Personas

| Tabla | Campos principales |
|---|---|
| `personas` | `registro_id`, nombre público, semblanza, trayectoria, inicio de actividad opcional, experiencia estimada y fecha de referencia opcionales. |
| `persona_datos_restringidos` | `persona_id` único, nombre interno opcional, contactos; acceso restringido. |
| `tipos_participacion` / `persona_tipos_participacion` | Cocinera/o, productor/a, comerciante u otra participación. Varias por persona. |
| `especialidades` / `persona_especialidades` | Saberes y especialidades documentadas. |
| `lenguas` / `persona_lenguas` | Lenguas declaradas; no inferirlas por origen territorial. |
| `persona_territorios` | Procedencia, residencia pública autorizada o práctica/transmisión de saberes; localidad/comunidad cuando corresponda. |
| `reconocimientos` | Persona, nombre, entidad otorgante, fecha/precisión, descripción y evidencia. |

Publicación: nombre público, semblanza o trayectoria, tipo de participación, evidencia y autorización aplicable. No exigir contacto ni domicilio particular. Una persona documentada no es automáticamente un usuario interno. La participación en una receta no atribuye propiedad exclusiva del saber.

## 7. Mercados, tianguis e importación

| Tabla | Campos principales |
|---|---|
| `mercados` | `registro_id`, nombre, tipo mercado/tianguis, descripción, estado operativo y fecha de comprobación. |
| `mercado_ubicaciones` | Mercado, dirección, `municipio_id`, localidad opcional, punto geográfico, inicio/fin de vigencia, precisión y fuente. |
| `mercado_horarios` | Ubicación, día de semana, apertura/cierre opcionales, texto de horario, indicador de cierre al día siguiente. |
| `mercado_temporadas` | Mercado, periodo de operación y observaciones. |
| `mercado_ingredientes` | Mercado, ingrediente, variedad opcional, fecha observada, disponibilidad y procedencia documentada opcional. |
| `mercado_personas` | Mercado, persona, participación, vigencia opcional. |
| `servicios` / `mercado_servicios` | Servicios documentados y fecha de comprobación. |
| `mercado_identificadores_externos` | Mercado, proveedor e identificador; combinación proveedor/identificador única. |
| `importaciones` | Proveedor, criterios, fecha, usuario responsable, estado y resumen de resultados. |
| `importacion_candidatos` | Lote, identificación externa, campos permitidos por la fuente, decisión, coincidencia propuesta, errores y caducidad si aplica. |

Publicación: nombre, tipo, municipio de Puebla, ubicación y evidencia. Los horarios desconocidos se muestran como no documentados. Una sola ubicación vigente por mercado en la primera versión; periodos válidos sin solapamiento. Conservar ubicaciones históricas.

La deduplicación combina identificadores externos, proximidad y nombre; coincidencias dudosas requieren revisión. Las sincronizaciones proponen cambios sin sobrescribir correcciones internas. No prometer cobertura completa de una API ni almacenar contenido externo sin cumplir sus condiciones. Venta no equivale a producción local.

## 8. Protección legal

| Tabla | Campos principales |
|---|---|
| `expedientes_legales` | `registro_id`, título, tipo solicitado, autoridad, folio opcional, fecha de solicitud, estado del trámite. |
| `expediente_eventos` | Expediente, tipo de actuación, fecha, descripción y evidencia. |
| `instrumentos_legales` | `registro_id`, nombre oficial, tipo, autoridad, referencia oficial, fecha de emisión, vigencia y situación documentada. |
| `expediente_instrumentos` | Relación entre expedientes y sus instrumentos resultantes; cardinalidad flexible respaldada por fuentes. |
| `tipos_instrumento_legal` | Tipos y configuración de campos/estados aplicables. |
| `instrumento_territorios` | Instrumento, territorio, alcance y referencia documental. |
| `instrumento_preparaciones`, `instrumento_recetas`, `instrumento_ingredientes`, `instrumento_variedades` | Claves foráneas explícitas, alcance y fuente/página/apartado. |

Publicación de instrumento: nombre oficial, tipo, autoridad, referencia oficial y alcance documentado. La vigencia no es obligatoria si el instrumento no establece término. Publicación de expediente: título, autoridad, estado y evidencia. Los datos de ejemplo del mockup no se incorporarán como hechos jurídicos comprobados.

Estado jurídico, estado del trámite y estado editorial se mantienen separados. La protección nunca se hereda automáticamente a variantes o territorios.

## 9. Podcast y archivos

| Tabla | Campos principales |
|---|---|
| `podcasts` | `registro_id`, nombre de serie, descripción y portada opcional. |
| `episodios` | `registro_id`, podcast, título, resumen, número opcional, fecha editorial, transcripción textual opcional. |
| `episodio_archivos` | Episodio, archivo, función: audio principal, portada, transcripción o material adicional. |
| `episodio_personas` | Episodio, persona y función; verificar autorización aplicable. |
| `episodio_preparaciones`, `episodio_recetas`, `episodio_ingredientes`, `episodio_mercados`, `episodio_territorios` | Relaciones explícitas con entidades mencionadas. |
| `episodio_enlaces` | Plataforma, URL y tipo: página, reproducción incrustada o distribución. |
| `archivos` | Proveedor, clave externa, URL pública opcional, nombre, MIME, tamaño, duración opcional, crédito, licencia, visibilidad, estado y responsable. |

Publicación de episodio: serie, título, resumen y al menos una opción funcional para escuchar; autorizaciones cuando correspondan. Una página externa se identifica como salida a plataforma y no como audio reproducible dentro del observatorio. Los créditos y vínculos adicionales se precisan en la definición completa.

Los archivos pesados no van en PostgreSQL. Las cargas se realizan al almacenamiento externo y se verifican antes de marcarse disponibles. Los archivos privados se entregan con autorización y enlaces temporales generados al solicitar acceso; esos enlaces no se persisten como referencia estable. La ubicación/proveedor se centraliza en `archivos` para permitir migraciones.

Las asociaciones con fichas usan tablas explícitas (`receta_archivos`, `persona_archivos`, etc.). Los archivos enlazados públicamente deben tener autorización propia. Un archivo público que luego se retire también requiere retirar su acceso en almacenamiento/CDN.

## 10. Fuentes y consentimientos

- `fuentes`: tipo, título, autor/institución opcional, fecha/precisión, referencia, URL opcional y fecha de consulta. Fuente no es lo mismo que archivo.
- Cada familia de fichas tiene su tabla de fuentes con entidad, fuente, página/apartado, afirmación respaldada y observaciones; los mismos documentos pueden respaldar varias fichas.
- `consentimientos`: persona, fecha, vigencia opcional, estado, alcance y restricciones; evidencia privada vinculada mediante `consentimiento_archivos`.
- `consentimiento_registros`, `consentimiento_revision_alcances` y `consentimiento_archivos_autorizados`: autorizaciones para fichas/revisiones concretas y archivos o testimonios identificados, mediante claves foráneas explícitas. No extrapolar autorización a nuevos usos. `consentimiento_archivos` conserva la evidencia de autorización, separada del material autorizado.
- Las revocaciones conservan historial y disparan revisión/retirada del contenido afectado. Autorizar la ficha no autoriza automáticamente todo audio o fotografía.

## 11. Usuarios y permisos

`usuarios` conserva correo único normalizado, nombre, estado e identidad de autenticación. El mecanismo de autenticación está pendiente: si es externo se guarda su identificador; si es propio se usan credenciales seguras separadas, nunca contraseñas en texto plano.

Tablas: `roles`, `permisos`, `usuario_roles`, `rol_permisos`, `asignaciones_registro`, `invitaciones`, `eventos_auditoria`. Las asignaciones pueden incluir módulo y fichas. Los secretos de invitación se almacenan como hash y caducan; la credencial original no se registra en auditoría.

Roles propuestos: capturista, revisor, publicador y administrador. Cada permiso representa módulo + acción. Administrar cuentas no concede automáticamente validación editorial. Un usuario puede tener varios roles y validar su propia revisión. Publicar exige permiso de publicación y validación de esa revisión.

## 12. Versiones editoriales y publicación

| Tabla | Campos principales |
|---|---|
| `registros` | UUID estable, tipo, responsables, fechas y retiro/archivo interno. |
| `registro_revisiones` | Registro, número de revisión, estado, autor, fecha, contenido inmutable al enviarse, versión del formato e integridad del contenido. |
| `evaluaciones_revision` | Revisión exacta, revisor, dictamen, fecha y observaciones. |
| `publicaciones` | Registro, revisión aprobada, publicador, fecha de publicación, retiro y motivo. |
| `eventos_editoriales` | Transiciones y responsables; validación, correcciones, publicación y retiro. |

Propuesta de implementación: tablas de dominio normalizadas para edición y relaciones; al enviar a revisión se crea una instantánea inmutable que contiene campos, relaciones y referencias de archivos/fuentes/consentimientos. Corregir produce una nueva revisión; nunca modifica la ya evaluada. La publicación apunta a una instantánea específica. Las consultas públicas y sus proyecciones se construyen desde las revisiones publicadas, no desde borradores ni tablas de trabajo mutables.

Las instantáneas pueden usar JSONB versionado, validado por esquema; no reemplazan las relaciones normalizadas ni contienen binarios. Los identificadores de archivos y entidades referenciadas permanecen verificables. Los datos privados se conservan separados y se excluyen de las proyecciones públicas.

Restricciones: número de revisión único por registro; la revisión publicada debe pertenecer al mismo registro y tener dictamen válido; una sola publicación activa por registro. Publicación, actualización de proyecciones y registro del evento deben ser atómicos o utilizar una entrega transaccional a procesos de actualización. Las dependencias públicas se verifican para evitar mostrar fichas internas por un enlace.

Flujo: borrador → en revisión → validado → publicado; correcciones solicitadas → nueva revisión. Una nueva revisión no cambia la versión pública anterior. Un retiro no elimina la documentación interna.

## 13. Red, indicadores y reportes

- La red se deriva de los vínculos publicados: utiliza, prepara, se vende en, se documenta en, cuenta con instrumento relacionado o se menciona en episodio. No requiere otra base de datos inicial.
- Conteos separados de preparaciones, recetas documentadas, ingredientes, variedades, personas, mercados/tianguis, expedientes e instrumentos.
- Por municipio: contar cada entidad una vez para el tipo de vínculo elegido. El total estatal usa entidades únicas; no sumar municipios para obtenerlo.
- Datos de producción internacional de ingredientes no se incluyen en cobertura municipal gastronómica de Puebla.
- Dashboard público: solo información publicada y autorizada. Dashboard interno: pendientes, revisiones y calidad, dentro del alcance de permisos.
- `reportes_generados`: plantilla/versión, filtros, fecha de corte, solicitante, estado, archivo externo y visibilidad. Los reportes deben registrar qué versión de datos utilizaron.
- Los agregados son vistas o proyecciones recalculables; no son la fuente de verdad. Los reportes públicos no incluyen contactos, consentimientos ni notas internas.

## 14. Índices y reglas de integridad a implementar

1. Índices en claves foráneas, registro/tipo, estados editoriales y fechas de publicación.
2. GiST para geometrías y ubicaciones; punto con longitud/latitud en SRID 4326. Para distancias, usar geografía o proyección apropiada, no grados como metros.
3. Unicidad en claves INEGI, correo normalizado, proveedor/identificador externo, registro/revisión y entidades 1:1 con `registros`.
4. Una única ficha de dominio del tipo correcto por registro; comprobar coherencia del tipo mediante restricción o trigger en SQL.
5. Unicidad de ubicación vigente y publicación activa; validar fechas inicio/fin.
6. Restricción compuesta ingrediente/variedad tanto en recetas como en oferta de mercados.
7. Índices de búsqueda por nombre y texto publicados; nombres parecidos generan candidatos a duplicado, no bloqueo automático.
8. Auditoría sin secretos, tokens ni copias innecesarias de información personal.

## 15. Decisiones pendientes antes del esquema SQL

- Confirmar clasificación de regiones de Puebla y catálogos de categorías, técnicas, unidades y participaciones.
- Definir y aprobar los mínimos de publicación de los módulos restantes. Los criterios de preparaciones y recetas, incluida la documentación parcial, ya están aprobados.
- Definir requisitos de evidencia y quién decide la suficiencia de un consentimiento.
- Elegir autenticación, almacenamiento y fuente de importación tras evaluar opciones.
- Aprobar la estrategia de revisiones inmutables/proyecciones públicas y precisar la gestión de cambios en dependencias.
- Definir criterios y fechas de referencia de métricas de calidad, producción y reportes.

Se generó el esquema SQL inicial bajo `database/`, sin servicios, cuentas externas ni datos reales creados. La validación disponible es sintáctica y estructural; las pruebas sobre PostgreSQL/PostGIS están pendientes de disponer de un servidor.
