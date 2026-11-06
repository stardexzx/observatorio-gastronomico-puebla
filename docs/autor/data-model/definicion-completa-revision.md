# Definición completa para revisión

Observatorio Gastronómico de Puebla · 12 de octubre de 2026 · Versión 1 de definición.

Este documento reúne el comportamiento esperado y los criterios del modelo de datos. A petición del usuario se generó después el [esquema PostgreSQL inicial](../../database/README.md); todavía no hay base instalada ni aplicación implementada. Los acuerdos expresamente confirmados se mantienen; las propuestas restantes pueden corregirse y reflejarse en nuevas migraciones.

## 1. Alcance confirmado

1. Consulta pública sin cuenta; acceso privado para el equipo que captura y gestiona información.
2. Cobertura del observatorio exclusivamente en Puebla. Producción y uso de ingredientes pueden tener contexto territorial mundial.
3. Preparaciones generales con varias recetas documentadas, distintas de las revisiones editoriales de cada ficha.
4. Ingredientes y variedades, temporadas de producción/cosecha, disponibilidad y mayor uso gastronómico, además de regiones productoras y de uso.
5. Personas individuales con distintas participaciones. Colectivos excluidos por ahora.
6. Mercados y tianguis con ubicación fija vigente. Preparación para ubicaciones variables futuras.
7. Importación de establecimientos desde fuentes externas para evitar captura individual. Proveedor por seleccionar.
8. Expedientes e instrumentos de protección legal, podcast, mapa, dashboards, reportes y red de conocimiento.
9. Archivos pesados externos a la base y al servidor de aplicación; referencias y metadatos en la base.
10. Roles combinables; autovalidación permitida con los permisos correspondientes. Publicar exige permiso de publicación.
11. Recetas completas y parcialmente documentadas pueden publicarse con los requisitos aprobados; sus limitaciones serán visibles.
12. Memoria histórica y experiencias de turistas quedan fuera de esta versión.

## 2. Organización pública y administrativa propuesta

| Público | Equipo interno |
|---|---|
| Inicio y panorama general | Dashboard de gestión y pendientes |
| Preparaciones y sus recetas documentadas | Captura, edición y relaciones de fichas |
| Ingredientes y variedades | Catálogos y validación de fuentes |
| Personas y saberes | Personas, autorizaciones y datos restringidos |
| Mercados/tianguis y mapa | Importaciones, coincidencias y ubicaciones |
| Protección legal | Expedientes, instrumentos y documentos |
| Podcast | Series, episodios y archivos externos |
| Datos, reportes y red de conocimiento | Revisión, publicación, exportaciones y auditoría |
| Acerca del observatorio y metodología | Usuarios, roles y configuración |

El acceso a administración se presenta como enlace de acceso del equipo, sin exigir cuenta para explorar. No mostrar notificaciones o avatar de cuenta al público por el solo hecho de aparecer en el mockup.

## 3. Reglas comunes de las fichas

- Borradores incompletos permitidos; la validación de publicación se aplica al enviarlos y nuevamente al publicar.
- Todas las fichas públicas tienen identidad estable, fuentes, revisión aprobada y atribución de responsabilidades internas.
- No interpretar un campo vacío como cero, inexistencia o ausencia comprobada.
- Las fechas pueden ser exactas, aproximadas, un año o periodo, o desconocidas. Guardar precisión y referencia original.
- Identificadores y relaciones mediante claves foráneas; nombres y textos no sustituyen referencias a otras fichas.
- Toda relación publicada tiene tipo y evidencia cuando expresa una afirmación factual. No heredar origen, protección o consentimiento por asociación.
- La categoría, visibilidad, suficiencia documental y estado editorial son conceptos diferentes.
- Los ejemplos de los mockups no son datos reales aprobados para poblar la base.

## 4. Preparaciones y recetas: criterios aprobados

