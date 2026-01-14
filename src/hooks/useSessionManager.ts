import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface SessionConfig {
  timeoutMinutes: number;
  warningMinutes: number;
  checkIntervalSeconds: number;
}

const DEFAULT_CONFIG: SessionConfig = {
  timeoutMinutes: 30, // Auto logout after 30 minutes of inactivity
  warningMinutes: 5, // Show warning 5 minutes before logout
  checkIntervalSeconds: 60, // Check every minute
};

/**
 * Session management hook with automatic timeout and renewal
 */
export const useSessionManager = (config: Partial<SessionConfig> = {}) => {
  const { user, signOut: logout } = useAuth();
  const { toast } = useToast();
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { timeoutMinutes, warningMinutes, checkIntervalSeconds } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
  }, []);

  const checkSession = useCallback(async () => {
    if (!user) return;

    const now = Date.now();
    const inactiveMs = now - lastActivityRef.current;
    const inactiveMinutes = inactiveMs / (1000 * 60);

    // Check for session timeout
    if (inactiveMinutes >= timeoutMinutes) {
      toast({
        title: "נותקת בגלל חוסר פעילות",
        description: "אנא התחבר מחדש להמשך השימוש",
        variant: "destructive",
      });
      logout();
      return;
    }

    // Show warning before timeout
    if (inactiveMinutes >= timeoutMinutes - warningMinutes && !warningShownRef.current) {
      warningShownRef.current = true;
      toast({
        title: "התראת סשן",
        description: `תנותק בעוד ${Math.ceil(timeoutMinutes - inactiveMinutes)} דקות מחוסר פעילות`,
        variant: "default",
      });
    }

    // Refresh token if needed
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        logout();
        return;
      }

      // Check if token needs refresh (within 5 minutes of expiry)
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const expiresInMs = expiresAt * 1000 - now;
        if (expiresInMs < 5 * 60 * 1000) {
          await supabase.auth.refreshSession();
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
    }
  }, [user, timeoutMinutes, warningMinutes, logout, toast]);

  // Setup activity listeners
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Start session check interval
    checkIntervalRef.current = setInterval(checkSession, checkIntervalSeconds * 1000);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [user, updateActivity, checkSession, checkIntervalSeconds]);

  // Handle visibility change (tab switching)
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSession();
        updateActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, checkSession, updateActivity]);

  return {
    updateActivity,
    checkSession,
    getIdleTime: () => Date.now() - lastActivityRef.current,
  };
};

export default useSessionManager;
