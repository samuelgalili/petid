// Owner WhatsApp alerts.
//
// One entry point: notifyOwner(event), from createOwnerNotifier(). Message text
// for each event is built here. The transport is the only part that knows
// about Twilio, so moving from the Sandbox to an approved WhatsApp Business
// sender — and later to approved templates (Content SID), which are required
// outside the 24-hour session window — is a configuration change.
//
// Production runs one mipo-api container (deploy/aws/docker-compose.yml has no
// replicas, and the process is a single node http server). The throttle is
// in memory, same as the rate limiter. A second instance would each send its
// own copy; that would need a shared store.
//
// Nothing here may throw into a request. Callers do not await notify().

import { createHash, timingSafeEqual } from "node:crypto";

const DEFAULT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 4000;

const EVENT_TYPES = new Set([
  "order.paid",
  "payment.failed",
  "payment.unsettled",
  "user.registered",
  "server.error",
  "site.down",
  "deploy",
  "qa",
]);

const AGGREGATED = new Set(["payment.unsettled", "server.error", "site.down"]);

const brandLatin = new RegExp(["tama", "gotchi"].join(""), "ig");
const brandHebrew = new RegExp(["טמא", "גוצ", "['׳’]?", "י"].join(""), "g");

export const stripBrand = (value) => String(value ?? "").replace(brandLatin, "").replace(brandHebrew, "");

const scrubFreeText = (value, max = 80) => {
  let text = stripBrand(value);
  text = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "");
  text = text.replace(/\b\d(?:[ -]?\d){12,18}\b/g, "");
  text = text.replace(/(?:\+972[-\s]?|0)5\d(?:[-\s]?\d){7}/g, "");
  text = text.replace(/whatsapp:\+\d{8,15}/gi, "");
  text = text.replace(/\+\d{8,15}/g, "");
  text = text.replace(/\b(?:sk|pk|tok|rk)_[A-Za-z0-9]+/g, "");
  text = text.replace(/\bAC[a-f0-9]{32}\b/gi, "");
  text = text.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return text.slice(0, max);
};

const redactBody = (value) => {
  let text = stripBrand(value);
  text = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "");
  text = text.replace(/\b\d(?:[ -]?\d){12,18}\b/g, "");
  return text.replace(/[ \t]+\n/g, "\n").trim().slice(0, 1400);
};

const cleanOrderNumber = (value) => {
  const text = String(value ?? "").trim();
  return /^[A-Za-z0-9-]{4,40}$/.test(text) ? text : "";
};

const formatShekels = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return `${amount.toFixed(2)} ₪`;
};

const integerOrNull = (value) => {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
};

const productLines = (lines) => {
  if (!Array.isArray(lines)) return [];
  const rendered = [];
  let hidden = 0;
  for (const line of lines) {
    const name = scrubFreeText(line?.name ?? line?.product_name, 40);
    if (!name) continue;
    if (rendered.length >= 8) {
      hidden += 1;
      continue;
    }
    const quantity = integerOrNull(line?.quantity);
    rendered.push(quantity && quantity > 0 ? `${name} ×${quantity}` : name);
  }
  if (hidden > 0) rendered.push(`ועוד ${hidden}`);
  return rendered;
};

const httpMethod = (value) => {
  const method = String(value ?? "").toUpperCase();
  return ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].includes(method) ? method : "HTTP";
};

const requestPath = (value) => {
  const path = scrubFreeText(String(value ?? "").split("?")[0], 120);
  return path.startsWith("/") ? path : "";
};

const hostOf = (value) => {
  try {
    return new URL(String(value)).host.slice(0, 80);
  } catch {
    return "";
  }
};

const shortSha = (value) => {
  const text = String(value ?? "").trim();
  return /^[a-f0-9]{7,40}$/i.test(text) ? text.slice(0, 12) : "";
};

const unsettledReason = (statusCode) => {
  switch (statusCode) {
    case 409: return "הסכום שחויב לא תואם את ההזמנה";
    case 404: return "ההזמנה לא נמצאה באתר";
    case 401: return "אימות הקריאה נכשל";
    case 400: return "הקריאה מספק הסליקה לא תקינה";
    case 502: return "אימות מול ספק הסליקה נכשל";
    case 503: return "ספק הסליקה לא זמין";
    default: return "התשלום לא עודכן באתר";
  }
};

const digest = (value) => createHash("sha256").update(String(value)).digest("hex").slice(0, 12);

