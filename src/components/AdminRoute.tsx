import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAwsAdminAuth } from "@/hooks/useAwsAdminAuth";
import { adminHasPermission, type AdminPermission } from "@/lib/adminPermissions";

interface AdminRouteProps {
  children: ReactNode;
  permission?: AdminPermission;
}

export const AdminRoute = ({ children, permission }: AdminRouteProps) => {
  const { admin, isAdmin, loading } = useAwsAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-success"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (admin?.must_change_password && location.pathname !== "/admin/change-password") {
    return <Navigate to="/admin/change-password" replace />;
  }

  if (permission && !adminHasPermission(admin, permission)) {
    return <Navigate to="/admin/products" replace />;
  }

  return <>{children}</>;
};
