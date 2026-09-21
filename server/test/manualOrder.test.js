// An order taken by a person, for a person who is not at a keyboard.
//
// The owner asked for three things in one line - open a customer by hand, make
// them an order, take the money - and described the interesting case himself:
//
//   "שהלקוח שילם בדרך עקיפה לאחד מהאדמינים והוא מאשר קבלת תשלום הלקוח
//    בפרטי ואפשר להתקדם ליצירת תווית למחסן"
//
// The money arrives by a route the system never sees, an admin says it
// arrived, and that releases the order to the warehouse.
//
// THAT IS A CAPABILITY, not a convenience: one person's word turns into paid
// goods leaving a building. Most of this file is about the two things which
// therefore must be true - that only an admin can say it, and that when they
// do, it is written down whose word it was.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { ADMIN_PAYMENT_METHODS, createManualOrder, manualOrderBody } from "../src/adminOs/manualOrders.js";

const ADMIN = { id: "3f1b0c2a-0000-4000-8000-000000000001", email: "ops@mipo.pet", role: "admin" };

const spyAudit = () => {
  const recorded = [];
  return { recorded, record: async (entry) => { recorded.push(entry); } };
};

/** Stands in for createOrder, capturing exactly what it was handed. */
const spyCreateOrder = () => {
  const calls = [];
  const createOrder = async (body, currentUser, origin, options) => {
    calls.push({ body, currentUser, origin, options });
    return { order: { id: "order-1", order_number: "MP-1" } };
  };
  return { calls, createOrder };
};

// ─── what the screen sends, and what the order is made of ────────────────────

test("a price sent by the screen is not carried into the order", () => {
  // THE RULE THIS WHOLE MODULE EXISTS TO NOT BREAK. Line prices are resolved
  // from the catalogue by the server; an admin screen is a caller like any
  // other. Passing a price through here would be harmless today - the resolver
  // ignores it - and would read to the next person as though it were used.
  const body = manualOrderBody({
    items: [{ product_id: "p1", quantity: 2, price: 1, product_name: "free money" }],
  });

  assert.deepEqual(Object.keys(body.items[0]).sort(), ["product_id", "product_source", "quantity", "variant_id"]);
  assert.equal(body.items[0].price, undefined);
  assert.equal(body.items[0].quantity, 2);
});

test("a missing or nonsense quantity becomes one, never zero", () => {
  const body = manualOrderBody({ items: [{ product_id: "p1" }, { product_id: "p2", quantity: "x" }] });
  assert.deepEqual(body.items.map((item) => item.quantity), [1, 1]);
});

test("an order with no lines is refused before it reaches the order code", async () => {
  const { createOrder, calls } = spyCreateOrder();
  await assert.rejects(
    createManualOrder({ createOrder, audit: spyAudit(), admin: ADMIN }, { items: [] }),
    (error) => error.statusCode === 400,
  );
  assert.equal(calls.length, 0, "an empty order was handed on anyway");
});

// ─── who the order is for ────────────────────────────────────────────────────

test("the order is for the customer, not for the admin placing it", async () => {
  // An order whose user_id is an admin account is an order that never appears
  // on the customer's own card - and the admin is the one name guaranteed to
  // be in scope when this code runs, so it is the easy mistake.
  const { createOrder, calls } = spyCreateOrder();
  await createManualOrder(
    { createOrder, audit: spyAudit(), admin: ADMIN },
    { customer_user_id: "customer-9", items: [{ product_id: "p1", quantity: 1 }] },
  );

  assert.equal(calls[0].currentUser.id, "customer-9");
  assert.notEqual(calls[0].currentUser.id, ADMIN.id);
  assert.equal(calls[0].options.placedByAdmin.id, ADMIN.id);
});

test("an order taken for a walk-in has no customer account at all", async () => {
  // Somebody with no login is a real case - the guest checkout exists for it -
  // and it must not silently become an order belonging to the admin.
  const { createOrder, calls } = spyCreateOrder();
  await createManualOrder(
    { createOrder, audit: spyAudit(), admin: ADMIN },
    { items: [{ product_id: "p1", quantity: 1 }] },
  );

  assert.equal(calls[0].currentUser, null);
});

test("an order cannot be placed without an admin identity", async () => {
  const { createOrder, calls } = spyCreateOrder();
  await assert.rejects(
    createManualOrder({ createOrder, audit: spyAudit(), admin: null }, { items: [{ product_id: "p1" }] }),
    (error) => error.statusCode === 401,
  );
  assert.equal(calls.length, 0);
});

// ─── the attestation ─────────────────────────────────────────────────────────

