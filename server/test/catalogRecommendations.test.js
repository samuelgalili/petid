import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCatalogSearch,
  buildDryFoodSearch,
  FOOD_CARD_LIMIT,
  foodSearchIntent,
  productSearchTerms,
  resolveCatalogProducts,
  rowMatchesLifeStage,
  toRecommendationCard,
} from "../src/catalogRecommendations.js";

test("reads the model's product output as search terms", () => {
  assert.deepEqual(
    productSearchTerms(["  מזון יבש  ", { name: "חטיפי אילוף" }, { query: "רתמה" }]),
    ["מזון יבש", "חטיפי אילוף", "רתמה"],
  );
});

test("drops empty, too-short and duplicate terms", () => {
  assert.deepEqual(
    productSearchTerms(["Harness", "harness", "", "x", null, { name: "   " }, "HARNESS"]),
    ["Harness"],
  );
});

test("caps the number of terms", () => {
  const terms = productSearchTerms(["a1", "b2", "c3", "d4", "e5", "f6", "g7", "h8"]);
  assert.equal(terms.length, 6);
});

test("a fabricated price or id in the model's output is never carried over", () => {
  // The model may return a whole invented product. Only its name survives, and
  // only as something to search for.
  assert.deepEqual(
    productSearchTerms([{ id: "not-a-real-id", name: "Royal Canin", price: 149.9, sku: "RC-001" }]),
    ["Royal Canin"],
  );
});

test("escapes LIKE metacharacters so a term cannot widen the search", () => {
  const { values } = buildCatalogSearch(productSearchTerms(["100%_pure"]), null);
  assert.deepEqual(values[0], ["%100\\%\\_pure%"]);
});

test("filters by pet type only when it is a known one", () => {
  const withPet = buildCatalogSearch(["harness"], "dog");
  assert.match(withPet.sql, /p\.pet_type = \$2::public\.pet_type/);
  assert.equal(withPet.values[1], "dog");
  assert.equal(withPet.values[2], 6);

  const withoutPet = buildCatalogSearch(["harness"], "dragon");
  assert.doesNotMatch(withoutPet.sql, /pet_type/);
  assert.equal(withoutPet.values[1], 6);
});

test("only in-stock catalogue rows are searched", () => {
  const { sql } = buildCatalogSearch(["harness"], null);
  assert.match(sql, /coalesce\(p\.in_stock, true\) = true/);
  assert.match(sql, /from public\.business_products/);
  // Raw import rows have no publication state, so the assistant must not reach them.
  assert.doesNotMatch(sql, /scraped_products/);
});

test("a card carries only what the catalogue row said", () => {
  const card = toRecommendationCard({
    id: "b1e0a5f4-0000-4000-8000-000000000001",
    name: "רתמה לכלב",
    price: "89.90",
    sale_price: null,
    image_url: "/uploads/harness.webp",
    category: "אביזרים",
    sku: "HRN-01",
    brand: "Mipo",
    in_stock: true,
    cost_price: "40.00",
    supplier_id: "secret",
  });

  assert.equal(card.price, 89.9);
  assert.equal(card.sku, "HRN-01");
  assert.equal(Object.hasOwn(card, "cost_price"), false);
  assert.equal(Object.hasOwn(card, "supplier_id"), false);
});

test("no terms means no query and no products", async () => {
  const pool = { query: () => assert.fail("the catalogue must not be queried without a search") };
  assert.deepEqual(await resolveCatalogProducts(pool, []), []);
  assert.deepEqual(await resolveCatalogProducts(pool, [{ id: "abc", price: 10 }]), []);
});

test("resolves the search against the catalogue", async () => {
  const calls = [];
  const pool = {
    query: async (sql, values) => {
      calls.push({ sql, values });
      return {
        rows: [{
          id: "b1e0a5f4-0000-4000-8000-000000000002",
          name: "מזון יבש לגורים",
          price: "129.00",
          sale_price: "99.00",
          image_url: "/uploads/food.webp",
          category: "מזון",
          sku: "FD-02",
          brand: "Mipo",
          in_stock: true,
        }],
      };
    },
  };

  const products = await resolveCatalogProducts(
    pool,
    [{ name: "רתמה", price: 999, id: "invented" }],
    { petType: "dog" },
  );

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].values[0], ["%רתמה%"]);
  assert.equal(products.length, 1);
  assert.equal(products[0].name, "מזון יבש לגורים");
  assert.equal(products[0].price, 129);
  assert.equal(products[0].sale_price, 99);
});

