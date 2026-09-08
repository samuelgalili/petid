import assert from "node:assert/strict";
import test from "node:test";
import { SCHEMA_PROBES, checkDatabaseHealth, checkSchemaHealth } from "../src/health.js";

test("database health succeeds after a connectivity query", async () => {
  const queries = [];
  const database = {
    query: async (sql) => queries.push(sql),
  };

  assert.equal(await checkDatabaseHealth(database), true);
  assert.deepEqual(queries, ["select 1"]);
});

test("database health reports an unavailable database without throwing", async () => {
  const database = {
    query: async () => {
      throw new Error("connection string with sensitive details");
    },
  };

  assert.equal(await checkDatabaseHealth(database), false);
});

test("schema health passes only when every probe can be answered", async () => {
  const asked = [];
  const database = { query: async (sql) => { asked.push(sql); } };

  const result = await checkSchemaHealth(database);

  assert.equal(result.ok, true);
  assert.deepEqual(result.failures, []);
  assert.equal(result.checked, SCHEMA_PROBES.length);
  // Every probe runs; none is skipped once an earlier one has passed.
  assert.equal(asked.length, SCHEMA_PROBES.length);
});

test("schema health names the probe a dropped column breaks", async () => {
  // The 8 September shape: profiles lost the identity columns while the
  // running build still selected them. `select 1` was unaffected, which is why
  // both of the deploy's checks stayed green for four hours.
  const database = {
    query: async (sql) => {
      if (sql.includes("public.profiles")) {
        throw new Error('column au.email does not exist');
      }
    },
  };

  const result = await checkSchemaHealth(database);

  assert.equal(result.ok, false);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].probe, "profile");
  assert.match(result.failures[0].error, /au\.email/);
  // The rest still ran, so one failure does not hide the others.
  assert.equal(result.checked, SCHEMA_PROBES.length);
});

test("schema health collects every failure rather than stopping at the first", async () => {
  const database = {
    query: async () => {
      throw new Error("relation does not exist");
    },
  };

  const result = await checkSchemaHealth(database);

  assert.equal(result.ok, false);
  assert.equal(result.failures.length, SCHEMA_PROBES.length);
  assert.deepEqual(
    result.failures.map((failure) => failure.probe),
    SCHEMA_PROBES.map(([name]) => name),
  );
});
