import type { RecipeRecord, RecipeStatus } from "./recipes";

/** The published snapshot determines the visible state; capture status remains editable separately. */
export function recipeDisplayStatus(recipe: Pick<RecipeRecord, "status" | "publicStatus">): RecipeStatus {
  if (recipe.publicStatus === "published") return "published";
  if (recipe.publicStatus === "draft" && recipe.status === "published") return "draft";
  return recipe.status;
}