| Entidad | Obligatorio para publicar | Opcional |
|---|---|---|
| Preparación | Nombre, categoría, descripción, fuente y vínculo con Puebla | Nombres locales, fotografías, variantes ya capturadas |
| Receta documentada | Preparación padre, título, descripción, tipo de documentación, fuente y vínculo propio con Puebla | Personas identificadas, fecha histórica exacta, rendimiento, fotografías y técnicas catalogadas |
| Receta completa | Lo anterior, ingredientes y procedimiento suficientemente documentados y revisados | Cantidades precisas cuando la fuente no las proporciona |
| Receta parcial | Requisitos comunes y explicación concreta de lo que falta | Ingredientes o procedimiento faltantes según evidencia disponible |

Ingredientes de receta: ingrediente, variedad opcional, cantidad y unidad cuando se conozcan, cantidad textual, grupo, forma de uso y orden. Cantidad positiva; variedad del ingrediente correcto. Pasos ordenados con instrucciones no vacías. Ingredientes repetidos por grupo permitidos.

La receta pública enlaza a una preparación pública. Vínculo con el estado de Puebla es suficiente si no se conoce municipio; no sumar esa receta a municipios supuestos. Una mención aislada sin características de una variante respalda la preparación general, no una nueva receta.

Detalle: [Preparaciones y recetas](preparaciones-recetas.md).

## 5. Ingredientes y variedades: propuesta

| Entidad | Obligatorio para publicar | Opcional |
|---|---|---|
| Ingrediente | Nombre, categoría, descripción y fuente | Nombre científico, nombres locales, foto, temporadas, distribución y cifras |
| Variedad | Ingrediente padre público, nombre, rasgos distintivos y fuente | Nombre científico y nombres locales propios, multimedia |
| Nombre local | Nombre, ingrediente/variedad y fuente | Lengua y territorio cuando se conozcan |
| Temporada | Ingrediente/variedad, territorio, tipo, meses/todo el año o periodo descriptivo y fuente | Festividad y observaciones |
| Relación territorial | Ingrediente/variedad, territorio, tipo de vínculo y fuente | Descripción ampliada |
| Cifra de producción | Ingrediente/variedad, territorio, periodo, métrica, cantidad, unidad y fuente | Método y notas de comparabilidad |

Tipos de temporada iniciales: producción, cosecha, recolección, disponibilidad comercial y mayor uso gastronómico. Separar cultivo de cosecha si la fuente distingue ambos. Meses múltiples y periodos que cruzan el año permitidos. Si solo se conoce una festividad, guardar el periodo descriptivo sin inventar meses.

Relaciones territoriales: origen histórico declarado, cultivo, producción, recolección, venta y uso gastronómico. Las regiones pueden superponerse y deben identificarse con su clasificación/fuente.

Las cifras admiten cero si una fuente lo documenta expresamente; valores negativos se rechazan. No comparar toneladas producidas con superficie cultivada ni mezclar periodos. “Principales productores” requiere comparabilidad; con información descriptiva mostrar “producción documentada en”.

La presencia en el catálogo se justifica por su relación documentada con la gastronomía de Puebla, aunque su producción se encuentre fuera del estado. Un ingrediente puede publicarse sin conocer su distribución completa.

## 6. Personas: propuesta

| Obligatorio para publicar | Opcional público | Restringido |
|---|---|---|
| Nombre público, semblanza o trayectoria, al menos una participación, vínculo gastronómico con Puebla, fuente y autorización aplicable | Especialidades, lenguas declaradas, territorios, experiencia, reconocimientos, recetas y archivos autorizados | Contactos, nombre interno si difiere, notas privadas y evidencia de consentimiento |

Participaciones iniciales: cocinera/o, productor/a, comerciante, portador/a o transmisor/a de saberes. Se pueden agregar otras desde catálogo. No confundir estos tipos con los roles de acceso al sistema.

