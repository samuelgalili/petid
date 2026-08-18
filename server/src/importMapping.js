import { normalizeHeader } from "./importParser.js";

// Deciding what a source column means, and turning its value into something the
// catalogue can hold.
//
// The profile stored in the database is the authority. Nothing here is applied
// on its own: the table below only proposes a target for a column whose meaning
// is recognisable, an administrator confirms or corrects it, and the confirmed
// mapping is what runs. Hard-coding one supplier's layout into the engine is
// exactly what makes the second supplier a rewrite.

/**
 * Domain fields a column can be mapped onto.
 *
 * Prices are separate fields rather than one `price`, because a supplier file
 * distinguishes list price, price with VAT, last purchase price and cost, and
 * collapsing them early is how the wrong number ends up on the shop.
 */
export const TARGET_FIELDS = Object.freeze({
  sku: { kind: "identifier", type: "text" },
  barcode: { kind: "identifier", type: "text" },
  manufacturer_sku: { kind: "identifier", type: "text" },

  name: { kind: "domain", type: "text" },
  name_en: { kind: "domain", type: "text" },
  description: { kind: "domain", type: "text" },

  brand: { kind: "domain", type: "text" },
  animal: { kind: "domain", type: "text" },
  category_code: { kind: "domain", type: "text" },
  category_label: { kind: "domain", type: "text" },
  category_type: { kind: "domain", type: "text" },

  supplier_name: { kind: "domain", type: "text" },
  supplier_code: { kind: "domain", type: "text" },

  list_price_ex_vat: { kind: "price", type: "number" },
  list_price_inc_vat: { kind: "price", type: "number" },
  wholesale_price: { kind: "price", type: "number" },
  last_purchase_price: { kind: "price", type: "number" },
  cost: { kind: "price", type: "number" },
  min_price: { kind: "price", type: "number" },
  currency: { kind: "price", type: "text" },

  image_path: { kind: "domain", type: "text" },

  stock_managed: { kind: "domain", type: "boolean" },
  unit_of_measure: { kind: "domain", type: "text" },
  conversion_rate: { kind: "domain", type: "number" },

  status: { kind: "metadata", type: "text" },
  opened_at: { kind: "metadata", type: "date" },
  last_movement_at: { kind: "metadata", type: "date" },
});

/**
 * Header patterns whose meaning is unambiguous enough to propose.
 *
 * Matched on the normalised header, so the same column recognises whether it
 * arrives with a straight quote or a gershayim, with one space or three.
 * A proposal is never applied without confirmation.
 */
