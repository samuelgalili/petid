import assert from "node:assert/strict";
import test from "node:test";
import {
  generateRecoveryCode,
  generateRecoveryCodes,
  hashRecoveryCode,
  isWellFormedRecoveryCode,
  normalizeRecoveryCode,
  RECOVERY_CODE_COUNT,
  verifyRecoveryCode,
} from "../src/recoveryCodes.js";

test("generated codes are formatted, unambiguous and unique", () => {
  const codes = generateRecoveryCodes();
  assert.equal(codes.length, RECOVERY_CODE_COUNT);
  assert.equal(new Set(codes).size, RECOVERY_CODE_COUNT);

  for (const code of codes) {
    assert.match(code, /^[0-9A-HJ-KM-NP-TV-Z]{5}-[0-9A-HJ-KM-NP-TV-Z]{5}-[0-9A-HJ-KM-NP-TV-Z]{5}$/);
    assert.equal(isWellFormedRecoveryCode(code), true);
    // I, L, O and U are excluded so a printed sheet cannot be misread.
    assert.equal(/[ILOU]/.test(code), false);
  }
});

test("codes are matched however the admin retypes them", () => {
  const code = generateRecoveryCode();
  const hash = hashRecoveryCode(code);

  const variants = [
    code,
    code.toLowerCase(),
    code.replace(/-/g, ""),
    code.replace(/-/g, " "),
    `  ${code}  `,
  ];

  for (const variant of variants) {
    assert.equal(verifyRecoveryCode(variant, hash), true, variant);
  }
});

test("a different code never verifies", () => {
  const hash = hashRecoveryCode(generateRecoveryCode());
  for (let index = 0; index < 20; index += 1) {
    assert.equal(verifyRecoveryCode(generateRecoveryCode(), hash), false);
  }
});

test("codes are stored hashed, never in the clear", () => {
  const code = generateRecoveryCode();
  const hash = hashRecoveryCode(code);

  assert.match(hash, /^scrypt\$/);
  assert.equal(hash.includes(normalizeRecoveryCode(code)), false);
  assert.notEqual(hash, hashRecoveryCode(code), "each hash carries its own salt");
});

test("malformed input is rejected without throwing", () => {
  const hash = hashRecoveryCode(generateRecoveryCode());
  for (const value of ["", null, undefined, "ABCDE", "ABCDE-FGHIJ-KLMNO-PQRST", "!!!!!"]) {
    assert.doesNotThrow(() => verifyRecoveryCode(value, hash));
    assert.equal(verifyRecoveryCode(value, hash), false);
    assert.equal(isWellFormedRecoveryCode(value), false);
  }
  assert.equal(verifyRecoveryCode("ABCDE-FGHIJ-KLMNO", "not-a-hash"), false);
});
