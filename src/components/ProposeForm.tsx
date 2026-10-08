import { useState } from "react";
import { COMARQUES } from "../data/comarques";
import { puzzles } from "../data/puzzles";
import { normalize } from "../utils/normalize";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const ENABLED = Boolean(SUPABASE_URL && SUPABASE_KEY);

const SENT_KEY = "pobles-emoji:proposals-sent";
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

const countGraphemes = (s: string) =>
  [...new Intl.Segmenter().segment(s)].length;

type State = "idle" | "sending" | "done";

export default function ProposeForm({ onExit }: { onExit: () => void }) {
  const [emojis, setEmojis] = useState("");
  const [answer, setAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [comarca, setComarca] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  const townExists = puzzles.some(
    (p) => answer.trim() && normalize(p.answer) === normalize(answer)
  );

  const validate = (): string | null => {
    const e = emojis.trim();
    if (!e) return "Afegeix els emojis.";
    if (/\p{L}/u.test(e)) return "El camp d'emojis només pot tenir emojis (sense lletres).";
    if (!/\p{Extended_Pictographic}|\u20E3/u.test(e)) return "No veig cap emoji.";
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
    if (recentSent().length >= MAX_PER_DAY)
      return setError("Has enviat moltes propostes avui. Torna demà! 🙏");

    setError(null);
    setState("sending");
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/proposals`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY!,
            ...(SUPABASE_KEY!.startsWith("eyJ")
              ? { Authorization: `Bearer ${SUPABASE_KEY}` }
              : {}),
            Prefer: "return=minimal",
        },
        body: JSON.stringify({
          emojis: emojis.replace(/\s/g, ""),
          answer: answer.trim(),
          explanation: explanation.trim(),
          comarca: comarca || null,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
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

  return (
    <main className="app">
      <div className="topbar">
        <button className="ghost" onClick={onExit}>← Menú</button>
        <strong>💡 Proposa un poble</strong>
      </div>

      {!ENABLED && (
        <p className="error">
          Les propostes no estan configurades (falten les variables VITE_SUPABASE_*).
        </p>
      )}

      <div className="emojis small" aria-live="polite">{emojis || "❓"}</div>

      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="p-emojis">Emojis</label>
          <input id="p-emojis" value={emojis} onChange={(e) => setEmojis(e.target.value)}
            placeholder="🔪⭕" />
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
          <button type="submit" disabled={!ENABLED || state === "sending"}>
            {state === "sending" ? "Enviant…" : "Enviar proposta"}
          </button>
        </div>
      </form>
    </main>
  );
}