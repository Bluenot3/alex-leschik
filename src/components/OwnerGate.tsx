import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useOwnerAuth } from "@/hooks/useOwnerAuth";
import { OWNER_EMAIL, PIN_LENGTH } from "@/lib/ownerConfig";

interface Props {
  children: ReactNode;
  /** Shown under the heading so each panel can say what it unlocks. */
  purpose?: string;
  /** Rendered beside the sign-out link once unlocked. */
  footNote?: ReactNode;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];

/**
 * Sign-in wall for owner-only panels.
 *
 * This is a convenience layer, not the security boundary — row-level
 * security independently rejects any write from a session that is not
 * on the allowlist, so bypassing this component gains nothing.
 */
export default function OwnerGate({ children, purpose, footNote }: Props) {
  const { session, isOwner, checking, signIn, signOut } = useOwnerAuth();

  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [useEmail, setUseEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const padRef = useRef<HTMLDivElement>(null);

  const attempt = useCallback(async (code: string) => {
    setBusy(true);
    setError(null);
    const err = await signIn(OWNER_EMAIL, code);
    if (err) {
      setError("PIN not accepted");
      setPin("");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
    setBusy(false);
  }, [signIn]);

  /* Fires the moment the last digit lands — no submit button needed */
  useEffect(() => {
    if (pin.length === PIN_LENGTH && !busy) void attempt(pin);
  }, [pin, busy, attempt]);

  const press = useCallback((key: string) => {
    setError(null);
    if (key === "clear") return setPin("");
    if (key === "back") return setPin((p) => p.slice(0, -1));
    setPin((p) => (p.length >= PIN_LENGTH ? p : p + key));
  }, []);

  /* Physical keyboard works alongside the pad */
  useEffect(() => {
    if (isOwner || useEmail) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("back");
      else if (e.key === "Escape") setPin("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOwner, useEmail, press]);

  useEffect(() => { padRef.current?.focus(); }, []);

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setError(await signIn(email.trim(), password));
    setBusy(false);
  };

  if (checking) {
    return <div className="owner-gate__note">verifying credentials…</div>;
  }

  if (isOwner) {
    return (
      <>
        {children}
        <div className="owner-gate__bar">
          <span>{footNote ?? `owner session · ${session?.user.email ?? ""}`}</span>
          <button type="button" className="owner-gate__link" onClick={signOut}>
            sign out
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="owner-gate">
      <span className="owner-gate__title">Owner access</span>
      {purpose && <span className="owner-gate__purpose">{purpose}</span>}

      {session && (
        <p className="owner-gate__denied">
          Signed in as <strong>{session.user.email}</strong>, which is not on the owner
          allowlist.
          <button type="button" className="owner-gate__link" onClick={signOut}>
            sign out
          </button>
        </p>
      )}

      {!useEmail ? (
        <div className="owner-pin" ref={padRef} tabIndex={-1}>
          <div className={`owner-pin__dots${shake ? " owner-pin__dots--deny" : ""}`} aria-live="polite">
            {Array.from({ length: PIN_LENGTH }, (_, i) => (
              <span
                key={i}
                className={`owner-pin__dot${i < pin.length ? " owner-pin__dot--on" : ""}`}
                aria-hidden
              />
            ))}
          </div>

          <span className="owner-pin__status">
            {busy ? "verifying…" : error ? error : `enter ${PIN_LENGTH}-digit PIN`}
          </span>

          <div className="owner-pin__pad">
            {KEYS.map((k) => (
              <button
                key={k}
                type="button"
                className={`owner-pin__key${k === "clear" || k === "back" ? " owner-pin__key--alt" : ""}`}
                onClick={() => press(k)}
                disabled={busy}
                aria-label={k === "back" ? "Delete" : k === "clear" ? "Clear" : k}
              >
                {k === "back" ? "⌫" : k === "clear" ? "✕" : k}
              </button>
            ))}
          </div>

          <button type="button" className="owner-gate__link" onClick={() => setUseEmail(true)}>
            use email instead
          </button>
        </div>
      ) : (
        <form className="owner-gate__form" onSubmit={submitEmail}>
          <label>
            <span>Email</span>
            <input
              type="email" value={email} required autoComplete="username"
              onChange={(e) => setEmail(e.target.value)} placeholder="owner@domain.com"
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password" value={password} required autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
            />
          </label>
          {error && <p className="owner-gate__error">{error}</p>}
          <button type="submit" className="owner-gate__submit" disabled={busy}>
            {busy ? "verifying…" : "Unlock"}
          </button>
          <button type="button" className="owner-gate__link" onClick={() => setUseEmail(false)}>
            use PIN instead
          </button>
        </form>
      )}
    </div>
  );
}