/**
 * Hebrew text for one event, plus the template variables a future Content SID
 * would fill. Returns null when the event is not one we send.
 */
export const buildOwnerMessage = (event) => {
  const type = event?.type;
  if (!EVENT_TYPES.has(type)) return null;

  if (type === "order.paid") {
    const orderNumber = cleanOrderNumber(event.orderNumber);
    const amount = formatShekels(event.total);
    const products = productLines(event.lines);
    const lines = ["הזמנה חדשה שולמה"];
    if (orderNumber) lines.push(`מספר: ${orderNumber}`);
    if (amount) lines.push(`סכום: ${amount}`);
    lines.push(`מוצרים: ${products.length > 0 ? products.join(", ") : "לא פורטו"}`);
    return {
      type,
      key: `order.paid:${orderNumber || "unknown"}`,
      aggregate: false,
      body: redactBody(lines.join("\n")),
      contentVariables: {
        1: orderNumber,
        2: amount,
        3: products.join(", "),
      },
    };
  }

  if (type === "payment.failed") {
    const orderNumber = cleanOrderNumber(event.orderNumber);
    const amount = formatShekels(event.total);
    const operation = integerOrNull(event.operationResponse);
    const deal = integerOrNull(event.dealResponse);
    const code = [operation, deal].filter((part, index, all) => part !== null && all.indexOf(part) === index).join("/");
    const lines = ["תשלום נדחה"];
    if (orderNumber) lines.push(`מספר: ${orderNumber}`);
    if (amount) lines.push(`סכום: ${amount}`);
    if (code) lines.push(`קוד: ${code}`);
    return {
      type,
      key: `payment.failed:${orderNumber || "unknown"}`,
      aggregate: false,
      body: redactBody(lines.join("\n")),
      contentVariables: { 1: orderNumber, 2: amount, 3: code },
    };
  }

  if (type === "payment.unsettled") {
    const statusCode = integerOrNull(event.statusCode) ?? 500;
    const reason = unsettledReason(statusCode);
    return {
      type,
      key: `payment.unsettled:${statusCode}`,
      aggregate: true,
      body: redactBody(`תשלום לא סומן כשולם\nסיבה: ${reason}`),
      contentVariables: { 1: reason, 2: String(statusCode) },
    };
  }

  if (type === "user.registered") {
    const userId = /^[0-9a-f-]{36}$/i.test(String(event.userId || "")) ? String(event.userId) : "";
    const name = scrubFreeText(event.displayName, 80);
    const lines = ["נרשם משתמש חדש"];
    if (name) lines.push(`שם: ${name}`);
    return {
      type,
      key: `user.registered:${userId || digest(name || "anonymous")}`,
      aggregate: false,
      body: redactBody(lines.join("\n")),
      contentVariables: { 1: name },
    };
  }

  if (type === "server.error") {
    const statusCode = integerOrNull(event.statusCode) ?? 500;
    const method = httpMethod(event.method);
    const path = requestPath(event.path);
    const where = [method, path].filter(Boolean).join(" ");
    return {
      type,
      key: `server.error:${statusCode}:${method}:${path || "-"}`,
      aggregate: true,
      body: redactBody(`שגיאת שרת ${statusCode}\n${where}`.trim()),
      contentVariables: { 1: String(statusCode), 2: where },
    };
  }

  if (type === "site.down") {
    const host = hostOf(event.target);
    const lines = ["האתר לא מגיב", "בדיקת הבריאות נכשלה"];
    if (host) lines.push(host);
    return {
      type,
      key: "site.down",
      aggregate: true,
      body: redactBody(lines.join("\n")),
      contentVariables: { 1: host },
    };
  }

  if (type === "deploy") {
    const ok = event.ok === true;
    const sha = shortSha(event.sha);
    const lines = [ok ? "פריסה לייצור הצליחה" : "פריסה לייצור נכשלה"];
    if (sha) lines.push(`גרסה: ${sha}`);
    return {
      type,
      key: `deploy:${ok ? "ok" : "fail"}:${sha || "unknown"}`,
      aggregate: false,
      body: redactBody(lines.join("\n")),
      contentVariables: { 1: ok ? "הצליחה" : "נכשלה", 2: sha },
    };
  }

  const summary = scrubFreeText(event.summary, 180);
  const ok = event.ok === true;
  const lines = [ok ? "בדיקה אחרי פריסה: עברה" : "בדיקה אחרי פריסה: נכשלה"];
  if (summary) lines.push(summary);
  return {
    type: "qa",
    key: `qa:${ok ? "ok" : "fail"}:${digest(summary)}`,
    aggregate: false,
    body: redactBody(lines.join("\n")),
    contentVariables: { 1: ok ? "עברה" : "נכשלה", 2: summary },
  };
};

