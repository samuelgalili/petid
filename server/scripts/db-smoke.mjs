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
