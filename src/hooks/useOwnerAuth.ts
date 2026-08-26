import { useCallback, useEffect, useState } from "react";
import { checkOwner, signInWithPin, signOutOwner } from "@/lib/zengen.js";

interface OwnerAuth {
  isOwner: boolean;
  checking: boolean;
  signIn: (pin: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

export function useOwnerAuth(): OwnerAuth {
  const [isOwner, setIsOwner] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    checkOwner().then((owner) => {
      if (active) {
        setIsOwner(owner);
        setChecking(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (pin: string): Promise<string | null> => {
    const { error } = await signInWithPin(pin);
    if (error) return error;
    setIsOwner(true);
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await signOutOwner();
    setIsOwner(false);
  }, []);

  return { isOwner, checking, signIn, signOut };
}