export const aggregateLine = (count, windowMs) => {
  const minutes = Math.max(1, Math.round(Number(windowMs) / 60_000));
  const times = Math.max(2, Number(count) || 2);
  return `אותה שגיאה × ${times} פעמים ב-${minutes} הדקות האחרונות`;
};

const positiveInt = (value, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.floor(number);
};

export const normalizeWhatsappAddress = (value) => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  const withPrefix = trimmed.startsWith("whatsapp:") ? trimmed : `whatsapp:${trimmed}`;
  return /^whatsapp:\+\d{8,15}$/.test(withPrefix) ? withPrefix : null;
};

const parseContentSids = (raw) => {
  if (!raw || !String(raw).trim()) return {};
  try {
    const parsed = JSON.parse(String(raw));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const sids = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!EVENT_TYPES.has(key)) continue;
      const sid = String(value ?? "").trim();
      if (/^HX[a-zA-Z0-9]{8,64}$/.test(sid)) sids[key] = sid;
    }
    return sids;
  } catch {
    return {};
  }
};

export const readOwnerNotifyConfig = (env = process.env) => {
  const accountSid = String(env.TWILIO_ACCOUNT_SID ?? "").trim();
  const authToken = String(env.TWILIO_AUTH_TOKEN ?? "").trim();
  const from = normalizeWhatsappAddress(env.TWILIO_WHATSAPP_FROM);
  const to = normalizeWhatsappAddress(env.OWNER_WHATSAPP_TO);
  const flag = String(env.OWNER_NOTIFICATIONS_ENABLED ?? "").trim().toLowerCase();
  const flagOn = flag === "true" || flag === "1";
  const sidOk = /^[A-Za-z0-9]{10,64}$/.test(accountSid);
  const tokenOk = /^[A-Za-z0-9_-]{8,128}$/.test(authToken);
  return {
    enabled: Boolean(flagOn && sidOk && tokenOk && from && to),
    accountSid: sidOk ? accountSid : "",
    authToken: tokenOk ? authToken : "",
    from,
    to,
    windowMs: Math.min(24 * 60 * 60 * 1000, Math.max(1000, positiveInt(env.OWNER_NOTIFY_THROTTLE_MS, DEFAULT_WINDOW_MS))),
    timeoutMs: Math.min(10_000, Math.max(500, positiveInt(env.OWNER_NOTIFY_TIMEOUT_MS, DEFAULT_TIMEOUT_MS))),
    contentSids: parseContentSids(env.TWILIO_WHATSAPP_CONTENT_SIDS),
  };
};

const defaultSchedule = (fn, delay) => {
  const timer = setTimeout(fn, delay);
  if (typeof timer.unref === "function") timer.unref();
  return { cancel() { clearTimeout(timer); } };
};

export const createAlertThrottle = ({
  windowMs = DEFAULT_WINDOW_MS,
  now = Date.now,
  schedule = defaultSchedule,
} = {}) => {
  const buckets = new Map();
  return {
    take(key) {
      const t = now();
      const existing = buckets.get(key);
      if (!existing || t >= existing.expiresAt) {
        existing?.timer?.cancel();
        const previousRepeats = existing && t >= existing.expiresAt ? existing.suppressed : 0;
        const bucket = { expiresAt: t + windowMs, suppressed: 0, timer: null };
        buckets.set(key, bucket);
        return { deliver: true, previousRepeats };
      }
      existing.suppressed += 1;
      return { deliver: false, previousRepeats: 0 };
    },
    arm(key, onFlush) {
      const bucket = buckets.get(key);
      if (!bucket) return;
      bucket.timer?.cancel();
      const expiresAt = bucket.expiresAt;
      bucket.timer = schedule(() => {
        const current = buckets.get(key);
        if (!current || current.expiresAt !== expiresAt) return;
        const suppressed = current.suppressed;
        current.suppressed = 0;
        current.timer = null;
        if (suppressed > 0) onFlush(suppressed);
      }, Math.max(0, expiresAt - now()));
    },
  };
};

