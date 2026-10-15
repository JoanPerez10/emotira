import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import Game from "./components/Game";
import InverseGame from "./components/InverseGame";
import TimeTrial, { TimeTrialRules } from "./components/TimeTrial";
import ProposeForm from "./components/ProposeForm";
import { puzzles, type Puzzle } from "./data/puzzles";
import { musicPuzzles } from "./data/musicPuzzles";
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
import { MODES as ALL_MODES, MODE_TITLES as TITLES, MODE_ICONS, MODE_IMAGES, scoreOf, starsFor, MENU_MODES } from "./modes";
import { firstGrapheme } from "./utils/graphemes";
import Icon from "./components/Icon";
import type { IconName } from "./components/Icon";

// El mapa de municipis pesa ~125 KB: només es descarrega en obrir la Col·lecció
const Collection = lazy(() => import("./components/Collection"));

type Screen =
  | "menu"
  | "modes"
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

/** Les entrades que no són modes. `sub` és el text que surt a la targeta: una
 *  paraula sola deixava la caixa buida, i el títol + frase és el que fa que
 *  la targeta sembli proucosa. `tone` només pintar la icona: la targeta es
 *  queda blanca i el color, concentrat, és el que fa de senyal.
 *
 *  Els rècords hi són perquè són dades teves i hi arribes sense compte: dins
 *  del perfil quedaven enterrats sota el formulari de registre, i com a
 *  convidat eren pràcticament inaccessibles. */
