// Admin two-factor, behind a flag that defaults to off.
//
// The gate is pure and always runs. The database cases (enrolment, a recovery
// code spent once, a reset that leaves the password alone) run only when
// DATABASE_URL is set — the migrations job sets it after 0061 has applied.

import assert from "node:assert/strict";
import test from "node:test";
import { FixedWindowRateLimiter } from "../src/security.js";
import { createSecretBox, createSecretBoxFromEnv, generateSecretKeyMaterial, parseSecretKey } from "../src/secretBox.js";
import { decryptSecret, encryptSecret } from "../src/secretStore.js";
import { totpCodeForStep, totpStepFor } from "../src/totp.js";
import { hashPassword, verifyPassword } from "../src/passwords.js";
import {
  ADMIN_MFA_VERIFY_LIMIT,
  adminSessionGate,
  clearAdminTwoFactor,
  confirmTotpEnrolment,
  consumeAdminRecoveryCode,
  countAdminRecoveryCodesRemaining,
  issueAdminRecoveryCodes,
  loadAdminTotpSecret,
  publicMfaFields,
  readAdminTwoFactorFlags,
  recordAdminTotpStep,
  storePendingTotpSecret,
} from "../src/adminTwoFactor.js";

const box = () => createSecretBox({
  activeKey: parseSecretKey(generateSecretKeyMaterial()),
});

test("a bare 32-byte key is the same key secretBox and the connector store both open", () => {
  // Connectors already read SECRET_ENCRYPTION_KEY as raw base64. A key id
  // prefix would open TOTP envelopes and break that store, so the documented
  // generator stays prefix-free and both must accept it.
  const material = generateSecretKeyMaterial();
  const previous = process.env.SECRET_ENCRYPTION_KEY;
  process.env.SECRET_ENCRYPTION_KEY = material;
  try {
    const secretBox = createSecretBoxFromEnv({ SECRET_ENCRYPTION_KEY: material });
    const envelope = secretBox.seal("totp-seed", "admin_totp:admin-1");
    assert.equal(secretBox.open(envelope, "admin_totp:admin-1"), "totp-seed");
    assert.equal(decryptSecret(encryptSecret("connector-token")), "connector-token");
    assert.equal(parseSecretKey(material).id, "k1");
  } finally {
    if (previous === undefined) delete process.env.SECRET_ENCRYPTION_KEY;
    else process.env.SECRET_ENCRYPTION_KEY = previous;
  }
});

test("the feature is off unless ADMIN_2FA_ENABLED is explicitly on", () => {
  assert.deepEqual(readAdminTwoFactorFlags({}), { enabled: false, requireEnrollment: false });
  assert.deepEqual(readAdminTwoFactorFlags({ ADMIN_2FA_ENABLED: "" }), { enabled: false, requireEnrollment: false });
  assert.deepEqual(readAdminTwoFactorFlags({ ADMIN_2FA_ENABLED: "false" }), { enabled: false, requireEnrollment: false });
  assert.deepEqual(readAdminTwoFactorFlags({ ADMIN_2FA_ENABLED: "0" }), { enabled: false, requireEnrollment: false });

  // The second flag cannot lock anyone out on its own.
  assert.deepEqual(
    readAdminTwoFactorFlags({ ADMIN_2FA_REQUIRE_ENROLLMENT: "true" }),
    { enabled: false, requireEnrollment: false },
  );

  assert.deepEqual(
    readAdminTwoFactorFlags({ ADMIN_2FA_ENABLED: "true" }),
    { enabled: true, requireEnrollment: false },
  );
  assert.deepEqual(
    readAdminTwoFactorFlags({ ADMIN_2FA_ENABLED: "true", ADMIN_2FA_REQUIRE_ENROLLMENT: "true" }),
    { enabled: true, requireEnrollment: true },
  );
});

test("with the flag off, login is a full session whether or not a code was ever enrolled", () => {
  for (const enrolled of [false, true]) {
    for (const mfaVerifiedAt of [null, "2026-09-06T00:00:00.000Z"]) {
      const gate = adminSessionGate({
        enabled: false,
        requireEnrollment: true,
        enrolled,
        mfaVerifiedAt,
      });
      assert.equal(gate, "full", `enrolled=${enrolled} verified=${mfaVerifiedAt}`);
      const fields = publicMfaFields({ enabled: false, requireEnrollment: true, enrolled, mfaVerifiedAt });
      assert.equal(fields.mfa_enabled, false);
      assert.equal(fields.mfa_verified, true);
      assert.equal(fields.mfa_enrollment_prompt, false);
    }
  }
});

