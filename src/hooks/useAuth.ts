import { useEffect, useState } from "react";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  signupUser,
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
    const now = Date.now();
    const attemptsKey = "login_attempts";
    const windowMs = 60000;
    const maxAttempts = 5;

    try {
      const stored = JSON.parse(localStorage.getItem(attemptsKey) || "{\"c\":0,\"t\":0}");
      if (now - stored.t < windowMs && stored.c >= maxAttempts) {
        const waitSec = Math.ceil((windowMs - (now - stored.t)) / 1000);
        return {
          data: { user: null, session: null },
          error: { message: `יותר מדי ניסיונות. נסה שוב בעוד ${waitSec} שניות`, status: 429 },
        };
      }
      if (now - stored.t >= windowMs) {
        localStorage.setItem(attemptsKey, JSON.stringify({ c: 1, t: now }));
      } else {
        localStorage.setItem(attemptsKey, JSON.stringify({ c: stored.c + 1, t: stored.t }));
      }
    } catch {
      // localStorage is a soft client-side guard only.
    }

    try {
      const auth = await loginUser(email, password);
      const nextSession = toSession(auth);
      applyAuth(auth);
      localStorage.removeItem(attemptsKey);
      if (rememberMe && nextSession) localStorage.setItem("rememberMe", "true");
      else localStorage.removeItem("rememberMe");
      window.dispatchEvent(new Event(authChangedEvent));
      return { data: { user: auth.user, session: nextSession }, error: null };
    } catch (error: unknown) {
      return {
        data: { user: null, session: null },
        error: { message: errorMessage(error, "Invalid email or password"), status: 401 },
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
      localStorage.removeItem("rememberMe");
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
    localStorage.removeItem("rememberMe");
    try {
      await logoutUser();
      applyAuth(null);
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
