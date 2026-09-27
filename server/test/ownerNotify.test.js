import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  aggregateLine,
  authorizeOwnerQa,
  buildOwnerMessage,
  createOwnerNotifier,
  qaEventFromBody,
  readOwnerNotifyConfig,
  reportDeclinedPayment,
  reportNewUser,
  reportPaidOrder,
  reportServerError,
  reportUnsettledPayment,
  runOwnerNotifyCommand,
  schedulePaidOrderNotice,
} from "../src/ownerNotify.js";

const forbidden = ["Tama", "gotchi"].join("");

const enabledEnv = {
  OWNER_NOTIFICATIONS_ENABLED: "true",
  TWILIO_ACCOUNT_SID: "AC00000000000000000000000000000000",
  TWILIO_AUTH_TOKEN: "test-auth-token",
  TWILIO_WHATSAPP_FROM: "whatsapp:+10000000000",
  OWNER_WHATSAPP_TO: "whatsapp:+10000000001",
};

const userId = "11111111-1111-4111-8111-111111111111";

const silent = { log() {}, error() {} };

const recording = () => {
  const sent = [];
  return {
    sent,
    transport: {
      async send(message) { sent.push(message); },
    },
  };
};

const clockOf = () => {
  let clock = 1_000_000;
  const tasks = [];
  return {
    now: () => clock,
    advance(ms) { clock += ms; },
    schedule(fn, delay) {
      const task = {
        due: clock + delay,
        cancelled: false,
        ran: false,
        fn,
        cancel() { this.cancelled = true; },
      };
      tasks.push(task);
      return task;
    },
    runDue() {
      for (const task of tasks) {
        if (!task.cancelled && !task.ran && clock >= task.due) {
          task.ran = true;
          task.fn();
        }
      }
    },
  };
};

const notifierWith = (overrides = {}) => {
  const log = overrides.log || silent;
  return createOwnerNotifier({
    env: enabledEnv,
    log,
    ...overrides,
  });
};

test("a paid order message is Hebrew and carries number, amount, and products", () => {
  const message = buildOwnerMessage({
    type: "order.paid",
    orderNumber: "MIPO-1001",
    total: 150,
    lines: [
      { name: "מזון כלבים", quantity: 2 },
      { name: "רצועה", quantity: 1 },
    ],
    email: "secret@example.com",
    phone: "0501234567",
    address: "רחוב הרצל 1 תל אביב",
    card: "4111111111111111",
    token: "tok_live_secret",
  });

  assert.match(message.body, /הזמנה חדשה שולמה/);
  assert.match(message.body, /מספר: MIPO-1001/);
  assert.match(message.body, /סכום: 150\.00 ₪/);
  assert.match(message.body, /מזון כלבים ×2/);
  assert.match(message.body, /רצועה ×1/);
  const packed = JSON.stringify(message);
  assert.equal(packed.includes("secret@example.com"), false);
  assert.equal(packed.includes("0501234567"), false);
  assert.equal(packed.includes("הרצל"), false);
  assert.equal(packed.includes("4111111111111111"), false);
  assert.equal(packed.includes("tok_live_secret"), false);
  assert.equal(packed.toLowerCase().includes(forbidden.toLowerCase()), false);
});

test("a declined payment names the order, the amount, and the provider code", () => {
  const message = buildOwnerMessage({
    type: "payment.failed",
    orderNumber: "MIPO-2002",
    total: 80,
    operationResponse: 2006,
    dealResponse: 2006,
    customer_email: "secret@example.com",
    customer_phone: "+10000000099",
  });
  assert.match(message.body, /תשלום נדחה/);
  assert.match(message.body, /MIPO-2002/);
  assert.match(message.body, /80\.00 ₪/);
  assert.match(message.body, /קוד: 2006/);
  assert.equal(JSON.stringify(message).includes("secret@example.com"), false);
  assert.equal(JSON.stringify(message).includes("+10000000099"), false);
});

