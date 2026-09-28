import { useQuery } from "@tanstack/react-query";
import { getPublicShopProducts } from "@/lib/mipoApi";

/** Ids the public shop is willing to sell right now. Hidden products are absent. */
export function usePublicCatalogueIds() {
  return useQuery({
    queryKey: ["public-shop-product-ids"],
    queryFn: async () => (await getPublicShopProducts()).map((product) => product.id),
    staleTime: 60_000,
  });
}
