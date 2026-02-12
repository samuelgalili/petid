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
}

interface ScrapedProductResult {
  source: {
    mode: "url" | "sku";
    input: string;
    finalUrl: string;
  };
  product: {
    title: string;
    brand: string | null;
    description: string | null;
    images: string[];
    currency: string | null;
    basePrice: number | null;
    salePrice: number | null;
  };
  variants: ProductVariant[];
  feedingGuide: { range: string; amount: string }[];
  debug: {
    extraction: string;
    firecrawl?: Record<string, unknown>;
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

// Parse weight from string
function parseWeight(str: string): { weight: number; unit: string } | null {
  const match = str.match(/(\d+(?:[.,]\d+)?)\s*(ק"ג|קג|ק״ג|kg|KG|גרם|g|gr|ליטר|L|l)/i);
  if (match) {
    const weight = parseFloat(match[1].replace(",", "."));
    const unitRaw = match[2].toLowerCase();
    let unit = "kg";
    if (unitRaw.includes("גרם") || unitRaw.startsWith("g")) unit = "g";
    else if (unitRaw.includes("ליטר") || unitRaw.startsWith("l")) unit = "L";
    return { weight, unit };
  }
  return null;
}

// Parse price from string
function parsePrice(str: string): number | null {
  const cleaned = str.replace(/[₪$€]/g, "").trim();
  const match = cleaned.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (match) return parseFloat(match[1].replace(",", "."));
  return null;
}

// ========= CHEERIO-BASED PRODUCT EXTRACTION =========
function extractProductFromHtml(html: string, url: string): Omit<ScrapedProductResult, "source"> {
  const maxHtmlLength = 500000;
  const truncatedHtml = html.length > maxHtmlLength ? html.substring(0, maxHtmlLength) : html;
  const $ = cheerio.load(truncatedHtml);

  const result: Omit<ScrapedProductResult, "source"> = {
    product: {
      title: "",
      brand: null,
      description: null,
      images: [],
      currency: "ILS",
      basePrice: null,
      salePrice: null,
    },
    variants: [],
    feedingGuide: [],
    debug: { extraction: "cheerio" },
  };

  // ==================== TITLE ====================
  result.product.title =
    $(".product_title").text().trim() ||
    $("h1.entry-title").text().trim() ||
    $("h1.product-name").text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("h1").first().text().trim() ||
    $("title").text().split("|")[0].split("–")[0].split("-")[0].trim() ||
    "";

  // Filter out widget/chat titles
  if (result.product.title.length < 3 || 
      result.product.title.toLowerCase().includes("joinchat") ||
      result.product.title.toLowerCase().includes("whatsapp")) {
    // Fallback to JSON-LD
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || "");
        if (data["@type"] === "Product" && data.name) {
          result.product.title = data.name;
        }
      } catch {}
    });
  }

  // ==================== BRAND ====================
  result.product.brand =
    $(".brand-link img").attr("alt")?.trim() ||
    $(".brand-link").text().trim() ||
    $('[class*="brand"]').first().text().trim() ||
    null;
  