test("an unsettled capture explains the failure without a raw provider payload", () => {
  const mismatch = buildOwnerMessage({ type: "payment.unsettled", statusCode: 409 });
  const missing = buildOwnerMessage({ type: "payment.unsettled", statusCode: 404 });
  const broken = buildOwnerMessage({ type: "payment.unsettled", statusCode: 502 });
  assert.match(mismatch.body, /תשלום לא סומן כשולם/);
  assert.match(mismatch.body, /הסכום שחויב לא תואם את ההזמנה/);
  assert.match(missing.body, /ההזמנה לא נמצאה באתר/);
  assert.match(broken.body, /אימות מול ספק הסליקה נכשל/);
  assert.equal(mismatch.body.includes("LowProfile"), false);
});

test("a new user message keeps the display name and drops contact details", () => {
  const message = buildOwnerMessage({
    type: "user.registered",
    userId,
    displayName: "דנה לוי secret@example.com 0501234567",
    email: "secret@example.com",
    phone: "0501234567",
  });
  assert.match(message.body, /נרשם משתמש חדש/);
  assert.match(message.body, /דנה לוי/);
  assert.equal(message.body.includes("secret@example.com"), false);
  assert.equal(message.body.includes("0501234567"), false);
  assert.equal(message.body.includes(userId), false);
});

test("server, site, deploy, and QA messages stay short and Hebrew", () => {
  const error = buildOwnerMessage({
    type: "server.error",
    statusCode: 500,
    method: "POST",
    path: "/api/orders?token=super-secret",
  });
  assert.match(error.body, /שגיאת שרת 500/);
  assert.match(error.body, /POST \/api\/orders/);
  assert.equal(error.body.includes("super-secret"), false);
  assert.equal(error.body.includes("token="), false);

  const down = buildOwnerMessage({ type: "site.down", target: "https://example.test/api/health?x=1" });
  assert.match(down.body, /האתר לא מגיב/);
  assert.match(down.body, /example\.test/);
  assert.equal(down.body.includes("x=1"), false);

  const deploy = buildOwnerMessage({ type: "deploy", ok: true, sha: "abc123def4567890" });
  assert.match(deploy.body, /פריסה לייצור הצליחה/);
  assert.match(deploy.body, /abc123def456/);
  const failed = buildOwnerMessage({ type: "deploy", ok: false, sha: "abc123def456" });
  assert.match(failed.body, /פריסה לייצור נכשלה/);

  const qa = buildOwnerMessage({
    type: "qa",
    ok: false,
    summary: "העגלה לא נפתחה secret@example.com",
  });
  assert.match(qa.body, /בדיקה אחרי פריסה: נכשלה/);
  assert.match(qa.body, /העגלה לא נפתחה/);
  assert.equal(qa.body.includes("@"), false);
});

test("a product name that is only a brand word is left out of the message", () => {
  const message = buildOwnerMessage({
    type: "order.paid",
    orderNumber: "MIPO-1001",
    total: 10,
    lines: [{ name: forbidden, quantity: 1 }, { name: "רצועה", quantity: 1 }],
  });
  assert.equal(message.body.toLowerCase().includes(forbidden.toLowerCase()), false);
  assert.match(message.body, /רצועה ×1/);
});

test("the same alert is sent once per window", async () => {
  const clock = clockOf();
  const { sent, transport } = recording();
  const notifier = notifierWith({
    transport,
    now: clock.now,
    schedule: clock.schedule,
    windowMs: 600_000,
  });
  const event = {
    type: "order.paid",
    orderNumber: "MIPO-1001",
    total: 10,
    lines: [{ name: "רצועה", quantity: 1 }],
  };
  notifier.notify(event);
  notifier.notify(event);
  await notifier.whenIdle();
  assert.equal(sent.length, 1);

  clock.advance(600_000);
  notifier.notify(event);
  await notifier.whenIdle();
  assert.equal(sent.length, 2);
});

