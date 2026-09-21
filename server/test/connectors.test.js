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
    await pool.query("delete from public.admin_connectors where provider = 'runway'");
    await fn({ pool, audit });
  } finally {
    await pool.query("delete from public.admin_connectors where provider = 'runway'").catch(() => {});
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
    const listed = await listConnectors({ pool });
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
    // Not the length either: it narrows a search and identifies the provider's
    // key format.
    assert.ok(!serialised.includes(String(API_KEY.length)), "the audit log records the key's length");
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
  assert.equal(isKnownProvider("not-a-provider"), false);
  assert.equal(isKnownProvider(""), false);
});

test("every provider verifies with a read, over https, against a stated version", () => {
  for (const [name, definition] of Object.entries(PROVIDERS)) {
    assert.ok(/^https:\/\//.test(definition.defaults.baseUrl), `${name} defaults to a non-https base url`);
    assert.ok(definition.defaults.apiVersion, `${name} has no default api version`);

    const request = definition.buildVerifyRequest({
      secret: "test-key",
      settings: definition.defaults,
    });
    assert.equal(request.method, "GET", `${name} verifies with a ${request.method}`);
    assert.ok(!request.url.includes("test-key"), `${name} puts the key in the url`);
  }
});
