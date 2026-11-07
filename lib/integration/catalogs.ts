import { loadRecipes } from "@/data/recipe-storage";
import { loadCooks } from "@/data/cook-storage";
import { loadIngredients } from "@/data/ingredient-storage";
import { recipeDataMode } from "@/data/recipe-data-mode";
import { authorCatalogs } from "./records";

export const mappingStorageKey = "observatorio-legacy-mappings-v1";
export function readLegacyMappings(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(mappingStorageKey) || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([key, id]) => /^(recetas|cocineras|ingredientes):/.test(key) && typeof id === "string")) as Record<string, string>;
  } catch { return {}; }
}
export async function loadAuthorCatalogs() {
  const [recipes,cooks,ingredients]=await Promise.all([loadRecipes(),loadCooks(),loadIngredients()]);
  return authorCatalogs(recipes,cooks,ingredients,recipeDataMode);
}
