import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { COMARQUES } from "../data/comarques";
import { supabase } from "../lib/supabase";

interface Row {
  id: number;
  emojis: string;
  answer: string;
  explanation: string;
  comarca: string | null;
  aliases: string[];
  status: "pending" | "voting";
}
type Tally = { up: number; down: number };
type Decision = "voting" | "accepted" | "rejected";

function Card({
  row,
  tally,
  onDecide,
}: {
  row: Row;
  tally?: Tally;
  onDecide: (id: number, d: Decision, comarca: string, aliases: string[]) => Promise<void>;
}) {
  const [comarca, setComarca] = useState(row.comarca ?? "");
  const [aliases, setAliases] = useState(row.aliases.join(", "));
  const [busy, setBusy] = useState(false);

  const decide = async (d: Decision) => {
    setBusy(true);
    await onDecide(
      row.id,
      d,
      comarca,
      aliases.split(",").map((s) => s.trim()).filter(Boolean)
    );
    setBusy(false);
  };

  return (
    <div className="card">
      <div className="emojis emoji-flag">{row.emojis}</div>
      <p>
        <strong>{row.answer}</strong> — {row.explanation}
      </p>
      {row.status === "voting" && (
        <p className="tally">En votació · 👍 {tally?.up ?? 0} · 👎 {tally?.down ?? 0}</p>
      )}

      <label htmlFor={`c-${row.id}`}>Comarca (obligatòria per acceptar)</label>
      <select id={`c-${row.id}`} value={comarca} onChange={(e) => setComarca(e.target.value)}>
        <option value="">— Tria —</option>
        {COMARQUES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <label htmlFor={`a-${row.id}`}>Àlies acceptats (separats per comes)</label>
      <input id={`a-${row.id}`} value={aliases} onChange={(e) => setAliases(e.target.value)}
        placeholder="Escala, L'Escala" />

      <div className="actions">
        <button disabled={busy || !comarca} onClick={() => decide("accepted")}>✅ Acceptar</button>
        {row.status === "pending" && (
          <button className="secondary" disabled={busy} onClick={() => decide("voting")}>
            🗳️ A votació
          </button>
        )}
        <button className="ghost" disabled={busy} onClick={() => decide("rejected")}>
          ❌ Rebutjar
        </button>
      </div>
    </div>
  );
}

export default function AdminPanel({ onExit }: { onExit: () => void }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [tallies, setTallies] = useState<Record<number, Tally>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    const sb = supabase;
    if (!sb) return;
    const { data, error } = await sb
      .from("proposals")
      .select("id,emojis,answer,explanation,comarca,aliases,status")
      .in("status", ["pending", "voting"])
      .order("id");
    if (error) {
      setError(error.message);
      return;
    }
    const list = (data ?? []) as Row[];
    setRows(list);
    const votingIds = list.filter((r) => r.status === "voting").map((r) => r.id);
    const t: Record<number, Tally> = {};
    if (votingIds.length) {
      const { data: votes } = await sb
        .from("votes")
        .select("proposal_id,value")
        .in("proposal_id", votingIds);
      for (const v of votes ?? []) {
        const x = (t[v.proposal_id] ??= { up: 0, down: 0 });
        if (v.value > 0) x.up++;
        else x.down++;
      }
    }
    setTallies(t);
  }, []);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    setError(error ? "Correu o contrasenya incorrectes." : null);
  };

  const decide = async (id: number, status: Decision, comarca: string, aliases: string[]) => {
    const sb = supabase;
    if (!sb) return;
    const { data, error } = await sb
      .from("proposals")
      .update({ status, comarca: comarca || null, aliases })
      .eq("id", id)
      .select("id");
    if (error) return setError(error.message);
    if (!data?.length) {
      return setError(
        "No s'ha pogut actualitzar: revisa que el teu usuari sigui l'administrador a les polítiques de Supabase."
      );
    }
    setError(null);
    load();
  };

  const header = (
    <div className="topbar">
      <button className="ghost" onClick={onExit}>← Menú</button>
      <strong>🛠️ Admin</strong>
    </div>
  );

  if (!supabase) {
    return (
      <main className="app">
        {header}
        <p className="error">Falten les variables VITE_SUPABASE_*.</p>
      </main>
    );
  }
  if (!ready) return <main className="app">{header}<p>Carregant…</p></main>;

  if (!session) {
    return (
      <main className="app">
        {header}
        <form onSubmit={login}>
          <div className="field">
            <label htmlFor="adm-email">Correu</label>
            <input id="adm-email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </div>
          <div className="field">
            <label htmlFor="adm-pass">Contrasenya</label>
            <input id="adm-pass" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit">Entrar</button>
        </form>
      </main>
    );
  }

  return (
    <main className="app">
      {header}
      <div className="actions">
        <button className="ghost" onClick={load}>↻ Actualitzar</button>
        <button className="ghost" onClick={() => supabase!.auth.signOut()}>Sortir</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {rows.length === 0 && <p>No hi ha propostes pendents. 🎉</p>}
      {rows.map((r) => (
        <Card key={`${r.id}-${r.status}`} row={r} tally={tallies[r.id]} onDecide={decide} />
      ))}
    </main>
  );
}