# Protección legal: implementación y ejecución

La referencia técnica son los requisitos extraídos que proporcionó el usuario de las secciones 3.3 y 6.1–6.8 de la propuesta oficial. No se requiere, almacena ni publica el PDF confidencial de esa propuesta.

## Ejecutar sobre una instalación existente

Conserva tu archivo `.env.local` y ejecuta desde la raíz del proyecto:

```bash
git checkout prueba
git pull origin prueba
npm ci
npm run db:migrate
npm run dev
```

Abre `http://localhost:5173/proteccion-legal`. La consulta pública no requiere cuenta. El equipo usa sus cuentas existentes desde `/iniciar-sesion`. El procedimiento para crear el primer administrador sigue en el README.

La migración utiliza la misma base configurada del proyecto, `observatorio_puebla_test`; no sustituye PostgreSQL ni cambia sus credenciales. `db:migrate` no crea instrumentos, fuentes, expedientes, personas ni cuentas de ejemplo. No hace falta reinstalar la base ni borrar volúmenes.

## Datos y migración

`database/migrations/009_legal_module.sql` amplía el esquema original. `scripts/init-unified.mjs` la ejecuta después de las migraciones anteriores dentro de la transacción y el bloqueo asesor existentes. Puede reaplicarse sin duplicar clasificaciones ni permisos.

Se reutilizan `ogp.instrumentos_legales`, `expedientes_legales`, `expediente_eventos`, `fuentes`, `archivos`, territorios, los puentes jurídicos originales y el flujo de revisiones/publicaciones.

Tablas complementarias:

- `instrumento_panel`: campos de captura adicionales, expediente principal y notas privadas.
- `instrumento_fuentes_gestionadas`: procedencia de las fuentes propias de cada captura.
- `instrumento_personas` y `instrumento_mercados`: relaciones con claves foráneas reales.
- `instrumento_cocineras_panel` y `instrumento_ingredientes_panel`: vínculos que conservan la identidad de los catálogos del panel.
- `legal_pdf_blobs`: contenido PDF persistente y hash SHA-256 inmutables.
- `instrumento_pdf_adjuntos`: documentos asociados a la edición de trabajo.
- `instrumento_revision_pdf`: documentos de cada revisión aprobada, con referencias y metadatos congelados.

La migración no reemplaza funciones generales del observatorio. Añade `enviar_instrumento_revision`, que incorpora los campos jurídicos y documentos al mecanismo existente de revisiones selladas. La validación, publicación y retirada reutilizan las funciones originales. Los permisos nuevos se limitan a los módulos jurídicos y a los roles que ya existen.

Los instrumentos y publicaciones originales anteriores a esta extensión siguen siendo consultables. Las relaciones con preparaciones, variedades y territorios que no se gestionan desde el nuevo selector se conservan.

## Catálogo y ficha

Se conservan la tipografía, paleta, iconos, tarjetas, tabla, detalle lateral y estilos heredados del proyecto. El módulo incorpora:

- Cinco tarjetas de indicadores con datos de PostgreSQL y estados vacíos reales.
- Ciclo de expedientes reales, separado del estado editorial de la ficha.
- Búsqueda por texto y filtros de clasificación, jurisdicción y situación normativa.
- Tabla seleccionable, paginación, detalle lateral y ficha completa.
- Secciones de identificación, aplicación, impacto, vínculos, fuentes, documentos y trazabilidad.
- Navegación y formularios adaptados a pantallas pequeñas y uso con teclado.

Los indicadores se calculan con conjuntos distintos de registros y no con cifras del diseño de referencia. Un instrumento sin expediente no genera un expediente implícito. La cobertura municipal utiliza el catálogo municipal instalado en PostgreSQL. Si no existe denominador documentado, no se presenta un porcentaje inventado.

La tarjeta «Recetas vinculadas» cuenta relaciones documentadas; un vínculo genérico no atribuye por sí mismo derechos ni una protección jurídica a una receta. Los expedientes favorables tampoco equivalen automáticamente a publicaciones autorizadas.

## Clasificación y formulario

El selector usa tarjetas con texto, icono, color y controles de selección accesibles:

