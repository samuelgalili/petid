// Stage 0 · legacy product creation is closed.
//
// The contract is small enough to state in one line - creation always refuses -
// so what these tests are really for is the shape of the refusal: the right
// status, a stable code, and a message that says what to do instead without
// leaking anything about the system that refused.
//
// The route-level proof that every import path is closed lives in the smoke
// suite, because it needs a real server and a real database.

import assert from "node:assert/strict";
import test from "node:test";

import {
  LegacyProductCreationDisabledError,
  assertLegacyProductCreationDisabled,
} from "../src/legacyProductCreation.js";

test("creation is refused unconditionally", () => {
  assert.throws(assertLegacyProductCreationDisabled, LegacyProductCreationDisabledError);
});

test("the refusal carries 410 and a stable machine-readable code", () => {
  assert.throws(assertLegacyProductCreationDisabled, (error) => {
    // 410 Gone, not 403: the capability was withdrawn, it is not a permission
    // problem, and retrying with a different account will not help.
    assert.equal(error.statusCode, 410, "must be 410 Gone");
    assert.notEqual(error.statusCode, 403, "must not be reported as authorisation");
    assert.equal(error.code, "LEGACY_PRODUCT_CREATION_DISABLED");
    return true;
  });
});

test("the message points at the replacement and nothing else", () => {
  assert.throws(assertLegacyProductCreationDisabled, (error) => {
    assert.equal(
      error.message,
      "Legacy product creation is no longer supported. Use Product Intake.",
    );
    // Nothing about the machine that refused.
    assert.doesNotMatch(error.message, /https?:\/\//, "no URL");
    assert.doesNotMatch(error.message, /token|key|secret|password/i, "no credential words");
    assert.doesNotMatch(error.message, /postgres|database|table|column|sql/i, "no database detail");
    assert.doesNotMatch(error.message, /business_products|defaultBusinessId/, "no internal names");
    return true;
  });
});

test("there is no flag, environment variable or argument that re-enables it", () => {
  // A way to switch this back on quietly is exactly what must not exist: the
  // route was proven to publish and sell an unreviewed product. Reopening it is
  // a revert, which is visible in the history.
  const original = { ...process.env };
  try {
    for (const name of [
      "LEGACY_PRODUCT_CREATION_DISABLED", "LEGACY_PRODUCT_CREATION",
      "ALLOW_LEGACY_PRODUCT_CREATION", "LEGACY_INTAKE_FROZEN",
    ]) {
      for (const value of ["false", "true", "0", "1", ""]) {
        process.env[name] = value;
        assert.throws(assertLegacyProductCreationDisabled, LegacyProductCreationDisabledError,
          `${name}=${JSON.stringify(value)} must not re-enable creation`);
      }
      delete process.env[name];
    }
    // Nor by passing something in.
    for (const argument of [undefined, null, {}, { force: true }, { allow: true }, true]) {
      assert.throws(() => assertLegacyProductCreationDisabled(argument),
        LegacyProductCreationDisabledError);
    }
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
    Object.assign(process.env, original);
  }
});

test("each refusal is a fresh error, so nothing accumulates on a shared object", () => {
  const first = new LegacyProductCreationDisabledError();
  const second = new LegacyProductCreationDisabledError();
  assert.notEqual(first, second);
  assert.equal(first.message, second.message);
  assert.equal(first.code, second.code);
});
