import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

// Parse weight from string - SIMPLIFIED for performance
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

// Extract product data - OPTIMIZED for performance
function extractProductFromHtml(html: string, url: string): Omit<ScrapedProductResult, "source"> {
  // CRITICAL: Limit HTML size to prevent memory issues
  const maxHtmlLength = 500000; // 500KB max
  const truncatedHtml = html.length > maxHtmlLength ? html.substring(0, maxHtmlLength) : html;
  
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
    debug: { extraction: "html_parsing" },
  };

  // ==================== TITLE (quick extraction) ====================
  const ogTitleMatch = truncatedHtml.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
  const h1Match = truncatedHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const titleMatch = truncatedHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
  
  result.product.title = ogTitleMatch?.[1]?.trim() ||
    h1Match?.[1]?.trim() ||
    titleMatch?.[1]?.split("|")[0]?.split("–")[0]?.split("-")[0]?.trim() || "";

  // ==================== DESCRIPTION (quick extraction) ====================
  const ogDescMatch = truncatedHtml.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i);
  const metaDescMatch = truncatedHtml.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
  result.product.description = (ogDescMatch?.[1] || metaDescMatch?.[1] || "").substring(0, 500);

  // ==================== IMAGES (limited extraction) ====================
  const imageUrls: string[] = [];
  
  // OG image first
  const ogImageMatch = truncatedHtml.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
  if (ogImageMatch?.[1]) {
    imageUrls.push(ogImageMatch[1]);
  }
  
  // WooCommerce large images (limited to 10)
  const wooImages = truncatedHtml.match(/data-large_image="([^"]+)"/gi);
  if (wooImages) {
    for (let i = 0; i < Math.min(wooImages.length, 10); i++) {
      const match = wooImages[i].match(/data-large_image="([^"]+)"/i);
      if (match?.[1] && !imageUrls.includes(match[1])) {
        imageUrls.push(match[1]);
      }
    }
  }
  
  result.product.images = imageUrls.filter(img => 
    img && !img.includes("placeholder") && !img.includes("logo") && !img.includes("icon")
  ).slice(0, 10);

  // ==================== PRICES (JSON-LD priority) ====================
  const jsonLdMatch = truncatedHtml.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const data = JSON.parse(jsonLdMatch[1]);
      const offers = data.offers || data.Offers;
      if (offers) {
        const offer = Array.isArray(offers) ? offers[0] : offers;
        if (offer.price) result.product.basePrice = parseFloat(offer.price);
        if (offer.priceCurrency) result.product.currency = offer.priceCurrency;
      }
    } catch {}
  }

  // Fallback price extraction
  if (!result.product.basePrice) {
    const priceMatch = truncatedHtml.match(/class="[^"]*woocommerce-Price-amount[^"]*"[^>]*>.*?(\d+(?:[.,]\d{1,2})?)/is);
    if (priceMatch) result.product.basePrice = parseFloat(priceMatch[1].replace(",", "."));
  }

  // Sale price
  const salePriceMatch = truncatedHtml.match(/<ins[^>]*>[\s\S]*?(\d+(?:[.,]\d{1,2})?)[\s\S]*?<\/ins>/i);
  const originalPriceMatch = truncatedHtml.match(/<del[^>]*>[\s\S]*?(\d+(?:[.,]\d{1,2})?)[\s\S]*?<\/del>/i);
  if (salePriceMatch) result.product.salePrice = parseFloat(salePriceMatch[1].replace(",", "."));
  if (originalPriceMatch && !result.product.basePrice) {
    result.product.basePrice = parseFloat(originalPriceMatch[1].replace(",", "."));
  }

  // ==================== VARIANTS - WooCommerce ONLY (most reliable) ====================
  const variationsMatch = truncatedHtml.match(/data-product_variations='([^']+)'/i) ||
                          truncatedHtml.match(/data-product_variations="([^"]+)"/i);
  
  if (variationsMatch) {
    try {
      let variationsJson = variationsMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&");
      const variationsData = JSON.parse(variationsJson);
      
      if (Array.isArray(variationsData) && variationsData.length > 0) {
        result.debug.extraction = "woocommerce_variations";
        
        for (const v of variationsData.slice(0, 50)) { // Limit to 50 variants
          const attrs = v.attributes || {};
          const variant: ProductVariant = {
            label: "",
            price: v.display_price || null,
            sale_price: null,
            sku: v.sku || null,
          };
          
          // Handle sale pricing
          if (v.display_regular_price && v.display_price && v.display_regular_price > v.display_price) {
            variant.price = v.display_regular_price;
            variant.sale_price = v.display_price;
          }
          
          // Build label from attributes
          const labelParts: string[] = [];
          for (const [key, value] of Object.entries(attrs)) {
            if (value) {
              const decodedValue = decodeValue(String(value));
              labelParts.push(decodedValue);
              
              // Extract weight
              if (key.toLowerCase().includes("weight") || key.toLowerCase().includes("משקל") || 
                  key.toLowerCase().includes("size") || key.toLowerCase().includes("גודל")) {
                const parsed = parseWeight(decodedValue);
                if (parsed) {
                  variant.weight = parsed.weight;
                  variant.weight_unit = parsed.unit;
                }
              }
            }
          }
          
          variant.label = labelParts.join(" - ") || `וריאנט ${result.variants.length + 1}`;
          
          // Try to extract weight from label if not found
          if (!variant.weight) {
            const parsed = parseWeight(variant.label);
            if (parsed) {
              variant.weight = parsed.weight;
              variant.weight_unit = parsed.unit;
            }
          }
          
          result.variants.push(variant);
        }
      }
    } catch (e) {
      console.error("Failed to parse WooCommerce variations:", e);
    }
  }

  // Simple select fallback (only if no WooCommerce variants found)
  if (result.variants.length === 0) {
    const selectMatch = truncatedHtml.match(/<select[^>]*(?:id|name)="[^"]*(?:attribute|weight|size|variation)[^"]*"[^>]*>([\s\S]*?)<\/select>/i);
    if (selectMatch) {
      const options = selectMatch[1].matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/gi);
      for (const opt of options) {
        const value = opt[1];
        const label = opt[2]?.trim();
        if (!value || !label || label.includes("בחר") || label === "Choose an option") continue;
        
        const decodedLabel = decodeValue(label);
        const variant: ProductVariant = { label: decodedLabel, price: null };
        const parsed = parseWeight(decodedLabel);
        if (parsed) {
          variant.weight = parsed.weight;
          variant.weight_unit = parsed.unit;
        }
        result.variants.push(variant);
        result.debug.extraction = "select_options";
      }
    }
  }

  console.log("Extracted product:", result.product.title);
  console.log("Found", result.product.images.length, "images");
  console.log("Found", result.variants.length, "variants");
  console.log("Extraction method:", result.debug.extraction);

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
    console.log("Found", results.length, "search results");

    // Score and filter results
    let bestUrl = "";
    let bestScore = -100;
    
    for (const r of results) {
      const url = r.url || r.link || "";
      const title = (r.title || "").toLowerCase();
      const urlLower = url.toLowerCase();
      let score = 0;

      if (preferredDomains) {
        for (const domain of preferredDomains) {
          if (urlLower.includes(domain.toLowerCase())) { score += 50; break; }
        }
      }
      if (urlLower.includes(sku.toLowerCase()) || title.includes(sku.toLowerCase())) score += 30;
      if (urlLower.includes("/product") || urlLower.includes("/מוצר") || urlLower.includes("/shop/")) score += 20;
      if (urlLower.includes("/category") || urlLower.includes("/cart") || urlLower.includes("/checkout")) score -= 50;

      if (score > bestScore) {
        bestScore = score;
        bestUrl = url;
      }
    }
    
    if (bestUrl) console.log("Best result:", bestUrl, "score:", bestScore);
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

    // Validate input
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

    let finalUrl = url;
    const inputValue = mode === "url" ? url : sku;

    // For SKU mode, search for the product URL first
    if (mode === "sku") {
      console.log("SKU mode - searching for product URL...");
      finalUrl = await searchProductBySku(sku, query, preferredDomains, FIRECRAWL_API_KEY);
      
      if (!finalUrl) {
        return new Response(
          JSON.stringify({ success: false, error: "לא נמצא מוצר עם המק״ט הזה" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Scraping URL:", finalUrl);

    // Helper function to scrape with timeout - single attempt, longer timeout
    async function scrapeWithTimeout(targetUrl: string): Promise<Response | null> {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
        
        const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: targetUrl,
            formats: ["html"],
            onlyMainContent: false,
            timeout: 40000, // Tell Firecrawl to timeout at 40s
            waitFor: 3000, // Wait for JS to render
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        return response;
      } catch (err) {
        const error = err as Error;
        console.error("Scrape fetch error:", error.message);
        return null;
      }
    }

    // Call Firecrawl to scrape the page
    console.log("Attempting to scrape with Firecrawl...");
    const scrapeResponse = await scrapeWithTimeout(finalUrl);

    if (!scrapeResponse || !scrapeResponse.ok) {
      const errorStatus = scrapeResponse?.status || 0;
      console.log(`Firecrawl failed with status ${errorStatus}, returning partial data from URL`);
      
      // Return partial data based on URL if scraping fails
      const urlName = finalUrl.split('/').pop()?.replace(/-/g, ' ').replace(/\.[^/.]+$/, '') || "";
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            name: urlName || "מוצר לא ידוע",
            description: "",
            price: null,
            image_url: "",
            images: [],
            variants: [],
            brand: "",
            sku: "",
            url: finalUrl,
            partial: true, // Flag indicating this is partial data
            error_reason: `לא ניתן לסרוק את האתר (${errorStatus || 'timeout'})`
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Extract product data
    const productData = extractProductFromHtml(html, finalUrl);

    // Build final response
    const result: ScrapedProductResult = {
      source: { mode, input: inputValue, finalUrl },
      ...productData,
    };

    result.debug.firecrawl = {
      sourceUrl: scrapeData.data?.sourceUrl || finalUrl,
      statusCode: scrapeData.data?.statusCode,
    };

    return new Response(
      JSON.stringify({ success: true, data: result }),
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
