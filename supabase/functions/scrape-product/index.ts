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

// Parse weight from string like "1.5 ק"ג" or "500g" or "12 kg"
function parseWeight(str: string): { weight: number; unit: string } | null {
  // Multiple patterns for weight extraction
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*(ק"ג|קג|ק״ג|kg|KG|Kg)\b/i,
    /(\d+(?:[.,]\d+)?)\s*(גרם|g|gr|GR)\b/i,
    /(\d+(?:[.,]\d+)?)\s*(ליטר|L|l|lt|LT)\b/i,
  ];
  
  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match) {
      const weight = parseFloat(match[1].replace(",", "."));
      const unitRaw = match[2].toLowerCase();
      let unit = "kg";
      if (unitRaw.includes("גרם") || unitRaw.startsWith("g")) {
        unit = "g";
      } else if (unitRaw.includes("ליטר") || unitRaw.startsWith("l")) {
        unit = "L";
      }
      return { weight, unit };
    }
  }
  return null;
}

// Parse price from string like "₪99.90" or "99.90 ש״ח"
function parsePrice(str: string): number | null {
  // Remove currency symbols and extra whitespace
  const cleaned = str.replace(/[₪$€]/g, "").trim();
  const match = cleaned.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (match) {
    return parseFloat(match[1].replace(",", "."));
  }
  return null;
}

