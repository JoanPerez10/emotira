import { useEffect, useMemo, useRef, useState } from "react";
import type { Puzzle } from "../data/puzzles";
import type { GameResult, PuzzleResult } from "../types";
import { calculateScore } from "../modes";
import { eliminateDistractors, inverseOptions, splitEmojis } from "../utils/inverse";

interface Props {
  deck: Puzzle[];
  pool: Puzzle[];
  onSolve: (answer: string) => void;
  onFinish: (result: GameResult) => void;
  onExit: () => void;
}

export default function InverseGame({ deck, pool, onSolve, onFinish, onExit }: Props) {
  const [results, setResults] = useState<PuzzleResult[]>([]);
  const index = results.length;
  const score = calculateScore(results);

  const complete = (result: PuzzleResult) => {
    const next = [...results, result];
    if (next.length >= deck.length) {
      onFinish({ score: calculateScore(next), max: deck.length * 3, results: next });
    } else {
      setResults(next);
    }
  };

  if (!deck[index]) return <main className="app"><button className="back" onClick={onExit}>← Menú</button><p>No hi ha pobles disponibles.</p></main>;

  return (
    <main className="app inverse-game">
      <div className="topbar">
        <button className="back" onClick={onExit}>← Menú</button>
        <strong className="topbar-title">
          <img className="topbar-mark" src="/assets/invers-guineu.png" alt="" width={1254} height={1254} draggable={false} />
          Invers
        </strong>
      </div>
      <div className="steps" aria-hidden="true">
        {deck.map((_, i) => <span key={i} className={`step${i === index ? " step-now" : i < index ? results[i].status === "correct" ? " step-ok" : " step-nope" : ""}`} />)}
      </div>
      <div className="game-status">
        <span className="progress">Poble {index + 1} de {deck.length}</span>
        <span className="progress">{score} punts</span>
      </div>
      <InverseRound key={index} puzzle={deck[index]} pool={pool} isLast={index === deck.length - 1} onSolve={onSolve} onDone={complete} />
    </main>
  );
}

function InverseRound({ puzzle, pool, isLast, onSolve, onDone }: {
  puzzle: Puzzle;
  pool: Puzzle[];
  isLast: boolean;
  onSolve: Props["onSolve"];
  onDone: (result: PuzzleResult) => void;
}) {
  const answer = useMemo(() => splitEmojis(puzzle.emojis), [puzzle.emojis]);
  const [options] = useState(() => inverseOptions(answer, pool));
  const [slots, setSlots] = useState<(string | null)[]>(() => answer.map(() => null));
  const [locked, setLocked] = useState<boolean[]>(() => answer.map(() => false));
  const [removed, setRemoved] = useState<string[]>([]);
  const [fails, setFails] = useState(0);
  const [result, setResult] = useState<PuzzleResult | null>(null);
  const [message, setMessage] = useState("");
  const [wrong, setWrong] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const completedRef = useRef(false);
  const playing = result === null;
  const full = slots.every((emoji) => emoji !== null);
  const hints = removed.length / 2;
  const penalty = Math.min(2, fails + hints);
  const points = 3 - penalty;

  useEffect(() => {
    if (!playing) {
      nextRef.current?.focus();
      return;
    }
    if (full) checkRef.current?.focus();
    else selectorRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [playing, full, hints]);

  const advance = () => {
    if (!result || completedRef.current) return;
    completedRef.current = true;
    onDone(result);
  };

  const select = (emoji: string) => {
    if (!playing || full) return;
    setWrong(false);
    const firstEmpty = slots.indexOf(null);
    setSlots((prev) => prev.map((value, i) => i === firstEmpty ? emoji : value));
  };

  const surrender = () => {
    if (!playing) return;
    setWrong(false);
    setSlots(answer);
    setResult({ status: "revealed", hints: 3 });
    setMessage("Aquesta era la combinació correcta.");
  };

  const useHint = () => {
    if (!playing || hints >= 2) return;
    setWrong(false);
    const nextRemoved = eliminateDistractors(options, answer, removed);
    setRemoved(nextRemoved);
    setSlots((prev) => prev.map((emoji) => emoji && nextRemoved.includes(emoji) ? null : emoji));
    setMessage("");
  };

  const submit = () => {
    if (!playing || !full) return;
    const matches = answer.map((emoji, i) => emoji === slots[i]);
    if (matches.every(Boolean)) {
      setWrong(false);
      setLocked(matches);
      setResult({ status: "correct", hints: penalty, answer: puzzle.answer });
      setMessage(`Encert! ${points} ${points === 1 ? "punt" : "punts"}.`);
      onSolve(puzzle.answer);
      return;
    }
    setFails((prev) => prev + 1);
    setWrong(true);
  };

  return (
    <section className="inverse-round" aria-label={`Construeix els emojis de ${puzzle.answer}`}>
      <h1 className="inverse-town">{puzzle.answer}</h1>
      <div className="inverse-slots" role="group" aria-label={`Resposta de ${answer.length} emojis`}>
        {slots.map((emoji, i) => (
          <button key={i} type="button"
            className={`inverse-slot${locked[i] ? " is-correct" : ""}${result?.status === "revealed" && !locked[i] ? " is-revealed" : ""}`}
            disabled={!playing || locked[i] || !emoji}
            aria-label={`Posició ${i + 1}: ${emoji ?? "buida"}${locked[i] ? ", correcte" : emoji ? ", toca per treure" : ""}`}
            onClick={() => {
              setWrong(false);
              setSlots((prev) => prev.map((value, j) => i === j ? null : value));
            }}>
            {emoji}
          </button>
        ))}
      </div>
      {result?.status !== "revealed" && <div ref={selectorRef} className="inverse-options" role="group" aria-label="Emojis disponibles; pots repetir-los">
        {options.map((emoji) => removed.includes(emoji)
          ? <span key={emoji} className="inverse-option-gap" aria-hidden="true" />
          : <button key={emoji} type="button" className="inverse-option" disabled={!playing || full}
              aria-label={`Afegir ${emoji}`} onClick={() => select(emoji)}>{emoji}</button>)}
      </div>}
      <div className={result?.status === "revealed" ? "feedback feedback-nope" : undefined}>
      {result?.status === "revealed" ? (
        <div role="status">
          <h2>Aquesta era la combinació:</h2>
          <p>{puzzle.explanation}</p>
        </div>
      ) : wrong ? (
        <p className="error" role="alert">Ups! Prova un altre emoji</p>
      ) : (
        <p className={`inverse-message${result?.status === "correct" ? " is-correct" : ""}`} role="status">{message || "\u00a0"}</p>
      )}
      <div className="actions">
        {!playing ? (
          <button ref={nextRef} type="button" onClick={advance}>{isLast ? "Veure el resultat" : "Poble següent"}</button>
        ) : <>
        <button ref={checkRef} type="button" className={wrong ? "danger" : undefined} disabled={!playing || !full} onClick={submit}>Comprovar</button>
        <button type="button" className="accent" disabled={!playing || hints >= 2} onClick={useHint}>
          {hints >= 2 ? "Ja ho saps tot" : `Pista (${hints}/2)`}
        </button>
        </>}
      </div>
      {playing && (
        <div className="surrender-row">
          <button type="button" className="surrender" onClick={surrender}>Em rendeixo</button>
        </div>
      )}
      </div>
    </section>
  );
}
