import assert from "node:assert/strict";
import { test } from "node:test";

import { AUTO_ACCEPT_AT, REVIEW_AT, readDimensions, scoreCandidate, verdictFor } from "../src/imageEngine.js";
import { parseImageFilename } from "../src/imageImport.js";

const PRODUCT = {
  sku: "caqu07107",
  barcode: "4770107258418",
  brand: "קוואטרו",
  name: 'קוואטרו חתול סניור ללא דגן דג לבן וקריל 7 ק"ג',
  size_amount: 7,
  size_unit: "kg",
};

test("a supplier export is trusted without having to describe the product", () => {
  // The supplier naming a file by SKU is the claim, and it is the strongest one
  // available. Requiring the filename to also match the product name would
  // reject correct images for being tersely named.
  const { score, verdict } = scoreCandidate(
    { source_kind: "supplier_export", filename: "caqu07107.jpg" },
    PRODUCT,
  );
  assert.equal(score, 100);
  assert.equal(verdict, "accepted");
});

test("a search result matching nothing is rejected rather than used", () => {
  // No image is better than the wrong image on a product page.
  const { score, verdict, evidence } = scoreCandidate(
    { source_kind: "name_search", url: "https://example.com/random-photo.jpg", title: "sunset" },
    PRODUCT,
  );
  assert.ok(score < REVIEW_AT, `expected a low score, got ${score}`);
  assert.equal(verdict, "rejected");
  assert.equal(evidence.brand, false, "a page that never mentions the brand is evidence against");
});

test("a barcode in the address is strong evidence", () => {
  const { score, evidence } = scoreCandidate(
    {
      source_kind: "barcode_lookup",
      url: "https://catalogue.example/4770107258418",
      title: 'קוואטרו חתול סניור דג לבן 7 ק"ג',
    },
    PRODUCT,
  );
  assert.equal(evidence.barcode, true);
  assert.ok(score >= REVIEW_AT, `expected at least review, got ${score}`);
});

test("the verdict boundaries are the ones the specification asks for", () => {
  assert.equal(verdictFor(AUTO_ACCEPT_AT), "accepted");
  assert.equal(verdictFor(AUTO_ACCEPT_AT - 1), "review");
  assert.equal(verdictFor(REVIEW_AT), "review");
  assert.equal(verdictFor(REVIEW_AT - 1), "rejected");
});

test("evidence travels with the score", () => {
  // "84" tells a reviewer nothing; "the barcode matched, the brand did not"
  // tells them everything.
  const { evidence } = scoreCandidate(
    { source_kind: "name_search", url: "https://example.com/caqu07107.jpg", title: "קוואטרו" },
    PRODUCT,
  );
  assert.equal(evidence.sku, true);
  assert.equal(evidence.brand, true);
  assert.equal(typeof evidence.name_match_ratio, "number");
});

test("a filename says which product and which picture", () => {
  assert.deepEqual(parseImageFilename("caqu07107.jpg"), {
    sku: "caqu07107",
    normalizedSku: "caqu07107",
    sequence: 1,
    contentType: "image/jpeg",
    filename: "caqu07107.jpg",
  });

  // Folder structure is ignored: suppliers organise exports however they like,
  // and the filename is the part they were asked to control.
  assert.equal(parseImageFilename("photos/2026/bija01100.png").sku, "bija01100");
  assert.equal(parseImageFilename("caqu07107-2.jpg").sequence, 2);
  assert.equal(parseImageFilename("caqu07107_3.webp").sequence, 3);

  assert.equal(parseImageFilename("notes.txt"), null, "a text file is not a product image");
  assert.equal(parseImageFilename("no-extension"), null);
});

test("a SKU containing a dot survives the filename", () => {
  // bija0.2200 is a real SKU in this catalogue, and a naive split on "." would
  // turn it into "bija0".
  const parsed = parseImageFilename("bija0.2200.png");
  assert.equal(parsed.sku, "bija0.2200");
  assert.equal(parsed.contentType, "image/png");
});

test("dimensions are read from the header without decoding", () => {
  // A 4x4 PNG, built by hand so the test does not need an image library.
  const png = Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    Buffer.from([0, 0, 0, 13]),
    Buffer.from("IHDR"),
    Buffer.from([0, 0, 0, 4, 0, 0, 0, 4, 8, 2, 0, 0, 0]),
  ]);
  assert.deepEqual(readDimensions(png, "image/png"), { width: 4, height: 4 });

  // A file that is not what it claims simply has unknown dimensions, rather
  // than throwing into whatever called it.
  assert.deepEqual(readDimensions(Buffer.from("nonsense"), "image/png"), { width: null, height: null });
});
