import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
  raw?: {
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

// Parse weight from string like "1.5 ק"ג" or "500g"
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

// Parse price from string like "₪99.90" or "99.90 ש״ח"
function parsePrice(str: string): number | null {
  const match = str.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (match) {
    return parseFloat(match[1].replace(",", "."));
  }
  return null;
}

// Extract all product data from HTML
function extractProductFromHtml(html: string, url: string): ScrapedProductResult {
  const result: ScrapedProductResult = {
    source_url: url,
    title: "",
    images: [],
    variants: [],
  };

  // Extract title
  const h1Match = html.match(/<h1[^>]*class="[^"]*product[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
                  html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  result.title = h1Match?.[1]?.trim() || titleMatch?.[1]?.split("|")[0]?.split("–")[0]?.trim() || "";

  // Extract brand
  const brandMatch = html.match(/מותג[:\s]*<[^>]*>([^<]+)/i) ||
                     html.match(/class="[^"]*brand[^"]*"[^>]*>([^<]+)/i) ||
                     html.match(/"brand"\s*:\s*"([^"]+)"/i);
  if (brandMatch) {
    result.brand = brandMatch[1].trim();
  }

  // Extract description
  const descPatterns = [
    /class="[^"]*woocommerce-product-details__short-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /class="[^"]*short-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<meta[^>]+name="description"[^>]+content="([^"]+)"/i,
  ];
  for (const pattern of descPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      result.description = match[1].replace(/<[^>]+>/g, "").trim().substring(0, 500);
      break;
    }
  }

  // Extract images - multiple patterns
  const imageUrls: string[] = [];
  const imagePatterns = [
    /data-large_image="([^"]+)"/gi,
    /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/gi,
    /data-src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
    /srcset="([^"\s]+\.(?:jpg|jpeg|png|webp)[^"\s]*)[\s,]/gi,
    /<img[^>]+class="[^"]*wp-post-image[^"]*"[^>]+src="([^"]+)"/gi,
  ];
  
  for (const pattern of imagePatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const imgUrl = match[1];
      if (imgUrl && 
          !imgUrl.includes("placeholder") && 
          !imgUrl.includes("woocommerce-placeholder") &&
          !imgUrl.includes("data:image") &&
          !imgUrl.includes("logo") &&
          !imgUrl.includes("icon") &&
          !imageUrls.includes(imgUrl)) {
        imageUrls.push(imgUrl);
      }
    }
  }
  result.images = imageUrls.slice(0, 10);

  // Extract SKU
  const skuMatch = html.match(/class="[^"]*sku[^"]*"[^>]*>([A-Za-z0-9\-_]+)</i) ||
                   html.match(/מק"ט[:\s]*([A-Za-z0-9\-_]+)/i) ||
                   html.match(/"sku"\s*:\s*"([^"]+)"/i);
  if (skuMatch && skuMatch[1].length < 50) {
    result.sku = skuMatch[1].trim();
  }

  // Determine pet type from URL
  const urlLower = url.toLowerCase();
  let decodedUrl = urlLower;
  try { decodedUrl = decodeURIComponent(url).toLowerCase(); } catch {}
  
  if (decodedUrl.includes("כלב") || urlLower.includes("dog")) {
    result.pet_type = "dog";
  } else if (decodedUrl.includes("חתול") || urlLower.includes("cat")) {
    result.pet_type = "cat";
  }

  // Determine category from URL
  if (decodedUrl.includes("מזון-יבש") || decodedUrl.includes("dry")) {
    result.category = "dry-food";
  } else if (decodedUrl.includes("מזון-רטוב") || decodedUrl.includes("wet")) {
    result.category = "wet-food";
  } else if (decodedUrl.includes("חטיפ") || decodedUrl.includes("treats")) {
    result.category = "treats";
  }

  // ========= VARIANTS EXTRACTION (CRITICAL) =========
  
  // Method 1: WooCommerce data-product_variations attribute
  const variationsMatch = html.match(/data-product_variations='([^']+)'/i) ||
                          html.match(/data-product_variations="([^"]+)"/i);
  
  if (variationsMatch) {
    try {
      const variationsData = JSON.parse(variationsMatch[1].replace(/&quot;/g, '"'));
      if (Array.isArray(variationsData) && variationsData.length > 0) {
        console.log("Found WooCommerce variations:", variationsData.length);
        
        for (const v of variationsData) {
          const attrs = v.attributes || {};
          const variant: ProductVariant = {
            label: "",
            price: v.display_price || undefined,
            currency: "ILS",
            sku: v.sku || undefined,
            image_url: v.image?.url || v.image?.src || undefined,
          };
          
          // Build label from all attributes
          const labelParts: string[] = [];
          for (const [key, value] of Object.entries(attrs)) {
            if (value) {
              const cleanKey = key.replace("attribute_", "").replace("pa_", "");
              const decodedValue = decodeValue(String(value));
              labelParts.push(decodedValue);
              
              // Extract weight if this looks like a weight attribute
              const keyLower = cleanKey.toLowerCase();
              if (keyLower.includes("weight") || keyLower.includes("משקל") || keyLower.includes("size") || keyLower.includes("גודל")) {
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
          if (!variant.weight && variant.label) {
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

  // Method 2: Select/option dropdowns (common in many stores)
  if (result.variants.length === 0) {
    const selectMatches = html.matchAll(/<select[^>]*id="([^"]*)"[^>]*name="([^"]*)"[^>]*>([\s\S]*?)<\/select>/gi);
    
    for (const selectMatch of selectMatches) {
      const selectId = selectMatch[1].toLowerCase();
      const selectName = selectMatch[2].toLowerCase();
      const optionsHtml = selectMatch[3];
      
      // Only process attribute/variation selects
      if (!selectName.includes("attribute") && !selectId.includes("attribute") && 
          !selectId.includes("weight") && !selectId.includes("משקל") &&
          !selectId.includes("size") && !selectId.includes("גודל")) {
        continue;
      }
      
      const options = optionsHtml.matchAll(/<option[^>]*value="([^"]*)"[^>]*(?:data-price="([^"]*)")?[^>]*>([^<]*)<\/option>/gi);
      
      for (const opt of options) {
        const value = opt[1];
        const dataPrice = opt[2];
        const label = opt[3]?.trim();
        
        if (!value || !label || label.includes("בחר") || label === "בחר אפשרות") {
          continue;
        }
        
        const decodedLabel = decodeValue(label);
        const variant: ProductVariant = {
          label: decodedLabel,
          currency: "ILS",
        };
        
        // Extract weight
        const parsed = parseWeight(decodedLabel);
        if (parsed) {
          variant.weight = parsed.weight;
          variant.weight_unit = parsed.unit;
        }
        
        // Extract price if available
        if (dataPrice) {
          variant.price = parsePrice(dataPrice) ?? undefined;
        }
        
        result.variants.push(variant);
      }
    }
  }

  // Method 3: Radio buttons / swatches
  if (result.variants.length === 0) {
    const swatchMatches = html.matchAll(/class="[^"]*swatch[^"]*"[^>]*data-value="([^"]+)"[^>]*(?:data-price="([^"]*)")?/gi);
    
    for (const swatch of swatchMatches) {
      const value = decodeValue(swatch[1]);
      const dataPrice = swatch[2];
      
      if (value) {
        const variant: ProductVariant = {
          label: value,
          currency: "ILS",
        };
        
        const parsed = parseWeight(value);
        if (parsed) {
          variant.weight = parsed.weight;
          variant.weight_unit = parsed.unit;
        }
        
        if (dataPrice) {
          variant.price = parsePrice(dataPrice) ?? undefined;
        }
        
        result.variants.push(variant);
      }
    }
  }

  // Method 4: Look for weight patterns in product listing/table
  if (result.variants.length === 0) {
    // Search for weight patterns like "1.5 ק"ג - ₪89"
    const weightPricePattern = /(\d+(?:[.,]\d+)?)\s*(ק"ג|קג|ק״ג|kg|גרם|g)\s*[-–]\s*₪?\s*(\d+(?:[.,]\d{1,2})?)/gi;
    const matches = html.matchAll(weightPricePattern);
    
    for (const match of matches) {
      const weight = parseFloat(match[1].replace(",", "."));
      const unitRaw = match[2].toLowerCase();
      const unit = unitRaw.includes("ק") || unitRaw === "kg" ? "kg" : "g";
      const price = parseFloat(match[3].replace(",", "."));
      
      result.variants.push({
        label: `${weight} ${unit === "kg" ? 'ק"ג' : "גרם"}`,
        weight,
        weight_unit: unit,
        price,
        currency: "ILS",
      });
    }
  }

  // Extract base price (for non-variant products or fallback)
  const pricePatterns = [
    /class="[^"]*woocommerce-Price-amount[^"]*"[^>]*>.*?(\d+(?:[.,]\d{1,2})?)/is,
    /<ins[^>]*>.*?₪\s*(\d+(?:[.,]\d{1,2})?)/is,
    /₪\s*(\d+(?:[.,]\d{1,2})?)/i,
  ];
  
  for (const pattern of pricePatterns) {
    const match = html.match(pattern);
    if (match) {
      result.base_price = parseFloat(match[1].replace(",", "."));
      result.currency = "ILS";
      break;
    }
  }

  // If no variants but we found base price and weight in title, create single variant
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

  console.log("Extracted product:", result.title);
  console.log("Found", result.images.length, "images");
  console.log("Found", result.variants.length, "variants");

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    // Validate URL
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

    // Check admin role
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

    // Get Firecrawl API key
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Scraping URL:", url);

    // Call Firecrawl to scrape the page
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

    // Extract product data
    const productData = extractProductFromHtml(html, url);

    return new Response(
      JSON.stringify({
        success: true,
        data: productData,
      }),
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
