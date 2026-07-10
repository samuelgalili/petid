import { load } from "cheerio";
import { fetchValidatedRemoteUrl, validateRemoteHttpUrl } from "./urlSafety.js";

const firecrawlApiKey = process.env.FIRECRAWL_API_KEY || "";
const geminiApiKey = process.env.GEMINI_API_KEY || "";

const FORBIDDEN_INGREDIENTS = {
  bha: { he: "BHA (בוטילהידרוקסיאניזול)", risk: "חשד לסרטן - משמר כימי בעייתי", severity: "critical" },
  bht: { he: "BHT (בוטילהידרוקסיטולואן)", risk: "חשד לסרטן - משמר כימי בעייתי", severity: "critical" },
  ethoxyquin: { he: "אתוקסיקווין", risk: "משמר כימי בעייתי, עלול לפגוע בכבד ובכליות", severity: "critical" },
  "propylene glycol": { he: "פרופילן גליקול", risk: "רעיל לחתולים ועלול לגרום לאנמיה", severity: "critical" },
  xylitol: { he: "קסיליטול", risk: "רעיל מאוד לכלבים", severity: "critical" },
  onion: { he: "בצל", risk: "רעיל לכלבים וחתולים ועלול לגרום לאנמיה", severity: "critical" },
  garlic: { he: "שום", risk: "עלול להיות רעיל בכמויות גדולות", severity: "warning" },
  sugar: { he: "סוכר", risk: "סוכר מיותר במזון לחיות - סיכון להשמנה וסוכרת", severity: "warning" },
  "corn syrup": { he: "סירופ תירס", risk: "סוכר מוסף באיכות נמוכה", severity: "warning" },
  "artificial color": { he: "צבע מלאכותי", risk: "ללא ערך תזונתי ועלול לגרום לרגישויות", severity: "warning" },
  "red 40": { he: "אדום 40", risk: "צבע מלאכותי", severity: "warning" },
  "yellow 5": { he: "צהוב 5", risk: "צבע מלאכותי", severity: "warning" },
  "yellow 6": { he: "צהוב 6", risk: "צבע מלאכותי", severity: "warning" },
  carrageenan: { he: "קרגינן", risk: "עלול לגרום לרגישות במערכת העיכול", severity: "info" },
  "by-product": { he: "תוצרי לוואי", risk: "איכות משתנה ומקור לא תמיד ברור", severity: "info" },
  "animal fat": { he: "שומן מן החי כללי", risk: "מקור שומן לא מוגדר", severity: "info" },
};

const POSITIVE_INGREDIENTS = {
  "salmon oil": { he: "שמן סלמון", benefit: "אומגה 3 לפרווה, עור ומפרקים" },
  glucosamine: { he: "גלוקוזמין", benefit: "תמיכה במפרקים" },
  chondroitin: { he: "כונדרויטין", benefit: "תמיכה בסחוס מפרקי" },
  probiotics: { he: "פרוביוטיקה", benefit: "תמיכה במערכת העיכול" },
  prebiotics: { he: "פרהביוטיקה", benefit: "תמיכה בפלורת המעי" },
  taurine: { he: "טאורין", benefit: "תמיכה בלב ובעיניים" },
  "omega 3": { he: "אומגה 3", benefit: "נוגד דלקת ותומך בעור ובפרווה" },
  chicken: { he: "עוף", benefit: "חלבון איכותי" },
  salmon: { he: "סלמון", benefit: "חלבון איכותי ועשיר באומגה" },
  lamb: { he: "כבש", benefit: "חלבון טוב לרגישויות מסוימות" },
};

const normalizeWhitespace = (value) => String(value || "").replace(/\s+/g, " ").trim();

const decodeValue = (value) => {
  try {
    return decodeURIComponent(String(value).replace(/-/g, " ").replace(/\+/g, " "));
  } catch {
    return String(value).replace(/-/g, " ");
  }
};

const absoluteUrl = (candidate, baseUrl) => {
  if (!candidate) return "";
  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return candidate;
  }
};

