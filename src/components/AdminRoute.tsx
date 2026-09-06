import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAwsAdminAuth } from "@/hooks/useAwsAdminAuth";
import { adminHasPermission, type AdminPermission } from "@/lib/adminPermissions";

interface AdminRouteProps {
  children: ReactNode;
  permission?: AdminPermission;
}

export const AdminRoute = ({ children, permission }: AdminRouteProps) => {
  const { admin, isAdmin, needsTwoFactor, hasAdminSession, loading } = useAwsAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-success"></div>
      </div>
    );
  }

  if (!hasAdminSession) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  // Each unfinished step owns one screen and returns there rather than falling
  // through to the next check. Falling through is what turned two guards into a
  // redirect loop before: the screen that clears a step must be allowed to
  // render while that step is still outstanding.
  if (admin?.must_change_password) {
    // The forced password change comes first: an admin still holding a
    // temporary password should not register an authenticator against it.
    return location.pathname === "/admin/change-password"
      ? <>{children}</>
      : <Navigate to="/admin/change-password" replace />;
  }

  if (needsTwoFactor) {
    // Signed in with the password, but the second factor is still owed. This
    // is its own screen rather than a bounce back to the login, so the session
    // that enrols is the session that carries on into the panel.
    return location.pathname === "/admin/two-factor"
      ? <>{children}</>
      : <Navigate to="/admin/two-factor" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (permission && !adminHasPermission(admin, permission)) {
    return <Navigate to="/admin/products" replace />;
  }

  return <>{children}</>;
};
