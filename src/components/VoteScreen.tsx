import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface Proposal {
  id: number;
  emojis: string;
  answer: string;
  explanation: string;
}
type Tally = { up: number; down: number };

const VOTER_KEY = "pobles-emoji:voter-id";
const VOTED_KEY = "pobles-emoji:voted";

const voterId = () => {
  try {
    let id = localStorage.getItem(VOTER_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VOTER_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
};

const loadVoted = (): Record<number, 1 | -1> => {
  try {
    return JSON.parse(localStorage.getItem(VOTED_KEY) ?? "{}");
  } catch {
    return {};
  }
};

export default function VoteScreen({ onExit }: { onExit: () => void }) {
  const [items, setItems] = useState<Proposal[]>([]);
  const [tallies, setTallies] = useState<Record<number, Tally>>({});
  const [voted, setVoted] = useState<Record<number, 1 | -1>>(loadVoted);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = supabase;
    if (!sb) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await sb
        .from("proposals")
        .select("id,emojis,answer,explanation")
        .eq("status", "voting")
        .order("id");
      if (error) {
        setError("No s'han pogut carregar les propostes.");
        setLoading(false);
        return;
      }
      const list = (data ?? []) as Proposal[];
      const t: Record<number, Tally> = {};
      if (list.length) {
        const { data: votes } = await sb
          .from("votes")
          .select("proposal_id,value")
          .in("proposal_id", list.map((p) => p.id));
        for (const v of votes ?? []) {
          const x = (t[v.proposal_id] ??= { up: 0, down: 0 });
          if (v.value > 0) x.up++;
          else x.down++;
        }
      }
      setItems(list);
      setTallies(t);
      setLoading(false);
    })();
  }, []);

  const vote = async (id: number, value: 1 | -1) => {
    const sb = supabase;
    if (!sb) return;
    const { error } = await sb
      .from("votes")
      .insert({ proposal_id: id, voter_id: voterId(), value });
    // 23505 = ja havia votat: ho donem per bo
    if (error && error.code !== "23505") {
      setError("No s'ha pogut registrar el vot. Prova-ho més tard.");
      return;
    }
    setError(null);
    const next = { ...voted, [id]: value };
    setVoted(next);
    try {
      localStorage.setItem(VOTED_KEY, JSON.stringify(next));
    } catch {
      /* sense emmagatzematge */
    }
    if (!error) {
      setTallies((t) => {
        const cur = t[id] ?? { up: 0, down: 0 };
        return {
          ...t,
          [id]: value > 0 ? { ...cur, up: cur.up + 1 } : { ...cur, down: cur.down + 1 },
        };
      });
    }
  };

  return (
    <main className="app">
      <div className="topbar">
        <button className="ghost" onClick={onExit}>← Menú</button>
        <strong>🗳️ Vota propostes</strong>
      </div>
      <p>Ajuda a decidir quins trencaclosques entren al joc.</p>

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
            <div className="emojis">{p.emojis}</div>
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