const parsePrice = (value) => {
  if (!value) return null;
  const match = String(value).replace(/[₪$€,\s]/g, "").match(/(\d+(?:\.\d{1,2})?)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null;
};

const parseWeight = (value) => {
  const match = String(value || "").match(/(\d+(?:[.,]\d+)?)\s*(ק"ג|קג|ק״ג|kg|גרם|g|gr|ליטר|l|lt)\b/i);
  if (!match) return null;
  const weight = Number(match[1].replace(",", "."));
  const rawUnit = match[2].toLowerCase();
  let unit = "kg";
  if (rawUnit.includes("גר") || rawUnit === "g" || rawUnit === "gr") unit = "g";
  if (rawUnit.includes("ליטר") || rawUnit === "l" || rawUnit === "lt") unit = "L";
  return { weight, unit };
};

const fetchWithTimeout = async (url, init = {}, timeoutMs = 35000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const scrapeUrl = async (url) => {
  const safeUrl = (await validateRemoteHttpUrl(url)).toString();
  if (firecrawlApiKey) {
    const response = await fetchWithTimeout("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        authorization: `Bearer ${firecrawlApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        url: safeUrl,
        formats: ["html", "rawHtml", "markdown", "links"],
        onlyMainContent: false,
        waitFor: 3000,
      }),
    }, 50000);

    if (response.ok) {
      const data = await response.json();
      const payload = data.data || data;
      let sourceUrl = safeUrl;
      if (payload.sourceUrl) {
        try {
          sourceUrl = (await validateRemoteHttpUrl(payload.sourceUrl)).toString();
        } catch {
          // Keep the validated requested URL when provider metadata is unsafe.
        }
      }
      return {
        html: payload.rawHtml || payload.html || "",
        markdown: payload.markdown || "",
        metadata: payload.metadata || {},
        sourceUrl,
        statusCode: payload.statusCode,
        provider: "firecrawl",
      };
    }
  }

  const { response, finalUrl } = await fetchValidatedRemoteUrl(safeUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; MipoProductImporter/1.0)",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch URL (${response.status})`);
  const html = await response.text();
  return {
    html,
    markdown: "",
    metadata: {},
    sourceUrl: finalUrl,
    statusCode: response.status,
    provider: "direct",
  };
};

const parseJsonLdProducts = ($) => {
  const products = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).contents().text();
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed, ...(parsed["@graph"] || [])];
      for (const item of items) {
        if (item?.["@type"] === "Product" || item?.["@type"]?.includes?.("Product")) {
          products.push(item);
        }
      }
    } catch {
      // Ignore invalid structured-data blocks.
    }
  });
  return products;
};

const inferCategory = (text) => {
  const value = text.toLowerCase();
  if (/מזון.?יבש|dry.?food|kibble|אוכל יבש/.test(value)) return "dry-food";
  if (/מזון.?רטוב|wet.?food|שימורים|פחית|פטה|pate|canned/.test(value)) return "wet-food";
  if (/חטיפ|treat|snack|לעיסה|chew/.test(value)) return "treats";
  if (/צעצוע|toy|kong|plush|squeak|פלאש|בובה/.test(value)) return "toys";
  if (/טיפוח|grooming|שמפו|shampoo|conditioner|furminator|deshedding/.test(value)) return "grooming";
  if (/רצועה|קולר|collar|leash|harness|רתמ|מחסום|muzzle/.test(value)) return "accessories";
  if (/מיטה|bed|מזרן|כרית/.test(value)) return "beds";
  if (/קערה|bowl|anti spill|אנטי שפיכה/.test(value)) return "bowls";
  if (/בריאות|vitamin|תוסף|supplement|joint|מפרק|urinary|renal|hypoallergenic/.test(value)) return "health";
  if (/פד אילוף|puppy pad|pee pad|potty|wee-wee/.test(value)) return "potty-training";
  if (/מזון|food/.test(value)) return "food";
  return null;
};

const inferPetType = (text) => {
  const value = text.toLowerCase();
  const dog = /כלב|dog|puppy|לכלבים|גורים/.test(value);
  const cat = /חתול|cat|kitten|לחתולים/.test(value);
  if (dog && cat) return "all";
  if (dog) return "dog";
  if (cat) return "cat";
  return null;
};

