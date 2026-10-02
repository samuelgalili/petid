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

import { isShopUnavailable, purchasableLegacySql } from "./shopVisibility.js";

const MAX_TERMS = 6;
const MAX_RESULTS = 6;
const MIN_TERM_LENGTH = 2;
const MAX_TERM_LENGTH = 60;
// Chat cards for a food question. The generic search stays at MAX_RESULTS.
export const FOOD_CARD_LIMIT = 4;
const DRY_FOOD_FETCH = 200;

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
    purchasableLegacySql("p"),
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
// The chat searches name, brand, and category with the whole phrase. In the
// live catalogue that phrase is not there: category is the code "dry-food",
// and "מזון יבש לגור" matches nothing. life_stage, when set, is גור / בוגר /
// מבוגר, and the same stage is often only in the name or the description.
//
// A phrase that means dry food is therefore a category search, narrowed by
// life stage and species. Single words, without יבש or לגור, are the fallback
// when that category search returns nothing. "מזון" alone is not in
// name/brand/category, so the fallback cannot replace the category mapping.
const DRY_FOOD_INTENT = /(?:מזון|אוכל)\s*יבש|קיבלה|(?:מזון|אוכל)\s+ל(?:גורים|גורי|גור|חתולים|חתול|כלבים|כלב)|dry[-\s]?food|\bkibble\b/i;
const PUPPY_TEXT = /גורים|גורי|לגורים|לגורי|(?<![\u0590-\u05FF])לגור(?![\u0590-\u05FF])|(?<![\u0590-\u05FF])גור(?![\u0590-\u05FF])|קיטן|גוניור|ג['\u05F3\u2019]?וניור|puppy|kitten|\bjunior\b/i;
const SENIOR_TEXT = /מבוגר|סניור|\bsenior\b/i;
const ADULT_TEXT = /(?<!מ)בוגר|אדולט|\badult\b/i;
const FALLBACK_DROP = new Set([
  "יבש", "לגור", "לגורים", "לגורי", "לחתול", "לחתולים", "לכלב", "לכלבים",
  "איזה", "איזו", "אילו",
]);

const LIFE_STAGE_COLUMNS = {
  puppy: ["גור", "puppy", "kitten"],
  adult: ["בוגר", "adult"],
  senior: ["מבוגר", "senior"],
};

const stageBlob = (row) => {
  const attributes = row?.product_attributes;
  const fromAttributes = attributes && typeof attributes === "object"
    ? `${attributes["שלב בחיים"] || ""} ${attributes["שלבי החיים"] || ""}`
    : "";
  return `${row?.life_stage || ""} ${fromAttributes}`;
};

const textHits = (pattern, value) => {
  const text = String(value || "");
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const expression = new RegExp(pattern.source, flags);
  let match = expression.exec(text);
  while (match) {
    const before = text.slice(Math.max(0, match.index - 24), match.index);
    if (!/לא\s*מתאים|אינו\s*מתאים/.test(before)) return true;
    match = expression.exec(text);
  }
  return false;
};

export const rowMatchesLifeStage = (row, lifeStage) => {
  if (!lifeStage) return true;
  const column = LIFE_STAGE_COLUMNS[lifeStage] || [];
  const recorded = stageBlob(row);
  if (lifeStage === "adult") {
    if (column.some((token) => recorded.split(/\s+/).includes(token))) return true;
    if (/(?<!מ)בוגר/.test(recorded) && !recorded.includes("מבוגר")) return true;
  } else if (column.some((token) => recorded.includes(token))) {
    return true;
  }
  const pattern = lifeStage === "puppy" ? PUPPY_TEXT : lifeStage === "senior" ? SENIOR_TEXT : ADULT_TEXT;
  return textHits(pattern, row?.name) || textHits(pattern, row?.description);
};

const rowMatchesSpecies = (row, species) => {
  if (!species) return true;
  const pet = String(row?.pet_type || "").trim().toLowerCase();
  if (pet === "all" || pet === species) return true;
  if (pet === "dog" || pet === "cat") return false;
  const blob = `${row?.name || ""} ${row?.description || ""}`;
  const saysCat = /חתול/.test(blob);
  const saysDog = /כלב/.test(blob);
  if (species === "cat") return saysCat && !saysDog;
  if (species === "dog") return saysDog && !saysCat;
  return false;
};

export const foodSearchIntent = (terms) => {
  const list = productSearchTerms(terms);
  const text = list.join(" ");
  if (!text || !DRY_FOOD_INTENT.test(text)) return null;
  let lifeStage = null;
  if (PUPPY_TEXT.test(text)) lifeStage = "puppy";
  else if (SENIOR_TEXT.test(text)) lifeStage = "senior";
  else if (ADULT_TEXT.test(text)) lifeStage = "adult";
  const cat = /חתול|\bcats?\b/i.test(text);
  const dog = /כלב|\bdogs?\b/i.test(text);
  const species = cat && !dog ? "cat" : dog && !cat ? "dog" : null;
  const fallbackTerms = [];
  const seen = new Set();
  for (const term of list) {
    for (const word of term.split(/\s+/)) {
      if (word.length < MIN_TERM_LENGTH || FALLBACK_DROP.has(word)) continue;
      const key = word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      fallbackTerms.push(word);
    }
  }
  return { lifeStage, species, fallbackTerms };
};

export const buildDryFoodSearch = (petType) => {
  const values = ["dry-food"];
  const where = [
    "coalesce(p.in_stock, true) = true",
    purchasableLegacySql("p"),
    "lower(btrim(coalesce(p.category, ''))) = $1",
  ];
  const pet = petTypeFilter(petType);
  if (pet) {
    values.push(pet);
    where.push(`(p.pet_type is null or p.pet_type = 'all' or p.pet_type = $${values.length}::public.pet_type)`);
  }
  values.push(DRY_FOOD_FETCH);
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

const isDryFoodRow = (row) => String(row?.category || "").trim().toLowerCase() === "dry-food";

const foodCardsFrom = (rows, intent) => {
  const matches = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!isDryFoodRow(row) || isShopUnavailable(row)) continue;
    if (!rowMatchesLifeStage(row, intent.lifeStage)) continue;
    if (!rowMatchesSpecies(row, intent.species)) continue;
    matches.push(row);
  }
  // A puppy question with no species still means a dog or a cat. Rabbit and
  // ferret rows stay available, behind those two.
  const ordered = intent.species
    ? matches
    : [
      ...matches.filter((row) => ["dog", "cat"].includes(String(row.pet_type || "").toLowerCase())),
      ...matches.filter((row) => !["dog", "cat"].includes(String(row.pet_type || "").toLowerCase())),
    ];
  const seen = new Set();
  const cards = [];
  for (const row of ordered) {
    const card = toRecommendationCard(row);
    const key = String(card.name || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    cards.push(card);
    if (cards.length >= FOOD_CARD_LIMIT) break;
  }
  return cards;
};

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

const cardsFromTermSearch = (rows) => {
  const seen = new Set();
  const cards = [];
  for (const row of rows.filter((item) => !isShopUnavailable(item)).map(toRecommendationCard)) {
    const key = String(row.name || "").trim().toLowerCase();
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    cards.push(row);
    if (cards.length >= FOOD_CARD_LIMIT) break;
  }
  return cards;
};

export const resolveCatalogProducts = async (pool, candidates, { petType = null } = {}) => {
  const terms = productSearchTerms(candidates);
  if (terms.length === 0) return [];

  const intent = foodSearchIntent(terms);

  // A catalogue that cannot answer must not take the whole reply down with it.
  // The assistant's answer is still useful without product cards; a 500 is not.
  try {
    if (intent) {
      const species = intent.species || petTypeFilter(petType);
      const primary = buildDryFoodSearch(species);
      const ranked = await pool.query(primary.sql, primary.values);
      const cards = foodCardsFrom(ranked.rows, { ...intent, species });
      if (cards.length > 0) return cards;
      if (intent.fallbackTerms.length === 0) return [];
      const expanded = buildCatalogSearch(intent.fallbackTerms, species);
      const again = await pool.query(expanded.sql, expanded.values);
      return cardsFromTermSearch(again.rows);
    }

    const { sql, values } = buildCatalogSearch(terms, petType);
    const result = await pool.query(sql, values);
    return result.rows.filter((row) => !isShopUnavailable(row)).map(toRecommendationCard);
  } catch {
    return [];
  }
};