test("with the flag on, an admin who has not enrolled can still sign in and is prompted", () => {
  const gate = adminSessionGate({ enabled: true, requireEnrollment: false, enrolled: false, mfaVerifiedAt: null });
  assert.equal(gate, "full");
  const fields = publicMfaFields({ enabled: true, requireEnrollment: false, enrolled: false, mfaVerifiedAt: null });
  assert.equal(fields.mfa_verified, true);
  assert.equal(fields.mfa_enrolled, false);
  assert.equal(fields.mfa_enrollment_prompt, true);
  assert.equal(fields.mfa_enrollment_required, false);
});

test("with the flag on, an enrolled admin must present a code", () => {
  const blocked = adminSessionGate({ enabled: true, enrolled: true, mfaVerifiedAt: null });
  assert.equal(blocked, "verify");
  assert.equal(publicMfaFields({ enabled: true, enrolled: true, mfaVerifiedAt: null }).mfa_verified, false);

  const passed = adminSessionGate({
    enabled: true,
    enrolled: true,
    mfaVerifiedAt: "2026-09-27T00:00:00.000Z",
  });
  assert.equal(passed, "full");
  assert.equal(
    publicMfaFields({ enabled: true, enrolled: true, mfaVerifiedAt: "2026-09-27T00:00:00.000Z" }).mfa_verified,
    true,
  );
});

test("the enrolment-required flag holds an unenrolled admin at enrolment", () => {
  assert.equal(
    adminSessionGate({ enabled: true, requireEnrollment: true, enrolled: false, mfaVerifiedAt: null }),
    "enroll",
  );
  const fields = publicMfaFields({
    enabled: true,
    requireEnrollment: true,
    enrolled: false,
    mfaVerifiedAt: null,
  });
  assert.equal(fields.mfa_verified, false);
  assert.equal(fields.mfa_enrollment_required, true);
  assert.equal(fields.mfa_enrollment_prompt, false);
});

test("TOTP attempts are rate limited, and a different admin is a different window", () => {
  const limiter = new FixedWindowRateLimiter();
  const now = 1_700_000_000_000;
  const options = ADMIN_MFA_VERIFY_LIMIT;

  for (let attempt = 0; attempt < options.limit; attempt += 1) {
    assert.equal(
      limiter.check("admin-mfa-admin:one", options, now).allowed,
      true,
      `attempt ${attempt + 1} of the limit must be allowed`,
    );
  }

  const blocked = limiter.check("admin-mfa-admin:one", options, now);
  assert.equal(blocked.allowed, false);
  // Still inside the window.
  assert.equal(limiter.check("admin-mfa-admin:one", options, now + options.windowMs - 1).allowed, false);
  // A different admin is not charged for the first one's guesses.
  assert.equal(limiter.check("admin-mfa-admin:two", options, now).allowed, true);
  // The window expiring opens the first admin again.
  assert.equal(limiter.check("admin-mfa-admin:one", options, now + options.windowMs).allowed, true);
});

const DATABASE_URL = process.env.DATABASE_URL;
const dbTest = (name, fn) => test(name, { skip: DATABASE_URL ? false : "DATABASE_URL not set" }, fn);

const withDb = async (fn) => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: false });
  const client = await pool.connect();
  try {
    await client.query("begin");
    return await fn(client);
  } finally {
    await client.query("rollback").catch(() => {});
    client.release();
    await pool.end();
  }
};

const seedAdmin = async (client, email) => {
  const { rows } = await client.query(
    `
      insert into public.admin_users (email, password_hash, display_name, role, is_active)
      values ($1, $2, 'Two factor', 'admin', true)
      returning id, email, password_hash
    `,
    [email, hashPassword("correct-horse-battery")],
  );
  return rows[0];
};

dbTest("a recovery code works once and then never again", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, `mfa-recovery-${Date.now()}@example.com`);
    const [first, ...rest] = await issueAdminRecoveryCodes(client, admin.id);
    assert.equal(await countAdminRecoveryCodesRemaining(client, admin.id), 10);

    assert.equal(await consumeAdminRecoveryCode(client, admin.id, first, "127.0.0.1"), true);
    assert.equal(await countAdminRecoveryCodesRemaining(client, admin.id), 9);
    // The same code, including a retyped form, is spent.
    assert.equal(await consumeAdminRecoveryCode(client, admin.id, first.toLowerCase(), "127.0.0.1"), false);
    assert.equal(await consumeAdminRecoveryCode(client, admin.id, first.replace(/-/g, ""), "10.0.0.8"), false);
    assert.equal(await countAdminRecoveryCodesRemaining(client, admin.id), 9);

    // A different code from the same sheet still works, once.
    assert.equal(await consumeAdminRecoveryCode(client, admin.id, rest[0], "127.0.0.1"), true);
    assert.equal(await consumeAdminRecoveryCode(client, admin.id, rest[0], "127.0.0.1"), false);
  });
});

