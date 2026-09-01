// AI gateway integration check.
//
// Verifies against a real database the things a unit test cannot: that the
// ledger constraints actually make a replay idempotent, that a failed call
// writes no usage, and that a leaked provider key is redacted before storage.
// Uses a stub adapter, so no provider is called and the numbers are exact.
import pg from "pg";
const { Pool } = pg;
import { createAiGateway } from "../src/aiGateway.js";

// Requires a migrated database. Not part of `npm test` (which is unit-only):
//   DATABASE_URL=postgres://... node scripts/aiGatewayIntegrationCheck.mjs
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required for the AI gateway integration check");
  process.exit(2);
}

const pool = new Pool({ connectionString: databaseUrl, ssl: process.env.DB_SSL === "false" ? false : undefined });

const quietLogger = { info: () => {}, warn: () => {}, error: console.error };

let calls = 0;
const stubRegistry = {
  get: () => ({
    slug: "google-gemini",
    isConfigured: () => true,
    async generateJson() {
      calls += 1;
      return {
        text: '{"content":"ok"}',
        json: { content: "ok" },
        usage: { input_tokens: 9000, output_tokens: 1420, cached_tokens: 0, total_tokens: 10420 },
        provider_model_name: "gemini-2.5-flash",
        finish_reason: "STOP",
      };
    },
  }),
  list: () => [],
  slugs: () => ["google-gemini"],
};

const failingRegistry = {
  get: () => ({
    slug: "google-gemini",
    isConfigured: () => true,
    async generateJson() {
      const error = new Error("Gemini request failed (429) key=AIzaSyLEAKED0000000000");
      error.status = 429;
      error.code = "rate_limited";
      throw error;
    },
  }),
  list: () => [], slugs: () => ["google-gemini"],
};

const assert = (label, condition, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) process.exitCode = 1;
};

const run = async () => {
  const user = await pool.query(
    `insert into public.app_users (email, password_hash, full_name)
     values ('gateway-test@example.com', 'scrypt$x$y', 'Gateway Test')
     on conflict (email) do update set updated_at = now()
     returning id`,
  );
  const userId = user.rows[0].id;

  const gateway = createAiGateway({ pool, registry: stubRegistry, logger: quietLogger });

  // --- one successful call -------------------------------------------------
  const requestId = `req_test_${Date.now()}`;
  const first = await gateway.runAiRequest({
    feature: "ai_chat",
    capability: "reasoning",
    parts: [{ text: "hello" }],
    userId,
    requestId,
    traceId: "trace_test_1",
  });

  assert("tokens recorded from the provider report", first.usage.total_tokens === 10420,
    `total_tokens=${first.usage.total_tokens}`);
  assert("mipo credits are a separate number", first.credits === 41.68, `credits=${first.credits}`);
  assert("provider cost is a third separate number", first.cost.provider_cost === 0.00625,
    `cost=${first.cost.provider_cost}`);
  assert("the three quantities are not equal",
    first.usage.total_tokens !== first.credits && first.credits !== first.cost.provider_cost);

  const afterFirst = await pool.query(`
    select
      (select count(*) from public.ai_requests where request_id = $1)::int as requests,
      (select count(*) from public.usage_events u join public.ai_requests r on r.id = u.ai_request_id where r.request_id = $1)::int as usage_events,
      (select count(*) from public.cost_events c join public.usage_events u on u.id = c.usage_event_id
         join public.ai_requests r on r.id = u.ai_request_id where r.request_id = $1)::int as cost_events
  `, [requestId]);
  const a = afterFirst.rows[0];
  assert("one request, one usage event, one cost event",
    a.requests === 1 && a.usage_events === 1 && a.cost_events === 1, JSON.stringify(a));

  // --- IDEMPOTENCY: the same request_id replayed after a crash -------------
  await gateway.runAiRequest({
    feature: "ai_chat",
    capability: "reasoning",
    parts: [{ text: "hello" }],
    userId,
    requestId,
    traceId: "trace_test_1",
  });

  const afterReplay = await pool.query(`
    select
      (select count(*) from public.ai_requests where request_id = $1)::int as requests,
      (select count(*) from public.usage_events u join public.ai_requests r on r.id = u.ai_request_id where r.request_id = $1)::int as usage_events,
      (select count(*) from public.cost_events c join public.usage_events u on u.id = c.usage_event_id
         join public.ai_requests r on r.id = u.ai_request_id where r.request_id = $1)::int as cost_events,
      (select attempt from public.ai_requests where request_id = $1)::int as attempt
  `, [requestId]);
  const b = afterReplay.rows[0];
  assert("replay does not double-count usage", b.usage_events === 1, `usage_events=${b.usage_events}`);
  assert("replay does not double-count cost", b.cost_events === 1, `cost_events=${b.cost_events}`);
  assert("replay is visible as a second attempt", b.attempt === 2, `attempt=${b.attempt}`);

  // --- no prompt content stored -------------------------------------------
  const stored = await pool.query(
    "select metadata::text as metadata from public.ai_requests where request_id = $1", [requestId],
  );
  assert("no prompt content in the ledger", !stored.rows[0].metadata.includes("hello"),
    stored.rows[0].metadata);

  // --- a failed call: request row, no ledger rows, no leaked key -----------
  const failGateway = createAiGateway({ pool, registry: failingRegistry, logger: quietLogger });
  const failRequestId = `req_fail_${Date.now()}`;
  let threw = null;
  try {
    await failGateway.runAiRequest({
      feature: "ai_chat", capability: "reasoning", parts: [{ text: "x" }],
      userId, requestId: failRequestId, traceId: "trace_test_2",
    });
  } catch (error) { threw = error; }

  assert("a provider failure surfaces to the caller", threw !== null);
  assert("the thrown message carries no api key", threw && !threw.message.includes("AIzaSyLEAKED0000000000"),
    threw?.message);

  const failRow = await pool.query(`
    select r.status, r.error_code, r.safe_error_message,
      (select count(*) from public.usage_events u where u.ai_request_id = r.id)::int as usage_events
    from public.ai_requests r where r.request_id = $1
  `, [failRequestId]);
  const f = failRow.rows[0];
  assert("failed request is recorded for the trace", f.status === "failed", `status=${f.status}`);
  assert("failed request writes no usage event", f.usage_events === 0, `usage_events=${f.usage_events}`);
  assert("stored error message has the key redacted",
    !f.safe_error_message.includes("AIzaSyLEAKED0000000000") && f.safe_error_message.includes("[redacted]"),
    f.safe_error_message);

  // --- per-unit metering for image generation ------------------------------
  await gateway.recordExternalUsage({
    feature: "pet_character", category: "image", modelSlug: "gemini-2.5-flash-image",
    quantity: 3, unit: "image", userId, requestId: `req_img_${Date.now()}`,
  });
  const image = await pool.query(`
    select c.provider_cost, u.unit, u.quantity
    from public.usage_events u join public.cost_events c on c.usage_event_id = u.id
    where u.category = 'image' order by u.created_at desc limit 1
  `);
  assert("image generation is priced per unit", Number(image.rows[0].provider_cost) === 0.117,
    `cost=${image.rows[0].provider_cost} for ${image.rows[0].quantity} ${image.rows[0].unit}`);

  await pool.end();
};

run().catch((error) => { console.error(error); process.exit(1); });
