// The verification email that was never sent.
//
// The report was "no verification email on signup". The account was created,
// the screen said welcome, and nothing arrived.
//
// RESEND_API_KEY was already required at boot, so the obvious cause was ruled
// out by the server being up at all - and that is what made it hard to see.
// The sender was the problem: PASSWORD_RESET_FROM_EMAIL defaults to
// "MIPO <onboarding@resend.dev>", and Resend permits that address ONLY to the
// email the Resend account itself is registered to. Every other recipient is
// refused with a 403 that was logged, swallowed, and reported to the caller as
// the same generic "send_failed" a network blip produces.
//
// So a deployment could pass every start-up check, look healthy, and be unable
// to mail a single customer.
//
// These read the source rather than booting the server, because the check they
// are about runs at module load and throwing there takes the process with it.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = readFileSync(path.join(repoRoot, "server/src/index.js"), "utf8");

/** The `if (isProduction) { ... }` block, where the refusals live. */
const productionChecks = (() => {
  const start = source.indexOf("if (isProduction) {");
  assert.ok(start > 0, "server/src/index.js no longer has a production configuration block");
  return source.slice(start, source.indexOf("\n}", start));
})();

test("production still refuses to start without an email key", () => {
  // The check that was already here. Asserted so that removing it, while
  // adding the sender check below, does not look like an improvement.
  assert.match(
    productionChecks, /"RESEND_API_KEY", resendApiKey/,
    "production no longer requires an email provider key",
  );
});

test("production refuses the sender that can only reach one person", () => {
  /*
   * THE ACTUAL BUG. A key without a verified sender is a mail system that
   * works for the account owner and nobody else - which is indistinguishable
   * from a working mail system until a customer registers.
   *
   * Refused at boot rather than at send time on purpose: a deployment that
   * cannot mail its customers is not in a state worth serving, and finding
   * out on somebody's first registration means finding out from them.
   */
  assert.match(
    productionChecks, /RESEND_TESTING_SENDER/,
    "production accepts Resend's testing sender, which delivers only to the\n"
    + "Resend account's own address and refuses every customer with a 403",
  );
  assert.match(
    productionChecks, /passwordResetFromEmail/,
    "the production check does not look at the FROM address at all",
  );
});

test("the testing sender is still the local default", () => {
  // Refusing it everywhere would leave local development with no mail at all,
  // which is worse than mail that only reaches one inbox.
  assert.match(
    source, /const RESEND_TESTING_SENDER = "onboarding@resend\.dev"/,
    "the testing sender is no longer named, so the production check cannot\n"
    + "be reading the address it is meant to refuse",
  );
  assert.match(
    source,
    /passwordResetFromEmail = process\.env\.PASSWORD_RESET_FROM_EMAIL \|\| `MIPO <\$\{RESEND_TESTING_SENDER\}>`/,
    "the default sender changed; local development may now have no sender",
  );
});

test("a refused sender is not reported as a passing network", () => {
  /*
   * Every failure used to come back as "send_failed" - the same word for "the
   * provider had a bad ten seconds" and "this sender can never reach this
   * person". The first is cured by pressing resend; the second is not, and
   * somebody has to go and change a setting.
   */
  const sendBlock = source.slice(
    source.indexOf("const sendEmailVerification"),
    source.indexOf("const issueEmailVerification"),
  );
  assert.ok(sendBlock.length > 200, "sendEmailVerification could not be located");

  assert.match(
    sendBlock, /sender_rejected/,
    "a 403 from the provider is still reported as a generic send failure",
  );
  assert.match(
    sendBlock, /response\.status === 403/,
    "nothing looks at the status code, so the two kinds of failure are one word",
  );
});

test("the provider's own words are not handed to a customer", () => {
  // The body of a 403 is written by somebody else's service. What crosses the
  // boundary is the SHAPE of the failure, not their prose.
  const sendBlock = source.slice(
    source.indexOf("const sendEmailVerification"),
    source.indexOf("const issueEmailVerification"),
  );
  const returned = [...sendBlock.matchAll(/return \{[\s\S]*?\}/g)].map((match) => match[0]);
  assert.ok(returned.length >= 2, "sendEmailVerification returns nothing recognisable");
  for (const value of returned) {
    assert.doesNotMatch(value, /details/, "the provider's response text is returned to the caller");
  }
});

test("a signup still succeeds when the mail does not", () => {
  // The deliberate part, which must survive all of the above: an email
  // provider having a bad minute must not undo a registration.
  const issueBlock = source.slice(
    source.indexOf("const issueEmailVerification"),
    source.indexOf("const confirmEmailVerification"),
  );
  assert.match(
    issueBlock, /return \{ sent: false, reason: "send_failed" \}/,
    "issueEmailVerification no longer swallows a send failure, so a provider\n"
    + "outage would now fail the registration itself",
  );
});

test("the client is told whether the mail went out", () => {
  /*
   * The server always returned this. NOTHING READ IT: useAuth built its
   * result from `auth.user` alone, so the field existed, was typed, and was
   * dropped one function above the screen that needed it. Somebody whose mail
   * was refused got "welcome" and an inbox that stayed empty.
   */
  const hook = readFileSync(path.join(repoRoot, "src/hooks/useAuth.ts"), "utf8");
  assert.match(
    hook, /emailVerification: auth\.email_verification/,
    "signUp drops the verification result, so no screen can know the mail failed",
  );

  const form = readFileSync(path.join(repoRoot, "src/components/SignupForm.tsx"), "utf8");
  assert.match(
    form, /emailVerification/,
    "the signup form does not read the verification result",
  );
  assert.match(
    form, /!emailVerification\.sent/,
    "the signup form reads the result without branching on it",
  );
});