const extractProductFromHtml = (html, url) => {
  const truncatedHtml = html.length > 800000 ? html.slice(0, 800000) : html;
  const $ = load(truncatedHtml);
  const products = parseJsonLdProducts($);
  const jsonProduct = products[0] || {};
  const offer = Array.isArray(jsonProduct.offers) ? jsonProduct.offers[0] : jsonProduct.offers || {};

  const title = normalizeWhitespace(
    $(".product_title").first().text()
      || $("h1.entry-title").first().text()
      || $("h1.product-name").first().text()
      || $('meta[property="og:title"]').attr("content")
      || jsonProduct.name
      || $("h1").first().text()
      || $("title").text().split("|")[0].split("–")[0].split("-")[0],
  );

  const description = normalizeWhitespace(
    $(".woocommerce-product-details__short-description").first().text()
      || $(".short-description").first().text()
      || $("#tab-description").first().text()
      || $('meta[property="og:description"]').attr("content")
      || $('meta[name="description"]').attr("content")
      || jsonProduct.description,
  ).slice(0, 1600) || null;

  let brand = normalizeWhitespace(
    $(".brand-link img").attr("alt")
      || $(".brand-link").first().text()
      || $('[class*="brand"]').first().text()
      || (typeof jsonProduct.brand === "string" ? jsonProduct.brand : jsonProduct.brand?.name),
  ) || null;
  if (brand && brand.length > 80) brand = null;

  const images = [];
  const seenImages = new Set();
  const addImage = (imageUrl) => {
    let normalized = absoluteUrl(imageUrl, url);
    if (!normalized || normalized.includes("placeholder") || normalized.includes("data:image")) return;
    if (/logo|favicon|icon|payment|avatar|whatsapp/i.test(normalized)) return;
    normalized = normalized.replace(/-\d+x\d+(\.[a-zA-Z]+)(\?.*)?$/, "$1");
    if (normalized.length > 600 || seenImages.has(normalized)) return;
    seenImages.add(normalized);
    images.push(normalized);
  };

  const jsonImages = Array.isArray(jsonProduct.image) ? jsonProduct.image : [jsonProduct.image].filter(Boolean);
  jsonImages.forEach((image) => addImage(typeof image === "string" ? image : image?.url));
  addImage($('meta[property="og:image"]').attr("content"));
  $("[data-large_image]").each((_, el) => addImage($(el).attr("data-large_image")));
  $("[data-zoom-image]").each((_, el) => addImage($(el).attr("data-zoom-image")));
  $(".woocommerce-product-gallery img, .product-gallery img, img.wp-post-image").each((_, el) => {
    addImage($(el).attr("data-src") || $(el).attr("src"));
  });

  const summaryPrice = $(".summary .price, .entry-summary .price, .price").first();
  const salePrice = parsePrice(summaryPrice.find("ins .woocommerce-Price-amount bdi").first().text());
  const originalPrice = parsePrice(summaryPrice.find("del .woocommerce-Price-amount bdi").first().text());
  const firstPrice = parsePrice(summaryPrice.find(".woocommerce-Price-amount bdi").first().text());
  let basePrice = parsePrice(offer.price) || originalPrice || firstPrice;
  const htmlPrice = parsePrice((truncatedHtml.match(/₪\s*([\d,.]+)/) || [])[1]);
  if (!basePrice) basePrice = htmlPrice;

  const sku = normalizeWhitespace($(".sku").first().text() || $("[data-sku]").attr("data-sku") || jsonProduct.sku) || null;

  const productAttributes = {};
  $("#tab-additional_information table tr, .woocommerce-product-attributes tr, .shop_attributes tr").each((_, el) => {
    const key = normalizeWhitespace($(el).find("th, td:first-child").first().text());
    const value = normalizeWhitespace($(el).find("td:last-child, td").last().text());
    if (key && value && key !== value) productAttributes[key] = value;
  });

  let ingredients = null;
  const descriptionText = normalizeWhitespace($("#tab-description").text() || $(".woocommerce-Tabs-panel--description").text());
  const ingredientsMatch = descriptionText.match(/רכיבים[:\s]+(.+?)(?:תוספי|ערכים|המלצות|הנחיות|מידע נוסף|$)/i);
  if (ingredientsMatch) ingredients = normalizeWhitespace(ingredientsMatch[1]).slice(0, 1400);

  const benefits = [];
  $("#tab-description h4, #tab-description h3, .woocommerce-Tabs-panel--description h4, .woocommerce-Tabs-panel--description h3").each((_, el) => {
    const heading = normalizeWhitespace($(el).text().replace(/^\d+\.\s*/, ""));
    if (!heading || /רכיבים|המלצ|הנחיות|מידע/.test(heading)) return;
    let text = "";
    let next = $(el).next();
    while (next.length && !next.is("h2,h3,h4,hr,table")) {
      const nextText = normalizeWhitespace(next.text());
      if (nextText) text += `${text ? " " : ""}${nextText}`;
      next = next.next();
    }
    if (text) benefits.push({ title: heading, description: text.slice(0, 500) });
  });

  const feedingGuide = [];
  $("table tr").each((_, el) => {
    const cells = $(el).find("td");
    if (cells.length >= 2) {
      const range = normalizeWhitespace($(cells[0]).text());
      const amount = normalizeWhitespace($(cells[1]).text());
      if (range && amount && /\d/.test(`${range} ${amount}`)) feedingGuide.push({ range, amount });
    }
  });

  const variants = [];
  const variationsAttr = $("[data-product_variations]").attr("data-product_variations");
  if (variationsAttr) {
    try {
      const variations = JSON.parse(variationsAttr.replace(/&quot;/g, "\"").replace(/&amp;/g, "&"));
      if (Array.isArray(variations)) {
        for (const variation of variations.slice(0, 50)) {
          const labelParts = [];
          for (const value of Object.values(variation.attributes || {})) {
            if (value) labelParts.push(decodeValue(value));
          }
          const label = labelParts.join(" - ") || `וריאנט ${variants.length + 1}`;
          const parsedWeight = parseWeight(label);
          variants.push({
            label,
            weight: parsedWeight?.weight ?? null,
            weight_unit: parsedWeight?.unit ?? null,
            price: variation.display_regular_price || variation.display_price || null,
            sale_price: variation.display_regular_price > variation.display_price ? variation.display_price : null,
            sku: variation.sku || null,
          });
        }
      }
    } catch {
      // Continue with select fallback.
    }
  }

  if (variants.length === 0) {
    $('select[id*="attribute"], select[name*="attribute"], select[id*="weight"], select[id*="size"]').each((_, selectEl) => {
      $(selectEl).find("option").each((__, optionEl) => {
        const value = $(optionEl).attr("value");
        const label = normalizeWhitespace($(optionEl).text());
        if (!value || !label || /בחר|choose/i.test(label)) return;
        const parsedWeight = parseWeight(label);
        variants.push({
          label: decodeValue(label),
          weight: parsedWeight?.weight ?? null,
          weight_unit: parsedWeight?.unit ?? null,
          price: basePrice,
          sale_price: salePrice,
          sku: null,
        });
      });
    });
  }

  if (variants.length === 0 && title) {
    const parsedWeight = parseWeight(title);
    if (parsedWeight) {
      variants.push({
        label: `${parsedWeight.weight} ${parsedWeight.unit === "kg" ? "ק\"ג" : parsedWeight.unit === "g" ? "גרם" : parsedWeight.unit}`,
        weight: parsedWeight.weight,
        weight_unit: parsedWeight.unit,
        price: basePrice,
        sale_price: salePrice,
        sku,
      });
    }
  }

  const combinedText = `${url} ${title} ${description || ""} ${$(".woocommerce-breadcrumb, .breadcrumb").text()} ${Object.values(productAttributes).join(" ")}`;
  const category = inferCategory(combinedText);
  const petType = inferPetType(combinedText);

  return {
    product: {
      title,
      brand,
      description,
      images: images.slice(0, 20),
      currency: offer.priceCurrency || "ILS",
      basePrice,
      salePrice: salePrice || null,
      sku,
      category,
      petType,
      ingredients,
      benefits: benefits.slice(0, 8),
      feedingGuide,
      productAttributes,
      lifeStage: productAttributes["שלב בחיים"] || null,
      dogSize: productAttributes["גודל הכלב"] || null,
      specialDiet: productAttributes["תזונה מיוחדת"]
        ? String(productAttributes["תזונה מיוחדת"]).split(",").map((item) => item.trim()).filter(Boolean)
        : [],
    },
    variants,
    feedingGuide,
    debug: {
      extraction: "cheerio",
      provider: firecrawlApiKey ? "firecrawl_or_direct" : "direct",
    },
  };
};

