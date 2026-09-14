// G-1 · the legacy intake freeze.
//
// The freeze refuses exactly one thing: creating a new scraped-backed listing
// while the ownership review is outstanding. Everything else in the system has
// to carry on unchanged, so most of what is asserted here is what the guard
// does NOT do.
//
// The guard is a pure function over the request body, which is what makes it
// testable without a database, a server or a real import. The cost of that is
// that these tests prove the boundary's contract, not that createProduct calls
// it - the call site is one line, asserted separately in the smoke pass.

import assert from "node:assert/strict";
import test from "node:test";

import {
  assertLegacyIntakeAllowed,
  isLegacyIntakeFrozen,
  isScrapedBackedIntake,
  sourceHostForLog,
  LegacyIntakeFrozenError,
} from "../src/legacyIntakeFreeze.js";

const frozen = { frozen: true, warn: () => {} };
const thawed = { frozen: false, warn: () => {} };

const rejectsAsFrozen = (body, route = "POST /api/products") => {
  assert.throws(
    () => assertLegacyIntakeAllowed(body, route, frozen),
    (error) => {
      assert.ok(error instanceof LegacyIntakeFrozenError, "must be the freeze error");
      assert.equal(error.code, "LEGACY_INTAKE_FROZEN", "stable machine-readable code");
      assert.equal(error.statusCode, 409);
      return true;
    },
  );
};

const allows = (body) => assert.doesNotThrow(
  () => assertLegacyIntakeAllowed(body, "POST /api/products", frozen),
);

// ─── what is frozen ──────────────────────────────────────────────────────────

test("a scraped import is rejected", () => {
  rejectsAsFrozen({ name: "Kibble", price: 99, source_url: "https://supplier.example.com/p/1" });
});

test("every scraped-backed client path is rejected, because each one sends source_url", () => {
  // The five creation paths found in the audit. They differ in shape; what they
  // share is the provenance field, which is the whole basis of the guard.
  const payloads = {
    "product form dialog": { name: "A", source_url: "https://a.example.com/x" },
    "import wizard": { name: "B", source_url: "https://b.example.com/x" },
    "bulk URL import": { name: "C", source_url: "https://c.example.com/x" },
    "quick import": { name: "D", source_url: "https://d.example.com/x" },
    // Duplicating a scraped product spreads the original's fields, carrying
    // source_url forward. That duplicate is still scraped-backed.
    "duplicate of a scraped product": { name: "E (copy)", source_url: "https://e.example.com/x" },
  };
  for (const [label, body] of Object.entries(payloads)) {
    assert.throws(() => assertLegacyIntakeAllowed(body, "POST /api/products", frozen), label);
  }
});

test("whitespace around a source_url does not slip past the guard", () => {
  rejectsAsFrozen({ name: "Kibble", source_url: "   https://supplier.example.com/p/1   " });
});

test("a non-http source_url is still scraped-backed and still refused", () => {
  // The guard asks "did this come from somewhere else", not "is that a URL we
  // would fetch". An unparseable value must not become an escape hatch.
  rejectsAsFrozen({ name: "Kibble", source_url: "not-a-url-but-still-a-provenance-claim" });
});

// ─── what is deliberately NOT frozen ─────────────────────────────────────────

test("manual product creation remains allowed", () => {
  allows({ name: "Hand written", price: 42, feeding_guide_source: "manufacturer_confirmed" });
});

test("a spreadsheet import remains allowed, because it carries no provenance", () => {
  // CSV and Excel rows are parsed without a source column, so they are not
  // scraped-backed. Freezing them would broaden the freeze past its purpose.
  allows({ name: "From CSV", price: 30, sku: "CSV-1", category: "other", in_stock: true });
});

test("an empty, blank or null source_url is not a provenance claim", () => {
  for (const source_url of [null, undefined, "", "   "]) {
    allows({ name: "Manual", price: 10, source_url });
  }
});

test("the guard ignores every field except source_url", () => {
  // Nothing about ownership, supplier or image origin may influence the
  // decision - PD-39 forbids reading any of them as provenance of ownership.
  allows({
    name: "Manual",
    price: 10,
    business_id: "cf941cc4-e1d1-4d7c-8122-a5df81a1e53c",
    supplier_id: "11111111-1111-1111-1111-111111111111",
    image_source_url: "https://supplier.example.com/img.jpg",
    image_url: "/uploads/x.webp",
  });
});

test("nothing is refused once the freeze is lifted", () => {
  assert.doesNotThrow(
    () => assertLegacyIntakeAllowed({ source_url: "https://supplier.example.com/p/1" }, "r", thawed),
  );
});

// ─── the flag ────────────────────────────────────────────────────────────────

test("the freeze defaults to ON and only the exact string \"false\" lifts it", () => {
  const original = process.env.LEGACY_INTAKE_FROZEN;
  try {
    delete process.env.LEGACY_INTAKE_FROZEN;
    assert.equal(isLegacyIntakeFrozen(), true, "absent must mean frozen");

    for (const value of ["", "FALSE", "False", "0", "no", "true", "yes"]) {
      process.env.LEGACY_INTAKE_FROZEN = value;
      assert.equal(isLegacyIntakeFrozen(), true, `${JSON.stringify(value)} must not thaw the freeze`);
    }

    process.env.LEGACY_INTAKE_FROZEN = "false";
    assert.equal(isLegacyIntakeFrozen(), false, "the exact string false lifts it");
  } finally {
    if (original === undefined) delete process.env.LEGACY_INTAKE_FROZEN;
    else process.env.LEGACY_INTAKE_FROZEN = original;
  }
});

// ─── logging ─────────────────────────────────────────────────────────────────

test("a refusal logs the source host and nothing else from the payload", () => {
  const logged = [];
  assert.throws(() => assertLegacyIntakeAllowed(
    {
      name: "Secret Product Name",
      price: 1234,
      description: "a long supplier description that must not be logged",
      source_url: "https://supplier.example.com/secret/path?token=abc123",
    },
    "POST /api/products",
    { frozen: true, warn: (event, detail) => logged.push([event, detail]) },
  ));

  assert.equal(logged.length, 1);
  const [event, detail] = logged[0];
  assert.equal(event, "legacy_intake_frozen");
  assert.deepEqual(detail, { route: "POST /api/products", source_host: "supplier.example.com" });

  // The path, the query and the product content must not reach the log line.
  const serialized = JSON.stringify(detail);
  assert.doesNotMatch(serialized, /token|abc123|secret\/path/i, "no path or query");
  assert.doesNotMatch(serialized, /Secret Product Name|long supplier description/i, "no payload");
});

test("an unparseable source_url logs a null host rather than throwing", () => {
  assert.equal(sourceHostForLog("not-a-url"), null);
  assert.equal(sourceHostForLog(null), null);
  assert.equal(sourceHostForLog(""), null);
});

// ─── the provenance predicate itself ─────────────────────────────────────────

test("isScrapedBackedIntake reads only source_url", () => {
  assert.equal(isScrapedBackedIntake({ source_url: "https://x.example.com" }), true);
  assert.equal(isScrapedBackedIntake({ source_url: "" }), false);
  assert.equal(isScrapedBackedIntake({}), false);
  assert.equal(isScrapedBackedIntake(null), false);
  assert.equal(isScrapedBackedIntake(undefined), false);
  assert.equal(isScrapedBackedIntake({ image_source_url: "https://x.example.com" }), false);
  assert.equal(isScrapedBackedIntake({ supplier_id: "abc" }), false);
});
