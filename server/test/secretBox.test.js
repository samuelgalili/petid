import assert from "node:assert/strict";
import test from "node:test";
import {
  createSecretBox,
  createSecretBoxFromEnv,
  generateSecretKeyMaterial,
  parseSecretKey,
  parseSecretKeyList,
  SecretBoxError,
} from "../src/secretBox.js";

const keyOf = (id) => parseSecretKey(`${id}:${generateSecretKeyMaterial()}`);
const box = () => createSecretBox({ activeKey: keyOf("k1") });

test("a sealed secret round-trips under the same context", () => {
  const secretBox = box();
  const envelope = secretBox.seal("GEZDGNBVGY3TQOJQ", "admin_totp:abc");

  assert.notEqual(envelope, "GEZDGNBVGY3TQOJQ");
  assert.match(envelope, /^v1\.k1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.equal(secretBox.open(envelope, "admin_totp:abc"), "GEZDGNBVGY3TQOJQ");
});

test("the same plaintext seals to a different envelope every time", () => {
  const secretBox = box();
  const envelopes = new Set(
    Array.from({ length: 20 }, () => secretBox.seal("same-secret", "ctx")),
  );
  assert.equal(envelopes.size, 20, "a repeated nonce would leak equality between rows");
});

test("an envelope cannot be opened under a different context", () => {
  const secretBox = box();
  const envelope = secretBox.seal("seed", "admin_totp:admin-one");

  assert.throws(
    () => secretBox.open(envelope, "admin_totp:admin-two"),
    (error) => error instanceof SecretBoxError && error.code === "authentication_failed",
    "a secret lifted into another admin's row must not decrypt",
  );
});

test("tampering with any part of the envelope fails authentication", () => {
  const secretBox = box();
  const envelope = secretBox.seal("seed-value", "ctx");
  const parts = envelope.split(".");

  for (const index of [2, 3, 4]) {
    const mutated = [...parts];
    const original = mutated[index];
    // Flip the first character to something else in the base64url alphabet.
    mutated[index] = (original[0] === "A" ? "B" : "A") + original.slice(1);
    assert.throws(
      () => secretBox.open(mutated.join("."), "ctx"),
      SecretBoxError,
      `tampering with part ${index} must be detected`,
    );
  }
});

test("malformed envelopes are rejected rather than throwing raw crypto errors", () => {
  const secretBox = box();
  const malformed = ["", null, undefined, "v1", "v1.k1.a.b", "v2.k1.a.b.c", "not-an-envelope"];

  for (const envelope of malformed) {
    assert.throws(() => secretBox.open(envelope, "ctx"), SecretBoxError);
  }
});

test("a retired key still opens its envelopes while new writes use the active key", () => {
  const retired = keyOf("k1");
  const active = keyOf("k2");

  const oldBox = createSecretBox({ activeKey: retired });
  const envelope = oldBox.seal("legacy-secret", "ctx");

  const rotatedBox = createSecretBox({ activeKey: active, retiredKeys: [retired] });
  assert.equal(rotatedBox.open(envelope, "ctx"), "legacy-secret");
  assert.equal(rotatedBox.needsRotation(envelope), true);
  assert.equal(rotatedBox.needsRotation(rotatedBox.seal("fresh", "ctx")), false);

  // Dropping the retired key from the ring makes its envelopes unreadable,
  // which is what makes key destruction a real revocation.
  const strictBox = createSecretBox({ activeKey: active });
  assert.throws(
    () => strictBox.open(envelope, "ctx"),
    (error) => error.code === "unknown_key_id",
  );
});

test("an empty context is refused on both seal and open", () => {
  const secretBox = box();
  assert.throws(() => secretBox.seal("x", ""), (error) => error.code === "missing_context");
  assert.throws(() => secretBox.seal("x", null), (error) => error.code === "missing_context");
  assert.throws(() => secretBox.open("v1.k1.a.b.c", "  "), (error) => error.code === "missing_context");
});

test("key parsing enforces a 256-bit key and a usable key id", () => {
  const material = generateSecretKeyMaterial();

  assert.equal(parseSecretKey(material).id, "k1", "a bare key defaults to key id k1");
  assert.equal(parseSecretKey(`prod-2026:${material}`).id, "prod-2026");
  assert.equal(parseSecretKey(material).key.length, 32);

  assert.throws(() => parseSecretKey(""), (error) => error.code === "missing_key");
  assert.throws(
    () => parseSecretKey(Buffer.alloc(16).toString("base64")),
    (error) => error.code === "invalid_key_length",
    "a 128-bit key must not be silently accepted",
  );
  assert.throws(() => parseSecretKey(`bad id:${material}`), (error) => error.code === "invalid_key_id");
});

test("retired keys parse from a comma separated list", () => {
  const first = generateSecretKeyMaterial();
  const second = generateSecretKeyMaterial();

  assert.deepEqual(parseSecretKeyList("").length, 0);
  assert.deepEqual(
    parseSecretKeyList(` k1:${first}, k2:${second} `).map((entry) => entry.id),
    ["k1", "k2"],
  );
});

test("the env factory wires the active and retired keys together", () => {
  const retiredMaterial = generateSecretKeyMaterial();
  const oldBox = createSecretBox({ activeKey: parseSecretKey(`old:${retiredMaterial}`) });
  const envelope = oldBox.seal("carried-over", "ctx");

  const secretBox = createSecretBoxFromEnv({
    SECRET_ENCRYPTION_KEY: `new:${generateSecretKeyMaterial()}`,
    SECRET_ENCRYPTION_KEYS_RETIRED: `old:${retiredMaterial}`,
  });

  assert.equal(secretBox.activeKeyId, "new");
  assert.equal(secretBox.open(envelope, "ctx"), "carried-over");
  assert.deepEqual(secretBox.knownKeyIds.sort(), ["new", "old"]);
});
