# Protección legal: análisis previo y plan de integración

## Estado de este documento

- Repositorio analizado: `stardexzx/observatorio-gastronomico-puebla`.
- Referencia consultada: rama `prueba`, commit `ebad6d66db0cbd2a3910980b2c7e3f51eda27c0b`.
- Alcance realizado: lectura del código y del esquema SQL mediante GitHub.
- Archivo añadido en esta fase: este documento; código de aplicación sin cambios.
- Implementación del módulo: **pendiente**.
- Lectura del PDF `Propuesta_Observatorio_Gastronomico_de_Puebla_revisada.pdf`: **pendiente**.
- No se afirma todavía cumplimiento de las secciones 3.3 y 6.3–6.8 de esa propuesta.
- Migraciones creadas o aplicadas durante esta tarea: **ninguna**.
- Cambios en datos, tablas, permisos o funcionalidades durante esta tarea: **ninguno**.
- Pruebas, compilación e integración con una instancia PostgreSQL durante esta tarea: **no ejecutadas**.
- El entorno de ejecución no estuvo disponible; el análisis no comprueba los registros de una BD instalada.

## Arquitectura actual

La aplicación principal usa Next.js, React y PostgreSQL. Las páginas están en `app/`,
los módulos en `modules/`, los servicios de datos en `db/` y la autenticación en `lib/auth/`.
`app/(panel)/layout.tsx` proporciona la sesión y `PublicCatalogProvider`.
La portada admite consulta anónima; disponer de una sesión no vuelve público un borrador.
Los componentes y servicios heredados permanecen en `src/`; no todos representan el flujo vigente.

`app/(panel)/proteccion-legal/page.tsx` muestra actualmente un apartado «Próximamente».
`app/(panel)/proteccion-legal/[id]/page.tsx` exige sesión y monta `DeclaratoriaDetalle.jsx`.
Los estilos y elementos de la referencia se conservan entre los componentes heredados.
No hay que convertir sus cifras o ejemplos visuales en registros jurídicos oficiales.

`db/public-catalog.ts` combina revisiones originales aprobadas con publicaciones del panel.
Da prioridad a la entrega original ante coincidencias y proyecta campos explícitos.
Actualmente transforma recetas, ingredientes, personas, episodios y mercados; no instrumentos legales.

## Diseño que debe conservarse

`SectionShell` permite conservar el módulo heredado dentro de `.legacy-module`.
La referencia utiliza Segoe UI, fondo `#F3F5F9` y bordes `#E3E7EE`.
Colores existentes: azul marino `#10284C`, dorado `#D89A2E`, terracota `#C1531E`,
arcilla `#B23A1F`, verde `#4F7A4A`, morado `#7A5EA8`, turquesa `#2E8A82` y azul `#3E6FA8`.

Se deben reutilizar las reglas de `src/styles/legacy-theme.css`, entre ellas:
`.g-kpis.c5`, `.g-kpi`, `.g-dot`, `.g-card`, `.g-ch`, `.g-pipe`, `.g-pstep`,
`.g-filters`, `.g-input`, `.g-sel`, `.g-btn`, `.g-split`, `.g-tbl tr.sel`,
`.g-detail`, `.g-kv`, `.g-tabs`, `.g-p`, `.g-row` y `.g-chips`.

Los iconos originales están en `src/assets/icons.jsx`.
`src/components/charts/PublicKpis.jsx` contiene la referencia `LegalKpis`.
El formulario puede reutilizar `components/ui/` y los controles de recetas sin cambiar el tema.
El selector de clasificación añadirá tarjetas accesibles con icono, texto, color y selección visible.
No se requiere rediseñar la navegación ni modificar otros módulos.

## Estructuras jurídicas ya disponibles

`database/migrations/001_schema.sql` contiene el núcleo que debe reutilizarse:

