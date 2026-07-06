import { useAwsAdminAuth } from "@/hooks/useAwsAdminAuth";

export const useAdmin = () => {
  const { isAdmin, loading, refetch } = useAwsAdminAuth();

  return { isAdmin, loading, refreshAdminStatus: refetch };
};
