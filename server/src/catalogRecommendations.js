// Product cards the assistant shows a customer must come from the catalogue.
//
// The chat model is never given the catalogue. It cannot know a product id, a
// price, a SKU or whether anything is in stock -- so every field it writes in
// its `products` array is invented. Until now that array was passed through
// `normalizeAiProducts`, which trimmed strings and cast numbers, and rendered
// straight into a product card with a name and a price. A customer could be
// shown a product that does not exist, at a price nobody set.
//
// So the model's output is treated as a SEARCH, never as data. The names it
// proposes become keywords, the catalogue answers, and every field that reaches
// the customer is copied off the row that came back. When nothing matches, the
// reply carries no products at all -- which is the correct outcome, not a
// failure to recover from.
//
// Only business_products is searched. scraped_products holds raw import rows
// that no one has reviewed: they have no publication state yet, so the
// assistant must not be the thing that puts them in front of a customer.

const MAX_TERMS = 6;
const MAX_RESULTS = 6;
const MIN_TERM_LENGTH = 2;
const MAX_TERM_LENGTH = 60;

// Postgres LIKE metacharacters, plus the escape character itself. A product
// name the model proposes is untrusted text; '%' in it would otherwise widen
// the search to the whole catalogue.
const escapeLikeTerm = (term) => term.replace(/[\\%_]/g, "\\$&");

export const productSearchTerms = (candidates) => {
  const terms = [];
  const seen = new Set();

  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const raw = typeof candidate === "string"
      ? candidate
      : candidate?.name ?? candidate?.query ?? candidate?.search ?? "";

    const term = String(raw).replace(/\s+/g, " ").trim().slice(0, MAX_TERM_LENGTH);
    if (term.length < MIN_TERM_LENGTH) continue;

    const key = term.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    terms.push(term);
    if (terms.length >= MAX_TERMS) break;
  }

  return terms;
};

// The pet types a product may carry that are acceptable for this pet. 'all'
// and an unset pet_type both mean "suits any animal", so neither is filtered
// out -- a harness that fits every dog should not disappear because the row
// left the column null.
const petTypeFilter = (petType) => {
  const normalized = String(petType || "").trim().toLowerCase();
  return ["dog", "cat", "other"].includes(normalized) ? normalized : null;
};

export const buildCatalogSearch = (terms, petType) => {
  const values = [terms.map((term) => `%${escapeLikeTerm(term)}%`)];
  const where = [
    "coalesce(p.in_stock, true) = true",
    `(p.name ilike any($${values.length}::text[]) or coalesce(p.brand, '') ilike any($${values.length}::text[]) or coalesce(p.category, '') ilike any($${values.length}::text[]))`,
  ];

  const pet = petTypeFilter(petType);
  if (pet) {
    values.push(pet);
    where.push(`(p.pet_type is null or p.pet_type = 'all' or p.pet_type = $${values.length}::public.pet_type)`);
  }

  values.push(MAX_RESULTS);

  return {
    sql: `
      select p.*
      from public.business_products p
      where ${where.join(" and ")}
      order by coalesce(p.is_featured, false) desc, coalesce(p.safety_score, 0) desc, p.created_at desc, p.id
      limit $${values.length}
    `,
    values,
  };
};

// The card the customer sees. Every field is read off the catalogue row.
export const toRecommendationCard = (row) => ({
  id: row.id,
  name: row.name,
  price: row.price === null || row.price === undefined ? null : Number(row.price),
  sale_price: row.sale_price === null || row.sale_price === undefined ? null : Number(row.sale_price),
  image_url: row.image_url || null,
  category: row.category || null,
  sku: row.sku || null,
  brand: row.brand || null,
  in_stock: row.in_stock ?? true,
});

export const resolveCatalogProducts = async (pool, candidates, { petType = null } = {}) => {
  const terms = productSearchTerms(candidates);
  if (terms.length === 0) return [];

  const { sql, values } = buildCatalogSearch(terms, petType);

  // A catalogue that cannot answer must not take the whole reply down with it.
  // The assistant's answer is still useful without product cards; a 500 is not.
  try {
    const result = await pool.query(sql, values);
    return result.rows.map(toRecommendationCard);
  } catch {
    return [];
  }
};
