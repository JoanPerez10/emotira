import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import Game from "./components/Game";
import InverseGame from "./components/InverseGame";
import TimeTrial, { TimeTrialRules } from "./components/TimeTrial";
import ProposeForm from "./components/ProposeForm";
import { puzzles, type Puzzle } from "./data/puzzles";
import type { GameResult, Mode, Records } from "./types";
import { dailyPuzzles, todayKey } from "./utils/daily";
import { shuffle } from "./utils/random";
import { TRIAL_WIN_AT } from "./utils/timeTrial";
import {
  currentStreak,
  emptyRecords,
  loadRecords,
  recordResult,
  saveRecords,
  unlockTown,
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
import { MODES as ALL_MODES, MODE_TITLES as TITLES, MODE_ICONS, MODE_IMAGES, scoreOf } from "./modes";
import Icon, { type IconName } from "./components/Icon";

// El mapa de municipis pesa ~125 KB: només es descarrega en obrir la Col·lecció
const Collection = lazy(() => import("./components/Collection"));

type Screen =
  | "menu"
  | "trialRules"
  | "records"
  | "play"
  | "result"
  | "propose"
  | "vote"
  | "admin"
  | "collection"
  | "account"
  | "ranking"
  | "groups";

interface ModeMeta {
  mode: Mode;
  icon: IconName;
  title: string;
  sub: string;
  /** Paleta de la targeta: fons suau, icona i vora en to de marca. */
  variant: "blue" | "orange" | "coral" | "purple";
  src?: string;
}

const MODES: ModeMeta[] = [
  { mode: "inverse", icon: "reverse", title: "Invers", sub: "Del poble als emojis", variant: "blue", src: "/assets/invers-guineu.png" },
  { mode: "timeTrial", icon: "timer", title: "Contrarellotge", sub: "2 minuts i bonus de temps", variant: "orange", src: "/assets/contrarellotge-guineu.png" },
  { mode: "ten", icon: "target", title: "Endivina 10", sub: "10 pobles d'una tirada", variant: "blue", src: "/assets/endivina-deu-guineu.png" },
  { mode: "hard", icon: "flame", title: "Mode difícil", sub: "Sense pistes i 3 intents", variant: "coral", src: "/assets/dificil-guineu.png" },
  { mode: "infinite", icon: "infinity", title: "Mode infinit", sub: "Fins que et cansis", variant: "purple", src: "/assets/infinit-guineu.png" },
];

/** Converteix una puntuació en estrelles (0-3), com a Duolingo. */
const starsFor = (score: number, max: number) => {
  const pct = max > 0 ? score / max : 0;
  return pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : pct >= 0.3 ? 1 : 0;
};

/**
 * Primer emoji d'una pista, sencer. Cal segmentar per grafemes: hi ha
 * seqüències ZWJ (👩‍🦰, 🏊‍♀️) que `slice(0, 1` partiria per la meitat.
 */
const firstEmoji = (s: string) => {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const it = seg.segment(s)[Symbol.iterator]().next();
    return it.done ? "" : it.value.segment;
  }
  return Array.from(s)[0] ?? "";
};

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
      if (alive) {
        setSession(s);
        if (!s) setRecords(loadRecords());
      }
    });
    return () => {
      alive = false;
      off();
    };
  }, []);

  // Rècords: de la BD si hi ha sessió; del navegador si som convidats
  const userId = session?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      setSyncing(true);
      try {
        const cloud = await api.records.load();
        if (!alive) return;
        if (cloud) {
          const norm = normalizeRecords(cloud);
          setRecords(norm);
          saveRecords(norm);
          for (const m of ALL_MODES) {
            const val = scoreOf(norm, m);
            if (val > 0) api.scores.submit(m, val).catch(() => {});
          }
        } else {
          // Primera vegada: pugem els rècords que ja tenies com a convidat
          const local = loadRecords();
          setRecords(local);
          await api.records.save(local);
          for (const m of ALL_MODES) {
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

  const start = (m: Mode, ready = false) => {
    if (syncing) return;

    setMode(m);
    if (m === "timeTrial" && !ready) {
      setScreen("trialRules");
      return;
    }
    setDeck(
      m === "daily"
        ? dailyPuzzles()
        : m === "ten" || m === "hard" || m === "inverse"
        ? shuffle(pool).slice(0, 10)
        : shuffle(pool)
    );
    setScreen("play");
  };

  // Es desa en el moment d'encertar (no al final de la partida), així no es perd
  // res si el jugador surt al menú a mig joc.
  const onSolve = (answer: string) => {
    const next = unlockTown(records, answer);
    if (next === records) return;
    setRecords(next);
    saveRecords(next);
    if (session) {
      api.records.save(next).catch(() => {});
    }
  };

  const finish = (res: GameResult) => {
    // Inclou també l'últim encert si el temps s'esgota abans del render següent.
    const completed = mode === "timeTrial" || mode === "inverse"
      ? res.results.reduce((saved, r) => r.status === "correct" && r.answer ? unlockTown(saved, r.answer) : saved, records)
      : records;
    const { records: next, isBest } = recordResult(completed, mode, res);
    setRecords(next);
    saveRecords(next);
    if (session) {
      api.records.save(next).catch(() => {});
      api.scores.submit(mode, scoreOf(next, mode)).catch(() => {});
    }
    setResult(res);
    setIsBest(isBest);
    setCopied(false);
    setScreen("result");
  };

  const share = async () => {
    const h = records.daily.history[todayKey()];
    if (!h) return;
    const text = `🧩 Emotira ${todayKey()}\n${h.score}/${h.max}\n${h.results}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* clipboard no disponible */
    }
  };

  const resetRecords = () => {
    if (!confirm("Vols esborrar tots els rècords i la col·lecció de pobles descoberts?")) return;
    const e = emptyRecords();
    setRecords(e);
    saveRecords(e);
  };

  if (screen === "play") {
    if (mode === "inverse") return <InverseGame deck={deck} pool={pool} onFinish={finish} onSolve={onSolve} onExit={() => setScreen("menu")} />;
    if (mode === "timeTrial") return <TimeTrial deck={deck} pool={pool} onFinish={finish} onSolve={onSolve} onExit={() => setScreen("menu")} />;
    return (
      <Game
        key={`${mode}-${deck.length}-${deck[0]?.answer}`}
        title={TITLES[mode]}
        icon={MODE_ICONS[mode]}
        deck={deck}
        pool={pool}
        endless={mode === "infinite"}
        hard={mode === "hard"}
        onFinish={finish}
        onSolve={onSolve}
        onExit={() => setScreen("menu")}
      />
    );
  }

  if (screen === "trialRules") {
    return <TimeTrialRules onPlay={() => start("timeTrial", true)} onExit={() => setScreen("menu")} />;
  }

  if (screen === "result" && result) {
    const solved = result.results.filter((r) => r.status === "correct").length;
    const stars = starsFor(result.score, result.max);
    const isDaily = mode === "daily";
    const isTrial = mode === "timeTrial";
    const skipped = result.results.filter((r) => r.reason === "skipped").length;
    const failed = result.results.filter((r) => r.reason === "failed").length;
    // La guineu reactiona: emoció. Les estrelles: precisió. Abans hi havia també
    // la medalla 🏆/🥈/🥉, que duplicava la mateixa informació que les estrelles.
    const won = isTrial ? solved >= TRIAL_WIN_AT : stars >= 2;
    // Al contrarellotge el compte és de pobles (encert / saltat / fallat); a la
    // resta, de punts. Un mateix lloc, dos recomptes. Les estrelles no hi
    // surten: ja es veuen a sobre i seria repetir la mateixa dada.
    const stats = isTrial
      ? [
          { value: solved, label: "encerts" },
          { value: skipped, label: "saltats" },
          { value: failed, label: "fallats" },
        ]
      : [
          { value: `${result.score}/${result.max}`, label: "punts" },
          { value: `${solved}/${result.results.length}`, label: "pobles" },
        ];
    return (
      <main className={`app result${won ? " is-win" : " is-lose"}`}>
        <div className="score-card">
          <div className="result-scene" aria-hidden="true" />
          <img
            className="result-fox"
            src={won ? "/assets/win.png" : "/assets/lose.png"}
            alt=""
            width={344}
            height={344}
            draggable={false}
          />
          <h1>{won ? "Enhorabona!" : "Podem fer-ho millor"}</h1>
          <p className="result-mode">
            <img src={MODE_IMAGES[mode]} alt="" width={1254} height={1254} draggable={false} />
            {TITLES[mode]}
          </p>

          {!isTrial && (
            <p className="stars" role="img" aria-label={`${stars} de 3 estrelles`}>
              {["⭐", "⭐", "⭐"].map((s, i) => (
                <span key={i} style={{ opacity: i < stars ? 1 : 0.25 }} aria-hidden="true">{s}</span>
              ))}
            </p>
          )}

          <ul className="result-stats">
            {stats.map((s) => (
              <li key={s.label}>
                <b>{s.value}</b>
                <span>{s.label}</span>
              </li>
            ))}
          </ul>

          {isTrial && <p className="result-note">Temps esgotat!</p>}
          {isBest && (
            <p className="best">
              <Icon name="trophy" size={18} /> Millor marca personal!
            </p>
          )}
        </div>

        {isDaily && todayResult && (
          <>
            <p className="emojis small">{todayResult.results}</p>
            <div className="actions">
              <button onClick={share}>
                <Icon name={copied ? "check" : "share"} size={18} />
                {copied ? "Copiat" : "Compartir el resultat"}
              </button>
            </div>
            <p className="streak">Ratxa: {currentStreak(records)} dies</p>
          </>
        )}

        <div className="actions">
          {!isDaily && <button onClick={() => start(mode)}>Tornar a jugar</button>}
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
    return (
      <AccountScreen
        session={session}
        records={records}
        onExit={() => setScreen("menu")}
        onGoToRanking={() => setScreen("ranking")}
        onGoToGroups={() => setScreen("groups")}
      />
    );
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
  if (screen === "collection") {
    return (
      <Suspense fallback={<main className="app"><p className="progress">Carregant el mapa…</p></main>}>
        <Collection
          pool={pool}
          unlocked={records.unlockedTowns}
          onExit={() => setScreen("menu")}
        />
      </Suspense>

    );
  }
  if (screen === "records") {
    const { daily, ten, hard, infinite, timeTrial, inverse } = records;
    return (
      <main className="app">
        <div className="topbar">
          <button className="back" onClick={() => setScreen("menu")}>← Menú</button>
          <strong>Rècords</strong>
        </div>
        <section className="stats">
          <h3><Icon name="calendar" size={18} /> Repte diari</h3>
          <p>Ratxa actual: <b>{currentStreak(records)}</b> dies</p>
          <p>Millor ratxa: <b>{daily.bestStreak}</b> dies</p>
          <p>Reptes jugats: <b>{daily.played}</b></p>
        </section>
        <section className="stats">
          <h3><Icon name="target" size={18} /> Endivina 10</h3>
          <p>Millor puntuació: <b>{ten.best} / 30</b></p>
          <p>Partides: <b>{ten.played}</b></p>
        </section>
        <section className="stats">
          <h3><Icon name="flame" size={18} /> Mode difícil</h3>
          <p>Millor puntuació: <b>{hard.best} / 30</b></p>
          <p>Partides: <b>{hard.played}</b></p>
        </section>
        <section className="stats">
          <h3><Icon name="infinity" size={18} /> Mode infinit</h3>
          <p>Millor ratxa d'encerts: <b>{infinite.bestStreak}</b></p>
          <p>Més encerts en una partida: <b>{infinite.bestSolved}</b></p>
          <p>Partides: <b>{infinite.played}</b></p>
        </section>
        <section className="stats">
          <h3><Icon name="timer" size={18} /> Contrarellotge</h3>
          <p>Més pobles encertats: <b>{timeTrial.best}</b></p>
          <p>Partides: <b>{timeTrial.played}</b></p>
        </section>
        <section className="stats">
          <h3><Icon name="reverse" size={18} /> Invers</h3>
          <p>Millor puntuació: <b>{inverse.best} / 30</b></p>
          <p>Partides: <b>{inverse.played}</b></p>
        </section>
        {/* El retorn al menú ja hi és a la barra superior: aquí només
            l'acció destructiva, que no es pot posar al costat de l'ull. */}
        <div className="actions">
          {!session && (
            <button className="danger-text" onClick={resetRecords}>Esborrar tots els rècords</button>
          )}
        </div>
      </main>
    );
  }

  const streak = currentStreak(records);
  const found = records.unlockedTowns.length;

  return (
    <main className="app">
      <header className="hero">
        <img
          className="hero-fox"
          src="/assets/main_menu_guini.png"
          alt=""
          width={217}
          height={315}
          draggable={false}
        />
        <div className="hero-copy">
          <h1>Emotira</h1>
          <p>Endevina què és amb només emojis</p>
          <div className="chips">
            <span className="chip chip-fire">Ratxa: {streak} {streak === 1 ? "dia" : "dies"}</span>
            <span className="chip chip-map">{found} {found === 1 ? "poble" : "pobles"} trobats</span>
            <button
              type="button"
              className="chip chip-user"
              onClick={() => setScreen("account")}
              title="Gestiona el teu compte"
            >
              {session ? `👤 ${session.username}` : "👤 Convidat"}
            </button>
          </div>
          {syncing && <p className="help">Sincronitzant els teus rècords…</p>}
        </div>
      </header>

      <nav className="menu" aria-label="Modes de joc">
        {/* ── Repte diari: la portada, sempre la mateixa cada dia ── */}
        {todayResult ? (
          <div className="daily-card is-done">
            <div className="daily-head">
              <span className="daily-title">Avui ja has jugat</span>
              <span className="daily-score">
                {todayResult.score}/{todayResult.max}
              </span>
            </div>
            <p className="daily-squares">{todayResult.results}</p>
            <button type="button" className="share-btn" onClick={share}>
              <span className={"mode-icon mode-icon-image"}>
                <img src="/assets/repte-diari-guineu.png" alt="" width={1254} height={1254} draggable={false} />
              </span>
              {copied ? "Copiat" : "Compartir resultat"}
            </button>
          </div>
        ) : (
          <button className="daily-card" onClick={() => start("daily")}>
            <div className="daily-head">
              <span className={"mode-icon mode-icon-image daily-icon"}>
                <img src="/assets/repte-diari-guineu.png" alt="" width={1254} height={1254} draggable={false} />
              </span>
              <span className="daily-title">Repte diari</span>
              <span className="daily-badge">Avui</span>
            </div>
            <p className="daily-squares">
              {dailyPuzzles()
                .slice(0, 5)
                .map((p) => firstEmoji(p.emojis))
                .join("")}
            </p>
            <span className="daily-cta">Jugar ara</span>
          </button>
        )}

        {/* ── La resta, en graella de dues columnes ── */}
        <div className="grid">
          {MODES.map(({ mode: m, icon, title, sub, variant, src }) => (
            <button key={m} className={`mode-card v-${variant}`} onClick={() => start(m)}>
              <span className={`mode-icon${src ? " mode-icon-image" : ""}`}>
                {src
                  ? <img src={src} alt="" width={1254} height={1254} draggable={false} />
                  : <Icon name={icon} size={21} />}
              </span>
              <span className="mode-title">{title}</span>
              <span className="mode-sub">{sub}</span>
            </button>
          ))}
          <button className="mode-card v-blue" onClick={() => setScreen("collection")}>
            <span className={"mode-icon mode-icon-image"}>
                <img src="/assets/colleccio-guineu.png" alt="" width={1254} height={1254} draggable={false} />
              </span>
            <span className="mode-title">Col·lecció</span>
            <span className="mode-sub">El mapa de pobles</span>
          </button>
        </div>
      </nav>

      <div className="menu-links">
        <button className="ghost" onClick={() => setScreen("ranking")}>Rànquing</button>
        <button className="ghost" onClick={() => setScreen("groups")}>Grups</button>
        <button className="ghost" onClick={() => setScreen("records")}>Els teus rècords</button>
        <button className="ghost" onClick={() => setScreen("account")}>
          {session ? "El meu compte" : "Entrar / Crear compte"}
        </button>
        <button className="ghost" onClick={() => setScreen("propose")}>Proposa un poble</button>
        <button className="ghost" onClick={() => setScreen("vote")}>Vota propostes</button>
      </div>
    </main>
  );
}
