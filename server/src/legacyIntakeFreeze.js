// G-1 · Legacy intake freeze.
//
// A scraped-backed listing is created without anyone deciding who sells it, and
// the ownership fallback in createProduct assigns an owner without recording
// that it did so. That is why ownership on the rows already in the catalogue
// cannot be reconstructed: a fallback row and a deliberate one are identical.
//
// This freeze stops that population from growing while the ownership review
// runs. It refuses one thing - the creation of a new scraped-backed listing -
// and nothing else. It touches no existing row, hides nothing from any read,
// changes no price, and leaves checkout, carts, orders and analytics alone.

// What makes a creation scraped-backed is the provenance the payload carries,
// not which screen sent it. Every scraped path writes source_url - the product
// form, the import wizard, bulk URL import, quick import, and a duplicate of
// any of them, which carries the original's source_url forward through a spread.
// The spreadsheet importer writes none, because its parser has no column for one.
//
// This reads source_url as a statement about where the CONTENT came from, which
// is what the column is. It is never read as a statement about who OWNS the row.
// That inference is the one PD-39 forbids, and nothing here makes it: the guard
// returns a boolean about provenance and never looks at, derives, or writes an
// owner.
export const isScrapedBackedIntake = (body) => Boolean(String(body?.source_url ?? "").trim());

// Frozen unless the flag is set to the exact string "false". A missing,
// misspelled or empty variable therefore leaves the freeze ON, which is the
// safe direction for a guard whose whole purpose is to stop writes.
export const isLegacyIntakeFrozen = () => process.env.LEGACY_INTAKE_FROZEN !== "false";

// The host, never the path or the query: enough to see which supplier is still
// being imported, nothing that carries product content, a token or a credential.
export const sourceHostForLog = (value) => {
  try {
    return new URL(String(value)).hostname || null;
  } catch {
    return null;
  }
};

export class LegacyIntakeFrozenError extends Error {
  constructor() {
    super("Legacy scraped-product intake is temporarily frozen. Use the reviewed Product Intake workflow.");
    this.name = "LegacyIntakeFrozenError";
    // 409 rather than 403: the caller is authorised, the system's current state
    // refuses. Retrying the same request will not help until the freeze lifts.
    this.statusCode = 409;
    this.code = "LEGACY_INTAKE_FROZEN";
  }
}

/**
 * Throws when `body` would create a scraped-backed listing while the freeze is on.
 * Returns undefined - and touches nothing - in every other case.
 *
 * `frozen` and `warn` are injectable so the guard can be tested without setting
 * process.env or capturing console; both default to the real behaviour.
 */
export const assertLegacyIntakeAllowed = (body, route, {
  frozen = isLegacyIntakeFrozen(),
  warn = console.warn,
} = {}) => {
  if (!frozen || !isScrapedBackedIntake(body)) return;

  warn("legacy_intake_frozen", { route, source_host: sourceHostForLog(body.source_url) });
  throw new LegacyIntakeFrozenError();
};
