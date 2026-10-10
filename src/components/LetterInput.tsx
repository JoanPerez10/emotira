import { useEffect, useImperativeHandle, useReducer, useRef } from "react";
import type { Ref } from "react";

/** Només es permeten lletres i dígits: és el que accepta `normalize()` en resoldre. */
const INVALID = /[^\p{L}\p{N}]/gu;

/** Text i estil amb què se substitueixen les tecles quan el torn ja s'ha resolt. */
export interface Reveal {
  text: string;
  kind: "ok" | "nope";
}

interface State {
  value: string;
  caret: number;
  /** Nombre de tecles. No canvia durant la vida del component: el pare
      torna a muntar-lo amb `key` quan arriba un poble nou. */
  length: number;
}

type Action =
  | { type: "replace"; text: string }   // escriptura directa o enganxat
  | { type: "insert"; text: string }    // tecles del teclat en pantalla
  | { type: "backspace" }
  | { type: "delete" }
  | { type: "caret"; at: number };

/**
 * Totes les tecles es resolen contra l'estat més recent. Amb `useState` + una
 * prop `value`, prémer tres lletres ràpidament només registrasse l'última:
 * React encara no havia tornat a renderitzar entre esdeveniments.
 */
function reducer(s: State, a: Action): State {
  const at = Math.max(0, Math.min(s.caret, s.value.length));
  switch (a.type) {
    case "replace": {
      const value = a.text.replace(INVALID, "").slice(0, s.length);
      return { ...s, value, caret: Math.min(at, value.length) };
    }
    case "insert": {
      const room = s.length - s.value.length;
      if (room <= 0) return s;
      const text = a.text.replace(INVALID, "").slice(0, room);
      if (!text) return s;
      return { ...s, value: s.value.slice(0, at) + text + s.value.slice(at), caret: at + text.length };
    }
    case "backspace":
      if (at > 0) return { ...s, value: s.value.slice(0, at - 1) + s.value.slice(at), caret: at - 1 };
      // Cursor a l'inici: esborra l'última lletra, com en un mòbil real.
      return s.value.length ? { ...s, value: s.value.slice(0, -1), caret: 0 } : s;
    case "delete":
      return at >= s.value.length
        ? s
        : { ...s, value: s.value.slice(0, at) + s.value.slice(at + 1), caret: at };
    case "caret":
      return { ...s, caret: at };
  }
}

/** Una paraula de la resposta, tal com es mostra en una fila de tecles. */
export interface Word {
  /** Lletres que s'escriuen (ja sense accents ni apòstrofs). */
  length: number;
  /** Posicions on hi ha un apòstrof: «d’Aro» → [1] (després de la D). */
  apostrophes: number[];
}

interface Props {
  /** Cada paraula va en una fila; el total de lletres és el nombre de tecles. */
  words: Word[];
  /** Reps el text que l'infant ha escrit. */
  onSubmit: (value: string) => void;
  /** S'avisa de qualsevol canvi d'escriptura (per netejar avisos d'error). */
  onInput?: () => void;
  /** Quan és diferent de null, es mostra la resposta en comptes del que escriu. */
  reveal?: Reveal | null;
  /** Canvia el valor per tornar a disparar l'animació d'error. */
  shakeKey?: number;
  label?: string;
  ref?: Ref<LetterInputHandle>;
}

/** El pare mana enviar i posar el focus sense conèixer el text interior. */
export interface LetterInputHandle {
  submit: () => void;
  focus: () => void;
}