const toImportedProduct = (extracted, sourceUrl) => ({
  source_url: sourceUrl,
  title: extracted.product.title,
  brand: extracted.product.brand,
  description: extracted.product.description,
  images: extracted.product.images,
  currency: extracted.product.currency,
  basePrice: extracted.product.basePrice,
  salePrice: extracted.product.salePrice,
  sku: extracted.product.sku,
  variants: extracted.variants,
  category: extracted.product.category,
  petType: extracted.product.petType,
  ingredients: extracted.product.ingredients,
  benefits: extracted.product.benefits,
  feedingGuide: extracted.feedingGuide,
  productAttributes: extracted.product.productAttributes,
  lifeStage: extracted.product.lifeStage,
  dogSize: extracted.product.dogSize,
  specialDiet: extracted.product.specialDiet,
});

const detectPageType = (html, url) => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("/product/") && !lowerUrl.includes("/product-category/")) return "product";
  if (/\/category\/|\/shop\/|product-category/.test(lowerUrl)) return "list";

  const $ = load(html.slice(0, 600000));
  const hasProductStructuredData = parseJsonLdProducts($).length > 0;
  const productSignals = [
    ".single-product",
    ".woocommerce-product-gallery",
    ".product_title",
    "[data-product_variations]",
    "form.cart",
  ].filter((selector) => $(selector).length > 0).length;
  const listCount = $(".woocommerce-loop-product__link, li.product, .product-card, .product-item").length;

  if (hasProductStructuredData || productSignals >= 2) return "product";
  return listCount > 3 ? "list" : "product";
};

