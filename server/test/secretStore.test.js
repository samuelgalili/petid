// Secret storage, and the four ways it could be worse than nothing.
//
// This is D-4, which was a §65 STOP: `SECRET_ENCRYPTION_KEY` appeared in five
// documents and zero server files, so admin 2FA, the insurance ID column and
// every connector were all waiting on the same missing thing.
//
// The dangerous outcomes are not "it does not work". They are:
//
//   storing a secret when there is no key        -> must throw, never store
//   returning something on a tampered record     -> must throw, never guess
//   putting the plaintext in the record          -> the whole point
//   handing a client a masked real value         -> D-4 forbids it by name

import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";

import {
  PROVIDER_LOCAL,
  SecretDecryptionFailed,
  SecretStoreUnavailable,
  decryptSecret,
  describeSecret,
  encryptSecret,
  isSecretStoreConfigured,
  secretsMatch,
} from "../src/secretStore.js";

const KEY = randomBytes(32).toString("base64");
const OTHER_KEY = randomBytes(32).toString("base64");

const withKey = (key, fn) => {
  const previous = process.env.SECRET_ENCRYPTION_KEY;
  if (key === null) delete process.env.SECRET_ENCRYPTION_KEY;
  else process.env.SECRET_ENCRYPTION_KEY = key;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.SECRET_ENCRYPTION_KEY;
    else process.env.SECRET_ENCRYPTION_KEY = previous;
  }
};

// ─── the happy path ──────────────────────────────────────────────────────────

test("a secret comes back exactly as it went in", () => {
  withKey(KEY, () => {
    const secret = "ya29.a0AfB_refresh-token-שלום-🔑";
    assert.equal(decryptSecret(encryptSecret(secret)), secret);
  });
});

test("the same secret sealed twice produces different ciphertext", () => {
  // A fresh IV per record. Without it, two connectors holding the same token
  // are visibly the same row to anyone reading the table.
  withKey(KEY, () => {
    const a = encryptSecret("same-token");
    const b = encryptSecret("same-token");
    assert.notEqual(a.ct, b.ct);
    assert.notEqual(a.iv, b.iv);
  });
});

// ─── refusing, which is the feature ──────────────────────────────────────────

test("with no key configured, storing a secret throws instead of storing it", () => {
  // THE LOAD-BEARING ONE. The tempting failure is to warn and write the
  // plaintext "for now", and "for now" is how a credentials table ends up in
  // the clear behind a log line nobody read.
  withKey(null, () => {
    assert.equal(isSecretStoreConfigured(), false);
    assert.throws(() => encryptSecret("token"), SecretStoreUnavailable);
    assert.throws(() => decryptSecret({ v: 1, provider: PROVIDER_LOCAL, iv: "", tag: "", ct: "" }), SecretStoreUnavailable);
  });
});

test("a key of the wrong length is refused, and the message says how to make one", () => {
  withKey(Buffer.from("too-short").toString("base64"), () => {
    assert.equal(isSecretStoreConfigured(), false);
    assert.throws(() => encryptSecret("token"), /must decode to 32 bytes/);
  });
});

test("a tampered record fails rather than decoding to something", () => {
  // AES-GCM is authenticated, and this is why that matters: a flipped byte in
  // a database row must not produce a string that looks like a credential.
  const record = withKey(KEY, () => encryptSecret("real-token"));

  const flipped = Buffer.from(record.ct, "base64");
  flipped[0] ^= 0xff;

  withKey(KEY, () => {
    assert.throws(
      () => decryptSecret({ ...record, ct: flipped.toString("base64") }),
      SecretDecryptionFailed,
    );
  });
});

test("a record from another row cannot be opened by swapping its ciphertext in", () => {
  const [a, b] = withKey(KEY, () => [encryptSecret("token-a"), encryptSecret("token-b")]);
  withKey(KEY, () => {
    assert.throws(() => decryptSecret({ ...a, ct: b.ct }), SecretDecryptionFailed);
  });
});

test("the wrong key does not decrypt", () => {
  const record = withKey(KEY, () => encryptSecret("real-token"));
  withKey(OTHER_KEY, () => {
    assert.throws(() => decryptSecret(record), SecretDecryptionFailed);
  });
});

test("a record sealed by a provider this build cannot open says so", () => {
  // The upgrade path to KMS runs through here. A record whose provider this
  // build does not implement is a named refusal rather than a tag failure,
  // because a half-finished migration has to be debuggable.
  const record = withKey(KEY, () => encryptSecret("token"));
  withKey(KEY, () => {
    assert.throws(
      () => decryptSecret({ ...record, provider: "kms" }),
      /sealed by "kms"/,
    );
  });
});

// ─── what the record may and may not contain ─────────────────────────────────

test("the stored record contains no trace of the secret", () => {
  withKey(KEY, () => {
    const secret = "sk-live-0123456789abcdef";
    const serialised = JSON.stringify(encryptSecret(secret));

    assert.ok(!serialised.includes(secret), "the plaintext is in the record");
    // Not a prefix either. A "masked" first eight characters is how a token
    // ends up identifiable in a backup.
    assert.ok(!serialised.includes(secret.slice(0, 8)), "a prefix of the plaintext is in the record");
  });
});

test("the stored record contains no key material", () => {
  withKey(KEY, () => {
    const serialised = JSON.stringify(encryptSecret("token"));
    assert.ok(!serialised.includes(KEY), "the encryption key is in the record");
  });
});

test("what a client may be told does not include the secret, masked or otherwise", () => {
  // D-4, by name: the frontend receives connected/provider/health "and never a
  // secret, not even masked from the server side. `••••••••` is rendered from
  // nothing, not from a truncated real value."
  withKey(KEY, () => {
    const described = describeSecret(encryptSecret("sk-live-0123456789abcdef"));
    assert.deepEqual(Object.keys(described).sort(), ["provider", "stored"]);
    assert.equal(described.stored, true);
    assert.equal(described.provider, PROVIDER_LOCAL);
  });
});

test("an absent secret describes as not stored rather than throwing", () => {
  assert.deepEqual(describeSecret(null), { stored: false, provider: null });
});

// ─── comparing without leaking ───────────────────────────────────────────────

test("an unchanged secret compares equal, a changed one does not", () => {
  assert.equal(secretsMatch("token", "token"), true);
  assert.equal(secretsMatch("token", "token "), false);
  assert.equal(secretsMatch("token", "other"), false);
  assert.equal(secretsMatch(null, undefined), true);
});
