import { useEffect, useMemo, useRef, useState } from "react";
import type { GameResult, PuzzleResult } from "../types";
import { calculateScore } from "../modes";
import { normalize, isCorrectAnswer } from "../utils/normalize";
import { shuffle } from "../utils/random";
import type { Puzzle } from "../data/puzzles";
import { parseWords } from "../utils/words";
import LetterInput, { type LetterInputHandle } from "./LetterInput";
import GuineuIcon from "./GuineuIcon";
import Icon, { type IconName } from "./Icon";

type Status = "playing" | "correct" | "revealed";

interface Props {
  title: string;
  icon: IconName;
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
  icon,
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
  const [typed, setTyped] = useState(false);
  const [status, setStatus] = useState<Status>("playing");
  const [wrong, setWrong] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [hints, setHints] = useState(0);
  const [fails, setFails] = useState(0);
  const [puzzleFails, setPuzzleFails] = useState(0);
  const nextRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<LetterInputHandle>(null);

  const puzzle = deck[index];
  const isGameOver = hard && fails >= MAX_FAILS;
  const isLast = (!endless && index + 1 >= deck.length) || isGameOver;

  const buildResult = (res: PuzzleResult[]): GameResult => ({
    score: calculateScore(res),
    max: endless ? res.length * 3 : initialDeck.length * 3,
    results: res,
  });

  const score = buildResult(results).score;

  let run = 0;
  for (let i = results.length - 1; i >= 0 && results[i].status === "correct"; i--) run++;

  // Es treuen accents, espais i apòstrofs: és exactament el que es pot escriure.
  // Les tecles segueixen el nom principal, una fila per paraula (els guions
  // també separen). Abans es feien prou tecles per a l'àlies més llarg, i a
  // «Platja d'Aro» sortien més caselles que lletres (per «Castell-Platja d'Aro»).
  // Les àlies més curtes («Pineda») es poden continuar escrivint.
  // Els apòstrofs no s'escriuen però es marquen entre tecles («L’Escala»).
  const words = useMemo(() => parseWords(puzzle.answer), [puzzle.answer]);

  const hintLines = useMemo(() => {
    const lines: string[] = [];
    if (puzzle.comarca) {
      lines.push(
        title === "Música"
          ? `Origen: ${puzzle.comarca}`
          : `És a la comarca del ${puzzle.comarca}`
      );
    }
    lines.push(`Comença per «${puzzle.answer[0].toUpperCase()}»`);
    lines.push(`Es forma així: ${puzzle.explanation}`);
    return lines.slice(0, hints);
  }, [puzzle, hints, title]);

  const settle = (st: "correct" | "revealed", penalty = hard ? puzzleFails : hints) => {
    setStatus(st);
    setResults((r) => [...r, { status: st, hints: penalty }]);
  };

  const submit = (text: string) => {
    if (status !== "playing" || !text.trim()) return;
    if (isCorrectAnswer(text, puzzle)) {
      setWrong(false);
      settle("correct");
      onSolve?.(puzzle.answer);
      return;
    }
    if (hard) {
      const nextFails = fails + 1;
      const nextPuzzleFails = puzzleFails + 1;
      setFails(nextFails);
      setPuzzleFails(nextPuzzleFails);
      setTyped(false);
      if (nextFails >= MAX_FAILS) {
        setWrong(false);
        settle("revealed", nextPuzzleFails);
        return;
      }
    } else {
      setShakeKey((k) => k + 1);
    }
    setWrong(true);
  };

  const giveUp = () => {
    if (status !== "playing") return;
    if (hard) {
      const nextFails = fails + 1;
      setFails(nextFails);
      setWrong(false);
      settle("revealed", puzzleFails + 1);
    } else {
      settle("revealed");
    }
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
    setTyped(false);
    setStatus("playing");
    setWrong(false);
    setHints(0);
    setPuzzleFails(0);
    if (!hard) setFails(0);
  };

  const stopEndless = () =>
    results.length === 0 ? onExit() : onFinish(buildResult(results));