test("repeated server errors collapse into one count", async () => {
  const clock = clockOf();
  const { sent, transport } = recording();
  const notifier = notifierWith({
    transport,
    now: clock.now,
    schedule: clock.schedule,
    windowMs: 600_000,
  });
  const event = { type: "server.error", statusCode: 500, method: "POST", path: "/api/orders" };
  notifier.notify(event);
  notifier.notify(event);
  notifier.notify(event);
  notifier.notify(event);
  await notifier.whenIdle();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body.includes("פעמים"), false);

  clock.advance(600_000);
  clock.runDue();
  await notifier.whenIdle();
  assert.equal(sent.length, 2);
  assert.match(sent[1].body, /אותה שגיאה × 4 פעמים ב-10 הדקות האחרונות/);
  assert.equal(aggregateLine(4, 600_000), "אותה שגיאה × 4 פעמים ב-10 הדקות האחרונות");
});

test("a missing setting is a no-op and logs once", async () => {
  let called = false;
  const lines = [];
  const notifier = createOwnerNotifier({
    env: {},
    fetchImpl: async () => { called = true; return { ok: true }; },
    log: { log: (line) => lines.push(line), error: (line) => lines.push(line) },
  });
  notifier.notify({ type: "order.paid", orderNumber: "MIPO-1001", total: 1, lines: [] });
  notifier.notify({
    type: "user.registered",
    userId,
    displayName: "דנה",
  });
  await notifier.whenIdle();
  assert.equal(called, false);
  assert.equal(notifier.enabled, false);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /\[owner-notify\] off/);
});

test("every required setting has to be present", () => {
  assert.equal(readOwnerNotifyConfig(enabledEnv).enabled, true);
  for (const key of [
    "OWNER_NOTIFICATIONS_ENABLED",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_WHATSAPP_FROM",
    "OWNER_WHATSAPP_TO",
  ]) {
    const env = { ...enabledEnv };
    delete env[key];
    assert.equal(readOwnerNotifyConfig(env).enabled, false, key);
  }
  assert.equal(readOwnerNotifyConfig({ ...enabledEnv, OWNER_NOTIFICATIONS_ENABLED: "false" }).enabled, false);
});

test("the Twilio transport is a form post and can switch to a content template", async () => {
  let captured;
  const fetchImpl = async (url, options) => {
    captured = { url, options };
    return { ok: true, status: 201 };
  };
  const notifier = notifierWith({ fetchImpl });
  notifier.notify({
    type: "order.paid",
    orderNumber: "MIPO-1001",
    total: 150,
    lines: [{ name: "מזון כלבים", quantity: 2 }],
  });
  await notifier.whenIdle();

  assert.match(captured.url, /\/Accounts\/AC00000000000000000000000000000000\/Messages\.json$/);
  assert.equal(captured.options.method, "POST");
  const params = new URLSearchParams(captured.options.body);
  assert.match(params.get("Body"), /הזמנה חדשה שולמה/);
  assert.match(params.get("Body"), /מזון כלבים ×2/);
  assert.equal(params.get("From"), "whatsapp:+10000000000");
  assert.equal(params.get("To"), "whatsapp:+10000000001");
  assert.equal(params.get("ContentSid"), null);
  const decoded = Buffer.from(captured.options.headers.authorization.replace(/^Basic /, ""), "base64").toString();
  assert.equal(decoded, "AC00000000000000000000000000000000:test-auth-token");

  let templated;
  const templatedNotifier = notifierWith({
    env: {
      ...enabledEnv,
      TWILIO_WHATSAPP_CONTENT_SIDS: JSON.stringify({
        "order.paid": "HX00000000000000000000000000000000",
      }),
    },
    fetchImpl: async (url, options) => {
      templated = new URLSearchParams(options.body);
      return { ok: true, status: 201 };
    },
  });
  templatedNotifier.notify({
    type: "order.paid",
    orderNumber: "MIPO-1001",
    total: 150,
    lines: [{ name: "מזון כלבים", quantity: 2 }],
  });
  await templatedNotifier.whenIdle();
  assert.equal(templated.get("ContentSid"), "HX00000000000000000000000000000000");
  assert.equal(templated.get("Body"), null);
  assert.match(templated.get("ContentVariables"), /MIPO-1001/);
});

