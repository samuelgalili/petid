// The same header strip as server/src/productText.js. Shown text only — the
// stored catalogue row is not rewritten.

const HEADER_TOKEN = "(?:שם המוצר|משקל|מחיר|תיאור|קטגוריה|מותג|תמונה|sku|SKU)";
const HEADER_LINE = new RegExp(`^\\s*(?:${HEADER_TOKEN}\\s*)(?:[|｜]\\s*${HEADER_TOKEN}\\s*)+$`);
const HEADER_PREFIX = new RegExp(`^(?:${HEADER_TOKEN}\\s*[|｜]\\s*)+`);

export const displayProductDescription = (value: unknown): string => {
  let text = String(value ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) return "";
  const lines = text.split("\n");
  while (lines.length > 0 && HEADER_LINE.test(lines[0].trim())) lines.shift();
  text = lines.join("\n").trim().replace(HEADER_PREFIX, "").trim();
  return text;
};

export const productMetaDescription = (value: unknown, fallback: string, max = 155): string => {
  const text = displayProductDescription(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const source = text || fallback;
  if (source.length <= max) return source;
  const room = Math.max(1, max - 1);
  const cut = source.slice(0, room + 1);
  const space = cut.lastIndexOf(" ");
  const end = space >= Math.min(80, room) ? space : room;
  return `${source.slice(0, end).trim()}…`;
};
