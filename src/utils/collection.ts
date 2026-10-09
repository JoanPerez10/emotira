import type { MapMunicipi } from "../data/catalunyaMap";
import type { Puzzle } from "../data/puzzles";
import { normalize } from "./normalize";

export interface CollectionEntry {
  puzzle: Puzzle;
  /** Municipi del mapa que correspon al poble (null si el nom no coincideix amb cap municipi) */
  municipiId: string | null;
  /** Comarca del trencaclosques; si és buida (propostes acceptades) s'agafa la del mapa */
  comarca: string;
  unlocked: boolean;
}

export interface Collection {
  entries: CollectionEntry[];
  /** Trencaclosques associats a cada municipi del mapa (per id) */
  byMunicipi: Map<string, CollectionEntry[]>;
  /** Ids dels municipis del mapa amb algun trencaclosques descobert */
  unlockedMunicipis: Set<string>;
}

export function buildCollection(
  pool: Puzzle[],
  unlockedAnswers: readonly string[],
  municipis: readonly MapMunicipi[],
  comarcaNames: readonly string[]
): Collection {
  const byName = new Map<string, MapMunicipi>();
  for (const m of municipis) {
    const key = normalize(m.n);
    if (!byName.has(key)) byName.set(key, m);
  }
  const unlocked = new Set(unlockedAnswers);

  // Primer es prova la resposta principal; els àlies només com a recurs, perquè un àlies
  // com «Caldes» o «Cabra» podria coincidir amb un altre municipi.
  const find = (p: Puzzle) =>
    byName.get(normalize(p.answer)) ??
    (p.aliases ?? []).map((a) => byName.get(normalize(a))).find(Boolean);

  const entries: CollectionEntry[] = pool.map((puzzle) => {
    const m = find(puzzle);
    return {
      puzzle,
      municipiId: m?.id ?? null,
      comarca: puzzle.comarca || (m ? comarcaNames[m.c - 1] : "") || "",
      unlocked: unlocked.has(puzzle.answer),
    };
  });

  const byMunicipi = new Map<string, CollectionEntry[]>();
  const unlockedMunicipis = new Set<string>();
  for (const e of entries) {
    if (!e.municipiId) continue;
    byMunicipi.set(e.municipiId, [...(byMunicipi.get(e.municipiId) ?? []), e]);
    if (e.unlocked) unlockedMunicipis.add(e.municipiId);
  }

  return { entries, byMunicipi, unlockedMunicipis };
}
