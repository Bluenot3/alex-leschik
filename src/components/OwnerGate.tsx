import { useState, type ReactNode } from "react";
import { useOwnerAuth } from "@/hooks/useOwnerAuth";

interface Props {
  children: ReactNode;
  /** Shown under the heading so each panel can say what it unlocks. */
  purpose?: string;
  /** Rendered beside the sign-out link once unlocked. */
  footNote?: ReactNode;
}

/**
 * Sign-in wall for owner-only panels.
 *
 * This is a convenience layer, not the security boundary — row-level
 * security independently rejects any write from a session that is not
 * on the allowlist, so bypassing this component gains nothing.
 */
export default function OwnerGate({ children, purpose, footNote }: Props) {
  const { session, isOwner, checking, signIn, signOut } = useOwnerAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
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
      <span className="owner-gate__title">Owner access required</span>
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

      <form className="owner-gate__form" onSubmit={submit}>
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
      </form>
    </div>
  );
}