test("an attested payment is recorded with the admin's own words", async () => {
  const { createOrder, calls } = spyCreateOrder();
  const audit = spyAudit();

  await createManualOrder({ createOrder, audit, admin: ADMIN }, {
    customer_user_id: "customer-9",
    items: [{ product_id: "p1", quantity: 1 }],
    payment_method: ADMIN_PAYMENT_METHODS.ATTESTED,
    payment_attestation_note: "שילם בביט ליוסי",
  });

  assert.equal(calls[0].body.payment_method, "admin-attested");
  assert.equal(calls[0].body.payment_attestation_note, "שילם בביט ליוסי");

  // The orders row can be edited later; the audit log cannot. The substance of
  // an attested payment therefore lives in both.
  const entry = audit.recorded[0];
  assert.equal(entry.actionType, "order.created_manually");
  assert.equal(entry.actor, ADMIN);
  assert.equal(entry.metadata.attested.note, "שילם בביט ליוסי");
});

test("an ordinary manual order carries no attestation in the log", async () => {
  // An empty attestation object on every order would make the real ones
  // unfindable, which defeats the point of recording them.
  const { createOrder } = spyCreateOrder();
  const audit = spyAudit();

  await createManualOrder({ createOrder, audit, admin: ADMIN }, {
    items: [{ product_id: "p1", quantity: 1 }],
  });

  assert.equal(audit.recorded[0].metadata.attested, undefined);
  assert.equal(audit.recorded[0].metadata.payment_method, "credit-card");
});

test("every manual order is audited, however it was paid", async () => {
  // "An admin made this order" is the fact worth keeping on its own: an order
  // that appeared without a customer session is otherwise indistinguishable
  // from one that did not.
  for (const method of Object.values(ADMIN_PAYMENT_METHODS)) {
    const { createOrder } = spyCreateOrder();
    const audit = spyAudit();
    await createManualOrder({ createOrder, audit, admin: ADMIN }, {
      items: [{ product_id: "p1", quantity: 1 }],
      payment_method: method,
      payment_attestation_note: "note",
    });
    assert.equal(audit.recorded.length, 1, `${method} was not audited`);
  }
});

// ─── the rules that live in createOrder, read off its source ─────────────────
//
// createOrder is 250 lines inside index.js with a live pool bound to it, so
// these are read as source rather than executed. That is weaker than running
// it and the comments say so - but the alternative was no guard at all on the
// two facts that make this feature safe, and a guard that reads the code is
// how the rest of this repository pins its mirrors.

const orderSource = () => readFileSync(new URL("../src/index.js", import.meta.url), "utf8");

test("admin-attested is not a payment method a customer can name", () => {
  // THE SECURITY PROPERTY. If the allow-list were unconditional, a shopper
  // could post payment_method=admin-attested and have their own unpaid order
  // marked paid and picked from the warehouse.
  const source = orderSource();
  const headStart = source.indexOf("const allowedPaymentMethods");
  assert.ok(headStart > 0, "the payment method allow-list was not found");
  const head = source.slice(headStart, source.indexOf("// How the money arrived", headStart));

  assert.ok(head.includes('if (placedByAdmin) allowedPaymentMethods.push("admin-attested")'),
    "admin-attested is no longer gated on the order being placed by an admin");
  assert.ok(!/allowedPaymentMethods = \[[^\]]*admin-attested/s.test(head),
    "admin-attested is in the list every caller may use");
});

test("an attested payment without a note is refused", () => {
  const source = orderSource();
  // Bounded FORWARD from the start marker. "const paymentStatus" and
  // "returning *" both occur earlier in a 9,000-line file, and an end index
  // before the start silently yields an empty string - a guard that reads
  // nothing and passes.
  const start = source.indexOf("const attestationNote");
  assert.ok(start > 0, "the attestation note check was not found at all");
  const block = source.slice(start, source.indexOf("const paymentStatus", start));

  assert.ok(block.includes('paymentMethod === "admin-attested" && !attestationNote'),
    "the note is no longer required");
  assert.ok(block.includes("throw error"), "a missing note no longer stops the order");
});

test("the email gate is relaxed only for an admin-placed order", () => {
  // The gate stops a stranger pointing order mail at an address they have not
  // proven. An admin on the phone cannot make a customer click a link
  // mid-call, and is themselves a known, audited account - but the exemption
  // must be exactly that narrow.
  const source = orderSource();
  assert.ok(
    source.includes("if (currentUser && !currentUser.email_verified_at && !placedByAdmin)"),
    "the email verification gate no longer distinguishes an admin-placed order",
  );
});

test("the attestation columns are written together or not at all", () => {
  // An attestation with no author, or an author with no note, is a record of
  // nothing - and the timestamp is derived from the author rather than sent,
  // so a caller cannot date somebody else's word.
  const source = orderSource();
  const start = source.indexOf("payment_attested_by,");
  assert.ok(start > 0, "the attestation columns were not found in any insert");
  const insert = source.slice(start, source.indexOf("returning *", start));

  assert.ok(insert.includes("case when $24::uuid is null then null else now() end"),
    "the attestation timestamp is no longer tied to the attesting admin");
});
