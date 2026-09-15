#!/usr/bin/env node
//
// Boots the API against a real database and exercises the routes that read the
// schema, so a migration that breaks a live query fails the build instead of
// production.
//
// This is what a staging server would otherwise be for. It is deliberately
// aimed at the failure mode migrations actually cause: a column is dropped or
// moved, and some query three thousand lines away still selects it. Unit tests
// never see that — only a real request against a real schema does.
//
// Usage:  DATABASE_URL=postgres://... node server/scripts/db-smoke.mjs

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = Number(process.env.SMOKE_PORT || 3111);
const BASE = `http://127.0.0.1:${PORT}`;
const BOOT_TIMEOUT_MS = 30_000;

// Generated per run and handed to the API it boots, so the admin routes can be
// exercised here. It never leaves this process.
const SMOKE_ADMIN_KEY = `smoke-${Math.random().toString(36).slice(2)}`;

// A 15-digit microchip number unique to this run. The column is globally
// unique, so a hardcoded one turns every re-run against the same database into
// a false red.
const SMOKE_MICROCHIP = `9${String(Date.now()).slice(-9)}${String(Math.floor(Math.random() * 100000)).padStart(5, "0")}`;

const results = [];
let failures = 0;

const check = async (name, fn) => {
  try {
    await fn();
    results.push(`  ok    ${name}`);
  } catch (error) {
    failures += 1;
    results.push(`  FAIL  ${name}\n          ${error.message}`);
  }
};

const expectStatus = (response, expected, label) => {
  if (!expected.includes(response.status)) {
    throw new Error(`${label}: expected ${expected.join(" or ")}, got ${response.status}`);
  }
};

// A 500 is the signature of a query hitting a column that is no longer there.
const expectNotServerError = (response, label) => {
  if (response.status >= 500) {
    throw new Error(`${label}: server error ${response.status} — a query probably references a missing column`);
  }
};

