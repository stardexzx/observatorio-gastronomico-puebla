import fs from "node:fs";
import path from "node:path";

const source = path.resolve("data/geo/puebla-municipios-inegi-2025.geojson");
const target = path.resolve("public/maps/puebla-municipios.geojson");
const catalogTarget = path.resolve("data/puebla-municipalities.ts");
const tolerance = 0.0012;

function perpendicularDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy));
}

function simplifyLine(points) {
  if (points.length <= 4) return points;
  const closed = points[0][0] === points.at(-1)[0] && points[0][1] === points.at(-1)[1];
  const input = closed ? points.slice(0, -1) : points;
  const keep = new Uint8Array(input.length); keep[0] = 1; keep[input.length - 1] = 1;
  const stack = [[0, input.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop(); let max = 0; let index = 0;
    for (let i = first + 1; i < last; i++) { const distance = perpendicularDistance(input[i], input[first], input[last]); if (distance > max) { max = distance; index = i; } }
    if (max > tolerance) { keep[index] = 1; stack.push([first, index], [index, last]); }
  }
  const output = input.filter((_, index) => keep[index]).map(([x, y]) => [Number(x.toFixed(6)), Number(y.toFixed(6))]);
  if (closed && output.length >= 3) output.push([...output[0]]);
  return output.length >= 4 ? output : points;
}

function simplifyGeometry(geometry) {
  if (geometry.type === "Polygon") return { type: "Polygon", coordinates: geometry.coordinates.map(simplifyLine) };
  return { type: "MultiPolygon", coordinates: geometry.coordinates.map((polygon) => polygon.map(simplifyLine)) };
}

const geojson = JSON.parse(fs.readFileSync(source, "utf8"));
const simplified = {
  type: "FeatureCollection",
  metadata: { ...geojson.metadatos, simplified_tolerance_degrees: tolerance, feature_count: geojson.features.length },
  features: geojson.features.map((feature) => ({ type: "Feature", properties: feature.properties, geometry: simplifyGeometry(feature.geometry) })),
};
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(simplified));
const catalog = simplified.features
  .map((feature) => ({ code: feature.properties.cvegeo, name: feature.properties.nomgeo }))
  .sort((a, b) => a.name.localeCompare(b.name, "es"));
fs.writeFileSync(catalogTarget, `export const pueblaMunicipalities = ${JSON.stringify(catalog, null, 2)} as const;\n`);
console.log(JSON.stringify({ features: simplified.features.length, bytes: fs.statSync(target).size, catalog: catalog.length }));
