const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

/**
 * Segmenta una cadena en grafemes visuals individuals (per exemple emojis compostos ZWJ o banderes).
 */
export const splitGraphemes = (text: string): string[] => {
  if (!text) return [];
  if (segmenter) {
    return [...segmenter.segment(text)].map((s) => s.segment);
  }
  return Array.from(text);
};

/**
 * Compta el nombre de grafemes d'un text (longitud visual real d'emojis).
 */
export const countGraphemes = (text: string): number => splitGraphemes(text).length;

/**
 * Retorna el primer grafema visual d'un text o cadena buida si no n'hi ha cap.
 */
export const firstGrapheme = (text: string): string => {
  if (!text) return "";
  if (segmenter) {
    const it = segmenter.segment(text)[Symbol.iterator]().next();
    return it.done ? "" : it.value.segment;
  }
  return Array.from(text)[0] ?? "";
};