const extractProductLinks = (html, baseUrl, sameDomainOnly = true) => {
  const $ = load(html);
  const links = [];
  const seen = new Set();
  const baseHost = new URL(baseUrl).hostname.replace(/^www\./, "");

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const text = `${$(el).attr("class") || ""} ${$(el).closest("li,div,article").attr("class") || ""} ${href || ""}`;
    if (!/product|מוצר|woocommerce|shop/i.test(text)) return;

    const resolved = absoluteUrl(href, baseUrl);
    if (!resolved || seen.has(resolved)) return;
    const urlLower = resolved.toLowerCase();
    if (/cart|checkout|account|login|register|tag\/|author\/|blog|add-to-cart|\.jpg|\.png|\.gif|#/.test(urlLower)) return;
    if (sameDomainOnly) {
      try {
        const host = new URL(resolved).hostname.replace(/^www\./, "");
        if (host !== baseHost && !host.endsWith(`.${baseHost}`)) return;
      } catch {
        return;
      }
    }
    seen.add(resolved);
    links.push(resolved);
  });

  return links.slice(0, 80);
};

const searchProductBySku = async ({ sku, query, preferredDomains = [] }) => {
  if (!firecrawlApiKey) return null;
  const searchQuery = [sku, query].filter(Boolean).join(" ");
  const response = await fetchWithTimeout("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: {
      authorization: `Bearer ${firecrawlApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ query: searchQuery, limit: 10 }),
  }, 30000);
  if (!response.ok) return null;
  const data = await response.json();
  const results = data.data || data.results || [];
  let best = null;
  let bestScore = -100;
  for (const result of results) {
    const resultUrl = result.url || result.link || "";
    const title = String(result.title || "").toLowerCase();
    const urlLower = resultUrl.toLowerCase();
    let score = 0;
    if (urlLower.includes(String(sku).toLowerCase()) || title.includes(String(sku).toLowerCase())) score += 25;
    if (urlLower.includes("/product") || urlLower.includes("/מוצר")) score += 20;
    if (preferredDomains.some((domain) => urlLower.includes(domain.toLowerCase()))) score += 40;
    if (/cart|checkout|category/.test(urlLower)) score -= 30;
    if (score > bestScore) {
      bestScore = score;
      best = resultUrl;
    }
  }
  return best || results[0]?.url || null;
};

const callGeminiJson = async (prompt, { temperature = 0.1 } = {}) => {
  if (!geminiApiKey) return null;
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature, responseMimeType: "application/json" },
      }),
    },
    45000,
  );
  if (!response.ok) throw new Error(`Gemini request failed (${response.status})`);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
};

const callGeminiPartsJson = async (parts, { temperature = 0.1 } = {}) => {
  if (!geminiApiKey) return null;
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { temperature, responseMimeType: "application/json" },
      }),
    },
    60000,
  );
  if (!response.ok) throw new Error(`Gemini request failed (${response.status})`);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
};

const parseDataUrl = (value) => {
  const input = String(value || "");
  const match = input.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (match) {
    return {
      mimeType: match[1],
      data: match[2].replace(/\s/g, ""),
    };
  }
  return {
    mimeType: "application/octet-stream",
    data: input.replace(/\s/g, ""),
  };
};

const normalizeScannedProduct = (product, index) => {
  const name = normalizeWhitespace(product?.name || product?.title || product?.product_name || "");
  const price = parsePrice(product?.price) || parsePrice(product?.sale_price) || parsePrice(product?.regular_price) || 0;
  const category = inferCategory(`${name} ${product?.category || ""}`) || product?.category || "other";
  const petType = inferPetType(`${name} ${product?.pet_type || product?.petType || ""}`) || product?.pet_type || product?.petType || null;
  return {
    id: `scan-${Date.now()}-${index}`,
    name,
    description: normalizeWhitespace(product?.description || "") || "",
    price,
    sku: normalizeWhitespace(product?.sku || product?.barcode || "") || "",
    category,
    image_url: "",
    in_stock: true,
    petType,
    brand: normalizeWhitespace(product?.brand || "") || undefined,
    ingredients: normalizeWhitespace(product?.ingredients || "") || null,
    benefits: Array.isArray(product?.benefits) ? product.benefits : [],
    feeding_guide: Array.isArray(product?.feeding_guide) ? product.feeding_guide : [],
    product_attributes: product?.product_attributes && typeof product.product_attributes === "object" ? product.product_attributes : {},
    life_stage: product?.life_stage || product?.lifeStage || null,
    dog_size: product?.dog_size || product?.dogSize || null,
    special_diet: Array.isArray(product?.special_diet) ? product.special_diet : [],
  };
};

export const scanProductList = async (body) => {
  const fileData = body.image || body.document || body.file || body.data_url;
  if (!fileData || typeof fileData !== "string") {
    throw Object.assign(new Error("A base64 image or document is required"), { statusCode: 400 });
  }

  if (!geminiApiKey) {
    return {
      success: false,
      products: [],
      error: "GEMINI_API_KEY is required for image/PDF product list extraction",
    };
  }

  const file = parseDataUrl(fileData);
  const prompt = `Extract pet-shop products from this ${body.type || "catalog"}.
Return JSON only with this shape:
{"products":[{"name":string,"description":string,"price":number|string,"sku":string|null,"barcode":string|null,"category":string|null,"pet_type":"dog|cat|all|other"|null,"brand":string|null,"ingredients":string|null,"benefits":[],"feeding_guide":[],"product_attributes":{},"life_stage":string|null,"dog_size":string|null,"special_diet":[]}]}

Rules:
- Include only actual products, not headings or totals.
- Prices are Israeli shekels unless another currency is visible.
- If price is missing, use 0.
- Keep Hebrew names exactly as shown.
- Use category hints like dry-food, wet-food, treats, toys, accessories, grooming, health, beds, collars, bowls, other.`;

  const extracted = await callGeminiPartsJson([
    { text: prompt },
    { inlineData: { mimeType: file.mimeType, data: file.data } },
  ]);

  const products = Array.isArray(extracted?.products)
    ? extracted.products.map(normalizeScannedProduct).filter((product) => product.name)
    : [];

  return {
    success: true,
    products,
    data: { products },
  };
};

export const importProductsFromUrl = async (body) => {
  const { url, maxProducts = 30, maxPages = 5, sameDomainOnly = true } = body;
  if (!url || typeof url !== "string") {
    throw Object.assign(new Error("Valid URL is required"), { statusCode: 400 });
  }

  const initial = await scrapeUrl(url);
  const mode = detectPageType(initial.html, url);
  const result = {
    mode,
    source_url: url,
    products: [],
    debug: {
      productLinksFound: 0,
      pagesCrawled: 1,
      extraction: mode === "product" ? "single_product" : "list_crawl",
      provider: initial.provider,
    },
  };

  if (mode === "product") {
    result.products.push(toImportedProduct(extractProductFromHtml(initial.html, initial.sourceUrl || url), initial.sourceUrl || url));
    return { success: true, data: result };
  }

  let links = extractProductLinks(initial.html, url, sameDomainOnly);
  result.debug.productLinksFound = links.length;
  links = links.slice(0, maxProducts);

  const productResults = await Promise.allSettled(links.map(async (productUrl) => {
    const scraped = await scrapeUrl(productUrl);
    return toImportedProduct(extractProductFromHtml(scraped.html, scraped.sourceUrl || productUrl), scraped.sourceUrl || productUrl);
  }));

  for (const item of productResults) {
    if (item.status === "fulfilled" && item.value.title) result.products.push(item.value);
  }
  result.debug.pagesCrawled = Math.min(maxPages, 1);

  return { success: true, data: result };
};

export const scrapeProduct = async (body) => {
  const { mode, url, sku, query, preferredDomains } = body;
  if (!mode || !["url", "sku"].includes(mode)) {
    throw Object.assign(new Error("Mode must be 'url' or 'sku'"), { statusCode: 400 });
  }

  let finalUrl = url;
  const input = mode === "url" ? url : sku;
  if (mode === "url" && (!url || typeof url !== "string")) {
    throw Object.assign(new Error("Valid URL is required"), { statusCode: 400 });
  }
  if (mode === "sku") {
    finalUrl = await searchProductBySku({ sku, query, preferredDomains });
    if (!finalUrl) {
      return { success: false, error: "לא נמצא מוצר עם המק״ט הזה. נסה להוסיף שם מוצר או להשתמש בקישור ישיר." };
    }
  }

  const scraped = await scrapeUrl(finalUrl);
  const extracted = extractProductFromHtml(scraped.html, scraped.sourceUrl || finalUrl);
  return {
    success: true,
    data: {
      source: { mode, input, finalUrl: scraped.sourceUrl || finalUrl },
      ...extracted,
      debug: {
        ...extracted.debug,
        firecrawl: {
          sourceUrl: scraped.sourceUrl,
          statusCode: scraped.statusCode,
          provider: scraped.provider,
        },
      },
    },
  };
};

export const smartScrapeProduct = async (body) => {
  const { url } = body;
  if (!url || typeof url !== "string") {
    throw Object.assign(new Error("Valid URL is required"), { statusCode: 400 });
  }

  const scraped = await scrapeUrl(url);
  const extracted = extractProductFromHtml(scraped.html, scraped.sourceUrl || url);
  const product = extracted.product;
  const base = {
    name: product.title || "",
    brand: product.brand,
    price: product.salePrice || product.basePrice || 0,
    original_price: product.salePrice && product.basePrice && product.basePrice > product.salePrice ? product.basePrice : null,
    sale_price: product.salePrice,
    description: product.description || "",
    image_url: product.images[0] || "/placeholder.svg",
    images: product.images,
    sku: product.sku || null,
    source_url: scraped.sourceUrl || url,
    category: product.category,
    pet_type: product.petType || "all",
    ingredients: product.ingredients,
    benefits: product.benefits || [],
    feeding_guide: extracted.feedingGuide || [],
    product_attributes: product.productAttributes || {},
    life_stage: product.lifeStage,
    dog_size: product.dogSize,
    special_diet: product.specialDiet || [],
    variants: extracted.variants || [],
    needs_review: !product.ingredients,
    review_reasons: product.ingredients ? [] : ["missing_ingredients"],
  };

  if (geminiApiKey) {
    try {
      const ai = await callGeminiJson(`Extract and normalize this pet product as JSON. Keep factual data only.
Return this shape: {"name":string,"brand":string|null,"price":number,"sale_price":number|null,"original_price":number|null,"description":string,"ingredients":string|null,"benefits":[{"title":string,"description":string}],"feeding_guide":[{"range":string,"amount":string}],"product_attributes":{},"category":string|null,"pet_type":"dog|cat|all|other","life_stage":string|null,"dog_size":string|null,"special_diet":[string],"sku":string|null}

Current extraction:
${JSON.stringify(base).slice(0, 12000)}

Page text:
${(scraped.markdown || load(scraped.html).text()).slice(0, 18000)}`);
      return { success: true, data: { ...base, ...ai, source_url: base.source_url, image_url: base.image_url, images: base.images, variants: base.variants } };
    } catch (error) {
      console.error("Gemini smart scrape failed:", error);
    }
  }

  return { success: true, data: base };
};

export const enrichProductAi = async (body) => {
  if (body.productUrl) {
    const scraped = await smartScrapeProduct({ url: body.productUrl });
    if (scraped.success && scraped.data) {
      return {
        success: true,
        data: {
          name: scraped.data.name,
          description: scraped.data.description,
          category: scraped.data.category,
          suggestedPrice: scraped.data.price,
          salePrice: scraped.data.sale_price,
          petType: scraped.data.pet_type,
          imageUrl: scraped.data.image_url,
          allImageUrls: scraped.data.images,
          variants: scraped.data.variants,
          brand: scraped.data.brand,
          sku: scraped.data.sku,
        },
      };
    }
  }

  const text = `${body.productName || ""} ${body.category || ""}`;
  const fallback = {
    name: body.productName || "",
    description: "",
    category: inferCategory(text),
    suggestedPrice: null,
    salePrice: null,
    petType: inferPetType(text),
    imageSearchQuery: body.productName || body.sku || "",
    imageUrl: null,
    allImageUrls: [],
    variants: [],
    brand: null,
    sku: body.sku || null,
  };

  if (geminiApiKey && (body.productName || body.sku)) {
    try {
      const ai = await callGeminiJson(`Normalize this pet product search into factual e-commerce fields. Return JSON only with optional keys: name, description, category, suggestedPrice, salePrice, petType, imageSearchQuery, flavors, sizes, brand, sku.
Product name: ${body.productName || ""}
SKU: ${body.sku || ""}
Category hint: ${body.category || ""}`);
      return { success: true, data: { ...fallback, ...ai } };
    } catch (error) {
      console.error("Gemini enrichment failed:", error);
    }
  }

  return { success: true, data: fallback };
};

export const searchProductImage = async (body) => {
  const { query, limit = 8 } = body;
  if (!query) throw Object.assign(new Error("Query is required"), { statusCode: 400 });
  if (!firecrawlApiKey) {
    return { success: true, images: [], query, message: "Image search requires FIRECRAWL_API_KEY" };
  }

  const response = await fetchWithTimeout("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: {
      authorization: `Bearer ${firecrawlApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: `${query} product image pet`,
      limit: limit * 2,
      scrapeOptions: { formats: ["html"] },
    }),
  }, 30000);

  if (!response.ok) return { success: false, error: "Search failed", images: [] };
  const data = await response.json();
  const images = [];
  for (const result of data.data || []) {
    if (images.length >= limit) break;
    const html = result.html || "";
    const $ = load(html);
    const candidates = [
      $('meta[property="og:image"]').attr("content"),
      ...$("img").toArray().map((img) => $(img).attr("data-src") || $(img).attr("src")),
    ];
    for (const candidate of candidates) {
      if (images.length >= limit) break;
      const resolved = absoluteUrl(candidate, result.url || "");
      if (!resolved || images.includes(resolved)) continue;
      if (/logo|icon|avatar|payment|data:image/i.test(resolved)) continue;
      if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(resolved)) continue;
      images.push(resolved);
    }
  }

  return { success: true, images, query };
};

