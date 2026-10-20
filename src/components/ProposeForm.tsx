import { useState } from "react";
import { COMARQUES } from "../data/comarques";
import { puzzles } from "../data/puzzles";
import { isCorrectAnswer } from "../utils/normalize";
import { countGraphemes, splitGraphemes } from "../utils/graphemes";
import { api, isMock } from "../api";
import EmojiPicker from "./EmojiPicker";
import GuineuIcon from "./GuineuIcon";

const SENT_KEY = "emotira:proposals-sent";
const MAX_PER_DAY = 5;
const MAX_EMOJIS = 10;

const recentSent = (): number[] => {
  try {
    const arr = JSON.parse(localStorage.getItem(SENT_KEY) ?? "[]") as number[];
    return arr.filter((t) => Date.now() - t < 86_400_000);
  } catch {
    return [];
  }
};

const markSent = () => {
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify([...recentSent(), Date.now()]));
  } catch {
    /* sense emmagatzematge */
  }
};

type State = "idle" | "sending" | "done";

export default function ProposeForm({ onExit }: { onExit: () => void }) {
  const [emojis, setEmojis] = useState("");
  const [answer, setAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [comarca, setComarca] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const townExists = puzzles.some(
    (p) => answer.trim() && isCorrectAnswer(answer, p)
  );

  const addEmoji = (emojiChar: string) => {
    const currentCount = countGraphemes(emojis);
    if (currentCount < MAX_EMOJIS) {
      setEmojis((prev) => prev + emojiChar);
      setError(null);
    } else {
      setError(`Màxim ${MAX_EMOJIS} emojis.`);
    }
  };
  const removeLastEmoji = () => {
    const segments = splitGraphemes(emojis);
    if (segments.length > 0) {
      segments.pop();
      setEmojis(segments.join(""));
      setError(null);
    }
  };

  const validate = (): string | null => {
    const e = emojis.trim();
    if (!e) return "Afegeix els emojis.";
    if (/\p{L}/u.test(e)) return "El camp d'emojis només pot tenir emojis (sense lletres).";
    // Les banderes (🇬🇧) són dos Regional_Indicator, no Extended_Pictographic.
    if (!/\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u.test(e)) return "No veig cap emoji.";
    if (countGraphemes(e.replace(/\s/g, "")) > MAX_EMOJIS)
      return `Màxim ${MAX_EMOJIS} emojis.`;
    if (puzzles.some((p) => p.emojis === e.replace(/\s/g, "")))
      return "Aquests emojis ja són en un trencaclosques existent.";
    if (answer.trim().length < 2) return "Escriu el nom del poble.";
    if (explanation.trim().length < 2) return "Explica com es forma (ex.: «Mart + orella»).";
    return null;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (honeypot) {
      setState("done"); // bot: fem veure que ha anat bé
      return;
    }
    const err = validate();
    if (err) return setError(err);
    if (!isMock && recentSent().length >= MAX_PER_DAY)
      return setError("Has enviat moltes propostes avui. Torna demà! 🙏");

    setError(null);
    setState("sending");
    try {
      await api.submitProposal({
        emojis: emojis.replace(/\s/g, ""),
        answer: answer.trim(),
        explanation: explanation.trim(),
        comarca: comarca || null,
      });
      markSent();
      setState("done");
    } catch {
      setState("idle");
      setError("No s'ha pogut enviar. Prova-ho una mica més tard.");
    }
  };

  const reset = () => {
    setEmojis("");
    setAnswer("");
    setExplanation("");
    setComarca("");
    setState("idle");
  };

  if (state === "done") {
    return (
      <main className="app">
        <h1>🎉 Gràcies!</h1>
        <p>Hem rebut la teva proposta. La revisarem i, si encaixa, entrarà al joc.</p>
        <div className="actions">
          <button onClick={reset}>Proposar-ne una altra</button>
          <button className="secondary" onClick={onExit}>Menú</button>
        </div>
      </main>
    );
  }

  const emojiCount = countGraphemes(emojis);

  return (
    <main className="app">
      <div className="topbar">
        <button className="back" onClick={onExit}>← Menú</button>
        <strong className="topbar-title"><GuineuIcon name="idea" size={22} /> Proposa un poble</strong>
      </div>

      {!api.enabled && (
        <p className="error">
          Les propostes no estan configurades (falten les variables VITE_SUPABASE_*).
        </p>
      )}

      <form onSubmit={submit}>
        <div className="field">
          <div className="emoji-field-header">
            <label htmlFor="p-emojis">Emojis</label>
            <span className="emoji-count">{emojiCount}/{MAX_EMOJIS}</span>
          </div>
          <div className="emoji-input-wrapper" onClick={() => setShowPicker(true)}>
            <input
              id="p-emojis"
              value={emojis}
              readOnly
              /* El camp és de mostra: el clic l'obre l'envoltor, que és qui
                 posa el selector. Sense això, el ratolí li dona el focus i
                 el navegador hi dibuixa l'anell blau —i en un input de text
                 el considera sempre focus-visible, encara que hi hagues arribat
                 amb el punter—, de manera que el marc blau tornava cada vegada
                 que s'obria el selector. Amb el focus només de teclat, l'anell
                 segueix apareixent per a qui navega amb el teclado i no en
                 molestar qui hi arriba amb el dit. */
              onMouseDown={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key === "Backspace") {
                  e.preventDefault();
                  removeLastEmoji();
                } else {
                  e.preventDefault();
                }
              }}
              placeholder="Tria els emojis..."
              className="emoji-input-field"
            />
            <div className="emoji-input-actions">
              {emojis.length > 0 && (
                <button
                  type="button"
                  className="emoji-action-btn backspace-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeLastEmoji();
                  }}
                  title="Esborra l'últim emoji"
                  aria-label="Esborra l'últim emoji"
                >
                  ⌫
                </button>
              )}
              <button
                type="button"
                className={`emoji-action-btn picker-trigger-btn ${showPicker ? "active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPicker((prev) => !prev);
                }}
                title={showPicker ? "Tancar cercador d'emojis" : "Obrir cercador d'emojis"}
                aria-label="Selector d'emojis"
              >
                😀
              </button>
            </div>
          </div>
          {showPicker && (
            <div className="emoji-picker-container">
              <EmojiPicker selected={emojis} onPick={addEmoji} />
            </div>
          )}
        </div>
        <div className="field">
          <label htmlFor="p-answer">Poble o ciutat</label>
          <input id="p-answer" value={answer} onChange={(e) => setAnswer(e.target.value)}
            placeholder="Mataró" maxLength={60} />
          {townExists && (
            <p className="help">Ja tenim un trencaclosques d'aquest poble; si el teu és diferent, endavant!</p>
          )}
        </div>
        <div className="field">
          <label htmlFor="p-expl">Com es forma?</label>
          <input id="p-expl" value={explanation} onChange={(e) => setExplanation(e.target.value)}
            placeholder="Matar + O" maxLength={120} />
        </div>
        <div className="field">
          <label htmlFor="p-comarca">Comarca (opcional)</label>
          <select id="p-comarca" value={comarca} onChange={(e) => setComarca(e.target.value)}>
            <option value="">— No ho sé —</option>
            {COMARQUES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Honeypot: els humans no el veuen */}
        <div className="hp" aria-hidden="true">
          <label>
            Web
            <input tabIndex={-1} autoComplete="off" value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)} />
          </label>
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="actions">
          <button type="submit" disabled={!api.enabled || state === "sending"}>
            {state === "sending" ? "Enviant…" : "Enviar proposta"}
          </button>
        </div>
      </form>
    </main>
  );
}
