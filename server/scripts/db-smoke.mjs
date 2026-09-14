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
