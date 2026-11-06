import {
  categoryDistribution,
  categoryGrowth,
  coverageTrend,
  historicalRecords,
  quality,
  rankings,
  reports,
  verificationTrend,
} from "@/data/dashboard";
import { pueblaMunicipalities } from "@/data/puebla-municipalities";

export type PeriodFilter = "2023-2024" | "2024" | "2023";
export type MunicipalityFilter = string;
export type CategoryFilter = "todas" | "recetas" | "ingredientes" | "mercados" | "cocineras" | "legal";

export type DashboardFilters = {
  period: PeriodFilter;
  municipality: MunicipalityFilter;
  category: CategoryFilter;
};

export const defaultFilters: DashboardFilters = { period: "2023-2024", municipality: "todos", category: "todas" };

export const municipalityLabels: Record<string, string> = Object.fromEntries([
  ["todos", "Todos los municipios"], ...pueblaMunicipalities.map((municipality) => [municipality.code, municipality.name]),
]);

export const categoryLabels: Record<CategoryFilter, string> = {
  todas: "Todas las categorías", recetas: "Recetas", ingredientes: "Ingredientes", mercados: "Mercados", cocineras: "Cocineras/os", legal: "Protección legal",
};

const municipalityFactors: Record<string, number> = { todos:1, "21114":0.25, "21019":0.079, "21156":0.07, "21119":0.059, "21208":0.052, "21071":0.043, "21174":0.047, "21085":0.035, "21003":0.028 };
const municipalityFactor = (code: string) => municipalityFactors[code] ?? (0.014 + (Number(code.slice(-3)) % 29) / 1000);
const periodFactors: Record<PeriodFilter, number> = { "2023-2024": 1, "2024": 0.58, "2023": 0.72 };
const categoryShares: Record<Exclude<CategoryFilter, "todas">, number> = { recetas: 582 / 1246, ingredientes: 128 / 1246, mercados: 243 / 1246, cocineras: 214 / 1246, legal: 79 / 1246 };

const round = (value: number) => Math.max(0, Math.round(value));
const periodSlice = <T extends {month:string},>(items: T[], period: PeriodFilter) => period === "2023-2024" ? items : items.filter(item=>item.month.endsWith(period.slice(-2)));

export function buildDashboardView(filters: DashboardFilters, search = "") {
  const geoFactor = municipalityFactor(filters.municipality);
  const timeFactor = periodFactors[filters.period];
  const categoryFactor = filters.category === "todas" ? 1 : categoryShares[filters.category];
  const recordFactor = geoFactor * timeFactor * categoryFactor;
  const categoryOnly = filters.category === "todas" ? null : filters.category;
  const verified = Math.min(96, round(68 + (filters.period === "2024" ? 5 : filters.period === "2023" ? -6 : 0) + (filters.municipality === "todos" ? 0 : 3)));

  const baseValues = { total: 1246, recetas: 582, ingredientes: 128, mercados: 243, cocineras: 214, legal: 79, wealth: 24 };
  const metricValues: Record<string, string> = {
    total: round(baseValues.total * recordFactor).toLocaleString("es-MX"),
    recetas: round(baseValues.recetas * geoFactor * timeFactor).toLocaleString("es-MX"),
    ingredientes: round(baseValues.ingredientes * geoFactor * timeFactor).toLocaleString("es-MX"),
    mercados: round(baseValues.mercados * geoFactor * timeFactor).toLocaleString("es-MX"),
    cocineras: round(baseValues.cocineras * geoFactor * timeFactor).toLocaleString("es-MX"),
    wealth: (filters.municipality === "todos" ? round(baseValues.wealth * timeFactor) : 1).toLocaleString("es-MX"),
    verified: `${verified}%`,
  };

  const records = periodSlice(historicalRecords, filters.period).map((item) => ({ ...item, records: round(item.records * geoFactor * categoryFactor) }));
  const verification = periodSlice(verificationTrend, filters.period).map((item) => ({ ...item, value: Math.min(verified, round(item.value + verified - 68)) }));
  const coverage = periodSlice(coverageTrend, filters.period).map((item) => ({ ...item, value: filters.municipality === "todos" ? round(item.value * timeFactor) : 1 }));
  const growth = periodSlice(categoryGrowth, filters.period).map((item) => ({
    ...item, recetas: round(item.recetas * geoFactor), ingredientes: round(item.ingredientes * geoFactor), mercados: round(item.mercados * geoFactor), cocineras: round(item.cocineras * geoFactor), legal: round(item.legal * geoFactor),
  }));

  const distribution = categoryDistribution
    .map((item, index) => ({ ...item, key: (["recetas", "ingredientes", "mercados", "cocineras", "legal"] as const)[index], value: round(item.value * geoFactor * timeFactor) }))
    .filter((item) => !categoryOnly || item.key === categoryOnly);
  const distributionTotal = distribution.reduce((sum, item) => sum + item.value, 0);
  const scaledRankings = Object.fromEntries(Object.entries(rankings).map(([key, items]) => [key, items.map((item) => ({ ...item, value: Math.max(1, round(item.value * geoFactor * timeFactor)) }))])) as typeof rankings;

  const normalized = search.trim().toLocaleLowerCase("es-MX");
  const searchResults = normalized ? [
    ...Object.entries(rankings).flatMap(([group, items]) => items.map((item) => ({ label: item.name, detail: group === "municipios" ? "Municipio" : `Ranking de ${group}`, section: "distribucion" }))),
    ...reports.map((report) => ({ label: report.title, detail: "Reporte reciente", section: "calidad" })),
    { label: "Cobertura municipal", detail: "Mapa de concentración", section: "distribucion" },
    { label: "Calidad de los datos", detail: "Indicadores de confianza", section: "calidad" },
  ].filter((item) => `${item.label} ${item.detail}`.toLocaleLowerCase("es-MX").includes(normalized)).slice(0, 6) : [];

  return { metricValues, records, verification, coverage, growth, distribution, distributionTotal, rankings: scaledRankings, quality, reports, verified, categoryOnly, searchResults };
}
