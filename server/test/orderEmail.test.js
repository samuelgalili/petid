import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  orderConfirmationRecipient,
  renderOrderConfirmationHtml,
  sendOrderConfirmationEmail,
} from "../src/orderEmail.js";

const FROM = "MIPO <no-reply@mipo.pet>";
const APP = "https://mipo.pet";

const paidOrder = {
  id: "order-1",
  order_number: "MIPO-1001",
  customer_name: "דנה כהן",
  customer_email: "dana@example.com",
  subtotal: "80.00",
  discount_amount: "10.00",
  coupon_code: "PET10",
  shipping: "25.00",
  total: "95.00",
  shipping_address: {
    fullName: "דנה כהן",
    email: "other@example.com",
    address: "הרצל 1",
    city: "תל אביב",
    zipCode: "6100000",
    phone: "0501234567",
  },
  items: [
    { product_name: "מזון לכלב", quantity: 2, price: "40.00" },
  ],
};

const htmlOf = (order = paidOrder) => renderOrderConfirmationHtml(order, APP);

test("the confirmation is Hebrew, right to left, and lists the receipt", () => {
  const html = htmlOf();
  assert.match(html, /dir="rtl"/);
  assert.match(html, /lang="he"/);
  assert.match(html, /שלום דנה כהן/);
  assert.match(html, /תודה על ההזמנה שלך/);
  assert.match(html, /MIPO-1001/);
  assert.match(html, /מזון לכלב × 2/);
  assert.match(html, /₪80\.00/);
  assert.match(html, /הנחה \(PET10\)/);
  assert.match(html, /-₪10\.00/);
  assert.match(html, /משלוח/);
  assert.match(html, /₪25\.00/);
  assert.match(html, /סה״כ ששולם/);
  assert.match(html, /₪95\.00/);
  assert.match(html, /הרצל 1/);
  assert.match(html, /תל אביב/);
  assert.match(html, /צפה בהזמנה/);
  assert.match(html, /href="https:\/\/mipo\.pet\/order-tracking\/MIPO-1001"/);
  assert.match(html, /שולם/);
});

test("a product name cannot break out of the markup", () => {
  const html = htmlOf({
    ...paidOrder,
    customer_name: "<script>",
    items: [{ product_name: "מזון <b>", quantity: 1, price: 10 }],
    coupon_code: "A&B",
    discount_amount: 1,
  });
  assert.equal(html.includes("<script>"), false);
  assert.match(html, /שלום &lt;script&gt;/);
  assert.match(html, /מזון &lt;b&gt;/);
  assert.match(html, /הנחה \(A&amp;B\)/);
});

test("free shipping is labeled, and a coupon with no amount is still shown", () => {
  const html = htmlOf({
    ...paidOrder,
    discount_amount: 0,
    coupon_code: "SHIP",
    shipping: 0,
    total: 80,
  });
  assert.match(html, /קופון/);
  assert.match(html, /SHIP/);
  assert.match(html, /חינם/);
  assert.equal(html.includes("-₪"), false);
});

test("the customer address is preferred, then the one on the parcel", () => {
  assert.equal(orderConfirmationRecipient(paidOrder), "dana@example.com");
  assert.equal(orderConfirmationRecipient({
    customer_email: "  ",
    shipping_address: { email: "guest@example.com" },
  }), "guest@example.com");
  assert.equal(orderConfirmationRecipient({
    customer_email: "",
    shipping_address: { email: "" },
  }), "");
});

test("a successful send posts the receipt to Resend from the configured sender", async () => {
  let captured;
  const result = await sendOrderConfirmationEmail({
    order: paidOrder,
    apiKey: "re_test_key",
    fromEmail: FROM,
    appBaseUrl: APP,
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return { ok: true, status: 200 };
    },
  });

  assert.equal(result.sent, true);
  assert.equal(result.reason, "sent");
  assert.equal(captured.url, "https://api.resend.com/emails");
  assert.equal(captured.init.method, "POST");
  assert.equal(captured.init.headers.authorization, "Bearer re_test_key");
  const body = JSON.parse(captured.init.body);
  assert.equal(body.from, FROM);
  assert.deepEqual(body.to, ["dana@example.com"]);
  assert.match(body.subject, /MIPO-1001/);
  assert.match(body.html, /dir="rtl"/);
  assert.match(body.html, /מזון לכלב/);
  assert.match(body.html, /הנחה \(PET10\)/);
  assert.match(body.html, /₪25\.00/);
});

test("the parcel address is used when the order has no customer email", async () => {
  let to;
  const result = await sendOrderConfirmationEmail({
    order: { ...paidOrder, customer_email: null },
    apiKey: "re_test_key",
    fromEmail: FROM,
    appBaseUrl: APP,
    fetchImpl: async (_url, init) => {
      to = JSON.parse(init.body).to;
      return { ok: true, status: 200 };
    },
  });
  assert.equal(result.sent, true);
  assert.deepEqual(to, ["other@example.com"]);
});