test("a throwing transport does not break a paid order, a declined webhook, or signup", async () => {
  const logs = [];
  const notifier = notifierWith({
    transport: { async send() { throw new Error("twilio down"); } },
    log: { log() {}, error: (...parts) => logs.push(parts.join(" ")) },
  });

  const paid = { status: 201, orderNumber: "MIPO-1001" };
  reportPaidOrder(notifier.notify, {
    orderNumber: paid.orderNumber,
    total: 40,
    lines: [{ name: "רצועה", quantity: 1 }],
  });
  assert.equal(paid.status, 201);

  const declined = { received: true, payment_status: "failed" };
  reportDeclinedPayment(notifier.notify, {
    orderNumber: "MIPO-1001",
    total: 40,
    operationResponse: 5116,
    dealResponse: null,
  });
  assert.equal(declined.payment_status, "failed");

  const signup = { status: 201, userId };
  reportNewUser(notifier.notify, { userId: signup.userId, displayName: "דנה לוי" });
  assert.equal(signup.status, 201);

  reportUnsettledPayment(notifier.notify, { statusCode: 409 });
  reportServerError(notifier.notify, { statusCode: 500, method: "POST", path: "/api/orders" });

  await notifier.whenIdle();
  assert.ok(logs.some((line) => line.includes("send failed")));
});

test("the payment webhook returns before a hanging transport finishes", async () => {
  const notifier = notifierWith({
    timeoutMs: 300,
    transport: {
      async send({ signal }) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 30_000);
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          });
        });
      },
    },
  });
  const started = Date.now();
  const webhook = async () => {
    reportDeclinedPayment(notifier.notify, {
      orderNumber: "MIPO-1001",
      total: 80,
      operationResponse: 2006,
      dealResponse: 2006,
    });
    reportUnsettledPayment(notifier.notify, { statusCode: 502 });
    return { received: true, payment_status: "failed" };
  };
  const response = await webhook();
  assert.equal(response.payment_status, "failed");
  assert.ok(Date.now() - started < 100);
  await notifier.whenIdle();
  assert.ok(Date.now() - started < 1_500);
});

test("loading order lines for a paid notice does not block the webhook", async () => {
  const { sent, transport } = recording();
  const notifier = notifierWith({ transport });
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const started = Date.now();
  const response = await (async () => {
    schedulePaidOrderNotice(
      notifier.notify,
      () => pending,
      { orderNumber: "MIPO-1001", total: 15 },
    );
    return { received: true, payment_status: "paid" };
  })();
  assert.deepEqual(response, { received: true, payment_status: "paid" });
  assert.ok(Date.now() - started < 50);
  assert.equal(sent.length, 0);
  release([{ name: "רצועה", quantity: 1 }]);
  await pending;
  await new Promise((resolve) => setImmediate(resolve));
  await notifier.whenIdle();
  assert.equal(sent.length, 1);
  assert.match(sent[0].body, /רצועה ×1/);
});

test("a line-load failure still notifies and does not reject", async () => {
  const { sent, transport } = recording();
  const notifier = notifierWith({ transport });
  schedulePaidOrderNotice(
    notifier.notify,
    async () => { throw new Error("database unavailable"); },
    { orderNumber: "MIPO-1001", total: 15 },
  );
  await new Promise((resolve) => setImmediate(resolve));
  await notifier.whenIdle();
  assert.equal(sent.length, 1);
  assert.match(sent[0].body, /לא פורטו/);
});

