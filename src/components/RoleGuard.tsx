import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole, AppRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: AppRole[];
  fallbackPath?: string;
}

export const RoleGuard = ({ 
  children, 
  allowedRoles, 
  fallbackPath = '/' 
}: RoleGuardProps) => {
  const { user, loading: authLoading } = useAuth();
  const { roles, isLoading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const hasAllowedRole = allowedRoles.some(role => roles.includes(role));

  if (!hasAllowedRole) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

// Convenience components for specific roles
export const AdminOnly = ({ children }: { children: ReactNode }) => (
  <RoleGuard allowedRoles={['admin']}>{children}</RoleGuard>
);

export const BusinessOnly = ({ children }: { children: ReactNode }) => (
  <RoleGuard allowedRoles={['business', 'admin']}>{children}</RoleGuard>
);

export const OrgOnly = ({ children }: { children: ReactNode }) => (
  <RoleGuard allowedRoles={['org', 'admin']}>{children}</RoleGuard>
);
