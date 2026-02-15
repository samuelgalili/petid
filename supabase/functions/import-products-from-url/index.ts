import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import * as cheerio from "https://esm.sh/cheerio@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProductVariant {
  label: string;
  weight?: number | null;
  weight_unit?: string | null;
  price?: number | null;
  sale_price?: number | null;
  sku?: string | null;
  options?: Record<string, string>;
}

interface ScrapedProduct {
  source_url: string;
  title: string;
  brand: string | null;
  description: string | null;
  images: string[];
  currency: string | null;
  basePrice: number | null;
  salePrice: number | null;
  sku: string | null;
  variants: ProductVariant[];
  category?: string | null;
  petType?: string | null;
}

interface ImportResult {
  mode: "product" | "list";
  source_url: string;
  products: ScrapedProduct[];
  debug: {
    productLinksFound: number;
    pagesCrawled: number;
    extraction: string;
  };
}

// Helper to decode URL-encoded Hebrew strings
function decodeValue(val: string): string {
  try {
    return decodeURIComponent(val.replace(/-/g, " ").replace(/\+/g, " "));
  } catch {
    return val.replace(/-/g, " ");
  }
}

// Parse weight from string like "1.5 ק"ג" or "500g" or "12 kg"
function parseWeight(str: string): { weight: number; unit: string } | null {
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*(ק"ג|קג|ק״ג|kg|KG|Kg|קילו|קילוגרם)\b/i,
    /(\d+(?:[.,]\d+)?)\s*(גרם|גר|g|gr|GR)\b/i,
    /(\d+(?:[.,]\d+)?)\s*(ליטר|L|l|lt|LT)\b/i,
  ];
  
  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match) {
      const weight = parseFloat(match[1].replace(",", "."));
      const unitRaw = match[2].toLowerCase();
      let unit = "kg";
      if (unitRaw.includes("גרם") || unitRaw.includes("גר") || unitRaw.startsWith("g")) {
        unit = "g";
      } else if (unitRaw.includes("ליטר") || unitRaw.startsWith("l")) {
        unit = "L";
      }
      return { weight, unit };
    }
  }
  return null;
}

// Parse price from string
function parsePrice(str: string): number | null {
  const cleaned = str.replace(/[₪$€]/g, "").trim();
  const match = cleaned.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (match) {
    return parseFloat(match[1].replace(",", "."));
  }
  return null;
}

// Detect if the page is a product page or a list/category page
function detectPageType(html: string, url: string): "product" | "list" {
  // Check URL patterns first - very reliable indicators
  const urlLower = url.toLowerCase();
  const isProductUrl = urlLower.includes("/product/") && !urlLower.includes("/product-category/");
  const isCategoryUrl = urlLower.includes("/product-category/") || 
                        urlLower.includes("/shop/") ||
                        urlLower.includes("/category/");
  
  if (isCategoryUrl) {
    console.log("URL pattern detected as category/list page");
    return "list";
  }
  
  if (isProductUrl) {
    console.log("URL pattern detected as product page");
    return "product";
  }
  
  // Strong product page signals
  const productSignals = [
    /"@type"\s*:\s*"Product"/i,
    /property="og:type"\s+content="product"/i,
    /content="product"\s+property="og:type"/i,
    /class="[^"]*single-product[^"]*"/i,
    /class="[^"]*product-single[^"]*"/i,
    /<form[^>]*class="[^"]*variations_form[^"]*"/i,
    /data-product_variations/i,
    /"product_type"\s*:\s*"variable"/i,
    /class="[^"]*woocommerce-product-gallery[^"]*"/i,
    /class="[^"]*product-gallery[^"]*"/i,
    /id="product-images"/i,
    /<button[^>]*add[_-]to[_-]cart/i,
    /class="[^"]*summary[^"]*entry-summary[^"]*"/i,
    /<body[^>]*class="[^"]*single-product[^"]*"/i,
  ];

  let productScore = 0;
  for (const signal of productSignals) {
    if (signal.test(html)) {
      productScore++;
    }
  }

  // List page signals
  const listSignals = [
    /class="[^"]*product-grid[^"]*"/i,
    /class="[^"]*products-grid[^"]*"/i,
    /class="[^"]*product-list[^"]*"/i,
    /class="[^"]*woocommerce-loop-product/gi,
    /class="[^"]*archive-product[^"]*"/i,
    /class="[^"]*product-category[^"]*"/i,
    /class="[^"]*shop-container[^"]*"/i,
    /<ul[^>]*class="[^"]*products[^"]*"[^>]*>/i,
    /<body[^>]*class="[^"]*archive[^"]*"/i,
    /<body[^>]*class="[^"]*woocommerce-shop[^"]*"/i,
  ];

  let listScore = 0;
  for (const signal of listSignals) {
    if (signal.test(html)) {
      listScore++;
    }
  }

  // Count product cards on page - only count real product listing cards, not related products
  const productCardMatches = html.match(/class="[^"]*type-product[^"]*product-category/gi) || [];
  const loopProductMatches = html.match(/class="[^"]*woocommerce-loop-product__link/gi) || [];
  const cardCount = Math.max(productCardMatches.length, loopProductMatches.length);
  
  if (cardCount > 8) {
    listScore += 3;
  } else if (cardCount > 4) {
    listScore += 2;
  }

  console.log(`Page detection: productScore=${productScore}, listScore=${listScore}, productCards=${cardCount}`);

  // Product page if has strong product signals
  if (productScore >= 3) {
    return "product";
  }
  
  if (productScore >= 2 && listScore <= 1) {
    return "product";
  }

  return "list";
}

