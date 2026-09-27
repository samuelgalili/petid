/**
 * product_attributes holds two kinds of scalars: nutrition and size facts a
 * shopper can use, and the import workbook's own columns (barcode, source
 * row, image review notes, a second VAT price). The second kind was rendered
 * as the product spec — on Quattro bags that meant a warehouse note and a
 * price that disagreed with the one on the bag.
 */

const INTERNAL_ATTRIBUTE_KEYS = new Set([
  "animal",
  "barcode",
  "source_row",
  "family_code",
  "product_type",
  "import_source",
  "supplier_name",
  "image_confidence",
  "price_before_vat",
  "suggested_barcode",
  "family_description",
  "image_candidate_url",
  "image_review_status",
  "price_including_vat",
  "image_download_error",
  "image_research_notes",
]);

const INTERNAL_KEY_PATTERN = /^(image_|price_|import_|source_|suggested_|family_)/i;

const SPEC_LABELS: Record<string, string> = {
  protein: "חלבון",
  fat: "שומן",
  fiber: "סיבים",
  moisture: "לחות",
  ash: "אפר",
  ph: "רמת חומציות",
  calcium: "סידן",
  phosphorus: "זרחן",
};

export function isCustomerFacingAttributeKey(key: string): boolean {
  if (INTERNAL_ATTRIBUTE_KEYS.has(key)) return false;
  if (INTERNAL_KEY_PATTERN.test(key)) return false;
  return true;
}

function isShopperValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^(null|none|undefined)$/i.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  return true;
}

export function readCustomerSpecAttributes(
  attributes: unknown,
): Array<{ label: string; value: string }> {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) return [];
  return Object.entries(attributes as Record<string, unknown>)
    .filter(([key, value]) => (
      isCustomerFacingAttributeKey(key)
      && value !== null
      && value !== undefined
      && !Array.isArray(value)
      && typeof value !== "object"
    ))
    .map(([key, value]) => ({
      label: SPEC_LABELS[key] || key,
      value: String(value).trim(),
    }))
    .filter((row) => isShopperValue(row.value));
}
