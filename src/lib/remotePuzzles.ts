import type { Puzzle } from "../data/puzzles";
import { api } from "../api";

/**
 * Retorna els trencaclosques acceptats a través de la capa unificada de l'API.
 * @deprecated Preferir l'ús directe de `api.fetchAcceptedPuzzles()`.
 */
export async function fetchAcceptedPuzzles(): Promise<Puzzle[]> {
  return api.fetchAcceptedPuzzles();
}