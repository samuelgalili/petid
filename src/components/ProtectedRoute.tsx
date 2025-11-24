import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/contexts/GuestContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth();
  const { isGuest } = useGuest();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("ProtectedRoute - loading:", loading, "isAuthenticated:", isAuthenticated, "isGuest:", isGuest);
    if (!loading && !isAuthenticated && !isGuest) {
      console.log("Redirecting to /auth - not authenticated and not guest");
      navigate("/auth");
    }
  }, [isAuthenticated, loading, isGuest, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated && !isGuest) {
    return null;
  }

  return <>{children}</>;
};
