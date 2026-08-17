import { useCallback, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

// Admin status is resolved once per signed-in user, not once per component.
//
// useAdmin is called from ~23 components, and each call used to run its own
// getUser plus user_roles query on mount. The result is the same for every
// caller, so it is fetched once here and shared, and refetched when the
// signed-in user changes.
//
// The hook's return shape is unchanged, so callers did not need touching.

interface AdminState {
  isAdmin: boolean;
  loading: boolean;
}

let state: AdminState = { isAdmin: false, loading: true };
const listeners = new Set<() => void>();
let started = false;

// The user the current state describes, so an auth change can invalidate it.
let resolvedFor: string | null = null;
let inFlight: Promise<void> | null = null;

function setState(next: AdminState) {
  state = next;
  for (const listener of listeners) listener();
}

async function resolve(userId: string | null): Promise<void> {
  if (!userId) {
    resolvedFor = null;
    setState({ isAdmin: false, loading: false });
    return;
  }

  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (error) {
      console.error("Error checking admin status:", error);
      resolvedFor = userId;
      setState({ isAdmin: false, loading: false });
      return;
    }

    resolvedFor = userId;
    setState({ isAdmin: !!data, loading: false });
  } catch (error) {
    console.error("Error in checkAdminStatus:", error);
    resolvedFor = userId;
    setState({ isAdmin: false, loading: false });
  }
}

async function refresh(force = false): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  if (!force && userId === resolvedFor && !state.loading) return;
  if (inFlight) return inFlight;

  inFlight = resolve(userId).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

function start() {
  if (started) return;
  started = true;

  refresh();

  // A different user, or a sign-out, invalidates what we resolved.
  supabase.auth.onAuthStateChange((_event, session) => {
    const userId = session?.user?.id ?? null;
    if (userId === resolvedFor) return;
    setState({ isAdmin: false, loading: true });
    resolve(userId);
  });
}

function subscribe(listener: () => void): () => void {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AdminState {
  return state;
}

export const useAdmin = () => {
  const { isAdmin, loading } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const refreshAdminStatus = useCallback(() => refresh(true), []);

  return { isAdmin, loading, refreshAdminStatus };
};