const contentVariables = (variables) => {
  const payload = {};
  for (const [key, value] of Object.entries(variables || {})) {
    const text = String(value ?? "").trim();
    if (text) payload[key] = text;
  }
  return payload;
};

export const createTwilioWhatsAppTransport = ({
  accountSid,
  authToken,
  from,
  to,
  contentSids = {},
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) => ({
  async send({ type, body, contentVariables: variables, signal }) {
    const params = new URLSearchParams();
    params.set("From", from);
    params.set("To", to);
    const contentSid = contentSids[type] || "";
    if (contentSid) {
      params.set("ContentSid", contentSid);
      const filled = contentVariables(variables);
      if (Object.keys(filled).length > 0) params.set("ContentVariables", JSON.stringify(filled));
    } else {
      params.set("Body", body);
    }
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener?.("abort", onAbort);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    if (typeof timer.unref === "function") timer.unref();
    try {
      const response = await fetchImpl(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
        {
          method: "POST",
          headers: {
            authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            "content-type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
          signal: controller.signal,
        },
      );
      if (!response?.ok) {
        const status = Number(response?.status) || 0;
        throw new Error(`twilio status ${status}`);
      }
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", onAbort);
    }
  },
});

const safeNotify = (notify, event) => {
  try {
    notify(event);
  } catch (error) {
    console.error("[owner-notify] not scheduled:", error?.message || "unknown");
  }
};

export const reportPaidOrder = (notify, notice) => safeNotify(notify, {
  type: "order.paid",
  orderNumber: notice?.orderNumber,
  total: notice?.total,
  lines: notice?.lines,
});

export const reportDeclinedPayment = (notify, notice) => safeNotify(notify, {
  type: "payment.failed",
  orderNumber: notice?.orderNumber,
  total: notice?.total,
  operationResponse: notice?.operationResponse,
  dealResponse: notice?.dealResponse,
});

export const reportUnsettledPayment = (notify, notice) => safeNotify(notify, {
  type: "payment.unsettled",
  statusCode: notice?.statusCode,
});

export const reportNewUser = (notify, notice) => safeNotify(notify, {
  type: "user.registered",
  userId: notice?.userId,
  displayName: notice?.displayName,
});

export const reportServerError = (notify, notice) => safeNotify(notify, {
  type: "server.error",
  statusCode: notice?.statusCode,
  method: notice?.method,
  path: notice?.path,
});

/**
 * Load order lines, then notify. Never awaited by the webhook: a slow or
 * failing read must not delay the Cardcom response.
 */
export const schedulePaidOrderNotice = (notify, loadLines, notice) => {
  Promise.resolve()
    .then(() => loadLines())
    .then((lines) => {
      reportPaidOrder(notify, { ...notice, lines: lines || [] });
    })
    .catch((error) => {
      console.error("[owner-notify] order lines unread:", error?.message || "unknown");
      reportPaidOrder(notify, { ...notice, lines: [] });
    });
};

const secretsMatch = (actual, expected) => {
  const left = Buffer.from(String(actual));
  const right = Buffer.from(String(expected));
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

export const authorizeOwnerQa = (secret, authorization) => {
  if (!secret) return "missing";
  const match = /^Bearer\s+(\S+)$/.exec(String(authorization || ""));
  if (!match || !secretsMatch(match[1], secret)) return "denied";
  return "ok";
};

export const qaEventFromBody = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.ok !== "boolean") {
    return { error: "ok must be a boolean" };
  }
  if (body.summary != null && typeof body.summary !== "string") {
    return { error: "summary must be a string" };
  }
  if (String(body.summary || "").length > 500) return { error: "summary is too long" };
  return { notify: { type: "qa", ok: body.ok, summary: body.summary || "" } };
};

export const probeHealth = async (url, { fetchImpl = fetch, timeoutMs = 10_000 } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (typeof timer.unref === "function") timer.unref();
  try {
    const response = await fetchImpl(url, { method: "GET", signal: controller.signal });
    return Boolean(response?.ok);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

export const createOwnerNotifier = ({
  env = process.env,
  fetchImpl,
  transport,
  now,
  schedule,
  log = console,
  windowMs,
  timeoutMs,
} = {}) => {
  const config = readOwnerNotifyConfig(env);
  const resolvedWindow = windowMs || config.windowMs;
  const resolvedTimeout = timeoutMs || config.timeoutMs;
  const throttle = createAlertThrottle({
    windowMs: resolvedWindow,
    ...(now ? { now } : {}),
    ...(schedule ? { schedule } : {}),
  });
  const sender = transport || (config.enabled
    ? createTwilioWhatsAppTransport({
      accountSid: config.accountSid,
      authToken: config.authToken,
      from: config.from,
      to: config.to,
      contentSids: config.contentSids,
      fetchImpl,
      timeoutMs: resolvedTimeout,
    })
    : null);
  let warned = false;
  let chain = Promise.resolve();

  const warnDisabled = () => {
    if (warned) return;
    warned = true;
    log.log?.("[owner-notify] off (missing OWNER_NOTIFICATIONS_ENABLED or Twilio WhatsApp settings)");
  };

  const send = async (message) => {
    if (!sender) return;
    const controller = new AbortController();
    let timer;
    try {
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("timeout"));
        }, resolvedTimeout);
        if (typeof timer.unref === "function") timer.unref();
      });
      // A transport that rejects after the timeout already won must not become
      // an unhandled rejection. Promise.resolve also catches a sync throw.
      const attempt = Promise.resolve().then(() => sender.send({ ...message, signal: controller.signal }));
      attempt.catch(() => {});
      await Promise.race([attempt, timeout]);
    } catch (error) {
      log.error?.("[owner-notify] send failed:", error?.message || "unknown");
    } finally {
      clearTimeout(timer);
    }
  };

  const enqueue = (message) => {
    chain = chain.then(() => send(message));
  };

  if (!config.enabled) warnDisabled();

  const notify = (event) => {
    try {
      if (!config.enabled) {
        warnDisabled();
        return;
      }
      const built = buildOwnerMessage(event);
      if (!built) return;
      const decision = throttle.take(built.key);
      if (!decision.deliver) return;
      const body = decision.previousRepeats > 0 && built.aggregate
        ? `${built.body}\n${aggregateLine(decision.previousRepeats + 1, resolvedWindow)}`
        : built.body;
      enqueue({ ...built, body });
      if (built.aggregate) {
        throttle.arm(built.key, (suppressed) => {
          enqueue({
            ...built,
            body: `${built.body}\n${aggregateLine(suppressed + 1, resolvedWindow)}`,
          });
        });
      }
    } catch (error) {
      log.error?.("[owner-notify] not scheduled:", error?.message || "unknown");
    }
  };

  return {
    notify,
    whenIdle: () => chain,
    enabled: config.enabled,
  };
};

