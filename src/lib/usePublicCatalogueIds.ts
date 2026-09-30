import { useQuery } from "@tanstack/react-query";
import { fetchAllCatalogueIds } from "@/lib/cartCatalogue";
import { getShopProductsPage } from "@/lib/mipoApi";

/**
 * Ids the public shop is willing to sell right now. Hidden products are absent.
 * The list is paged at 200, so this follows every page. A cart line past the
 * first page is still a product the shop will sell.
 */
export function usePublicCatalogueIds() {
  return useQuery({
    queryKey: ["public-shop-product-ids"],
    queryFn: () => fetchAllCatalogueIds(getShopProductsPage),
    staleTime: 60_000,
  });
}
