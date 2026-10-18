import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import "./App.css";
import { api } from "./api";
import type { Session } from "./api/types";
import AccountScreen from "./components/AccountScreen";
import AdminPanel from "./components/AdminPanel";
import Game from "./components/Game";
import GroupsScreen from "./components/GroupsScreen";
import GuineuIcon, { type GuineuName } from "./components/GuineuIcon";
import type { IconName } from "./components/Icon";
import Icon from "./components/Icon";
import InverseGame from "./components/InverseGame";
import ProposeForm from "./components/ProposeForm";
import RankingScreen from "./components/RankingScreen";
import ResultTiles, { DailyTiles } from "./components/ResultTiles";
import TimeTrial, { TimeTrialRules } from "./components/TimeTrial";
import VoteScreen from "./components/VoteScreen";
import { musicPuzzles } from "./data/musicPuzzles";
import { puzzles, type Puzzle } from "./data/puzzles";
import { MODES as ALL_MODES, MENU_MODES, MODE_IMAGES, scoreOf, starsFor, MODE_TITLES as TITLES } from "./modes";
import type { GameResult, Mode, Records } from "./types";
import { dailyPuzzles, todayKey } from "./utils/daily";
import { firstGrapheme } from "./utils/graphemes";
import { shuffle } from "./utils/random";
import {
  currentStreak,
  emptyRecords,
  loadRecords,
  normalizeRecords,
  recordResult,
  saveRecords,
  unlockTown,
} from "./utils/storage";
import { TRIAL_WIN_AT } from "./utils/timeTrial";

// El mapa de municipis pesa ~125 KB: només es descarrega en obrir la Col·lecció
const Collection = lazy(() => import("./components/Collection"));

/** «1 poble» o «5 pobles». El plural no és un detall: un text que digui
 *  «1 pobles» fa que tota la frase sembli errònia. */
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

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
 *  la targeta sembli proucosa.
 *
 *  Cada entrada porta un sol dibuix: `art` per als dibuixos de la guineu
 *  (imatge) i `icon` per a les icones SVG de traç. `tone` només pintar la
 *  icona SVG: la targeta es queda blanca i, quan el dibuix és de la guineu,
 *  el color ja l'porta ell mateix.
 *
 *  Els rècords NO hi són: són dades del compte i viuen al perfil
 *  (AccountScreen), que només es veu un cop identificat. Aquí només hi ha
 *  allò que té sentit sense compte. */
type MenuLink = {
  label: string;
  sub: string;
  screen: Screen;
  tone: "blue" | "gold" | "green" | "coral";
} & ({ art: GuineuName; icon?: never } | { icon: IconName; art?: never });

