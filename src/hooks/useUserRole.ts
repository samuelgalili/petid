import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";

export type AppRole = "user" | "org" | "business" | "moderator" | "admin";

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

const getRoleHint = (): AppRole[] => {
  try {
    if (localStorage.getItem("mipo_admin_session_hint") === "true") return ["admin"];
  } catch {
    // Storage can be unavailable in private/browser-restricted contexts.
  }
  return ["user"];
};

export const useUserRole = (): UseUserRoleReturn => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>(["user"]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    setRoles(getRoleHint());
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const hasRole = (role: AppRole): boolean => roles.includes(role);
  const role: AppRole = roles.includes("admin") ? "admin" : roles.includes("business") ? "business" : "user";
  const isAdmin = hasRole("admin");
  const isModerator = hasRole("moderator");

  return {
    role,
    roles,
    isAdmin,
    isModerator,
    isBusiness: hasRole("business"),
    isOrg: hasRole("org"),
    isModeratorOrAdmin: isAdmin || isModerator,
    isLoading,
    hasRole,
    refetch: fetchRoles,
  };
};

export const PERMISSIONS = {
  user: {
    canCreateOrders: true,
    canViewOwnOrders: true,
    canReport: true,
  },
  org: {
    canManageAdoptionListings: false,
    canUpdateAdoptionStatus: false,
    canViewAdoptionRequests: false,
  },
  business: {
    canManageProducts: false,
    canManageInventory: false,
    canCreateCoupons: false,
    canViewBusinessInsights: false,
  },
  moderator: {
    canModerate: false,
  },
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
    if (hasRole("admin")) return true;
    const rolePerms = PERMISSIONS[role as keyof typeof PERMISSIONS] as Record<string, boolean> | undefined;
    if (rolePerms && permission in rolePerms) return rolePerms[permission];
    return permission in PERMISSIONS.user ? PERMISSIONS.user[permission as keyof typeof PERMISSIONS.user] : false;
  };

  return { can, role, hasRole, isModeratorOrAdmin };
};
