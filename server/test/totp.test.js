import assert from "node:assert/strict";
import test from "node:test";
import {
  base32Decode,
  base32Encode,
  buildOtpAuthUrl,
  generateTotpSecret,
  hotp,
  TOTP_PERIOD_SECONDS,
  totpCodeForStep,
  totpStepFor,
  verifyTotp,
} from "../src/totp.js";

// RFC 4226 / RFC 6238 use the ASCII seed "12345678901234567890".
const RFC_SECRET_ASCII = "12345678901234567890";
const RFC_SECRET_BASE32 = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

test("base32 round-trips and matches the RFC test seed", () => {
  assert.equal(base32Encode(Buffer.from(RFC_SECRET_ASCII, "ascii")), RFC_SECRET_BASE32);
  assert.equal(base32Decode(RFC_SECRET_BASE32).toString("ascii"), RFC_SECRET_ASCII);

  for (let length = 1; length <= 24; length += 1) {
    const bytes = Buffer.alloc(length, length);
    assert.deepEqual(base32Decode(base32Encode(bytes)).subarray(0, length), bytes);
  }
});

test("base32 decoding tolerates human formatting and rejects junk", () => {
  assert.equal(base32Decode("gezd gnbv-gy3t qojq gezd gnbv gy3t qojq").toString("ascii"), RFC_SECRET_ASCII);
  assert.equal(base32Decode("MZXW6===").toString("ascii"), "foo", "trailing padding is stripped");
  assert.equal(base32Decode("MZXW6!!!"), null);
  assert.equal(base32Decode("18189"), null, "1 and 8 are not in the RFC 4648 alphabet");
  assert.equal(base32Decode(""), null);
  assert.equal(base32Decode(null), null);
});

test("HOTP matches the RFC 4226 appendix D vectors", () => {
  const expected = [
    "755224", "287082", "359152", "969429", "338314",
    "254676", "287922", "162583", "399871", "520489",
  ];
  const secret = Buffer.from(RFC_SECRET_ASCII, "ascii");

  expected.forEach((code, counter) => {
    assert.equal(hotp(secret, counter, 6), code, `counter ${counter}`);
  });
});

test("TOTP matches the RFC 6238 appendix B vectors", () => {
  const vectors = [
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
    [20000000000, "65353130"],
  ];

  for (const [seconds, code] of vectors) {
    const step = totpStepFor(seconds * 1000, TOTP_PERIOD_SECONDS);
    assert.equal(totpCodeForStep(RFC_SECRET_BASE32, step, { digits: 8 }), code, `T=${seconds}`);
  }
});

test("verification accepts the current step and one step of clock drift", () => {
  const now = 1_700_000_000_000;
  const step = totpStepFor(now);

  for (const offset of [-1, 0, 1]) {
    const code = totpCodeForStep(RFC_SECRET_BASE32, step + offset);
    const result = verifyTotp(RFC_SECRET_BASE32, code, { now });
    assert.equal(result.valid, true, `offset ${offset}`);
    assert.equal(result.step, step + offset);
  }

  for (const offset of [-2, 2]) {
    const code = totpCodeForStep(RFC_SECRET_BASE32, step + offset);
    assert.equal(verifyTotp(RFC_SECRET_BASE32, code, { now }).valid, false, `offset ${offset}`);
  }
});

test("a code cannot be replayed once its step has been recorded", () => {
  const now = 1_700_000_000_000;
  const step = totpStepFor(now);
  const code = totpCodeForStep(RFC_SECRET_BASE32, step);

  const first = verifyTotp(RFC_SECRET_BASE32, code, { now, lastUsedStep: null });
  assert.equal(first.valid, true);

  const replay = verifyTotp(RFC_SECRET_BASE32, code, { now, lastUsedStep: first.step });
  assert.equal(replay.valid, false);
  assert.equal(replay.reason, "replayed_code");

  // A code from an earlier step is refused too, so a captured code cannot be
  // used after a later one has already been accepted.
  const earlier = totpCodeForStep(RFC_SECRET_BASE32, step - 1);
  assert.equal(verifyTotp(RFC_SECRET_BASE32, earlier, { now, lastUsedStep: step }).valid, false);

  // The next step is still accepted, so the account is not locked out.
  const next = totpCodeForStep(RFC_SECRET_BASE32, step + 1);
  assert.equal(verifyTotp(RFC_SECRET_BASE32, next, { now, lastUsedStep: step }).valid, true);
});

test("verification rejects malformed input without throwing", () => {
  const now = 1_700_000_000_000;
  const malformed = ["", null, undefined, "12345", "1234567", "abcdef", "12 34 56", {}, []];

  for (const code of malformed) {
    assert.doesNotThrow(() => verifyTotp(RFC_SECRET_BASE32, code, { now }));
    assert.equal(verifyTotp(RFC_SECRET_BASE32, code, { now }).valid, false);
  }

  const valid = totpCodeForStep(RFC_SECRET_BASE32, totpStepFor(now));
  assert.equal(verifyTotp("not-base32!", valid, { now }).valid, false);
  assert.equal(verifyTotp("", valid, { now }).reason, "malformed_secret");
});

test("verification accepts codes typed with spaces or a dash", () => {
  const now = 1_700_000_000_000;
  const code = totpCodeForStep(RFC_SECRET_BASE32, totpStepFor(now));
  assert.equal(verifyTotp(RFC_SECRET_BASE32, `${code.slice(0, 3)} ${code.slice(3)}`, { now }).valid, true);
  assert.equal(verifyTotp(RFC_SECRET_BASE32, `${code.slice(0, 3)}-${code.slice(3)}`, { now }).valid, true);
});

test("generated secrets are 160 bits and distinct", () => {
  const secrets = new Set();
  for (let index = 0; index < 50; index += 1) {
    const secret = generateTotpSecret();
    assert.equal(base32Decode(secret).length, 20);
    secrets.add(secret);
  }
  assert.equal(secrets.size, 50);
});

test("the otpauth url carries the parameters an authenticator needs", () => {
  const url = new URL(buildOtpAuthUrl({ secret: RFC_SECRET_BASE32, accountName: "admin@mipo.pet" }));

  assert.equal(url.protocol, "otpauth:");
  assert.equal(url.host, "totp");
  assert.equal(decodeURIComponent(url.pathname), "/MIPO:admin@mipo.pet");
  assert.equal(url.searchParams.get("secret"), RFC_SECRET_BASE32);
  assert.equal(url.searchParams.get("issuer"), "MIPO");
  assert.equal(url.searchParams.get("algorithm"), "SHA1");
  assert.equal(url.searchParams.get("digits"), "6");
  assert.equal(url.searchParams.get("period"), "30");
});
