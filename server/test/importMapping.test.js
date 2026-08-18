import assert from "node:assert/strict";
import { test } from "node:test";

import {
  extractSize,
  isValidGtin13,
  mapRow,
  normalizeBoolean,
  normalizeCurrency,
  normalizeDate,
  normalizeNumber,
  normalizeUnit,
  repairImagePath,
  suggestTargetField,
  variantGroupKey,
} from "../src/importMapping.js";
import { deriveRowFacts, validateRow } from "../src/importMapRun.js";

test("a column is proposed only when its meaning is clear", () => {
  assert.equal(suggestTargetField('מק"ט'), "sku");
  assert.equal(suggestTargetField("מק״ט"), "sku", "the same column with a gershayim is the same column");
  assert.equal(suggestTargetField("תאור"), "name");
  assert.equal(suggestTargetField('מחיר בסיס כולל מע"מ'), "list_price_inc_vat");
  assert.equal(suggestTargetField('עלות ש"ח'), "cost");

  // Guessing here is worse than leaving it for a person.
  assert.equal(suggestTargetField("פרמטר 12 למוצר"), null);
  assert.equal(suggestTargetField("מאפיין סופר פארם"), null);
});

test("list price and cost are never collapsed into one price", () => {
  assert.notEqual(suggestTargetField('מחיר בסיס כולל מע"מ'), suggestTargetField('עלות ש"ח'));
  assert.equal(suggestTargetField("מחיר קניה אחרון"), "last_purchase_price");
});

test("an absent number is null, not zero", () => {
  // A product with no price and a product priced at zero are different facts,
  // and the difference decides whether it can be published.
  assert.equal(normalizeNumber(null), null);
  assert.equal(normalizeNumber(""), null);
  assert.equal(normalizeNumber("לא מספר"), null);
  assert.equal(normalizeNumber(0), 0);
  assert.equal(normalizeNumber("1,234.5"), 1234.5);
  assert.equal(normalizeNumber("₪ 99.90"), 99.9);
});

test("an unrecognised currency is not guessed", () => {
  assert.equal(normalizeCurrency('ש"ח'), "ILS");
  assert.equal(normalizeCurrency("₪"), "ILS");
  assert.equal(normalizeCurrency("USD"), "USD");
  assert.equal(normalizeCurrency("דולר"), "USD");
  // Assuming shekels for a dollar price would silently change what it costs.
  assert.equal(normalizeCurrency("ABC"), null);
});

test("Israeli date order is read as written", () => {
  assert.equal(normalizeDate("03/04/2026").slice(0, 10), "2026-04-03", "03/04 is 3 April, not 4 March");
  assert.equal(normalizeDate(""), null);
  assert.equal(normalizeDate("not a date"), null);
});

test("Hebrew yes and no are booleans", () => {
  assert.equal(normalizeBoolean("כן"), true);
  assert.equal(normalizeBoolean("לא"), false);
  assert.equal(normalizeBoolean(""), null);
  assert.equal(normalizeBoolean("אולי"), null, "an unknown answer is unknown, not false");
});

test("the same unit spelled differently folds together", () => {
  // ק"ג appears 121 times in the reference file and קג another 42.
  assert.equal(normalizeUnit('ק"ג'), "kg");
  assert.equal(normalizeUnit("קג"), "kg");
  assert.equal(normalizeUnit("גרם"), "g");
  assert.equal(normalizeUnit("ליטר"), "l");
});

test("pack size is read out of the product name", () => {
  const kilos = extractSize('קוואטרו חתולים אדולט עוף 1.5 ק"ג');
  assert.equal(kilos.amount, 1.5);
  assert.equal(kilos.unit, "kg");

  const grams = extractSize("שיבולים צהובים בשק 250 גרם");
  assert.equal(grams.amount, 250);
  assert.equal(grams.unit, "g");
  assert.equal(grams.base_amount, 0.25, "grams and kilos have to be comparable");
  assert.equal(grams.base_unit, "kg");

  assert.equal(extractSize("מקל דבש לכנר בתוספת דבש"), null);
});

