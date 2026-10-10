import { useEffect, useMemo, useState } from "react";
import Game from "./components/Game";
import ProposeForm from "./components/ProposeForm";
import { puzzles, type Puzzle } from "./data/puzzles";
import type { GameResult, Mode, Records } from "./types";
import { dailyPuzzles, todayKey } from "./utils/daily";
import { shuffle } from "./utils/random";
import {
  currentStreak,
  emptyRecords,
  loadRecords,
  recordResult,
  saveRecords,
  normalizeRecords,
} from "./utils/storage";
import "./App.css";
import { api } from "./api";
import AdminPanel from "./components/AdminPanel";
import VoteScreen from "./components/VoteScreen";
import AccountScreen from "./components/AccountScreen";
import GroupsScreen from "./components/GroupsScreen";
import RankingScreen from "./components/RankingScreen";
import type { Session } from "./api/types";
import { MODES, MODE_TITLES as TITLES, scoreOf } from "./modes";

type Screen = "menu" | "records" | "play" | "result" | "propose" | "vote" | "admin" | "account" | "ranking" | "groups";

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [records, setRecords] = useState<Records>(loadRecords);
  const [mode, setMode] = useState<Mode>("ten");
  const [deck, setDeck] = useState<Puzzle[]>([]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [isBest, setIsBest] = useState(false);
  const [copied, setCopied] = useState(false);
  const [extra, setExtra] = useState<Puzzle[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    api.fetchAcceptedPuzzles().then(setExtra).catch(() => {});
  }, []);
  const pool = useMemo(() => [...puzzles, ...extra], [extra]);

  // El panell d'admin s'obre amb /#admin
  useEffect(() => {
    const check = () => {
      if (window.location.hash === "#admin") setScreen("admin");
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);

  // Sessió
  useEffect(() => {
    if (!api.enabled) return;
    let alive = true;
    api.auth.getSession().then((s) => {
      if (alive) setSession(s);
    });
    const off = api.auth.onChange((s) => {
      if (alive) setSession(s);
    });
    return () => {
      alive = false;
      off();
    };
  }, []);

  // Rècords: de la BD si hi ha sessió; del navegador si som convidats
  const userId = session?.id ?? null;
  useEffect(() => {
    if (!userId) {
      setRecords(loadRecords());
      return;
    }
    let alive = true;
    setSyncing(true);
    (async () => {
      try {
        const cloud = await api.records.load();
        if (!alive) return;
        if (cloud) {
          setRecords(normalizeRecords(cloud));
        } else {
          // Primera vegada: pugem els rècords que ja tenies com a convidat
          const local = loadRecords();
          setRecords(local);
          await api.records.save(local);
          for (const m of MODES) {
            if (scoreOf(local, m) > 0) await api.scores.submit(m, scoreOf(local, m));
          }
        }
      } catch {
        /* ens quedem amb el que hi ha */
      } finally {
        if (alive) setSyncing(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  const todayResult = records.daily.history[todayKey()];

  const start = (m: Mode) => {
    if (syncing) return;
    setMode(m);
    setDeck(
      m === "daily"
        ? dailyPuzzles()
        : m === "ten" || m === "hard"
        ? shuffle(pool).slice(0, 10)
        : shuffle(pool)
    );
    setScreen("play");
  };

  const finish = (res: GameResult) => {
    const { records: next, isBest } = recordResult(records, mode, res);
    setRecords(next);
    if (session) {
      api.records.save(next).catch(() => {});
      api.scores.submit(mode, scoreOf(next, mode)).catch(() => {});
    } else {
      saveRecords(next);
    }
    setResult(res);
    setIsBest(isBest);
    setCopied(false);
    setScreen("result");
  };

  const share = async () => {
    const h = records.daily.history[todayKey()];
    if (!h) return;
    const text = `🏘️ Pobles Emoji ${todayKey()}\n${h.score}/${h.max}\n${h.results}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* clipboard no disponible */
    }
  };

  const resetRecords = () => {
    if (!confirm("Vols esborrar tots els rècords?")) return;
    const e = emptyRecords();
    setRecords(e);
    saveRecords(e);
  };

  if (screen === "play") {
    return (
      <Game
        key={`${mode}-${deck.length}-${deck[0]?.answer}`}
        title={TITLES[mode]}
        deck={deck}
        pool={pool}
        endless={mode === "infinite"}
        hard={mode === "hard"}
        onFinish={finish}
        onExit={() => setScreen("menu")}
      />
    );
  }

  if (screen === "result" && result) {
    const solved = result.results.filter((r) => r.status === "correct").length;
    return (
      <main className="app">
        <h1>🏁 {TITLES[mode]}</h1>
        <p className="big">
          {result.score} / {result.max} punts
        </p>
        <p>
          {solved} de {result.results.length} encertats
        </p>
        {isBest && <p className="best">🏆 Nou rècord!</p>}
        {mode === "daily" && todayResult && (
          <>
            <p className="emojis small">{todayResult.results}</p>
            <button onClick={share}>{copied ? "Copiat! ✅" : "Compartir"}</button>
            <p className="streak">🔥 Ratxa: {currentStreak(records)} dies</p>
          </>
        )}
        <div className="actions">
          {mode !== "daily" && <button onClick={() => start(mode)}>Tornar a jugar</button>}
          <button className="secondary" onClick={() => setScreen("menu")}>Menú</button>
        </div>
      </main>
    );
  }

  if (screen === "propose") {
    return <ProposeForm onExit={() => setScreen("menu")} />;
  }
  if (screen === "admin") {
    return (
      <AdminPanel
        onExit={() => {
          window.history.replaceState(null, "", window.location.pathname);
          setScreen("menu");
        }}
      />
    );
  }

  if (screen === "vote") {
    return <VoteScreen onExit={() => setScreen("menu")} />;
  }
  if (screen === "account") {
    return <AccountScreen session={session} onExit={() => setScreen("menu")} />;
  }
  if (screen === "ranking") {
    return (
      <RankingScreen session={session} onExit={() => setScreen("menu")} onLogin={() => setScreen("account")} />
    );
  }
  if (screen === "groups") {
    return (
      <GroupsScreen session={session} onExit={() => setScreen("menu")} onLogin={() => setScreen("account")} />
    );
  }
  if (screen === "records") {
    const { daily, ten, hard, infinite } = records;
    return (
      <main className="app">
        <h1>🏆 Rècords</h1>
        <section className="stats">
          <h3>📅 Repte diari</h3>
          <p>Ratxa actual: <b>{currentStreak(records)}</b></p>
          <p>Millor ratxa: <b>{daily.bestStreak}</b></p>
          <p>Jugats: <b>{daily.played}</b></p>
        </section>
        <section className="stats">
          <h3>🔟 Endivina 10</h3>
          <p>Millor puntuació: <b>{ten.best} / 30</b></p>
          <p>Partides: <b>{ten.played}</b></p>
        </section>
        <section className="stats">
          <h3>🔥 Mode difícil</h3>
          <p>Millor puntuació: <b>{hard.best} / 30</b></p>
          <p>Partides: <b>{hard.played}</b></p>
        </section>
        <section className="stats">
          <h3>♾️ Mode infinit</h3>
          <p>Millor ratxa d'encerts: <b>{infinite.bestStreak}</b></p>
          <p>Més encerts en una partida: <b>{infinite.bestSolved}</b></p>
          <p>Partides: <b>{infinite.played}</b></p>
        </section>
        <div className="actions">
          <button className="secondary" onClick={() => setScreen("menu")}>← Menú</button>
          {!session && <button className="ghost" onClick={resetRecords}>Esborrar</button>}
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <h1>🏘️ Pobles Emoji</h1>
      <p>Endevina el poble o ciutat de Catalunya!</p>
      <p className="streak">{session ? `👤 ${session.username}` : "👤 Jugant com a convidat"} · 🔥 Ratxa diària: {currentStreak(records)}</p>
      {syncing && <p className="help">Sincronitzant els teus rècords…</p>}

      <div className="menu">
        {todayResult ? (
          <div className="done">
            ✅ Repte diari fet: {todayResult.score}/{todayResult.max}{" "}
            {todayResult.results}
            <button className="ghost" onClick={share}>{copied ? "Copiat!" : "Compartir"}</button>
          </div>
        ) : (
          <button onClick={() => start("daily")}>📅 Repte diari (5 pobles)</button>
        )}
        <button onClick={() => start("ten")}>🔟 Endivina 10</button>
        <button onClick={() => start("hard")}>🔥 Mode difícil (sense pistes)</button>
        <button onClick={() => start("infinite")}>♾️ Mode infinit</button>
        <button className="secondary" onClick={() => setScreen("ranking")}>🏅 Rànquing</button>
        <button className="secondary" onClick={() => setScreen("groups")}>👥 Grups</button>
        <button className="secondary" onClick={() => setScreen("account")}>
          {session ? "👤 El meu compte" : "👤 Entrar / Crear compte"}
        </button>
        <button className="secondary" onClick={() => setScreen("records")}>🏆 Rècords</button>
        <button className="secondary" onClick={() => setScreen("propose")}>💡 Proposa un poble</button>
        <button className="secondary" onClick={() => setScreen("vote")}>🗳️ Vota propostes</button>
      </div>
    </main>
  );
}