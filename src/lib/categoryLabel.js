// One map for every category slug the catalogue knows about, plus the English
// import spellings that still arrive in `category` when `category_name` is
// empty. The product page is the shopper-facing caller. A name that is
// already Hebrew is left alone; an unknown English slug is not shown raw.

const CATEGORY_LABELS_HE = {
  // Tree slugs (product_categories.slug) and their Hebrew names.
  food: "מזון",
  "food-dry": "אוכל יבש",
  "food-wet": "אוכל רטוב",
  treats: "חטיפים",
  health: "בריאות",
  grooming: "טיפוח",
  toys: "צעצועים",
  beds: "מיטות",
  accessories: "אביזרים",
  other: "אחר",
  // Import spellings. dry-food is what the product page was printing.
  "dry-food": "מזון יבש",
  "dry food": "מזון יבש",
  "wet-food": "מזון רטוב",
  "wet food": "מזון רטוב",
  "canned food": "אוכל רטוב",
  supplements: "בריאות",
  vitamins: "בריאות",
  snacks: "חטיפים",
  collars: "אביזרים",
  leashes: "אביזרים",
};

const ENGLISH_SLUG = /^[a-z0-9]+(?:[-\s][a-z0-9]+)*$/i;

const text = (value) => String(value ?? "").trim();

export const displayCategoryLabel = (categoryName, category, categorySlug) => {
  const named = text(categoryName);
  if (named && !ENGLISH_SLUG.test(named)) return named;

  const candidates = [named, text(category), text(categorySlug)].filter(Boolean);
  for (const candidate of candidates) {
    const mapped = CATEGORY_LABELS_HE[candidate.toLowerCase()];
    if (mapped) return mapped;
  }

  const source = candidates[0] || "";
  if (!source || ENGLISH_SLUG.test(source)) return "";
  return source;
};
