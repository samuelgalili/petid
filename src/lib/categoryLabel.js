// Shoppers were seeing the import slug ("dry-food") on the product page.
// The detail response often has no category_name, so the slug has to be
// translated here. A name that is already Hebrew is left alone.

const CATEGORY_LABELS_HE = {
  "dry-food": "מזון יבש",
  "dry food": "מזון יבש",
  "wet-food": "מזון רטוב",
  "wet food": "מזון רטוב",
  food: "מזון",
  treats: "חטיפים",
  toys: "צעצועים",
  accessories: "אביזרים",
  health: "בריאות",
  grooming: "טיפוח",
  other: "אחר",
};

const ENGLISH_SLUG = /^[a-z0-9]+(?:[-\s][a-z0-9]+)*$/i;

const text = (value) => String(value ?? "").trim();

export const displayCategoryLabel = (categoryName, category) => {
  const named = text(categoryName);
  const raw = text(category);
  if (named && !ENGLISH_SLUG.test(named)) return named;
  const source = named || raw;
  if (!source) return "";
  const mapped = CATEGORY_LABELS_HE[source.toLowerCase()];
  if (mapped) return mapped;
  if (ENGLISH_SLUG.test(source)) return "";
  return source;
};