export const analyzeProductIngredients = async (body) => {
  const ingredients = String(body.ingredients || "");
  if (!ingredients.trim()) {
    throw Object.assign(new Error("Ingredients text is required"), { statusCode: 400 });
  }

  const lower = ingredients.toLowerCase();
  const redFlags = [];
  const positives = [];
  for (const [name, info] of Object.entries(FORBIDDEN_INGREDIENTS)) {
    if (lower.includes(name) || lower.includes(info.he.toLowerCase())) redFlags.push({ name, ...info });
  }
  for (const [name, info] of Object.entries(POSITIVE_INGREDIENTS)) {
    if (lower.includes(name) || lower.includes(info.he.toLowerCase())) positives.push({ name, ...info });
  }

  let ai = null;
  if (geminiApiKey) {
    try {
      ai = await callGeminiJson(`Analyze these pet food ingredients. Return JSON with keys: overall_quality_score, confidence, protein_sources, filler_ingredients, additional_red_flags, additional_positives, summary_he, first_five_analysis_he, estimated_kcal_per_kg, kcal_estimation_method.
Pet type: ${body.petType || "pet"}
Product: ${body.productName || ""}
Category: ${body.category || ""}
Ingredients: ${ingredients}`);
    } catch (error) {
      console.error("Gemini ingredient analysis failed:", error);
    }
  }

  const allFlags = [...redFlags, ...(ai?.additional_red_flags || [])];
  const allPositives = [...positives, ...(ai?.additional_positives || [])];
  const uniqueFlags = allFlags.filter((flag, index, arr) => arr.findIndex((item) => item.name === flag.name) === index);
  const uniquePositives = allPositives.filter((item, index, arr) => arr.findIndex((other) => other.name === item.name) === index);
  const criticalCount = uniqueFlags.filter((flag) => flag.severity === "critical").length;
  const warningCount = uniqueFlags.filter((flag) => flag.severity === "warning").length;
  const score = ai?.overall_quality_score ?? Math.max(1, Math.min(10, 8 + uniquePositives.length * 0.3 - criticalCount * 3 - warningCount));

  return {
    success: true,
    verdict: criticalCount > 0 ? "danger" : warningCount >= 2 ? "caution" : "safe",
    qualityScore: Math.round(score * 10) / 10,
    confidence: ai?.confidence || (ingredients.length > 50 ? 0.8 : 0.4),
    redFlags: uniqueFlags,
    positives: uniquePositives,
    proteinSources: ai?.protein_sources || [],
    fillerIngredients: ai?.filler_ingredients || [],
    summaryHe: ai?.summary_he || null,
    firstFiveAnalysis: ai?.first_five_analysis_he || null,
    estimatedKcalPerKg: ai?.estimated_kcal_per_kg || null,
    kcalEstimationMethod: ai?.kcal_estimation_method || null,
    stats: {
      totalRedFlags: uniqueFlags.length,
      criticalCount,
      warningCount,
      infoCount: uniqueFlags.filter((flag) => flag.severity === "info").length,
      positiveCount: uniquePositives.length,
    },
  };
};

