// Owner-facing feeding guidance has exactly one source: the product's own
// feeding guide, repeated verbatim, with its provenance stated.
//
// Four calculations used to compete for this. Three multiplied body weight by a
// percentage — 2%, 2.5%, 3%, 4% depending on the screen — and one of those
// rendered under a heading that said the number came from the manufacturer. It
// came from a constant, and when the owner had given no weight it substituted
// the midpoint of the breed's published weight range.
//
// These tests pin what replaced them. The module is TypeScript; this suite
// exercises the same rules against a faithful port, the convention
// petSafetyScore.test.js established.

import assert from "node:assert/strict";
import test from "node:test";

// --- port of src/lib/feedingGuidance.ts ---

const KNOWN_SOURCES = ["ai_extracted", "manufacturer_confirmed", "unknown"];

const normalizeFeedingGuideSource = (value) => (
  KNOWN_SOURCES.includes(value) ? value : "unknown"
);

const entryToLine = (entry) => {
  if (typeof entry === "string") return entry.trim();
  if (typeof entry === "number") return String(entry);
  if (!entry || typeof entry !== "object") return "";
  const text = (key) => (typeof entry[key] === "string" ? entry[key].trim() : "");
  const range = text("range") || text("weight") || text("weight_range");
  const amount = text("amount") || text("grams") || text("quantity");
  if (range && amount) return `${range}: ${amount}`;
  if (amount) return amount;
  if (range) return range;
  return text("text") || text("title") || text("label") || text("value");
};

const readFeedingGuidance = (product) => {
  if (!product) return null;
  const raw = Array.isArray(product.feeding_guide)
    ? product.feeding_guide
    : product.feeding_guide ? [product.feeding_guide] : [];
  const lines = raw.map(entryToLine).filter(Boolean);
  if (lines.length === 0) return null;
  return { lines, source: normalizeFeedingGuideSource(product.feeding_guide_source) };
};

const feedingGuidanceSourceLabelHe = (source) => (
  source === "manufacturer_confirmed" ? "הנחיות יצרן" : "מידע שחולץ מדף המוצר"
);

// --- nothing is invented ---

test("a product with no feeding guide produces no guidance at all", () => {
  // Not a zero, not a placeholder, not a percentage of body weight. Nothing.
  assert.equal(readFeedingGuidance({ feeding_guide: [] }), null);
  assert.equal(readFeedingGuidance({ feeding_guide: null }), null);
  assert.equal(readFeedingGuidance({}), null);
  assert.equal(readFeedingGuidance(null), null);
});

test("guidance never depends on the pet's weight", () => {
  // The whole shape of the old bug: a number that changed with body weight and
  // was presented as the product's guidance. The resolver takes only a product.
  const product = { feeding_guide: ["10-20 ק\"ג: 200 גרם"], feeding_guide_source: "ai_extracted" };
  assert.deepEqual(readFeedingGuidance(product), readFeedingGuidance({ ...product }));
  assert.equal(readFeedingGuidance.length, 1);
});

test("entries that carry no readable text are dropped, not rendered blank", () => {
  const guidance = readFeedingGuidance({
    feeding_guide: [{ unrelated: "x" }, "", null, "2 כוסות ביום"],
  });
  assert.deepEqual(guidance.lines, ["2 כוסות ביום"]);
});

// --- the real shapes the column holds ---

test("reads the {range, amount} shape the import pipeline writes", () => {
  // asTextList on the product page looked only for text/title/label/value, so
  // every one of these collapsed to "" and the section never rendered.
  const guidance = readFeedingGuidance({
    feeding_guide: [{ range: "5-10 ק\"ג", amount: "120 גרם" }, { range: "10-20 ק\"ג", amount: "200 גרם" }],
    feeding_guide_source: "ai_extracted",
  });
  assert.deepEqual(guidance.lines, ["5-10 ק\"ג: 120 גרם", "10-20 ק\"ג: 200 גרם"]);
});

test("reads plain strings, which the admin form writes", () => {
  const guidance = readFeedingGuidance({ feeding_guide: ["2 כוסות ביום"] });
  assert.deepEqual(guidance.lines, ["2 כוסות ביום"]);
});

test("reads the text/title/label/value shape older rows use", () => {
  const guidance = readFeedingGuidance({ feeding_guide: [{ text: "לפי משקל" }, { title: "בוגרים" }] });
  assert.deepEqual(guidance.lines, ["לפי משקל", "בוגרים"]);
});

test("a single non-array value is still read", () => {
  assert.deepEqual(readFeedingGuidance({ feeding_guide: "3 מנות ביום" }).lines, ["3 מנות ביום"]);
});

// --- provenance ---

test("AI-extracted guidance is never labelled as the manufacturer's", () => {
  const guidance = readFeedingGuidance({
    feeding_guide: ["200 גרם"],
    feeding_guide_source: "ai_extracted",
  });
  assert.equal(guidance.source, "ai_extracted");
  const label = feedingGuidanceSourceLabelHe(guidance.source);
  assert.equal(label, "מידע שחולץ מדף המוצר");
  assert.ok(!label.includes("יצרן"));
});

test("only manufacturer_confirmed may claim the manufacturer", () => {
  assert.equal(feedingGuidanceSourceLabelHe("manufacturer_confirmed"), "הנחיות יצרן");
});

test("an unset provenance is treated as unconfirmed, not as the manufacturer's", () => {
  // The conservative direction: absence of evidence is not evidence of a
  // manufacturer's blessing.
  const guidance = readFeedingGuidance({ feeding_guide: ["200 גרם"] });
  assert.equal(guidance.source, "unknown");
  assert.ok(!feedingGuidanceSourceLabelHe(guidance.source).includes("יצרן"));
});

test("an unrecognised provenance value falls back to unknown", () => {
  // A caller cannot smuggle a claim through by inventing a source string.
  const guidance = readFeedingGuidance({
    feeding_guide: ["200 גרם"],
    feeding_guide_source: "manufacturer",
  });
  assert.equal(guidance.source, "unknown");
});

test("internal enum names are never the label shown to an owner", () => {
  for (const source of KNOWN_SOURCES) {
    const label = feedingGuidanceSourceLabelHe(source);
    assert.ok(!label.includes("_"));
    assert.ok(!label.includes(source));
  }
});
