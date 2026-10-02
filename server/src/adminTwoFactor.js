/**
 * Admin TOTP: the decision, and the database work behind it.
 *
 * The feature is off unless ADMIN_2FA_ENABLED is set. With it off, a password
 * session is a full session — the same login as before this code existed.
 * With it on, an account that has finished enrolment must present a code (or
 * a recovery code) before the panel. An account that has not enrolled can
 * still sign in; a second flag, ADMIN_2FA_REQUIRE_ENROLLMENT, is what later
 * turns that prompt into a gate.
 *
 * Nothing here opens a server or a pool. The HTTP routes in index.js call
 * these functions, and the tests call the same functions.
 */

import { generateTotpSecret } from "./totp.js";
import {
  generateRecoveryCodes,
  hashRecoveryCode,
  isWellFormedRecoveryCode,
  verifyRecoveryCode,
} from "./recoveryCodes.js";

/** Ten guesses per quarter hour, per address and per admin. A six-digit code
 *  is one in a million per step, and three steps are accepted; this keeps a
 *  guesser out without locking an admin out for a mistyped digit. */
export const ADMIN_MFA_VERIFY_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 };

const TRUTHY = new Set(["1", "true", "yes", "on"]);

export const isEnvFlagOn = (value) => TRUTHY.has(String(value || "").trim().toLowerCase());

/**
 * Flags, read from an environment object so tests can pass one in.
 *
 * Require-enrolment does nothing unless the feature itself is on. A deploy
 * that sets only the second variable must not lock anyone out.
 */
export const readAdminTwoFactorFlags = (env = process.env) => {
  const enabled = isEnvFlagOn(env.ADMIN_2FA_ENABLED);
  return {
    enabled,
    requireEnrollment: enabled && isEnvFlagOn(env.ADMIN_2FA_REQUIRE_ENROLLMENT),
  };
};

/**
 * A session counts as verified only when the timestamp is a real instant.
 * A missing value, an empty string, and a value that does not parse all mean
 * "not verified". Anything else would treat garbage in mfa_verified_at as a
 * passed gate.
 */
const verifiedSessionAt = (mfaVerifiedAt) => {
  if (mfaVerifiedAt === null || mfaVerifiedAt === undefined || mfaVerifiedAt === "") return null;
  const time = new Date(mfaVerifiedAt).getTime();
  return Number.isFinite(time) ? time : null;
};

/**
 * What a password session may do.
 *
 * "full"    — the panel, exactly as a session worked before this feature.
 * "verify"  — the account is enrolled; the session stops at the code screen.
 * "enroll"  — enrolment is mandatory and this account has not finished it.
 *
 * With the feature off this is always "full", including for an account that
 * already enrolled and for a timestamp that would not parse.
 */
export const adminSessionGate = ({
  enabled,
  requireEnrollment = false,
  enrolled = false,
  mfaVerifiedAt = null,
} = {}) => {
  if (!enabled) return "full";
  const verified = verifiedSessionAt(mfaVerifiedAt) !== null;
  if (enrolled) return verified ? "full" : "verify";
  if (requireEnrollment) return verified ? "full" : "enroll";
  return "full";
};

/**
 * Whether a password session may see admin-only catalogue fields.
 *
 * The public product routes do not reject an anonymous caller. They attach
 * the internal row only when this is true. A session that still owes a code
 * is not that caller: it gets the same public row a visitor gets.
 * With the feature off the gate is "full", so an admin screen still sees
 * cost, commission and supplier, which is what it does today.
 */
export const sessionClearsAdminMfaGate = (input = {}) => adminSessionGate(input) === "full";

/** The fields a browser is allowed to see. No seed, no ciphertext, no hash. */
export const publicMfaFields = ({
  enabled,
  requireEnrollment = false,
  enrolled = false,
  mfaVerifiedAt = null,
} = {}) => {
  const gate = adminSessionGate({ enabled, requireEnrollment, enrolled, mfaVerifiedAt });
  return {
    mfa_enabled: Boolean(enabled),
    mfa_enrollment_required: Boolean(enabled && requireEnrollment),
    mfa_enrolled: Boolean(enrolled),
    mfa_verified: gate === "full",
    mfa_enrollment_prompt: Boolean(enabled && !enrolled && !requireEnrollment),
  };
};

/** Step-up: a sensitive action wants the factor proven recently, not merely
 *  at some point in a long working day. */
export const mfaStepUpIsFresh = (verifiedAt, nowMs, maxAgeMs) => {
  if (!verifiedAt) return false;
  const age = nowMs - new Date(verifiedAt).getTime();
  return Number.isFinite(age) && age >= 0 && age <= maxAgeMs;
};

export const totpEncryptionContext = (adminUserId) => `admin_totp:${adminUserId}`;

export const normalizeUserAgent = (value) => {
  const normalized = String(value || "").trim().slice(0, 512);
  return normalized || null;
};

