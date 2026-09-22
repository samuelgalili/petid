// The address a manual order sends, checked against the code that refuses it.
//
// THIS FILE EXISTS BECAUSE THE FIRST VERSION SHIPPED BROKEN. The manual order
// screen sent a name, an email and a phone as its shipping_address. That is
// not an address: normalizeShippingAddress refuses a payload with no street,
// no city and no postcode, and throws 400 before the order code is reached. So
// not one order that screen submitted could have been accepted, in production,
// from the moment it was merged.
//
// The e2e covering it mocked /api/admin/os/orders, so the request never met
// the validation, and every test passed. A test that stands in for the thing
// it is testing proves that the caller is consistent with the mock.
//
// So the guard here runs the REAL validator over the REAL field list, and it
// derives that list from the screen rather than restating it - a field renamed
// in the form is caught on that commit rather than by an admin on the phone.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { normalizeShippingAddress } from "../src/shippingAddress.js";

const dialogSource = () => readFileSync(
  new URL("../../src/components/admin/NewOrderDialog.tsx", import.meta.url),
  "utf8",
);

/** The keys the form holds, read out of EMPTY_ADDRESS in the dialog. */
const formFields = () => {
  const source = dialogSource();
  const start = source.indexOf("const EMPTY_ADDRESS");
  assert.ok(start > 0, "the address form's field list was not found");
  const block = source.slice(start, source.indexOf("};", start));
  const keys = [...block.matchAll(/(\w+):/g)].map((match) => match[1]);
  assert.ok(keys.length > 5, "no fields were parsed out of the address form");
  return keys;
};

/** A filled-in version of whatever the form holds. */
const filled = (overrides = {}) => ({
  fullName: "דנה כהן",
  email: "dana@example.com",
  phone: "0501234567",
  address: "הרצל",
  building: "12",
  entranceType: "house",
  floor: "",
  apartment: "",
  lobbyCode: "",
  city: "תל אביב",
  zipCode: "6100000",
  notes: "לתאם טלפונית",
  leaveAtDoor: true,
  ...overrides,
});

test("the form's own fields are enough to place an order", () => {
  // THE TEST THAT WAS MISSING. Everything the screen collects, run through the
  // code that decides whether an order may be written.
  const accepted = normalizeShippingAddress(filled());
  assert.equal(accepted.city, "תל אביב");
  assert.equal(accepted.address, "הרצל");
});

test("the screen collects every field the server requires", () => {
  // Derived from the form rather than listed here. A required field dropped
  // from the form fails on the commit that drops it.
  const fields = new Set(formFields());
  for (const required of ["fullName", "email", "phone", "address", "building", "city", "zipCode", "leaveAtDoor"]) {
    assert.ok(fields.has(required), `the address form no longer collects ${required}`);
  }
});

test("what the screen used to send is refused", () => {
  // The exact payload that shipped. Kept as a test so the shape cannot come
  // back: it looks like an address and is not one.
  assert.throws(
    () => normalizeShippingAddress({
      fullName: "דנה כהן", email: "dana@example.com", phone: "0501234567",
    }),
    (error) => error.statusCode === 400,
  );
});

test("each required field is required", () => {
  // One at a time, so a form that quietly stops collecting any of them is
  // caught by the field it stopped collecting rather than by a vague failure.
  const missing = {
    fullName: "", email: "", phone: "", address: "", city: "", zipCode: "", building: "",
  };

  for (const [field, empty] of Object.entries(missing)) {
    assert.throws(
      () => normalizeShippingAddress(filled({ [field]: empty })),
      (error) => error.statusCode === 400,
      `an order was accepted with no ${field}`,
    );
  }
});

test("a phone typed the way people write it is refused, so the form must strip it", () => {
  // /^[0-9]{9,15}$/. "050-123-4567" is how a person writes a phone number and
  // how a customer record often stores one, and it does NOT pass - which is
  // why the dialog runs digitsOnly over it before sending.
  assert.throws(() => normalizeShippingAddress(filled({ phone: "050-123-4567" })));
  assert.ok(dialogSource().includes("phone: digitsOnly(address.phone)"),
    "the dialog no longer strips the phone before sending");
});

test("a building needs an apartment and a lobby code", () => {
  // A courier who cannot get through the lobby door cannot deliver.
  assert.throws(() => normalizeShippingAddress(filled({
    entranceType: "building", apartment: "", lobbyCode: "9999",
  })));
  assert.throws(() => normalizeShippingAddress(filled({
    entranceType: "building", apartment: "4", lobbyCode: "",
  })));

  const accepted = normalizeShippingAddress(filled({
    entranceType: "building", floor: "3", apartment: "4", lobbyCode: "9999",
  }));
  assert.equal(accepted.entranceType, "building");
  assert.equal(accepted.lobbyCode, "9999");
});

test("the delivery note travels with the address and is bounded", () => {
  // The note rides here rather than in special_instructions because this is
  // what the warehouse and the courier read, and the field already exists.
  const accepted = normalizeShippingAddress(filled({ notes: "להשאיר אצל השכן בדירה 4" }));
  assert.equal(accepted.notes, "להשאיר אצל השכן בדירה 4");

  const long = normalizeShippingAddress(filled({ notes: "x".repeat(900) }));
  assert.equal(long.notes.length, 500);
});

test("the leave-at-door acknowledgement is recorded, not assumed", () => {
  // It is a commitment by the customer, so the order records that it was made
  // and when. An admin taking it over the phone is relaying it, which is why
  // the checkbox on the screen is worded as the customer having confirmed.
  const accepted = normalizeShippingAddress(filled({ leaveAtDoor: true }));
  assert.equal(accepted.leaveAtDoor, true);
  assert.ok(accepted.leaveAtDoorTerms, "the terms were not attached to the order");
  assert.ok(accepted.leaveAtDoorAt, "the acknowledgement was not dated");
});
