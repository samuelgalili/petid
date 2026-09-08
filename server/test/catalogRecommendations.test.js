import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCatalogSearch,
  productSearchTerms,
  resolveCatalogProducts,
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
    [{ name: "מזון לגורים", price: 999, id: "invented" }],
    { petType: "dog" },
  );

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].values[0], ["%מזון לגורים%"]);
  assert.equal(products.length, 1);
  assert.equal(products[0].name, "מזון יבש לגורים");
  assert.equal(products[0].price, 129);
  assert.equal(products[0].sale_price, 99);
});

test("a catalogue failure costs the cards, not the reply", async () => {
  const pool = { query: async () => { throw new Error("relation does not exist"); } };
  assert.deepEqual(await resolveCatalogProducts(pool, ["מזון"]), []);
});