// Extract product links from a list/category page
function extractProductLinks(html: string, baseUrl: string, sameDomainOnly: boolean): string[] {
  const links: string[] = [];
  const seenUrls = new Set<string>();
  
  let baseDomain = "";
  try {
    baseDomain = new URL(baseUrl).hostname;
  } catch {}

  // Patterns to find product links
  const linkPatterns = [
    /<a[^>]*class="[^"]*woocommerce-LoopProduct-link[^"]*"[^>]*href="([^"]+)"/gi,
    /<li[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"/gi,
    /<div[^>]*class="[^"]*product-item[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"/gi,
    /<a[^>]*data-product-id[^>]*href="([^"]+)"/gi,
    /<div[^>]*class="[^"]*product[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"/gi,
    /<a[^>]*class="[^"]*product-thumbnail[^"]*"[^>]*href="([^"]+)"/gi,
  ];

  for (const pattern of linkPatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      let url = match[1];
      if (!url) continue;

      // Make absolute URL
      if (url.startsWith("//")) {
        url = "https:" + url;
      } else if (url.startsWith("/")) {
        try {
          const urlObj = new URL(baseUrl);
          url = urlObj.origin + url;
        } catch {}
      } else if (!url.startsWith("http")) {
        continue;
      }

      // Filter out non-product URLs
      const urlLower = url.toLowerCase();
      if (
        urlLower.includes("/cart") ||
        urlLower.includes("/checkout") ||
        urlLower.includes("/my-account") ||
        urlLower.includes("/login") ||
        urlLower.includes("/register") ||
        urlLower.includes("/tag/") ||
        urlLower.includes("/author/") ||
        urlLower.includes("/blog/") ||
        urlLower.includes("#") ||
        urlLower.includes("?add-to-cart") ||
        urlLower.endsWith(".jpg") ||
        urlLower.endsWith(".png") ||
        urlLower.endsWith(".gif")
      ) {
        continue;
      }

      // Check same domain if required
      if (sameDomainOnly && baseDomain) {
        try {
          const linkDomain = new URL(url).hostname;
          if (!linkDomain.includes(baseDomain) && !baseDomain.includes(linkDomain)) {
            continue;
          }
        } catch {
          continue;
        }
      }

      // Deduplicate
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        links.push(url);
      }
    }
  }

  return links;
}

