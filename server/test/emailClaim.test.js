// A screen may say "we sent the email" only when health says the sender is
// configured and this attempt was accepted. Unknown is not configured.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emailIsConfigured, mayClaimEmailSent } from "../../src/lib/emailConfigured.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFileSync(path.join(repoRoot, relative), "utf8");

test("the health flag fails closed", () => {
  assert.equal(emailIsConfigured(undefined), false);
  assert.equal(emailIsConfigured(null), false);
  assert.equal(emailIsConfigured({}), false);
  assert.equal(emailIsConfigured({ email: {} }), false);
  assert.equal(emailIsConfigured({ email: { configured: false } }), false);
  assert.equal(emailIsConfigured({ email: { configured: "true" } }), false);
  assert.equal(emailIsConfigured({ ok: true, email: { configured: true } }), true);
});

test("a sent claim needs a configured sender and a send that succeeded", () => {
  assert.equal(mayClaimEmailSent({ configured: true, sent: true }), true);
  assert.equal(mayClaimEmailSent({ configured: true, sent: false }), false);
  assert.equal(mayClaimEmailSent({ configured: true }), false);
  assert.equal(mayClaimEmailSent({ configured: false, sent: true }), false);
  assert.equal(mayClaimEmailSent({ configured: null, sent: true }), false);
});

test("the banner, the signup toast, and the payment line are behind that rule", () => {
  const banner = read("src/components/EmailVerificationBanner.tsx");
  assert.match(banner, /configured !== true/, "the banner renders before health says mail is configured");
  assert.match(banner, /rememberedVerificationSent\(\) === false/, "a failed send still leaves the banner saying the mail went out");

  const signup = read("src/components/SignupForm.tsx");
  const sentToast = signup.indexOf("שלחנו מייל לאימות הכתובת");
  const sentBranch = signup.indexOf("emailVerification?.sent === true");
  assert.ok(sentBranch >= 0 && sentToast > sentBranch, "the signup toast says a mail was sent without a successful send");

  const paid = read("src/pages/PaymentSuccess.tsx");
  const claim = paid.indexOf("אישור נשלח ל:");
  const guard = paid.indexOf("emailConfigured === true");
  assert.ok(guard >= 0 && claim > guard, "payment success says a confirmation was sent before mail is known to be configured");
});
