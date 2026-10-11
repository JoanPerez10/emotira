import { useState } from "react";
import { api } from "../api";
import type { Session } from "../api/types";
import type { Records } from "../types";
import { currentStreak } from "../utils/storage";
import { formatScoreValue } from "../modes";
import Icon from "./Icon";

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

export default function AccountScreen({
  session,
  records,
  onExit,
  onGoToRanking,
  onGoToGroups,
}: {
  session: Session | null;
  records: Records;
  onExit: () => void;
  onGoToRanking?: () => void;
  onGoToGroups?: () => void;
}) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const header = (
    <div className="topbar">
      <button className="back" onClick={onExit}>← Menú</button>
      <strong>👤 Compte</strong>
    </div>
  );

  const removeAccount = async () => {
    if (!confirm("Segur que vols esborrar el compte? Es perdran els rècords i sortiràs dels grups.")) return;
    try {
      await api.auth.deleteAccount();
    } catch {
      setError("No s'ha pogut esborrar el compte.");
      return;
    }
    try {
      await api.auth.signOut();
    } catch {
      /* la sessió ja no existeix */
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!api.enabled) {
      setError("El sistema de comptes no està configurat.");
      return;
    }
    setBusy(true);
    try {
      if (tab === "login") {
        const ok = await api.auth.signIn(email.trim(), password);
        if (!ok) setError("Correu o contrasenya incorrectes (o el correu encara no està confirmat).");
      } else {
        if (!USERNAME_RE.test(username)) {
          setError("El nom d'usuari ha de tenir 3-20 caràcters (lletres, números o _).");
        } else if (password.length < 8) {
          setError("La contrasenya ha de tenir almenys 8 caràcters.");
        } else if (!(await api.auth.usernameAvailable(username))) {
          setError("Aquest nom d'usuari ja està agafat.");
        } else {
          const r = await api.auth.signUp(username, email.trim(), password);
          if (!r.ok) setError(r.error);
          else if (r.needsConfirmation)
            setInfo("Compte creat! Revisa el correu i confirma l'adreça per poder entrar.");
        }
      }
    } catch {
      setError("No s'ha pogut completar l'operació. Prova-ho més tard.");
    } finally {
      setBusy(false);
    }
  };

  if (session) {
    const streak = currentStreak(records);
    const found = records.unlockedTowns.length;
    return (
      <main className="app">
        {header}
        <div className="card">
          <p className="big">👤 {session.username}</p>
          <p className="progress">{session.email}</p>
          {session.isAdmin && <p className="chip chip-fire">Administrador</p>}
          <p className="help">Els teus rècords es guarden al compte i surts als rànquings.</p>
        </div>

        <section className="card">
          <h3>🏆 Rècords del jugador</h3>
          <div className="chips">
            <span className="chip chip-fire">Ratxa: {streak} {streak === 1 ? "dia" : "dies"}</span>
            <span className="chip chip-map">{found} {found === 1 ? "poble" : "pobles"} trobats</span>
          </div>

          <ul className="account-stats-list">
            <li>
              <span><Icon name="calendar" size={16} /> Repte diari:</span>
              <b>{records.daily.bestStreak} dies de ratxa</b>
            </li>
            <li>
              <span><Icon name="target" size={16} /> Endivina 10:</span>
              <b>{formatScoreValue("ten", records.ten.best)}</b>
            </li>
            <li>
              <span><Icon name="flame" size={16} /> Mode difícil:</span>
              <b>{formatScoreValue("hard", records.hard.best)}</b>
            </li>
            <li>
              <span><Icon name="infinity" size={16} /> Mode infinit:</span>
              <b>{formatScoreValue("infinite", records.infinite.bestStreak)}</b>
            </li>
            <li>
              <span><Icon name="timer" size={16} /> Contrarellotge:</span>
              <b>{formatScoreValue("timeTrial", records.timeTrial.best)}</b>
            </li>
            <li>
              <span><Icon name="reverse" size={16} /> Invers:</span>
              <b>{formatScoreValue("inverse", records.inverse.best)}</b>
            </li>
          </ul>

          <div className="actions">
            {onGoToRanking && (
              <button onClick={onGoToRanking}>
                <Icon name="trophy" size={18} /> Veure el rànquing
              </button>
            )}
            {onGoToGroups && (
              <button className="secondary" onClick={onGoToGroups}>
                👥 Els meus grups
              </button>
            )}
          </div>
        </section>

        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions">
          <button className="secondary" onClick={() => api.auth.signOut()}>Sortir</button>
          <button className="ghost danger-text" onClick={removeAccount}>Esborrar el compte</button>
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      {header}
      <p>Pots seguir jugant com a convidat. Amb un compte, els rècords es guarden i surts als rànquings i als grups.</p>
      {records.unlockedTowns.length > 0 && (
        <div className="card">
          <p className="help">
            🎮 <b>Progrés en aquest dispositiu:</b> {records.unlockedTowns.length} {records.unlockedTowns.length === 1 ? "poble descobert" : "pobles descoberts"}
            {records.timeTrial.best > 0 && ` · Contrarellotge: ${records.timeTrial.best} pobles`}
            {records.inverse.best > 0 && ` · Invers: ${records.inverse.best}/30`}
          </p>
          <p className="help">En crear un compte o entrar, es guardaran automàticament i sortiràs als rànquings!</p>
        </div>
      )}
      {api.loginHint && <p className="help">🧪 {api.loginHint}</p>}

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "login"} className={tab === "login" ? "" : "ghost"}
          onClick={() => setTab("login")}>Entrar</button>
        <button role="tab" aria-selected={tab === "signup"} className={tab === "signup" ? "" : "ghost"}
          onClick={() => setTab("signup")}>Crear compte</button>
      </div>

      <form onSubmit={submit}>
        {tab === "signup" && (
          <div className="field">
            <label htmlFor="acc-user">Nom d'usuari</label>
            <input id="acc-user" value={username} maxLength={20}
              onChange={(e) => setUsername(e.target.value)} autoComplete="nickname" />
            <p className="help">3-20 caràcters: lletres, números o _. Es veurà als rànquings.</p>
          </div>
        )}
        <div className="field">
          <label htmlFor="acc-email">Correu</label>
          <input id="acc-email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </div>
        <div className="field">
          <label htmlFor="acc-pass">Contrasenya</label>
          <input id="acc-pass" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={tab === "signup" ? "new-password" : "current-password"} />
          {tab === "signup" && <p className="help">Mínim 8 caràcters.</p>}
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        {info && <p className="hint" role="status">{info}</p>}
        <button type="submit" disabled={busy}>
          {busy ? "Un moment…" : tab === "login" ? "Entrar" : "Crear compte"}
        </button>
      </form>
      <p className="help">Només guardem el nom d'usuari, el correu i els teus rècords. Pots esborrar el compte quan vulguis.</p>
    </main>
  );
}