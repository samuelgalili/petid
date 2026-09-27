import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

  useEffect(() => {
    if (!loading && !isAuthenticated && !isGuest) {
      navigate("/auth");
    }
  }, [isAuthenticated, loading, isGuest, navigate]);

  if (loading) {
    return <AuthLoadingSkeleton />;
  }

  if (!isAuthenticated && !isGuest) {
    return null;
  }

  return <>{children}</>;
};
