export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export interface Answerable {
  answer: string;
  aliases?: string[];
}

/** Retorna totes les formes acceptades d'un trencaclosques en format normalitzat. */
export const acceptedAnswers = (puzzle: Answerable): string[] =>
  [puzzle.answer, ...(puzzle.aliases ?? [])].map(normalize);

/** Comprova si un text introduït coincideix amb la resposta o algun dels seus àlies. */
export const isCorrectAnswer = (guess: string, puzzle: Answerable): boolean =>
  acceptedAnswers(puzzle).includes(normalize(guess));