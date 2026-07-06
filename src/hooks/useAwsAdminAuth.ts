import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentAdmin, loginAdmin, logoutAdmin, MipoAdmin } from "@/lib/mipoApi";

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
    queryClient.setQueryData<MipoAdmin | null>(adminSessionQueryKey, null);
  }, [queryClient]);

  return {
    admin: query.data || null,
    isAdmin: !!query.data,
    loading: query.isLoading,
    error: query.error,
    login,
    logout,
    refetch: query.refetch,
  };
};