// Extract all product data from HTML
function extractProductFromHtml(html: string, url: string): Omit<ScrapedProductResult, "source"> {
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

  // ==================== TITLE ====================
  // Priority: og:title → product h1 → first h1 → title tag
  const ogTitleMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
  const h1ProductMatch = html.match(/<h1[^>]*class="[^"]*product[^"]*"[^>]*>([^<]+)<\/h1>/i);
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  
  result.product.title = ogTitleMatch?.[1]?.trim() ||
    h1ProductMatch?.[1]?.trim() ||
    h1Match?.[1]?.trim() ||
    titleMatch?.[1]?.split("|")[0]?.split("–")[0]?.split("-")[0]?.trim() || "";

  // ==================== BRAND ====================
  const brandPatterns = [
    /"brand"\s*:\s*\{\s*"@type"\s*:\s*"Brand"\s*,\s*"name"\s*:\s*"([^"]+)"/i, // JSON-LD
    /"brand"\s*:\s*"([^"]+)"/i,
    /מותג[:\s]*<[^>]*>([^<]+)/i,
    /class="[^"]*brand[^"]*"[^>]*>([^<]+)/i,
  ];
  for (const pattern of brandPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      result.product.brand = match[1].trim();
      break;
    }
  }

  // ==================== DESCRIPTION ====================
  const descPatterns = [
    /<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i,
    /<meta[^>]+name="description"[^>]+content="([^"]+)"/i,
    /class="[^"]*woocommerce-product-details__short-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /class="[^"]*short-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /class="[^"]*product-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ];
  for (const pattern of descPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      result.product.description = match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().substring(0, 1000);
      break;
    }
  }

  // ==================== IMAGES ====================
  const imageUrls: string[] = [];
  const imagePatterns = [
    /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/gi,
    /data-large_image="([^"]+)"/gi,
    /data-src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
    /srcset="([^"\s]+\.(?:jpg|jpeg|png|webp)[^"\s]*)[\s,]/gi,
    /<img[^>]+class="[^"]*wp-post-image[^"]*"[^>]+src="([^"]+)"/gi,
    /<img[^>]+class="[^"]*attachment-shop_single[^"]*"[^>]+src="([^"]+)"/gi,
    /data-zoom-image="([^"]+)"/gi,
    /"image"\s*:\s*"([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
  ];
  
  for (const pattern of imagePatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      let imgUrl = match[1];
      // Make absolute URL
      if (imgUrl.startsWith("//")) {
        imgUrl = "https:" + imgUrl;
      } else if (imgUrl.startsWith("/") && !imgUrl.startsWith("//")) {
        try {
          const urlObj = new URL(url);
          imgUrl = urlObj.origin + imgUrl;
        } catch {}
      }
      if (imgUrl && 
          !imgUrl.includes("placeholder") && 
          !imgUrl.includes("woocommerce-placeholder") &&
          !imgUrl.includes("data:image") &&
          !imgUrl.includes("logo") &&
          !imgUrl.includes("icon") &&
          !imgUrl.includes("spinner") &&
          !imgUrl.includes("loading") &&
          imgUrl.length < 500 &&
          !imageUrls.includes(imgUrl)) {
        imageUrls.push(imgUrl);
      }
    }
  }
  result.product.images = imageUrls.slice(0, 20);

  // ==================== PRICES (Base & Sale) ====================
  // Try JSON-LD first
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const jsonScript of jsonLdMatch) {
      try {
        const jsonContent = jsonScript.replace(/<\/?script[^>]*>/gi, "");
        const data = JSON.parse(jsonContent);
        const offers = data.offers || data.Offers || (Array.isArray(data) ? data.find((d: any) => d.offers)?.offers : null);
        if (offers) {
          const offer = Array.isArray(offers) ? offers[0] : offers;
          if (offer.price) {
            result.product.basePrice = parseFloat(offer.price);
          }
          if (offer.priceCurrency) {
            result.product.currency = offer.priceCurrency;
          }
        }
      } catch {}
    }
  }

  // Fallback to HTML patterns for prices
  if (!result.product.basePrice) {
    // Look for sale price (usually in <ins>) and original price (in <del>)
    const salePriceMatch = html.match(/<ins[^>]*>[\s\S]*?(\d+(?:[.,]\d{1,2})?)[\s\S]*?<\/ins>/i) ||
                           html.match(/class="[^"]*sale[^"]*price[^"]*"[^>]*>[\s\S]*?(\d+(?:[.,]\d{1,2})?)/i);
    const originalPriceMatch = html.match(/<del[^>]*>[\s\S]*?(\d+(?:[.,]\d{1,2})?)[\s\S]*?<\/del>/i);
    
    if (salePriceMatch) {
      result.product.salePrice = parseFloat(salePriceMatch[1].replace(",", "."));
    }
    if (originalPriceMatch) {
      result.product.basePrice = parseFloat(originalPriceMatch[1].replace(",", "."));
    }
    
    // If only one price found, it's the base price
    if (!result.product.basePrice && !result.product.salePrice) {
      const pricePatterns = [
        /class="[^"]*woocommerce-Price-amount[^"]*"[^>]*>.*?(\d+(?:[.,]\d{1,2})?)/is,
        /₪\s*(\d+(?:[.,]\d{1,2})?)/i,
        /price[^>]*>.*?(\d+(?:[.,]\d{1,2})?)/is,
      ];
      for (const pattern of pricePatterns) {
        const match = html.match(pattern);
        if (match) {
          result.product.basePrice = parseFloat(match[1].replace(",", "."));
          break;
        }
      }
    }
  }

  // ==================== VARIANTS EXTRACTION (CRITICAL) ====================
  
  // Method 1: WooCommerce data-product_variations attribute
  const variationsMatch = html.match(/data-product_variations='([^']+)'/i) ||
                          html.match(/data-product_variations="([^"]+)"/i);
  
  if (variationsMatch) {
    try {
      let variationsJson = variationsMatch[1];
      // Decode HTML entities
      variationsJson = variationsJson.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
      const variationsData = JSON.parse(variationsJson);
      
      if (Array.isArray(variationsData) && variationsData.length > 0) {
        console.log("Found WooCommerce variations:", variationsData.length);
        result.debug.extraction = "woocommerce_variations";
        
        for (const v of variationsData) {
          const attrs = v.attributes || {};
          const variant: ProductVariant = {
            label: "",
            price: v.display_price || null,
            sale_price: v.display_regular_price !== v.display_price ? v.display_price : null,
            sku: v.sku || null,
          };
          
          // If there's a sale, the display_price is sale, display_regular is original
          if (v.display_regular_price && v.display_price && v.display_regular_price > v.display_price) {
            variant.price = v.display_regular_price;
            variant.sale_price = v.display_price;
          } else {
            variant.price = v.display_price || null;
            variant.sale_price = null;
          }
          
          // Build label from all attributes
          const labelParts: string[] = [];
          for (const [key, value] of Object.entries(attrs)) {
            if (value) {
              const decodedValue = decodeValue(String(value));
              labelParts.push(decodedValue);
              
              // Extract weight if this looks like a weight attribute
              const keyLower = key.toLowerCase();
              if (keyLower.includes("weight") || keyLower.includes("משקל") || 
                  keyLower.includes("size") || keyLower.includes("גודל") ||
                  keyLower.includes("pa_weight") || keyLower.includes("pa_size")) {
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

  // Method 2: JSON-LD ProductGroup or hasVariant
  if (result.variants.length === 0 && jsonLdMatch) {
    for (const jsonScript of jsonLdMatch) {
      try {
        const jsonContent = jsonScript.replace(/<\/?script[^>]*>/gi, "");
        const data = JSON.parse(jsonContent);
        const variants = data.hasVariant || data.model || [];
        if (Array.isArray(variants) && variants.length > 0) {
          result.debug.extraction = "jsonld_variants";
          for (const v of variants) {
            const variant: ProductVariant = {
              label: v.name || v.sku || "",
              price: v.offers?.price ? parseFloat(v.offers.price) : null,
              sku: v.sku || null,
            };
            const parsed = parseWeight(variant.label);
            if (parsed) {
              variant.weight = parsed.weight;
              variant.weight_unit = parsed.unit;
            }
            result.variants.push(variant);
          }
        }
      } catch {}
    }
  }

  // Method 3: Select/option dropdowns
  if (result.variants.length === 0) {
    const selectMatches = html.matchAll(/<select[^>]*(?:id|name)="([^"]*)"[^>]*>([\s\S]*?)<\/select>/gi);
    
    for (const selectMatch of selectMatches) {
      const selectIdOrName = selectMatch[1].toLowerCase();
      const optionsHtml = selectMatch[2];
      
      // Only process attribute/variation selects
      if (!selectIdOrName.includes("attribute") && 
          !selectIdOrName.includes("weight") && !selectIdOrName.includes("משקל") &&
          !selectIdOrName.includes("size") && !selectIdOrName.includes("גודל") &&
          !selectIdOrName.includes("variation") && !selectIdOrName.includes("option")) {
        continue;
      }
      
      const options = optionsHtml.matchAll(/<option[^>]*value="([^"]*)"[^>]*(?:data-price="([^"]*)")?[^>]*>([^<]*)<\/option>/gi);
      
      for (const opt of options) {
        const value = opt[1];
        const dataPrice = opt[2];
        const label = opt[3]?.trim();
        
        if (!value || !label || label.includes("בחר") || label === "בחר אפשרות" || label === "Choose an option") {
          continue;
        }
        
        const decodedLabel = decodeValue(label);
        const variant: ProductVariant = {
          label: decodedLabel,
          price: null,
        };
        
        // Extract weight
        const parsed = parseWeight(decodedLabel);
        if (parsed) {
          variant.weight = parsed.weight;
          variant.weight_unit = parsed.unit;
        }
        
        // Extract price if available
        if (dataPrice) {
          variant.price = parsePrice(dataPrice);
        }
        
        result.variants.push(variant);
        result.debug.extraction = "select_options";
      }
    }
  }

  // Method 4: Radio buttons / swatches
  if (result.variants.length === 0) {
    const swatchPatterns = [
      /class="[^"]*swatch[^"]*"[^>]*data-value="([^"]+)"[^>]*(?:data-price="([^"]*)")?/gi,
      /class="[^"]*variation-option[^"]*"[^>]*data-value="([^"]+)"[^>]*(?:data-price="([^"]*)")?/gi,
      /data-option="([^"]+)"[^>]*(?:data-price="([^"]*)")?/gi,
    ];
    
    for (const pattern of swatchPatterns) {
      const swatches = html.matchAll(pattern);
      for (const swatch of swatches) {
        const value = decodeValue(swatch[1]);
        const dataPrice = swatch[2];
        
        if (value && !result.variants.some(v => v.label === value)) {
          const variant: ProductVariant = {
            label: value,
            price: dataPrice ? parsePrice(dataPrice) : null,
          };
          
          const parsed = parseWeight(value);
          if (parsed) {
            variant.weight = parsed.weight;
            variant.weight_unit = parsed.unit;
          }
          
          result.variants.push(variant);
          result.debug.extraction = "swatch_options";
        }
      }
    }
  }

  // Method 5: Table-based variants (common in some stores)
  if (result.variants.length === 0) {
    const tableRows = html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    for (const row of tableRows) {
      const cells = row[1].match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi);
      if (cells && cells.length >= 2) {
        const cellTexts = cells.map(c => c.replace(/<[^>]+>/g, "").trim());
        // Look for weight-price pairs
        for (let i = 0; i < cellTexts.length - 1; i++) {
          const weightParsed = parseWeight(cellTexts[i]);
          const priceParsed = parsePrice(cellTexts[i + 1]);
          if (weightParsed && priceParsed) {
            result.variants.push({
              label: cellTexts[i],
              weight: weightParsed.weight,
              weight_unit: weightParsed.unit,
              price: priceParsed,
            });
            result.debug.extraction = "table_variants";
          }
        }
      }
    }
  }

  // Method 6: Look for weight-price patterns in text
  if (result.variants.length === 0) {
    const weightPricePatterns = [
      /(\d+(?:[.,]\d+)?)\s*(ק"ג|קג|ק״ג|kg)\s*[-–:]\s*₪?\s*(\d+(?:[.,]\d{1,2})?)/gi,
      /(\d+(?:[.,]\d+)?)\s*(גרם|g)\s*[-–:]\s*₪?\s*(\d+(?:[.,]\d{1,2})?)/gi,
    ];
    
    for (const pattern of weightPricePatterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        const weight = parseFloat(match[1].replace(",", "."));
        const unitRaw = match[2].toLowerCase();
        const unit = unitRaw.includes("ק") || unitRaw === "kg" ? "kg" : "g";
        const price = parseFloat(match[3].replace(",", "."));
        
        if (!result.variants.some(v => v.weight === weight && v.weight_unit === unit)) {
          result.variants.push({
            label: `${weight} ${unit === "kg" ? 'ק"ג' : "גרם"}`,
            weight,
            weight_unit: unit,
            price,
          });
          result.debug.extraction = "text_patterns";
        }
      }
    }
  }

  // If no variants but we have base price, check title for weight info
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
      result.debug.extraction = "title_weight";
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
      body: JSON.stringify({
        query: searchQuery,
        limit: 10,
      }),
    });

    if (!searchResponse.ok) {
      console.error("Firecrawl search error:", searchResponse.status);
      return null;
    }

    const searchData = await searchResponse.json();
    const results = searchData.data || searchData.results || [];
    
    if (results.length === 0) {
      console.log("No search results found");
      return null;
    }

    console.log("Found", results.length, "search results");

    // Filter and score results
    const scoredResults = results.map((r: any) => {
      const url = r.url || r.link || "";
      const title = (r.title || r.name || "").toLowerCase();
      const urlLower = url.toLowerCase();
      let score = 0;

      // Boost for preferred domains
      if (preferredDomains) {
        for (const domain of preferredDomains) {
          if (urlLower.includes(domain.toLowerCase())) {
            score += 50;
            break;
          }
        }
      }

      // Boost for containing SKU
      if (urlLower.includes(sku.toLowerCase()) || title.includes(sku.toLowerCase())) {
        score += 30;
      }

      // Boost for product-like URLs
      if (urlLower.includes("/product") || urlLower.includes("/מוצר") || 
          urlLower.includes("/shop/") || urlLower.includes("/p/")) {
        score += 20;
      }

      // Penalize non-product pages
      if (urlLower.includes("/category") || urlLower.includes("/cart") || 
          urlLower.includes("/checkout") || urlLower.includes("/blog") ||
          urlLower.includes("/search") || urlLower.includes("/tag")) {
        score -= 50;
      }

      return { url, score, title };
    });

    // Sort by score and return best result
    scoredResults.sort((a: any, b: any) => b.score - a.score);
    
    const bestResult = scoredResults.find((r: any) => r.score >= 0);
    if (bestResult) {
      console.log("Best result:", bestResult.url, "score:", bestResult.score);
      return bestResult.url;
    }

    // Fallback to first result if none scored positively
    return scoredResults[0]?.url || null;
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

    let finalUrl = url;
    const inputValue = mode === "url" ? url : sku;

    // For SKU mode, search for the product URL first
    if (mode === "sku") {
      console.log("SKU mode - searching for product URL...");
      finalUrl = await searchProductBySku(sku, query, preferredDomains, FIRECRAWL_API_KEY);
      
      if (!finalUrl) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "לא נמצא מוצר עם המק״ט הזה. נסה להוסיף שם מוצר או להשתמש בקישור ישיר." 
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Scraping URL:", finalUrl);

    // Call Firecrawl to scrape the page
    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: finalUrl,
        formats: ["html"],
        onlyMainContent: false,
      }),
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error("Firecrawl scrape error:", scrapeResponse.status, errorText);
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
    const productData = extractProductFromHtml(html, finalUrl);

    // Build final response
    const result: ScrapedProductResult = {
      source: {
        mode,
        input: inputValue,
        finalUrl,
      },
      ...productData,
    };

    // Add Firecrawl metadata to debug
    result.debug.firecrawl = {
      sourceUrl: scrapeData.data?.sourceUrl || finalUrl,
      statusCode: scrapeData.data?.statusCode,
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
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