dbTest("flag on and not enrolled: the admin can sign in, and enrolment completes on a code", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, `mfa-enrol-${Date.now()}@example.com`);
    const before = publicMfaFields({ enabled: true, requireEnrollment: false, enrolled: false, mfaVerifiedAt: null });
    assert.equal(before.mfa_verified, true, "an unenrolled admin is not locked out");
    assert.equal(before.mfa_enrollment_prompt, true);

    const secretBox = box();
    const secret = await storePendingTotpSecret(client, admin.id, secretBox);
    const loaded = await loadAdminTotpSecret(client, admin.id, secretBox);
    assert.equal(loaded.secret, secret);
    assert.equal(loaded.enrolledAt, null, "a stored seed is not enrolment");

    const now = Date.now();
    const step = totpStepFor(now);
    const code = totpCodeForStep(secret, step);
    await confirmTotpEnrolment(client, admin.id, step);
    const codes = await issueAdminRecoveryCodes(client, admin.id);
    assert.equal(codes.length, 10);

    const { rows } = await client.query(
      "select totp_enrolled_at, totp_secret_encrypted from public.admin_users where id = $1",
      [admin.id],
    );
    assert.ok(rows[0].totp_enrolled_at);
    assert.equal(rows[0].totp_secret_encrypted.includes(secret), false, "the seed is not stored in the clear");

    // The password was not part of enrolment.
    assert.equal(verifyPassword("correct-horse-battery", admin.password_hash), true);

    // A code from the previous window still matches; two windows out does not.
    const { verifyTotp } = await import("../src/totp.js");
    assert.equal(verifyTotp(secret, totpCodeForStep(secret, step - 1), { now, lastUsedStep: null }).valid, true);
    assert.equal(verifyTotp(secret, totpCodeForStep(secret, step + 2), { now }).valid, false);
    assert.equal(code.length, 6);
  });
});

dbTest("flag on and enrolled: the session stays at verify until a code is recorded", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, `mfa-verify-${Date.now()}@example.com`);
    const secretBox = box();
    const secret = await storePendingTotpSecret(client, admin.id, secretBox);
    const now = Date.now();
    const step = totpStepFor(now);
    await confirmTotpEnrolment(client, admin.id, step);

    assert.equal(
      adminSessionGate({ enabled: true, enrolled: true, mfaVerifiedAt: null }),
      "verify",
    );

    // Replaying the enrolment step is refused. The next step is not.
    await recordAdminTotpStep(client, admin.id, step);
    const loaded = await loadAdminTotpSecret(client, admin.id, secretBox);
    const { verifyTotp } = await import("../src/totp.js");
    assert.equal(
      verifyTotp(secret, totpCodeForStep(secret, step), { now, lastUsedStep: loaded.lastUsedStep }).valid,
      false,
    );
    assert.equal(
      verifyTotp(secret, totpCodeForStep(secret, step + 1), { now, lastUsedStep: loaded.lastUsedStep }).valid,
      true,
    );
  });
});

dbTest("resetting two-factor clears the enrolment and leaves the password", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, `mfa-reset-${Date.now()}@example.com`);
    const secretBox = box();
    await storePendingTotpSecret(client, admin.id, secretBox);
    await confirmTotpEnrolment(client, admin.id, totpStepFor(Date.now()));
    await issueAdminRecoveryCodes(client, admin.id);
    await client.query(
      `
        insert into public.admin_sessions (admin_user_id, session_token_hash, expires_at)
        values ($1, $2, now() + interval '1 hour')
      `,
      [admin.id, `hash-${admin.id}`],
    );

    const cleared = await clearAdminTwoFactor(client, admin.id);
    assert.equal(cleared.email, admin.email);

    const { rows } = await client.query(
      `
        select totp_secret_encrypted, totp_enrolled_at, totp_last_used_step, password_hash
        from public.admin_users where id = $1
      `,
      [admin.id],
    );
    assert.equal(rows[0].totp_secret_encrypted, null);
    assert.equal(rows[0].totp_enrolled_at, null);
    assert.equal(rows[0].totp_last_used_step, null);
    assert.equal(verifyPassword("correct-horse-battery", rows[0].password_hash), true);

    const codes = await client.query(
      "select count(*)::int as n from public.admin_recovery_codes where admin_user_id = $1",
      [admin.id],
    );
    const sessions = await client.query(
      "select count(*)::int as n from public.admin_sessions where admin_user_id = $1",
      [admin.id],
    );
    assert.equal(codes.rows[0].n, 0);
    assert.equal(sessions.rows[0].n, 0);

    // After the reset the gate is the unenrolled one: sign in, then enrol again.
    assert.equal(
      adminSessionGate({ enabled: true, requireEnrollment: false, enrolled: false, mfaVerifiedAt: null }),
      "full",
    );
  });
});
