// Public sitemap. Product URLs come from the same catalogue the shop lists.
// Private rows never appear here: the query selects id and a timestamp only.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SITEMAP_PAGES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/shop", changefreq: "daily", priority: "0.9" },
  { path: "/support", changefreq: "monthly", priority: "0.6" },
  { path: "/accessibility", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
];

const FALLBACK_ORIGIN = "https://mipo.pet";

export const sitemapOrigin = (configured) => {
  if (!configured) return FALLBACK_ORIGIN;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.protocol !== "http:") return FALLBACK_ORIGIN;
    if (url.username || url.password) return FALLBACK_ORIGIN;
    return url.origin;
  } catch {
    return FALLBACK_ORIGIN;
  }
};

const escapeXml = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

const lastmod = (value, fallback) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString().slice(0, 10);
};

export const buildSitemapXml = ({ origin, products = [], now = new Date() }) => {
  const today = lastmod(now, "1970-01-01");
  const entries = SITEMAP_PAGES.map((page) => ({
    loc: `${origin}${page.path}`,
    lastmod: today,
    changefreq: page.changefreq,
    priority: page.priority,
  }));

  const seen = new Set();
  for (const product of products) {
    const id = String(product?.id || "").trim().toLowerCase();
    if (!UUID.test(id) || seen.has(id)) continue;
    seen.add(id);
    entries.push({
      loc: `${origin}/product/${id}`,
      lastmod: lastmod(product.updated_at, today),
      changefreq: "weekly",
      priority: "0.7",
    });
  }

  const body = entries.map((entry) => (
    `  <url><loc>${escapeXml(entry.loc)}</loc><lastmod>${entry.lastmod}</lastmod><changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`
  )).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
};

const loadIds = async (query, statements) => {
  for (const sql of statements) {
    try {
      const result = await query(sql);
      return result?.rows || [];
    } catch (error) {
      if (error?.code === "42P01") return [];
      if (error?.code === "42703") continue;
      throw error;
    }
  }
  return [];
};

export const listSitemapProducts = async (query) => {
  const [business, scraped] = await Promise.all([
    loadIds(query, [
      "select id::text as id, updated_at from public.business_products",
      "select id::text as id, created_at as updated_at from public.business_products",
      "select id::text as id, null::timestamptz as updated_at from public.business_products",
    ]),
    loadIds(query, [
      "select id::text as id, coalesce(updated_at, scraped_at, created_at) as updated_at from public.scraped_products",
      "select id::text as id, coalesce(scraped_at, created_at) as updated_at from public.scraped_products",
      "select id::text as id, null::timestamptz as updated_at from public.scraped_products",
    ]),
  ]);
  return [...business, ...scraped];
};