// Extract pagination URL (next page)
function extractNextPageUrl(html: string, currentUrl: string): string | null {
  const relNextMatch = html.match(/<a[^>]*rel="next"[^>]*href="([^"]+)"/i) ||
                       html.match(/<link[^>]*rel="next"[^>]*href="([^"]+)"/i);
  if (relNextMatch) {
    let nextUrl = relNextMatch[1];
    if (nextUrl.startsWith("/")) {
      try {
        const urlObj = new URL(currentUrl);
        nextUrl = urlObj.origin + nextUrl;
      } catch {}
    }
    return nextUrl;
  }

  const paginationPatterns = [
    /<a[^>]*class="[^"]*next[^"]*"[^>]*href="([^"]+)"/i,
    /<a[^>]*aria-label="[^"]*next[^"]*"[^>]*href="([^"]+)"/i,
    /<a[^>]*href="([^"]*[?&]page=\d+[^"]*)">.*?(?:הבא|Next|→|›)/i,
  ];

  for (const pattern of paginationPatterns) {
    const match = html.match(pattern);
    if (match) {
      let nextUrl = match[1];
      if (nextUrl.startsWith("/")) {
        try {
          const urlObj = new URL(currentUrl);
          nextUrl = urlObj.origin + nextUrl;
        } catch {}
      }
      return nextUrl;
    }
  }

  return null;
}

