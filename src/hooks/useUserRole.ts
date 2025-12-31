import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'user' | 'org' | 'business' | 'moderator' | 'admin';

interface UseUserRoleReturn {
  role: AppRole;
  roles: AppRole[];
  isAdmin: boolean;
  isModerator: boolean;
  isBusiness: boolean;
  isOrg: boolean;
  isLoading: boolean;
  hasRole: (role: AppRole) => boolean;
  isModeratorOrAdmin: boolean;
  refetch: () => Promise<void>;
}

export const useUserRole = (): UseUserRoleReturn => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>(['user']);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoles = async () => {
    if (!user) {
      setRoles(['user']);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user roles:', error);
        setRoles(['user']);
      } else if (data && data.length > 0) {
        setRoles(data.map(r => r.role as AppRole));
      } else {
        setRoles(['user']);
      }
    } catch (err) {
      console.error('Error in fetchRoles:', err);
      setRoles(['user']);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [user?.id]);

  const hasRole = (role: AppRole): boolean => roles.includes(role);

  // Get highest priority role
  const getHighestRole = (): AppRole => {
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('moderator')) return 'moderator';
    if (roles.includes('business')) return 'business';
    if (roles.includes('org')) return 'org';
    return 'user';
  };

  const isAdmin = hasRole('admin');
  const isModerator = hasRole('moderator');

  return {
    role: getHighestRole(),
    roles,
    isAdmin,
    isModerator,
    isBusiness: hasRole('business'),
    isOrg: hasRole('org'),
    isModeratorOrAdmin: isAdmin || isModerator,
    isLoading,
    hasRole,
    refetch: fetchRoles,
  };
};

// Permission helpers
export const PERMISSIONS = {
  // User permissions
  user: {
    canCreatePosts: true,
    canEditOwnPosts: true,
    canDeleteOwnPosts: true,
    canCreateOrders: true,
    canViewOwnOrders: true,
    canReport: true,
    canLikeAndComment: true,
  },
  // Org permissions (shelter/rescue)
  org: {
    canManageAdoptionListings: true,
    canUpdateAdoptionStatus: true,
    canViewAdoptionRequests: true,
  },
  // Business permissions (shop)
  business: {
    canManageProducts: true,
    canManageInventory: true,
    canCreateCoupons: true,
    canViewBusinessInsights: true,
  },
  // Moderator permissions
  moderator: {
    canViewReports: true,
    canHidePosts: true,
    canLockPosts: true,
    canFreezeComments: true,
    canWarnUsers: true,
    canModerate: true,
  },
  // Admin permissions (everything)
  admin: {
    canManageUsers: true,
    canManageAllContent: true,
    canManageOrders: true,
    canModerate: true,
    canViewReports: true,
    canManageRoles: true,
    canBlockUsers: true,
    canDeleteUsers: true,
    canViewAuditLog: true,
  },
} as const;

export const usePermissions = () => {
  const { role, hasRole, isModeratorOrAdmin } = useUserRole();

  const can = (permission: string): boolean => {
    // Admin has all permissions
    if (hasRole('admin')) return true;

    // Moderator has moderator + user permissions
    if (hasRole('moderator')) {
      if (permission in PERMISSIONS.moderator) {
        return PERMISSIONS.moderator[permission as keyof typeof PERMISSIONS.moderator];
      }
      if (permission in PERMISSIONS.user) {
        return PERMISSIONS.user[permission as keyof typeof PERMISSIONS.user];
      }
    }

    // Check role-specific permissions
    const rolePerms = PERMISSIONS[role as keyof typeof PERMISSIONS];
    if (rolePerms && permission in rolePerms) {
      return rolePerms[permission as keyof typeof rolePerms];
    }

    // Check inherited user permissions for all roles
    if (permission in PERMISSIONS.user) {
      return PERMISSIONS.user[permission as keyof typeof PERMISSIONS.user];
    }

    return false;
  };

  return { can, role, hasRole, isModeratorOrAdmin };
};