Persona–receta: comparte el saber, prepara la variante, aporta testimonio u otra función documentada. La persona que captura se registra en auditoría; no se le atribuye por eso la autoría gastronómica.

La persona puede tener varias participaciones y territorios. No se exige cuenta, teléfono, edad, lengua o domicilio. No inferir identidad cultural ni lengua por municipio. La experiencia estimada incluye fecha de referencia; no aumenta automáticamente si es solo una estimación.

Reconocimientos: nombre, entidad otorgante o descripción de procedencia, fecha/precisión, evidencia. No equivalen a instrumento legal ni acreditación emitida por el observatorio.

## 7. Mercados y tianguis: propuesta

| Obligatorio para publicar | Opcional |
|---|---|
| Nombre, tipo, municipio de Puebla, punto geográfico con precisión, descripción de ubicación o dirección, fuente y fecha de comprobación | Descripción gastronómica, localidad, horarios, temporada de operación, servicios, productos y personas vinculadas |

Una ubicación vigente por establecimiento. Historial con inicio/fin de vigencia; horarios asociados a la ubicación. Día semanal, hora de apertura/cierre cuando se conozca y texto original de horario. Horarios nocturnos pueden cerrar al día siguiente.

Estados operativos iniciales: operación documentada, cierre temporal, cierre permanente y por confirmar. No afirmar funcionamiento actual solo porque aparece en una fuente antigua. Los lugares cerrados pueden conservar ficha histórica, diferenciados de los activos en filtros y mapa.

Ubicación aproximada se etiqueta como tal. Un punto municipal central no sustituye la ubicación real de un mercado. Si falta el punto, queda pendiente de publicación como establecimiento en esta versión.

Oferta de ingredientes: producto/variedad, fecha de observación, fuente, temporada si se conoce y procedencia documentada opcional. No representa inventario en tiempo real. Servicios desconocidos no se muestran como ausentes.

Importación: consultas acotadas a Puebla → candidatos → deduplicación → validación por lote → borradores → revisión/publicación. Identificador externo único por proveedor. Mismo nombre no basta para fusionar; proximidad no basta para identificar un mercado completo. Productos, fuentes y fechas sobreviven a la fusión revisada de duplicados.

Actualizaciones externas generan propuestas de cambio. No sobrescriben ubicaciones corregidas por el equipo ni publican automáticamente candidatos. Se puede revisar un lote claro en conjunto; las excepciones se separan. Datos temporales se conservan solo durante el periodo permitido por la fuente.

## 8. Protección legal: propuesta

| Entidad | Obligatorio para publicar | Opcional o según instrumento |
|---|---|---|
| Expediente | Título, tipo solicitado, autoridad, estado del trámite, evidencia y relación con patrimonio de Puebla | Folio, fecha exacta, actuaciones y documentos públicos |
| Instrumento | Nombre oficial, tipo, autoridad emisora, referencia oficial, alcance, situación documentada y fecha de revisión | Vigencia, fecha exacta cuando no se conozca, expediente de origen |
| Vínculo protegido/reconocido | Instrumento, entidad o territorio, alcance y fuente con apartado/página cuando exista | Restricciones y observaciones |

Catálogo propuesto: denominación de origen, indicación geográfica, declaratoria y otro instrumento documentado. La clasificación se ajusta a cada fuente oficial; no atribuir efectos jurídicos uniformes por pertenecer a una categoría.

Trámites: solicitado, en evaluación, con requerimientos, resuelto favorablemente, rechazado, desistido y situación no documentada. Instrumentos: situación vigente documentada, vencido, revocado/sin efectos según fuente o situación no determinada. No deducir vigencia solo de su fecha.

Una solicitud no aparece como protección otorgada. La ficha distingue reconocimiento de protección y expone el alcance literal respaldado, sin extenderlo a todas las variantes. Los documentos internos no se hacen públicos automáticamente.

## 9. Podcast: propuesta

