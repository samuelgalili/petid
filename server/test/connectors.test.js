// Connectors, and the one failure that would matter.
//
// Everything here is ordinary CRUD except for a single property, which D-4
// states and which this file exists to hold:
//
//   "the frontend receives connected, provider, account name, scopes,
//    last_verified, expires_at, health — and never a secret, not even masked
//    from the server side."
//
// A connector screen that works perfectly and returns the key in a JSON field
// nobody looks at is a worse outcome than a connector screen that does not
// work. So the tests below spend most of their attention on what comes OUT.

import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";

import { createAuditService } from "../src/adminOs/auditService.js";
import {
  PROVIDERS,
  disconnectConnector,
  executeVerifyRequest,
  isKnownProvider,
  listConnectors,
  saveConnector,
  verifyConnector,
} from "../src/adminOs/connectors.js";

const DATABASE_URL = process.env.DATABASE_URL;
const dbTest = (name, fn) => test(name, { skip: DATABASE_URL ? false : "DATABASE_URL not set" }, fn);

const ADMIN = { id: null, email: "ops@mipo.pet", role: "admin" };
const API_KEY = "key_live_0123456789abcdefghijklmnop";

const withDb = async (fn) => {
  const previousKey = process.env.SECRET_ENCRYPTION_KEY;
  process.env.SECRET_ENCRYPTION_KEY = randomBytes(32).toString("base64");

  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: false });
  const audit = createAuditService({ pool, logger: { error: () => {} } });

  try {
    await pool.query("delete from public.admin_connectors where provider in ('runway', 'tripo')");
    await fn({ pool, audit });
  } finally {
    await pool.query("delete from public.admin_connectors where provider in ('runway', 'tripo')").catch(() => {});
    await pool.query("delete from public.admin_audit_log where entity_type = 'admin_connector'").catch(() => {});
    await pool.end();
    if (previousKey === undefined) delete process.env.SECRET_ENCRYPTION_KEY;
    else process.env.SECRET_ENCRYPTION_KEY = previousKey;
  }
};

const okResponse = () => ({ ok: true, status: 200, text: async () => "{}" });

// ─── what comes out ──────────────────────────────────────────────────────────

dbTest("the key never appears in anything a caller receives", async () => {
  await withDb(async ({ pool, audit }) => {
    // THE LOAD-BEARING TEST. Every value this module hands back is serialised
    // and searched, rather than a named field being checked, because the way
    // this breaks is a field nobody thought to look at - `select *` picking up
    // the sealed column the day someone adds one.
    const saved = await saveConnector({ pool, audit, admin: ADMIN }, "runway", { api_key: API_KEY });
    assert.equal(saved.provider, "runway", "the sealing provider replaced the connector name");
    const listed = await listConnectors({ pool });
    const runway = listed.find((row) => row.id === saved.id);
    assert.equal(runway?.provider, "runway");
    assert.equal(runway?.stored, true);
    const verified = await verifyConnector({ pool, audit, admin: ADMIN, fetchImpl: async () => okResponse() }, "runway");
    const disconnected = await disconnectConnector({ pool, audit, admin: ADMIN }, "runway");

    for (const [name, payload] of Object.entries({ saved, listed, verified, disconnected })) {
      const serialised = JSON.stringify(payload);
      assert.ok(!serialised.includes(API_KEY), `${name} contains the key`);
      // Not a prefix either: eight characters of a live key is enough to
      // identify it in a log, and "masked" is exactly what D-4 forbids.
      assert.ok(!serialised.includes(API_KEY.slice(0, 8)), `${name} contains a prefix of the key`);
      assert.ok(!serialised.includes("secret"), `${name} carries a field named secret`);
    }
  });
});

