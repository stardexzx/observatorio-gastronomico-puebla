# Modelo de datos propuesto

Este modelo separa el patrimonio documentado, su ubicación, sus fuentes y su proceso de verificación. Las interfaces iniciales están en `types/domain.ts` y servirán como contrato entre frontend y backend.

## Entidades principales

### Municipio

- Identificador interno.
- Clave geoestadística INEGI de cinco caracteres.
- Nombre oficial.
- Código estatal `21` para Puebla.
- Población opcional como dato de referencia.

### Registro gastronómico

Campos comunes para recetas, ingredientes, mercados, personas portadoras de conocimiento y protecciones legales:

- Identificador único.
- Categoría.
- Nombre y descripción.
- Municipio.
- Fuente de información.
- Estado de verificación.
- Puntaje de completitud.
- Fechas de creación, actualización y verificación.
- Etiquetas.

Cada categoría extiende estos campos con información propia. Por ejemplo, una receta relaciona ingredientes; un mercado contiene ubicación y días de operación; una protección legal guarda autoridad, vigencia y número de registro.

## Relaciones

```text
Municipio 1 ─── N Registro gastronómico N ─── 1 Fuente
                         │
                         ├── 1 Receta
                         ├── 1 Ingrediente
                         ├── 1 Mercado o tianguis
                         ├── 1 Cocinera o cocinero
                         └── 1 Protección legal

Registro gastronómico 1 ─── N Eventos de verificación
Receta N ─── N Ingrediente
```

## Estados de verificación

- `draft`: registro capturado pero incompleto.
- `in-review`: registro enviado a revisión.
- `verified`: información validada.
- `rejected`: requiere correcciones antes de continuar.

## Consultas que necesitará el dashboard

```text
GET /api/dashboard/summary
GET /api/dashboard/trends
GET /api/dashboard/distribution
GET /api/dashboard/rankings
GET /api/dashboard/quality
GET /api/municipalities
GET /api/reports
```

Los endpoints del dashboard aceptarían `dateFrom`, `dateTo`, `municipalityCode` y `category` como parámetros. El mapa utilizará la clave INEGI para relacionar cada respuesta con el polígono municipal correspondiente.

## Fuente geográfica

La capa local contiene las 217 áreas geoestadísticas municipales de Puebla provenientes del servicio vectorial del Catálogo Único de Claves Geoestadísticas de INEGI. La fuente completa se conserva en `data/geo/` y una versión simplificada para navegador se genera en `public/maps/`.
