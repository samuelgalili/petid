import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword } from "../src/passwords.js";

test("password hashes verify only the original password", () => {
  const hash = hashPassword("correct horse battery staple");

  assert.equal(verifyPassword("correct horse battery staple", hash), true);
  assert.equal(verifyPassword("wrong password", hash), false);
});

test("password verification safely rejects malformed stored hashes", () => {
  const malformedHashes = [
    null,
    "",
    "scrypt",
    "scrypt$$",
    "bcrypt$salt$hash",
    "scrypt$invalid!salt$invalid!hash",
    `scrypt$${"a".repeat(22)}$a`,
    `scrypt$${"a".repeat(22)}$${"a".repeat(86)}$extra`,
    `scrypt$${"a".repeat(100_000)}$${"a".repeat(100_000)}`,
  ];

  for (const hash of malformedHashes) {
    assert.doesNotThrow(() => verifyPassword("password", hash));
    assert.equal(verifyPassword("password", hash), false);
  }
});
