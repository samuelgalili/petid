import assert from "node:assert/strict";
import test from "node:test";
import { normalizeShippingAddress } from "../src/shippingAddress.js";

// Exactly what a checkout page loaded before the extended form posts.
const legacyAddress = {
  fullName: "דנה כהן",
  email: "dana@example.com",
  phone: "0501234567",
  address: "יגאל אלון 114",
  city: "תל אביב",
  zipCode: "6688218",
};

const currentAddress = {
  ...legacyAddress,
  address: "יגאל אלון",
  building: "114",
  floor: "4",
  apartment: "12",
  lobbyCode: "1234#",
  entranceType: "building",
  leaveAtDoor: true,
};

test("an address from a page loaded before the deploy is still accepted", () => {
  const normalized = normalizeShippingAddress(legacyAddress);

  assert.equal(normalized.address, "יגאל אלון 114", "the house number stays where it has always been");
  assert.equal(normalized.building, "");
  assert.equal(normalized.city, "תל אביב");
  assert.equal(normalized.zipCode, "6688218");
  assert.equal(normalized.leaveAtDoor, false, "an old page never offered the acknowledgement");
  assert.equal(normalized.leaveAtDoorTerms, null, "so no consent is recorded that was never given");
});

test("the current form is still held to every new rule", () => {
  assert.doesNotThrow(() => normalizeShippingAddress(currentAddress));

  // Each of these sends at least one new key, so none is treated as legacy.
  const rejected = [
    ["building missing", { ...currentAddress, building: "" }],
    ["a building with no lobby code", { ...currentAddress, lobbyCode: "" }],
    ["a building with no apartment", { ...currentAddress, apartment: "" }],
    ["the door acknowledgement withheld", { ...currentAddress, leaveAtDoor: false }],
  ];

  for (const [name, address] of rejected) {
    assert.throws(() => normalizeShippingAddress(address), /Invalid shipping details/, name);
  }
});

test("one new key is enough to be held to the new rules", () => {
  // The compatibility path must not become a way to opt out of them: a page
  // that knows about the new fields cannot claim to be an old one.
  assert.throws(
    () => normalizeShippingAddress({ ...legacyAddress, leaveAtDoor: false }),
    /Invalid shipping details/,
    "declaring leaveAtDoor: false is the current form refusing consent, not an old page",
  );
  assert.throws(
    () => normalizeShippingAddress({ ...legacyAddress, entranceType: "building" }),
    /Invalid shipping details/,
    "declaring a building brings the lobby code requirement with it",
  );
  assert.throws(
    () => normalizeShippingAddress({ ...legacyAddress, floor: "4" }),
    /Invalid shipping details/,
    "any extended field means the extended form",
  );
});

test("the rules that protect a delivery apply to both forms", () => {
  const brokenForBoth = [
    ["no name", { fullName: "" }],
    ["a one-letter name", { fullName: "ד" }],
    ["no email", { email: "" }],
    ["a malformed email", { email: "not-an-email" }],
    ["no phone", { phone: "" }],
    ["a phone that is too short", { phone: "12345" }],
    ["a phone with letters", { phone: "05012345ab" }],
    ["no street", { address: "" }],
    ["no city", { city: "" }],
    ["no postcode", { zipCode: "" }],
    ["a malformed postcode", { zipCode: "12" }],
  ];

  for (const [name, override] of brokenForBoth) {
    assert.throws(
      () => normalizeShippingAddress({ ...legacyAddress, ...override }),
      /Invalid shipping details/,
      `legacy: ${name}`,
    );
    assert.throws(
      () => normalizeShippingAddress({ ...currentAddress, ...override }),
      /Invalid shipping details/,
      `current: ${name}`,
    );
  }
});

test("a legacy house address still records what the label needs", () => {
  const normalized = normalizeShippingAddress(legacyAddress);
  assert.equal(normalized.fullName, "דנה כהן");
  assert.equal(normalized.phone, "0501234567");
  assert.equal(normalized.phoneSecondary, "");
  assert.equal(normalized.entranceType, "house");
  assert.equal(normalized.apartment, "");
  assert.equal(normalized.lobbyCode, "");
});

test("a legacy address with a secondary phone is still validated", () => {
  assert.doesNotThrow(() => normalizeShippingAddress({ ...legacyAddress, phoneSecondary: "0521112233" }));
  assert.throws(
    () => normalizeShippingAddress({ ...legacyAddress, phoneSecondary: "abc" }),
    /Invalid shipping details/,
  );
});
