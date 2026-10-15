import { useEffect, useState } from "react";
import { api } from "../api";
import type { Proposal, Tally } from "../api/types";
import { votedStorageKey } from "../api/voter";

const VOTED_KEY = votedStorageKey(api.mode);

const loadVoted = (): Record<number, 1 | -1> => {
  try {
    return JSON.parse(localStorage.getItem(VOTED_KEY) ?? "{}");
  } catch {
    return {};
  }
};

export default function VoteScreen({
  onExit,
  onPropose,
}: {
  onExit: () => void;
  onPropose?: () => void;
}) {
  const [items, setItems] = useState<Proposal[]>([]);
  const [tallies, setTallies] = useState<Record<number, Tally>>({});
  const [voted, setVoted] = useState<Record<number, 1 | -1>>(loadVoted);
  const [loading, setLoading] = useState(api.enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api.enabled) return;
    api
      .fetchVotingProposals()
      .then(({ proposals, tallies }) => {
        setItems(proposals);
        setTallies(tallies);
      })
      .catch(() => setError("No s'han pogut carregar les propostes."))
      .finally(() => setLoading(false));
  }, []);

  const vote = async (id: number, value: 1 | -1) => {
    try {
      const result = await api.castVote(id, value);
      setError(null);
      const next = { ...voted, [id]: value };
      setVoted(next);
      try {
        localStorage.setItem(VOTED_KEY, JSON.stringify(next));
      } catch {
        /* sense emmagatzematge */
      }
      if (result === "ok") {
        setTallies((t) => {
          const cur = t[id] ?? { up: 0, down: 0 };
          return {
            ...t,
            [id]: value > 0 ? { ...cur, up: cur.up + 1 } : { ...cur, down: cur.down + 1 },
          };
        });
      }
    } catch {
      setError("No s'ha pogut registrar el vot. Prova-ho més tard.");
    }
  };

  return (
    <main className="app">
      <div className="topbar">
        <button className="back" onClick={onExit}>← Menú</button>
        <strong>🗳️ Vota propostes</strong>
      </div>
      <p>Ajuda a decidir quins trencaclosques entren al joc.</p>

      {/* Proposar i votar són el mateix bucle, així que comparteixen
          pantalla: qui juga entra per aquí i descobreix que pot enviar
          la seva quan li sembli que en cal. */}
      {onPropose && (
        <div className="actions">
          <button className="secondary" onClick={onPropose}>✏️ Proposa un poble</button>
        </div>
      )}

      {loading && <p>Carregant…</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p>Ara mateix no hi ha propostes per votar. Torna més tard!</p>
      )}

      {items.map((p) => {
        const mine = voted[p.id];
        const t = tallies[p.id] ?? { up: 0, down: 0 };
        return (
          <div className="card" key={p.id}>
            <div className="emojis emoji-flag">{p.emojis}</div>
            <p>
              <strong>{p.answer}</strong> — {p.explanation}
            </p>
            {mine ? (
              <p className="tally">
                Has votat {mine > 0 ? "👍" : "👎"} · Resultat: 👍 {t.up} · 👎 {t.down}
              </p>
            ) : (
              <div className="actions">
                <button onClick={() => vote(p.id, 1)}>👍 M'agrada</button>
                <button className="secondary" onClick={() => vote(p.id, -1)}>
                  👎 No m'agrada
                </button>
              </div>
            )}
          </div>
        );
      })}
    </main>
  );
}