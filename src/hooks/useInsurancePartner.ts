import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to fetch the dynamic insurance partner name from admin settings.
 * Falls back to "Insurance Partner" if not configured.
 */
export const useInsurancePartner = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["insurance-partner-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_partner_settings" as any)
        .select("*")
        .limit(1)
        .maybeSingle();
      return data as any as {
        partner_name: string;
        api_endpoint: string | null;
        is_active: boolean;
        share_default_off: boolean;
      } | null;
    },
    staleTime: 1000 * 60 * 10,
  });

  return {
    partnerName: data?.partner_name || "Insurance Partner",
    apiEndpoint: data?.api_endpoint || null,
    isActive: data?.is_active ?? true,
    shareDefaultOff: data?.share_default_off ?? true,
    isLoading,
  };
};
