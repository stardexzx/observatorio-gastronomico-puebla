import { categoryLabels, type CategoryFilter, type DashboardFilters, type buildDashboardView } from "@/lib/dashboard-view";
import { pueblaMunicipalities } from "@/data/puebla-municipalities";

export type PublicSummaryRecord = {
  id: string; name?: string; title?: string; municipality?: string; municipalityCode?: string;
  updatedAt?: string; publishedAt?: string; description?: string; biography?: string;
  source?: string; sourceReference?: string; completeness?: number;
};
export type PublicSummaryCatalog = {
  recipes: PublicSummaryRecord[]; cooks: PublicSummaryRecord[]; ingredients: PublicSummaryRecord[];
};
export const defaultSummaryFilters: DashboardFilters = { period: "todos", municipality: "todos", category: "todas" };
/** Discard obsolete demo periods and malformed preferences rather than hiding real records. */
export function normalizeSummaryFilters(input: unknown): DashboardFilters {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ...defaultSummaryFilters };
  const saved = input as Record<string, unknown>;
  const period = typeof saved.period === "string" && /^(todos|\d{4})$/.test(saved.period) ? saved.period : "todos";
  const municipality = typeof saved.municipality === "string" && (saved.municipality === "todos" || pueblaMunicipalities.some(item => item.code === saved.municipality)) ? saved.municipality : "todos";
  const category = ["todas", "recetas", "ingredientes", "mercados", "cocineras", "legal"].includes(String(saved.category)) ? saved.category as CategoryFilter : "todas";
  return { period, municipality, category };
}
const categories = ["recetas", "ingredientes", "mercados", "cocineras", "legal"] as const;
const colors = ["#033AA5", "#2789D1", "#FFBF18", "#EF703C", "#D58B20"];
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-MX").trim();
// Do not infer dates from locale-dependent display strings or consultation dates.
const publicationMonth = (record: PublicSummaryRecord) => {
  const date = record.publishedAt;
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}T/.test(date) && Number.isFinite(Date.parse(date)) ? date.slice(0, 7) : null;
};
export function publicSummaryYears(catalog: PublicSummaryCatalog) {
  return [...new Set([...catalog.recipes, ...catalog.cooks, ...catalog.ingredients].map(publicationMonth).filter((month): month is string => !!month).map(month => month.slice(0, 4)))].sort().reverse();
}
export function buildPublicDashboardView(catalog: PublicSummaryCatalog, filters: DashboardFilters, search = ""): ReturnType<typeof buildDashboardView> & { municipalityCounts: Record<string, number>; allDistribution: ReturnType<typeof buildDashboardView>["distribution"]; undated: number } {
  const rows = [
    ...catalog.recipes.map(record => ({ ...record, kind: "recetas" as const })),
    ...catalog.ingredients.map(record => ({ ...record, kind: "ingredientes" as const })),
    ...catalog.cooks.map(record => ({ ...record, kind: "cocineras" as const })),
  ];
  const byContext = rows.filter(record => (filters.municipality === "todos" || record.municipalityCode === filters.municipality) && (filters.period === "todos" || publicationMonth(record)?.startsWith(`${filters.period}-`)));
  const selected = byContext.filter(record => filters.category === "todas" || record.kind === filters.category);
  const allDistribution = categories.map((key, index) => ({ key, name: categoryLabels[key], color: colors[index], value: byContext.filter(record => record.kind === key).length }));
  const distribution = allDistribution.filter(record => filters.category === "todas" || record.key === filters.category);
  const municipalityCounts: Record<string, number> = {};
  for (const record of selected) if (record.municipalityCode && pueblaMunicipalities.some(item => item.code === record.municipalityCode)) municipalityCounts[record.municipalityCode] = (municipalityCounts[record.municipalityCode] ?? 0) + 1;
  const dated = selected.filter(record => publicationMonth(record));
  const months = [...new Set(dated.map(record => publicationMonth(record)!))].sort();
  // Undated publications remain visible in totals and are explicitly labelled in the series.
  const undated = selected.length - dated.length;
  const buckets = [...months, ...(undated ? ["Sin fecha"] : [])];
  if (!buckets.length) buckets.push("Sin publicaciones");
  const inBucket = (bucket: string) => selected.filter(record => bucket === "Sin fecha" ? !publicationMonth(record) : publicationMonth(record) === bucket);
  const growth = buckets.map(month => ({ month, recetas: inBucket(month).filter(record => record.kind === "recetas").length, ingredientes: inBucket(month).filter(record => record.kind === "ingredientes").length, mercados: 0, cocineras: inBucket(month).filter(record => record.kind === "cocineras").length, legal: 0 }));
  let cumulative = 0;
  const records = growth.map(point => ({ month: point.month, records: cumulative += point.recetas + point.ingredientes + point.cocineras }));
  const covered = new Set<string>();
  const coverage = buckets.map(month => { for (const row of inBucket(month)) if (row.municipalityCode && municipalityCounts[row.municipalityCode]) covered.add(row.municipalityCode); return { month, value: covered.size }; });
  const verified = selected.length ? 100 : 0;
  const verification = buckets.map(month => ({ month, value: inBucket(month).length ? 100 : 0 }));
  const rank = (kind: "recetas" | "ingredientes" | "cocineras") => {
    const names = new Map<string, number>();
    for (const record of selected.filter(item => item.kind === kind)) { const name = record.name || record.title || "Sin título"; names.set(name, (names.get(name) ?? 0) + 1); }
    return [...names].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "es"));
  };
  const municipalCategories = Object.keys(municipalityCounts).map(code => new Set(selected.filter(row => row.municipalityCode === code).map(row => row.kind)).size);
  const greatestDiversity = Math.max(...municipalCategories, 0);
  const average = (predicate: (record: PublicSummaryRecord) => boolean) => selected.length ? Math.round(selected.filter(predicate).length / selected.length * 100) : 0;
  const quality = [
    { label: "Descripción", value: average(row => !!(row.description || row.biography)?.trim()), color: colors[0] },
    { label: "Publicación revisada", value: verified, color: colors[1] },
    { label: "Ubicación municipal", value: average(row => !!row.municipalityCode && !!municipalityCounts[row.municipalityCode]), color: colors[2] },
    { label: "Fuente documentada", value: average(row => !!row.source?.trim() && !!row.sourceReference?.trim()), color: colors[3] },
  ];
  const normalized = normalize(search);
  const searchResults = normalized ? selected.filter(row => normalize(`${row.name ?? row.title} ${row.municipality}`).includes(normalized)).slice(0, 6).map(row => ({ label: row.name || row.title || "Sin título", detail: categoryLabels[row.kind], section: "distribucion" })) : [];
  const total = selected.length;
  return {
    metricValues: { total: total.toLocaleString("es-MX"), recetas: String(allDistribution[0].value), ingredientes: String(allDistribution[1].value), mercados: "0", cocineras: String(allDistribution[3].value), wealth: String(municipalCategories.filter(value => value === greatestDiversity && value > 0).length), verified: `${verified}%` },
    records, verification, coverage, growth, distribution, allDistribution, distributionTotal: total, municipalityCounts, undated,
    rankings: { recetas: rank("recetas"), ingredientes: rank("ingredientes"), mercados: [], municipios: Object.entries(municipalityCounts).map(([code, value]) => ({ name: pueblaMunicipalities.find(item => item.code === code)?.name || code, value })).sort((a,b) => b.value - a.value || a.name.localeCompare(b.name, "es")) },
    quality, reports: total ? [{ title: "Panorama del acervo publicado", date: `${total} registros disponibles` }, { title: "Cobertura municipal", date: `${Object.keys(municipalityCounts).length} municipios con publicaciones` }] : [], verified, categoryOnly: filters.category === "todas" ? null : filters.category as Exclude<CategoryFilter,"todas">, searchResults,
  };
}

/** Municipality selection filters the panels, while map density retains the territory as context. */
export function summaryMapMunicipalityCounts(catalog: PublicSummaryCatalog, filters: DashboardFilters) {
  return buildPublicDashboardView(catalog, { ...filters, municipality: "todos" }).municipalityCounts;
}
