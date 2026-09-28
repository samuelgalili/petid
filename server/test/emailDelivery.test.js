import assert from "node:assert/strict";
import test from "node:test";
import {
  configNamesForProviderStatus,
  describeEmailDelivery,
  emailFailureLogLine,
  redactEmailLog,
  resolveFromEmail,
  summarizeProviderFailure,
} from "../src/emailDelivery.js";

test("an empty sender falls back to the Resend testing address", () => {
  assert.equal(resolveFromEmail("  "), "MIPO <onboarding@resend.dev>");
  assert.equal(resolveFromEmail(" MIPO <hello@mipo.pet> "), "MIPO <hello@mipo.pet>");
});

test("mail is configured only with a key and a sender that is not the testing address", () => {
  assert.equal(describeEmailDelivery({ apiKey: "", fromEmail: "MIPO <hello@mipo.pet>" }).configured, false);
  assert.deepEqual(describeEmailDelivery({}).missing, ["RESEND_API_KEY"]);
  assert.equal(describeEmailDelivery({}).state, "unknown");

  const testing = describeEmailDelivery({
    apiKey: "re_live_key",
    fromEmail: "MIPO <onboarding@resend.dev>",
  });
  assert.equal(testing.configured, false);
  assert.equal(testing.state, "down");
  assert.deepEqual(testing.missing, ["PASSWORD_RESET_FROM_EMAIL"]);

  const ready = describeEmailDelivery({
    apiKey: "re_live_key",
    fromEmail: "MIPO <hello@mipo.pet>",
  });
  assert.equal(ready.configured, true);
  assert.equal(ready.state, "ok");
  assert.deepEqual(ready.missing, []);
});

test("a provider refusal is logged without the key or an address", () => {
  const body = JSON.stringify({
    name: "validation_error",
    message: "You can only send testing emails to your own email address (owner@mipo.pet). Key re_abc123secret",
  });
  const summary = summarizeProviderFailure(403, body);
  assert.equal(summary.status, 403);
  assert.equal(summary.name, "validation_error");
  assert.match(summary.message, /\[redacted-email\]/);
  assert.match(summary.message, /\[redacted\]/);
  assert.doesNotMatch(summary.message, /owner@mipo\.pet/);
  assert.doesNotMatch(summary.message, /re_abc123secret/);

  const line = emailFailureLogLine("verification", summary, configNamesForProviderStatus(403, "MIPO <onboarding@resend.dev>"));
  assert.match(line, /status=403/);
  assert.match(line, /config=PASSWORD_RESET_FROM_EMAIL/);
  assert.doesNotMatch(line, /re_abc123secret/);
  assert.doesNotMatch(line, /owner@mipo\.pet/);
  assert.equal(redactEmailLog("Bearer re_should_not_appear"), "Bearer [redacted]");
});

test("a bad key and a refused sender name different settings", () => {
  assert.deepEqual(configNamesForProviderStatus(401, "MIPO <hello@mipo.pet>"), ["RESEND_API_KEY"]);
  assert.deepEqual(
    configNamesForProviderStatus(422, "MIPO <hello@mipo.pet>"),
    ["PASSWORD_RESET_FROM_EMAIL"],
  );
  assert.deepEqual(configNamesForProviderStatus(500, "MIPO <hello@mipo.pet>"), []);
});
