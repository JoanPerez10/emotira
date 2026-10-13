import { useEffect, useReducer, useRef } from "react";
import type { Puzzle } from "../data/puzzles";
import type { GameResult } from "../types";
import { normalize } from "../utils/normalize";
import { shuffle } from "../utils/random";
import { createTrial, trialReducer, TRIAL_ATTEMPTS, TRIAL_BONUS_STEPS, TRIAL_MAX_SECONDS, TRIAL_SECONDS } from "../utils/timeTrial";
import Icon from "./Icon";
import { parseWords } from "../utils/words";
import LetterInput, { type LetterInputHandle } from "./LetterInput";

interface Props {
  deck: Puzzle[];
  pool: Puzzle[];
  onSolve: (answer: string) => void;
  onFinish: (result: GameResult) => void;
  onExit: () => void;
}

export function TimeTrialRules({ onPlay, onExit }: { onPlay: () => void; onExit: () => void }) {
  return (
    <main className="app">
      <div className="topbar"><button className="back" onClick={onExit}>← Menú</button><strong className="topbar-title"><Icon name="timer" size={18} /> Contrarellotge</strong></div>
      <section className="trial-rules card">
        <img className="trial-fox trial-fox-rules" src="/assets/contrarellotge-guineu.png" alt="" width={1254} height={1254} draggable={false} />
        <h1>Contra el rellotge!</h1>
        <p>Quants pobles pots encertar en {TRIAL_SECONDS / 60} minuts?</p>
        <ul>
          <li><b>1 encert = 1 punt.</b> Després del primer error veuràs la comarca; després del segon, la primera lletra.</li>
          <li><b>3 intents per poble.</b> El tercer error revela el nom i passa al següent, sense penalització de temps.</li>
          <li><b>Saltar resta 2 segons.</b> El poble torna al final de la cua.</li>
          <li><b>5 encerts seguits = +5 segons.</b> Saltar o esgotar els intents reinicia el bonus.</li>
          <li>Cada 5 encerts seguits guanyes 5 segons extra. Pots acumular fins a 60 segons de bonus per partida.</li>
        </ul>
        <p className="help">Els errors inicials no trenquen el bonus. El temps segueix corrent entre pobles i si canvies de pestanya. Els encerts compten per a la col·lecció.</p>
        <div className="actions"><button onClick={onPlay}><Icon name="timer" size={20} /> Jugar</button></div>
      </section>
    </main>
  );
}

