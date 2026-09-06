/**
 * One place that knows how a stored shipping address turns into text.
 *
 * There were two copies of this, and they disagreed: the order-share message
 * read `address`, the warehouse label read `street`. The server has only ever
 * written `address` (see normalizeShippingAddress in server/src/index.js), so
 * every label printed for the warehouse came out with no street on it.
 */
export interface ShippingAddressFields {
  fullName?: string | null;
  phone?: string | null;
  phoneSecondary?: string | null;
  /** What the server actually stores. */
  address?: string | null;
  /** Older records and third-party payloads used this name. */
  street?: string | null;
  building?: string | null;
  floor?: string | null;
  apartment?: string | null;
  /** Required for a building: a courier who cannot pass the lobby cannot deliver. */
  lobbyCode?: string | null;
  entranceType?: "building" | "house" | string | null;
  city?: string | null;
  zipCode?: string | null;
  notes?: string | null;
  leaveAtDoor?: boolean | null;
}

type AddressInput = ShippingAddressFields | string | null | undefined;

export const ADDRESS_UNAVAILABLE = "כתובת לא זמינה";

const trimmed = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : "";

/** The street line, including the parts a courier needs to find the door. */
export const formatStreetLine = (address: ShippingAddressFields): string => {
  const street = trimmed(address.address) || trimmed(address.street);
  const building = trimmed(address.building);
  const floor = trimmed(address.floor);
  const apartment = trimmed(address.apartment);

  return [
    // The building number belongs on the street itself, not as its own clause.
    [street, building].filter(Boolean).join(" "),
    floor ? `קומה ${floor}` : "",
    apartment ? `דירה ${apartment}` : "",
  ].filter(Boolean).join(", ");
};

export const formatLocalityLine = (address: ShippingAddressFields): string => {
  const city = trimmed(address.city);
  const zipCode = trimmed(address.zipCode);
  return [city, zipCode ? `מיקוד ${zipCode}` : ""].filter(Boolean).join(", ");
};

/**
 * The full address on one line. Returns null when there is nothing to show, so
 * callers can decide between hiding the field and printing a placeholder.
 */
export const formatShippingAddress = (address: AddressInput): string | null => {
  if (!address) return null;
  if (typeof address === "string") return address.trim() || null;

  const lines = [formatStreetLine(address), formatLocalityLine(address)].filter(Boolean);
  return lines.length > 0 ? lines.join(", ") : null;
};

/**
 * The same address for print, where an empty field would leave a silent blank
 * on a label a warehouse is meant to act on.
 */
export const formatShippingAddressForLabel = (address: AddressInput): string =>
  formatShippingAddress(address) || ADDRESS_UNAVAILABLE;