// Field for field what the live catalogue holds, measured on the public
// product list: category is the code dry-food, life_stage is גור / בוגר /
// מבוגר or empty, and the Hebrew shopping phrase is not a substring of
// name, brand, or category. "גורים" is in some names. "dry-food" is the category.
const liveShaped = [
  {
    id: "puppy-name",
    name: "גארד כלבים גורים ואימהות 3 ק\"ג",
    brand: "גארד",
    category: "dry-food",
    life_stage: null,
    pet_type: "dog",
    price: "120.00",
    image_url: "/uploads/puppy.jpg",
    description: "מזון יבש לגורי כלבים",
  },
  {
    id: "puppy-stage",
    name: "קוואטרו ג'וניור (גורים) ברווז ללא דגנים 12 ק\"ג",
    brand: "Quattro",
    category: "dry-food",
    life_stage: "גור",
    pet_type: "dog",
    price: "200.00",
    image_url: "/uploads/junior.jpg",
    product_attributes: { "שלב בחיים": "גור" },
  },
  {
    id: "puppy-desc",
    name: "קוואטרו כלבים מיני ללא דגנים ברווז 1.5 ק\"ג",
    brand: "Quattro",
    category: "dry-food",
    life_stage: null,
    pet_type: "dog",
    price: "80.00",
    image_url: "/uploads/mini.jpg",
    description: "קוואטרו כלבים מיני ג׳וניור ברווז ללא דגנים. מזון יבש מלא לגורי כלבים",
  },
  {
    id: "kitten",
    name: "קוואטרו חתולים קיטן עוף 1.5 ק\"ג",
    brand: "Quattro",
    category: "dry-food",
    life_stage: null,
    pet_type: "cat",
    price: "70.00",
    image_url: "/uploads/kitten.jpg",
  },
  {
    id: "puppy-extra",
    name: "גארד פלוס כלבים גורים 14 ק\"ג",
    brand: "גארד",
    category: "dry-food",
    life_stage: null,
    pet_type: "dog",
    price: "180.00",
    image_url: "/uploads/puppy-14.jpg",
  },
  {
    id: "puppy-fifth",
    name: "גארד פלוס כלב גור עוף ואורז 14 קג",
    brand: "גארד",
    category: "dry-food",
    life_stage: null,
    pet_type: "dog",
    price: "175.00",
    image_url: "/uploads/puppy-5.jpg",
  },
  {
    id: "adult",
    name: "קוואטרו כלב בוגר מיני אקסטרה עוף 7 ק\"ג",
    brand: "Quattro",
    category: "dry-food",
    life_stage: "בוגר",
    pet_type: "dog",
    price: "90.00",
    image_url: "/uploads/adult.jpg",
    product_attributes: { "שלב בחיים": "בוגר" },
  },
  {
    id: "senior",
    name: "קוואטרו חתול סניור ללא דג לבן וקריל 1.5 ק\"ג",
    brand: "Quattro",
    category: "dry-food",
    life_stage: "מבוגר",
    pet_type: "cat",
    price: "95.00",
    image_url: "/uploads/senior.jpg",
    description: "למי המזון לא מתאים? כלבים גורים או צעירים מאוד",
  },
  {
    id: "treat",
    name: "חטיף סלמון",
    brand: "Mipo",
    category: "treats",
    life_stage: null,
    pet_type: "dog",
    price: "20.00",
    image_url: "/uploads/treat.jpg",
  },
];

const phraseMissesRow = (phrase, row) => {
  const haystack = [row.name, row.brand, row.category].join("\n");
  return !haystack.includes(phrase);
};

test("a dry-food phrase maps to the dry-food category and a life stage", () => {
  for (const phrase of ["מזון יבש לגור", "אוכל לגור", "מזון יבש לגורים", "מזון לגורים"]) {
    const intent = foodSearchIntent([phrase]);
    assert.equal(intent.lifeStage, "puppy", phrase);
    assert.equal(intent.fallbackTerms.includes("יבש"), false, phrase);
    assert.equal(intent.fallbackTerms.includes("לגור"), false, phrase);
    assert.equal(intent.fallbackTerms.includes("לגורים"), false, phrase);
  }
  assert.equal(foodSearchIntent(["קיבלה"]).lifeStage, null);
  assert.equal(foodSearchIntent(["קיבלה"]).fallbackTerms.includes("קיבלה"), true);
  assert.equal(foodSearchIntent(["מזון לחתולים"]).species, "cat");
  assert.equal(foodSearchIntent(["מזון לחתולים"]).lifeStage, null);
  assert.equal(foodSearchIntent(["מזון יבש לבוגר"]).lifeStage, "adult");
  assert.equal(foodSearchIntent(["מזון יבש למבוגר"]).lifeStage, "senior");
  assert.equal(foodSearchIntent(["אוכל יבש"]).lifeStage, null);
  assert.equal(foodSearchIntent(["גורים"]), null);
  assert.equal(foodSearchIntent(["חטיף"]), null);
  assert.equal(foodSearchIntent(["רתמה"]), null);

  const search = buildDryFoodSearch("dog");
  assert.match(search.sql, /business_products/);
  assert.match(search.sql, /lower\(btrim\(coalesce\(p\.category, ''\)\)\) = \$1/);
  assert.equal(search.values[0], "dry-food");
  assert.equal(search.values[1], "dog");
  assert.doesNotMatch(search.sql, /מזון יבש לגור/);
});