export default function TimeTrial({ deck, pool, onSolve, onFinish, onExit }: Props) {
  const [state, dispatch] = useReducer(trialReducer, deck, (queue) => createTrial(queue, performance.now()));
  const inputRef = useRef<LetterInputHandle>(null);
  const processedRef = useRef(0);
  const finishedRef = useRef(false);
  const puzzle = state.queue[0];
  const solved = state.results.filter((r) => r.status === "correct").length;

  useEffect(() => {
    const tick = () => dispatch({ type: "tick", now: performance.now() });
    const interval = window.setInterval(tick, 100);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", tick); };
  }, []);

  useEffect(() => {
    for (const result of state.results.slice(processedRef.current)) {
      if (result.status === "correct" && result.answer) onSolve(result.answer);
    }
    processedRef.current = state.results.length;
    if (state.status === "finished" && !finishedRef.current) {
      finishedRef.current = true;
      onFinish({ score: solved, max: state.results.length, results: state.results });
    }
  }, [state.results, state.status, solved, onSolve, onFinish]);

  useEffect(() => {
    if (state.status !== "correct" && state.status !== "failed") return;
    const timeout = window.setTimeout(() => dispatch({ type: "advance", now: performance.now(), turn: state.turn, refill: shuffle(pool) }), state.status === "correct" ? 650 : 1100);
    return () => window.clearTimeout(timeout);
  }, [state.status, state.turn, pool]);

  if (!puzzle || state.status === "finished") return <main className="app"><p role="status">Temps esgotat!</p></main>;
  const words = parseWords(puzzle.answer);
  const seconds = `${Math.floor(state.remaining / 60)}:${String(state.remaining % 60).padStart(2, "0")}`;
  const playing = state.status === "playing";

  const submit = (text: string) => {
    if (!playing) return;
    dispatch({ type: "submit", text, turn: state.turn, now: performance.now() });
  };

  return (
    <main className="app trial-game">
      <div className="topbar"><button className="back" onClick={onExit}>← Menú</button><strong className="topbar-title"><Icon name="timer" size={18} /> Contrarellotge</strong></div>
      <div className="trial-panel">
        <div className="trial-dashboard">
          <div className={`trial-clock${state.remaining <= 15 ? " trial-urgent" : ""}`}><span>Temps restant</span><b role="timer" aria-label={`Temps restant: ${state.remaining} segons`}>{seconds}</b></div>
          <div className="trial-score"><span>Encerts</span><b>{solved}</b></div>
        </div>
        <div className={`trial-time-track${state.remaining <= 15 ? " trial-urgent" : ""}`} aria-hidden="true"><span style={{ width: `${100 * state.remaining / (TRIAL_SECONDS + state.bonusSeconds)}%` }} /></div>
      <section className="trial-bonus" aria-label="Bonus de temps">
        <div className="trial-bonus-label"><Icon name="flame" size={16} /><strong>Ratxa: {state.progress}/{TRIAL_BONUS_STEPS}</strong><span>{state.bonusSeconds >= TRIAL_MAX_SECONDS - TRIAL_SECONDS ? "Bonus màxim" : "Bonus +5 s"}</span></div>
        <div className="trial-bonus-steps" role="progressbar" aria-label="Encerts per al bonus" aria-valuemin={0} aria-valuemax={TRIAL_BONUS_STEPS} aria-valuenow={state.progress}>
          {Array.from({ length: TRIAL_BONUS_STEPS }, (_, i) => <span key={i} className={i < state.progress ? "is-filled" : ""} aria-hidden="true"><Icon name="check" size={18} /></span>)}
        </div>
      </section>
      </div>
      <p className="trial-warning" role="status">{state.remaining <= 15 ? "Últims 15 segons!" : "\u00a0"}</p>
      <div className="game-status"><span className="hearts" aria-label={`Intents restants: ${TRIAL_ATTEMPTS - state.fails}`}>{Array.from({ length: TRIAL_ATTEMPTS }, (_, i) => <span key={i} className={i < state.fails ? "heart-lost" : undefined} aria-hidden="true">❤️</span>)}</span></div>
      <p className="puzzle-emoji">{puzzle.emojis}</p>
      {playing && state.fails >= 1 && puzzle.comarca && <p className="hint"><Icon name="lightbulb" size={18} /><span>Comarca: {puzzle.comarca}</span></p>}
      {playing && state.fails >= 2 && <p className="hint"><Icon name="lightbulb" size={18} /><span>Comença per «{puzzle.answer[0].toUpperCase()}»</span></p>}
      <LetterInput resetKey={`${state.turn}-${state.fails}`} ref={inputRef} words={words} onSubmit={submit} nativeTapFocus
        reveal={playing ? null : { text: normalize(puzzle.answer), kind: state.status === "correct" ? "ok" : "nope" }}
        shakeKey={state.fails} />
      <span className="sr-only" role="status">{state.message}</span>
      <div className="actions">
        <button disabled={!playing} onPointerDown={(e) => e.preventDefault()} onClick={() => {
          inputRef.current?.focus();
          inputRef.current?.submit();
        }}>Comprovar</button>
        <button className="secondary" disabled={!playing} onClick={() => {
          dispatch({ type: "skip", turn: state.turn, now: performance.now() });
          inputRef.current?.focus();
        }}>Saltar −2 s</button>
      </div>
    </main>
  );
}
