import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/contexts/GuestContext";
import { AuthLoadingSkeleton } from "@/components/AuthLoadingSkeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth();
  const { isGuest } = useGuest();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated && !isGuest) {
      const next = `${location.pathname}${location.search}`;
      navigate(`/auth?next=${encodeURIComponent(next)}`, { replace: true });
    }
  }, [isAuthenticated, loading, isGuest, navigate, location.pathname, location.search]);

  if (loading) {
    return <AuthLoadingSkeleton />;
  }

  if (!isAuthenticated && !isGuest) {
    return null;
  }

  return <>{children}</>;
};