// Extract single product from HTML - CHEERIO VERSION
function extractSingleProduct(html: string, url: string): ScrapedProduct {
  const $ = cheerio.load(html);
  
  const product: ScrapedProduct = {
    source_url: url,
    title: "",
    brand: null,
    description: null,
    images: [],
    currency: "ILS",
    basePrice: null,
    salePrice: null,
    sku: null,
    variants: [],
    category: null,
    petType: null,
  };

  // ==================== TITLE ====================
  product.title =
    $(".product_title").text().trim() ||
    $("h1.entry-title").text().trim() ||
    $("h1.product-name").text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    "";

  // Filter widget titles
  if (!product.title || product.title.length < 3 || 
      product.title.toLowerCase().includes("joinchat") || product.title.toLowerCase().includes("whatsapp")) {
    product.title = $("h1").first().text().trim() || $("title").text().split("|")[0].split("–")[0].trim() || "";
  }

  // JSON-LD fallback
  if (!product.title || product.title.length < 3) {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || "");
        if (data["@type"] === "Product" && data.name) product.title = data.name;
      } catch {}
    });
  }

  // ==================== BRAND ====================
  product.brand =
    $(".brand-link img").attr("alt")?.trim() ||
    $(".brand-link").text().trim() ||
    null;
  
  if (!product.brand) {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || "");
        if (data["@type"] === "Product" && data.brand) {
          product.brand = typeof data.brand === "string" ? data.brand : data.brand.name || null;
        }
      } catch {}
    });
  }

  // Brand from known brand list in title
  if (!product.brand && product.title) {
    const knownBrands = [
      "קוואטרו", "רויאל קנין", "הילס", "פרו פלאן", "אקנה", "אוריג'ן",
      "בריט", "מונג'", "גארד", "נאצ'ר", "טייסט", "פרמיו", "ג'וסרה",
      "האפי דוג", "וולף", "בלקנדו", "לנדור", "גרנדורף", "סם",
      "נוטרם", "פרסט צ'ויס", "גו", "נאו", "אדוונס", "יוקנובה",
    ];
    for (const brand of knownBrands) {
      if (product.title.includes(brand)) {
        product.brand = brand;
        break;
      }
    }
  }

  // ==================== DESCRIPTION ====================
  product.description =
    $(".woocommerce-product-details__short-description").text().trim().substring(0, 1000) ||
    $(".short-description").text().trim().substring(0, 1000) ||
    $("#tab-description").text().trim().substring(0, 1000) ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    null;

  // ==================== SKU ====================
  product.sku = $(".sku").text().trim() || $('[data-sku]').attr("data-sku") || null;
  if (product.sku && product.sku.length > 50) product.sku = null;

  // ==================== IMAGES ====================
  const imageUrls: string[] = [];
  const seenImageBasenames = new Set<string>();
  const addImage = (imgUrl: string | undefined) => {
    if (!imgUrl) return;
    if (imgUrl.startsWith("//")) imgUrl = "https:" + imgUrl;
    if (!imgUrl || imgUrl.includes("placeholder") || imgUrl.includes("data:image") ||
        imgUrl.length < 10 || imgUrl.length > 500) return;
    // Skip site-wide assets
    if (imgUrl.includes("/logo") || imgUrl.includes("/icon") || imgUrl.includes("/favicon") ||
        imgUrl.includes("/banner") || imgUrl.includes("/widget") || imgUrl.includes("/whatsapp")) return;
    // Deduplicate by basename (ignore size suffixes like -600x600)
    const basename = imgUrl.split("/").pop()?.replace(/-\d+x\d+/, "") || imgUrl;
    if (seenImageBasenames.has(basename) || imageUrls.includes(imgUrl)) return;
    seenImageBasenames.add(basename);
    imageUrls.push(imgUrl);
  };

  // Only extract images from the product gallery section, NOT related products
  const gallerySection = $(".woocommerce-product-gallery, .product-gallery, .product-images, .single-product-image");
  if (gallerySection.length > 0) {
    gallerySection.find("[data-large_image]").each((_, el) => addImage($(el).attr("data-large_image")));
    gallerySection.find("[data-zoom-image]").each((_, el) => addImage($(el).attr("data-zoom-image")));
    gallerySection.find(".woocommerce-product-gallery__image img").each((_, el) => addImage($(el).attr("data-src") || $(el).attr("src")));
    gallerySection.find("img.wp-post-image").each((_, el) => addImage($(el).attr("src")));
  }
  
  // Fallback: og:image if gallery had no results
  if (imageUrls.length === 0) {
    addImage($('meta[property="og:image"]').attr("content"));
  }
  // If still no images, try main product area only (not related/recommended sections)
  if (imageUrls.length === 0) {
    $(".summary img, .product-summary img, .entry-summary img").each((_, el) => addImage($(el).attr("src")));
    $("img.wp-post-image").first().each((_, el) => addImage($(el).attr("src")));
  }

  product.images = imageUrls.slice(0, 10);

  // ==================== PRICES ====================
  // Priority 1: JSON-LD structured data (most reliable)
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || "");
      if (data["@type"] === "Product" && data.offers) {
        const offer = Array.isArray(data.offers) ? data.offers[0] : data.offers;
        if (offer.price && !product.basePrice) {
          const p = parseFloat(String(offer.price));
          if (!isNaN(p) && p > 0 && p < 100000) product.basePrice = Math.round(p * 100) / 100;
        }
        if (offer.priceCurrency) product.currency = offer.priceCurrency;
      }
    } catch {}
  });

  // Priority 2: WooCommerce price elements - use .first() carefully and extract only first price match
  if (!product.basePrice) {
    const firstPriceEl = $(".summary .woocommerce-Price-amount bdi, .entry-summary .woocommerce-Price-amount bdi").first();
    if (firstPriceEl.length) {
      const priceText = firstPriceEl.text().replace(/[^\d.,]/g, "").trim();
      const match = priceText.match(/^(\d+(?:[.,]\d{1,2})?)/);
      if (match) product.basePrice = parseFloat(match[1].replace(",", "."));
    }
  }

  // Sale price: look for ins (sale) and del (original) within the summary only
  const summaryPrices = $(".summary .price, .entry-summary .price").first();
  const salePriceEl = summaryPrices.find("ins .woocommerce-Price-amount bdi").first();
  const originalPriceEl = summaryPrices.find("del .woocommerce-Price-amount bdi").first();
  
  if (salePriceEl.length) {
    const saleText = salePriceEl.text().replace(/[^\d.,]/g, "").trim();
    const saleMatch = saleText.match(/^(\d+(?:[.,]\d{1,2})?)/);
    if (saleMatch) product.salePrice = parseFloat(saleMatch[1].replace(",", "."));
  }
  if (originalPriceEl.length) {
    const origText = originalPriceEl.text().replace(/[^\d.,]/g, "").trim();
    const origMatch = origText.match(/^(\d+(?:[.,]\d{1,2})?)/);
    if (origMatch) product.basePrice = parseFloat(origMatch[1].replace(",", "."));
  }

  // Round prices to 2 decimal places
  if (product.basePrice) product.basePrice = Math.round(product.basePrice * 100) / 100;
  if (product.salePrice) product.salePrice = Math.round(product.salePrice * 100) / 100;

  if (!product.basePrice && product.salePrice) {
    product.basePrice = product.salePrice;
    product.salePrice = null;
  }

  // ==================== CATEGORY & PET TYPE ====================
  let decodedUrl = url.toLowerCase();
  try { decodedUrl = decodeURIComponent(url).toLowerCase(); } catch {}
  const additionalInfoText = $("#tab-additional_information, .woocommerce-product-attributes, .shop_attributes").text().toLowerCase();
  const fullText = `${decodedUrl} ${product.title.toLowerCase()} ${(product.description || "").toLowerCase()} ${additionalInfoText}`;
  const breadcrumbs = $(".woocommerce-breadcrumb, .breadcrumb, nav[aria-label='breadcrumb']").text().toLowerCase();
  const catText = `${fullText} ${breadcrumbs}`;
  
  // Category detection - more specific first, then general
  if (/מזון.?יבש|dry.?food|kibble|אוכל יבש/.test(catText)) product.category = "dry-food";
  else if (/מזון.?רטוב|wet.?food|שימורים|אוכל רטוב/.test(catText)) product.category = "wet-food";
  else if (/חטיפ|treat|snack/.test(catText)) product.category = "treats";
  else if (/צעצוע|toy/.test(catText)) product.category = "toys";
  else if (/טיפוח|grooming|שמפו/.test(catText)) product.category = "grooming";
  else if (/רצועה|קולר|collar|leash|harness|רתמ/.test(catText)) product.category = "accessories";
  else if (/מזון|food|סופר.?פרמיום/.test(catText)) product.category = "dry-food";
  else if (/בריאות|vitamin|תוסף/.test(catText)) product.category = "health";
  
  // Pet type detection
  if (/כלב|dog|לכלבים|גור/.test(catText)) product.petType = "dog";
  else if (/חתול|cat|לחתולים/.test(catText)) product.petType = "cat";
  else if (/ציפור|bird|תוכי/.test(catText)) product.petType = "bird";
  else if (/דג|fish|אקווריום/.test(catText)) product.petType = "fish";

  // ==================== INGREDIENTS ====================
  const descriptionHtml = $("#tab-description").html() || $(".woocommerce-Tabs-panel--description").html() || "";
  const ingredientsMatch = descriptionHtml.match(/רכיבים[:\s]*<\/[^>]*>\s*([\s\S]*?)(?:<h[2-6]|<hr|תוספי תזונה|ערכים תזונתיים|$)/i);
  if (ingredientsMatch) {
    const ingredientsEl = cheerio.load(`<div>${ingredientsMatch[1]}</div>`);
    (product as any).ingredients = ingredientsEl("div").text().trim().replace(/\s+/g, " ").substring(0, 1000);
  }
  if (!(product as any).ingredients) {
    const fullDescText = $("#tab-description").text() || "";
    const ingIdx = fullDescText.indexOf("רכיבים:");
    if (ingIdx !== -1) {
      const afterIng = fullDescText.substring(ingIdx + 7).trim();
      const endIdx = afterIng.search(/\n\s*(תוספי|המלצ|הנחי|מידע|ערכים)/);
      (product as any).ingredients = (endIdx > 0 ? afterIng.substring(0, endIdx) : afterIng.substring(0, 500)).trim();
    }
  }

  // ==================== BENEFITS ====================
  (product as any).benefits = [];
  $("#tab-description h4, #tab-description h3, .woocommerce-Tabs-panel--description h4, .woocommerce-Tabs-panel--description h3").each((_, el) => {
    const heading = $(el).text().trim().replace(/^\d+\.\s*/, "").replace(/\*\*/g, "").replace(/-$/, "").trim();
    if (!heading || heading.includes("המלצת") || heading.includes("הנחיות") || heading.includes("רכיבים") || heading.includes("הכמות") || heading.length < 4) return;
    
    let desc = "";
    let next = $(el).next();
    while (next.length && !next.is("h3, h4, h2, hr, table")) {
      const text = next.text().trim();
      if (text) desc += (desc ? " " : "") + text;
      next = next.next();
    }
    if (desc && heading.length > 3) {
      (product as any).benefits.push({ title: heading, description: desc.substring(0, 500) });
    }
  });

  // ==================== FEEDING GUIDE TABLE ====================
  (product as any).feedingGuide = [];
  $("table tr").each((_, el) => {
    const cells = $(el).find("td");
    if (cells.length >= 2) {
      const range = $(cells[0]).text().trim();
      const amount = $(cells[1]).text().trim();
      if (range && amount && (range.includes("קילו") || range.includes("kg") || range.includes("גרם") || /\d/.test(range))) {
        (product as any).feedingGuide.push({ range, amount });
      }
    }
  });

  // ==================== PRODUCT ATTRIBUTES ====================
  (product as any).productAttributes = {};
  $("#tab-additional_information table tr, .woocommerce-product-attributes tr, .shop_attributes tr").each((_, el) => {
    const label = $(el).find("th, td:first-child").first().text().trim();
    const value = $(el).find("td:last-child, td").last().text().trim();
    if (label && value && label !== value) {
      (product as any).productAttributes[label] = value;
    }
  });

  // ==================== LIFE STAGE & DOG SIZE & SPECIAL DIET ====================
  const attrs = (product as any).productAttributes;
  (product as any).lifeStage = attrs["שלב בחיים"] || null;
  (product as any).dogSize = attrs["גודל הכלב"] || null;
  (product as any).specialDiet = attrs["תזונה מיוחדת"] 
    ? attrs["תזונה מיוחדת"].split(",").map((s: string) => s.trim()).filter(Boolean) 
    : [];

  // SKU fallback: check JSON-LD
  if (!product.sku) {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || "");
        if (data["@type"] === "Product" && data.sku) product.sku = data.sku;
      } catch {}
    });
  }

  // ==================== VARIANTS ====================
  const variationsAttr = $("[data-product_variations]").attr("data-product_variations");
  if (variationsAttr) {
    try {
      const variationsData = JSON.parse(variationsAttr.replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
      if (Array.isArray(variationsData)) {
        for (const v of variationsData.slice(0, 50)) {
          const attrs = v.attributes || {};
          const variant: ProductVariant = {
            label: "",
            price: null,
            sale_price: null,
            sku: v.sku || null,
          };

          if (v.display_regular_price && v.display_price && v.display_regular_price > v.display_price) {
            variant.price = v.display_regular_price;
            variant.sale_price = v.display_price;
          } else if (v.display_price) {
            variant.price = v.display_price;
          }

          const labelParts: string[] = [];
          for (const [key, value] of Object.entries(attrs)) {
            if (value) {
              const decodedValue = decodeValue(String(value));
              labelParts.push(decodedValue);
              if (key.toLowerCase().includes("weight") || key.toLowerCase().includes("משקל") ||
                  key.toLowerCase().includes("size") || key.toLowerCase().includes("גודל")) {
                const parsed = parseWeight(decodedValue);
                if (parsed) { variant.weight = parsed.weight; variant.weight_unit = parsed.unit; }
              }
            }
          }
          variant.label = labelParts.join(" - ") || `וריאנט ${product.variants.length + 1}`;
          if (!variant.weight) {
            const parsed = parseWeight(variant.label);
            if (parsed) { variant.weight = parsed.weight; variant.weight_unit = parsed.unit; }
          }
          product.variants.push(variant);
        }
      }
    } catch (e) {
      console.error("Failed to parse WooCommerce variations:", e);
    }
  }

  // Select dropdown fallback
  if (product.variants.length === 0) {
    $('select[id*="attribute"], select[name*="attribute"], select[id*="weight"], select[id*="size"]').each((_, selectEl) => {
      $(selectEl).find("option").each((_, optEl) => {
        const value = $(optEl).attr("value");
        const label = $(optEl).text().trim();
        if (!value || !label || label.includes("בחר") || label === "Choose an option") return;
        const decodedLabel = decodeValue(label);
        const variant: ProductVariant = { label: decodedLabel, price: null };
        const parsed = parseWeight(decodedLabel);
        if (parsed) { variant.weight = parsed.weight; variant.weight_unit = parsed.unit; }
        product.variants.push(variant);
      });
    });
  }

  // Title weight fallback
  if (product.variants.length === 0 && product.title) {
    const titleWeight = parseWeight(product.title);
    if (titleWeight) {
      product.variants.push({
        label: `${titleWeight.weight} ${titleWeight.unit === "kg" ? 'ק"ג' : titleWeight.unit === "g" ? "גרם" : titleWeight.unit}`,
        weight: titleWeight.weight,
        weight_unit: titleWeight.unit,
        price: product.basePrice,
        sale_price: product.salePrice,
      });
    }
  }

  console.log(`Extracted: "${product.title}" with ${product.variants.length} variants, ${product.images.length} images`);
  return product;
}