| Estructura | Función |
| --- | --- |
| `tipos_instrumento_legal` | Clasificación de instrumentos |
| `instrumentos_legales` | Identificación oficial, autoridad, referencia, vigencia, alcance y revisión |
| `expedientes_legales` | Solicitud, folio, autoridad y estado del trámite |
| `expediente_eventos` | Actuaciones documentadas con fecha, visibilidad y fuente |
| `expediente_instrumentos` | Relación entre trámite e instrumento |
| `instrumento_fuentes` y `expediente_fuentes` | Referencias y afirmaciones sustentadas |
| `instrumento_archivos` y `expediente_archivos` | Documentos asociados |
| `instrumento_territorios` y `expediente_territorios` | Alcance territorial documentado |
| `instrumento_recetas`, `instrumento_ingredientes` | Relaciones gastronómicas existentes |
| `instrumento_preparaciones`, `instrumento_variedades` | Relaciones adicionales existentes |

Las relaciones existentes exigen fuentes y usan claves compuestas para impedir duplicados.
`fuentes` y `archivos` ya contienen visibilidad, autoría, fechas y metadatos.
No debe crearse otro catálogo jurídico que duplique estas identidades.
Los campos particulares de clasificación, aplicación e impacto requieren extensiones aditivas.

`003_catalogs.sql` incorpora únicamente `do`, `ig`, `declaratoria` y `otro`.
Podrán añadirse idempotentemente platillos típicos, leyes, reglamentos, decretos,
marcas colectivas y programas gubernamentales, conservando los códigos existentes.
Añadir una clasificación no acredita que exista un instrumento oficial de ese tipo.

## Estados, validación y publicación

La situación jurídica del instrumento y la autorización editorial son conceptos separados.
`instrumentos_legales.situacion` admite `vigente_documentada`, `vencido`, `revocado`, `no_determinada`.
El expediente admite `solicitado`, `evaluacion`, `requerimientos`, `favorable`,
`rechazado`, `desistido` y `no_documentado`.

`v_estado_editorial` calcula `borrador`, `en_revision`, `correcciones`, `validado`,
`publicado` y `archivado`, utilizando revisiones, evaluaciones y publicaciones.
Las funciones SQL existentes son `enviar_revision`, `evaluar_revision`,
`publicar_revision` y `retirar_publicacion`.
Las revisiones selladas, evaluaciones, eventos editoriales y auditoría son inmutables.
El borrado de una ficha de dominio debe resolverse mediante retiro y archivo, conservando historia.

Los módulos del panel no usan todos el mismo contrato de formulario:
recetas conserva `draft`/`in-review` y una publicación separada;
cocineras e ingredientes admiten `draft`/`in-review`/`verified`.
La adaptación legal debe presentar los estados existentes sin introducir otro ciclo incompatible.

## Roles y permisos

El panel autentica tres roles: `administrador`, `revisor` y `capturista`.
Las recetas permiten editar a administrador/capturista; el revisor consulta y publica.
Otros catálogos también permiten actuaciones de revisión mediante su servicio.
`db/catalogs.ts` autoriza publicación a administrador/revisor y la impide al capturista.

El SQL original conserva permisos más granulares y el rol histórico `publicador`.
`006_login.sql` añadió captura al administrador, pero no le otorgó validar/publicar en SQL.
Por ello, invocar directamente `publicar_revision` con una cuenta del panel puede fallar.
Se necesita una adaptación legal acotada, probada y compatible con los tres roles existentes.
No se deben añadir roles visibles ni ampliar permisos globales de otros módulos.

`data/roles.ts` mantiene una matriz de interfaz en localStorage; no autoriza operaciones del backend.
Las APIs deben comprobar sesión, acción y propiedad/asignación de la ficha en el servidor.
Los servicios actuales validan JSON y origen; las subidas multipart necesitarán su comprobación de origen.

## Vínculos sin duplicación

Las entidades originales tienen UUID en `ogp.registros`; algunos catálogos del panel
guardan identidades textuales en `demo.catalog_forms`. El selector debe conservar su procedencia.
No debe clonar una entidad para conseguir que encaje en una clave foránea.

Productores ya pueden ser personas con participación `produccion`.
Los municipios se relacionan mediante `territorios` y `municipios_puebla`, con clave INEGI.
No existe un catálogo normalizado de establecimientos equivalente a los otros módulos.
Los textos libres de establecimientos en cocineras no constituyen registros con identidad propia.

