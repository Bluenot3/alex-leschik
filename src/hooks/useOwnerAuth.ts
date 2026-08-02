import { useCallback, useEffect, useState } from "react";
import { checkOwner, signInWithPin, signOutOwner } from "@/lib/zengen";

interface OwnerAuth {
  isOwner: boolean;
  checking: boolean;
  signIn: (pin: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

/**
 * Owner gate.
 *
 * The session is an HttpOnly cookie the browser cannot read, so this
 * hook asks the server. The boolean only decides what the UI offers —
 * every upload endpoint re-checks the cookie independently, so a forged
 * `isOwner` still writes nothing.
 */
export function useOwnerAuth(): OwnerAuth {
  const [isOwner, setIsOwner] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    checkOwner()
      .then((owner) => active && setIsOwner(owner))
      .finally(() => active && setChecking(false));
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (pin: string) => {
    const err = await signInWithPin(pin);
    if (!err) setIsOwner(true);
    return err;
  }, []);

  const signOut = useCallback(async () => {
    await signOutOwner();
    setIsOwner(false);
  }, []);

  return { isOwner, checking, signIn, signOut };
}
