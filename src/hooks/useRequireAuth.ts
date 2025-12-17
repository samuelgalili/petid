import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/contexts/GuestContext";
import { useCallback } from "react";

/**
 * Hook for requiring authentication before performing actions.
 * Returns a function that wraps actions - if user is not authenticated,
 * it shows a login prompt instead of executing the action.
 */
export const useRequireAuth = () => {
  const { isAuthenticated } = useAuth();
  const { isGuest, promptLogin } = useGuest();

  const requireAuth = useCallback(
    <T extends (...args: unknown[]) => unknown>(
      action: T,
      message?: string
    ) => {
      return (...args: Parameters<T>): ReturnType<T> | void => {
        if (!isAuthenticated || isGuest) {
          promptLogin(message);
          return;
        }
        return action(...args) as ReturnType<T>;
      };
    },
    [isAuthenticated, isGuest, promptLogin]
  );

  const checkAuth = useCallback(
    (message?: string): boolean => {
      if (!isAuthenticated || isGuest) {
        promptLogin(message);
        return false;
      }
      return true;
    },
    [isAuthenticated, isGuest, promptLogin]
  );

  return { 
    requireAuth, 
    checkAuth,
    isAuthenticated: isAuthenticated && !isGuest 
  };
};
