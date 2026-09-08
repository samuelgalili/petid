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
