import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Envelope encryption for secrets that have to live in the database in a
// recoverable form (TOTP seeds today, connector API keys next). AES-256-GCM
// gives confidentiality and integrity in one pass; the context string is bound
// as additional authenticated data, so a ciphertext lifted out of one row
// cannot be pasted into another.
const ENVELOPE_VERSION = "v1";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/i;

export class SecretBoxError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "SecretBoxError";
    this.code = code;
  }
}

const decodeKeyMaterial = (value, label) => {
  const decoded = Buffer.from(String(value), "base64");
  if (decoded.length !== KEY_BYTES) {
    throw new SecretBoxError(
      `${label} must be ${KEY_BYTES} bytes of base64-encoded key material`,
      "invalid_key_length",
    );
  }
  return decoded;
};

/** Parses `<keyId>:<base64key>`; a bare base64 key is accepted as key id "k1". */
export const parseSecretKey = (value, label = "Secret encryption key") => {
  const raw = String(value || "").trim();
  if (!raw) throw new SecretBoxError(`${label} is not configured`, "missing_key");

  const separatorIndex = raw.indexOf(":");
  if (separatorIndex < 0) {
    return { id: "k1", key: decodeKeyMaterial(raw, label) };
  }

  const id = raw.slice(0, separatorIndex).trim();
  if (!KEY_ID_PATTERN.test(id)) {
    throw new SecretBoxError(`${label} has an invalid key id`, "invalid_key_id");
  }
  return { id, key: decodeKeyMaterial(raw.slice(separatorIndex + 1).trim(), label) };
};

export const parseSecretKeyList = (value, label = "Retired secret encryption keys") => {
  const raw = String(value || "").trim();
  if (!raw) return [];
  return raw.split(",").map((entry) => entry.trim()).filter(Boolean)
    .map((entry) => parseSecretKey(entry, label));
};

export const generateSecretKeyMaterial = () => randomBytes(KEY_BYTES).toString("base64");

const requireContext = (context) => {
  const value = String(context || "").trim();
  if (!value) {
    throw new SecretBoxError("An encryption context is required", "missing_context");
  }
  return value;
};

export const createSecretBox = ({ activeKey, retiredKeys = [] }) => {
  if (!activeKey?.key) throw new SecretBoxError("An active key is required", "missing_key");

  const keyring = new Map();
  for (const entry of [activeKey, ...retiredKeys]) {
    if (!keyring.has(entry.id)) keyring.set(entry.id, entry.key);
  }

  const seal = (plaintext, context) => {
    const aad = Buffer.from(requireContext(context), "utf8");
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv("aes-256-gcm", activeKey.key, iv, { authTagLength: TAG_BYTES });
    cipher.setAAD(aad);
    const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [
      ENVELOPE_VERSION,
      activeKey.id,
      iv.toString("base64url"),
      ciphertext.toString("base64url"),
      tag.toString("base64url"),
    ].join(".");
  };

  const open = (envelope, context) => {
    const aad = Buffer.from(requireContext(context), "utf8");
    const parts = String(envelope || "").split(".");
    if (parts.length !== 5 || parts[0] !== ENVELOPE_VERSION) {
      throw new SecretBoxError("Malformed secret envelope", "malformed_envelope");
    }

    const [, keyId, encodedIv, encodedCiphertext, encodedTag] = parts;
    const key = keyring.get(keyId);
    if (!key) {
      throw new SecretBoxError(`No key available for envelope key id ${keyId}`, "unknown_key_id");
    }

    const iv = Buffer.from(encodedIv, "base64url");
    const tag = Buffer.from(encodedTag, "base64url");
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
      throw new SecretBoxError("Malformed secret envelope", "malformed_envelope");
    }

    try {
      const decipher = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: TAG_BYTES });
      decipher.setAAD(aad);
      decipher.setAuthTag(tag);
      return Buffer.concat([
        decipher.update(Buffer.from(encodedCiphertext, "base64url")),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      // A wrong context, a tampered ciphertext and a retired key all land here;
      // none of them may be told apart by the caller.
      throw new SecretBoxError("Secret envelope failed authentication", "authentication_failed");
    }
  };

  return {
    activeKeyId: activeKey.id,
    knownKeyIds: [...keyring.keys()],
    seal,
    open,
    /** True when the envelope was sealed by a key that is no longer active. */
    needsRotation: (envelope) => {
      const parts = String(envelope || "").split(".");
      return parts.length === 5 && parts[0] === ENVELOPE_VERSION && parts[1] !== activeKey.id;
    },
  };
};

export const createSecretBoxFromEnv = (env = process.env) => createSecretBox({
  activeKey: parseSecretKey(env.SECRET_ENCRYPTION_KEY, "SECRET_ENCRYPTION_KEY"),
  retiredKeys: parseSecretKeyList(env.SECRET_ENCRYPTION_KEYS_RETIRED, "SECRET_ENCRYPTION_KEYS_RETIRED"),
});

let cachedSecretBox = null;

/**
 * Resolves the process-wide secret box, or null when the key is not configured.
 * Callers decide whether that is fatal, so an unconfigured deployment fails at
 * the routes that need secrets rather than at boot.
 */
export const getSecretBox = () => {
  if (cachedSecretBox !== null) return cachedSecretBox || null;
  try {
    cachedSecretBox = createSecretBoxFromEnv();
  } catch (error) {
    if (error instanceof SecretBoxError && error.code === "missing_key") {
      cachedSecretBox = false;
      return null;
    }
    throw error;
  }
  return cachedSecretBox;
};
