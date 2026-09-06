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

  // Both of these complete on the session the admin already holds, so the
  // cached admin is patched in place rather than cleared: nothing signs them
  // out between proving the factor and reaching the panel.
  const activateTwoFactor = useCallback(async (code: string) => {
    const recoveryCodes = await activateAdminTwoFactor(code);
    queryClient.setQueryData<MipoAdmin | null>(adminSessionQueryKey, (current) =>
      current ? { ...current, mfa_enrolled: true, mfa_verified: true } : current);
    return recoveryCodes;
  }, [queryClient]);

  const verifyTwoFactor = useCallback(async (code: string) => {
    const result = await verifyAdminTwoFactor(code);
    queryClient.setQueryData<MipoAdmin | null>(adminSessionQueryKey, (current) =>
      current ? { ...current, mfa_verified: true } : current);
    return result;
  }, [queryClient]);

  const admin = query.data || null;

  return {
    admin,
    // A session that has not proven its second factor is signed in but not an
    // admin yet: every panel route must treat it as unauthenticated.
    isAdmin: Boolean(admin?.mfa_verified),
    hasAdminSession: !!admin,
    needsTwoFactor: Boolean(admin && !admin.mfa_verified),
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