// Scrape a single URL with Firecrawl
async function scrapeUrl(url: string, apiKey: string): Promise<string | null> {
  try {
    console.log("Scraping URL with Firecrawl:", url);
    
    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["rawHtml"], // Use rawHtml to get complete HTML with all scripts/data
        onlyMainContent: false,
        waitFor: 3000, // Wait for JavaScript to load variations and prices
      }),
    });

    if (!scrapeResponse.ok) {
      console.error("Firecrawl scrape error:", scrapeResponse.status, await scrapeResponse.text());
      return null;
    }

    const scrapeData = await scrapeResponse.json();
    // Try rawHtml first, then html
    const html = scrapeData.data?.rawHtml || scrapeData.data?.html || scrapeData.rawHtml || scrapeData.html || null;
    
    if (html) {
      console.log(`Received HTML: ${html.length} characters`);
      
      // Debug: Log if we find price-related content
      const hasJsonLd = html.includes('"@type":"Product"') || html.includes('"@type": "Product"');
      const hasPriceAmount = html.includes('woocommerce-Price-amount');
      const hasVariations = html.includes('data-product_variations');
      console.log(`HTML check: JSON-LD Product=${hasJsonLd}, PriceAmount=${hasPriceAmount}, Variations=${hasVariations}`);
    }
    
    return html;
  } catch (error) {
    console.error("Scrape error for", url, ":", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      url, 
      maxProducts = 30, 
      maxPages = 5, 
      sameDomainOnly = true 
    } = body;

    // Validate input
    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid URL format - must start with http:// or https://" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin authentication
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Firecrawl API key
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Importing products from URL:", url);

    // Step 1: Scrape the initial URL
    const initialHtml = await scrapeUrl(url, FIRECRAWL_API_KEY);
    if (!initialHtml) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch URL content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Detect page type
    const pageType = detectPageType(initialHtml, url);
    console.log("Detected page type:", pageType);

    const result: ImportResult = {
      mode: pageType,
      source_url: url,
      products: [],
      debug: {
        productLinksFound: 0,
        pagesCrawled: 1,
        extraction: pageType === "product" ? "single_product" : "list_crawl",
      },
    };

    if (pageType === "product") {
      // Single product - extract and return
      const product = extractSingleProduct(initialHtml, url);
      result.products.push(product);
      console.log("Single product extracted:", product.title, "with", product.variants.length, "variants");
    } else {
      // List page - extract product links and optionally follow pagination
      let allProductLinks: string[] = [];
      let currentUrl = url;
      let pagesProcessed = 0;

      while (pagesProcessed < maxPages && allProductLinks.length < maxProducts) {
        const html = pagesProcessed === 0 ? initialHtml : await scrapeUrl(currentUrl, FIRECRAWL_API_KEY);
        if (!html) break;

        const pageLinks = extractProductLinks(html, currentUrl, sameDomainOnly);
        console.log(`Page ${pagesProcessed + 1}: found ${pageLinks.length} product links`);
        
        for (const link of pageLinks) {
          if (!allProductLinks.includes(link) && allProductLinks.length < maxProducts) {
            allProductLinks.push(link);
          }
        }

        pagesProcessed++;
        result.debug.pagesCrawled = pagesProcessed;

        if (allProductLinks.length < maxProducts && pagesProcessed < maxPages) {
          const nextPageUrl = extractNextPageUrl(html, currentUrl);
          if (nextPageUrl && nextPageUrl !== currentUrl) {
            currentUrl = nextPageUrl;
            console.log("Following pagination to:", nextPageUrl);
          } else {
            break;
          }
        } else {
          break;
        }
      }

      result.debug.productLinksFound = allProductLinks.length;
      console.log(`Total product links found: ${allProductLinks.length} across ${pagesProcessed} pages`);

      // Scrape each product (with concurrency limit)
      const BATCH_SIZE = 5;
      for (let i = 0; i < allProductLinks.length; i += BATCH_SIZE) {
        const batch = allProductLinks.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (productUrl) => {
          const productHtml = await scrapeUrl(productUrl, FIRECRAWL_API_KEY);
          if (productHtml) {
            return extractSingleProduct(productHtml, productUrl);
          }
          return null;
        });

        const batchResults = await Promise.all(batchPromises);
        for (const product of batchResults) {
          if (product && product.title) {
            result.products.push(product);
          }
        }

        console.log(`Scraped batch ${Math.floor(i / BATCH_SIZE) + 1}, total products: ${result.products.length}`);
      }

      console.log(`Final: ${result.products.length} products with variants`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in import-products-from-url:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
