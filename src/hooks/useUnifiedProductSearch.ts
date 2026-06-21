import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UnifiedProduct {
  id: string;
  source: "business" | "normalized" | "scraped";
  name: string;
  brand: string | null;
  price: number | null;
  image_url: string | null;
  pet_type: string | null;
  category: string | null;
  in_stock: boolean;
  rank: number;
}

export interface UnifiedSearchParams {
  query?: string;
  petType?: "dog" | "cat" | "other";
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  enabled?: boolean;
}

/**
 * Single source of truth for product search across business / normalized / scraped.
 * Routes through the search_products_unified RPC.
 * Results are ranked: business → normalized → scraped.
 */
export function useUnifiedProductSearch(params: UnifiedSearchParams = {}) {
  const {
    query,
    petType,
    category,
    minPrice,
    maxPrice,
    limit = 24,
    enabled = true,
  } = params;

  return useQuery({
    queryKey: ["unified-product-search", { query, petType, category, minPrice, maxPrice, limit }],
    enabled,
    staleTime: 5 * 60 * 1000, // 5 min — catalog data
    gcTime: 15 * 60 * 1000,
    queryFn: async (): Promise<UnifiedProduct[]> => {
      const { data, error } = await supabase.rpc("search_products_unified", {
        p_query: query?.trim() || null,
        p_pet_type: petType ?? null,
        p_category: category ?? null,
        p_min_price: minPrice ?? null,
        p_max_price: maxPrice ?? null,
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as UnifiedProduct[];
    },
  });
}