1. Denominación de origen.
2. Indicación geográfica.
3. Declaratoria patrimonial.
4. Platillo típico.
5. Ley.
6. Reglamento.
7. Decreto.
8. Marca colectiva.
9. Programa gubernamental.
10. Otro instrumento.

Los campos particulares cambian según la clasificación. La edición conserva los valores al cambiar de tarjeta; la proyección pública utiliza los campos pertinentes de la clasificación seleccionada.

Los cinco ejes temáticos se registran por separado: instrumentos normativos, declaratorias patrimoniales, propiedad intelectual y derechos colectivos, brechas legales y políticas públicas.

Campos comunes:

| Área | Información |
| --- | --- |
| Identificación | Nombre, nivel de gobierno, autoridad, referencia oficial y fecha de publicación |
| Vigencia | Inicio, término, fecha de revisión y situación normativa |
| Objeto y alcance | Materia regulada, beneficiarios, territorio y descripción del alcance |
| Aplicación | Dependencia responsable, presupuesto documentado, reglas de operación y salvaguardia |
| Impacto | Indicadores de cumplimiento, efectividad y retos operativos |
| Análisis | Vacíos legales y políticas públicas vinculadas |
| Procedencia | Fuentes, citas, documentos, responsables y fechas de los eventos |

El presupuesto y la evaluación se capturan con su contexto documental; no se generan importes ni conclusiones de efectividad por defecto. Las notas privadas no forman parte de la ficha pública.

## Flujo y acceso

No se añade un cuarto rol de usuario.

| Rol | Operaciones |
| --- | --- |
| Capturista | Capturar y editar sus fichas o las asignadas, gestionar documentos y enviar a revisión |
| Revisor | Consultar, solicitar correcciones, validar, publicar y retirar publicaciones |
| Administrador | Capturar, revisar, validar, publicar, retirar y archivar con los permisos jurídicos correspondientes |

El servidor comprueba cuenta activa, módulo, rol y propiedad/asignación. La matriz visual de permisos del navegador no autoriza operaciones.

Se conservan los estados editoriales originales: `borrador`, `en_revision`, `correcciones`, `validado`, `publicado` y `archivado`. La situación normativa y el estado de un expediente son datos independientes.

Guardar no publica. El envío sella una revisión; la evaluación corresponde a esa revisión y la publicación usa la versión validada. La captura queda bloqueada mientras se evalúa. Una ficha validada puede corregirse y reenviarse: si cambian sus datos públicos, se impide publicar la validación anterior hasta revisar la nueva versión.

Editar un instrumento ya publicado conserva la última versión autorizada hasta aprobar y publicar otra. Retirar la publicación oculta la consulta pública y sus documentos. Archivar conserva las filas, los documentos y el historial.

## Fuentes y PDFs

Cada fuente añadida requiere título y una referencia, URL o cita aportada. Las URLs de fuentes usan HTTPS. Los vínculos con el acervo requieren una fuente y una descripción de su alcance.

Las fuentes restringidas sólo aportan a la consulta pública su cita expresamente pública; su referencia interna y URL no se entregan. Las fuentes compartidas del esquema original no se sobrescriben desde una captura jurídica. Los cambios de fuentes propias conservan las referencias utilizadas en versiones anteriores.

Se admiten hasta 12 PDFs por ficha, de hasta 20 MB cada uno. La subida comprueba formato, tamaño, nombre y permisos en el servidor. Los bytes permanecen en PostgreSQL y se identifican mediante SHA-256.

Los documentos comienzan restringidos al equipo. Para solicitar difusión pública se declara su licencia o condición de uso y se confirma la autorización. Un PDF restringido puede conservarse sin una licencia pública conocida; eso no lo autoriza para publicación.

La descarga pasa por un endpoint que comprueba sesión o pertenencia a una publicación vigente autorizada. Los documentos privados no se sirven como archivos de una carpeta pública. Quitar un documento de la edición de trabajo no destruye el PDF de la versión ya aprobada. La retirada de la publicación impide su descarga anónima.

Adjuntar un PDF o escribir una URL no acredita su oficialidad: la identificación, las fuentes y la revisión corresponden al equipo.

## Relaciones bidireccionales

