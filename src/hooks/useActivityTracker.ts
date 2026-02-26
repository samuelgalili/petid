/**
 * useActivityTracker — Global user activity tracking
 * Tracks page views, time spent, scroll depth, clicks, and exit events.
 * Mount once in AnimatedRoutes or App level.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const SESSION_KEY = 'petid_session_id';

function getSessionId(): string {
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

export const useActivityTracker = () => {
  const { user } = useAuth();
  const location = useLocation();
  const enteredAt = useRef<number>(Date.now());
  const prevRoute = useRef<string>(location.pathname);
  const maxScroll = useRef<number>(0);
  const userId = user?.id;

  const log = useCallback(
    async (event: {
      event_type: 'page_view' | 'click' | 'scroll' | 'exit' | 'stay';
      route: string;
      time_spent_seconds?: number;
      scroll_depth?: number;
      element_id?: string;
      element_label?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!userId) return;
      try {
        await (supabase as any).from('user_activity_logs').insert({
          user_id: userId,
          session_id: getSessionId(),
          ...event,
        });
      } catch {
        // silent
      }
    },
    [userId],
  );

  // ─── Track page transitions & time spent ───
  useEffect(() => {
    const now = Date.now();
    const spent = Math.floor((now - enteredAt.current) / 1000);

    // Log previous page time
    if (prevRoute.current !== location.pathname && spent >= 1) {
      log({
        event_type: 'page_view',
        route: prevRoute.current,
        time_spent_seconds: spent,
        scroll_depth: maxScroll.current,
      });
    }

    prevRoute.current = location.pathname;
    enteredAt.current = Date.now();
    maxScroll.current = 0;
  }, [location.pathname, log]);

  // ─── Track scroll depth ───
  useEffect(() => {
    const handler = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const pct = Math.round((scrollTop / docHeight) * 100);
        if (pct > maxScroll.current) maxScroll.current = pct;
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // ─── Track exit (tab close / navigate away) ───
  useEffect(() => {
    const handleExit = () => {
      if (!userId) return;
      const spent = Math.floor((Date.now() - enteredAt.current) / 1000);
      const payload = JSON.stringify({
        user_id: userId,
        session_id: getSessionId(),
        event_type: 'exit',
        route: location.pathname,
        time_spent_seconds: spent,
        scroll_depth: maxScroll.current,
      });
      // sendBeacon for reliable exit tracking
      navigator.sendBeacon(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_activity_logs`,
        new Blob([payload], { type: 'application/json' }),
      );
    };
    window.addEventListener('beforeunload', handleExit);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') handleExit();
    });
    return () => {
      window.removeEventListener('beforeunload', handleExit);
    };
  }, [userId, location.pathname]);

  // ─── Public: track a click ───
  const trackClick = useCallback(
    (elementId: string, elementLabel?: string) => {
      log({
        event_type: 'click',
        route: location.pathname,
        element_id: elementId,
        element_label: elementLabel,
      });
    },
    [log, location.pathname],
  );

  return { trackClick };
};
