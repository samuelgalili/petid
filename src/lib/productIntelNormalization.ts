export interface NormalizedProductEnrichment {
  name?: string;
  description?: string;
  category?: string;
  dimensions?: string;
  sizes: string[];
  colors: string[];
  flavors: string[];
  benefits: string[];
  feedingGuide?: string;
  brandWebsite?: string;
  suggestedPrice?: number;
  salePrice?: number;
  priceReason?: string;
  petType?: string;
  imageSearchQuery?: string;
  imageUrl?: string;
  allImageUrls: string[];
  variants: { name: string; value: string; price?: number }[];
  weight?: string;
  weightUnit?: string;
  sku?: string;
  brand?: string;
}

const textKeys = ["title", "name", "label", "range", "url", "website"] as const;
const detailKeys = ["description", "amount", "value", "text"] as const;

export const normalizeProductIntelText = (value: unknown): string => {
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map(normalizeProductIntelText).filter(Boolean).join(", ");
  }
  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  const primary = textKeys.map((key) => normalizeProductIntelText(record[key])).find(Boolean) || "";
  const detail = detailKeys.map((key) => normalizeProductIntelText(record[key])).find(Boolean) || "";
  return [primary, detail].filter(Boolean).join(": ");
};

export const normalizeProductIntelTextList = (value: unknown): string[] => {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values.map(normalizeProductIntelText).filter(Boolean).slice(0, 100);
};

const normalizeNumber = (value: unknown): number | undefined => {
  if (value == null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const optionalText = (value: unknown) => normalizeProductIntelText(value) || undefined;

export const normalizeProductEnrichment = (value: unknown): NormalizedProductEnrichment => {
  const data = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const rawVariants = Array.isArray(data.variants) ? data.variants : [];

  return {
    name: optionalText(data.name),
    description: optionalText(data.description),
    category: optionalText(data.category),
    dimensions: optionalText(data.dimensions),
    sizes: normalizeProductIntelTextList(data.sizes),
    colors: normalizeProductIntelTextList(data.colors),
    flavors: normalizeProductIntelTextList(data.flavors),
    benefits: normalizeProductIntelTextList(data.benefits),
    feedingGuide: optionalText(data.feedingGuide ?? data.feeding_guide),
    brandWebsite: optionalText(data.brandWebsite ?? data.brand_website),
    suggestedPrice: normalizeNumber(data.suggestedPrice ?? data.suggested_price),
    salePrice: normalizeNumber(data.salePrice ?? data.sale_price),
    priceReason: optionalText(data.priceReason ?? data.price_reason),
    petType: optionalText(data.petType ?? data.pet_type),
    imageSearchQuery: optionalText(data.imageSearchQuery ?? data.image_search_query),
    imageUrl: optionalText(data.imageUrl ?? data.image_url),
    allImageUrls: normalizeProductIntelTextList(data.allImageUrls ?? data.all_image_urls ?? data.images),
    variants: rawVariants.map((variant) => {
      const record: Record<string, unknown> = variant && typeof variant === "object" && !Array.isArray(variant)
        ? variant as Record<string, unknown>
        : { name: variant };
      return {
        name: normalizeProductIntelText(record.name ?? record.label),
        value: normalizeProductIntelText(record.value ?? record.weight),
        price: normalizeNumber(record.price),
      };
    }).filter((variant) => variant.name || variant.value || variant.price != null),
    weight: optionalText(data.weight),
    weightUnit: optionalText(data.weightUnit ?? data.weight_unit),
    sku: optionalText(data.sku),
    brand: optionalText(data.brand),
  };
};
