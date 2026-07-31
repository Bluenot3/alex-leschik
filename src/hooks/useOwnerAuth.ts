import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface OwnerAuth {
  session: Session | null;
  isOwner: boolean;
  checking: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

/**
 * Owner gate for the ZEN-GEN studio.
 *
 * The boolean here only decides what the UI offers — every write is
 * independently checked by row-level security against the allowlist,
 * so a forged `isOwner` still cannot upload or delete anything.
 */
export function useOwnerAuth(): OwnerAuth {
  const [session, setSession] = useState<Session | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [checking, setChecking] = useState(true);

  const verify = useCallback(async (next: Session | null) => {
    if (!next) {
      setIsOwner(false);
      setChecking(false);
      return;
    }
    const { data, error } = await supabase.rpc("is_admin");
    setIsOwner(!error && data === true);
    setChecking(false);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void verify(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      setChecking(true);
      void verify(next);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [verify]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { session, isOwner, checking, signIn, signOut };
}
