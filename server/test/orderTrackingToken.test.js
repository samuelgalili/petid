import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  ORDER_TRACKING_TOKEN_TTL_MS,
  orderTrackingSecret,
  signOrderTrackingToken,
  verifyOrderTrackingToken,
} from "../src/orderTrackingToken.js";

const ORDER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORDER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SECRET = "dedicated-tracking-secret";
const NOW = 1_700_000_000_000;

const order = (id) => ({ id });

test("a signed token expires and fits only the order it names", () => {
  const token = signOrderTrackingToken(order(ORDER_A), SECRET, NOW);
  assert.match(token, /^ot1\.[0-9a-f-]{36}\.[0-9]+\.[A-Za-z0-9_-]{43}$/);
  assert.equal(token.includes(SECRET), false);
  assert.equal(verifyOrderTrackingToken(token, order(ORDER_A), SECRET, NOW), true);
  assert.equal(verifyOrderTrackingToken(token, order(ORDER_A.toUpperCase()), SECRET, NOW), true);
  assert.equal(verifyOrderTrackingToken(token, order(ORDER_B), SECRET, NOW), false);
  assert.equal(
    verifyOrderTrackingToken(token, order(ORDER_A), SECRET, NOW + ORDER_TRACKING_TOKEN_TTL_MS - 1),
    true,
  );
  assert.equal(
    verifyOrderTrackingToken(token, order(ORDER_A), SECRET, NOW + ORDER_TRACKING_TOKEN_TTL_MS),
    false,
  );
});

test("a changed order id, expiry, or signature does not verify", () => {
  const token = signOrderTrackingToken(order(ORDER_A), SECRET, NOW);
  const [prefix, , exp, sig] = token.split(".");
  assert.equal(verifyOrderTrackingToken(`${prefix}.${ORDER_B}.${exp}.${sig}`, order(ORDER_B), SECRET, NOW), false);
  assert.equal(verifyOrderTrackingToken(`${prefix}.${ORDER_A}.${exp + 1}.${sig}`, order(ORDER_A), SECRET, NOW), false);
  const flipped = `${sig.slice(0, -1)}${sig.endsWith("a") ? "b" : "a"}`;
  assert.equal(verifyOrderTrackingToken(`${prefix}.${ORDER_A}.${exp}.${flipped}`, order(ORDER_A), SECRET, NOW), false);
  assert.equal(verifyOrderTrackingToken("", order(ORDER_A), SECRET, NOW), false);
  assert.equal(verifyOrderTrackingToken(token, order(ORDER_A), "other-secret", NOW), false);
  assert.equal(verifyOrderTrackingToken(token, order(""), SECRET, NOW), false);
});

test("no secret and no order id produce no token", () => {
  assert.equal(signOrderTrackingToken(order(ORDER_A), "", NOW), "");
  assert.equal(signOrderTrackingToken(order("not-a-uuid"), SECRET, NOW), "");
  assert.equal(verifyOrderTrackingToken("ot1.not-a-token", order(ORDER_A), SECRET, NOW), false);
});

test("the signing key is not the admin key", () => {
  const databaseUrl = "postgres://mipo:db-password@localhost:5432/mipo";
  const derived = orderTrackingSecret({ DATABASE_URL: databaseUrl });
  assert.ok(derived.length > 20);
  assert.equal(derived.includes("db-password"), false);
  assert.equal(derived.includes("admin-key-value"), false);
  assert.equal(
    derived,
    orderTrackingSecret({ DATABASE_URL: databaseUrl, ADMIN_API_KEY: "admin-key-value" }),
  );
  assert.equal(orderTrackingSecret({ ADMIN_API_KEY: "admin-key-value" }), "");
  assert.equal(
    orderTrackingSecret({
      ADMIN_API_KEY: "admin-key-value",
      DATABASE_URL: databaseUrl,
      ORDER_TRACKING_SECRET: "  dedicated  ",
    }),
    "dedicated",
  );

  const source = readFileSync(new URL("../src/orderTrackingToken.js", import.meta.url), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.equal(code.includes("ADMIN_API_KEY"), false);
  assert.equal(code.includes("console."), false);
});
