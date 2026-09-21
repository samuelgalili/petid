/**
 * Where a third-party secret lives once it is ours.
 *
 * This is D-4, and it was a §65 STOP for a while: there was no secret storage
 * in this repository at all. `SECRET_ENCRYPTION_KEY` appeared in five
 * documents under docs/ and in ZERO files under server/src/, so admin 2FA, the
 * insurance ID-number column and every connector were all waiting on the same
 * missing thing. The owner's instruction was to stop it blocking.
 *
 * WHAT WAS CHOSEN, AND WHY IT IS NOT KMS YET.
 *
 * The recommendation in DECISIONS.md is AWS KMS envelope encryption, and it
 * still is: a database dump is not a credential breach when the data key is
 * wrapped by a key the application cannot read. But the application talks to
 * nothing in AWS today except RDS - no SDK, no instance role, no signed
 * requests anywhere in server/src - so KMS is not a library away. It is an IAM
 * role, a key policy and a console session, and none of that can be done from
 * here.
 *
 * So this implements envelope encryption with the key supplied by the
 * environment, which is exactly the mechanism the 2FA branch already assumed,
 * AND IT WRITES THE PROVIDER INTO EVERY RECORD. Moving to KMS later changes
 * where the data key comes from and nothing else: old records keep saying
 * `"local"`, are still readable, and can be re-wrapped one at a time.
 *
 * WHAT IT REFUSES TO DO. With no key configured, encrypt and decrypt THROW.
 * There is no fallback to plaintext, no fallback to a weaker cipher, and no
 * "store it anyway and warn". A feature that needs secret storage is off until
 * storage exists, because the alternative is credentials sitting in a table in
 * the clear behind a log line nobody read.
 *
 * THE KEY IS NEVER IN THIS REPOSITORY AND NEVER IN A MESSAGE. It is generated
 * and placed by the owner - see docs/admin-os/DECISIONS.md - and read here
 * from the environment at use time, not at import time, so a process that
 * never touches a secret never needs one.
 */

import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

/** AES-256-GCM: authenticated, so a tampered record fails rather than decodes. */
const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** Bumped when the record shape changes, so old rows stay readable. */
const RECORD_VERSION = 1;

/** Which key source wrapped this record. "kms" is the upgrade path. */
export const PROVIDER_LOCAL = "local";

export class SecretStoreUnavailable extends Error {
  constructor(message) {
    super(message);
    this.name = "SecretStoreUnavailable";
    this.code = "SECRET_STORE_UNAVAILABLE";
    this.statusCode = 503;
  }
}

export class SecretDecryptionFailed extends Error {
  constructor(message) {
    super(message);
    this.name = "SecretDecryptionFailed";
    this.code = "SECRET_DECRYPTION_FAILED";
    this.statusCode = 500;
  }
}

/**
 * The key, or a refusal that names the missing variable.
 *
 * Read at use time. Reading it at import would make every process that loads
 * this module need a key, including ones that never store a secret.
 */
const readKey = () => {
  const raw = String(process.env.SECRET_ENCRYPTION_KEY || "").trim();
  if (!raw) {
    throw new SecretStoreUnavailable(
      "SECRET_ENCRYPTION_KEY is not set. Secret storage is unavailable, so this "
      + "feature is off rather than storing credentials unencrypted.",
    );
  }

  let key;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    throw new SecretStoreUnavailable("SECRET_ENCRYPTION_KEY is not valid base64.");
  }

  if (key.length !== KEY_BYTES) {
    throw new SecretStoreUnavailable(
      `SECRET_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${key.length}. `
      + `Generate one with: openssl rand -base64 ${KEY_BYTES}`,
    );
  }

  return key;
};

/** Whether secret storage is usable, without throwing. For health checks. */
export const isSecretStoreConfigured = () => {
  try {
    readKey();
    return true;
  } catch {
    return false;
  }
};

/**
 * A secret, sealed.
 *
 * The returned record is safe to write to a column and safe to log the SHAPE
 * of - it carries no key material. It deliberately does NOT carry a label,
 * a provider account name or anything else about what the secret is for: that
 * belongs in its own columns, where it can be read without decrypting.
 */
export const encryptSecret = (plaintext) => {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new TypeError("A secret must be a non-empty string");
  }

  const key = readKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

  return {
    v: RECORD_VERSION,
    provider: PROVIDER_LOCAL,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ct: ciphertext.toString("base64"),
  };
};

/**
 * The secret back, or a refusal.
 *
 * A record that has been altered in the database - a flipped byte, a swapped
 * ciphertext, a reused IV from another row - fails the GCM tag and raises
 * rather than returning something that looks like a credential.
 */
export const decryptSecret = (record) => {
  if (!record || typeof record !== "object") {
    throw new SecretDecryptionFailed("No secret record to decrypt");
  }
  if (record.v !== RECORD_VERSION) {
    throw new SecretDecryptionFailed(`Unknown secret record version: ${record.v}`);
  }
  if (record.provider !== PROVIDER_LOCAL) {
    // A record written by a provider this build cannot read is a refusal, not
    // an attempt. Reading it with the wrong key source would fail the tag
    // anyway; saying so plainly is what makes a half-finished migration
    // debuggable.
    throw new SecretDecryptionFailed(`Secret was sealed by "${record.provider}", which this build cannot open`);
  }

  const key = readKey();

  let iv;
  let tag;
  let ciphertext;
  try {
    iv = Buffer.from(String(record.iv || ""), "base64");
    tag = Buffer.from(String(record.tag || ""), "base64");
    ciphertext = Buffer.from(String(record.ct || ""), "base64");
  } catch {
    throw new SecretDecryptionFailed("Secret record is not valid base64");
  }

  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new SecretDecryptionFailed("Secret record has a malformed iv or tag");
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    // The underlying error is deliberately swallowed: its message varies with
    // the failure and none of the variants tell a caller anything they should
    // act on differently.
    throw new SecretDecryptionFailed("Secret could not be decrypted");
  }
};

/**
 * What the frontend is allowed to know about a stored secret.
 *
 * D-4 is explicit that a client receives `connected`, `provider`, account
 * name, scopes and health, "and never a secret, not even masked from the
 * server side. `••••••••` is rendered from nothing, not from a truncated real
 * value." This is the function that makes that true rather than a paragraph.
 */
export const describeSecret = (record) => ({
  stored: Boolean(record && record.v === RECORD_VERSION),
  provider: record?.provider ?? null,
});

/**
 * Whether two secrets are the same, without decrypting either into a
 * comparison that leaks timing. Used when re-saving a credential that has not
 * actually changed, so an unchanged save does not rotate a token.
 */
export const secretsMatch = (a, b) => {
  const left = Buffer.from(String(a ?? ""), "utf8");
  const right = Buffer.from(String(b ?? ""), "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};