| Entidad | Obligatorio para publicar | Opcional |
|---|---|---|
| Serie | Nombre, descripción y propósito/vínculo con el observatorio | Portada, créditos y enlaces de distribución |
| Episodio | Serie pública, título, resumen, medio reproducible disponible, créditos y autorizaciones aplicables | Número, temporada, portada, duración conocida, transcripción y fecha original externa |
| Participante | Persona o crédito público autorizado y función | Enlace a ficha pública de persona |

No exigir ficha de persona a todo conductor, técnico o invitado; `episodio_creditos` permite crédito autorizado en texto con función y referencia opcional a persona. Evita crear perfiles gastronómicos artificiales para el equipo de producción.

Los episodios pueden enlazar preparaciones, recetas, ingredientes, variedades, personas, mercados, instrumentos legales y territorios. Cada enlace indica el elemento mencionado; no implica validación automática de todas las afirmaciones del audio.

Un enlace a una página de plataforma no es un enlace directo de audio. Registrar tipo de reproducción: archivo externo, reproductor incrustado compatible o salida a plataforma. La última opción muestra “Escuchar en plataforma”; no promete reproducción dentro del observatorio. Al publicar se exige al menos una opción funcional y clara para escuchar.

Transcripción recomendada, opcional inicialmente. Si se incorpora búsqueda en ella, conservar correcciones y permisos con la revisión publicada. Fecha de publicación en el observatorio separada de fecha original del episodio.

## 10. Archivos y fuentes: propuesta

Archivos: proveedor y clave externa para los gestionados; URL estable y tipo de enlace para referencias externas. Nombre, MIME/tipo cuando verificable, tamaño/duración cuando disponibles, estado, visibilidad, crédito y condiciones de uso. No exigir metadatos que la plataforma externa no entrega.

Estados: carga pendiente, disponible, error, retirado. Visibilidad: público o restringido. Evidencias de consentimiento siempre restringidas. Cada archivo ligado a una ficha tiene función, orden opcional y texto alternativo/caption cuando corresponda; una imagen informativa pública necesita descripción accesible.

Carga directa externa con autorización; la base no guarda binarios ni enlaces temporales como identidad permanente. Archivo disponible antes de publicar. Cambiar un archivo publicado genera una revisión nueva; no sobrescribirlo silenciosamente bajo la misma clave. Retirar contenido propio también retira su acceso externo y actualiza cachés. Los archivos de terceros no pueden retirarse por nosotros; se elimina su referencia pública.

Fuentes: tipo, título/identificación, referencia, fecha de consulta; autor/institución y fecha original cuando se conozcan. Referencia puede ser bibliográfica o interna, no necesariamente URL. Vínculo a ficha incluye afirmación respaldada, página/segmento si existe y observaciones. El archivo de una fuente puede ser privado aunque su referencia bibliográfica sea pública.

Fuentes iniciales: entrevista, observación de campo, documento histórico, publicación/recetario, publicación oficial, conjunto de datos/API. No confundir archivo con fuente ni asumir que una fuente autoriza su reproducción completa.

## 11. Consentimientos: propuesta

Se registra persona, quién autoriza y en qué calidad, fecha, alcance, uso permitido, evidencia privada, vigencia si existe, restricciones y estado. Autorizaciones para perfil, imagen, audio, video, testimonio o episodio identificados mediante vínculos explícitos a registros/revisiones y archivos.

Estados: pendiente, activo, vencido, revocado o sustituido. Un revisor con permiso de consentimiento verifica evidencia y alcance; el publicador comprueba que la revisión visible cumple las restricciones. No basta marcar una casilla sin evidencia.

Revocación: registrar acción, fecha y motivo; bloquear el uso afectado y retirar o sustituir el contenido público correspondiente, incluyendo archivos propios y exportaciones públicas bajo control del sistema. Conservar trazabilidad restringida. No prometer borrar copias previamente descargadas por visitantes.