dbTest("the audit trail records the act without recording the key", async () => {
  await withDb(async ({ pool, audit }) => {
    const saved = await saveConnector({ pool, audit, admin: ADMIN }, "runway", { api_key: API_KEY, label: "ראשי" });

    const entries = await audit.list({ entityType: "admin_connector", entityId: saved.id });
    assert.equal(entries.length, 1);
    assert.equal(entries[0].action_type, "connector.key_stored");
    assert.equal(entries[0].actor_type, "admin");

    const serialised = JSON.stringify(entries);
    assert.ok(!serialised.includes(API_KEY), "the audit log contains the key");

    /*
     * Not the length either: it narrows a search and identifies the provider's
     * key format.
     *
     * CHECKED AS A VALUE, NOT AS A SUBSTRING. This read
     * `!serialised.includes(String(API_KEY.length))`, and the key is 35
     * characters, so the test failed whenever "35" appeared ANYWHERE in the
     * serialised entry - in the seconds of a timestamp, in a millisecond, in a
     * uuid. That is roughly a quarter of all runs: it failed twice in eight
     * here, at random, with nothing about connectors changed. A test that
     * reddens on the clock teaches people to re-run rather than to look.
     */
    const values = [];
    const walk = (node) => {
      if (node === null || node === undefined) return;
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (typeof node === "object") { Object.values(node).forEach(walk); return; }
      values.push(node);
    };
    walk(entries);
    assert.ok(
      !values.some((value) => value === API_KEY.length || value === String(API_KEY.length)),
      "the audit log records the key's length",
    );
  });
});

// ─── storing ─────────────────────────────────────────────────────────────────

dbTest("a save without a key keeps the stored one", async () => {
  await withDb(async ({ pool, audit }) => {
    await saveConnector({ pool, audit, admin: ADMIN }, "runway", { api_key: API_KEY });

    // Correcting a base URL must not require re-pasting a secret the owner may
    // not have to hand. Making someone re-enter a key to fix a typo is how
    // keys end up in a note on a desktop.
    const updated = await saveConnector({ pool, audit, admin: ADMIN }, "runway", {
      settings: { baseUrl: "https://api.dev.runwayml.com/v2", apiVersion: "2024-11-06" },
    });

    assert.equal(updated.stored, true);
    assert.equal(updated.settings.baseUrl, "https://api.dev.runwayml.com/v2");
  });
});

dbTest("any save invalidates the last verification", async () => {
  await withDb(async ({ pool, audit }) => {
    await saveConnector({ pool, audit, admin: ADMIN }, "runway", { api_key: API_KEY });
    const verified = await verifyConnector({ pool, audit, admin: ADMIN, fetchImpl: async () => okResponse() }, "runway");
    assert.equal(verified.status, "connected");

    // The settings may have changed under a key that was fine. A stale
    // "connected" badge is worse than an honest "unverified".
    const saved = await saveConnector({ pool, audit, admin: ADMIN }, "runway", {
      settings: { baseUrl: "https://example.test", apiVersion: "1" },
    });
    assert.equal(saved.status, "unverified");
    assert.equal(saved.last_verified_at, null);
  });
});

dbTest("an http base url is refused, because it would put the key on the wire", async () => {
  await withDb(async ({ pool, audit }) => {
    await assert.rejects(
      () => saveConnector({ pool, audit, admin: ADMIN }, "runway", {
        api_key: API_KEY,
        settings: { baseUrl: "http://api.dev.runwayml.com/v1", apiVersion: "2024-11-06" },
      }),
      /must be https/,
    );
  });
});

dbTest("with no secret storage configured, the key is refused rather than stored", async () => {
  await withDb(async ({ pool, audit }) => {
    const key = process.env.SECRET_ENCRYPTION_KEY;
    delete process.env.SECRET_ENCRYPTION_KEY;
    try {
      await assert.rejects(
        () => saveConnector({ pool, audit, admin: ADMIN }, "runway", { api_key: API_KEY }),
        (error) => error.code === "SECRET_STORE_UNAVAILABLE",
      );
      const { rows } = await pool.query("select secret from public.admin_connectors where provider = 'runway'");
      assert.equal(rows.length, 0, "a row was written despite the refusal");
    } finally {
      process.env.SECRET_ENCRYPTION_KEY = key;
    }
  });
});

// ─── verifying ───────────────────────────────────────────────────────────────

