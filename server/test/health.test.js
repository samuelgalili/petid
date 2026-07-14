import assert from "node:assert/strict";
import test from "node:test";
import { checkDatabaseHealth } from "../src/health.js";

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
