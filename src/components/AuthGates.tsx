import { Link, useLocation, Navigate } from "react-router-dom";

import { AuthLoadingSkeleton } from "@/components/AuthLoadingSkeleton";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";

/**
 * Logged-in visitors keep the pet home. Everyone else lands in the shop,
 * which is the public front door.
 */
export const HomeEntry = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <AuthLoadingSkeleton />;
  if (!isAuthenticated) return <Navigate to="/shop" replace />;
  return <>{children}</>;
};

/**
 * The feed stays members-only. The page says so, and the login link carries
 * the path they were on so they come back to it.
 */
export const CommunityLoginGate = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoadingSkeleton />;
  if (isAuthenticated) return <>{children}</>;

  const next = `${location.pathname}${location.search}`;

  return (
    <div className="min-h-screen bg-mipo-soft" dir="rtl">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 pb-28 text-center">
        <h1 className="text-2xl font-semibold leading-snug text-mipo-ink">
          התחבר כדי לראות את הקהילה
        </h1>
        <p className="mt-3 max-w-xs text-sm leading-6 text-mipo-muted">
          הפיד פתוח לחברים מחוברים. אחרי ההתחברות נחזיר אתכם לכאן.
        </p>
        <Link
          to={`/auth?next=${encodeURIComponent(next)}`}
          className="mipo-cta-button mt-6 w-full max-w-xs px-6"
        >
          התחברות
        </Link>
      </div>
      <BottomNav />
    </div>
  );
};
