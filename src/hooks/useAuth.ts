import { useEffect, useState } from "react";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  signupUser,
  MipoApiError,
  type MipoAuthResult,
  type MipoUser,
} from "@/lib/mipoApi";

type MipoSession = {
  user: MipoUser;
};

const authChangedEvent = "mipo:auth-changed";

const toSession = (auth: MipoAuthResult | null): MipoSession | null => (
  auth?.user ? { user: auth.user } : null
);

const errorMessage = (error: unknown, fallback: string) => (
  error instanceof Error ? error.message : fallback
);

export const useAuth = () => {
  const [user, setUser] = useState<MipoUser | null>(null);
  const [session, setSession] = useState<MipoSession | null>(null);
  const [loading, setLoading] = useState(true);

  const applyAuth = (auth: MipoAuthResult | null) => {
    const nextSession = toSession(auth);
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const auth = await getCurrentUser();
        if (isMounted) applyAuth(auth);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const handleAuthChanged = () => {
      initializeAuth();
    };

    initializeAuth();
    window.addEventListener(authChangedEvent, handleAuthChanged);

    return () => {
      isMounted = false;
      window.removeEventListener(authChangedEvent, handleAuthChanged);
    };
  }, []);

  const signIn = async (email: string, password: string, rememberMe: boolean) => {
    try {
      const auth = await loginUser(email, password, rememberMe);
      const nextSession = toSession(auth);
      applyAuth(auth);
      window.dispatchEvent(new Event(authChangedEvent));
      return { data: { user: auth.user, session: nextSession }, error: null };
    } catch (error: unknown) {
      return {
        data: { user: null, session: null },
        error: {
          message: errorMessage(error, "Invalid email or password"),
          status: error instanceof MipoApiError ? error.status : 0,
        },
      };
    }
  };

  const signUp = async (input: {
    full_name: string;
    email: string;
    password: string;
    birthdate?: string | null;
    phone?: string | null;
  }) => {
    try {
      const auth = await signupUser(input);
      const nextSession = toSession(auth);
      applyAuth(auth);
      window.dispatchEvent(new Event(authChangedEvent));
      return { data: { user: auth.user, session: nextSession }, error: null };
    } catch (error: unknown) {
      return {
        data: { user: null, session: null },
        error: { message: errorMessage(error, "Signup failed"), status: 400 },
      };
    }
  };

  const signOut = async () => {
    try {
      await logoutUser();
      [
        "activePetId",
        "addPetDraft",
        "mipo_order_ids",
        "mipo_order_access_tokens",
        "mipo-cart",
        "chat_pending_intent",
      ].forEach((key) => localStorage.removeItem(key));
      ["lastOrder", "pendingOrder", "mipo_checkout_contact", "appliedCoupon"]
        .forEach((key) => sessionStorage.removeItem(key));
      applyAuth(null);
      window.dispatchEvent(new Event("mipo:user-data-cleared"));
      window.dispatchEvent(new Event(authChangedEvent));
      return { error: null };
    } catch (error: unknown) {
      return { error: { message: errorMessage(error, "Sign out failed") } };
    }
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
  };
};
