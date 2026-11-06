# Preparaciones y recetas: campos y publicación

Fecha: 12 de octubre de 2026. Estado: criterios de publicación aprobados por el usuario e incluidos en el esquema SQL inicial; instalación y pruebas de integración pendientes.

## 1. Identidad y documentación

Una preparación identifica el platillo general. Una receta documentada representa una variante respaldada por fuentes. Editar una ficha genera revisiones editoriales, no una nueva variante.

El carácter histórico y la suficiencia de documentación se registran por separado: una receta histórica puede estar completa y una entrevista actual puede ser parcial. No se presupone que una receta histórica se siga preparando.

## 2. Preparaciones

| Campo o relación | Crear borrador | Publicar | Regla |
|---|---|---|---|
| Nombre principal | Obligatorio | Obligatorio | No vacío; coincidencia de nombre advierte posible duplicado, no lo bloquea por sí sola. |
| Categoría | Opcional | Obligatorio | Catálogo controlado pendiente de definir. |
| Descripción general | Opcional | Obligatorio | Texto respaldado; no trasladar particularidades de una variante a todas. |
| Fuentes | Opcional | Obligatorio | Al menos una fuente identificable que respalde descripción y vínculo con Puebla. |
| Relación territorial con Puebla | Opcional | Obligatorio | Municipio, región o estado, con tipo de vínculo y evidencia. No exigir municipio si la fuente solo identifica Puebla. |
| Nombres alternativos | Opcional | Opcional | Lengua y contexto territorial solo cuando se conozcan. |
| Fotografías y otros archivos | Opcional | Opcional | Disponibles y autorizados si se publican. |
| Recetas documentadas asociadas | Ninguna exigida | Opcional | Una preparación puede publicarse antes de completar sus variantes. |

Se incorpora `preparacion_territorios` con preparación, territorio, tipo de vínculo y evidencia. Es independiente de los territorios de cada receta: no se heredan orígenes automáticamente.

## 3. Recetas documentadas

| Campo o relación | Crear borrador | Publicación completa | Publicación parcial |
|---|---|---|---|
| Preparación padre | Obligatorio | Obligatorio | Obligatorio |
| Título identificador de la variante | Obligatorio | Obligatorio | Obligatorio |
| Descripción | Opcional | Obligatorio | Obligatorio |
| Tipo de documentación | Opcional | Obligatorio | Obligatorio |
| Fuente principal identificable | Opcional | Obligatorio | Obligatorio |
| Vínculo documentado con Puebla | Opcional | Obligatorio | Obligatorio |
| Ingredientes | Opcional | Al menos uno y listado revisado | Puede faltar o ser incompleto; explicar limitación |
| Procedimiento | Opcional | Al menos un paso y secuencia revisada | Puede faltar o ser incompleto; explicar limitación |
| Cantidades y unidades | Opcional | Según lo documentado | Según lo documentado |
| Rendimiento/porciones | Opcional | Opcional | Opcional |
| Persona vinculada | Opcional | Opcional | Opcional |
| Fecha del hecho o documento original | Opcional | Según conocimiento | Según conocimiento |
| Contexto cultural, ocasión, técnicas | Opcional | Opcional | Opcional |
| Fotografías y multimedia | Opcional | Opcional | Opcional |
| Limitaciones de documentación | Opcional | Si existen | Obligatorio |

“Completa” significa que ingredientes y procedimiento se han documentado suficientemente según las fuentes y se revisaron. No garantiza reproducibilidad, exactitud histórica universal ni la existencia de cantidades precisas. Un solo ingrediente o paso no hace completa la ficha automáticamente.

La preparación padre debe estar publicada o publicarse conjuntamente. Los ingredientes y variedades enlazados públicamente deben contar con una ficha pública aprobada; las personas no autorizadas no se exponen a través de enlaces. El contenido parcial no equivale a contenido sin revisar.

Tipos iniciales propuestos para la fuente/documentación: entrevista de campo, documento histórico, recetario/publicación y observación de preparación. Los tipos no fijan automáticamente completitud ni vigencia culinaria.

## 4. Cantidades, ingredientes y pasos

