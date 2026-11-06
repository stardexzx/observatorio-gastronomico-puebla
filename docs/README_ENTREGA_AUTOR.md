# Observatorio Gastronómico de Puebla

Prototipo local del dashboard para consultar tendencias, cobertura municipal, rankings y calidad de los registros gastronómicos de Puebla.

## Abrir en Visual Studio Code

1. Abre esta carpeta en Visual Studio Code.
2. Abre **Terminal > Nueva terminal**.
3. Ejecuta:

```bash
npm install
npm run dev
```

4. Visita `http://localhost:5173/`.

## Comandos

```bash
npm run dev    # iniciar el entorno local
npm run build  # comprobar la compilación final
node scripts/simplify-puebla-geojson.mjs # regenerar la capa web desde la fuente completa
```

## Organización principal

- `app/`: página principal, metadatos y estilos globales.
- `components/dashboard/`: navegación, filtros y tarjetas reutilizables.
- `modules/trends/`: gráficas de tendencia.
- `modules/insights/`: distribución y rankings.
- `modules/geographic/`: mapa coroplético e interacción municipal.
- `modules/recipes/`: listado, detalle y formulario local de recetas.
- `modules/quality/`: calidad, reportes y exportaciones.
- `data/`: información simulada, catálogo municipal y GeoJSON fuente.
- `types/domain.ts`: contratos TypeScript previstos para el backend.
- `docs/data-model.md`: entidades, relaciones y endpoints propuestos.

## Capa municipal

El mapa contiene las 217 áreas geoestadísticas municipales de Puebla. La
fuente completa se conserva en `data/geo/puebla-municipios-inegi-2025.geojson`
y la versión simplificada que consume el navegador se genera en
`public/maps/puebla-municipios.geojson`.

Fuente: INEGI, Marco Geoestadístico, diciembre de 2025. La simplificación solo
reduce el número de vértices para la visualización; mantiene las claves oficiales
para relacionar cada municipio con los futuros registros del backend.

El dashboard todavía no utiliza una base de datos. Los filtros y acciones representan el flujo de UX/UI; la conexión con datos reales se realizará desde una capa de servicios en la fase de backend.

El módulo de Recetas está disponible en `/recetas`. Las altas y modificaciones
se conservan temporalmente en `localStorage` para validar el flujo antes de
conectarlo al backend.