  // En resoldre, el focus salta al botó Següent: es pot continuar sense ratolí.
  useEffect(() => {
    if (status !== "playing") nextRef.current?.focus();
  }, [status]);

  return (
    <main className="app">
      <div className="topbar">
        <button className="back" onClick={onExit}>← Menú</button>
        <strong className="topbar-title">
          <Icon name={icon} size={18} />
          {title}
        </strong>
      </div>

      {!endless && (
        <div className="steps" aria-hidden="true">
          {deck.map((_, i) => (
            <span
              key={i}
              className={
                "step" +
                (i < results.length
                  ? results[i].status === "correct"
                    ? " step-ok"
                    : " step-nope"
                  : "") +
                (i === index && status === "playing" ? " step-now" : "")
              }
            />
          ))}
        </div>
      )}

      <div className="game-status">
        <span className="progress">
          {endless ? `Ratxa: ${run} · ${score} punts` : `${title === "Música" ? "Grup" : "Poble"} ${index + 1} de ${deck.length}`}
        </span>
        {hard && (
          <span className="hearts" role="img" aria-label={`Intents restants: ${MAX_FAILS - fails}`}>
            {Array.from({ length: MAX_FAILS }, (_, i) => (
              <GuineuIcon key={i} name={i < fails ? "lifeDown" : "lifeUp"} size={22} />
            ))}
          </span>
        )}
      </div>

      <p className="puzzle-emoji">{puzzle.emojis}</p>

      {hintLines.map((h) => (
        <p key={h} className="hint">
          <Icon name="lightbulb" size={18} />
          <span>{h}</span>
        </p>
      ))}

      {status === "playing" ? (
        <>
<LetterInput
              /* `fails` a la key: en mode difícil, fallar buida les tecles
                 (react remunta el component i el valor torna a zero). */
              key={`${puzzle.answer}-${hard ? fails : 0}`}
              ref={inputRef}
            words={words}
            onSubmit={submit}
            onInput={() => {
              setTyped(true);
              setWrong(false);
            }}
            shakeKey={shakeKey}
          />

          {wrong && <p className="error" role="alert">Ups! Prova una altra lletra</p>}

          <div className="actions">
            <button
              type="button"
              className={wrong ? "danger" : undefined}
              onClick={() => inputRef.current?.submit()}
              disabled={!typed}
            >
              Comprovar
            </button>
            {!hard && (
              <button
                type="button"
                className="accent"
                disabled={hints >= 3}
                onClick={() => setHints((h) => h + 1)}
              >
                {hints >= 3 ? "Ja ho saps tot" : `Pista (${hints}/3)`}
              </button>
            )}
            <button type="button" className="ghost" onClick={giveUp}>
              Em rendeixo
            </button>
          </div>
        </>
      ) : (
        <div
          className={`feedback ${status === "correct" ? "feedback-ok" : "feedback-nope"}`}
          role="status"
        >
          <LetterInput
            words={words}
            onSubmit={next}
            reveal={{ text: normalize(puzzle.answer), kind: status === "correct" ? "ok" : "nope" }}
            label={`La resposta era ${puzzle.answer}`}
          />
          <h2>
            {status === "correct" ? "Ho has encertat!" : "Aquest era el nom:"}{" "}
            <span className="answer-echo">{puzzle.answer}</span>
          </h2>
          <p>{puzzle.explanation}</p>
          {puzzle.comarca && <p className="help">{puzzle.comarca}</p>}
          <div className="actions">
            <button type="button" ref={nextRef} onClick={next}>
              {isLast ? "Veure el resultat" : title === "Música" ? "Grup següent" : "Poble següent"}
            </button>
            {endless && (
              <button type="button" className="secondary" onClick={stopEndless}>Acabar</button>
            )}
          </div>
        </div>
      )}

      {endless && status === "playing" && results.length > 0 && (
        <p><button className="ghost" onClick={stopEndless}>Acabar la partida</button></p>
      )}
    </main>
  );
}