dbTest("the provider's own words survive a failed verification", async () => {
  await withDb(async ({ pool, audit }) => {
    await saveConnector({ pool, audit, admin: ADMIN }, "runway", { api_key: API_KEY });

    const result = await verifyConnector({
      pool,
      audit,
      admin: ADMIN,
      fetchImpl: async () => ({ ok: false, status: 401, statusText: "Unauthorized", text: async () => '{"error":"Invalid API key"}' }),
    }, "runway");

    assert.equal(result.status, "error");
    // The most useful string on the screen, and the one most likely to be
    // swallowed into a generic "failed".
    assert.match(result.last_error, /401/);
    assert.match(result.last_error, /Invalid API key/);
  });
});

dbTest("an unreachable provider is not reported as a bad key", async () => {
  await withDb(async ({ pool, audit }) => {
    await saveConnector({ pool, audit, admin: ADMIN }, "runway", { api_key: API_KEY });

    // Saying "invalid key" here sends the owner to rotate a credential that
    // was fine, at a provider that was simply down.
    const result = await verifyConnector({
      pool,
      audit,
      admin: ADMIN,
      fetchImpl: async () => { throw new Error("ENOTFOUND api.dev.runwayml.com"); },
    }, "runway");

    assert.equal(result.status, "error");
    assert.match(result.last_error, /לא הצלחנו להגיע לספק/);
    assert.doesNotMatch(result.last_error, /401|invalid/i);
  });
});

dbTest("verification sends the key as a bearer token and never in the url", async () => {
  await withDb(async ({ pool, audit }) => {
    await saveConnector({ pool, audit, admin: ADMIN }, "runway", { api_key: API_KEY });

    let seen = null;
    await verifyConnector({
      pool,
      audit,
      admin: ADMIN,
      fetchImpl: async (url, init) => { seen = { url, init }; return okResponse(); },
    }, "runway");

    assert.equal(seen.init.headers.authorization, `Bearer ${API_KEY}`);
    // A key in a query string is written to every proxy and access log between
    // here and the provider.
    assert.ok(!seen.url.includes(API_KEY), "the key is in the request url");
    assert.equal(seen.init.method, "GET", "verification must be a read; a write bills the owner for pressing check");
  });
});

dbTest("verifying with no key stored is refused before any request is made", async () => {
  await withDb(async ({ pool, audit }) => {
    await saveConnector({ pool, audit, admin: ADMIN }, "runway", {});

    let called = false;
    await assert.rejects(
      () => verifyConnector({ pool, audit, admin: ADMIN, fetchImpl: async () => { called = true; return okResponse(); } }, "runway"),
      /No key is stored/,
    );
    assert.equal(called, false, "a request went out with no key");
  });
});

// ─── disconnecting ───────────────────────────────────────────────────────────

dbTest("disconnecting clears the key and keeps the history", async () => {
  await withDb(async ({ pool, audit }) => {
    const saved = await saveConnector({ pool, audit, admin: ADMIN }, "runway", { api_key: API_KEY, label: "ראשי" });
    const gone = await disconnectConnector({ pool, audit, admin: ADMIN }, "runway");

    assert.equal(gone.stored, false);
    assert.equal(gone.id, saved.id, "the row was deleted rather than cleared");
    assert.equal(gone.label, "ראשי", "the settings went with the key");

    const { rows } = await pool.query("select secret from public.admin_connectors where provider = 'runway'");
    assert.equal(rows[0].secret, null, "the sealed key is still in the table");

    const entries = await audit.list({ entityType: "admin_connector", entityId: saved.id });
    assert.ok(entries.some((entry) => entry.action_type === "connector.disconnected"));
  });
});

// ─── the provider table ──────────────────────────────────────────────────────

test("an unknown provider is refused rather than stored as a row nobody can use", () => {
  assert.equal(isKnownProvider("runway"), true);
  assert.equal(isKnownProvider("tripo"), true);
  assert.equal(isKnownProvider("not-a-provider"), false);
  assert.equal(isKnownProvider(""), false);
});