const similarity = (first, second) => {
  const one = String(first || "").toLowerCase();
  const two = String(second || "").toLowerCase();
  if (!one || !two) return 0;
  const longer = one.length > two.length ? one : two;
  const shorter = one.length > two.length ? two : one;
  if (longer.includes(shorter)) return shorter.length / longer.length + 0.3;
  const wordsOne = new Set(one.split(/\s+/).filter(Boolean));
  const wordsTwo = new Set(two.split(/\s+/).filter(Boolean));
  const common = [...wordsOne].filter((word) => wordsTwo.has(word)).length;
  const total = new Set([...wordsOne, ...wordsTwo]).size;
  return total ? common / total : 0;
};

export const productDuplicateCheck = async (pool, body) => {
  const { productName, productId, sku, threshold = 0.7 } = body;
  const params = [];
  let whereClause = "";
  if (productId) {
    params.push(productId);
    whereClause = "where id <> $1";
  }
  const result = await pool.query(
    `select id, name, sku, image_url, price, category from public.business_products ${whereClause} order by created_at desc limit 1000`,
    params,
  );
  const duplicates = [];
  const possibleDuplicates = [];

  for (const product of result.rows) {
    if (sku && product.sku && String(sku).toLowerCase() === String(product.sku).toLowerCase()) {
      duplicates.push({ ...product, matchType: "sku", matchScore: 1, reason: "מק\"ט זהה" });
      continue;
    }
    const score = similarity(productName, product.name);
    if (score >= 0.9) {
      duplicates.push({ ...product, matchType: "name", matchScore: score, reason: "שם כמעט זהה" });
    } else if (score >= threshold) {
      possibleDuplicates.push({ ...product, matchType: "similar", matchScore: score, reason: "שם דומה" });
    }
  }

  duplicates.sort((a, b) => b.matchScore - a.matchScore);
  possibleDuplicates.sort((a, b) => b.matchScore - a.matchScore);

  return {
    duplicates: duplicates.slice(0, 5),
    possibleDuplicates: possibleDuplicates.slice(0, 10),
    totalChecked: result.rows.length,
    hasDuplicates: duplicates.length > 0,
  };
};
