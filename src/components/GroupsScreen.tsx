import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { GroupInfo, GroupRankRow, Session } from "../api/types";
import { MODE_METRIC } from "../modes";
import type { Mode } from "../types";
import ModeTabs from "./ModeTabs";
import LeaderRowItem from "./LeaderRowItem";
import GuineuIcon from "./GuineuIcon";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Alguna cosa ha fallat.");

export default function GroupsScreen({
  session,
  onExit,
  onLogin,
}: {
  session: Session | null;
  onExit: () => void;
  onLogin: () => void;
}) {
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [selected, setSelected] = useState<GroupInfo | null>(null);
  const [ranking, setRanking] = useState<GroupRankRow[]>([]);
  const [mode, setMode] = useState<Mode>("ten");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setGroups(await api.groups.list());
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    let alive = true;
    api.groups
      .list()
      .then((g) => {
        if (alive) setGroups(g);
      })
      .catch((e) => {
        if (alive) setError(errMsg(e));
      });
    return () => {
      alive = false;
    };
  }, [session]);

  const open = async (g: GroupInfo) => {
    setSelected(g);
    setRanking([]);
    setError(null);
    setCopied(false);
    setLoading(true);
    try {
      setRanking(await api.groups.ranking(g.id));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const g = await api.groups.create(name);
      setName("");
      await refresh();
      await open(g);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const g = await api.groups.join(code);
      setCode("");
      await refresh();
      await open(g);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const leave = async () => {
    if (!selected || !confirm(`Vols sortir del grup «${selected.name}»?`)) return;
    try {
      await api.groups.leave(selected.id);
      setSelected(null);
      await refresh();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const copyCode = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.code);
      setCopied(true);
    } catch {
      /* clipboard no disponible */
    }
  };

  const header = (
    <div className="topbar">
      <button className="back" onClick={selected ? () => setSelected(null) : onExit}>
        ← {selected ? "Els meus grups" : "Menú"}
      </button>
      <strong className="topbar-title"><GuineuIcon name="group" size={22} /> Grups</strong>
    </div>
  );

  if (!session) {
    return (
      <main className="app">
        {header}
        <p>Per crear un grup o unir-t'hi, necessites un compte.</p>
        <button onClick={onLogin}>
          <GuineuIcon name="profile" size={20} /> Entrar / Crear compte
        </button>
      </main>
    );
  }

  if (selected) {
    const modeRows = ranking.filter((r) => r.mode === mode);
    return (
      <main className="app">
        {header}
        <h2>{selected.name}</h2>
        <p>
          Codi per unir-s'hi: <span className="code">{selected.code}</span>{" "}
          <button className="ghost" onClick={copyCode}>
            {copied ? (
              <>
                <GuineuIcon name="check" size={18} /> Copiat
              </>
            ) : (
              "Copiar"
            )}
          </button>
        </p>
        <p className="progress">{selected.members} membres</p>

        <ModeTabs mode={mode} onChange={setMode} />
        <p className="progress">{MODE_METRIC[mode]}</p>

        {loading && <p>Carregant…</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <ol className="ranking">
          {modeRows.map((r) => (
            <LeaderRowItem key={r.username} row={r} mode={mode} />
          ))}
        </ol>
        <button className="ghost" onClick={leave}>Sortir del grup</button>
      </main>
    );
  }

  return (
    <main className="app">
      {header}
      {error && <p className="error" role="alert">{error}</p>}

      {groups.length === 0 ? (
        <p>Encara no ets a cap grup.</p>
      ) : (
        groups.map((g) => (
          <div className="card" key={g.id}>
            <strong>{g.name}</strong> · {g.members} membres
            <div className="actions">
              <button onClick={() => open(g)}>Veure rànquing</button>
            </div>
          </div>
        ))
      )}

      <form onSubmit={join}>
        <div className="field">
          <label htmlFor="g-code">Unir-me amb un codi</label>
          <input id="g-code" value={code} maxLength={6}
            onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123" />
        </div>
        <button type="submit" disabled={code.trim().length < 6}>Unir-me</button>
      </form>

      <form onSubmit={create}>
        <div className="field">
          <label htmlFor="g-name">Crear un grup nou</label>
          <input id="g-name" value={name} maxLength={40}
            onChange={(e) => setName(e.target.value)} placeholder="Els amics de l'institut" />
        </div>
        <button type="submit" className="secondary" disabled={name.trim().length < 2}>
          Crear grup
        </button>
      </form>
    </main>
  );
}