test("signup and order helpers ignore a notify that throws synchronously", () => {
  const explode = () => { throw new Error("boom"); };
  assert.doesNotThrow(() => reportPaidOrder(explode, { orderNumber: "MIPO-1001", total: 1, lines: [] }));
  assert.doesNotThrow(() => reportDeclinedPayment(explode, { orderNumber: "MIPO-1001", total: 1 }));
  assert.doesNotThrow(() => reportUnsettledPayment(explode, { statusCode: 409 }));
  assert.doesNotThrow(() => reportNewUser(explode, { userId, displayName: "דנה" }));
  assert.doesNotThrow(() => reportServerError(explode, { statusCode: 500, method: "GET", path: "/api/health" }));
});

test("the QA call accepts only the shared secret and a boolean result", () => {
  assert.equal(authorizeOwnerQa("", "Bearer test-qa-secret"), "missing");
  assert.equal(authorizeOwnerQa("test-qa-secret", "Bearer other-secret"), "denied");
  assert.equal(authorizeOwnerQa("test-qa-secret", "test-qa-secret"), "denied");
  assert.equal(authorizeOwnerQa("test-qa-secret", "Bearer test-qa-secret"), "ok");
  assert.deepEqual(qaEventFromBody({ ok: true, summary: "החנות נפתחת" }).notify, {
    type: "qa",
    ok: true,
    summary: "החנות נפתחת",
  });
  assert.equal(qaEventFromBody({ ok: "true" }).error, "ok must be a boolean");
  assert.equal(qaEventFromBody({ ok: false, summary: "x".repeat(501) }).error, "summary is too long");
});

test("site-health alerts from outside the process and deploy alerts never fail the command", async () => {
  const calls = [];
  const down = await runOwnerNotifyCommand("site-health", {
    env: { ...enabledEnv, HEALTH_URL: "https://example.test/api/health" },
    log: silent,
    fetchImpl: async (url) => {
      calls.push(String(url));
      if (String(url).includes("/api/health")) return { ok: false, status: 503 };
      return { ok: true, status: 201 };
    },
  });
  assert.equal(down, 1);
  assert.ok(calls.some((url) => url.includes("api.twilio.com")));
  assert.equal(calls.some((url) => url.startsWith("https://example.test/api/health")), true);

  const healthyCalls = [];
  const up = await runOwnerNotifyCommand("site-health", {
    env: { ...enabledEnv, MIPO_PUBLIC_BASE_URL: "https://example.test" },
    log: silent,
    fetchImpl: async (url) => {
      healthyCalls.push(String(url));
      return { ok: true, status: 200 };
    },
  });
  assert.equal(up, 0);
  assert.deepEqual(healthyCalls, ["https://example.test/api/health"]);

  const deploy = await runOwnerNotifyCommand("deploy-failure", {
    env: { ...enabledEnv, MIPO_DEPLOY_SHA: "abc123def456" },
    log: silent,
    fetchImpl: async () => { throw new Error("network down"); },
  });
  assert.equal(deploy, 0);

  const successCalls = [];
  const success = await runOwnerNotifyCommand("deploy-success", {
    env: { ...enabledEnv, GITHUB_SHA: "abc123def4567890abcd1234ef567890abcd1234" },
    log: silent,
    fetchImpl: async (url, options) => {
      successCalls.push(new URLSearchParams(options.body).get("Body"));
      return { ok: true, status: 201 };
    },
  });
  assert.equal(success, 0);
  assert.match(successCalls[0], /פריסה לייצור הצליחה/);
  assert.match(successCalls[0], /abc123def456/);
});

test("the live request paths call the notifier", () => {
  const source = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(source, /notifyOwnerPaidOrder\(/);
  assert.match(source, /reportPaidOrder\(notifyOwner/);
  assert.match(source, /reportDeclinedPayment\(notifyOwner/);
  assert.match(source, /reportUnsettledPayment\(notifyOwner/);
  assert.match(source, /reportNewUser\(notifyOwner/);
  assert.match(source, /reportServerError\(notifyOwner/);
  assert.match(source, /authorizeOwnerQa\(/);
});