  // Try JSON-LD for brand
  if (!result.product.brand) {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || "");
        if (data["@type"] === "Product" && data.brand) {
          result.product.brand = typeof data.brand === "string" ? data.brand : data.brand.name || null;
        }
      } catch {}
    });
  }

  // ==================== DESCRIPTION ====================
  result.product.description =
    $(".woocommerce-product-details__short-description").text().trim().substring(0, 1000) ||
    $(".short-description").text().trim().substring(0, 1000) ||
    $("#tab-description").text().trim().substring(0, 1000) ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    null;

  // ==================== SKU ====================
  const sku =
    $(".sku").text().trim() ||
    $('[data-sku]').attr("data-sku") ||
    null;

  // ==================== IMAGES ====================
  const imageUrls: string[] = [];
  const addImage = (imgUrl: string | undefined) => {
    if (!imgUrl) return;
    if (imgUrl.startsWith("//")) imgUrl = "https:" + imgUrl;
    if (imgUrl && !imgUrl.includes("placeholder") && !imgUrl.includes("logo") && 
        !imgUrl.includes("icon") && !imgUrl.includes("data:image") &&
        !imgUrl.includes("avatar") && !imgUrl.includes("payment") &&
        imgUrl.length < 500 && !imageUrls.includes(imgUrl)) {
      imageUrls.push(imgUrl);
    }
  };

  // OG image
  addImage($('meta[property="og:image"]').attr("content"));
  
  // WooCommerce gallery images
  $("[data-large_image]").each((_, el) => addImage($(el).attr("data-large_image")));
  $("[data-zoom-image]").each((_, el) => addImage($(el).attr("data-zoom-image")));
  
  // Product gallery images
  $(".woocommerce-product-gallery__image img").each((_, el) => {
    addImage($(el).attr("data-src") || $(el).attr("src"));
  });
  $("img.wp-post-image").each((_, el) => addImage($(el).attr("src")));

  result.product.images = imageUrls.slice(0, 20);

  // ==================== PRICES ====================
  // JSON-LD first (most reliable)
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || "");
      if (data["@type"] === "Product" && data.offers) {
        const offer = Array.isArray(data.offers) ? data.offers[0] : data.offers;
        if (offer.price && !result.product.basePrice) {
          result.product.basePrice = parseFloat(String(offer.price));
        }
        if (offer.priceCurrency) result.product.currency = offer.priceCurrency;
      }
    } catch {}
  });

  // WooCommerce price elements
  if (!result.product.basePrice) {
    const priceText = $(".woocommerce-Price-amount bdi").first().text().replace(/[^\d.,]/g, "");
    if (priceText) result.product.basePrice = parseFloat(priceText.replace(",", "."));
  }

  // Sale / original prices
  const salePriceText = $("ins .woocommerce-Price-amount bdi").text().replace(/[^\d.,]/g, "");
  const originalPriceText = $("del .woocommerce-Price-amount bdi").text().replace(/[^\d.,]/g, "");
  
  if (salePriceText) result.product.salePrice = parseFloat(salePriceText.replace(",", "."));
  if (originalPriceText) result.product.basePrice = parseFloat(originalPriceText.replace(",", "."));

  // Fallback: any price with ₪
  if (!result.product.basePrice && !result.product.salePrice) {
    const priceMatch = truncatedHtml.match(/₪\s*(\d+(?:[.,]\d{1,2})?)/);
    if (priceMatch) result.product.basePrice = parseFloat(priceMatch[1].replace(",", "."));
  }

  if (!result.product.basePrice && result.product.salePrice) {
    result.product.basePrice = result.product.salePrice;
    result.product.salePrice = null;
  }

  // ==================== FEEDING GUIDE TABLE ====================
  $("table tr").each((_, el) => {
    const cells = $(el).find("td");
    if (cells.length >= 2) {
      const range = $(cells[0]).text().trim();
      const amount = $(cells[1]).text().trim();
      if (range && amount && (range.includes("קילו") || range.includes("kg") || range.includes("גרם") || /\d/.test(range))) {
        result.feedingGuide.push({ range, amount });
      }
    }
  });

  // ==================== VARIANTS ====================
  // Method 1: WooCommerce data-product_variations
  const variationsAttr = $("[data-product_variations]").attr("data-product_variations");
  if (variationsAttr) {
    try {
      const variationsData = JSON.parse(variationsAttr.replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
      if (Array.isArray(variationsData) && variationsData.length > 0) {
        result.debug.extraction = "cheerio_woocommerce_variations";
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

          variant.label = labelParts.join(" - ") || `וריאנט ${result.variants.length + 1}`;
          if (!variant.weight) {
            const parsed = parseWeight(variant.label);
            if (parsed) { variant.weight = parsed.weight; variant.weight_unit = parsed.unit; }
          }
          result.variants.push(variant);
        }
      }
    } catch (e) {
      console.error("Failed to parse WooCommerce variations:", e);
    }
  }

  // Method 2: Select dropdowns
  if (result.variants.length === 0) {
    $('select[id*="attribute"], select[name*="attribute"], select[id*="weight"], select[id*="size"]').each((_, selectEl) => {
      $(selectEl).find("option").each((_, optEl) => {
        const value = $(optEl).attr("value");
        const label = $(optEl).text().trim();
        if (!value || !label || label.includes("בחר") || label === "Choose an option") return;
        const decodedLabel = decodeValue(label);
        const variant: ProductVariant = { label: decodedLabel, price: null };
        const parsed = parseWeight(decodedLabel);
        if (parsed) { variant.weight = parsed.weight; variant.weight_unit = parsed.unit; }
        result.variants.push(variant);
      });
    });
  }

  // If no variants, try to extract weight from title
  if (result.variants.length === 0 && result.product.title) {
    const titleWeight = parseWeight(result.product.title);
    if (titleWeight) {
      result.variants.push({
        label: `${titleWeight.weight} ${titleWeight.unit === "kg" ? 'ק"ג' : titleWeight.unit === "g" ? "גרם" : titleWeight.unit}`,
        weight: titleWeight.weight,
        weight_unit: titleWeight.unit,
        price: result.product.basePrice,
        sale_price: result.product.salePrice,
      });
    }
  }

  // ==================== CATEGORY & PET TYPE ====================
  let decodedUrl = url.toLowerCase();
  try { decodedUrl = decodeURIComponent(url).toLowerCase(); } catch {}

  if (decodedUrl.includes("מזון-יבש") || decodedUrl.includes("dry-food") || decodedUrl.includes("dry")) {
    result.debug.extraction += "|category:dry-food";
  }

  if (decodedUrl.includes("כלב") || decodedUrl.includes("dog") || result.product.title.toLowerCase().includes("כלב")) {
    // pet type detected from URL
  }

  console.log(`Extracted: "${result.product.title}", ${result.product.images.length} images, ${result.variants.length} variants, ${result.feedingGuide.length} feeding rows`);
  return result;
}

