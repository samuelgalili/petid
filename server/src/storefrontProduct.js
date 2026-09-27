// The shop's first paint asks for the whole catalogue so search can run in the
// browser. The full public row also carries feeding instructions, supplier
// URLs and bookkeeping columns the grid and the search never read. This is
// the smaller shape. Callers that omit `view=storefront` still get the full
// public row, including admin screens.

export const STOREFRONT_PRODUCT_FIELDS = [
  "id",
  "name",
  "description",
  "price",
  "original_price",
  "sale_price",
  "image_url",
  "images",
  "category",
  "category_id",
  "category_slug",
  "category_name",
  "in_stock",
  "is_featured",
  "pet_type",
  "flavors",
  "brand",
  "weight_unit",
  "ingredients",
  "benefits",
  "product_attributes",
  "life_stage",
  "dog_size",
  "special_diet",
  "breed_tags",
  "medical_tags",
  "safety_score",
];

const DESCRIPTION_LIMIT = 700;
const IMAGE_LIMIT = 8;

const clip = (value) => {
  const text = String(value ?? "");
  if (text.length <= DESCRIPTION_LIMIT) return value;
  const cut = text.slice(0, DESCRIPTION_LIMIT);
  const space = cut.lastIndexOf(" ");
  const end = space >= 400 ? space : DESCRIPTION_LIMIT;
  return `${text.slice(0, end).trim()}…`;
};

export const pickStorefrontProduct = (product) => {
  const card = {};
  for (const field of STOREFRONT_PRODUCT_FIELDS) {
    if (!Object.hasOwn(product, field)) continue;
    if (field === "description") {
      card.description = clip(product.description);
      continue;
    }
    if (field === "images" && Array.isArray(product.images)) {
      card.images = product.images.slice(0, IMAGE_LIMIT);
      continue;
    }
    card[field] = product[field];
  }
  return card;
};

export const pageWindow = (products, { limit, offset } = {}) => {
  const total = products.length;
  if (limit === undefined || limit === null || limit === "") {
    return { products, total };
  }
  const size = Math.min(200, Math.max(1, Math.floor(Number(limit)) || 48));
  const start = Math.max(0, Math.floor(Number(offset) || 0));
  return {
    products: products.slice(start, start + size),
    total,
    limit: size,
    offset: start,
  };
};
