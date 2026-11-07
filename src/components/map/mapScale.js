export const MAP_DENSITY_COLORS = ["#EFEADC", "#F6E2B4", "#F1BD66", "#D9772B", "#B23A1F"];
export const MAP_SELECTION_COLOR = "#033AA5";

const countOf = value => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
};

/** Keep the original cartographic scale; interaction never participates in density. */
export function mapDensityColor(count, maximum) {
  const value = countOf(count);
  if (!value) return MAP_DENSITY_COLORS[0];
  const max = Math.max(value, countOf(maximum));
  return MAP_DENSITY_COLORS[Math.min(4, Math.max(1, Math.ceil(value / max * 4)))];
}

/** Exact integer intervals for the same scale, without empty ranges on small catalogs. */
export function mapDensityLegend(maximum) {
  const max = countOf(maximum);
  const ranges = [{ min: 0, max: 0, label: "0 registros", color: MAP_DENSITY_COLORS[0] }];
  for (let level = 1; level <= 4; level++) {
    const first = Math.floor((level - 1) * max / 4) + 1;
    const last = Math.floor(level * max / 4);
    if (first > last) continue;
    ranges.push({ min: first, max: last, label: first === last ? `${first} ${first === 1 ? "registro" : "registros"}` : `${first}–${last} registros`, color: MAP_DENSITY_COLORS[level] });
  }
  return ranges;
}
