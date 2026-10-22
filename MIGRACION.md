# Nota de migración del mockup

- CSS original extraído íntegramente del `<style>` de `OGP_Mockup_navegacion.html` y conservado en `src/styles/theme.css`; al final se añadieron algunos ajustes menores para React.
- Se extrajeron 52 símbolos del sprite SVG original a `src/assets/icons.jsx`.
- Se convirtió el PNG del logo embebido a `src/assets/ogp-logo.png` y se creó el wrapper `src/assets/logo.jsx`.
- Datos copiados del mockup y normalizados con IDs para rutas: recetas=6, mercados=5, cocineras/cocineros=6, declaratorias=5, nodos de red=15, conexiones=16.
- `src/pages/Inicio.jsx` implementa la estructura visual principal de `renderInicio()` y consume los datos a través de `src/services/api.js`.
- Los valores del mockup son datos ilustrativos de interfaz, no datos verificados o conectados a un servicio externo.

## Integración con PostgreSQL/PostGIS

Los tres scripts del ZIP se conservan en `database/` sin modificar su contenido. `public_api.sql` añade únicamente funciones de consulta y el rol `ogp_lector`. La API está en `server/`; `src/services/api.js` selecciona explícitamente entre PostgreSQL y los JSON de demostración.

| Navegación original | Modelo SQL conectado |
| --- | --- |
| Recetas y fichas | `recetas_documentadas`, ingredientes, pasos y fuentes del snapshot publicado |
| Mercados y mapa | `mercados`, ubicaciones PostGIS y horarios publicados |
| Cocineras y cocineros | `personas` y revisiones autorizadas por consentimiento |
| Protección legal | `instrumentos_legales` publicados |
| Podcast | `podcasts` y `episodios` publicados |
| Acerca | `contenidos_institucionales` con clave `acerca` |
| Reportes, búsqueda y red | funciones/vistas públicas del esquema |

La integración conserva el logo, el tema CSS, las ilustraciones y los menús. No importa un segundo diseño: el ZIP únicamente contiene SQL. El mapa mantiene su forma esquemática y no se presenta como cartografía precisa. Los contadores de PostgreSQL no usan las cifras ilustrativas del mockup.

Los procedimientos de escritura/editoriales permanecen en la base para una futura capa autenticada. Memoria histórica y experiencias no tienen un modelo específico en el SQL adjunto; mantienen sus rutas pendientes.