Las relaciones usan identificadores y procedencia `ogp`/`panel`, sin copiar entidades ni enlazarlas por coincidencia de nombre. Se reutilizan los mismos vínculos para consultar ambos sentidos.

- Recetas, ingredientes y cocineras/cocineros muestran sus instrumentos jurídicos publicados relacionados.
- La red de conocimiento incorpora instrumentos, sus vínculos y los municipios o mercados relacionados que estén autorizados.
- Los productores reutilizan la identidad de una persona con participación de producción; una misma persona no se duplica por ser también cocinera.
- Los municipios proceden de las tablas territoriales y sus claves INEGI.
- Los destinos privados, retirados o sin autorización se omiten del catálogo público.

El esquema actual no dispone de un catálogo normalizado de establecimientos. El selector de esa categoría queda vacío hasta que existan registros con identidad propia; los nombres escritos libremente en fichas de cocineras no se convierten en entidades ficticias. No se añade captura al módulo pendiente de Mercados ni se cambia su apartado administrativo.

## Archivos de la implementación

| Grupo | Archivos |
| --- | --- |
| Contrato y clasificaciones | `data/legal.ts` |
| Migración e inicialización | `database/migrations/009_legal_module.sql`, `scripts/init-unified.mjs` |
| Persistencia, permisos y proyección | `db/legal.ts`, `db/public-catalog.ts` |
| Validación y respuestas HTTP | `lib/legal-validation.ts`, `lib/legal-api.ts` |
| Relaciones públicas | `lib/legal-public-relations.ts`, `components/public/public-catalog-provider.tsx` |
| Catálogo, detalle y flujo visual | `modules/legal/legal-catalog.tsx`, `legal-detail.tsx`, `legal-record-view.tsx`, `legal-workflow-controls.tsx` |
| Captura y componentes compartidos | `modules/legal/legal-editor.tsx`, `legal-ui.tsx`, `legal-frame.tsx` |
| Estilos del módulo | `modules/legal/legal.css`, `legal-editor.css` |
| Páginas | `app/(panel)/proteccion-legal/page.tsx`, `[id]/page.tsx`, `nuevo/page.tsx`, `[id]/editar/page.tsx` |
| Consulta del acervo y red | `modules/public/catalog.tsx`, `modules/public/knowledge-network.tsx` |
| Pruebas | `test/legal-public-relations.test.mjs`, `tests/legal_checks.mjs`, `tests/legal_browser.py`, `tests/public_smoke.mjs` |
| Integración continua | `.github/workflows/validacion.yml` |

Endpoints privados: `/api/legal`, `/api/legal/options`, `/api/legal/[id]`, `/api/legal/[id]/workflow`, `/api/legal/[id]/documents` y `/api/legal/[id]/documents/[fileId]`.

Consulta pública: `/api/public/legal` y `/api/public/legal/[id]`. La descarga `/api/legal/documents/[fileId]` resuelve los permisos de acceso de cada solicitud.

## Comprobaciones

```bash
npm test
npm run lint
npm run build
node tests/public_smoke.mjs --production
# Iterar sólo el navegador del módulo, conservando las comprobaciones API/SQL:
node tests/public_smoke.mjs --production --legal-only
```

La integración requiere Docker, Python, Playwright y Chromium. El runner crea una base PostGIS desechable, genera cuentas y documentos sintéticos sólo en esa base y la elimina al terminar. No utiliza credenciales ni datos de la instalación del usuario.

GitHub Actions ejecuta estas comprobaciones en las ramas de trabajo y `prueba`: instalación, pruebas de lógica, lint, compilación y API/SQL/navegador. Las capturas generadas por las pruebas permanecen en el runner; no se publican como artifacts ni se imprimen sus bytes en logs.

Las pruebas jurídicas cubren compatibilidad con publicaciones originales, CRUD y permisos, origen de solicitudes, fuentes restringidas, referencias válidas, varias entidades relacionadas, PDFs y hashes, revisión/validación/publicación/retirada, edición posterior a validación, versiones inmutables, indicadores reales y reaplicación de migraciones. Las unidades comprueban identidades por origen y exclusión de relaciones no autorizadas. El navegador recorre catálogo, filtros, vínculos inversos, formulario, documentos y flujo editorial.