test("puppy dry food is chosen from live-shaped rows, and the Hebrew phrase matches none of them", async () => {
  for (const phrase of ["מזון יבש לגור", "אוכל לגור", "מזון יבש לגורים"]) {
    for (const row of liveShaped) {
      assert.equal(phraseMissesRow(phrase, row), true, `${phrase} in ${row.name}`);
    }
  }
  assert.equal(liveShaped.filter((row) => row.category === "dry-food").length > 0, true);
  assert.equal(rowMatchesLifeStage(liveShaped.find((row) => row.id === "adult"), "puppy"), false);
  assert.equal(rowMatchesLifeStage(liveShaped.find((row) => row.id === "senior"), "puppy"), false);
  assert.equal(rowMatchesLifeStage(liveShaped.find((row) => row.id === "senior"), "adult"), false);
  assert.equal(rowMatchesLifeStage(liveShaped.find((row) => row.id === "adult"), "adult"), true);
  assert.equal(rowMatchesLifeStage(liveShaped.find((row) => row.id === "senior"), "senior"), true);
  assert.equal(rowMatchesLifeStage(liveShaped.find((row) => row.id === "puppy-desc"), "puppy"), true);

  const calls = [];
  const pool = {
    query: async (sql, values) => {
      calls.push({ sql, values });
      return { rows: liveShaped };
    },
  };
  const cards = await resolveCatalogProducts(pool, ["מזון יבש לגור"], { petType: "dog" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].values[0], "dry-food");
  assert.equal(calls[0].values.includes("dog"), true);
  assert.equal(cards.length, FOOD_CARD_LIMIT);
  assert.equal(cards.length <= 4, true);
  assert.deepEqual(cards.map((card) => card.category), ["dry-food", "dry-food", "dry-food", "dry-food"]);
  for (const card of cards) {
    assert.equal(card.pet_type, undefined);
    assert.equal(["puppy-name", "puppy-stage", "puppy-desc", "puppy-extra"].includes(card.id), true, card.name);
    assert.notEqual(card.id, "puppy-fifth");
  }
  assert.equal(cards.some((card) => card.id === "adult"), false);
  assert.equal(cards.some((card) => card.id === "kitten"), false);
  assert.equal(cards.some((card) => card.id === "treat"), false);
});

test("cat food and an empty dry-food result use species and the word fallback", async () => {
  const calls = [];
  const pool = {
    query: async (sql, values) => {
      calls.push({ sql, values });
      if (String(values[0]).includes("dry-food") || values[0] === "dry-food") return { rows: liveShaped };
      return {
        rows: [{
          id: "word",
          name: "מזון כללי",
          price: "10.00",
          image_url: "/uploads/word.jpg",
          category: "מזון",
          brand: "Mipo",
        }],
      };
    },
  };
  const cats = await resolveCatalogProducts(pool, ["מזון לחתולים"]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].values.includes("cat"), true);
  assert.deepEqual(cats.map((card) => card.id), ["kitten", "senior"]);

  calls.length = 0;
  const empty = {
    query: async (sql, values) => {
      calls.push({ sql, values });
      if (values[0] === "dry-food") return { rows: [] };
      return {
        rows: [{
          id: "word",
          name: "מזון כללי",
          price: "10.00",
          image_url: "/uploads/word.jpg",
          category: "מזון",
          brand: "Mipo",
        }],
      };
    },
  };
  const expanded = await resolveCatalogProducts(empty, ["מזון יבש לגור"]);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].values[0], "dry-food");
  assert.deepEqual(calls[1].values[0], ["%מזון%"]);
  assert.equal(JSON.stringify(calls[1].values).includes("יבש"), false);
  assert.equal(JSON.stringify(calls[1].values).includes("לגור"), false);
  assert.equal(expanded.length, 1);
  assert.equal(expanded[0].id, "word");
});

test("a catalogue failure costs the cards, not the reply", async () => {
  const pool = { query: async () => { throw new Error("relation does not exist"); } };
  assert.deepEqual(await resolveCatalogProducts(pool, ["מזון"]), []);
});