Los textos/formularios definitivos y plazos de conservación necesitan validación institucional; la estructura permite registrarlos sin dar por aprobados esos documentos.

## 12. Usuarios, roles y permisos: propuesta con autovalidación confirmada

Altas por invitación del administrador. Cuenta con correo normalizado único, nombre, estado e identidad de autenticación. Estados: invitado, activo y desactivado. Acceso y datos personales restringidos.

| Acción | Capturista | Revisor | Publicador | Administrador |
|---|---|---|---|---|
| Crear y editar borradores | Propios/asignados | Con permiso de captura adicional | Con permiso de captura adicional | Con permiso editorial adicional |
| Enviar revisión | Propios/asignados | Con permiso de captura adicional | Con permiso de captura adicional | Con permiso editorial adicional |
| Validar o solicitar correcciones | No | Módulos/fichas autorizados | Con rol de revisor | Con rol de revisor |
| Publicar/retirar | No | Con rol de publicador | Módulos/fichas autorizados | Con rol de publicador |
| Gestionar cuentas, roles y catálogos | No | No | No | Sí |
| Importar candidatos | Con permiso específico | Con permiso específico | Con permiso específico | Con permiso específico |
| Evidencias de consentimiento/contactos | Según permiso específico | Según permiso específico | Según permiso específico | Según permiso específico |
| Auditoría | Actividad propia | Ámbito asignado | Ámbito asignado | Administración global |

Roles combinables y permisos por módulo. Capturista + revisor permite autovalidar; sumar publicador permite autopublicar, cumpliendo requisitos y dejando trazabilidad. Administrador no tiene automáticamente acceso editorial o a evidencias privadas.

Las asignaciones de ficha se almacenan separadas de los roles. No implementar excepciones individuales ocultas: todo permiso adicional se concede mediante un rol explícito. Desactivar no borra atribución histórica.

## 13. Flujo editorial y dependencias: propuesta

Borrador → enviado/en revisión → validado → publicado. Revisor puede solicitar correcciones; se produce nueva revisión. Archivar un borrador y retirar una publicación son acciones distintas.

Cada envío conserva una copia inmutable de campos, relaciones, fuentes y referencias de archivos. Dictamen y publicación apuntan a esa revisión exacta. Edición posterior crea borrador sin cambiar el contenido público anterior. Una sola publicación activa por ficha.

Las tablas normalizadas sirven para edición; la lectura pública utiliza revisiones aprobadas y proyecciones de sus relaciones. No exponer cambios de borradores por joins a tablas de trabajo. Metadatos de disponibilidad y revocación se verifican además de la instantánea, para que una copia antigua no mantenga acceso revocado.

Dependencias: no publicar enlaces a fichas privadas. Si se retira una dependencia, ocultar enlace público y revisar fichas afectadas. Preparación padre es obligatoria: al retirarla se retiran sus variantes hasta resolver el motivo o reasignarlas mediante revisión. Persona retirada no obliga a retirar una receta si su contenido se puede mostrar autorizado sin identificarla. Cada caso conserva historial.

Propuesta de programación: publicación manual inicial; no programar episodios o fichas automáticamente en esta fase. Fecha original y fecha de publicación administrativa son diferentes.

## 14. Mapa, búsqueda y red de conocimiento: propuesta

- Mapa principal de Puebla con geometrías municipales versionadas de INEGI, conteos por categoría y puntos de mercados/tianguis públicos.
- Filtros por municipio, tipo de establecimiento, situación operativa y fecha de referencia de los datos. Horarios solo como información documentada, sin prometer “abierto ahora” inicialmente.
- Personas sin coordenadas particulares. Recetas e ingredientes se vinculan al territorio documentado; no inventar puntos geográficos.
- Contexto mundial de ingredientes dentro de sus fichas, separado de cobertura municipal del observatorio.
- Búsqueda pública por nombres, variantes, alias y descripciones autorizadas; sin contactos, consentimientos ni notas internas. Filtros por categoría, territorio y relaciones según módulo.
- Búsqueda administrativa incluye borradores y estados según permisos. Resultados paginados y conteos consistentes con filtros.
- Red: nodos públicos y conexiones de revisiones publicadas. Tipos: variante de, utiliza, prepara/comparte saber, se vende en, se documenta/practica en, instrumento relacionado y se menciona en. Proteger identificadores internos de entidades privadas.

