import type { buildDashboardView, DashboardFilters } from "./dashboard-view";
import { categoryLabels, municipalityLabels } from "./dashboard-view";

type DashboardView = ReturnType<typeof buildDashboardView>;

export function downloadDashboardData(view: DashboardView, filters: DashboardFilters) {
  const rows: (string | number)[][] = [
    ["Observatorio Gastronómico de Puebla"],
    ["Periodo", filters.period],
    ["Municipio", municipalityLabels[filters.municipality] ?? filters.municipality],
    ["Categoría", categoryLabels[filters.category]],
    [], ["Composición del acervo"], ["Categoría", "Registros"],
    ...view.distribution.map(item => [item.name, item.value]),
    [], ["Crecimiento por categoría"], ["Mes", "Recetas", "Ingredientes", "Mercados", "Cocineras/os"],
    ...view.growth.map(item => [item.month, item.recetas, item.ingredientes, item.mercados, item.cocineras]),
    [], ["Calidad de datos"], ["Indicador", "Porcentaje"],
    ...view.quality.map(item => [item.label, item.value]),
    [], ["Mayor concentración"], ["Municipio", "Registros"],
    ...view.rankings.municipios.map(item => [item.name, item.value]),
  ];
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], {type: "text/csv;charset=utf-8;"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = `observatorio-puebla-${filters.period}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
