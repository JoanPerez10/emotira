import { useState } from "react";
import { api } from "../api";
import type { Session } from "../api/types";

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

export default function AccountScreen({
  session,
  onExit,
}: {
  session: Session | null;
  onExit: () => void;
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
      <button className="ghost" onClick={onExit}>← Menú</button>
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
    return (
      <main className="app">
        {header}
        <p className="big">👤 {session.username}</p>
        <p>{session.email}</p>
        <p className="help">Els teus rècords es guarden al compte i surts als rànquings.</p>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions">
          <button className="secondary" onClick={() => api.auth.signOut()}>Sortir</button>
          <button className="ghost" onClick={removeAccount}>Esborrar el compte</button>
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      {header}
      <p>Pots seguir jugant com a convidat. Amb un compte, els rècords es guarden i surts als rànquings i als grups.</p>
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