import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { Decision, Proposal, Session, Tally } from "../api/types";
import { COMARQUES } from "../data/comarques";

function Card({
  row,
  tally,
  onDecide,
}: {
  row: Proposal;
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
        placeholder="Escala, L’Escala" />

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
  const [rows, setRows] = useState<Proposal[]>([]);
  const [tallies, setTallies] = useState<Record<number, Tally>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api.enabled) return;
    let alive = true;
    api.auth.getSession().then((s) => {
      if (alive) {
        setSession(s);
        setReady(true);
      }
    });
    const off = api.auth.onChange(setSession);
    return () => {
      alive = false;
      off();
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const { rows, tallies } = await api.admin.listOpenProposals();
      setRows(rows);
      setTallies(tallies);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconegut");
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    let alive = true;
    api.admin
      .listOpenProposals()
      .then(({ rows: r, tallies: t }) => {
        if (alive) {
          setRows(r);
          setTallies(t);
          setError(null);
        }
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : "Error desconegut");
      });
    return () => {
      alive = false;
    };
  }, [session]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await api.auth.signIn(email, password);
    setError(ok ? null : "Correu o contrasenya incorrectes.");
  };

  const decide = async (id: number, status: Decision, comarca: string, aliases: string[]) => {
    try {
      await api.admin.decide(id, status, comarca, aliases);
      setError(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconegut");
    }
  };

  const header = (
    <div className="topbar">
      <button className="back" onClick={onExit}>← Menú</button>
      <strong>🛠️ Admin</strong>
    </div>
  );

  if (!api.enabled) {
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
        {api.loginHint && <p className="help">🧪 {api.loginHint}</p>}
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

  if (!session.isAdmin) {
    return (
      <main className="app">
        {header}
        <p className="error">Aquest usuari ({session.username}) no és administrador.</p>
        <button className="ghost" onClick={() => api.auth.signOut()}>Sortir</button>
      </main>
    );
  }

  return (
    <main className="app">
      {header}
      <div className="actions">
        <button className="ghost" onClick={load}>↻ Actualitzar</button>
        <button className="ghost" onClick={() => api.auth.signOut()}>Sortir</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {rows.length === 0 && <p>No hi ha propostes pendents. 🎉</p>}
      {rows.map((r) => (
        <Card key={`${r.id}-${r.status}`} row={r} tally={tallies[r.id]} onDecide={decide} />
      ))}
    </main>
  );
}