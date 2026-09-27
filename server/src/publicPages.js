// Per-route HTML for the public site.
//
// Caddy serves real files itself. A navigation that is not a file is proxied
// here, and the response is still the SPA shell — with the status, title,
// description, canonical and share tags of that path already in the HTML.
// Crawlers that do not run JavaScript otherwise see the home page on every URL.
//
// Product rows are cached in memory. A share-card fetch must not hit the
// database on every request, and a missing id is cached too so a bad URL
// cannot be used to hammer the catalogue.

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { clipPlainText, plainText } from "./productText.js";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "../../src/lib/siteContact.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FALLBACK_ORIGIN = "https://mipo.pet";
const PRODUCT_TTL_MS = 60_000;
const SITEMAP_TTL_MS = 5 * 60_000;
const PRODUCT_CACHE_MAX = 500;
const DEFAULT_DESCRIPTION = "MIPO היא אפליקציה לניהול החיים עם חיית המחמד: פרופיל, טיפול, תזכורות, קהילה וחנות.";
const DEFAULT_IMAGE_PATH = "/og-default.png";

// Pages a crawler should list. Each one is public, is not a client redirect,
// and is not behind login on this branch.
//
// `/` sends an anonymous visitor to /auth, and `/support` requires a session,
// so neither is listed. The public-shop change opens both and also adds a
// dynamic sitemap; keep this route (in-stock products, real lastmod) when the
// two meet. A static public/sitemap.xml is only the page list, without products.
export const SITEMAP_PAGES = [
  { path: "/shop", changefreq: "daily", priority: "0.9" },
  { path: "/breeds", changefreq: "weekly", priority: "0.7" },
  { path: "/science", changefreq: "monthly", priority: "0.5" },
  { path: "/install", changefreq: "monthly", priority: "0.4" },
  { path: "/accessibility", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/club-terms", changefreq: "yearly", priority: "0.3" },
  { path: "/data-deletion", changefreq: "yearly", priority: "0.3" },
];

// Home and support get their own canonical in the HTML. They stay out of the
// sitemap until they are public documents rather than login walls.
const INDEXABLE = new Set(["/", "/support", ...SITEMAP_PAGES.map((page) => page.path)]);

const PAGE_META = {
  "/": {
    title: "MIPO — הבית של חיית המחמד",
    description: "MIPO היא החנות והבית של חיית המחמד: מזון, ציוד, פרופיל וטיפול במקום אחד.",
  },
  "/shop": {
    title: "חנות",
    description: "מוצרים לחיות מחמד — מזון, ציוד וצעצועים. המחירים כוללים מע״מ.",
  },
  "/support": {
    title: "תמיכה",
    description: `תמיכה של MIPO בוואטסאפ ${SUPPORT_PHONE} ובאימייל ${SUPPORT_EMAIL}.`,
  },
  "/accessibility": {
    title: "הצהרת נגישות",
    description: "הצהרת הנגישות של MIPO, לפי תקן ישראלי 5568 ולהנחיות WCAG 2.1.",
  },
  "/privacy-policy": {
    title: "מדיניות פרטיות",
    description: "מדיניות הפרטיות של MIPO: איזה מידע נאסף, למה הוא משמש, ואיך מוחקים אותו.",
  },
  "/terms": {
    title: "תנאי שימוש",
    description: "תנאי השימוש של MIPO באתר ובאפליקציה.",
  },
  "/club-terms": {
    title: "תנאי המועדון",
    description: "תנאי החברות במועדון MIPO.",
  },
  "/data-deletion": {
    title: "מחיקת נתונים",
    description: "איך לבקש מחיקה של חשבון ושל נתונים ב-MIPO.",
  },
  "/science": {
    title: "מדע ואמון",
    description: "הסטנדרט המדעי של MIPO, כולל תקני NRC 2006.",
  },
  "/breeds": {
    title: "אנציקלופדיית גזעים",
    description: "אנציקלופדיית גזעי כלבים וחתולים: אופי, בריאות וטיפול.",
  },
  "/install": {
    title: "התקנת האפליקציה",
    description: "התקנת MIPO למסך הבית בטלפון.",
  },
};

const EXACT_PATHS = new Set([
  "/",
  "/auth", "/auth/callback", "/signup", "/forgot-password", "/reset-password",
  "/verify-email", "/install", "/onboarding",
  "/feed", "/old-feed", "/explore", "/reels", "/live",
  "/shop", "/shop/explore", "/shop/feed", "/cart", "/favorites", "/checkout",
  "/order-confirmation", "/reorder-confirmation", "/order-history",
  "/payment-success", "/payment-failed",
  "/add-pet", "/pet-profile", "/archived-pets", "/photos", "/documents",
  "/training", "/grooming", "/insurance", "/dog-parks", "/adoption",
  "/breeds", "/breed-quiz", "/breed-detect",
  "/profile", "/edit-profile", "/settings", "/notifications",
  "/messages", "/messages/new", "/privacy-settings", "/chat", "/owner-profile",
  "/businesses", "/convert-to-business", "/creator-dashboard", "/creator-analytics",
  "/smart-notifications", "/business-settings", "/business-crm", "/product-sourcing",
  "/ad-campaigns", "/parks", "/experiences", "/guides", "/radar",
  "/science", "/accessibility", "/privacy-policy", "/terms", "/club-terms",
  "/support", "/data-deletion",
]);

const PARAM_PATHS = [
  /^\/user\/[^/]+$/,
  /^\/profile\/[^/]+$/,
  /^\/post\/[^/]+$/,
  /^\/story\/[^/]+$/,
  /^\/highlight\/[^/]+$/,
  /^\/live\/[^/]+$/,
  /^\/live\/[^/]+\/broadcast$/,
  /^\/order-tracking\/[^/]+$/,
  /^\/pet\/[^/]+$/,
  /^\/pet\/[^/]+\/.+$/,
  /^\/pet-profile\/[^/]+$/,
  /^\/edit-pet\/[^/]+$/,
  /^\/breed-history\/[^/]+$/,
  /^\/messages\/[^/]+$/,
  /^\/business\/[^/]+$/,
  /^\/found-pet\/[^/]+$/,
  /^\/admin(?:\/.*)?$/,
  /^\/factory(?:\/.*)?$/,
];

const BUSINESS_SITEMAP_SQL = [
  "select id::text as id, updated_at from public.business_products where in_stock is not false",
  "select id::text as id, created_at as updated_at from public.business_products where in_stock is not false",
];

const SCRAPED_SITEMAP_SQL = [
  "select id::text as id, coalesce(updated_at, scraped_at, created_at) as updated_at from public.scraped_products where stock_status is null or stock_status = 'in_stock'",
  "select id::text as id, coalesce(scraped_at, created_at) as updated_at from public.scraped_products where stock_status is null or stock_status = 'in_stock'",
];

const FALLBACK_HTML = `<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <title>MIPO — הבית של חיית המחמד</title>
    <meta name="description" content="${DEFAULT_DESCRIPTION}">
    <link rel="canonical" href="${FALLBACK_ORIGIN}/" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="MIPO" />
    <meta property="og:locale" content="he_IL" />
    <meta property="og:title" content="MIPO — הבית של חיית המחמד">
    <meta property="og:description" content="${DEFAULT_DESCRIPTION}">
    <meta property="og:image" content="${FALLBACK_ORIGIN}${DEFAULT_IMAGE_PATH}" />
    <meta property="og:url" content="${FALLBACK_ORIGIN}/" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="MIPO — הבית של חיית המחמד">
    <meta name="twitter:description" content="${DEFAULT_DESCRIPTION}">
    <meta name="twitter:image" content="${FALLBACK_ORIGIN}${DEFAULT_IMAGE_PATH}" />
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"MIPO","url":"${FALLBACK_ORIGIN}/"}</script>
  </head>
  <body><div id="root"></div></body>
</html>`;

let templateCache = { key: "", html: "" };

export const publicOrigin = (configured) => {
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

export const documentTitle = (title) => {
  if (!title || !String(title).trim()) return "MIPO — My Precious One";
  let trimmed = String(title).trim();
  while (/\s*\|\s*MIPO\s*$/i.test(trimmed)) {
    trimmed = trimmed.replace(/\s*\|\s*MIPO\s*$/i, "").trim();
  }
  if (!trimmed) return "MIPO";
  if (/^MIPO(\s|$)/.test(trimmed)) return trimmed;
  return `${trimmed} | MIPO`;
};

export const normalizePath = (pathname) => {
  let decoded;
  try {
    decoded = decodeURIComponent(String(pathname || "/"));
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.includes("\0") || decoded.includes("\\")) return null;
  if (decoded.length > 1) decoded = decoded.replace(/\/+$/, "");
  return decoded;
};

const isKnownPage = (pathname) => EXACT_PATHS.has(pathname) || PARAM_PATHS.some((pattern) => pattern.test(pathname));

export const classifyPath = (pathname) => {
  const path = normalizePath(pathname);
  if (!path) return { kind: "unknown", path: "/", indexable: false };
  if (path === "/sitemap.xml" || path === "/api/sitemap.xml") return { kind: "sitemap", path, indexable: false };
  if (path.startsWith("/api/") || path.startsWith("/uploads/")) return { kind: "api", path, indexable: false };
  const product = path.match(/^\/product\/([^/]+)$/);
  if (product) return { kind: "product", path, id: product[1], indexable: true };
  if (isKnownPage(path)) return { kind: "page", path, indexable: INDEXABLE.has(path) };
  return { kind: "unknown", path, indexable: false };
};

const escapeHtml = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const escapeJson = (value) => JSON.stringify(value)
  .replace(/</g, "\\u003c")
  .replace(/>/g, "\\u003e")
  .replace(/&/g, "\\u0026");

const replaceTag = (html, pattern, tag) => (pattern.test(html) ? html.replace(pattern, tag) : html);

const upsertMeta = (html, attr, key, content) => {
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}">`;
  const pattern = new RegExp(`<meta\\s+[^>]*${attr}=["']${key}["'][^>]*>`, "i");
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace("</head>", `    ${tag}\n  </head>`);
};

export const injectDocument = (html, meta) => {
  let next = String(html);
  const title = documentTitle(meta.title);
  next = replaceTag(next, /<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  next = upsertMeta(next, "name", "description", meta.description);
  next = upsertMeta(next, "property", "og:title", title);
  next = upsertMeta(next, "property", "og:description", meta.description);
  next = upsertMeta(next, "property", "og:image", meta.image);
  next = upsertMeta(next, "property", "og:url", meta.url);
  next = upsertMeta(next, "property", "og:type", meta.type || "website");
  next = upsertMeta(next, "name", "twitter:card", "summary_large_image");
  next = upsertMeta(next, "name", "twitter:title", title);
  next = upsertMeta(next, "name", "twitter:description", meta.description);
  next = upsertMeta(next, "name", "twitter:image", meta.image);
  next = upsertMeta(next, "name", "robots", meta.robots);
  const canonical = `<link rel="canonical" href="${escapeHtml(meta.url)}" />`;
  next = replaceTag(next, /<link\s+[^>]*rel=["']canonical["'][^>]*>/i, canonical);
  if (!/<link\s+[^>]*rel=["']canonical["']/i.test(next)) {
    next = next.replace("</head>", `    ${canonical}\n  </head>`);
  }
  const script = `<script type="application/ld+json">${escapeJson(meta.jsonLd)}</script>`;
  if (/<script type="application\/ld\+json">[\s\S]*?<\/script>/.test(next)) {
    next = next.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, script);
  } else {
    next = next.replace("</head>", `    ${script}\n  </head>`);
  }
  return next;
};

const absoluteUrl = (origin, value) => {
  const raw = String(value || "").trim();
  if (!raw || raw.endsWith("/placeholder.svg") || raw === "placeholder.svg") {
    return `${origin}${DEFAULT_IMAGE_PATH}`;
  }
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/") && !raw.startsWith("//")) return `${origin}${raw}`;
  return `${origin}${DEFAULT_IMAGE_PATH}`;
};

const priceOf = (product) => {
  const sale = Number(product?.sale_price);
  const price = Number(product?.price);
  if (Number.isFinite(sale) && sale > 0) return sale;
  if (Number.isFinite(price) && price >= 0) return price;
  return null;
};

const jsonLdForPage = (origin, meta) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: meta.title,
  description: meta.description,
  url: meta.url,
  isPartOf: { "@type": "WebSite", name: "MIPO", url: `${origin}/` },
});

const jsonLdForProduct = (product, meta, price) => {
  const offer = price === null ? {} : {
    offers: {
      "@type": "Offer",
      price: Number(price).toFixed(2),
      priceCurrency: "ILS",
      availability: product.in_stock === false
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      url: meta.url,
    },
  };
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: plainText(product.name) || meta.title,
    description: meta.description,
    image: meta.image,
    url: meta.url,
    ...(product.brand ? { brand: { "@type": "Brand", name: String(product.brand) } } : {}),
    ...offer,
  };
};

const pageDocument = (origin, pathname, { status, title, description, indexable, image, type, jsonLd }) => {
  const url = `${origin}${pathname === "/" ? "/" : pathname}`;
  const meta = {
    title,
    description,
    image: image || `${origin}${DEFAULT_IMAGE_PATH}`,
    url,
    type: type || "website",
    robots: indexable ? "index, follow" : "noindex, nofollow",
    jsonLd: jsonLd || jsonLdForPage(origin, { title: documentTitle(title), description, url }),
  };
  return { status, meta };
};

const escapeXml = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

const lastmodOf = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

export const buildSitemapXml = ({ origin, products = [] }) => {
  const entries = SITEMAP_PAGES.map((page) => ({
    loc: `${origin}${page.path}`,
    changefreq: page.changefreq,
    priority: page.priority,
  }));
  const seen = new Set();
  for (const product of products) {
    if (product?.in_stock === false) continue;
    if (product?.stock_status && product.stock_status !== "in_stock") continue;
    const id = String(product?.id || "").trim().toLowerCase();
    if (!UUID.test(id) || seen.has(id)) continue;
    seen.add(id);
    entries.push({
      loc: `${origin}/product/${id}`,
      lastmod: lastmodOf(product.updated_at),
      changefreq: "weekly",
      priority: "0.8",
    });
  }
  const body = entries.map((entry) => {
    const lastmod = entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : "";
    return `  <url><loc>${escapeXml(entry.loc)}</loc>${lastmod}<changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`;
  }).join("\n");
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

export const listInStockSitemapProducts = async (query) => {
  const [business, scraped] = await Promise.all([
    loadIds(query, BUSINESS_SITEMAP_SQL),
    loadIds(query, SCRAPED_SITEMAP_SQL),
  ]);
  return [...business, ...scraped];
};

const readTemplate = async (webRoot) => {
  const file = path.join(webRoot, "index.html");
  try {
    const info = await stat(file);
    const key = `${file}:${info.mtimeMs}:${info.size}`;
    if (templateCache.key === key) return templateCache.html;
    const html = await readFile(file, "utf8");
    templateCache = { key, html };
    return html;
  } catch (error) {
    if (error?.code === "ENOENT") return FALLBACK_HTML;
    throw error;
  }
};

const remember = (map, key, value, ttl) => {
  map.set(key, { value, expires: Date.now() + ttl });
  if (map.size <= PRODUCT_CACHE_MAX) return;
  const oldest = map.keys().next().value;
  map.delete(oldest);
};

const recall = (map, key) => {
  const hit = map.get(key);
  if (!hit) return undefined;
  if (hit.expires <= Date.now()) {
    map.delete(key);
    return undefined;
  }
  return hit.value;
};

export const createPublicPageRenderer = ({
  origin,
  webRoot = "/srv/www",
  template,
  loadProduct,
  loadSitemapProducts,
} = {}) => {
  const siteOrigin = publicOrigin(origin);
  const productsById = new Map();
  let sitemapCache = null;

  const templateHtml = async () => (typeof template === "string" ? template : readTemplate(webRoot));

  const sitemapXml = async () => {
    if (sitemapCache && sitemapCache.expires > Date.now()) return sitemapCache.xml;
    const products = loadSitemapProducts ? await loadSitemapProducts() : [];
    const xml = buildSitemapXml({ origin: siteOrigin, products });
    sitemapCache = { xml, expires: Date.now() + SITEMAP_TTL_MS };
    return xml;
  };

  const loadCachedProduct = async (id) => {
    const key = id.toLowerCase();
    const hit = recall(productsById, key);
    if (hit !== undefined) return hit;
    const product = loadProduct ? await loadProduct(key) : null;
    remember(productsById, key, product, PRODUCT_TTL_MS);
    return product;
  };

  return async function renderPublicPage(pathname) {
    const classified = classifyPath(pathname);
    if (classified.kind === "api") return null;

    if (classified.kind === "sitemap") {
      const xml = await sitemapXml();
      const body = Buffer.from(xml, "utf8");
      return {
        status: 200,
        headers: {
          "content-type": "application/xml; charset=utf-8",
          "cache-control": "public, max-age=3600",
          "x-content-type-options": "nosniff",
          "content-length": String(body.length),
        },
        body,
      };
    }

    let document;
    if (classified.kind === "product") {
      if (!UUID.test(classified.id)) {
        document = pageDocument(siteOrigin, classified.path, {
          status: 404,
          title: "המוצר לא נמצא",
          description: "המוצר שביקשתם לא נמצא בקטלוג.",
          indexable: false,
        });
      } else {
        const product = await loadCachedProduct(classified.id);
        if (!product) {
          document = pageDocument(siteOrigin, classified.path, {
            status: 404,
            title: "המוצר לא נמצא",
            description: "המוצר שביקשתם לא נמצא בקטלוג.",
            indexable: false,
          });
        } else {
          const name = plainText(product.name) || "מוצר";
          const description = clipPlainText(product.description, 155) || `פרטי מוצר: ${name}`;
          const image = absoluteUrl(siteOrigin, product.image_url);
          const url = `${siteOrigin}${classified.path}`;
          const price = priceOf(product);
          const meta = {
            title: name,
            description,
            image,
            url,
            type: "product",
            robots: "index, follow",
            jsonLd: jsonLdForProduct(product, { description, image, url, title: name }, price),
          };
          document = { status: 200, meta };
        }
      }
    } else if (classified.kind === "page") {
      const meta = PAGE_META[classified.path] || {
        title: "MIPO",
        description: DEFAULT_DESCRIPTION,
      };
      document = pageDocument(siteOrigin, classified.path, {
        status: 200,
        title: meta.title,
        description: meta.description,
        indexable: classified.indexable,
      });
    } else {
      document = pageDocument(siteOrigin, classified.path, {
        status: 404,
        title: "העמוד לא נמצא",
        description: "העמוד שביקשתם לא קיים.",
        indexable: false,
      });
    }

    const html = injectDocument(await templateHtml(), document.meta);
    const body = Buffer.from(html, "utf8");
    return {
      status: document.status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache",
        "x-content-type-options": "nosniff",
        "content-length": String(body.length),
      },
      body,
    };
  };
};