const MENU_LINKS: {
  icon: IconName;
  label: string;
  sub: string;
  screen: Screen;
  tone: "blue" | "gold" | "green" | "coral";
  wide?: boolean;
}[] = [
  { icon: "map", label: "Col·lecció", sub: "Pobles trobats", screen: "collection", tone: "blue" },
  { icon: "crown", label: "Rànquing", sub: "Qui encerta més", screen: "ranking", tone: "gold" },
  { icon: "users", label: "Grups", sub: "Juga amb amics", screen: "groups", tone: "green" },
  { icon: "ballot", label: "Propostes", sub: "Vota i proposa", screen: "vote", tone: "coral" },
  {
    icon: "chart",
    label: "Els teus rècords",
    sub: "Millor resultat de cada mode",
    screen: "records",
    tone: "blue",
    wide: true,
  },
];

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
    api.fetchAcceptedPuzzles().then(setExtra).catch(() => { });
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
            if (val > 0) api.scores.submit(m, val).catch(() => { });
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
        : m === "music"
          ? shuffle(musicPuzzles).slice(0, 10)
          : m === "ten" || m === "hard" || m === "inverse"
            ? shuffle(pool).slice(0, 10)
            : shuffle(pool)
    );
    setScreen("play");
  };

  // Es desa en el moment d'encertar (no al final de la partida), així no es perd
  // res si el jugador surt al menú a mig joc.
  const onSolve = (answer: string) => {
    if (mode === "music") return;
    const next = unlockTown(records, answer);
    if (next === records) return;
    setRecords(next);
    saveRecords(next);
    if (session) {
      api.records.save(next).catch(() => { });
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
      api.records.save(next).catch(() => { });
      api.scores.submit(mode, scoreOf(next, mode)).catch(() => { });
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
        pool={mode === "music" ? musicPuzzles : pool}
        endless={mode === "infinite"}
        hard={mode === "hard"}
        onFinish={finish}
        onSolve={mode === "music" ? undefined : onSolve}
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
    return (
      <VoteScreen onExit={() => setScreen("menu")} onPropose={() => setScreen("propose")} />
    );
  }

  if (screen === "account") {
    return (
      <AccountScreen
        session={session}
        records={records}
        onExit={() => setScreen("menu")}
        onGoToRanking={() => setScreen("ranking")}
        onGoToGroups={() => setScreen("groups")}
        onGoToRecords={() => setScreen("records")}
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
  if (screen === "modes") {
    /* Tots els modes i, a sota, la resta d'entrades. Aquí sí que es pot
       fer scroll: el menú principal es queda curt i aquesta pantalla
       creix sol quan hi ha modes nous. */
    return (
      <main className="app">
        <div className="topbar">
          <button className="back" onClick={() => setScreen("menu")}>← Menú</button>
          <strong className="topbar-title">
            <Icon name="grid" size={20} /> Tots els modes
          </strong>
        </div>
        <div className="grid">
          {MENU_MODES.map(({ mode: m, icon, title, sub, variant, src }) => (
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
        </div>
      </main>
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
    const { daily, ten, hard, infinite, timeTrial, inverse, music } = records;
    return (
      <main className="app">
        <div className="topbar">
          <button className="back" onClick={() => setScreen("menu")}>← Menú</button>
          <strong>Rècords</strong>
        </div>
        <p>Els teus millors resultats. Es guarden en aquest dispositiu i, si
          tens compte, també al núvol.</p>
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
        <section className="stats">
          <h3><Icon name="music" size={18} /> Música</h3>
          <p>Millor puntuació: <b>{music.best} / 30</b></p>
          <p>Partides: <b>{music.played}</b></p>
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
    <main className="app menu">
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
          {/* Les tres xapes són botons i, per tant, tenen la mateixa peça i la
              mateixa vora de baix que la resta. Abans les dues primeres
              eren text i això es llegia com si estiguessin trencades:
              la ratxa obre el repte del dia i els pobles, la col·lecció. */}
          <div className="hero-stats">
            <button
              type="button"
              className="hero-stat"
              onClick={() => start("daily")}
              title="Jugar el repte d'avui"
            >
              <span className="hero-stat-icon v-gold"><Icon name="flame" size={18} /></span>
              <b>{streak}</b>
              <span>{streak === 1 ? "dia" : "dies"}</span>
            </button>
            <button
              type="button"
              className="hero-stat"
              onClick={() => setScreen("collection")}
              title="Obre la col·lecció de pobles"
            >
              <span className="hero-stat-icon v-orange"><Icon name="map" size={18} /></span>
              <b>{found}</b>
              <span>{found === 1 ? "poble" : "pobles"}</span>
            </button>
            <button
              type="button"
              className="hero-stat"
              onClick={() => setScreen("account")}
              title="Gestiona el teu compte"
            >
              <span className="hero-stat-icon v-blue"><Icon name="user" size={18} /></span>
              <b>{session ? session.username : "Convidat"}</b>
              <span>{session ? "el teu compte" : "entra o crea"}</span>
            </button>
          </div>
          {syncing && <p className="help">Sincronitzant els teus rècords…</p>}
        </div>
      </header>

      <nav className="menu" aria-label="Menú principal">
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
                .map((p) => firstGrapheme(p.emojis))
                .join("")}
            </p>
            <span className="daily-cta">Jugar ara</span>
          </button>
        )}

        {/* ── El banner dels modes ──
            Targeta gran del menú, germana de la del repte diari: capçalera
            amb icona i fila inferior amb els modes que hi ha al darrere. */}
        <button className="modes-banner" onClick={() => setScreen("modes")}>
          <span className="modes-head">
            <span className="modes-icon"><Icon name="grid" size={22} /></span>
            <span className="modes-title">Tots els modes</span>
            <Icon name="chevron" size={20} className="modes-chevron" />
          </span>
          <span className="modes-preview" aria-hidden="true">
            {MENU_MODES.slice(0, 4).map(({ mode, src }) =>
              src ? <img key={mode} src={src} alt="" width={1254} height={1254} draggable={false} /> : null
            )}
            <span className="modes-more">+{MENU_MODES.length - 4}</span>
          </span>
        </button>
      {/* ── Descobreix i comunitat ──
          Dins del mateix contenidor que les targetes: un sol `gap`
          governa tots els blocs i el ritme no es pot desincronitzar. */}
      <h2 className="menu-h">
        <Icon name="compass" size={13} /> Descobreix i comunitat
      </h2>
      <ul className="link-grid">
        {MENU_LINKS.map((item) => (
          <li key={item.label}>
<button
              className={`link-tile t-${item.tone}${item.wide ? " is-wide" : ""}`}
              onClick={() => setScreen(item.screen)}
            >
              <span className="link-icon"><Icon name={item.icon} size={22} /></span>
              <span className="link-tile-body">
                <span className="link-tile-label">{item.label}</span>
                <span className="link-tile-sub">{item.sub}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      </nav>
    </main>
  );
}