const main = async () => {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const api = spawn("node", ["src/index.js"], {
    cwd: new URL("..", import.meta.url).pathname,
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "test",
      DB_SSL: "false",
      UPLOAD_DIR: "/tmp/mipo-smoke-uploads",
      PRIVATE_UPLOAD_DIR: "/tmp/mipo-smoke-private",
      // So the admin-only routes can be exercised here rather than skipped.
      // isAdminRequest accepts this key on the x-admin-api-key header.
      ADMIN_API_KEY: SMOKE_ADMIN_KEY,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let apiLog = "";
  api.stdout.on("data", (chunk) => { apiLog += chunk; });
  api.stderr.on("data", (chunk) => { apiLog += chunk; });

  const shutdown = () => { if (!api.killed) api.kill("SIGTERM"); };
  process.on("exit", shutdown);

  // Wait for the API to answer, or surface its startup log if it never does.
  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  let booted = false;
  while (Date.now() < deadline) {
    if (api.exitCode !== null) break;
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) { booted = true; break; }
    } catch {
      // not listening yet
    }
    await sleep(400);
  }

  if (!booted) {
    console.error("API did not become healthy. Startup output:\n");
    console.error(apiLog || "(no output)");
    shutdown();
    process.exit(1);
  }

  console.log(`API is up on ${BASE}\n`);

  // ── Public surface ───────────────────────────────────────────────
  await check("GET /api/health", async () => {
    expectStatus(await fetch(`${BASE}/api/health`), [200], "health");
  });

  // The deploy's own gate: the container healthcheck blocks on this and the
  // post-deploy smoke test asks for it. Running it here, against a schema built
  // by the real migrations, is what keeps the probes in health.js honest — a
  // probe naming a column that no longer exists fails the build rather than
  // failing every deploy afterwards.
  await check("GET /api/health/schema answers for every probe", async () => {
    const response = await fetch(`${BASE}/api/health/schema`);
    const body = await response.json();
    if (response.status !== 200) {
      throw new Error(`schema health: ${JSON.stringify(body.failures || body)}`);
    }
    if (!body.checked || body.checked < 1) {
      throw new Error(`schema health ran no probes: ${JSON.stringify(body)}`);
    }
  });

  await check("GET /api/db/health stays behind admin auth", async () => {
    // Not a liveness check — the authenticated calls below prove the database
    // is reachable. This asserts the route has not been left open.
    expectStatus(await fetch(`${BASE}/api/db/health`), [401, 403], "db health");
  });

  await check("GET /api/products", async () => {
    expectNotServerError(await fetch(`${BASE}/api/products`), "products");
  });

  await check("GET /api/breeds", async () => {
    expectNotServerError(await fetch(`${BASE}/api/breeds`), "breeds");
  });

  // ── Authenticated surface — the paths that read profiles ─────────
  // These are the ones a profiles migration breaks.
  const email = `smoke-${Date.now()}@example.test`;
  let cookie = null;

  await check("POST /api/auth/signup writes app_users and profiles", async () => {
    const response = await fetch(`${BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // accept_terms is enforced by the server, not only by the form, so
      // signup answers 400 without it. The app sends it; this script did not,
      // which is why it read a working signup as broken.
      body: JSON.stringify({
        email,
        password: "smoke-test-password",
        full_name: "Smoke Test",
        accept_terms: true,
      }),
    });
    expectNotServerError(response, "signup");
    expectStatus(response, [200, 201], "signup");

    const setCookie = response.headers.get("set-cookie");
    if (!setCookie) throw new Error("signup returned no session cookie");
    cookie = setCookie.split(";")[0];

    const body = await response.json();
    // Guards the API contract the frontend depends on: identity must still be
    // served on the profile object even after it moved to app_users.
    if (body.profile?.email !== email) {
      throw new Error(`profile.email missing or wrong: ${JSON.stringify(body.profile?.email)}`);
    }
    if (body.profile?.full_name !== "Smoke Test") {
      throw new Error(`profile.full_name missing: ${JSON.stringify(body.profile?.full_name)}`);
    }
  });

  const authed = (path, init = {}) => fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...(init.headers || {}), cookie },
  });

  const admin = (path, init = {}) => fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...(init.headers || {}), "x-admin-api-key": SMOKE_ADMIN_KEY },
  });

  await check("GET /api/auth/me joins app_users and profiles", async () => {
    const response = await authed("/api/auth/me");
    expectNotServerError(response, "auth/me");
    expectStatus(response, [200], "auth/me");
    const body = await response.json();
    if (body.user?.email !== email) throw new Error("user.email did not survive the round trip");
    if (body.profile?.email !== email) throw new Error("profile.email did not survive the round trip");
  });

  await check("PATCH /api/me/profile writes both identity and profile fields", async () => {
    const response = await authed("/api/me/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ full_name: "Smoke Renamed", phone: "0501234567", city: "Tel Aviv" }),
    });
    expectNotServerError(response, "profile update");
    expectStatus(response, [200], "profile update");
    const body = await response.json();
    if (body.profile?.full_name !== "Smoke Renamed") {
      throw new Error(`name did not persist: ${JSON.stringify(body.profile?.full_name)}`);
    }
    if (body.profile?.city !== "Tel Aviv") {
      throw new Error("a profiles-only field did not persist");
    }
  });

  await check("GET /api/me/pets", async () => {
    expectNotServerError(await authed("/api/me/pets"), "pets");
  });

  await check("GET /api/feed reads the social author join", async () => {
    expectNotServerError(await authed("/api/feed"), "feed");
  });

  await check("GET /api/me/notifications", async () => {
    expectNotServerError(await authed("/api/me/notifications"), "notifications");
  });

  await check("GET /api/me/orders", async () => {
    expectNotServerError(await authed("/api/me/orders"), "orders");
  });

  await check("GET /api/me/documents", async () => {
    expectNotServerError(await authed("/api/me/documents"), "documents");
  });

  await check("POST /api/me/pets then read the public QR view", async () => {
    const created = await authed("/api/me/pets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Smoke Dog", type: "dog" }),
    });
    expectNotServerError(created, "create pet");
    if (created.status >= 400) return; // shape differences are not this test's job

    const body = await created.json();
    const petId = body.pet?.id || body.id;
    if (!petId) return;

    // Unauthenticated, and joins profiles plus app_users for the owner.
    const publicView = await fetch(`${BASE}/api/public/pets/${petId}`);
    expectNotServerError(publicView, "public pet");
  });

  // Create used to write nineteen of the forty-two columns the API accepts and
  // answer 201 anyway. This asserts against a real database that what the owner
  // sent is what came back, because only a real round trip can tell the
  // difference between a column that was stored and one that was discarded.
  await check("POST /api/me/pets stores every field it accepts", async () => {
    const sent = {
      name: "Parity Dog",
      type: "dog",
      // Microchip numbers are globally unique, so a fixed one makes this check
      // pass exactly once per database and 500 on every re-run afterwards - a
      // red that says nothing about the code. Per-run, like every other
      // fixture here. 15 digits, which is what a real chip number is.
      microchip_number: SMOKE_MICROCHIP,
      vet_clinic_name: "Smoke Clinic",
      vet_clinic_phone: "03-0000000",
      insurance_company: "Smoke Insurance",
      has_insurance: true,
      current_food: "Smoke Kibble",
      color: "black",
      next_vet_visit: "2027-01-15",
      lost_contact_phone: "050-0000000",
    };

    const created = await authed("/api/me/pets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sent),
    });
    expectStatus(created, [200, 201], "create pet with full payload");

    const body = await created.json();
    const pet = body.pet || body;

    // Date-only columns come back from pg as Date objects, so the API renders
    // them as full ISO timestamps ("2027-01-15T00:00:00.000Z") rather than the
    // "2027-01-15" that was sent. That is longstanding behaviour of every date
    // column here and is not what this check is about, so compare the date part.
    const comparable = (value) => {
      const text = String(value ?? "");
      return /^\d{4}-\d{2}-\d{2}T/.test(text) ? text.slice(0, 10) : text;
    };

    const dropped = Object.keys(sent).filter((field) => {
      const expected = sent[field];
      const actual = pet[field];
      return typeof expected === "boolean"
        ? actual !== expected
        : comparable(actual) !== comparable(expected);
    });

    if (dropped.length > 0) {
      throw new Error(`create accepted but did not store: ${dropped.join(", ")}`);
    }
  });

  // A negative age breaks the feeding portion, the life stage and the
  // preventive-care schedule, so the value is refused rather than stored.
  await check("POST /api/me/pets refuses a birth date in the future", async () => {
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const created = await authed("/api/me/pets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Time Traveller", type: "dog", birth_date: nextYear }),
    });
    expectStatus(created, [400], "future birth date");
  });

  // Today's date must still be accepted wherever the owner is: a date-only
  // value carries no timezone, so the bound has a day of slack.
  await check("POST /api/me/pets accepts a birth date of today", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const created = await authed("/api/me/pets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Newborn", type: "cat", birth_date: today }),
    });
    expectStatus(created, [200, 201], "birth date of today");
  });

  // Unknown has to stay unknown. The add-pet form used to pre-select "no", and
  // the column recorded a claim the owner never made.
  await check("POST /api/me/pets keeps an unanswered neuter status null", async () => {
    const created = await authed("/api/me/pets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Unstated", type: "cat", is_neutered: null }),
    });
    expectStatus(created, [200, 201], "null neuter status");

    const body = await created.json();
    const pet = body.pet || body;
    if (pet.is_neutered !== null) {
      throw new Error(`expected is_neutered null, got ${JSON.stringify(pet.is_neutered)}`);
    }
  });

  // Stage 0's unconditional close is NOT wired into the route in this deploy.
  // legacyProductCreation.js is written and unit-tested, but calling it would
  // shut every admin screen that adds a product while the intake UI that
  // replaces them does not exist yet. That decision is recorded in
  // createProduct's own comment and dated.
  //
  // So what these checks assert is the behaviour actually shipping, not the
  // behaviour intended later: G-1's freeze still refuses a SCRAPED-BACKED
  // payload with 409, and a hand-written one still succeeds. Asserting 410 here
  // would have been asserting something this build does not do - which is how a
  // suite ends up green against a system that behaves differently.
  //
  // When the intake UI ships and the close is wired up, these become 410 for
  // every shape, and the block below is the list of shapes to change.
  const legacyCreatePayloads = {
    "hand-written product": { name: "Stage0 Manual", price: 42 },
    "URL / scrape import": {
      name: "Stage0 Scraped", price: 55,
      source_url: "https://supplier.example.com/product/stage0",
    },
    "spreadsheet import (CSV/Excel)": {
      name: "Stage0 Spreadsheet", price: 30, sku: "CSV-1", category: "other", in_stock: true,
    },
    "quick import": {
      name: "Stage0 Quick", price: 61, brand: "B", supplier_id: null,
      source_url: "https://supplier.example.com/quick",
    },
    "duplicate of an existing product": {
      name: "Stage0 Duplicate (העתק)", price: 99, business_id: "cf941cc4-e1d1-4d7c-8122-a5df81a1e53c",
    },
  };

  // Scraped-backed payloads carry source_url; G-1 refuses exactly those.
  const isScrapedBacked = (payload) => Boolean(payload.source_url);

  for (const [label, payload] of Object.entries(legacyCreatePayloads)) {
    await check(`POST /api/products handles a ${label} as this build intends`, async () => {
      const response = await admin("/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.status === 401 || response.status === 403) return; // no admin key here

      // Whatever else changes, the one thing that must never come back is the
      // failure the Stage 0 audit found: a product reaching the public catalogue
      // without review. G-1 is what stands between that and the scrape imports,
      // and it is still deployed.
      if (isScrapedBacked(payload)) {
        expectStatus(response, [409], `${label} must still be refused by the G-1 freeze`);
        const body = await response.json();
        const serialized = JSON.stringify(body);
        if (/postgres|defaultBusinessId|token|secret/i.test(serialized)) {
          throw new Error("the refusal leaked internal detail");
        }
        return;
      }

      // A hand-written product still works, because the admin screens that
      // create one are the only ones there are until the intake UI ships.
      expectStatus(response, [200, 201], `${label} must still be accepted`);
      expectNotServerError(response, label);
    });
  }

  await check("a refused create adds nothing to the catalogue", async () => {
    // The refusal under test is now G-1's, not Stage 0's, but the property it
    // has to have is the same one and is the reason the guard sits where it
    // does: it must fire BEFORE ensureDefaultBusinessProfile inserts a business
    // row and before the image pipeline downloads bytes to disk. A guard placed
    // after either leaves an artifact behind for a product that never existed.
    // Unique to this run: `stamp` is declared further down and is not in scope here.
    const probeName = `Stage0 Probe Two ${Math.random().toString(36).slice(2, 10)}`;
    const before = await fetch(`${BASE}/api/products`);
    if (!before.ok) return;
    const countBefore = (await before.json()).products.length;

    const response = await admin("/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: probeName,
        price: 77,
        // An image the pipeline would have downloaded had the guard run late.
        image_url: "https://supplier.example.com/img/probe.jpg",
        source_url: "https://supplier.example.com/product/stage0-2",
      }),
    });
    if (response.status === 401 || response.status === 403) return;
    expectStatus(response, [409], "a scraped-backed create must be refused by the G-1 freeze");

    const after = await fetch(`${BASE}/api/products`);
    const products = (await after.json()).products;
    if (products.length !== countBefore) {
      throw new Error(`catalogue grew from ${countBefore} to ${products.length} on a refused create`);
    }
    // Scoped to THIS probe's own name. Checking for any "Stage0" prefix would
    // now match the hand-written products the checks above create on purpose,
    // and would fail for the system working.
    if (products.some((product) => String(product.name) === probeName)) {
      throw new Error("a refused create still produced a catalogue row");
    }
  });

  await check("a product created before the closure is still readable", async () => {
    // The seed migration leaves products behind. Closing creation must not make
    // anything that already exists unreadable.
    const listed = await fetch(`${BASE}/api/products`);
    expectStatus(listed, [200], "public catalogue still reads");
    const products = (await listed.json()).products;
    if (products.length === 0) return; // nothing seeded in this database

    const detail = await fetch(`${BASE}/api/products/${products[0].id}`);
    expectStatus(detail, [200], "an existing product's detail route still reads");
  });

  // D-8. Invalid input is the caller's mistake, and must not be reported as an
  // internal failure. The update path is still live, so this is not academic.
  await check("invalid product input is rejected with 400, not 500", async () => {
    const listed = await fetch(`${BASE}/api/products`);
    if (!listed.ok) return;
    const products = (await listed.json()).products;
    if (products.length === 0) return;

    for (const [label, patch] of Object.entries({
      "zero price": { price: 0 },
      "blank name": { name: "   " },
      "malformed category_id": { category_id: "not-a-uuid" },
    })) {
      const response = await admin(`/api/products/${products[0].id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (response.status === 401 || response.status === 403) return; // no admin key here
      expectStatus(response, [400], `${label} must be a 400`);

      const body = await response.json();
      if (/internal server error/i.test(JSON.stringify(body))) {
        throw new Error(`${label} was reported as an internal error instead of bad input`);
      }
    }
  });

  // G-6. Authorization, and the guarantee that reading the queue changes nothing.
  await check("the ownership review queue refuses an unauthenticated read", async () => {
    const response = await fetch(`${BASE}/api/admin/products/ownership-review`);
    expectStatus(response, [401, 403], "unauthenticated queue read");
  });

  await check("an unauthenticated review decision is refused without revealing the product", async () => {
    const real = await fetch(`${BASE}/api/admin/products/00000000-0000-4000-8000-000000000001/ownership-review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state: "ownership_review", note: "probe" }),
    });
    expectStatus(real, [401, 403], "unauthenticated review decision");
    const body = await real.text();
    if (/not found/i.test(body)) {
      throw new Error("an unauthorised response disclosed whether the product exists");
    }
  });

  await check("reading the ownership review queue modifies no product", async () => {
    const before = await fetch(`${BASE}/api/products`);
    if (!before.ok) return;
    const snapshot = JSON.stringify((await before.json()).products);

    const queue = await admin("/api/admin/products/ownership-review");
    if (queue.status === 401 || queue.status === 403) return; // no admin key here
    expectStatus(queue, [200], "authorised queue read");

    const body = await queue.json();
    if (!Array.isArray(body.ownership_review_queue)) {
      throw new Error("queue response did not contain ownership_review_queue");
    }
    // Every legacy product starts unresolved, and reading must not change that.
    if (body.ownership_review_queue.some((row) => !row.review_state)) {
      throw new Error("a queue row carried no review state");
    }
    // A supplier URL's query string must never reach the review screen.
    if (body.ownership_review_queue.some((row) => /[?&]/.test(String(row.source_host ?? "")))) {
      throw new Error("a queue row exposed a URL query string");
    }

    const after = await fetch(`${BASE}/api/products`);
    if (JSON.stringify((await after.json()).products) !== snapshot) {
      throw new Error("reading the ownership review queue changed the public catalogue");
    }
  });

  // G-7. Authorization, and the guarantee that measuring changes nothing.
  await check("the legacy exposure report refuses an unauthenticated read", async () => {
    const response = await fetch(`${BASE}/api/admin/products/legacy-exposure`);
    expectStatus(response, [401, 403], "unauthenticated exposure read");
  });

  await check("the legacy exposure report is served and never claims production", async () => {
    const response = await admin("/api/admin/products/legacy-exposure");
    if (response.status === 401 || response.status === 403) return; // no admin key here
    expectStatus(response, [200], "authorised exposure read");

    const report = await response.json();
    if (report.scope?.read_only !== true) throw new Error("report did not declare itself read-only");
    if (report.scope?.production_validated !== false) {
      throw new Error("report must never declare itself production-validated");
    }
    for (const section of ["population", "public_exposure", "purchase_exposure", "order_exposure",
      "cart_exposure", "recommendation_exposure", "analytics_exposure", "ownership_review",
      "provenance", "breakdowns", "blocked_questions"]) {
      if (!report[section]) throw new Error(`report is missing the ${section} section`);
    }
    if (report.cart_exposure.status !== "UNMEASURABLE_SERVER_SIDE") {
      throw new Error("cart exposure must be reported as unmeasurable server-side");
    }
    // No supplier URL, query string or product content may reach the response.
    const serialized = JSON.stringify(report);
    if (/[?&](token|affiliate|utm_)/i.test(serialized)) {
      throw new Error("the report leaked URL query parameters");
    }
  });

  await check("reading the legacy exposure report modifies no product and no order", async () => {
    const before = await fetch(`${BASE}/api/products`);
    if (!before.ok) return;
    const productsBefore = JSON.stringify((await before.json()).products);

    const report = await admin("/api/admin/products/legacy-exposure");
    if (report.status === 401 || report.status === 403) return;
    await report.json();

    const after = await fetch(`${BASE}/api/products`);
    if (JSON.stringify((await after.json()).products) !== productsBefore) {
      throw new Error("reading the exposure report changed the public catalogue");
    }
  });

  // ── M1b · Seller isolation, end to end ───────────────────────────────
  //
  // Unit tests cover the scope decisions. These exercise them through the real
  // HTTP stack with a real logged-in seller_admin, because what is being
  // guarded is a response SHAPE - and a response shape is only real once it has
  // been serialised and sent.
  //
  // Two Sellers, each with its own product and admin; then Seller A's admin is
  // pointed at Seller B's objects.
  const { Pool: IsolationPool } = await import("pg");
  const { hashPassword } = await import("../src/passwords.js");
  const isolationPool = new IsolationPool({ connectionString: process.env.DATABASE_URL, ssl: false });
  const stamp = Math.random().toString(36).slice(2, 8);
  const sellerPassword = `Smoke-${Math.random().toString(36).slice(2)}A1!`;
  let fixture = null;
  let sellerCookie = null;

  try {
    const db = await isolationPool.connect();
    try {
      await db.query("begin");
      // Real Sellers: verified AND approved. Verification alone is not a
      // Seller, and these fixtures must not encode the weaker rule.
      const businessA = (await db.query(
        `insert into public.business_profiles
           (business_name, business_type, is_verified, commercial_status)
         values ($1, 'shop', true, 'approved') returning id`, [`Smoke Seller A ${stamp}`],
      )).rows[0].id;
      const businessB = (await db.query(
        `insert into public.business_profiles
           (business_name, business_type, is_verified, commercial_status)
         values ($1, 'shop', true, 'approved') returning id`, [`Smoke Seller B ${stamp}`],
      )).rows[0].id;
      // A third Seller, verified but only pending: it may prepare data and must
      // not be publishable.
      const businessPending = (await db.query(
        `insert into public.business_profiles
           (business_name, business_type, is_verified, commercial_status)
         values ($1, 'shop', true, 'pending') returning id`, [`Smoke Seller Pending ${stamp}`],
      )).rows[0].id;

      const adminA = (await db.query(
        `insert into public.admin_users
           (email, password_hash, display_name, role, business_id, is_active, must_change_password)
         values ($1, $2, 'Smoke Seller A', 'seller_admin', $3, true, false) returning id`,
        [`smoke-seller-a-${stamp}@example.com`, hashPassword(sellerPassword), businessA],
      )).rows[0].id;

      // A product owned by B, carrying the internal fields A must never see.
      const productB = (await db.query(
        `insert into public.business_products
           (business_id, name, price, cost_price, commission_rate, supplier_id)
         values ($1, $2, 99, 42, 0.17, gen_random_uuid()) returning id`,
        [businessB, `Smoke B product ${stamp}`],
      )).rows[0].id;

      const draftB = (await db.query(
        `insert into public.product_drafts (business_id, created_by, name)
         values ($1, $2, 'Smoke B draft') returning id`, [businessB, adminA],
      )).rows[0].id;
      const catalogB = (await db.query(
        `insert into public.catalog_products
           (owning_business_id, origin_draft_id, name, created_by)
         values ($1, $2, 'Smoke B catalog product', $3) returning id`,
        [businessB, draftB, adminA],
      )).rows[0].id;

      // Seller A's own product, so readiness can be asked about something it
      // owns - and then the same question asked while A is only pending.
      const draftA = (await db.query(
        `insert into public.product_drafts (business_id, created_by, name)
         values ($1, $2, 'Smoke A draft') returning id`, [businessA, adminA],
      )).rows[0].id;
      const catalogA = (await db.query(
        `insert into public.catalog_products
           (owning_business_id, origin_draft_id, name, created_by)
         values ($1, $2, 'Smoke A catalog product', $3) returning id`,
        [businessA, draftA, adminA],
      )).rows[0].id;

      await db.query("commit");
      fixture = {
        businessA, businessB, businessPending, adminA,
        productB, draftB, catalogB, draftA, catalogA,
        email: `smoke-seller-a-${stamp}@example.com`,
      };
    } catch (error) {
      await db.query("rollback").catch(() => {});
      throw error;
    } finally {
      db.release();
    }

    await check("a seller_admin can log in and the session carries its Seller", async () => {
      const response = await fetch(`${BASE}/api/admin/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: fixture.email, password: sellerPassword }),
      });
      expectStatus(response, [200], "seller login");
      sellerCookie = (response.headers.get("set-cookie") || "").split(";")[0];
      if (!sellerCookie) throw new Error("no session cookie was issued");
      const body = await response.json();
      if (body.admin?.role !== "seller_admin") throw new Error(`role was ${body.admin?.role}`);
      if (body.admin?.business_id !== fixture.businessA) {
        throw new Error("the session did not carry the Seller scope");
      }
    });

    const asSeller = (path, init = {}) => fetch(`${BASE}${path}`, {
      ...init,
      headers: { "content-type": "application/json", cookie: sellerCookie, ...(init.headers || {}) },
    });

    await check("a seller_admin never receives another Seller's internal fields", async () => {
      if (!sellerCookie) throw new Error("no seller session");
      const response = await asSeller("/api/products");
      expectStatus(response, [200], "seller catalogue read");
      const { products } = await response.json();
      const foreign = products.find((product) => product.id === fixture.productB);
      if (!foreign) throw new Error("the other Seller's product was absent from the catalogue entirely");
      for (const field of ["cost_price", "commission_rate", "supplier_id", "business_id"]) {
        if (Object.hasOwn(foreign, field)) {
          throw new Error(`${field} leaked to another Seller - this is the isAdminRequest defect`);
        }
      }
    });

    await check("a seller_admin reading one foreign product gets the public shape", async () => {
      if (!sellerCookie) throw new Error("no seller session");
      const response = await asSeller(`/api/products/${fixture.productB}`);
      expectStatus(response, [200, 404], "seller single product read");
      if (response.status === 200) {
        const { product } = await response.json();
        for (const field of ["cost_price", "commission_rate", "supplier_id"]) {
          if (Object.hasOwn(product, field)) throw new Error(`${field} leaked on the detail route`);
        }
      }
    });

    await check("an anonymous caller still gets the public shape - unchanged", async () => {
      const response = await fetch(`${BASE}/api/products`);
      expectStatus(response, [200], "anonymous catalogue");
      const { products } = await response.json();
      if (products.some((product) => Object.hasOwn(product, "cost_price"))) {
        throw new Error("cost_price reached an anonymous caller");
      }
    });

    await check("the api-key identity still receives the full row", async () => {
      const response = await admin("/api/products");
      if (response.status === 401 || response.status === 403) return;
      expectStatus(response, [200], "api-key catalogue");
      const { products } = await response.json();
      const row = products.find((product) => product.id === fixture.productB);
      if (row && !Object.hasOwn(row, "cost_price")) {
        throw new Error("the platform identity lost access to internal fields");
      }
    });

    await check("cross-Seller intake access answers 404, never 403", async () => {
      if (!sellerCookie) throw new Error("no seller session");
      for (const path of [
        `/api/admin/intake/drafts/${fixture.draftB}`,
        `/api/admin/intake/products/${fixture.catalogB}/publication-readiness`,
      ]) {
        const response = await asSeller(path);
        if (response.status !== 404) {
          throw new Error(`${path} answered ${response.status}; a 403 would confirm the row exists`);
        }
      }
    });

    await check("a cross-Seller write is refused and changes nothing", async () => {
      if (!sellerCookie) throw new Error("no seller session");
      const response = await asSeller(`/api/admin/intake/drafts/${fixture.draftB}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "hijacked" }),
      });
      if (response.status !== 404) throw new Error(`expected 404, got ${response.status}`);

      const { rows } = await isolationPool.query(
        "select name from public.product_drafts where id = $1", [fixture.draftB],
      );
      if (rows[0].name === "hijacked") throw new Error("the cross-Seller write landed");
    });

    await check("a Seller's intake list contains only its own drafts", async () => {
      if (!sellerCookie) throw new Error("no seller session");
      const response = await asSeller("/api/admin/intake/drafts");
      expectStatus(response, [200], "intake list");
      const { drafts } = await response.json();
      if (drafts.some((draft) => draft.business_id !== fixture.businessA)) {
        throw new Error("another Seller's draft appeared in the list");
      }
    });

    await check("publication readiness reports the Seller's commercial status", async () => {
      if (!sellerCookie) throw new Error("no seller session");
      const response = await asSeller(
        `/api/admin/intake/products/${fixture.catalogA}/publication-readiness`,
      );
      expectStatus(response, [200], "readiness");
      const body = await response.json();
      if (body.seller?.commercial_status !== "approved") {
        throw new Error(`seller status was ${body.seller?.commercial_status}`);
      }
      if (body.seller?.eligible !== true) throw new Error("an approved Seller read as ineligible");
      // Not ready for other reasons - no variant, no offer, no approved image -
      // but the Seller condition must not be among them.
      if (body.unmet.some((reason) => String(reason).startsWith("seller_"))) {
        throw new Error(`an approved Seller was still blocked: ${body.unmet.join(", ")}`);
      }
      if (body.ready !== false) throw new Error("a product with no variants must not be ready");
    });

    await check("a pending Seller cannot publish, and the reason says why", async () => {
      // Same product, Seller moved to pending. Data preparation stays possible;
      // publication does not.
      await isolationPool.query(
        "update public.business_profiles set commercial_status = 'pending' where id = $1",
        [fixture.businessA],
      );
      try {
        const response = await asSeller(
          `/api/admin/intake/products/${fixture.catalogA}/publication-readiness`,
        );
        expectStatus(response, [200], "readiness while pending");
        const body = await response.json();
        if (body.seller?.eligible !== false) throw new Error("a pending Seller read as eligible");
        if (!body.unmet.includes("seller_pending")) {
          throw new Error(`expected seller_pending in unmet, got: ${body.unmet.join(", ")}`);
        }
        if (body.ready !== false) throw new Error("a pending Seller must never be ready to publish");
      } finally {
        await isolationPool.query(
          "update public.business_profiles set commercial_status = 'approved' where id = $1",
          [fixture.businessA],
        );
      }
    });

    await check("a suspended Seller cannot publish", async () => {
      await isolationPool.query(
        "update public.business_profiles set commercial_status = 'suspended' where id = $1",
        [fixture.businessA],
      );
      try {
        const response = await asSeller(
          `/api/admin/intake/products/${fixture.catalogA}/publication-readiness`,
        );
        expectStatus(response, [200], "readiness while suspended");
        const body = await response.json();
        if (!body.unmet.includes("seller_suspended")) {
          throw new Error(`expected seller_suspended, got: ${body.unmet.join(", ")}`);
        }
      } finally {
        await isolationPool.query(
          "update public.business_profiles set commercial_status = 'approved' where id = $1",
          [fixture.businessA],
        );
      }
    });

    // The whole chain, end to end, through HTTP as a real Seller admin:
    // import → draft → submit → approve → variant → offer → inventory → image
    // → publish. Before these routes existed there was no way to get a product
    // into the new model at all, and no test could have noticed.
    //
    // Approval needs a second actor, because the submitter may not approve.
    let platformCookie = null;
    const platformPassword = `Smoke-${Math.random().toString(36).slice(2)}B2!`;
    await check("a platform product_manager can log in", async () => {
      await isolationPool.query(
        `insert into public.admin_users
           (email, password_hash, display_name, role, is_active, must_change_password)
         values ($1, $2, 'Smoke PM', 'product_manager', true, false)`,
        [`smoke-pm-${stamp}@example.com`, hashPassword(platformPassword)],
      );
      const response = await fetch(`${BASE}/api/admin/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: `smoke-pm-${stamp}@example.com`, password: platformPassword }),
      });
      expectStatus(response, [200], "pm login");
      platformCookie = (response.headers.get("set-cookie") || "").split(";")[0];
      if (!platformCookie) throw new Error("no pm session cookie");
    });

    const asPlatform = (path, init = {}) => fetch(`${BASE}${path}`, {
      ...init,
      headers: { "content-type": "application/json", cookie: platformCookie, ...(init.headers || {}) },
    });

    const chain = {};

    await check("chain 1/8 · a Seller records a raw import", async () => {
      const response = await asSeller("/api/admin/intake/imports", {
        method: "POST",
        body: JSON.stringify({
          source_system: "csv",
          source_record_id: `SUP-${stamp}`,
          source_url: "https://supplier.example/catalog/item?token=secret",
          payload: { name: "קולר לכלב", price: "49.90" },
        }),
      });
      expectStatus(response, [201], "create import");
      const { import: record } = await response.json();
      chain.importId = record.id;
      if (record.business_id !== fixture.businessA) throw new Error("the import was not scoped to the session Seller");
      if (record.source_host !== "supplier.example") throw new Error("source_host was not derived");
      if (!record.payload_hash) throw new Error("no payload hash was computed");
    });

    await check("chain 1b · the same Seller cannot import that record twice", async () => {
      const response = await asSeller("/api/admin/intake/imports", {
        method: "POST",
        body: JSON.stringify({
          source_system: "csv",
          source_record_id: `SUP-${stamp}`,
          payload: { name: "duplicate" },
        }),
      });
      if (response.status !== 409) throw new Error(`expected 409, got ${response.status}`);
    });

    await check("chain 2/8 · a draft is created from the raw record", async () => {
      const category = (await isolationPool.query(
        "select id from public.product_categories where is_active = true limit 1",
      )).rows[0];
      chain.categoryId = category?.id ?? null;

      const response = await asSeller("/api/admin/intake/drafts", {
        method: "POST",
        body: JSON.stringify({
          raw_import_record_id: chain.importId,
          name: "קולר לכלב",
          category_id: chain.categoryId,
        }),
      });
      expectStatus(response, [201], "create draft");
      const { draft } = await response.json();
      chain.draftId = draft.id;
      if (draft.business_id !== fixture.businessA) throw new Error("the draft did not inherit the Seller");
      if (draft.state !== "DRAFT") throw new Error(`state was ${draft.state}`);
    });

    await check("chain 3/8 · a draft cannot skip review", async () => {
      // DRAFT -> APPROVED is not a transition. Approval is attempted before
      // submission, and must be refused on the state, not on the permission.
      const response = await asPlatform(`/api/admin/intake/drafts/${chain.draftId}/approve`, {
        method: "POST",
      });
      if (response.status !== 409) throw new Error(`expected 409, got ${response.status}`);
      const body = await response.json();
      if (body.error !== "INVALID_STATE_TRANSITION") throw new Error(`error was ${body.error}`);
    });

    await check("chain 4/8 · the Seller submits the draft for review", async () => {
      const response = await asSeller(`/api/admin/intake/drafts/${chain.draftId}/submit`, {
        method: "POST",
      });
      expectStatus(response, [200], "submit draft");
      const { draft } = await response.json();
      if (draft.state !== "IN_REVIEW") throw new Error(`state was ${draft.state}`);
      if (!draft.submitted_by) throw new Error("the submitter was not recorded");
    });

    await check("chain 4b · a Seller cannot approve - it has no review permission", async () => {
      const response = await asSeller(`/api/admin/intake/drafts/${chain.draftId}/approve`, {
        method: "POST",
      });
      if (response.status !== 403) throw new Error(`expected 403, got ${response.status}`);
    });

    await check("chain 5/8 · a reviewer approves, creating the catalogue product", async () => {
      const response = await asPlatform(`/api/admin/intake/drafts/${chain.draftId}/approve`, {
        method: "POST",
      });
      expectStatus(response, [201], "approve draft");
      const { draft, product } = await response.json();
      chain.productId = product.id;
      if (draft.state !== "APPROVED") throw new Error(`draft state was ${draft.state}`);
      if (product.origin_draft_id !== chain.draftId) throw new Error("the product does not trace to the draft");
      if (product.publication_state !== "UNPUBLISHED") {
        throw new Error(`a new product must be UNPUBLISHED, got ${product.publication_state}`);
      }
      if (product.owning_business_id !== fixture.businessA) throw new Error("wrong owner");
    });

    await check("chain 5b · publishing is refused while the gate is unmet", async () => {
      const response = await asSeller(`/api/admin/intake/products/${chain.productId}/publish`, {
        method: "POST",
      });
      if (response.status !== 409) throw new Error(`expected 409, got ${response.status}`);
      const body = await response.json();
      if (body.error !== "PUBLICATION_GATE_FAILED") throw new Error(`error was ${body.error}`);
      for (const expected of ["no_active_variant", "no_priced_offer", "no_availability", "no_approved_image"]) {
        if (!body.unmet.includes(expected)) throw new Error(`expected ${expected} in unmet: ${body.unmet}`);
      }
    });

    await check("chain 6/8 · a variant and a priced offer are added", async () => {
      const variant = await asSeller(`/api/admin/intake/products/${chain.productId}/variants`, {
        method: "POST",
        body: JSON.stringify({ option_signature: "size=S", options: { size: "S" }, label: "S" }),
      });
      expectStatus(variant, [201], "create variant");
      chain.variantId = (await variant.json()).variant.id;

      const offer = await asSeller(`/api/admin/intake/variants/${chain.variantId}/offers`, {
        method: "POST",
        body: JSON.stringify({ price: 49.9, sku: `SKU-${stamp}` }),
      });
      expectStatus(offer, [201], "create offer");
      const created = (await offer.json()).offer;
      chain.offerId = created.id;
      if (created.business_id !== fixture.businessA) throw new Error("the offer was not scoped to the session Seller");
      if (created.status !== "INACTIVE") throw new Error("a new offer must start INACTIVE");
    });

    await check("chain 7/8 · inventory and an approved image are added", async () => {
      await isolationPool.query(
        "update public.seller_offers set status = 'ACTIVE' where id = $1", [chain.offerId],
      );
      const inventory = await asSeller(`/api/admin/intake/offers/${chain.offerId}/inventory`, {
        method: "PUT",
        body: JSON.stringify({ availability: "IN_STOCK", quantity: 5 }),
      });
      expectStatus(inventory, [200], "set inventory");

      const media = await asSeller(`/api/admin/intake/products/${chain.productId}/media`, {
        method: "POST",
        body: JSON.stringify({ storage_path: `/uploads/smoke-${stamp}.jpg`, checksum: `sum-${stamp}` }),
      });
      expectStatus(media, [201], "adopt media");
      chain.mediaId = (await media.json()).media.id;

      // A Seller may adopt but may not approve: MEDIA_APPROVE is a platform
      // permission.
      const sellerApprove = await asSeller(`/api/admin/intake/media/${chain.mediaId}/approve`, {
        method: "POST",
      });
      if (sellerApprove.status !== 403) {
        throw new Error(`a Seller approved its own image: ${sellerApprove.status}`);
      }
      const approve = await asPlatform(`/api/admin/intake/media/${chain.mediaId}/approve`, {
        method: "POST",
      });
      expectStatus(approve, [200], "approve media");
    });

    await check("chain 7b · a required category attribute blocks publication", async () => {
      // 0052. The gate now asks the category what it insists on. Proving that
      // needs a category that insists on something, so one is declared here and
      // withdrawn afterwards - the seeded attributes are all optional on
      // purpose, because C-0 measured that requiring any of them today would
      // put "לא צוין" on the majority of pages.
      const attribute = (await isolationPool.query(
        `insert into public.product_category_attributes
           (category_id, key, label_he, value_type, is_required)
         values ($1, 'smoke_required_key', 'שדה חובה לבדיקה', 'text', true)
         returning id`,
        [chain.categoryId],
      )).rows[0].id;

      try {
        const blocked = await asSeller(
          `/api/admin/intake/products/${chain.productId}/publication-readiness`,
        );
        expectStatus(blocked, [200], "readiness");
        const report = await blocked.json();
        if (report.ready) throw new Error("a product missing a required attribute was reported ready");
        if (!report.unmet.includes("missing_attribute:smoke_required_key")) {
          throw new Error(`the refusal did not name the key: ${report.unmet.join(", ")}`);
        }

        // And the gate inside the transaction refuses too, not only the report.
        // A readiness endpoint that disagrees with publish is worse than
        // neither, because it teaches an admin to trust the wrong one.
        const publish = await asSeller(`/api/admin/intake/products/${chain.productId}/publish`, {
          method: "POST",
        });
        if (publish.status === 200) throw new Error("publish ignored the required attribute");

        // Filling it in clears the refusal - otherwise the check would pass for
        // a product that simply cannot publish for some other reason.
        await isolationPool.query(
          `update public.catalog_products
              set attributes = attributes || '{"smoke_required_key":"filled"}'::jsonb
            where id = $1`,
          [chain.productId],
        );
        const afterFilling = await asSeller(
          `/api/admin/intake/products/${chain.productId}/publication-readiness`,
        );
        const filled = await afterFilling.json();
        if (filled.unmet.some((reason) => reason.startsWith("missing_attribute:"))) {
          throw new Error(`still blocked after filling it: ${filled.unmet.join(", ")}`);
        }
      } finally {
        await isolationPool.query(
          "delete from public.product_category_attributes where id = $1", [attribute],
        );
        await isolationPool.query(
          `update public.catalog_products set attributes = attributes - 'smoke_required_key' where id = $1`,
          [chain.productId],
        );
      }
    });

    await check("chain 7c · an attribute that is present but blank does not count", async () => {
      // A key whose value is "" or "   " is not a value anybody entered.
      // Counting it would let a product publish showing a label with nothing
      // beside it, which is the exact failure the required flag exists to stop.
      const attribute = (await isolationPool.query(
        `insert into public.product_category_attributes
           (category_id, key, label_he, value_type, is_required)
         values ($1, 'smoke_blank_key', 'שדה ריק לבדיקה', 'text', true)
         returning id`,
        [chain.categoryId],
      )).rows[0].id;
      try {
        await isolationPool.query(
          `update public.catalog_products
              set attributes = attributes || '{"smoke_blank_key":"   "}'::jsonb
            where id = $1`,
          [chain.productId],
        );
        const response = await asSeller(
          `/api/admin/intake/products/${chain.productId}/publication-readiness`,
        );
        const report = await response.json();
        if (!report.unmet.includes("missing_attribute:smoke_blank_key")) {
          throw new Error(`whitespace was accepted as a value: ${report.unmet.join(", ")}`);
        }
      } finally {
        await isolationPool.query(
          "delete from public.product_category_attributes where id = $1", [attribute],
        );
        await isolationPool.query(
          `update public.catalog_products set attributes = attributes - 'smoke_blank_key' where id = $1`,
          [chain.productId],
        );
      }
    });

    await check("chain 8/8 · the gate passes and the product publishes", async () => {
      const readiness = await asSeller(
        `/api/admin/intake/products/${chain.productId}/publication-readiness`,
      );
      expectStatus(readiness, [200], "readiness");
      const report = await readiness.json();
      if (!report.ready) throw new Error(`still not ready: ${report.unmet.join(", ")}`);

      const response = await asSeller(`/api/admin/intake/products/${chain.productId}/publish`, {
        method: "POST",
      });
      expectStatus(response, [200], "publish");
      const { product } = await response.json();
      if (product.publication_state !== "PUBLISHED") throw new Error(`state was ${product.publication_state}`);
      if (!product.published_at || !product.published_by) {
        throw new Error("a published product must record when and by whom");
      }
    });

    await check("chain 8b · the raw record was never edited", async () => {
      const { rows } = await isolationPool.query(
        "select payload from public.raw_import_records where id = $1", [chain.importId],
      );
      if (rows[0].payload.name !== "קולר לכלב" || rows[0].payload.price !== "49.90") {
        throw new Error("the raw record changed while the draft was corrected");
      }
    });

    await check("chain 8c · unpublishing works and needs no gate", async () => {
      const response = await asSeller(`/api/admin/intake/products/${chain.productId}/unpublish`, {
        method: "POST",
        body: JSON.stringify({ reason: "smoke test" }),
      });
      expectStatus(response, [200], "unpublish");
      const { product } = await response.json();
      if (product.publication_state !== "UNPUBLISHED") throw new Error(`state was ${product.publication_state}`);
    });

    await check("chain · a reviewer cannot approve a draft they submitted themselves", async () => {
      // The chain above had the Seller submit and the product_manager approve,
      // so self-approval was never actually attempted through the route. A
      // product_manager holds BOTH DRAFT_SUBMIT and DRAFT_REVIEW, which is the
      // only way this can arise - and it is the case the permission model
      // cannot catch on its own.
      const draft = await asPlatform("/api/admin/intake/drafts", {
        method: "POST",
        body: JSON.stringify({
          business_id: fixture.businessA,
          name: "טיוטה של המאשר",
          category_id: chain.categoryId,
        }),
      });
      expectStatus(draft, [201], "pm creates a draft");
      const draftId = (await draft.json()).draft.id;

      const submit = await asPlatform(`/api/admin/intake/drafts/${draftId}/submit`, { method: "POST" });
      expectStatus(submit, [200], "pm submits");

      const approve = await asPlatform(`/api/admin/intake/drafts/${draftId}/approve`, { method: "POST" });
      if (approve.status !== 403) {
        throw new Error(`self-approval returned ${approve.status}; a review that did not happen`);
      }
      const body = await approve.json();
      if (body.error !== "SELF_APPROVAL_FORBIDDEN") throw new Error(`error was ${body.error}`);

      // And no product was created behind it.
      const { rows } = await isolationPool.query(
        "select approved_catalog_product_id, state from public.product_drafts where id = $1", [draftId],
      );
      if (rows[0].state !== "IN_REVIEW" || rows[0].approved_catalog_product_id) {
        throw new Error("the refused approval left state behind");
      }
    });

    // The public catalogue on the new model. The product published above must
    // appear; then every reason it should stop appearing is applied in turn.
    await check("catalog · a published product with a live offer is visible", async () => {
      // Re-publish: 8c unpublished it.
      await asSeller(`/api/admin/intake/products/${chain.productId}/publish`, { method: "POST" });
      const response = await fetch(`${BASE}/api/catalog`);
      expectStatus(response, [200], "catalog list");
      const { products } = await response.json();
      const row = products.find((p) => p.id === chain.productId);
      if (!row) throw new Error("the published product is not in the public catalogue");
      if (!row.offer_id || !row.seller_id) throw new Error("the row carries no offer or seller");
      if (Number(row.price) !== 49.9) throw new Error(`price was ${row.price}`);
      if (!row.image_path) throw new Error("no approved image was resolved");
    });

    await check("catalog · the detail route returns offers, and leaks nothing internal", async () => {
      const response = await fetch(`${BASE}/api/catalog/${chain.productId}`);
      expectStatus(response, [200], "catalog detail");
      const { product } = await response.json();
      if (!Array.isArray(product.offers) || product.offers.length < 1) {
        throw new Error("no offers on the product");
      }
      const serialized = JSON.stringify(product);
      for (const leak of ["cost_price", "commission_rate", "supplier_id", "owning_business_id",
        "origin_draft_id", "source_url", "payload"]) {
        if (serialized.includes(leak)) throw new Error(`${leak} reached a public response`);
      }
    });

    await check("catalog · an unpublished product disappears", async () => {
      await asSeller(`/api/admin/intake/products/${chain.productId}/unpublish`, {
        method: "POST", body: JSON.stringify({ reason: "smoke" }),
      });
      const detail = await fetch(`${BASE}/api/catalog/${chain.productId}`);
      if (detail.status !== 404) throw new Error(`expected 404, got ${detail.status}`);
      await asSeller(`/api/admin/intake/products/${chain.productId}/publish`, { method: "POST" });
    });

    await check("catalog · suspending the Seller removes it without unpublishing", async () => {
      // The stored publication_state still says PUBLISHED. Visibility is
      // re-checked at read time precisely so a suspended Seller stops selling
      // immediately rather than when somebody remembers to unpublish.
      await isolationPool.query(
        "update public.business_profiles set commercial_status = 'suspended' where id = $1",
        [fixture.businessA],
      );
      try {
        const detail = await fetch(`${BASE}/api/catalog/${chain.productId}`);
        if (detail.status !== 404) {
          throw new Error(`a suspended Seller's product was still served: ${detail.status}`);
        }
        const { rows } = await isolationPool.query(
          "select publication_state from public.catalog_products where id = $1", [chain.productId],
        );
        if (rows[0].publication_state !== "PUBLISHED") {
          throw new Error("the test did not actually exercise the read-time check");
        }
      } finally {
        await isolationPool.query(
          "update public.business_profiles set commercial_status = 'approved' where id = $1",
          [fixture.businessA],
        );
      }
    });

    await check("catalog · going out of stock removes it from the catalogue", async () => {
      await asSeller(`/api/admin/intake/offers/${chain.offerId}/inventory`, {
        method: "PUT", body: JSON.stringify({ availability: "OUT_OF_STOCK" }),
      });
      try {
        const detail = await fetch(`${BASE}/api/catalog/${chain.productId}`);
        if (detail.status !== 404) throw new Error(`out of stock but still served: ${detail.status}`);
      } finally {
        await asSeller(`/api/admin/intake/offers/${chain.offerId}/inventory`, {
          method: "PUT", body: JSON.stringify({ availability: "IN_STOCK", quantity: 5 }),
        });
      }
    });

    await check("catalog · the legacy /api/products route is unchanged", async () => {
      const response = await fetch(`${BASE}/api/products`);
      expectStatus(response, [200], "legacy catalogue");
      const { products } = await response.json();
      // The new model's product must NOT appear here: nothing was migrated, and
      // the legacy route still reads business_products.
      if (products.some((p) => p.id === chain.productId)) {
        throw new Error("the new-model product leaked into the legacy route");
      }
    });

    // ── M9 · checkout against the marketplace model ──────────────────────
    //
    // The published product from the chain above is bought through the real
    // POST /api/orders, and then every reason the sale should be refused is
    // applied in turn. The legacy path is checked too: carts already sitting in
    // customers' browsers carry product_id, not offer_id, and must keep working
    // exactly as they do today.
    const expectedOrderTotal = (subtotal, paymentMethod = "cash-on-delivery") => {
      const shipping = subtotal >= 199 ? 0 : 25;
      const cashOnDelivery = paymentMethod === "cash-on-delivery" ? 5 : 0;
      return Math.round((subtotal + shipping + cashOnDelivery) * 100) / 100;
    };

    // A refusal is only evidence about the guard under test if the order would
    // otherwise have gone through. Every negative check below therefore sends
    // the CORRECT total - a wrong one earns its own 409, which would let the
    // check keep passing with the guard deleted - and asserts that the refusal
    // is the availability one rather than any other 409 the route can produce.
    const expectUnavailable = async (response, sold) => {
      if (response.status === 201) throw new Error(sold);
      const text = await response.text();
      if (response.status !== 409) throw new Error(`refused, but not with 409: ${response.status} ${text}`);
      if (!text.includes("no longer available")) {
        throw new Error(`refused for the wrong reason: ${text}`);
      }
    };

    const orderBody = (items, expectedTotal) => JSON.stringify({
      items,
      expected_total: expectedTotal,
      customer_name: "Smoke Buyer",
      customer_email: `smoke-buyer-${stamp}@example.com`,
      customer_phone: "0501234567",
      shipping_address: {
        full_name: "Smoke Buyer",
        email: `smoke-buyer-${stamp}@example.com`,
        phone: "0501234567",
        address: "Herzl 1",
        building: "1",
        city: "Tel Aviv",
        zipCode: "6100000",
        entranceType: "house",
        leaveAtDoor: true,
      },
      payment_method: "cash-on-delivery",
    });

    await check("checkout · an order names its Seller and snapshots the offer", async () => {
      // Re-publish and restock: the catalogue checks above left it unpublished.
      await asSeller(`/api/admin/intake/products/${chain.productId}/publish`, { method: "POST" });

      const quote = await fetch(`${BASE}/api/catalog/${chain.productId}`);
      const { product } = await quote.json();
      const offer = product.offers[0];

      const response = await fetch(`${BASE}/api/orders`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: orderBody([{ offer_id: offer.offer_id, quantity: 2 }], expectedOrderTotal(Number(offer.price) * 2)),
      });
      if (response.status !== 201) {
        throw new Error(`order failed: ${response.status} ${await response.text()}`);
      }
      const { order } = await response.json();
      chain.orderId = order.id;

      const { rows } = await isolationPool.query(
        `select o.seller_business_id as order_seller,
                i.seller_business_id, i.seller_offer_id, i.product_variant_id,
                i.price, i.quantity, i.currency, i.commission_rate, i.commission_amount
           from public.orders o join public.order_items i on i.order_id = o.id
          where o.id = $1`,
        [order.id],
      );
      const line = rows[0];
      if (line.order_seller !== fixture.businessA) throw new Error("the order does not name its Seller");
      if (line.seller_business_id !== fixture.businessA) throw new Error("the line does not name its Seller");
      if (line.seller_offer_id !== offer.offer_id) throw new Error("the offer was not snapshotted");
      if (!line.product_variant_id) throw new Error("the variant was not snapshotted");
      if (Number(line.price) !== Number(offer.price)) {
        throw new Error(`price came from the client: ${line.price} vs ${offer.price}`);
      }
    });

    await check("checkout · the server price wins over whatever the client claims", async () => {
      const quote = await fetch(`${BASE}/api/catalog/${chain.productId}`);
      const offer = (await quote.json()).product.offers[0];

      // Claim the item costs 1 agora. The server resolves the real price, the
      // totals disagree, and the order is refused.
      const response = await fetch(`${BASE}/api/orders`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: orderBody([{ offer_id: offer.offer_id, quantity: 1, price: 0.01 }], 0.01),
      });
      if (response.status === 201) throw new Error("a client-set price was accepted");
      if (response.status !== 409) {
        throw new Error(`rejected, but not on the total: ${response.status} ${await response.text()}`);
      }
    });

    await check("checkout · an out-of-stock offer cannot be bought", async () => {
      await asSeller(`/api/admin/intake/offers/${chain.offerId}/inventory`, {
        method: "PUT", body: JSON.stringify({ availability: "OUT_OF_STOCK" }),
      });
      try {
        const response = await fetch(`${BASE}/api/orders`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: orderBody([{ offer_id: chain.offerId, quantity: 1 }], expectedOrderTotal(49.9)),
        });
        await expectUnavailable(response, "an out-of-stock offer was sold");
      } finally {
        await asSeller(`/api/admin/intake/offers/${chain.offerId}/inventory`, {
          method: "PUT", body: JSON.stringify({ availability: "IN_STOCK", quantity: 5 }),
        });
      }
    });

    await check("checkout · a suspended Seller cannot sell, even while PUBLISHED", async () => {
      await isolationPool.query(
        "update public.business_profiles set commercial_status = 'suspended' where id = $1",
        [fixture.businessA],
      );
      try {
        const response = await fetch(`${BASE}/api/orders`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: orderBody([{ offer_id: chain.offerId, quantity: 1 }], expectedOrderTotal(49.9)),
        });
        await expectUnavailable(response, "a suspended Seller sold an item");
      } finally {
        await isolationPool.query(
          "update public.business_profiles set commercial_status = 'approved' where id = $1",
          [fixture.businessA],
        );
      }
    });

    await check("checkout · an unpublished product cannot be bought", async () => {
      await asSeller(`/api/admin/intake/products/${chain.productId}/unpublish`, {
        method: "POST", body: JSON.stringify({ reason: "smoke" }),
      });
      try {
        const response = await fetch(`${BASE}/api/orders`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: orderBody([{ offer_id: chain.offerId, quantity: 1 }], expectedOrderTotal(49.9)),
        });
        await expectUnavailable(response, "an unpublished product was sold");
      } finally {
        await asSeller(`/api/admin/intake/products/${chain.productId}/publish`, { method: "POST" });
      }
    });

    await check("checkout · a legacy cart still checks out exactly as before", async () => {
      // product_id, no offer_id - the shape every browser cart holds today.
      const legacy = (await isolationPool.query(
        `insert into public.business_products (business_id, name, price, in_stock)
         values ($1, $2, 25, true) returning id, price`,
        [fixture.businessB, `Smoke legacy ${stamp}`],
      )).rows[0];

      const response = await fetch(`${BASE}/api/orders`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: orderBody([{ product_id: legacy.id, quantity: 1 }], expectedOrderTotal(25)),
      });
      if (response.status !== 201) {
        throw new Error(`the legacy path broke: ${response.status} ${await response.text()}`);
      }
      const { order } = await response.json();
      const { rows } = await isolationPool.query(
        `select o.seller_business_id as order_seller, i.seller_business_id, i.commission_rate
           from public.orders o join public.order_items i on i.order_id = o.id where o.id = $1`,
        [order.id],
      );
      // A legacy line has no Seller and no commission, and says so with NULL
      // rather than pretending to a zero.
      if (rows[0].order_seller !== null) throw new Error("a legacy order was given a Seller");
      if (rows[0].seller_business_id !== null) throw new Error("a legacy line was given a Seller");
      if (rows[0].commission_rate !== null) throw new Error("a legacy line was given a commission rate");
      chain.legacyProductId = legacy.id;
    });

    await check("checkout · marketplace and legacy items cannot be mixed in one order", async () => {
      const response = await fetch(`${BASE}/api/orders`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: orderBody([
          { offer_id: chain.offerId, quantity: 1 },
          { product_id: chain.legacyProductId, quantity: 1 },
        ], expectedOrderTotal(74.9)),
      });
      if (response.status !== 409) {
        throw new Error(`a half-attributed order was accepted: ${response.status}`);
      }
      const body = await response.json();
      if (!JSON.stringify(body).includes("MIXED_CATALOGUE_ORDER")) {
        throw new Error(`wrong refusal: ${JSON.stringify(body)}`);
      }
    });

    await check("checkout · two Sellers in one cart are refused", async () => {
      // Seller B gets its own published offer, then both are put in one cart.
      const draftB2 = (await isolationPool.query(
        `insert into public.product_drafts (business_id, created_by, name, category_id, state)
         values ($1, $2, 'B product', $3, 'DRAFT') returning id`,
        [fixture.businessB, fixture.adminA, chain.categoryId],
      )).rows[0].id;
      const productB2 = (await isolationPool.query(
        `insert into public.catalog_products
           (owning_business_id, origin_draft_id, name, category_id, created_by,
            publication_state, published_at, published_by)
         values ($1, $2, 'B product', $3, $4, 'PUBLISHED', now(), $4) returning id`,
        [fixture.businessB, draftB2, chain.categoryId, fixture.adminA],
      )).rows[0].id;
      const variantB2 = (await isolationPool.query(
        `insert into public.product_variants (catalog_product_id, option_signature, created_by)
         values ($1, 'b=1', $2) returning id`, [productB2, fixture.adminA],
      )).rows[0].id;
      const offerB2 = (await isolationPool.query(
        `insert into public.seller_offers
           (business_id, product_variant_id, price, status, created_by)
         values ($1, $2, 30, 'ACTIVE', $3) returning id`,
        [fixture.businessB, variantB2, fixture.adminA],
      )).rows[0].id;
      await isolationPool.query(
        "insert into public.inventory (seller_offer_id, availability) values ($1, 'IN_STOCK')",
        [offerB2],
      );

      const response = await fetch(`${BASE}/api/orders`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: orderBody([
          { offer_id: chain.offerId, quantity: 1 },
          { offer_id: offerB2, quantity: 1 },
        ], expectedOrderTotal(79.9)),
      });
      if (response.status !== 409) {
        throw new Error(`a two-Seller order was accepted: ${response.status}`);
      }
      const body = await response.json();
      if (!JSON.stringify(body).includes("MULTIPLE_SELLERS_IN_ORDER")) {
        throw new Error(`wrong refusal: ${JSON.stringify(body)}`);
      }
      chain.offerB2 = offerB2;
      chain.productB2 = productB2;
      chain.draftB2 = draftB2;
      chain.variantB2 = variantB2;
    });

    await check("a cross-Seller attempt is audited", async () => {
      const { rows } = await isolationPool.query(
        `select count(*)::int as n from public.admin_audit_log
          where action_type = 'seller_isolation.cross_seller_denied'
            and actor_admin_user_id = $1`,
        [fixture.adminA],
      );
      if (rows[0].n < 1) throw new Error("a cross-Seller attempt left no audit trail");
    });
  } finally {
    // Cleanup in dependency order - nothing cascades, by design.
    if (fixture) {
      const cleanup = [
        ["delete from public.admin_sessions where admin_user_id = $1", [fixture.adminA]],
        ["delete from public.admin_audit_log where actor_admin_user_id = $1", [fixture.adminA]],
        ["delete from public.order_items where seller_business_id = any($1)", [[fixture.businessA, fixture.businessB]]],
        ["delete from public.inventory where seller_offer_id in (select id from public.seller_offers where business_id = any($1))", [[fixture.businessA, fixture.businessB]]],
        ["delete from public.seller_offers where business_id = any($1)", [[fixture.businessA, fixture.businessB]]],
        ["delete from public.product_media where catalog_product_id in (select id from public.catalog_products where owning_business_id = any($1))", [[fixture.businessA, fixture.businessB]]],
        ["delete from public.product_variants where catalog_product_id in (select id from public.catalog_products where owning_business_id = any($1))", [[fixture.businessA, fixture.businessB]]],
        ["update public.product_drafts set approved_catalog_product_id = null where business_id = any($1)", [[fixture.businessA, fixture.businessB]]],
        ["delete from public.catalog_products where owning_business_id = any($1)", [[fixture.businessA, fixture.businessB]]],
        ["delete from public.product_drafts where business_id = any($1)", [[fixture.businessA, fixture.businessB]]],
        ["delete from public.raw_import_records where business_id = any($1)", [[fixture.businessA, fixture.businessB]]],
        ["delete from public.business_products where business_id = any($1)", [[fixture.businessA, fixture.businessB]]],
        ["delete from public.admin_users where id = $1", [fixture.adminA]],
        ["delete from public.admin_users where email like $1", [`smoke-pm-%`]],
        ["delete from public.business_profiles where id = any($1)",
          [[fixture.businessA, fixture.businessB, fixture.businessPending]]],
      ];
      for (const [sql, params] of cleanup) {
        await isolationPool.query(sql, params).catch(() => {});
      }
    }
    await isolationPool.end().catch(() => {});
  }

  shutdown();
  await sleep(300);

  console.log(results.join("\n"));
  console.log(`\n${results.length - failures}/${results.length} checks passed`);

  if (failures > 0) {
    console.error("\nAPI output:\n");
    console.error(apiLog.split("\n").slice(-40).join("\n"));
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
