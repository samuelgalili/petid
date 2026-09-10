/**
 * The one owner-facing feeding guidance path.
 *
 * Before this module the app had four ways to tell an owner how much to feed
 * their animal, and they disagreed. Three of them multiplied body weight by a
 * percentage — 2%, 2.5%, 3%, 4%, depending on which screen you were on — and
 * one of those rendered under a heading that said the number came from the
 * manufacturer. It did not. It came from a constant.
 *
 * So Mipo no longer calculates a daily feeding amount for an owner. It repeats
 * what the product says, says where that came from, and when the product says
 * nothing it shows nothing. A missing feeding guideline is honest; an invented
 * one is not.
 *
 * RER/MER lives on as internal intelligence (see docs/pet-intelligence/34) and
 * is deliberately absent from this module: nothing here may produce a number
 * that Mipo itself derived.
 */

/** Where a catalogue feeding guide actually came from. Mirrors the column. */
export type FeedingGuideSource = "ai_extracted" | "manufacturer_confirmed" | "unknown";

export interface FeedingGuidance {
  /** Guidance lines exactly as the catalogue holds them. Never computed. */
  lines: string[];
  source: FeedingGuideSource;
}

const KNOWN_SOURCES: FeedingGuideSource[] = ["ai_extracted", "manufacturer_confirmed", "unknown"];

export const normalizeFeedingGuideSource = (value: unknown): FeedingGuideSource => (
  KNOWN_SOURCES.includes(value as FeedingGuideSource) ? (value as FeedingGuideSource) : "unknown"
);

/**
 * The catalogue holds this column in more than one shape, because more than one
 * writer fills it: the import pipeline stores the model's `[{range, amount}]`,
 * an older path flattens the same thing to a string, and the admin form stores
 * plain strings. A reader that understands only one of those silently drops the
 * guidance — which is what was happening on the product page, where every
 * `{range, amount}` entry collapsed to an empty string and the section never
 * rendered.
 */
const entryToLine = (entry: unknown): string => {
  if (typeof entry === "string") return entry.trim();
  if (typeof entry === "number") return String(entry);
  if (!entry || typeof entry !== "object") return "";

  const record = entry as Record<string, unknown>;
  const text = (key: string) => (typeof record[key] === "string" ? (record[key] as string).trim() : "");

  const range = text("range") || text("weight") || text("weight_range");
  const amount = text("amount") || text("grams") || text("quantity");
  if (range && amount) return `${range}: ${amount}`;
  if (amount) return amount;
  if (range) return range;

  return text("text") || text("title") || text("label") || text("value");
};

export const readFeedingGuidance = (product: {
  feeding_guide?: unknown;
  feeding_guide_source?: unknown;
} | null | undefined): FeedingGuidance | null => {
  if (!product) return null;

  const raw = Array.isArray(product.feeding_guide)
    ? product.feeding_guide
    : product.feeding_guide
      ? [product.feeding_guide]
      : [];

  const lines = raw.map(entryToLine).filter(Boolean);
  if (lines.length === 0) return null;

  return { lines, source: normalizeFeedingGuideSource(product.feeding_guide_source) };
};

/**
 * What the owner is told about where the number came from.
 *
 * Only `manufacturer_confirmed` may claim the manufacturer. Everything else —
 * including `unknown` — says the honest thing: it was taken off the product
 * page. Internal enum names are never shown.
 */
export const feedingGuidanceSourceLabelHe = (source: FeedingGuideSource): string => (
  source === "manufacturer_confirmed"
    ? "הנחיות יצרן"
    : "מידע שחולץ מדף המוצר"
);

export const feedingGuidanceSourceLabelEn = (source: FeedingGuideSource): string => (
  source === "manufacturer_confirmed"
    ? "Manufacturer guidance"
    : "Taken from the product page"
);