const SUGGESTIONS = [
  [/^מק"ט$/, "sku"],
  [/^ברקוד$/, "barcode"],
  [/^תאור$/, "name"],
  [/^תאור לועזי$/, "name_en"],
  [/^יצרן$/, "brand"],
  [/^חיה$/, "animal"],
  [/^משפחת מוצר$/, "category_code"],
  [/^תאור משפחה$/, "category_label"],
  [/^סוג$/, "category_type"],
  [/^שם ספק$/, "supplier_name"],
  [/^ספק מועדף$/, "supplier_code"],
  [/^מחיר מחירון בסיס$/, "list_price_ex_vat"],
  [/^מחיר בסיס כולל מע"מ$/, "list_price_inc_vat"],
  [/^מחיר סיטונאות$/, "wholesale_price"],
  [/^מחיר קניה אחרון$/, "last_purchase_price"],
  [/^עלות ש"ח$/, "cost"],
  [/^מחיר מינימום$/, "min_price"],
  [/^מטבע$/, "currency"],
  [/^תמונה$/, "image_path"],
  [/^מנוהל מלאי\?$/, "stock_managed"],
  [/^יח' קניה\/מכירה$/, "unit_of_measure"],
  [/^שעור המרה$/, "conversion_rate"],
  [/^סטטוס$/, "status"],
  [/^תאריך פתיחה$/, "opened_at"],
  [/^תנועה אחרונה במפעל$/, "last_movement_at"],

  // English headers, for suppliers who export in English.
  [/^sku$/, "sku"],
  [/^barcode|ean|gtin$/, "barcode"],
  [/^(product )?name|title$/, "name"],
  [/^description$/, "description"],
  [/^brand|manufacturer$/, "brand"],
  [/^cost( price)?$/, "cost"],
  [/^price$/, "list_price_inc_vat"],
  [/^currency$/, "currency"],
  [/^image( url)?$/, "image_path"],
];

/** Proposes a target field for a column, or null when the meaning is unclear. */
export const suggestTargetField = (sourceField) => {
  const normalized = normalizeHeader(sourceField);
  for (const [pattern, target] of SUGGESTIONS) {
    if (pattern.test(normalized)) return target;
  }
  return null;
};

// --- value normalisation ---------------------------------------------------

const HEBREW_MARKS = /[‎‏‪-‮]/g;

export const normalizeText = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(HEBREW_MARKS, "").replace(/\s+/g, " ").trim();
  return text || null;
};

/**
 * Reads a number out of whatever the file holds.
 *
 * Returns null rather than 0 for an absent value: a product with no price and
 * a product priced at zero are different facts, and the difference decides
 * whether it can be published.
 */
export const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const text = String(value).replace(HEBREW_MARKS, "").replace(/[₪$€,\s]/g, "").trim();
  if (!text) return null;

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
};

const TRUE_VALUES = new Set(["כן", "yes", "y", "true", "1", "t", "פעיל", "כן."]);
const FALSE_VALUES = new Set(["לא", "no", "n", "false", "0", "f", "לא פעיל"]);

export const normalizeBoolean = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  const text = String(value).trim().toLowerCase();
  if (TRUE_VALUES.has(text)) return true;
  if (FALSE_VALUES.has(text)) return false;
  return null;
};

export const normalizeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();

  const text = String(value).trim();
  if (!text) return null;

  // dd/mm/yyyy is what Israeli exports use, and Date would read it as US order.
  const dmy = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (dmy) {
    const [, day, month, yearPart] = dmy;
    const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

/**
 * Currency codes, from whatever the file writes.
 *
 * An unrecognised value returns null rather than guessing: assuming shekels for
 * a dollar price would silently change what a product costs.
 */
export const normalizeCurrency = (value) => {
  const text = normalizeText(value);
  if (!text) return null;

  const upper = text.toUpperCase();
  if (/^(ILS|NIS)$/.test(upper) || /ש"ח|שח|שקל|₪/.test(text)) return "ILS";
  if (/^USD$/.test(upper) || /\$|דולר/.test(text)) return "USD";
  if (/^EUR$/.test(upper) || /€|אירו|יורו/.test(text)) return "EUR";
  return null;
};

// The same unit is written several ways in one file: ק"ג appears 121 times and
// קג another 42. Folding them is what makes a variant dimension comparable.
const UNIT_ALIASES = [
  [/^(ק"ג|קג|ק״ג|kg|kilo|kilogram)$/i, "kg"],
  [/^(גרם|גר'|גר|g|gr|gram)$/i, "g"],
  [/^(ליטר|ל'|l|lt|liter|litre)$/i, "l"],
  [/^(מ"ל|מל|ml)$/i, "ml"],
  [/^(יח'|יח|יחידות|unit|units|pcs)$/i, "unit"],
];

export const normalizeUnit = (value) => {
  const text = normalizeText(value);
  if (!text) return null;
  for (const [pattern, canonical] of UNIT_ALIASES) {
    if (pattern.test(text)) return canonical;
  }
  return text.toLowerCase();
};

const VALUE_NORMALIZERS = {
  text: normalizeText,
  number: normalizeNumber,
  integer: (value) => {
    const parsed = normalizeNumber(value);
    return parsed === null ? null : Math.trunc(parsed);
  },
  boolean: normalizeBoolean,
  date: normalizeDate,
  currency: normalizeCurrency,
  enum: normalizeText,
  array: (value) => {
    if (Array.isArray(value)) return value;
    const text = normalizeText(value);
    return text ? text.split(/[,;|]/).map((part) => part.trim()).filter(Boolean) : null;
  },
};

export const normalizeValue = (value, type) =>
  (VALUE_NORMALIZERS[type] || normalizeText)(value);

/**
 * Applies a profile's mappings to one raw row.
 *
 * Returns the mapped values, the normalised values, and — the part that makes
 * "no silent data loss" checkable — which columns carried data that no mapping
 * accounted for.
 */
export const mapRow = (raw, mappings) => {
  const mapped = {};
  const normalized = {};
  const unmappedWithData = [];

  const byField = new Map();
  for (const mapping of mappings) {
    byField.set(mapping.source_field, mapping);
  }

  for (const [sourceField, value] of Object.entries(raw)) {
    const mapping = byField.get(sourceField);
    const hasData = value !== null && value !== undefined && value !== "";

    if (!mapping || mapping.target_kind === "unmapped") {
      if (hasData) unmappedWithData.push(sourceField);
      continue;
    }

    if (mapping.target_kind === "ignored" || !mapping.target_field) continue;

    mapped[mapping.target_field] = value;
    normalized[mapping.target_field] = normalizeValue(value, mapping.value_type || "text");
  }

  return { mapped, normalized, unmappedWithData };
};

// --- variants --------------------------------------------------------------

// Pack size lives in the product name in this catalogue: "קוואטרו חתולים אדולט
// עוף 1.5 ק"ג". Pulling it out is what turns three rows into one product with
// three sizes, and the SKU agrees independently — caqu1.5101 against caqu20100.
const SIZE_PATTERN = /(\d+(?:[.,]\d+)?)\s*(ק"ג|קג|ק״ג|kg|גרם|גר'|גר|g|ליטר|l|מ"ל|מל|ml|יח'|יחידות)/i;

export const extractSize = (name) => {
  const text = normalizeText(name);
  if (!text) return null;

  const match = text.match(SIZE_PATTERN);
  if (!match) return null;

  const amount = Number(match[1].replace(",", "."));
  if (!Number.isFinite(amount)) return null;

  const unit = normalizeUnit(match[2]);

  return {
    amount,
    unit,
    // Grams and millilitres compare against kilos and litres only once both are
    // in the same unit.
    base_amount: unit === "g" ? amount / 1000 : unit === "ml" ? amount / 1000 : amount,
    base_unit: unit === "g" ? "kg" : unit === "ml" ? "l" : unit,
    matched: match[0],
  };
};

/**
 * The name with its size removed, which is what groups variants of one product.
 *
 * Deliberately not the barcode: in the reference file six barcodes are shared
 * across different pack sizes, so grouping by barcode would merge a 1.5kg bag
 * with a 20kg one.
 */
export const variantGroupKey = (name, brand) => {
  const text = normalizeText(name);
  if (!text) return null;

  const withoutSize = text.replace(SIZE_PATTERN, " ").replace(/\s+/g, " ").trim();
  if (!withoutSize) return null;

  const brandPart = normalizeText(brand) || "";
  return `${brandPart.toLowerCase()}|${withoutSize.toLowerCase()}`;
};

// --- barcodes --------------------------------------------------------------

/** GTIN-13 check digit. A failing barcode is kept and flagged, never trusted. */
export const isValidGtin13 = (value) => {
  const text = String(value ?? "").replace(/\D/g, "");
  if (text.length !== 13) return false;

  const digits = [...text].map(Number);
  const sum = digits
    .slice(0, 12)
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3), 0);

  return (10 - (sum % 10)) % 10 === digits[12];
};

// --- image paths -----------------------------------------------------------

// The image column holds a Windows path into a private ERP share, and in most
// rows the text direction has scrambled it: the extension lands at the front,
// as in "jpg.שיבולים\system\mail\...\..\..". The original is always kept; this
// only produces a readable second copy.
export const repairImagePath = (value) => {
  const text = normalizeText(value);
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) return text;
  if (text.startsWith("..\\") || text.startsWith("../")) return text;

  const mangled = text.match(/^([a-z0-9]{2,5})\.(.+?)((?:\\|\/)\.\.){1,}$/i);
  if (!mangled) return text;

  const [, extension, middle] = mangled;
  const segments = middle.split(/[\\/]/).filter(Boolean);
  if (segments.length === 0) return text;

  // The reordering moves the Hebrew filename to the front, and it can end up
  // touching the first ASCII path segment with no separator between them —
  // "תוכי גדול system\mail\..." is the filename followed by the path, not a
  // filename called "תוכי גדול system". Splitting at the last Hebrew character
  // puts each part back where it belongs.
  const [head, ...tail] = segments;
  const lastHebrew = head.search(/[\u0590-\u05FF](?![\s\S]*[\u0590-\u05FF])/);

  let filename = head;
  const pathSegments = [...tail];

  if (lastHebrew >= 0 && lastHebrew < head.length - 1) {
    filename = head.slice(0, lastHebrew + 1).trim();
    const leaked = head.slice(lastHebrew + 1).trim();
    if (leaked) pathSegments.unshift(leaked);
  }

  if (!filename) return text;
  return `..\\..\\${[...pathSegments, `${filename}.${extension}`].join("\\")}`;
};