test("a provider refusal is logged without the key or the address", async () => {
  const errors = [];
  const original = console.error;
  console.error = (...args) => errors.push(args.join(" "));
  try {
    const result = await sendOrderConfirmationEmail({
      order: paidOrder,
      apiKey: "re_test_key",
      fromEmail: FROM,
      appBaseUrl: APP,
      fetchImpl: async () => ({
        ok: false,
        status: 403,
        text: async () => JSON.stringify({
          name: "validation_error",
          message: "refused dana@example.com with key re_test_key",
        }),
      }),
    });
    assert.equal(result.sent, false);
    assert.equal(result.reason, "send_failed");
    assert.equal(errors.length, 1);
    assert.match(errors[0], /order confirmation email was not sent/);
    assert.match(errors[0], /status=403/);
    assert.match(errors[0], /\[redacted-email\]/);
    assert.match(errors[0], /\[redacted\]/);
    assert.equal(errors[0].includes("dana@example.com"), false);
    assert.equal(errors[0].includes("re_test_key"), false);
  } finally {
    console.error = original;
  }
});

test("a network failure is logged and does not throw", async () => {
  const errors = [];
  const original = console.error;
  console.error = (...args) => errors.push(args.join(" "));
  try {
    const result = await sendOrderConfirmationEmail({
      order: paidOrder,
      apiKey: "re_test_key",
      fromEmail: FROM,
      appBaseUrl: APP,
      fetchImpl: async () => {
        throw new Error("connect ECONNREFUSED for dana@example.com re_test_key");
      },
    });
    assert.equal(result.sent, false);
    assert.equal(result.reason, "send_failed");
    assert.match(errors[0], /order confirmation email request failed/);
    assert.equal(errors[0].includes("dana@example.com"), false);
    assert.equal(errors[0].includes("re_test_key"), false);
  } finally {
    console.error = original;
  }
});

test("a missing address sends nothing and logs nothing", async () => {
  let called = false;
  const errors = [];
  const original = console.error;
  console.error = (...args) => errors.push(args.join(" "));
  try {
    const result = await sendOrderConfirmationEmail({
      order: {
        ...paidOrder,
        customer_email: " ",
        shipping_address: { city: "תל אביב" },
      },
      apiKey: "re_test_key",
      fromEmail: FROM,
      appBaseUrl: APP,
      fetchImpl: async () => {
        called = true;
        return { ok: true, status: 200 };
      },
    });
    assert.equal(result.sent, false);
    assert.equal(result.reason, "missing_email");
    assert.equal(called, false);
    assert.deepEqual(errors, []);
  } finally {
    console.error = original;
  }
});

test("a repeated webhook does not send", async () => {
  let called = false;
  const result = await sendOrderConfirmationEmail({
    transitioned: false,
    order: paidOrder,
    apiKey: "re_test_key",
    fromEmail: FROM,
    appBaseUrl: APP,
    fetchImpl: async () => {
      called = true;
      return { ok: true, status: 200 };
    },
  });
  assert.equal(result.sent, false);
  assert.equal(result.reason, "not_first_transition");
  assert.equal(called, false);
});

test("the paid webhook mails only the first transition, after commit, and a failure cannot fail it", () => {
  const source = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  const start = source.indexOf("const handleCardcomWebhook = async");
  const end = source.indexOf("const createReport = async", start);
  const webhook = source.slice(start, end);
  assert.ok(start > 0 && webhook.length > 500, "handleCardcomWebhook could not be located");

  const commitAt = webhook.lastIndexOf('await client.query("commit")');
  const sendAt = webhook.indexOf("sendOrderConfirmationEmail(");
  assert.ok(commitAt > 0 && sendAt > commitAt, "the confirmation is sent before the paid transition commits");

  const calls = webhook.split("sendOrderConfirmationEmail(").length - 1;
  assert.equal(calls, 1, "the confirmation is sent from more than the paid branch");

  const paidAt = webhook.indexOf('if (ownerNotice?.kind === "paid")');
  const failedAt = webhook.indexOf('ownerNotice?.kind === "failed"');
  const paidBranch = webhook.slice(paidAt, failedAt);
  assert.match(paidBranch, /sendOrderConfirmationEmail\(/);
  assert.match(paidBranch, /fromEmail: passwordResetFromEmail/);
  assert.match(paidBranch, /transitioned: true/);
  assert.match(paidBranch, /\.catch\(/);
  assert.match(paidBranch, /redactEmailLog/);
  assert.equal(/await\s+loadOrderConfirmation/.test(paidBranch), false);
  assert.equal(/await\s+sendOrderConfirmationEmail/.test(paidBranch), false);

  const payStart = webhook.indexOf('if (plan.mutate === "pay")');
  const failStart = webhook.indexOf('plan.mutate === "fail"');
  const pay = webhook.slice(payStart, failStart);
  const updatedAt = pay.indexOf("if (updated.rowCount > 0)");
  const elseAt = pay.indexOf("} else {", updatedAt);
  const repeated = pay.slice(elseAt, elseAt + 80);
  assert.equal(repeated.includes("ownerNotice"), false);
  assert.equal(repeated.includes("sendOrderConfirmationEmail"), false);
  assert.match(pay, /ownerNotice = \{[\s\S]*kind: "paid"/);
});