- Cantidad numérica positiva si existe; requiere unidad documentada del catálogo.
- `cantidad_texto` conserva expresiones como “al gusto” o “un puñado”. Puede complementar el valor numérico; no inventar equivalencias.
- Ausencia de cantidad no se interpreta como cero. No almacenar “desconocido” en un campo numérico.
- La variedad es opcional y debe pertenecer al ingrediente. Si se desconoce, no crear una variedad ficticia llamada “sin especificar”.
- Si un término histórico de ingrediente no puede identificarse con certeza, conservarlo en la transcripción de la fuente y señalarlo como pendiente. No vincularlo a un ingrediente moderno por suposición; publicar como parcial si afecta la documentación.
- Los pasos tienen orden positivo único dentro de la receta y texto no vacío. Varias acciones pueden estar en un paso cuando así se documenten.
- Grupos como masa, relleno y salsa permiten repetir ingredientes sin confundirlos con duplicados.
- Las cantidades originales se conservan; las conversiones futuras deben registrar método y no reemplazarlas.

## 5. Fechas y vínculo territorial

Se distinguen fecha de captura (automática), fecha de documentación/consulta y fecha del documento o práctica descrita. Una captura actual de un recetario antiguo no vuelve actual su contenido.

Fechas incompletas usan campos explícitos de precisión y referencia original: fecha exacta, año, rango/periodo o desconocida. No asignar un día ficticio para representar un siglo o un año.

La ficha requiere vínculo propio documentado con Puebla, que puede ser origen declarado, documentación o práctica. Una referencia al estado es válida cuando no se conoce el municipio. Esto no genera cobertura municipal artificial: solo las relaciones respaldadas a municipios entran en esos conteos.

## 6. Evidencia y personas

- Fuente principal: tipo, título o identificación, referencia consultable y autor/institución cuando se conozca. En entrevistas privadas, la identificación pública puede omitir datos personales y conservar la evidencia en acceso restringido.
- Indicar páginas, apartados o segmentos cuando existan. Un enlace aislado sin descripción de qué respalda es insuficiente.
- No exigir una persona cuando la autoría o informante es desconocido; no crear una persona ficticia.
- Testimonios, nombres, imágenes y audio vinculados requieren autorización aplicable antes de difundirse. El consentimiento puede restringir una parte del contenido sin impedir una versión pública que la excluya.
- La publicación verifica derechos de uso de archivos y transcripciones. La posesión de una fuente no implica autorización para reproducir todo su contenido.

## 7. Documentación parcial y presentación pública

Propuesta de campos en `recetas_documentadas`: `nivel_documentacion` (completa/parcial), `limitaciones_documentacion` y `contexto_temporal` opcional. El nivel corresponde a la revisión publicada, no a un valor global mutable visible sobre revisiones antiguas.

La validación de una ficha parcial exige una descripción suficiente para identificar la variante, evidencia y motivo concreto de los faltantes. Una mención aislada que no permite distinguir una variante respalda la preparación general; no justifica crear una receta documentada separada.

La ficha pública muestra “Documentación parcial” y explica los faltantes. Una fecha desconocida se muestra como “Fecha no documentada”; la vigencia culinaria no se infiere de la publicación. Los campos vacíos no se convierten en afirmaciones negativas.

No incluir un módulo de memoria histórica en esta fase: admitir fuentes antiguas dentro del catálogo de recetas forma parte de la documentación básica.

## 8. Condiciones comunes y calidad

Antes de publicar: revisión inmutable validada, permiso de publicación, fuentes suficientes, dependencias públicas resueltas y autorizaciones para el contenido visible. La autovalidación sigue permitida por roles.

Separar métricas: cumplimiento de requisitos de publicación, cobertura de campos conocidos y nivel de documentación. Una ficha parcial puede cumplir todos los requisitos de su modalidad; eso no significa que su receta esté documentada completamente. No fijar porcentajes arbitrarios antes de definir indicadores.

Ejemplos de decisión editorial:

| Caso | Resultado propuesto |
|---|---|
| Entrevista con ingredientes y pasos revisados, sin gramajes exactos | Puede publicarse como completa si las cantidades no se documentaron y se explica cuando sea relevante. |
| Recetario antiguo con ingredientes, sin procedimiento conservado | Puede publicarse como parcial, con fuente y limitación visible. |
| Fotografía atractiva y título, sin evidencia o vínculo con Puebla | Permanece en borrador. |
| Referencia de una preparación en Puebla sin municipio identificable | Puede publicarse; no se asigna arbitrariamente a un municipio. |
| Ingredientes y procedimiento completos, imagen sin autorización | Puede publicarse excluyendo esa imagen; no se publica el archivo restringido. |

El usuario aprobó los mínimos de publicación y las modalidades completa y parcial con las condiciones descritas. El esquema SQL inicial incorpora los controles estructurales y de publicación; la suficiencia documental exige dictamen humano. Véase la [guía PostgreSQL](../../database/README.md) para conocer las decisiones implementadas y los límites de validación.
