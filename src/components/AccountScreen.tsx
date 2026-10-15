import { useState } from "react";
import { api } from "../api";
import type { Session } from "../api/types";
import type { Records } from "../types";
import { currentStreak } from "../utils/storage";
import Icon from "./Icon";

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

export default function AccountScreen({
  session,
  records,
  onExit,
  onGoToRanking,
  onGoToGroups,
  onGoToRecords,
}: {
  session: Session | null;
  records: Records;
  onExit: () => void;
  onGoToRanking?: () => void;
  onGoToGroups?: () => void;
  onGoToRecords?: () => void;
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

          {/* El perfil no repeteix les xifres de cada mode: la llista completa viu
            a la pantalla «Els teus rècords», que és al menú i s'hi arriba
            sense compte. Aquí només el resum i les portes de sortida. */}
          <div className="actions">
            {onGoToRecords && (
              <button className="ghost" onClick={onGoToRecords}>
                <Icon name="chart" size={18} /> Els teus rècords
              </button>
            )}
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
            {records.music.best > 0 && ` · Música: ${records.music.best}/30`}
          </p>
          <p className="help">En crear un compte o entrar, es guardaran automàticament i sortiràs als rànquings!</p>
        </div>
      )}

      {/* Sense compte, els rècords no són aquí: són a la pantalla «Els teus
          rècords» del menú, que s'hi arriba sense entrar. Aquesta pantalla
          és per crear compte o entrar-hi. */}
      {api.loginHint && <p className="help">🧪 {api.loginHint}</p>}

      <div className="tabs tabs--segmented" role="tablist">
        <button role="tab" aria-selected={tab === "login"}
          onClick={() => setTab("login")}>Entrar</button>
        <button role="tab" aria-selected={tab === "signup"}
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