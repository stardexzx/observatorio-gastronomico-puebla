import { createBlankIngredient, normalizeIngredient, type IngredientRecord } from "@/data/ingredients";
import { readIngredients, upsertIngredient } from "@/data/ingredient-storage";
import { pueblaMunicipalities } from "@/data/puebla-municipalities";
import { normalizedName } from "./records";

type IngredientCapture = { name: string; description?: string; municipality?: string; municipalityCode?: string };

/** Market capture uses the author's ingredient catalog; existing names are never overwritten. */
export async function ensureAuthorIngredient(input: IngredientCapture): Promise<IngredientRecord> {
  const name = input.name.trim();
  if (!name) throw new Error("Escribe el nombre del ingrediente o producto.");
  const existing = readIngredients().find((record) => normalizedName(record.name) === normalizedName(name));
  if (existing) return existing;
  const municipality = pueblaMunicipalities.find((item) => item.code === input.municipalityCode || (input.municipality && normalizedName(item.name) === normalizedName(input.municipality)));
  const record = normalizeIngredient({
    ...createBlankIngredient(), id: crypto.randomUUID(), name, description: input.description?.trim() || "", status: "draft",
    municipality: municipality?.name || input.municipality?.trim() || "", municipalityCode: municipality?.code || "", updatedAt: new Date().toISOString(),
  });
  upsertIngredient(record);
  return record;
}
