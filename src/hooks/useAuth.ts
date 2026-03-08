import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener FIRST (for ongoing changes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // THEN check for existing session (initial load)
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string, rememberMe: boolean) => {
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
        body: {
          action: 'check',
          ip_address: await getClientIP(),
        },
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
          body: { action: 'reset', ip_address: await getClientIP() },
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
  };

  const signOut = async () => {
    localStorage.removeItem("rememberMe");
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user,
  };
};