const MENU_LINKS: MenuLink[] = [
  { icon: "map", label: "Col·lecció", sub: "Pobles trobats", screen: "collection", tone: "blue" },
  { art: "ranking", label: "Rànquing", sub: "Qui encerta més", screen: "ranking", tone: "gold" },
  { art: "group", label: "Grups", sub: "Juga amb amics", screen: "groups", tone: "green" },
  { art: "vote", label: "Propostes", sub: "Vota i proposa", screen: "vote", tone: "coral" },
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
        iconSrc={MODE_IMAGES[mode]}
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
    const total = result.results.length;
    // El mode de música juga amb grups, no amb pobles: el comptador parla del que
    // s'ha jugat, i barrejar els dos noms fa que el text no vulgui dir res.
    const noun = mode === "music" ? "grup" : "poble";
    // La guineu reactiona: emoció. Les estrelles: precisió. Abans hi havia també
    // la medalla 🏆/🥈/🥉, que duplicava la mateixa informació que les estrelles.
    const won = isTrial ? solved >= TRIAL_WIN_AT : stars >= 2;
    // La ratxa només existeix al repte diari. A la resta de modes no hi ha res
    // a què mirar-hi, i un text sobre la ratxa en un mode que no en té seria
    // una xifra inventada: per això la targeta no hi surt.
    const streak = currentStreak(records);
    const streakCopy =
      streak === 0
        ? { title: "Encara no tens ratxa", sub: "Juga el repte diari per començar-ne una" }
        : streak === 1
          ? { title: "Ratxa d'1 dia", sub: "Demà pots fer créixer la ratxa!" }
          : { title: `Ratxa de ${streak} dies`, sub: "Juga el repte diari demà per no perdre-la" };
    // El repart es llegeix d'una sola línia sota els quadrats: al contrarellotge
    // el compte és de pobles i no hi ha un total fix de punts, a la resta el que
    // importa és la puntuació.
    const summary = isTrial
      ? `${plural(total, noun, `${noun}s`)} · ${plural(solved, "encert", "encerts")}`
      : `${solved}/${plural(total, noun, `${noun}s`)} · ${result.score}/${result.max} punts`;
    // Compartir només té sentit al repte diari: el que es copia és el resultat
    // d'avui. Sense resultat desat, el botó és «Tornar a jugar».
    const canShare = isDaily && !!todayResult;
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

          {isTrial && <p className="result-note">Temps esgotat!</p>}
          {isBest && (
            <p className="best">
              <Icon name="trophy" size={18} /> Millor marca personal!
            </p>
          )}
        </div>

        {/* Un quadrat per poble i, a sota, què val la partida. Els quadrats
            són el que eren els 🟩🟨🟥 del text compartit, amb els mateixos
            colors però dibuixats per nosaltres i no per la font d'emoji de
            l'aparell. */}
        <section className="result-strip">
          <ResultTiles results={result.results} noun={noun} />
          <p className="result-summary">{summary}</p>
        </section>

        {isDaily && (
          <button type="button" className="streak-card" onClick={() => setScreen("records")}>
            <span className="streak-badge"><Icon name="flame" size={20} /></span>
            <span className="streak-copy">
              <strong>{streakCopy.title}</strong>
              <span>{streakCopy.sub}</span>
            </span>
            <Icon name="chevron" size={18} className="streak-chevron" />
          </button>
        )}

        <div className="actions actions-stack">
          {canShare ? (
            <button onClick={share}>
              {copied ? (
                <>
                  <GuineuIcon name="check" size={20} /> Copiat
                </>
              ) : (
                <>
                  <Icon name="share" size={18} /> Compartir resultat
                </>
              )}
            </button>
          ) : (
            <button onClick={() => start(mode)}>Tornar a jugar</button>
          )}
          <button className="outline" onClick={() => setScreen("menu")}>Tornar al menú</button>
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
        onResetRecords={resetRecords}
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
          {/* La ratxa i els pobles són indicadors: només mostren dades i no
              tenen cap acció, així que no es toquen i no porten vora de baix.
              El compte sí que és un botó, i per això conserva la peça de
              botó i la vora que fa que es llegeixi com a acció. */}
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-icon v-gold"><Icon name="flame" size={18} /></span>
              <b>{streak}</b>
              <span>{streak === 1 ? "dia" : "dies"}</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-icon v-orange"><Icon name="map" size={18} /></span>
              <b>{found}</b>
              <span>{found === 1 ? "poble" : "pobles"}</span>
            </div>
            <button
              type="button"
              className="hero-stat is-button"
              onClick={() => setScreen("account")}
              title="Gestiona el teu compte"
            >
              <span className="hero-stat-icon v-blue"><GuineuIcon name="profile" size={21} /></span>
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
            <DailyTiles glyphs={todayResult.results} />
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
      <h2 className="menu-h">Descobreix i comunitat</h2>
      <ul className="link-grid">
        {MENU_LINKS.map((item) => (
          <li key={item.label}>
            <button
              className={`link-tile t-${item.tone}`}
              onClick={() => setScreen(item.screen)}
            >
              <span className="link-icon">
                {item.art ? <GuineuIcon name={item.art} size={28} /> : <Icon name={item.icon} size={22} />}
              </span>
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