test("every provider verifies with a read over https and keeps the key out of the url", () => {
  for (const [name, definition] of Object.entries(PROVIDERS)) {
    assert.ok(/^https:\/\//.test(definition.defaults.baseUrl), `${name} defaults to a non-https base url`);

    const request = definition.buildVerifyRequest({
      secret: "test-key",
      settings: definition.defaults,
    });
    assert.equal(request.method, "GET", `${name} verifies with a ${request.method}`);
    assert.ok(request.url.startsWith("https://"), `${name} verify url is not https`);
    assert.ok(!request.url.includes("test-key"), `${name} puts the key in the url`);
    assert.equal(request.headers.authorization, "Bearer test-key");
  }
});

const TRIPO_KEY = "tsk_live_NEVER_LOG_0123456789abcdef";

const captureConsole = () => {
  const lines = [];
  const methods = ["log", "info", "warn", "error", "debug"];
  const originals = {};
  for (const method of methods) {
    originals[method] = console[method];
    console[method] = (...args) => {
      lines.push(args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" "));
    };
  }
  return {
    lines,
    restore: () => {
      for (const method of methods) console[method] = originals[method];
    },
  };
};

test("tripo checks the documented balance url with a bearer header", () => {
  const request = PROVIDERS.tripo.buildVerifyRequest({
    secret: TRIPO_KEY,
    settings: PROVIDERS.tripo.defaults,
  });
  assert.equal(request.url, "https://api.tripo3d.ai/v2/openapi/user/balance");
  assert.equal(request.method, "GET");
  assert.equal(request.headers.authorization, `Bearer ${TRIPO_KEY}`);
  assert.equal(request.headers["x-runway-version"], undefined);
  assert.equal(PROVIDERS.tripo.defaults.baseUrl, "https://api.tripo3d.ai/v2/openapi");
});

test("a tripo balance check reports the remaining credit and never the key", async () => {
  const logs = [];
  const logger = {
    info: (...args) => logs.push(args),
    error: (...args) => logs.push(args),
    warn: (...args) => logs.push(args),
    log: (...args) => logs.push(args),
  };
  const seen = [];
  const consoleCapture = captureConsole();
  try {
    const summary = await executeVerifyRequest({
      provider: "tripo",
      secret: TRIPO_KEY,
      settings: PROVIDERS.tripo.defaults,
      logger,
      fetchImpl: async (url, init) => {
        seen.push({ url, method: init.method, authorization: init.headers.authorization });
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          text: async () => JSON.stringify({
            code: 0,
            data: { balance: 99900, frozen: 0 },
            echo: TRIPO_KEY,
          }),
        };
      },
    });

    assert.equal(seen.length, 1);
    assert.equal(seen[0].url, "https://api.tripo3d.ai/v2/openapi/user/balance");
    assert.equal(seen[0].method, "GET");
    assert.equal(seen[0].authorization, `Bearer ${TRIPO_KEY}`);
    assert.ok(!seen[0].url.includes(TRIPO_KEY), "the key is in the request url");
    assert.equal(summary.ok, true);
    assert.equal(summary.balance, 99900);
    assert.equal(summary.error, null);

    const serialised = JSON.stringify(summary);
    assert.ok(!serialised.includes(TRIPO_KEY), "the verify result contains the key");
    assert.ok(!serialised.includes(TRIPO_KEY.slice(0, 12)), "the verify result contains a prefix of the key");
    assert.ok(!JSON.stringify(logs).includes(TRIPO_KEY), "the logger received the key");
    assert.ok(!consoleCapture.lines.join("\n").includes(TRIPO_KEY), "the console received the key");
    assert.ok(logs.length > 0, "a safe result line was expected so this assertion is not vacuous");
  } finally {
    consoleCapture.restore();
  }
});

test("a tripo refusal that echoes the key is reported without the key", async () => {
  const logs = [];
  const logger = { info: (...args) => logs.push(args), error: (...args) => logs.push(args) };
  const consoleCapture = captureConsole();
  try {
    const summary = await executeVerifyRequest({
      provider: "tripo",
      secret: TRIPO_KEY,
      settings: { baseUrl: "https://api.tripo3d.ai/v2/openapi/" },
      logger,
      fetchImpl: async () => ({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () => JSON.stringify({ message: `invalid ${TRIPO_KEY}` }),
      }),
    });

    assert.equal(summary.ok, false);
    assert.equal(summary.balance, null);
    assert.match(summary.error, /^401:/);
    assert.match(summary.error, /\[redacted\]/);
    assert.ok(!JSON.stringify(summary).includes(TRIPO_KEY), "the failure result contains the key");
    assert.ok(!JSON.stringify(logs).includes(TRIPO_KEY), "the failure log contains the key");
    assert.ok(!consoleCapture.lines.join("\n").includes(TRIPO_KEY), "the console received the key");
  } finally {
    consoleCapture.restore();
  }
});

