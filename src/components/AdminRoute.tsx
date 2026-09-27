import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAwsAdminAuth } from "@/hooks/useAwsAdminAuth";
import { adminHasPermission, type AdminPermission } from "@/lib/adminPermissions";

interface AdminRouteProps {
  children: ReactNode;
  /**
   * One permission, or several of which ANY is enough.
   *
   * The list exists because merging screens merges their gates. The products
   * screen now holds the publication queue, and SELLER_ADMIN has INTAKE_READ
   * without PRODUCTS_READ - so a single `products.read` on the route would
   * have taken the publication queue away from a whole role, silently, as a
   * side effect of a layout change. The page shows each half to whoever holds
   * that half's permission.
   */
  permission?: AdminPermission | AdminPermission[];
}

export const AdminRoute = ({ children, permission }: AdminRouteProps) => {
  const { admin, needsTwoFactor, loading } = useAwsAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-success"></div>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  // Each unfinished step owns one screen. Falling through is what turned two
  // guards into a redirect loop: the screen that clears a step must be allowed
  // to render while that step is still outstanding.
  if (admin.must_change_password) {
    return location.pathname === "/admin/change-password"
      ? <>{children}</>
      : <Navigate to="/admin/change-password" replace />;
  }

  if (needsTwoFactor) {
    return location.pathname === "/admin/two-factor"
      ? <>{children}</>
      : <Navigate to="/admin/two-factor" replace />;
  }

  const required = permission === undefined ? [] : [permission].flat();
  if (required.length > 0 && !required.some((one) => adminHasPermission(admin, one))) {
    return <Navigate to="/admin/products" replace />;
  }

  return <>{children}</>;
};
