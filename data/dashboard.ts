import { BookOpen, ChefHat, FileCheck2, Landmark, MapPinned, ShoppingBasket, Trophy } from "lucide-react";

export const metrics = [
  { key: "total", label: "Registros totales", value: "1,246", change: "+12.4%", icon: MapPinned, color: "#174f78", tint: "#e8f2f7" }, { key: "recetas", label: "Recetas históricas", value: "582", change: "+9.8%", icon: BookOpen, color: "#c45a32", tint: "#fbeee8" },
  { key: "ingredientes", label: "Ingredientes", value: "128", change: "+7.1%", icon: Landmark, color: "#b67a08", tint: "#fff6dc" }, { key: "mercados", label: "Mercados y tianguis", value: "243", change: "+7.5%", icon: ShoppingBasket, color: "#28745b", tint: "#e7f4ef" },
  { key: "cocineras", label: "Cocineras y cocineros", value: "214", change: "+11.2%", icon: ChefHat, color: "#6e4f91", tint: "#f1ebf7" }, { key: "wealth", label: "Municipios con mayor riqueza", value: "24", change: "+2 municipios", icon: Trophy, color: "#a94b35", tint: "#f9ece8" },
  { key: "verified", label: "Registros verificados", value: "68%", change: "+8.6 pp", icon: FileCheck2, color: "#156a79", tint: "#e5f3f5" },
];
export const historicalRecords = [
  { month: "Ene 23", records: 148 }, { month: "Mar 23", records: 306 }, { month: "May 23", records: 512 }, { month: "Jul 23", records: 668 }, { month: "Sep 23", records: 792 },
  { month: "Nov 23", records: 905 }, { month: "Ene 24", records: 1040 }, { month: "Mar 24", records: 1158 }, { month: "May 24", records: 1246 },
];

export const verificationTrend = [
  { month: "Ene 23", value: 18 }, { month: "Mar 23", value: 28 }, { month: "May 23", value: 37 }, { month: "Jul 23", value: 44 },
  { month: "Sep 23", value: 50 }, { month: "Nov 23", value: 55 }, { month: "Ene 24", value: 60 }, { month: "Mar 24", value: 64 }, { month: "May 24", value: 68 },
];

export const coverageTrend = [
  { month: "Ene 23", value: 12 }, { month: "Mar 23", value: 23 }, { month: "May 23", value: 39 }, { month: "Jul 23", value: 54 },
  { month: "Sep 23", value: 66 }, { month: "Nov 23", value: 75 }, { month: "Ene 24", value: 83 }, { month: "Mar 24", value: 88 }, { month: "May 24", value: 90 },
];

export const categoryGrowth = [
  { month: "Ene 23", recetas: 72, ingredientes: 35, mercados: 29, cocineras: 18, legal: 8 },
  { month: "May 23", recetas: 118, ingredientes: 53, mercados: 47, cocineras: 31, legal: 13 },
  { month: "Sep 23", recetas: 143, ingredientes: 68, mercados: 64, cocineras: 48, legal: 20 },
  { month: "Ene 24", recetas: 185, ingredientes: 89, mercados: 82, cocineras: 61, legal: 28 },
  { month: "May 24", recetas: 210, ingredientes: 112, mercados: 103, cocineras: 79, legal: 36 },
];

export const categoryDistribution = [
  { name: "Recetas", value: 582, color: "#174f78" }, { name: "Ingredientes", value: 128, color: "#e5a71a" },
  { name: "Mercados", value: 243, color: "#4d8a5e" }, { name: "Cocineras/os", value: 214, color: "#72528c" }, { name: "Protección legal", value: 79, color: "#c45a32" },
];

export const rankings = {
  recetas: [{ name: "Mole poblano", value: 128 }, { name: "Chiles en nogada", value: 96 }, { name: "Chalupas", value: 74 }, { name: "Cemitas", value: 52 }, { name: "Pipián verde", value: 41 }],
  ingredientes: [{ name: "Chile poblano", value: 156 }, { name: "Maíz nativo", value: 122 }, { name: "Frijol", value: 98 }, { name: "Quelites", value: 76 }, { name: "Amaranto", value: 54 }],
  mercados: [{ name: "Mercado El Carmen", value: 38 }, { name: "Mercado Hidalgo", value: 29 }, { name: "Mercado 5 de Mayo", value: 24 }, { name: "Mercado La Acocota", value: 20 }, { name: "Tianguis de Zacatlán", value: 17 }],
  municipios: [{ name: "Puebla", value: 312 }, { name: "Atlixco", value: 98 }, { name: "Tehuacán", value: 87 }, { name: "San Andrés Cholula", value: 74 }, { name: "Zacatlán", value: 65 }],
};

export const quality = [
  { label: "Completitud", value: 82, color: "#4d8a5e" }, { label: "Verificación", value: 68, color: "#e5a71a" },
  { label: "Consistencia", value: 90, color: "#174f78" }, { label: "Actualización", value: 76, color: "#1b6b86" },
];

export const reports = [
  { title: "Panorama gastronómico de Puebla 2024", date: "Actualizado el 15 may 2024" },
  { title: "Ingredientes tradicionales en Puebla", date: "Actualizado el 28 abr 2024" },
  { title: "Mercados y tianguis: actualización 2024", date: "Actualizado el 15 abr 2024" },
];