test("tripo treats a non-zero code as a failed check even when http is 200", async () => {
  const summary = await executeVerifyRequest({
    provider: "tripo",
    secret: TRIPO_KEY,
    settings: PROVIDERS.tripo.defaults,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify({ code: 1001, data: { balance: 5 }, message: "invalid" }),
    }),
  });

  assert.equal(summary.ok, false);
  assert.equal(summary.balance, null);
  assert.match(summary.error, /^200:/);
  assert.ok(!JSON.stringify(summary).includes(TRIPO_KEY));
});

test("an unreachable tripo is not reported as a bad key, and the key stays out of the log", async () => {
  const logs = [];
  const consoleCapture = captureConsole();
  try {
    const summary = await executeVerifyRequest({
      provider: "tripo",
      secret: TRIPO_KEY,
      settings: PROVIDERS.tripo.defaults,
      logger: { error: (...args) => logs.push(args) },
      fetchImpl: async () => { throw new Error(`ENOTFOUND api.tripo3d.ai ${TRIPO_KEY}`); },
    });

    assert.equal(summary.ok, false);
    assert.match(summary.error, /לא הצלחנו להגיע לספק/);
    assert.doesNotMatch(summary.error, /401|invalid/i);
    assert.ok(!summary.error.includes(TRIPO_KEY));
    assert.match(summary.error, /\[redacted\]/);
    assert.ok(!JSON.stringify(logs).includes(TRIPO_KEY));
    assert.ok(!consoleCapture.lines.join("\n").includes(TRIPO_KEY));
  } finally {
    consoleCapture.restore();
  }
});

dbTest("tripo verification stores the verdict and the balance, never the key", async () => {
  await withDb(async ({ pool, audit }) => {
    const logs = [];
    const consoleCapture = captureConsole();
    try {
      const saved = await saveConnector({ pool, audit, admin: ADMIN }, "tripo", { api_key: TRIPO_KEY });
      assert.equal(saved.settings.baseUrl, "https://api.tripo3d.ai/v2/openapi");
      assert.equal(saved.settings.apiVersion, undefined);
      assert.equal(saved.stored, true);
      assert.ok(!JSON.stringify(saved).includes(TRIPO_KEY));

      let seen = null;
      const verified = await verifyConnector({
        pool,
        audit,
        admin: ADMIN,
        logger: { info: (...args) => logs.push(args), error: (...args) => logs.push(args) },
        fetchImpl: async (url, init) => {
          seen = { url, method: init.method, authorization: init.headers.authorization };
          return {
            ok: true,
            status: 200,
            statusText: "OK",
            text: async () => JSON.stringify({
              code: 0,
              data: { balance: 2400, frozen: 10 },
              echo: TRIPO_KEY,
            }),
          };
        },
      }, "tripo");

      assert.equal(seen.url, "https://api.tripo3d.ai/v2/openapi/user/balance");
      assert.equal(seen.method, "GET");
      assert.equal(seen.authorization, `Bearer ${TRIPO_KEY}`);
      assert.equal(verified.status, "connected");
      assert.equal(verified.balance, 2400);
      assert.ok(!JSON.stringify(verified).includes(TRIPO_KEY), "the connector response contains the key");
      assert.ok(!JSON.stringify(verified).includes("secret"), "the connector response names a secret");

      const entries = await audit.list({ entityType: "admin_connector", entityId: saved.id });
      assert.ok(!JSON.stringify(entries).includes(TRIPO_KEY), "the audit log contains the key");
      assert.ok(!JSON.stringify(logs).includes(TRIPO_KEY), "the logger received the key");
      assert.ok(!consoleCapture.lines.join("\n").includes(TRIPO_KEY), "the console received the key");
    } finally {
      consoleCapture.restore();
    }
  });
});
