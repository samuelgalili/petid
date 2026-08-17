import { useCallback, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

// Auth state is held once for the whole app rather than per component.
//
// useAuth is called from ~110 components. When each call owned its own
// useState and useEffect, every one of them opened its own
// onAuthStateChange subscription and issued its own getSession request on
// mount. This module keeps a single subscription and a single snapshot, and
// the hook reads it through useSyncExternalStore.
//
// The hook's return shape is unchanged, so callers did not need touching.

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

// Replaced wholesale on every change: useSyncExternalStore compares snapshots
// by identity, so mutating this object in place would not notify anyone.
let state: AuthState = { user: null, session: null, loading: true };

const listeners = new Set<() => void>();
let started = false;

function setState(next: AuthState) {
  state = next;
  for (const listener of listeners) listener();
}

/** Open the single subscription, on first use. */
function start() {
  if (started) return;
  started = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    setState({ user: session?.user ?? null, session, loading: false });
  });

  supabase.auth
    .getSession()
    .then(({ data: { session } }) => {
      setState({ user: session?.user ?? null, session, loading: false });
    })
    .catch(() => {
      setState({ ...state, loading: false });
    });
}

function subscribe(listener: () => void): () => void {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AuthState {
  return state;
}

// Server render and hydration both see the pre-resolved state.
function getServerSnapshot(): AuthState {
  return state;
}

// The login rate limit is keyed by the address auth-guard reads from the
// request headers. The client used to look its own IP up and send it, which
// meant an attacker could present a new one on every attempt.

export const useAuth = () => {
  const { user, session, loading } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const signIn = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    // Client-side rate limiting (first defense layer)
    const now = Date.now();
    const attemptsKey = "login_attempts";
    const windowMs = 60000;
    const maxAttempts = 5;

    try {
      const stored = JSON.parse(localStorage.getItem(attemptsKey) || '{"c":0,"t":0}');
      if (now - stored.t < windowMs && stored.c >= maxAttempts) {
        const waitSec = Math.ceil((windowMs - (now - stored.t)) / 1000);
        return { data: { user: null, session: null }, error: { message: `יותר מדי ניסיונות. נסה שוב בעוד ${waitSec} שניות`, status: 429 } as any };
      }
      if (now - stored.t >= windowMs) {
        localStorage.setItem(attemptsKey, JSON.stringify({ c: 1, t: now }));
      } else {
        localStorage.setItem(attemptsKey, JSON.stringify({ c: stored.c + 1, t: stored.t }));
      }
    } catch { /* ignore localStorage errors */ }

    // Server-side rate limiting (second defense layer)
    try {
      const guardResp = await supabase.functions.invoke('auth-guard', {
        body: { action: 'check' },
      });

      if (guardResp.data && !guardResp.data.allowed) {
        const retryAfter = guardResp.data.retry_after || 60;
        return {
          data: { user: null, session: null },
          error: { message: `חשבונך נחסם זמנית. נסה שוב בעוד ${Math.ceil(retryAfter / 60)} דקות.`, status: 429 } as any,
        };
      }
    } catch {
      // Fail open — don't block on network errors
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Reset counters on success
    if (!error && data.session) {
      localStorage.removeItem(attemptsKey);
      // Reset server-side rate limit
      try {
        await supabase.functions.invoke('auth-guard', {
          body: { action: 'reset' },
        });
      } catch { /* non-critical */ }
    }

    // Store remember me preference
    if (rememberMe && data.session) {
      localStorage.setItem("rememberMe", "true");
    } else {
      localStorage.removeItem("rememberMe");
    }

    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem("rememberMe");
    const { error } = await supabase.auth.signOut();

    // Drop any service worker caches holding data fetched as this user.
    // Devices that ran an earlier build may still have a supabase-api-cache
    // entry, and it would otherwise survive into the next session.
    if (typeof caches !== "undefined") {
      try {
        const names = await caches.keys();
        await Promise.all(
          names
            .filter((name) => name.startsWith("supabase-") || name.includes("api-cache"))
            .map((name) => caches.delete(name))
        );
      } catch {
        // Cache eviction is best effort; never block sign-out on it.
      }
    }

    return { error };
  }, []);

  return {
    user,
    session,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user,
  };
};