test("variants group by name and brand, never by barcode", () => {
  // In the reference file 4770107249959 is on both a 1.5kg and a 20kg bag, so
  // grouping by barcode would merge two different products.
  const small = variantGroupKey('קוואטרו חתולים אדולט עוף 1.5 ק"ג', "קוואטרו");
  const large = variantGroupKey('קוואטרו חתולים אדולט עוף 20 ק"ג', "קוואטרו");
  assert.equal(small, large, "the same product in two sizes is one group");

  const other = variantGroupKey('קוואטרו חתולים מעוקרים עוף 1.5 ק"ג', "קוואטרו");
  assert.notEqual(small, other, "a different product is a different group");
});

test("a barcode that fails its check digit is recognised", () => {
  assert.equal(isValidGtin13("4770107249959"), true);
  assert.equal(isValidGtin13("4770107249958"), false);
  assert.equal(isValidGtin13("038"), false, "not every code in the file is a GTIN");
});

test("an image path scrambled by text direction is rebuilt", () => {
  assert.equal(
    repairImagePath("jpg.שיבולים\\system\\mail\\25\\8\\l\\c\\ww5se0\\..\\.."),
    "..\\..\\system\\mail\\25\\8\\l\\c\\ww5se0\\שיבולים.jpg",
  );

  // The filename can end up touching the first path segment with no separator.
  assert.equal(
    repairImagePath("png.תוכי גדול system\\mail\\25\\8\\f\\o\\5h7ax6\\600\\..\\.."),
    "..\\..\\system\\mail\\25\\8\\f\\o\\5h7ax6\\600\\תוכי גדול.png",
  );

  const wellFormed = "..\\..\\system\\mail\\26\\6\\y\\t\\d7qplh\\image.jpeg";
  assert.equal(repairImagePath(wellFormed), wellFormed, "a path that is already right is left alone");
});

test("a column with data and no mapping is named, not dropped", () => {
  const raw = { 'מק"ט': "A1", "תאור": "מוצר", "עמודה לא ידועה": "יש כאן ערך", "ריקה": null };
  const mappings = [
    { source_field: 'מק"ט', target_kind: "identifier", target_field: "sku", value_type: "text" },
    { source_field: "תאור", target_kind: "domain", target_field: "name", value_type: "text" },
    { source_field: "עמודה לא ידועה", target_kind: "unmapped", target_field: null },
    { source_field: "ריקה", target_kind: "unmapped", target_field: null },
  ];

  const { normalized, unmappedWithData } = mapRow(raw, mappings);
  assert.equal(normalized.sku, "A1");
  assert.deepEqual(
    unmappedWithData,
    ["עמודה לא ידועה"],
    "only the column that actually carries a value is reported",
  );
});

test("an ignored column contributes nothing and raises nothing", () => {
  const raw = { "סטטוס": "פעיל" };
  const mappings = [{ source_field: "סטטוס", target_kind: "ignored", ignore_reason: "ערך יחיד" }];
  const { normalized, unmappedWithData } = mapRow(raw, mappings);
  assert.deepEqual(normalized, {});
  assert.deepEqual(unmappedWithData, [], "a decision already taken is not an open question");
});

test("a zero selling price counts as no price", () => {
  // More than half the reference catalogue writes 0 there while holding a cost.
  const derived = deriveRowFacts({ list_price_inc_vat: 0, list_price_ex_vat: 0, cost: 90.05 });
  assert.equal(derived.selling_price, undefined);
  assert.equal(derived.cost_price, 90.05);

  const { warnings } = validateRow({ sku: "A1", name: "מוצר" }, derived);
  assert.ok(warnings.some((warning) => warning.code === "MISSING_PRICE"));
});

test("a row missing identity fails, a row missing extras only needs review", () => {
  const noSku = validateRow({ name: "מוצר" }, {});
  assert.ok(noSku.errors.some((error) => error.code === "MISSING_SKU"));

  const complete = validateRow(
    { sku: "A1", name: "מוצר", brand: "מותג", image_path: "..\\a.jpg", supplier_name: "ספק" },
    { selling_price: 10 },
  );
  assert.deepEqual(complete.errors, []);
  assert.deepEqual(complete.warnings, [], "nothing missing means nothing to review");
});
