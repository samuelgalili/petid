import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import * as cheerio from "https://esm.sh/cheerio@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProductVariant {
  label: string;
  weight?: number;
  weight_unit?: string;
  price?: number;
  currency?: string;
  sku?: string;
  image_url?: string;
}

interface ScrapedProductResult {
  source_url: string;
  title: string;
  brand?: string;
  description?: string;
  images: string[];
  variants: ProductVariant[];
  base_price?: number;
  currency?: string;
  sku?: string;
  category?: string;
  pet_type?: string;
  feeding_guide?: { range: string; amount: string }[];
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
  const match = str.match(/(\d+(?:[.,]\d+)?)\s*(ק"ג|קג|ק״ג|kg|גרם|g|gr)\b/i);
  if (match) {
    const weight = parseFloat(match[1].replace(",", "."));
    const unitRaw = match[2].toLowerCase();
    const unit = unitRaw.includes("ק") || unitRaw === "kg" ? "kg" : "g";
    return { weight, unit };
  }
  return null;
}

// Extract product data using Cheerio
function extractProductFromHtml(html: string, url: string): ScrapedProductResult {
  const $ = cheerio.load(html);

  const result: ScrapedProductResult = {
    source_url: url,
    title: "",
    images: [],
    variants: [],
  };

  // ==================== TITLE ====================
  result.title =
    $(".product_title").text().trim() ||
    $("h1.entry-title").text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("h1").first().text().trim() ||
    $("title").text().split("|")[0].split("–")[0].trim() || "";

  // ==================== BRAND ====================
  result.brand =
    $(".brand-link img").attr("alt")?.trim() ||
    $(".brand-link").text().trim() ||
    undefined;

  if (!result.brand) {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || "");
        if (data["@type"] === "Product" && data.brand) {
          result.brand = typeof data.brand === "string" ? data.brand : data.brand.name;
        }
      } catch {}
    });
  }

  // ==================== DESCRIPTION ====================
  result.description =
    $(".woocommerce-product-details__short-description").text().trim().substring(0, 500) ||
    $(".short-description").text().trim().substring(0, 500) ||
    $("#tab-description").text().trim().substring(0, 500) ||
    $('meta[name="description"]').attr("content")?.trim() ||
    undefined;

  // ==================== IMAGES ====================
  const imageUrls: string[] = [];
  const addImage = (imgUrl: string | undefined) => {
    if (!imgUrl || imgUrl.includes("placeholder") || imgUrl.includes("logo") || 
        imgUrl.includes("icon") || imgUrl.includes("data:image") || imageUrls.includes(imgUrl)) return;
    imageUrls.push(imgUrl);
  };

  addImage($('meta[property="og:image"]').attr("content"));
  $("[data-large_image]").each((_, el) => addImage($(el).attr("data-large_image")));
  $(".woocommerce-product-gallery__image img").each((_, el) => addImage($(el).attr("data-src") || $(el).attr("src")));
  $("img.wp-post-image").each((_, el) => addImage($(el).attr("src")));

  result.images = imageUrls.slice(0, 10);

  // ==================== SKU ====================
  const sku = $(".sku").text().trim() || $('[data-sku]').attr("data-sku");
  if (sku && sku.length < 50) result.sku = sku;

  // ==================== PET TYPE & CATEGORY ====================
  let decodedUrl = url.toLowerCase();
  try { decodedUrl = decodeURIComponent(url).toLowerCase(); } catch {}

  if (decodedUrl.includes("כלב") || decodedUrl.includes("dog")) result.pet_type = "dog";
  else if (decodedUrl.includes("חתול") || decodedUrl.includes("cat")) result.pet_type = "cat";

  if (decodedUrl.includes("מזון-יבש") || decodedUrl.includes("dry")) result.category = "dry-food";
  else if (decodedUrl.includes("מזון-רטוב") || decodedUrl.includes("wet")) result.category = "wet-food";
  else if (decodedUrl.includes("חטיפ") || decodedUrl.includes("treats")) result.category = "treats";

  // ==================== VARIANTS ====================
  const variationsAttr = $("[data-product_variations]").attr("data-product_variations");
  if (variationsAttr) {
    try {
      const variationsData = JSON.parse(variationsAttr.replace(/&quot;/g, '"'));
      if (Array.isArray(variationsData)) {
        for (const v of variationsData) {
          const attrs = v.attributes || {};
          const variant: ProductVariant = {
            label: "",
            price: v.display_price || undefined,
            currency: "ILS",
            sku: v.sku || undefined,
            image_url: v.image?.url || v.image?.src || undefined,
          };

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

  // Select dropdown fallback
  if (result.variants.length === 0) {
    $('select[id*="attribute"], select[name*="attribute"]').each((_, selectEl) => {
      $(selectEl).find("option").each((_, optEl) => {
        const value = $(optEl).attr("value");
        const label = $(optEl).text().trim();
        if (!value || !label || label.includes("בחר") || label === "Choose an option") return;
        const decodedLabel = decodeValue(label);
        const variant: ProductVariant = { label: decodedLabel, currency: "ILS" };
        const parsed = parseWeight(decodedLabel);
        if (parsed) { variant.weight = parsed.weight; variant.weight_unit = parsed.unit; }
        result.variants.push(variant);
      });
    });
  }

  // ==================== BASE PRICE ====================
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || "");
      if (data["@type"] === "Product" && data.offers) {
        const offer = Array.isArray(data.offers) ? data.offers[0] : data.offers;
        if (offer.price && !result.base_price) {
          result.base_price = parseFloat(String(offer.price));
          result.currency = offer.priceCurrency || "ILS";
        }
      }
    } catch {}
  });

  if (!result.base_price) {
    const priceText = $(".woocommerce-Price-amount bdi").first().text().replace(/[^\d.,]/g, "");
    if (priceText) { result.base_price = parseFloat(priceText.replace(",", ".")); result.currency = "ILS"; }
  }

  // ==================== FEEDING GUIDE ====================
  const feedingGuide: { range: string; amount: string }[] = [];
  $("table tr").each((_, el) => {
    const cells = $(el).find("td");
    if (cells.length >= 2) {
      const range = $(cells[0]).text().trim();
      const amount = $(cells[1]).text().trim();
      if (range && amount && /\d/.test(range)) {
        feedingGuide.push({ range, amount });
      }
    }
  });
  if (feedingGuide.length > 0) result.feeding_guide = feedingGuide;

  // Single variant fallback from title weight
  if (result.variants.length === 0 && result.title) {
    const titleWeight = parseWeight(result.title);
    if (titleWeight && result.base_price) {
      result.variants.push({
        label: `${titleWeight.weight} ${titleWeight.unit === "kg" ? 'ק"ג' : "גרם"}`,
        weight: titleWeight.weight,
        weight_unit: titleWeight.unit,
        price: result.base_price,
        currency: "ILS",
      });
    }
  }

  console.log(`Extracted: "${result.title}", ${result.images.length} images, ${result.variants.length} variants`);
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
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
      .single();

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

    console.log("Scraping URL:", url);

    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["html"],
        onlyMainContent: false,
      }),
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error("Firecrawl error:", scrapeResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to scrape URL: ${scrapeResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const scrapeData = await scrapeResponse.json();
    const html = scrapeData.data?.html || scrapeData.html || "";

    if (!html) {
      return new Response(
        JSON.stringify({ success: false, error: "No content returned from URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const productData = extractProductFromHtml(html, url);

    return new Response(
      JSON.stringify({ success: true, data: productData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error scraping product URL:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
