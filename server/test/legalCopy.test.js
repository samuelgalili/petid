// The published contact and the VAT rate live in one module.
// A second phone, or 17%, is how the old placeholder survived in the footer.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFileSync(path.join(repoRoot, relative), "utf8");

test("legal copy has no placeholder phone and states VAT at 18 percent", () => {
  const legal = read("src/components/LegalDrawer.tsx");
  const contact = read("src/lib/siteContact.js");
  assert.equal(legal.includes("03-1234567"), false);
  assert.equal(legal.includes("17%"), false);
  assert.match(legal, /VAT_PERCENT|18%/);
  assert.match(contact, /VAT_PERCENT = 18/);
  assert.match(contact, /SUPPORT_PHONE = "050-5929209"/);
  assert.match(contact, /https:\/\/wa\.me\/972505929209/);
  assert.match(contact, /support@mipo\.pet/);
  assert.equal(contact.includes("03-1234567"), false);
  assert.equal(contact.includes("VITE_SUPPORT_PHONE"), false);
  for (const file of [
    "src/components/Footer.tsx",
    "src/pages/Accessibility.tsx",
    "src/pages/Support.tsx",
  ]) {
    const source = read(file);
    assert.match(source, /siteContact/);
    assert.equal(source.includes("050-5929209"), false, file);
    assert.equal(source.includes("03-1234567"), false, file);
  }
});
