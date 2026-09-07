/**
 * The shipping address a customer submits at checkout, and the rules it has to
 * satisfy before an order is written.
 *
 * Its own module so the rules can be tested directly: importing the server
 * entry point opens a database pool, and a validation rule nobody can exercise
 * in a test is a rule that quietly rots.
 */
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

export const LEAVE_AT_DOOR_TERMS =
  "אם אין מענה בכתובת, המשלוח יושאר ליד הדלת. מרגע ההשארה האחריות על החבילה היא של הלקוח בלבד.";

const boundedText = (value, max) => String(value ?? "").trim().slice(0, max);

// The keys the extended delivery form introduced. A payload carrying none of
// them was written by a page that predates it.
const EXTENDED_ADDRESS_KEYS = [
  "building", "entranceType", "entrance_type", "floor", "apartment",
  "lobbyCode", "lobby_code", "leaveAtDoor", "leave_at_door",
];

export const normalizeShippingAddress = (shippingAddress) => {
  const address = shippingAddress && typeof shippingAddress === "object" ? shippingAddress : {};
  const entranceType = (address.entranceType || address.entrance_type) === "building"
    ? "building"
    : "house";
  const leaveAtDoor = address.leaveAtDoor === true || address.leave_at_door === true;

  // A browser that loaded the checkout before this release posts the old six
  // fields: no building, no entrance type, no door acknowledgement. Refusing
  // it would fail checkout for every customer already mid-purchase until they
  // reloaded, so it is accepted under the rules it was written for — with the
  // house number where it has always been, inside `address`.
  //
  // Sending even one of the new keys means the current form, which is held to
  // all of the new rules.
  const isLegacyForm = EXTENDED_ADDRESS_KEYS.every((key) => address[key] === undefined);

  const normalized = {
    fullName: String(address.fullName || address.full_name || "").trim(),
    email: normalizeEmail(address.email),
    phone: String(address.phone || "").trim(),
    phoneSecondary: String(address.phoneSecondary || address.phone_secondary || "").trim(),
    // Still `address`: every order written so far uses that key in its jsonb and
    // the admin screens read it.
    address: String(address.address || address.street || "").trim(),
    building: boundedText(address.building, 20),
    floor: boundedText(address.floor, 10),
    apartment: boundedText(address.apartment, 20),
    lobbyCode: boundedText(address.lobbyCode ?? address.lobby_code, 30),
    entranceType,
    city: String(address.city || "").trim(),
    zipCode: String(address.zipCode || address.zip_code || address.postal_code || "").trim(),
    notes: boundedText(address.notes, 500),
    leaveAtDoor,
    leaveAtDoorTerms: leaveAtDoor ? LEAVE_AT_DOOR_TERMS : null,
    leaveAtDoorAt: leaveAtDoor ? new Date().toISOString() : null,
  };

  const isValid = normalized.fullName.length >= 2
    && normalized.fullName.length <= 100
    && normalized.email.length <= 255
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)
    && /^[0-9]{9,15}$/.test(normalized.phone)
    && (normalized.phoneSecondary === "" || /^[0-9]{9,15}$/.test(normalized.phoneSecondary))
    && normalized.address.length >= 2
    && normalized.address.length <= 200
    && (isLegacyForm || normalized.building.length >= 1)
    && normalized.city.length >= 2
    && normalized.city.length <= 50
    && /^[0-9]{5,7}$/.test(normalized.zipCode)
    // A courier who cannot get through the lobby door cannot deliver, so for a
    // building the code carries as much weight as the street name.
    && (entranceType === "house" || (normalized.apartment !== "" && normalized.lobbyCode !== ""))
    // The acknowledgement is worth nothing unless the customer actually made
    // it. An old page never offered it, and its absence is the safe answer:
    // the label shows no leave-at-door flag, so nothing is left at a door.
    && (isLegacyForm || leaveAtDoor === true);

  if (!isValid) {
    const error = new Error("Invalid shipping details");
    error.statusCode = 400;
    throw error;
  }

  return normalized;
};
