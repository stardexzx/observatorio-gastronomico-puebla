export const MAP_DENSITY_COLORS = ["#edf3f5", "#c8dfe4", "#8dbcc6", "#43869a", "#164f70", "#102f4f"];
export const MAP_SELECTION_COLOR = "#033AA5";
export const MAP_INTERACTION_COLOR = "#c45a32";

const DENSITY_LEVELS = MAP_DENSITY_COLORS.length - 1;

const countOf = value => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
};

/** Keep the original cartographic scale; interaction never participates in density. */
export function mapDensityColor(count, maximum) {
  const value = countOf(count);
  if (!value) return MAP_DENSITY_COLORS[0];
  const max = Math.max(value, countOf(maximum));
  return MAP_DENSITY_COLORS[Math.min(DENSITY_LEVELS, Math.max(1, Math.ceil(value / max * DENSITY_LEVELS)))];
}

/** The ZIP's accent highlights a whole municipality without changing its record count. */
export function mapMunicipalityFill(count, maximum, highlighted = false) {
  return highlighted ? MAP_INTERACTION_COLOR : mapDensityColor(count, maximum);
}

/** Exact integer intervals for the same scale, without empty ranges on small catalogs. */
export function mapDensityLegend(maximum) {
  const max = countOf(maximum);
  const ranges = [{ min: 0, max: 0, label: "0 registros", color: MAP_DENSITY_COLORS[0] }];
  for (let level = 1; level <= DENSITY_LEVELS; level++) {
    const first = Math.floor((level - 1) * max / DENSITY_LEVELS) + 1;
    const last = Math.floor(level * max / DENSITY_LEVELS);
    if (first > last) continue;
    ranges.push({ min: first, max: last, label: first === last ? `${first} ${first === 1 ? "registro" : "registros"}` : `${first}–${last} registros`, color: MAP_DENSITY_COLORS[level] });
  }
  return ranges;
}