/**
 * Stores a fresh seed without marking the account enrolled. An interrupted
 * enrolment is restarted by calling this again; the previous seed is replaced.
 */
export const storePendingTotpSecret = async (db, adminUserId, secretBox) => {
  const secret = generateTotpSecret();
  const result = await db.query(
    `
      update public.admin_users
      set totp_secret_encrypted = $2, totp_last_used_step = null, updated_at = now()
      where id = $1 and totp_enrolled_at is null
      returning id
    `,
    [adminUserId, secretBox.seal(secret, totpEncryptionContext(adminUserId))],
  );

  if (result.rowCount === 0) {
    const error = new Error("Two-factor authentication is already enrolled for this account");
    error.statusCode = 409;
    throw error;
  }

  return secret;
};

export const loadAdminTotpSecret = async (db, adminUserId, secretBox) => {
  const result = await db.query(
    "select totp_secret_encrypted, totp_enrolled_at, totp_last_used_step from public.admin_users where id = $1",
    [adminUserId],
  );
  const row = result.rows[0];
  if (!row?.totp_secret_encrypted) return null;

  return {
    secret: secretBox.open(row.totp_secret_encrypted, totpEncryptionContext(adminUserId)),
    enrolledAt: row.totp_enrolled_at || null,
    lastUsedStep: row.totp_last_used_step === null || row.totp_last_used_step === undefined
      ? null
      : Number(row.totp_last_used_step),
  };
};

/** Marks enrolment complete. A concurrent confirm cannot issue a second set
 *  of recovery codes: the `totp_enrolled_at is null` predicate loses the race. */
export const confirmTotpEnrolment = async (db, adminUserId, step) => {
  const enrolled = await db.query(
    `
      update public.admin_users
      set totp_enrolled_at = now(), totp_last_used_step = $2, updated_at = now()
      where id = $1 and totp_enrolled_at is null
      returning id
    `,
    [adminUserId, step],
  );
  if (enrolled.rowCount === 0) {
    const error = new Error("Two-factor authentication is already enrolled for this account");
    error.statusCode = 409;
    throw error;
  }
};

export const recordAdminTotpStep = async (db, adminUserId, step) => {
  await db.query(
    "update public.admin_users set totp_last_used_step = $2, updated_at = now() where id = $1",
    [adminUserId, step],
  );
};

export const markAdminSessionMfaVerified = async (db, tokenHash) => {
  await db.query(
    "update public.admin_sessions set mfa_verified_at = now(), last_seen_at = now() where session_token_hash = $1",
    [tokenHash],
  );
};

export const issueAdminRecoveryCodes = async (db, adminUserId) => {
  const codes = generateRecoveryCodes();
  await db.query("delete from public.admin_recovery_codes where admin_user_id = $1", [adminUserId]);
  for (const code of codes) {
    await db.query(
      "insert into public.admin_recovery_codes (admin_user_id, code_hash) values ($1, $2)",
      [adminUserId, hashRecoveryCode(code)],
    );
  }
  return codes;
};

/**
 * Spends one recovery code. The update is the lock: two requests with the
 * same code cannot both observe used_at is null and both succeed.
 */
export const consumeAdminRecoveryCode = async (db, adminUserId, code, ip) => {
  if (!isWellFormedRecoveryCode(code)) return false;

  const result = await db.query(
    "select id, code_hash from public.admin_recovery_codes where admin_user_id = $1 and used_at is null",
    [adminUserId],
  );

  for (const row of result.rows) {
    if (!verifyRecoveryCode(code, row.code_hash)) continue;
    const claimed = await db.query(
      `
        update public.admin_recovery_codes
        set used_at = now(), used_ip = $2
        where id = $1 and used_at is null
        returning id
      `,
      [row.id, ip],
    );
    return claimed.rowCount === 1;
  }

  return false;
};

export const countAdminRecoveryCodesRemaining = async (db, adminUserId) => {
  const result = await db.query(
    "select count(*)::int as remaining from public.admin_recovery_codes where admin_user_id = $1 and used_at is null",
    [adminUserId],
  );
  return result.rows[0]?.remaining ?? 0;
};

/**
 * Owner recovery. Clears the seed, the enrolment and the recovery codes, and
 * destroys sessions so the next sign-in is a password sign-in again.
 *
 * Does not touch the password. The caller must already hold database
 * credentials; there is no HTTP route for this.
 */
export const clearAdminTwoFactor = async (db, adminUserId) => {
  const cleared = await db.query(
    `
      update public.admin_users
      set
        totp_secret_encrypted = null,
        totp_enrolled_at = null,
        totp_last_used_step = null,
        updated_at = now()
      where id = $1
      returning id, email
    `,
    [adminUserId],
  );
  await db.query("delete from public.admin_recovery_codes where admin_user_id = $1", [adminUserId]);
  await db.query("delete from public.admin_sessions where admin_user_id = $1", [adminUserId]);
  return cleared.rows[0] ?? null;
};
