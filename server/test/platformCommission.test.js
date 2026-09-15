// The platform commission rate and the money it produces.
//
// This is the file where a factor-of-100 error would live, so the parsing is
// tested harder than it looks like it needs to be: "15" and "15%" are both
// things people write, and reading one as the other is the difference between
// 15% and 1500%.
//
// Unset is not zero. A line that records NULL says "no rate was configured when
// this was sold"; a line that records 0 says "a rate was configured and it was
// zero". Accounting can tell those apart; a single number cannot.

import assert from "node:assert/strict";
import test from "node:test";
import { commissionForLine, readPlatformCommissionRate } from "../src/platformCommission.js";

const withEnv = (value) => (value === undefined ? {} : { PLATFORM_COMMISSION_RATE: value });

test("a fraction is read as a fraction", () => {
  assert.equal(readPlatformCommissionRate(withEnv("0.15")), 0.15);
  assert.equal(readPlatformCommissionRate(withEnv("0")), 0);
  assert.equal(readPlatformCommissionRate(withEnv("1")), 1);
  assert.equal(readPlatformCommissionRate(withEnv(" 0.075 ")), 0.075);
});

test("a percentage is read as a percentage", () => {
  assert.equal(readPlatformCommissionRate(withEnv("15%")), 0.15);
  assert.equal(readPlatformCommissionRate(withEnv("7.5 %")), 0.075);
  assert.equal(readPlatformCommissionRate(withEnv("0%")), 0);
  assert.equal(readPlatformCommissionRate(withEnv("100%")), 1);
});

test("unset is null, and null is not zero", () => {
  assert.equal(readPlatformCommissionRate({}), null);
  assert.equal(readPlatformCommissionRate(withEnv("")), null);
  assert.equal(readPlatformCommissionRate(withEnv("   ")), null);
  // The distinction the whole module exists for.
  assert.notEqual(readPlatformCommissionRate({}), 0);
});

test("a value above 1 is refused rather than charged", () => {
  // "15" meaning 15% is the factor-of-100 error. Charging 15x the order is
  // worse than charging nothing, so it is treated as unconfigured.
  assert.equal(readPlatformCommissionRate(withEnv("15")), null);
  assert.equal(readPlatformCommissionRate(withEnv("1.01")), null);
  assert.equal(readPlatformCommissionRate(withEnv("101%")), null);
});

test("nonsense is refused, never guessed at", () => {
  for (const bad of ["abc", "-0.1", "-5%", "NaN", "Infinity", "0.1.2", "%"]) {
    assert.equal(readPlatformCommissionRate(withEnv(bad)), null, bad);
  }
});

// ─── the money ───────────────────────────────────────────────────────────────

test("commission is rounded to agorot, per line", () => {
  assert.equal(commissionForLine(0.15, 100), 15);
  assert.equal(commissionForLine(0.15, 49.9), 7.49); // 7.485 -> 7.49
  assert.equal(commissionForLine(0.1, 0.05), 0.01); // 0.005 -> 0.01
  assert.equal(commissionForLine(0, 100), 0);
});

test("no configured rate produces no commission figure at all", () => {
  assert.equal(commissionForLine(null, 100), null);
  assert.equal(commissionForLine(undefined, 100), null);
  // Not 0: an unconfigured rate must not be recorded as a zero commission.
  assert.notEqual(commissionForLine(null, 100), 0);
});

test("an invalid line total produces null, not a wrong number", () => {
  for (const bad of [null, undefined, "abc", NaN, -1]) {
    assert.equal(commissionForLine(0.15, bad), null, String(bad));
  }
});

test("rounding per line is what is being tested, not per order", () => {
  // Three lines at 33.33 with a 15% rate. Rounding each line gives 5.00 x 3;
  // rounding the summed total would give 15.00 as well here, but the point is
  // that the line is what a refund reverses and what a Seller is paid on, so
  // the line is where the rounding has to happen.
  const perLine = [33.33, 33.33, 33.33].map((total) => commissionForLine(0.15, total));
  assert.deepEqual(perLine, [5, 5, 5]);
  assert.equal(perLine.reduce((sum, value) => sum + value, 0), 15);
});
