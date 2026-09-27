// Import leftovers and share-card blurbs.
//
// A scraped description sometimes still starts with the spreadsheet header
// ("שם המוצר | משקל") instead of a sentence. That string is not a product fact,
// so it is removed when the text is shown or placed in a meta description.
// The catalogue rows themselves are left alone.

const HEADER_TOKEN = "(?:שם המוצר|משקל|מחיר|תיאור|קטגוריה|מותג|תמונה|sku|SKU)";
const HEADER_LINE = new RegExp(`^\\s*(?:${HEADER_TOKEN}\\s*)(?:[|｜]\\s*${HEADER_TOKEN}\\s*)+$`);
const HEADER_PREFIX = new RegExp(`^(?:${HEADER_TOKEN}\\s*[|｜]\\s*)+`);

export const stripImportArtifact = (value) => {
  let text = String(value ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) return "";
  const lines = text.split("\n");
  while (lines.length > 0 && HEADER_LINE.test(lines[0].trim())) lines.shift();
  text = lines.join("\n").trim().replace(HEADER_PREFIX, "").trim();
  return text;
};

export const plainText = (value) => stripImportArtifact(
  String(value ?? "").replace(/<[^>]+>/g, " "),
)
  .replace(/\s+/g, " ")
  .trim();

/** About a search-result snippet. The ellipsis is inside the limit. */
export const clipPlainText = (value, max = 155) => {
  const text = plainText(value);
  const limit = Math.max(1, max);
  if (text.length <= limit) return text;
  const room = Math.max(1, limit - 1);
  const cut = text.slice(0, room + 1);
  const space = cut.lastIndexOf(" ");
  const end = space >= Math.min(80, room) ? space : room;
  return `${text.slice(0, end).trim()}…`;
};
