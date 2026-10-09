import { useMemo, useState } from "react";
import type { GameResult, PuzzleResult } from "../types";
import { normalize } from "../utils/normalize";
import { shuffle } from "../utils/random";
import type { Puzzle } from "../data/puzzles";

type Status = "playing" | "correct" | "revealed";

const pointsFor = (r: PuzzleResult) =>
  r.status === "correct" ? Math.max(1, 3 - r.hints) : 0;

interface Props {
  title: string;
  deck: Puzzle[];
  endless?: boolean;
  hard?: boolean;
  pool: Puzzle[];
  onFinish: (r: GameResult) => void;
  onExit: () => void;
  /** Es crida en el moment d'encertar un poble (útil per desar-lo a la col·lecció). */
  onSolve?: (answer: string) => void;
}

const MAX_FAILS = 3;

export default function Game({
  title,
  deck: initialDeck,
  pool,
  endless = false,
  hard = false,
  onFinish,
  onExit,
  onSolve,
}: Props) {
  const [deck, setDeck] = useState(initialDeck);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<PuzzleResult[]>([]);
  const [guess, setGuess] = useState("");
  const [status, setStatus] = useState<Status>("playing");
  const [wrong, setWrong] = useState(false);
  const [hints, setHints] = useState(0);
  const [fails, setFails] = useState(0);

  const puzzle = deck[index];
  const isLast = !endless && index + 1 >= deck.length;

  const buildResult = (res: PuzzleResult[]): GameResult => ({
    score: res.reduce((s, r) => s + pointsFor(r), 0),
    max: endless ? res.length * 3 : initialDeck.length * 3,
    results: res,
  });

  const score = buildResult(results).score;

  let run = 0;
  for (let i = results.length - 1; i >= 0 && results[i].status === "correct"; i--) run++;

  const hintLines = useMemo(() => {
    const letters = puzzle.answer.replace(/[^\p{L}]/gu, "").length;
    return [
      `Comarca: ${puzzle.comarca}`,
      `${letters} lletres`,
      `Comença per «${puzzle.answer[0]}»`,
    ].slice(0, hints);
  }, [puzzle, hints]);

  const settle = (st: "correct" | "revealed", penalty = hard ? fails : hints) => {
    setStatus(st);
    setResults((r) => [...r, { status: st, hints: penalty }]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "playing" || !guess.trim()) return;
    const accepted = [puzzle.answer, ...(puzzle.aliases ?? [])].map(normalize);
    if (accepted.includes(normalize(guess))) {
      setWrong(false);
      settle("correct");
      onSolve?.(puzzle.answer);
      return;
    }
    if (hard) {
      const f = fails + 1;
      setFails(f);
      setGuess("");
      if (f >= MAX_FAILS) {
        setWrong(false);
        settle("revealed", f);
        return;
      }
    }
    setWrong(true);
  };

  const next = () => {
    if (isLast) {
      onFinish(buildResult(results));
      return;
    }
    if (endless && index + 1 >= deck.length) {
      setDeck(shuffle(shuffle(pool)));
      setIndex(0);
    } else {
      setIndex((i) => i + 1);
    }
    setGuess("");
    setStatus("playing");
    setWrong(false);
    setHints(0);
    setFails(0);
  };

  const stopEndless = () =>
    results.length === 0 ? onExit() : onFinish(buildResult(results));

  return (
    <main className="app">
      <div className="topbar">
        <button className="ghost" onClick={onExit}>← Menú</button>
        <strong>{title}</strong>
      </div>

      <p className="progress">
        {endless
          ? `Ratxa: ${run} · ${score} punts`
          : `${index + 1} / ${deck.length} · ${score} punts`}
      </p>

      <div className="emojis">{puzzle.emojis}</div>
      {hintLines.map((h) => (
        <p key={h} className="hint">💡 {h}</p>
      ))}

      {status === "playing" ? (
        <form onSubmit={submit}>
          <input
            autoFocus
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Escriu el nom…"
            className={wrong ? "wrong" : ""}
          />
          <div className="actions">
            <button type="submit">Provar</button>
            {!hard && (
              <button type="button" disabled={hints >= 3} onClick={() => setHints((h) => h + 1)}>
                Pista
              </button>
            )}
            <button type="button" onClick={() => settle("revealed")}>
              Em rendeixo
            </button>
          </div>
          {hard && <p className="hint">Intents restants: {MAX_FAILS - fails}</p>}
          {wrong && <p className="error">Ups, no és això 🙈</p>}
        </form>
      ) : (
        <div className="result">
          <h2>
            {status === "correct" ? "✅ Correcte!" : "😅 Era:"} {puzzle.answer}
          </h2>
          <p>{puzzle.explanation}</p>
          <p>📍 {puzzle.comarca}</p>
          <div className="actions">
            <button onClick={next}>{isLast ? "Veure resultat" : "Següent"}</button>
            {endless && (
              <button className="secondary" onClick={stopEndless}>Acabar</button>
            )}
          </div>
        </div>
      )}

      {endless && status === "playing" && results.length > 0 && (
        <p><button className="ghost" onClick={stopEndless}>Acabar partida</button></p>
      )}
    </main>
  );
}