## 15. Indicadores y reportes: propuesta

| Indicador | Definición |
|---|---|
| Preparaciones / recetas | Entidades únicas publicadas; dos conteos separados |
| Ingredientes / variedades | Entidades únicas publicadas; dos conteos separados |
| Personas | Fichas públicas autorizadas únicas |
| Mercados y tianguis | Fichas públicas únicas, desglosadas por tipo y estado operativo |
| Expedientes / instrumentos | Conteos separados; nunca equiparar solicitud y protección vigente |
| Cobertura municipal | Municipios con al menos una relación publicada respaldada, sobre el catálogo municipal cargado |
| Registros por municipio | Entidades únicas para la categoría y tipo de vínculo seleccionados |
| Crecimiento | Primeras publicaciones en el periodo; republicar/corregir no crea una entidad nueva |
| Documentación de recetas | Distribución completa/parcial, separada del cumplimiento editorial |

El total estatal deduplica entidades; no suma ciegamente municipios. Exponer denominador, filtros y fecha de corte. “Más documentado” mide número de registros vinculados, no popularidad turística ni calidad gastronómica. Evitar llamar “mayor riqueza” a un simple conteo documental.

Dashboard interno: borradores, revisiones pendientes, correcciones, publicaciones, incidencias de archivos/importación y asignaciones. Historial de producción/publicación, no analítica de visitantes en esta fase.

Calidad propuesta: (a) porcentaje de campos documentados entre los aplicables, (b) proporción de revisiones evaluadas del conjunto seleccionado, (c) incidencias de coherencia abiertas y (d) proporción revisada en los últimos 12 meses. Excluir campos no aplicables del denominador; lo desconocido sigue siendo faltante. La ventana de 12 meses es configurable y representa revisión reciente, no vigencia factual garantizada. No fijar una meta de 80% por copiar el mockup.

Reportes iniciales: panorama general, cobertura territorial, calidad de datos, preparaciones/recetas, ingredientes/variedades, personas, mercados/tianguis y protección legal. CSV y XLSX para tablas; PDF para informes. Podcast puede exportarse como listado.

Guardar plantilla y versión, filtros, corte de datos, estado de generación, solicitante interno o solicitud pública sin usuario, archivo externo, visibilidad y vencimiento de descarga si aplica. Estados: pendiente, en proceso, disponible, error y vencido. Reportes públicos contienen exclusivamente datos exportables autorizados; privados limitados por permisos. Los binarios no van en la base.

Para series históricas, reconstruir publicaciones activas a cada fecha; distinguir primeras publicaciones de saldo actual. Registrar retiros y correcciones. No presentar valores simulados como evolución real.

## 16. Contenido institucional y catálogos: propuesta

`contenidos_institucionales`: registro editorial, clave única (acerca/metodología), título, cuerpo, fuentes y versión publicada. Edición por permisos del módulo institucional; sin memoria histórica ni experiencias de turistas en esta fase.

Catálogos iniciales editables con códigos estables y estado activo; desactivar no rompe fichas históricas. No borrar valores utilizados ni renombrar su significado sin migración revisada.