export default function LetterInput({
  words,
  onSubmit,
  onInput,
  reveal = null,
  shakeKey = 0,
  label = "Escriu el nom del poble, lletra per lletra",
  ref,
}: Props) {
  const length = words.reduce((a, w) => a + w.length, 0);
  const [state, dispatch] = useReducer(reducer, { value: "", caret: 0, length });
  const inputRef = useRef<HTMLInputElement>(null);
  const tileRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const locked = reveal !== null;
  const { value, caret } = state;

  // Manté la tecla activa dins de la vista quan hi ha moltes lletres.
  useEffect(() => {
    tileRefs.current[caret]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [caret]);

  // En muntar (poble nou) el focus ja és a la primera lletra: es pot escriure
  // de seguida, sense tocar res. `preventScroll` evita que la pàgina salti.
  useEffect(() => {
    if (locked) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [locked]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (locked) return;
    switch (e.key) {
      case "Backspace":
        e.preventDefault();
        dispatch({ type: "backspace" });
        onInput?.();
        return;
      case "Delete":
        e.preventDefault();
        dispatch({ type: "delete" });
        onInput?.();
        return;
      case "ArrowLeft":
        e.preventDefault();
        dispatch({ type: "caret", at: caret - 1 });
        return;
      case "ArrowRight":
        e.preventDefault();
        dispatch({ type: "caret", at: caret + 1 });
        return;
      case "Home":
        e.preventDefault();
        dispatch({ type: "caret", at: 0 });
        return;
      case "End":
        e.preventDefault();
        dispatch({ type: "caret", at: value.length });
        return;
      case "Enter":
        e.preventDefault();
        onSubmit(value);
        return;
      default:
    }
  };

  // El botó "Comprovar" del pare ja no ha de saber quin és el text.
  useImperativeHandle(
    ref,
    () => ({
      submit: () => {
        if (!locked && value.trim()) onSubmit(value);
      },
      focus: () => inputRef.current?.focus(),
    }),
    [locked, value, onSubmit]
  );

  // Índexs globals de les tecles que van just després d'un apòstrof.
  const aposAt = new Set<number>();
  words.reduce((start, w) => {
    for (const p of w.apostrophes) aposAt.add(start + p);
    return start + w.length;
  }, 0);

  const tiles = Array.from({ length }, (_, i) => {
    const shown = locked ? (reveal.text[i] ?? "") : (value[i] ?? "");
    let cls = "tile";
    if (shown) cls += locked ? (reveal.kind === "ok" ? " ok" : " nope") : " filled";
    if (!locked && i === caret) cls += " active";
    if (aposAt.has(i)) cls += " apos";
    return (
      <span
        key={i}
        ref={(el) => {
          tileRefs.current[i] = el;
        }}
        className={cls}
        aria-hidden="true"
        onPointerDown={(e) => {
          if (locked) return;
          e.preventDefault();
          dispatch({ type: "caret", at: i });
          inputRef.current?.focus();
        }}
      >
        {shown}
      </span>
    );
  });

  // Columnes = paraula més llarga, fins a 14: fins aquí no es trenca mai la fila.
  // Cada apòstrof ocupa uns 0.4 de tecla (vegeu `.tile.apos`).
  const cols = Math.min(14, Math.max(1, ...words.map((w) => w.length + 0.4 * w.apostrophes.length)));

  return (
    <div className="letters">
      <div className="tiles" key={shakeKey} style={{ ["--cols" as string]: cols }}>
        {/* Una fila per paraula: «Pineda de Mar» fa tres files. */}
        {words.map((word, w) => {
          const start = words.slice(0, w).reduce((a, x) => a + x.length, 0);
          return (
            <div className="tiles-row" key={w}>
              {tiles.slice(start, start + word.length)}
            </div>
          );
        })}
      </div>

      {/* Input real però invisible: és el que fa pujar el teclat del mòbil i el
          que llegeix el lector de pantalla. Les tecles de dalt són decoració. */}
      <input
        ref={inputRef}
        className="letters-native"
        value={locked ? "" : value}
        onChange={(e) => {
          dispatch({ type: "replace", text: e.target.value });
          onInput?.();
        }}
        onKeyDown={onKeyDown}
        onSelect={(e) => {
          const t = e.currentTarget;
          dispatch({ type: "caret", at: t.selectionStart ?? t.value.length });
        }}
        maxLength={length}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        disabled={locked}
        aria-label={label}
      />

    </div>
  );
}