const healthUrlFrom = (env) => {
  const base = String(env.HEALTH_URL || env.MIPO_PUBLIC_BASE_URL || "").trim();
  if (!base) return "";
  return base.endsWith("/api/health") ? base : `${base.replace(/\/$/, "")}/api/health`;
};

/**
 * Used by GitHub Actions. Deploy commands always return 0: a Twilio problem
 * must not turn a finished deploy red. site-health returns 1 when the probe
 * fails, whether or not the alert was sent.
 */
export const runOwnerNotifyCommand = async (command, {
  env = process.env,
  fetchImpl,
  log = console,
} = {}) => {
  const notifier = createOwnerNotifier({ env, fetchImpl, log });
  if (command === "deploy-success" || command === "deploy-failure") {
    notifier.notify({
      type: "deploy",
      ok: command === "deploy-success",
      sha: env.MIPO_DEPLOY_SHA || env.GITHUB_SHA || "",
    });
    await notifier.whenIdle();
    return 0;
  }
  if (command === "site-health") {
    const url = healthUrlFrom(env);
    if (!url) {
      log.error?.("[owner-notify] HEALTH_URL is not set");
      return 1;
    }
    const ok = await probeHealth(url, { fetchImpl });
    if (ok) return 0;
    notifier.notify({ type: "site.down", target: url });
    await notifier.whenIdle();
    return 1;
  }
  if (command === "qa") {
    const parsed = qaEventFromBody({
      ok: env.QA_OK === "true",
      summary: env.QA_SUMMARY || "",
    });
    if (parsed.notify && env.QA_OK !== "true" && env.QA_OK !== "false") {
      log.error?.("[owner-notify] QA_OK must be true or false");
      return 0;
    }
    if (parsed.notify) notifier.notify(parsed.notify);
    await notifier.whenIdle();
    return 0;
  }
  log.error?.("[owner-notify] unknown command");
  return 0;
};