// Search for product URL by SKU using Firecrawl search
async function searchProductBySku(
  sku: string,
  query: string | undefined,
  preferredDomains: string[] | undefined,
  apiKey: string
): Promise<string | null> {
  const searchQuery = query ? `${sku} ${query}` : sku;
  console.log("Searching for product with query:", searchQuery);

  try {
    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: searchQuery, limit: 10 }),
    });

    if (!searchResponse.ok) {
      console.error("Firecrawl search error:", searchResponse.status);
      return null;
    }

    const searchData = await searchResponse.json();
    const results = searchData.data || searchData.results || [];
    if (results.length === 0) return null;

    let bestUrl = "";
    let bestScore = -100;

    for (const r of results) {
      const rUrl = r.url || r.link || "";
      const title = (r.title || "").toLowerCase();
      const urlLower = rUrl.toLowerCase();
      let score = 0;

      if (preferredDomains) {
        for (const domain of preferredDomains) {
          if (urlLower.includes(domain.toLowerCase())) { score += 50; break; }
        }
      }
      if (urlLower.includes(sku.toLowerCase()) || title.includes(sku.toLowerCase())) score += 30;
      if (urlLower.includes("/product") || urlLower.includes("/מוצר")) score += 20;
      if (urlLower.includes("/category") || urlLower.includes("/cart")) score -= 50;

      if (score > bestScore) { bestScore = score; bestUrl = rUrl; }
    }

    return bestUrl || results[0]?.url || null;
  } catch (error) {
    console.error("Search error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { mode, url, sku, query, preferredDomains } = body;

    if (!mode || (mode !== "url" && mode !== "sku")) {
      return new Response(
        JSON.stringify({ success: false, error: "Mode must be 'url' or 'sku'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode === "url" && (!url || typeof url !== "string")) {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required for URL mode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode === "sku" && (!sku || typeof sku !== "string")) {
      return new Response(
        JSON.stringify({ success: false, error: "SKU is required for SKU mode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode === "url" && !url.startsWith("http://") && !url.startsWith("https://")) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid URL format" }),
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

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let finalUrl = url;
    const inputValue = mode === "url" ? url : sku;

    if (mode === "sku") {
      finalUrl = await searchProductBySku(sku, query, preferredDomains, FIRECRAWL_API_KEY);
      if (!finalUrl) {
        return new Response(
          JSON.stringify({ success: false, error: "לא נמצא מוצר עם המק״ט הזה. נסה להוסיף שם מוצר או להשתמש בקישור ישיר." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Scraping URL:", finalUrl);

    // Scrape with Firecrawl
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    let scrapeResponse: Response | null = null;
    try {
      scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: finalUrl,
          formats: ["html"],
          onlyMainContent: false,
          waitFor: 3000,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("Scrape fetch error:", (err as Error).message);
    }

    if (!scrapeResponse || !scrapeResponse.ok) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            source: { mode, input: inputValue, finalUrl },
            product: { title: "מוצר לא ידוע", brand: null, description: null, images: [], currency: "ILS", basePrice: null, salePrice: null },
            variants: [],
            feedingGuide: [],
            debug: { extraction: "failed", firecrawl: { error: scrapeResponse?.status || "timeout" } },
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const scrapeData = await scrapeResponse.json();
    const html = scrapeData.data?.html || scrapeData.html || "";

    if (!html) {
      return new Response(
        JSON.stringify({ success: false, error: "No content returned from URL" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const productData = extractProductFromHtml(html, finalUrl);

    const resultData: ScrapedProductResult = {
      source: { mode, input: inputValue, finalUrl },
      ...productData,
    };

    resultData.debug.firecrawl = {
      sourceUrl: scrapeData.data?.sourceUrl || finalUrl,
      statusCode: scrapeData.data?.statusCode,
    };

    return new Response(
      JSON.stringify({ success: true, data: resultData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in scrape-product:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
