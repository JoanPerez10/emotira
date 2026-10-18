import type { PuzzleResult } from "../types";

/** Estat d'un poble a la partida: verd net, daurat si l'has encertat però
 *  t'ha costat, vermell si no l'has encertat. Els mateixos tres colors que la
 *  resta del joc: verd és encert, daurat és a mitjan camí, coral és error. */
export type TileTone = "ok" | "hint" | "nope";

const toneOf = (r: PuzzleResult): TileTone =>
  r.status === "correct" ? (r.hints > 0 ? "hint" : "ok") : "nope";

/* Es diu «amb ajuda» i no «amb pistes» perquè el mode difícil compta intents
   fallats com a penalització i altres modes, pistes: el color és el mateix
   però el mot exacte no sempre és «pista». */
const TONE_LABEL: Record<TileTone, string> = {
  ok: "encertat a la primera",
  hint: "encertat amb ajuda",
  nope: "no encertat",
};

/** Els quadrats amb el seu número: un per poble, en ordre de joc. El número
 *  és el que permet parlar de «el poble 3» sense que calgui el nom, que al
 *  final de la partida ja no fa falta per endevinar res. */
export default function ResultTiles({
  results,
  noun = "poble",
}: {
  results: PuzzleResult[];
  /** «poble» o «grup»: el mode de música juga amb grups, no amb pobles. */
  noun?: string;
}) {
  if (results.length === 0) return null;
  return (
    <ol className={`score-tiles${results.length > 8 ? " is-many" : ""}`} aria-label={`Resultat de cada ${noun}`}>
      {results.map((r, i) => {
        const tone = toneOf(r);
        return (
          <li key={i} className={`score-tile t-${tone}`}>
            <span aria-hidden="true">{i + 1}</span>
            <span className="sr-only">{`${noun} ${i + 1}: ${TONE_LABEL[tone]}`}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Els mateixos quadrats llegint el text que es desa al repte diari
 *  (`🟩🟨🟥`). Sense número: aquí és una mirada ràpida al resultat del dia, i
 *  el que interessa és el color de cada poble, no quin era. */
export function DailyTiles({ glyphs }: { glyphs: string }) {
  const TONE_BY_GLYPH: Record<string, TileTone> = { "🟩": "ok", "🟨": "hint", "🟥": "nope" };
  const tones = [...glyphs].map((g) => TONE_BY_GLYPH[g] ?? "nope");
  if (tones.length === 0) return null;
  return (
    <ol className="score-tiles is-sm" aria-label="Resultat de cada poble d'avui">
      {tones.map((tone, i) => (
        <li key={i} className={`score-tile t-${tone}`}>
          <span className="sr-only">{`Poble ${i + 1}: ${TONE_LABEL[tone]}`}</span>
        </li>
      ))}
    </ol>
  );
}