| Catálogo | Valores de arranque propuestos |
|---|---|
| Categorías de preparación | Antojitos, guisos, moles y salsas, sopas y caldos, panes, dulces y postres, bebidas, otra/por clasificar |
| Categorías de ingrediente | Vegetal, animal, hongo, mineral, producto elaborado, otra/por clasificar |
| Unidades | Gramo, kilogramo, mililitro, litro, pieza; medidas tradicionales documentadas sin conversión automática |
| Técnicas | Asado, hervido, fritura, horneado, tatemado, molienda, fermentación, otra documentada |
| Participación de persona | Cocinera/o, productor/a, comerciante, portador/a/transmisor/a de saberes, otra documentada |
| Servicios de mercado | Sanitarios, estacionamiento, agua, manejo de residuos, accesibilidad descrita |
| Tipos de territorio | País, estado/división administrativa, municipio, localidad, región |

Clasificación primaria simple inicialmente; categorías y especialidades múltiples cuando el módulo lo requiera. “Otra” necesita descripción. La taxonomía gastronómica es una propuesta administrativa inicial, no una clasificación académica definitiva. Lenguas y regiones se cargan con fuentes, no con listas supuestas.

## 17. Modelo técnico y operación propuestos

PostgreSQL/PostGIS, UUID internos, claves INEGI textuales, marcas de tiempo con zona horaria, claves foráneas verificables y restricciones de variedad/ingrediente. Tablas puente para relaciones múltiples. No utilizar una sola tabla gigante ni copiar un esquema por municipio.

Índices en referencias, nombres consultables, estados y fechas; índice espacial para puntos/geometrías. La comparación territorial de coordenadas señala discrepancias para revisión; conservar fuente y precisión de localización.

Auditoría de altas, cambios, validaciones, publicaciones, retiros, importaciones, permisos y consentimientos. No registrar contraseñas, tokens o documentos privados completos dentro de logs. Credenciales de proveedores fuera de fichas y tablas públicas.

Procesos en segundo plano para importaciones, reportes y agregados; errores reintentables sin duplicar entidades. Subidas e importaciones incompletas no publican datos. Control de estados para recuperar operaciones interrumpidas.

Propuesta de respaldo: copia diaria de la base, almacenamiento de objetos con mecanismo de recuperación/versionado y prueba de restauración antes del lanzamiento. La copia de la base no contiene los archivos externos; se necesitan ambos. Periodos de conservación y objetivos de recuperación se decidirán con la institución y presupuesto.

No se eligen proveedores ni se crean servicios externos en esta definición. Autenticación, almacenamiento y fuente de importación se implementarán mediante interfaces que permitan sustituirlos.

## 18. Ajustes al diccionario de tablas

El [modelo de datos](modelo-base-datos.md) contiene el inventario principal. Esta definición agrega o precisa:

- `preparacion_territorios` y `preparacion_fuentes`.
- `episodio_creditos`, `episodio_variedades` y `episodio_instrumentos`.
- `contenidos_institucionales` con el mismo ciclo editorial.
- Consentimientos mediante `consentimiento_registros`, `consentimiento_revision_alcances` y `consentimiento_archivos_autorizados`; evidencia mediante `consentimiento_archivos`. Todas con claves foráneas explícitas, sin referencias polimórficas libres.
- Catálogos de participaciones separados por contexto: persona en sistema gastronómico, persona en receta y persona en episodio.
- Metadatos de reporte con solicitante opcional para solicitudes públicas, filtros y versión de plantilla/datos.

Nombres definitivos, tipos SQL y triggers se fijarán después de esta revisión. Las decisiones funcionales anteriores permiten implementarlos sin nuevos supuestos ocultos.

## 19. Qué revisar

Los criterios nuevos de este documento son propuestas, no aprobaciones implícitas. Las correcciones se pueden indicar por número de sección, por ejemplo: “7: los horarios sí deben ser obligatorios” o “12: el administrador también podrá publicar”.

Tras incorporar las correcciones: cerrar diccionario de campos y catálogos → generar diagrama lógico completo y SQL/migraciones → revisar integridad y casos de publicación → comenzar implementación. No se inicia desarrollo por el hecho de entregar esta definición.
