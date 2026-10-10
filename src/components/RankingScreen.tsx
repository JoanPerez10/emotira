import { Fragment, useEffect, useState } from "react";
import { api } from "../api";
import type { LeaderRow, Session } from "../api/types";
import { MODE_METRIC } from "../modes";
import type { Mode } from "../types";
import ModeTabs from "./ModeTabs";

export default function RankingScreen({
  session,
  onExit,
  onLogin,
}: {
  session: Session | null;
  onExit: () => void;
  onLogin: () => void;
}) {
  const [mode, setMode] = useState<Mode>("ten");
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api.enabled) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    api.scores
      .leaderboard(mode)
      .then((r) => {
        if (alive) setRows(r);
      })
      .catch(() => {
        if (alive) setError("No s'ha pogut carregar el rànquing.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [mode, session?.id]);

  return (
    <main className="app">
      <div className="topbar">
        <button className="ghost" onClick={onExit}>← Menú</button>
        <strong>🏅 Rànquing</strong>
      </div>

      <ModeTabs mode={mode} onChange={setMode} />
      <p className="progress">{MODE_METRIC[mode]}</p>

      {loading && <p>Carregant…</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!loading && !error && rows.length === 0 && <p>Encara no hi ha puntuacions en aquest mode.</p>}

      <ol className="ranking">
        {rows.map((r, i) => (
          <Fragment key={`${r.rank}-${r.username}`}>
            {i === 5 && <li className="gap" aria-hidden="true">⋯</li>}
            <li className={r.isMe ? "me" : ""}>
              <span className="pos">#{r.rank}</span>
              <span className="name">{r.username}{r.isMe && " (tu)"}</span>
              <span className="val">{r.value}</span>
            </li>
          </Fragment>
        ))}
      </ol>

      {!loading && session && rows.length > 0 && !rows.some((r) => r.isMe) && (
        <p>Encara no tens puntuació en aquest mode.</p>
      )}
      {!session && (
        <div>
          <p>Entra o crea un compte per sortir al rànquing.</p>
          <button onClick={onLogin}>👤 Entrar / Crear compte</button>
        </div>
      )}
    </main>
  );
}