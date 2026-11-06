import { recipeDataMode } from "./recipe-data-mode";
import * as local from "./recipe-storage-local";
import * as postgres from "./recipe-storage-postgres";

const storage = recipeDataMode === "local" ? local : postgres;
export const { readRecipes, loadRecipes, findRecipe, createRecipe, upsertRecipe } = storage;
export const deleteRecipe = storage.deleteRecipe;
