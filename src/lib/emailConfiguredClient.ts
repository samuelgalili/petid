import { useEffect, useState } from "react";
import { emailIsConfigured } from "@/lib/emailConfigured";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

let pending: Promise<boolean> | null = null;

// One read of /api/health for the session. A failure stays false: the next
// page load can ask again, and until then no screen claims a mail went out.
export const loadEmailConfigured = (): Promise<boolean> => {
  if (!pending) {
    pending = fetch(`${API_BASE_URL}/health`, {
      credentials: "same-origin",
      signal: AbortSignal.timeout(8000),
    })
      .then(async (response) => (response.ok ? emailIsConfigured(await response.json()) : false))
      .catch(() => false);
  }
  return pending;
};

// null until the health flag is known. Callers treat null like false.
export const useEmailConfigured = (): boolean | null => {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let live = true;
    loadEmailConfigured().then((value) => {
      if (live) setConfigured(value);
    });
    return () => {
      live = false;
    };
  }, []);

  return configured;
};
