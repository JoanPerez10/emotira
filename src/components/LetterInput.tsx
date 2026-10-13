import { useEffect, useId, useImperativeHandle, useReducer, useRef } from "react";
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
  /** Nombre de tecles: s'actualitza en reiniciar el camp amb un poble nou. */
  length: number;
  resetKey?: string | number;
}

type Action =
  | { type: "reset"; length: number; key?: string | number }
  | { type: "replace"; text: string; at: number }   // escriptura directa o enganxat
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
    case "reset":
      return { value: "", caret: 0, length: a.length, resetKey: a.key };
    case "replace": {
      const value = a.text.replace(INVALID, "").slice(0, s.length);
      const kept = a.text.slice(0, Math.max(0, a.at)).replace(INVALID, "").length;
      return { ...s, value, caret: Math.min(kept, value.length) };
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
      return { ...s, caret: Math.max(0, Math.min(a.at, s.value.length)) };
  }
}

import type { Word } from "../utils/words";
export type { Word };

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
  /** Activa el focus natiu per toc al contrarellotge. */
  nativeTapFocus?: boolean;
  /** Buida el camp sense desmuntar-lo ni perdre el teclat del mòbil. */
  resetKey?: string | number;
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
  nativeTapFocus = false,
  resetKey,
  label = "Escriu el nom del poble, lletra per lletra",
  ref,
}: Props) {
  const length = words.reduce((a, w) => a + w.length, 0);
  const [state, dispatch] = useReducer(reducer, { value: "", caret: 0, length, resetKey });
  if (state.resetKey !== resetKey) {
    dispatch({ type: "reset", length, key: resetKey });
  }
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
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
        moveCaret(caret > 0 ? caret - 1 : 0);
        onInput?.();
        return;
      case "Delete":
        e.preventDefault();
        dispatch({ type: "delete" });
        moveCaret(caret);
        onInput?.();
        return;
      case "ArrowLeft":
        e.preventDefault();
        moveCaret(caret - 1);
        return;
      case "ArrowRight":
        e.preventDefault();
        moveCaret(caret + 1);
        return;
      case "Home":
        e.preventDefault();
        moveCaret(0);
        return;
      case "End":
        e.preventDefault();
        moveCaret(value.length);
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

  const Tile = nativeTapFocus ? "label" : "span";

  const moveCaret = (at: number) => {
    const next = Math.max(0, Math.min(at, value.length));
    dispatch({ type: "caret", at: next });
    const input = inputRef.current;
    if (input && input.selectionStart !== next) input.setSelectionRange(next, next);
  };

  const tiles = Array.from({ length }, (_, i) => {
    const shown = locked ? (reveal.text[i] ?? "") : (value[i] ?? "");
    let cls = "tile";
    if (shown) cls += locked ? (reveal.kind === "ok" ? " ok" : " nope") : " filled";
    if (!locked && i === caret) cls += " active";
    if (aposAt.has(i)) cls += " apos";
    return (
      <Tile
        key={i}
        htmlFor={nativeTapFocus && !locked ? inputId : undefined}
        ref={(el) => {
          tileRefs.current[i] = el;
        }}
        className={cls}
        aria-hidden="true"
        onPointerDown={(e) => {
          if (locked || nativeTapFocus) return;
          e.preventDefault();
          moveCaret(i);
          inputRef.current?.focus();
        }}
        onClick={() => {
          if (locked || !nativeTapFocus) return;
          const input = inputRef.current;
          // En tancar el teclat manualment, el mòbil pot conservar el focus.
          // Renova'l dins del toc perquè el navegador torni a obrir el teclat.
          if (input && document.activeElement === input) input.blur();
          input?.focus({ preventScroll: true });
          moveCaret(i);
        }}
      >
        {shown}
      </Tile>
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
        id={inputId}
        className="letters-native"
        value={locked && !nativeTapFocus ? "" : value}
        onChange={(e) => {
          if (locked) return;
          dispatch({ type: "replace", text: e.target.value, at: e.target.selectionStart ?? e.target.value.length });
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
        disabled={locked && !nativeTapFocus}
        aria-readonly={locked && nativeTapFocus ? true : undefined}
        aria-label={label}
      />

    </div>
  );
}
