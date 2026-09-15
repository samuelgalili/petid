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
      microchip_number: "900000000000001",
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

  // Stage 0. Every legacy import path - hand-written, URL, scrape, CSV, Excel,
  // quick import and duplication - reaches the catalogue through this one route,
  // so one check per payload shape proves all of them are closed.
  //
  // These replace the earlier G-1 checks, which expected 409 for a scraped-backed
  // payload. That refusal still exists inside createProduct, but nothing reaches
  // it any more: creation is now refused outright, before the payload is even
  // inspected, so every shape gets the same 410.
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

  for (const [label, payload] of Object.entries(legacyCreatePayloads)) {
    await check(`POST /api/products is closed for a ${label}`, async () => {
      const response = await admin("/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.status === 401 || response.status === 403) return; // no admin key here
      expectStatus(response, [410], `${label} must be refused with 410 Gone`);

      const body = await response.json();
      if (body.details?.code !== "LEGACY_PRODUCT_CREATION_DISABLED") {
        throw new Error(`expected LEGACY_PRODUCT_CREATION_DISABLED, got ${JSON.stringify(body.details)}`);
      }
      // The refusal must not describe the machine that refused.
      const serialized = JSON.stringify(body);
      if (/postgres|business_products|defaultBusinessId|token|secret/i.test(serialized)) {
        throw new Error("the refusal leaked internal detail");
      }
    });
  }

  await check("a refused create adds nothing to the catalogue", async () => {
    const before = await fetch(`${BASE}/api/products`);
    if (!before.ok) return;
    const countBefore = (await before.json()).products.length;

    const response = await admin("/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Stage0 Probe Two",
        price: 77,
        // An image the pipeline would have downloaded had the guard run late.
        image_url: "https://supplier.example.com/img/probe.jpg",
        source_url: "https://supplier.example.com/product/stage0-2",
      }),
    });
    if (response.status === 401 || response.status === 403) return;
    expectStatus(response, [410], "create must be refused");

    const after = await fetch(`${BASE}/api/products`);
    const products = (await after.json()).products;
    if (products.length !== countBefore) {
      throw new Error(`catalogue grew from ${countBefore} to ${products.length} on a refused create`);
    }
    if (products.some((product) => String(product.name).startsWith("Stage0"))) {
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
        ["delete from public.catalog_products where id = any($1)", [[fixture.catalogB, fixture.catalogA]]],
        ["delete from public.product_drafts where id = any($1)", [[fixture.draftB, fixture.draftA]]],
        ["delete from public.business_products where id = $1", [fixture.productB]],
        ["delete from public.admin_users where id = $1", [fixture.adminA]],
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
