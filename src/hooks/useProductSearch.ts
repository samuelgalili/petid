import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProductFilters {
  category?: string;
  petType?: 'dog' | 'cat' | 'other';
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'name' | 'newest';
}

/**
 * Advanced product search hook with filters and pagination
 */
export const useProductSearch = (businessId?: string) => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState<ProductFilters>({});
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: searchResults, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['product-search', debouncedQuery, filters, page, businessId],
    queryFn: async () => {
      let queryBuilder = supabase
        .from('business_products')
        .select('*', { count: 'exact' });

      if (businessId) {
        queryBuilder = queryBuilder.eq('business_id', businessId);
      }

      if (debouncedQuery) {
        queryBuilder = queryBuilder.or(`name.ilike.%${debouncedQuery}%,description.ilike.%${debouncedQuery}%`);
      }

      if (filters.category) {
        queryBuilder = queryBuilder.eq('category', filters.category);
      }

      if (filters.petType) {
        queryBuilder = queryBuilder.eq('pet_type', filters.petType);
      }

      if (filters.minPrice !== undefined) {
        queryBuilder = queryBuilder.gte('price', filters.minPrice);
      }

      if (filters.maxPrice !== undefined) {
        queryBuilder = queryBuilder.lte('price', filters.maxPrice);
      }

      if (filters.inStock) {
        queryBuilder = queryBuilder.eq('in_stock', true);
      }

      if (filters.onSale) {
        queryBuilder = queryBuilder.not('sale_price', 'is', null);
      }

      // Sorting
      switch (filters.sortBy) {
        case 'price_asc':
          queryBuilder = queryBuilder.order('price', { ascending: true });
          break;
        case 'price_desc':
          queryBuilder = queryBuilder.order('price', { ascending: false });
          break;
        case 'name':
          queryBuilder = queryBuilder.order('name', { ascending: true });
          break;
        default:
          queryBuilder = queryBuilder.order('created_at', { ascending: false });
      }

      const from = (page - 1) * pageSize;
      queryBuilder = queryBuilder.range(from, from + pageSize - 1);

      const { data, error, count } = await queryBuilder;
      if (error) throw error;

      return {
        products: data || [],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        hasMore: (count || 0) > page * pageSize,
      };
    },
  });

  const search = useCallback((q: string) => {
    setQuery(q);
    setPage(1);
  }, []);

  const applyFilters = useCallback((newFilters: ProductFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setPage(1);
  }, []);

  const activeFiltersCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (key === 'sortBy') return false;
      return value !== undefined && value !== null;
    }).length;
  }, [filters]);

  return {
    query,
    filters,
    products: searchResults?.products || [],
    total: searchResults?.total || 0,
    totalPages: searchResults?.totalPages || 1,
    hasMore: searchResults?.hasMore || false,
    isLoading,
    isFetching,
    activeFiltersCount,
    search,
    applyFilters,
    clearFilters,
    refetch,
    setPage,
  };
};

export default useProductSearch;
