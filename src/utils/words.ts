import { normalize } from "./normalize";

/** Una paraula de la resposta, tal com es mostra en una fila de tecles. */
export interface Word {
  /** Lletres que s'escriuen (ja sense accents ni apòstrofs). */
  length: number;
  /** Posicions on hi ha un apòstrof: «d’Aro» → [1] (després de la D). */
  apostrophes: number[];
}

/**
 * Converteix el nom d'un poble o resposta en el desglossament de paraules
 * per a LetterInput, comptant caràcters normalitzats i marcant la posició dels apòstrofs.
 */
export function parseWords(answer: string): Word[] {
  return answer
    .split(/[\s-]+/)
    .map((w): Word => {
      let length = 0;
      const apostrophes: number[] = [];
      for (const ch of w) {
        if (/['’]/.test(ch)) apostrophes.push(length);
        else length += normalize(ch).length;
      }
      return { length, apostrophes: apostrophes.filter((p) => p > 0 && p < length) };
    })
    .filter((w) => w.length > 0);
}
