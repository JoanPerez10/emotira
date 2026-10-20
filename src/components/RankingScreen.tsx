import { Fragment, useEffect, useState } from "react";
import { api } from "../api";
import type { LeaderRow, Session } from "../api/types";
import { MODE_METRIC } from "../modes";
import type { Mode } from "../types";
import ModeTabs from "./ModeTabs";
import LeaderRowItem from "./LeaderRowItem";
import GuineuIcon from "./GuineuIcon";

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
  const [loading, setLoading] = useState(api.enabled);
  const [error, setError] = useState<string | null>(null);

  const selectMode = (m: Mode) => {
    setMode(m);
    setLoading(true);
    setError(null);
  };

  useEffect(() => {
    if (!api.enabled) return;
    let alive = true;
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
        <button className="back" onClick={onExit}>← Menú</button>
        <strong className="topbar-title"><GuineuIcon name="ranking" size={24} /> Rànquing</strong>
      </div>

      <ModeTabs mode={mode} onChange={selectMode} />
      <p className="progress">{MODE_METRIC[mode]}</p>

      {loading && <p>Carregant…</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!loading && !error && rows.length === 0 && <p>Encara no hi ha puntuacions en aquest mode.</p>}

      <ol className="ranking">
        {rows.map((r, i) => (
          <Fragment key={`${r.rank}-${r.username}`}>
            {i === 5 && <li className="gap" aria-hidden="true">⋯</li>}
            <LeaderRowItem row={r} mode={mode} />
          </Fragment>
        ))}
      </ol>

      {!loading && session && rows.length > 0 && !rows.some((r) => r.isMe) && (
        <p>Encara no tens puntuació en aquest mode.</p>
      )}
      {!session && (
        <div>
          <p>Entra o crea un compte per sortir al rànquing.</p>
          <button onClick={onLogin}>
            <GuineuIcon name="profile" size={20} /> Entrar / Crear compte
          </button>
        </div>
      )}
    </main>
  );
}