Los puentes faltantes se añadirán con integridad y unicidad, sin sustituir los existentes.
La navegación inversa consultará los mismos vínculos, sin guardar una copia en cada extremo.
Las referencias opcionales no publicadas deben omitirse de las respuestas públicas.
El módulo de Mercados seguirá pendiente; no se añadirá captura a ese módulo como efecto colateral.

## Documentos, consulta pública e indicadores

Los PDF requerirán almacenamiento persistente, metadatos, procedencia y descarga autorizada.
Adjuntar un documento no debe publicarlo automáticamente ni otorgarle carácter oficial.
Se deben comprobar formato, tamaño, cantidad, nombre seguro y acceso tanto directo como desde enlaces.
Los enlaces de fuentes admitirán protocolos seguros y no ejecutarán contenido proporcionado por usuarios.

`v_fichas_publicas` filtra revisiones autorizadas, dependencias y documentos revocados.
`archivo_publicable` exige disponibilidad, visibilidad pública, licencia y URL pública.
La subida local de PDF necesitará una extensión compatible; actualmente esas tablas guardan referencias.
La proyección pública legal deberá seleccionar campos y documentos expresamente autorizados.

Los indicadores se calcularán con registros reales y conjuntos distintos de IDs.
Las recetas vinculadas, la cobertura municipal y los expedientes no deben contarse por filas de unión.
Sin datos, los resultados serán cero o un estado vacío, nunca cifras de demostración.
`src/services/api.js` y `demoStore.js` no son fuentes oficiales para este módulo.
No se sembrarán ejemplos de declaratorias, resoluciones, instrumentos ni expedientes.

## Plan aditivo e instrucciones pendientes

1. Leer el PDF y registrar la correspondencia de sus secciones con campos y funcionalidades.
2. Confirmar la instancia y esquema instalados sin modificar datos del usuario.
3. Añadir migración idempotente de clasificaciones, extensiones, documentos y vínculos necesarios.
4. Reutilizar el flujo editorial y adaptar únicamente los permisos legales requeridos.
5. Implementar CRUD autenticado, formulario adaptable, fuentes, PDF y trazabilidad.
6. Conectar catálogo, filtros, detalle y relaciones inversas a PostgreSQL.
7. Añadir proyección pública e indicadores conservando la interfaz original.
8. Documentar archivos realmente cambiados, SQL aplicado, ejecución y resultados obtenidos.

El inicializador `scripts/init-unified.mjs` usa transacción y bloqueo asesor.
Instala `ogp` solo si no existe y reaplica migraciones incrementales idempotentes.
La migración nueva deberá incorporarse a su lista; no bastará editar el instalador inicial.
Los comandos vigentes son `npm run configurar`, `npm run db:migrate` y `npm run dev`.
No hay todavía un comando nuevo ni una migración legal que el usuario deba ejecutar.

## Verificaciones exigidas antes de dar la implementación por terminada

- Aplicar la migración dos veces sobre una base aislada y comprobar conservación de datos.
- Probar creación, lectura, edición, archivo y restauración de estados visibles tras recarga.
- Probar permisos por rol, acceso anónimo, origen de escrituras y propiedad/asignación.
- Verificar revisión, correcciones, validación, publicación, sustitución y retiro con historial.
- Comprobar que editar un borrador no altera la última versión pública aprobada.
- Verificar vínculos inversos, ausencia de duplicados y referencias retiradas o privadas.
- Probar varios PDF, descarga sin autorización, documentos retirados y enlaces inválidos.
- Contrastar indicadores y filtros con consultas SQL y estados vacíos.
- Revisar diseño, teclado y tamaños de pantalla sin alterar otros módulos.
- Ejecutar `npm test`, `npm run lint`, `npm run build` y pruebas de integración pertinentes.
- Registrar los resultados reales, las limitaciones restantes y el commit verificado.

Estas verificaciones describen trabajo pendiente; no son resultados de pruebas ya realizadas.
