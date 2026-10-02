import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  anonymizeOrdersForDeletedAccount,
  claimVerifiedGuestCommerce,
  deleteShopCustomersForDeletedAccount,
  escapeHtml,
  readAccountEmailProof,
  verificationGreetingHtml,
} from "../src/emailIdentity.js";

const source = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");

const sliceBetween = (startNeedle, endNeedle) => {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle);
  assert.ok(start >= 0, `missing ${startNeedle}`);
  assert.ok(end > start, `missing ${endNeedle} after ${startNeedle}`);
  return source.slice(start, end);
};

const compact = (sql) => String(sql).replace(/\s+/g, " ").trim();

const recordingClient = (rows = []) => {
  const calls = [];
  return {
    calls,
    query: async (sql, params) => {
      calls.push({ sql: compact(sql), params });
      return { rowCount: 1, rows };
    },
  };
};

test("html escape closes every character that can open a tag or an attribute", () => {
  assert.equal(
    escapeHtml(`<a/href="https://evil.example">לחצו`),
    "&lt;a/href=&quot;https://evil.example&quot;&gt;לחצו",
  );
  assert.equal(escapeHtml("A&B"), "A&amp;B");
  assert.equal(escapeHtml("O'Brien"), "O&#39;Brien");
  assert.equal(escapeHtml("<b>"), "&lt;b&gt;");
  assert.equal(escapeHtml(null), "");
});

test("the verification greeting escapes the first word and keeps the Hebrew line", () => {
  const hostile = `<a/href="https://evil.example">לחצו`;
  const line = verificationGreetingHtml(hostile);
  assert.equal(line.includes("<"), false);
  assert.equal(line.includes(">"), false);
  assert.equal(line.includes('"'), false);
  assert.equal(
    line,
    "היי &lt;a/href=&quot;https://evil.example&quot;&gt;לחצו,",
  );
  assert.equal(verificationGreetingHtml("דנה כהן"), "היי דנה,");
  assert.equal(verificationGreetingHtml("  "), "היי,");
  assert.equal(verificationGreetingHtml(null), "היי,");
  assert.equal(verificationGreetingHtml("A&B כהן"), "היי A&amp;B,");
});

test("signup does not claim a guest customer or guest orders", () => {
  const signup = sliceBetween("const signupUser = async", "const loginUser = async");
  assert.doesNotMatch(signup, /shop_customers/);
  assert.doesNotMatch(signup, /claimVerifiedGuestCommerce/);
  assert.match(signup, /confirmEmailVerification/);
});

test("a successful verification claims guest commerce after the address is marked proven", () => {
  const confirm = sliceBetween(
    "const confirmEmailVerification = async",
    "const requestPasswordReset = async",
  );
  const provenAt = confirm.indexOf("email_verified_at = now()");
  const claimAt = confirm.indexOf("claimVerifiedGuestCommerce(client, { userId: row.user_id, email })");
  assert.ok(provenAt >= 0 && claimAt > provenAt, "claim must run after the address is marked verified");
});

test("the verification mail uses the escaped greeting and does not interpolate the raw name", () => {
  const send = sliceBetween(
    "const sendEmailVerification = async",
    "const issueEmailVerification = async",
  );
  assert.match(send, /verificationGreetingHtml\(fullName\)/);
  assert.doesNotMatch(send, /\$\{fullName\}/);
  assert.doesNotMatch(send, /split\(" "\)/);
});

test("account deletion asks the proof helper and does not match orders by email itself", () => {
  const deletion = sliceBetween("const deleteMyAccount = async", "const queryOptionalRows = async");
  assert.match(deletion, /readAccountEmailProof\(client, userId\)/);
  assert.match(deletion, /anonymizeOrdersForDeletedAccount/);
  assert.match(deletion, /deleteShopCustomersForDeletedAccount/);
  assert.match(deletion, /emailVerified: proof\.emailVerified/);
  assert.doesNotMatch(deletion, /lower\(customer_email\)/);
  assert.doesNotMatch(deletion, /lower\(email\)/);
});

