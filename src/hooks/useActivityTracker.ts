import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { updateMyActivityStatus } from "@/lib/mipoApi";

export const useActivityTracker = () => {
  const { user } = useAuth();
  const location = useLocation();
  const lastUpdate = useRef(0);

  useEffect(() => {
    if (!user?.id) return;
    const now = Date.now();
    if (now - lastUpdate.current < 60_000) return;
    lastUpdate.current = now;
    updateMyActivityStatus().catch(() => {});
  }, [location.pathname, user?.id]);

  const trackClick = useCallback((_elementId: string, _elementLabel?: string) => {
    // Click analytics endpoint is not available on AWS yet.
  }, []);

  return { trackClick };
};
