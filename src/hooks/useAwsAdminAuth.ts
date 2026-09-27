import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateAdminTwoFactor,
  changeAdminPassword,
  getCurrentAdmin,
  loginAdmin,
  logoutAdmin,
  MipoAdmin,
  verifyAdminTwoFactor,
} from "@/lib/mipoApi";

export const adminSessionQueryKey = ["aws-admin-session"] as const;

export const useAwsAdminAuth = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: adminSessionQueryKey,
    queryFn: getCurrentAdmin,
    retry: false,
    staleTime: 60 * 1000,
  });

  const login = useCallback(async (email: string, password: string) => {
    const admin = await loginAdmin(email, password);
    queryClient.setQueryData<MipoAdmin | null>(adminSessionQueryKey, admin);
    return admin;
  }, [queryClient]);

  const logout = useCallback(async () => {
    await logoutAdmin();
    queryClient.clear();
    queryClient.setQueryData<MipoAdmin | null>(adminSessionQueryKey, null);
  }, [queryClient]);

  const updatePassword = useCallback(async (password: string) => {
    await changeAdminPassword(password);
    queryClient.clear();
    queryClient.setQueryData<MipoAdmin | null>(adminSessionQueryKey, null);
  }, [queryClient]);

  // Both of these finish on the session the admin already holds, so the
  // cached admin is patched in place rather than cleared.
  const activateTwoFactor = useCallback(async (code: string) => {
    const recoveryCodes = await activateAdminTwoFactor(code);
    queryClient.setQueryData<MipoAdmin | null>(adminSessionQueryKey, (current) =>
      current
        ? {
          ...current,
          mfa_enrolled: true,
          mfa_verified: true,
          mfa_enrollment_prompt: false,
        }
        : current);
    return recoveryCodes;
  }, [queryClient]);

  const verifyTwoFactor = useCallback(async (code: string) => {
    const result = await verifyAdminTwoFactor(code);
    queryClient.setQueryData<MipoAdmin | null>(adminSessionQueryKey, (current) =>
      current ? { ...current, mfa_verified: true } : current);
    return result;
  }, [queryClient]);

  const admin = query.data || null;
  // A session that still owes a code is signed in, but it is not an admin
  // the panel will render. With the flag off the server reports mfa_verified
  // true, so this stays "whoever has a session".
  const needsTwoFactor = Boolean(admin?.mfa_enabled && admin.mfa_verified === false);

  return {
    admin,
    isAdmin: Boolean(admin) && !needsTwoFactor,
    hasAdminSession: Boolean(admin),
    needsTwoFactor,
    loading: query.isLoading,
    error: query.error,
    login,
    logout,
    updatePassword,
    activateTwoFactor,
    verifyTwoFactor,
    refetch: query.refetch,
  };
};