test("claim attaches only an unclaimed customer and guest orders of that address", async () => {
  const client = recordingClient();
  const result = await claimVerifiedGuestCommerce(client, {
    userId: "user-1",
    email: "Guest@Example.com",
  });
  assert.deepEqual(result, { customers: 1, orders: 1 });
  assert.equal(client.calls.length, 2);
  assert.match(client.calls[0].sql, /update public.shop_customers/);
  assert.match(client.calls[0].sql, /user_id is null/);
  assert.doesNotMatch(client.calls[0].sql, /user_id = \$1 or/);
  assert.deepEqual(client.calls[0].params, ["user-1", "guest@example.com"]);
  assert.match(client.calls[1].sql, /update public.orders/);
  assert.match(client.calls[1].sql, /where user_id is null and lower\(customer_email\) = \$2/);
  assert.deepEqual(client.calls[1].params, ["user-1", "guest@example.com"]);
});

test("claim does nothing when the address or the account is missing", async () => {
  const client = recordingClient();
  assert.deepEqual(
    await claimVerifiedGuestCommerce(client, { userId: "user-1", email: "not-an-email" }),
    { customers: 0, orders: 0 },
  );
  assert.deepEqual(
    await claimVerifiedGuestCommerce(client, { userId: "", email: "a@example.com" }),
    { customers: 0, orders: 0 },
  );
  assert.equal(client.calls.length, 0);
});

test("deleting an unverified account never selects orders or customers by email", async () => {
  const orders = recordingClient();
  await anonymizeOrdersForDeletedAccount(orders, {
    userId: "user-1",
    email: "victim@example.com",
    emailVerified: false,
  });
  assert.match(orders.calls[0].sql, /where user_id = \$1$/);
  assert.doesNotMatch(orders.calls[0].sql, /or \(user_id is null/);
  assert.deepEqual(orders.calls[0].params, ["user-1"]);
  assert.match(orders.calls[0].sql, /customer_name = 'Deleted user'/);
  assert.match(orders.calls[0].sql, /customer_email = null/);
  assert.match(orders.calls[0].sql, /shipping_address = '\{\}'::jsonb/);

  const customers = recordingClient();
  await deleteShopCustomersForDeletedAccount(customers, {
    userId: "user-1",
    email: "victim@example.com",
    emailVerified: null,
  });
  assert.equal(
    customers.calls[0].sql,
    "delete from public.shop_customers where user_id = $1",
  );
  assert.deepEqual(customers.calls[0].params, ["user-1"]);
});

test("a verified address may also match that address, and a non-boolean does not", async () => {
  const verified = recordingClient();
  await anonymizeOrdersForDeletedAccount(verified, {
    userId: "user-1",
    email: "Owner@Example.com",
    emailVerified: true,
  });
  assert.match(
    verified.calls[0].sql,
    /where user_id = \$1 or \(user_id is null and lower\(customer_email\) = \$2\)$/,
  );
  assert.deepEqual(verified.calls[0].params, ["user-1", "owner@example.com"]);

  const customers = recordingClient();
  await deleteShopCustomersForDeletedAccount(customers, {
    userId: "user-1",
    email: "Owner@Example.com",
    emailVerified: true,
  });
  assert.equal(
    customers.calls[0].sql,
    "delete from public.shop_customers where user_id = $1 or (user_id is null and lower(email) = $2)",
  );
  assert.deepEqual(customers.calls[0].params, ["user-1", "owner@example.com"]);

  const loose = recordingClient();
  await anonymizeOrdersForDeletedAccount(loose, {
    userId: "user-1",
    email: "victim@example.com",
    emailVerified: "true",
  });
  assert.match(loose.calls[0].sql, /where user_id = \$1$/);
  assert.deepEqual(loose.calls[0].params, ["user-1"]);
});

test("proof is read from the locked account row and fails closed when the row is gone", async () => {
  const present = recordingClient([{
    email: "Owner@Example.com",
    email_verified_at: new Date("2026-10-02T00:00:00.000Z"),
  }]);
  assert.deepEqual(await readAccountEmailProof(present, "user-1"), {
    email: "owner@example.com",
    emailVerified: true,
  });
  assert.match(present.calls[0].sql, /for update/);
  assert.deepEqual(present.calls[0].params, ["user-1"]);

  const absent = recordingClient([]);
  assert.deepEqual(await readAccountEmailProof(absent, "missing"), {
    email: "",
    emailVerified: false,
  });

  const unverified = recordingClient([{ email: "new@example.com", email_verified_at: null }]);
  assert.deepEqual(await readAccountEmailProof(unverified, "user-2"), {
    email: "new@example.com",
    emailVerified: false,
  });
});
