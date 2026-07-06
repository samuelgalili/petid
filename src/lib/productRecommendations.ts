import { getShopProducts, type MipoProduct } from "@/lib/mipoApi";

export interface RecommendedProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  image_url: string;
  category: string | null;
  pet_type: string | null;
  brand?: string | null;
  safety_score?: number | null;
  source?: "manual" | "scraped";
}

export interface ProductRecommendationOptions {
  petType?: string | null;
  keywords?: string[];
  limit?: number;
  products?: MipoProduct[];
  fallbackToPetProducts?: boolean;
}

const toNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/[₪,]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const normalize = (value: unknown): string => String(value || "").trim().toLowerCase();

const productSearchText = (product: RecommendedProduct): string => (
  [
    product.name,
    product.description,
    product.category,
    product.brand,
  ]
    .map(normalize)
    .join(" ")
);

export const normalizeMipoProduct = (product: MipoProduct): RecommendedProduct => {
  const price = toNumber(product.sale_price ?? product.price) ?? toNumber(product.price) ?? 0;
  const salePrice = toNumber(product.sale_price ?? null);
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price,
    sale_price: salePrice,
    image_url: product.image_url || product.images?.[0] || "/placeholder.svg",
    category: product.category,
    pet_type: product.pet_type || null,
    brand: product.brand,
    safety_score: product.safety_score,
    source: product.source,
  };
};

export const matchesPetType = (product: RecommendedProduct, petType?: string | null): boolean => {
  if (!petType || !product.pet_type) return true;
  const productPetType = normalize(product.pet_type);
  const requestedPetType = normalize(petType);
  return productPetType === requestedPetType || productPetType === "all" || productPetType === "both";
};

export const matchesKeywords = (product: RecommendedProduct, keywords: string[] = []): boolean => {
  const normalizedKeywords = keywords.map(normalize).filter(Boolean);
  if (normalizedKeywords.length === 0) return true;
  const searchText = productSearchText(product);
  return normalizedKeywords.some((keyword) => searchText.includes(keyword));
};

export async function fetchRecommendedProducts({
  petType,
  keywords = [],
  limit = 12,
  products,
  fallbackToPetProducts = true,
}: ProductRecommendationOptions = {}): Promise<RecommendedProduct[]> {
  const sourceProducts = products || await getShopProducts();
  const normalizedProducts = sourceProducts
    .filter((product) => product.in_stock !== false)
    .map(normalizeMipoProduct)
    .filter((product) => product.name && product.price > 0 && matchesPetType(product, petType));

  const keywordMatches = normalizedProducts.filter((product) => matchesKeywords(product, keywords));
  const selectedProducts = keywordMatches.length > 0 || !fallbackToPetProducts
    ? keywordMatches
    : normalizedProducts;
  return selectedProducts.slice(0, limit);
}

export async function fetchRecommendedProductGroups(
  groups: Array<ProductRecommendationOptions & { key: string; label?: string }>,
): Promise<Record<string, RecommendedProduct[]>> {
  const products = await getShopProducts();
  const entries = await Promise.all(groups.map(async (group) => [
    group.key,
    await fetchRecommendedProducts({ ...group, products }),
  ] as const));
  return Object.fromEntries(entries);
}
