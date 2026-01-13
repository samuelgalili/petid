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
function detectPageType(html: string): "product" | "list" {
  // Strong product page signals
  const productSignals = [
    /"@type"\s*:\s*"Product"/i,
    /property="og:type"\s+content="product"/i,
    /class="[^"]*single-product[^"]*"/i,
    /class="[^"]*product-single[^"]*"/i,
    /<form[^>]*class="[^"]*variations_form[^"]*"/i,
    /data-product_variations/i,
    /"product_type"\s*:\s*"variable"/i,
    /class="[^"]*woocommerce-product-gallery[^"]*"/i,
    /class="[^"]*product-gallery[^"]*"/i,
    /id="product-images"/i,
    /<button[^>]*add[_-]to[_-]cart/i,
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
  ];

  let listScore = 0;
  for (const signal of listSignals) {
    if (signal.test(html)) {
      listScore++;
    }
  }

  // Count product cards on page
  const productCardMatches = html.match(/class="[^"]*product[^"]*"[^>]*>\s*<a[^>]*href="/gi) || [];
  if (productCardMatches.length > 3) {
    listScore += 2;
  }

  console.log(`Page detection: productScore=${productScore}, listScore=${listScore}, productCards=${productCardMatches.length}`);

  // Product page if high product signals OR low list signals with some product signals
  if (productScore >= 3 || (productScore >= 1 && listScore === 0)) {
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
    // WooCommerce product links
    /<a[^>]*class="[^"]*woocommerce-LoopProduct-link[^"]*"[^>]*href="([^"]+)"/gi,
    // Product card links
    /<li[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"/gi,
    // Product grid items
    /<div[^>]*class="[^"]*product-item[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"/gi,
    // General product links with data-product-id
    /<a[^>]*data-product-id[^>]*href="([^"]+)"/gi,
    // Links within product containers
    /<div[^>]*class="[^"]*product[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"/gi,
    // Product thumbnails
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
  // Try rel="next"
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

  // Try common pagination patterns
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

// Extract single product from HTML
function extractSingleProduct(html: string, url: string): ScrapedProduct {
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
  };

  // ==================== TITLE ====================
  const ogTitleMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
  const h1ProductMatch = html.match(/<h1[^>]*class="[^"]*product[^"]*"[^>]*>([^<]+)<\/h1>/i);
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  
  product.title = ogTitleMatch?.[1]?.trim() ||
    h1ProductMatch?.[1]?.trim() ||
    h1Match?.[1]?.trim() ||
    titleMatch?.[1]?.split("|")[0]?.split("–")[0]?.split("-")[0]?.trim() || "";

  // ==================== BRAND ====================
  const brandPatterns = [
    /"brand"\s*:\s*\{\s*"@type"\s*:\s*"Brand"\s*,\s*"name"\s*:\s*"([^"]+)"/i,
    /"brand"\s*:\s*"([^"]+)"/i,
    /מותג[:\s]*<[^>]*>([^<]+)/i,
    /class="[^"]*brand[^"]*"[^>]*>([^<]+)/i,
  ];
  for (const pattern of brandPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      product.brand = match[1].trim();
      break;
    }
  }

  // ==================== DESCRIPTION ====================
  const descPatterns = [
    /<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i,
    /<meta[^>]+name="description"[^>]+content="([^"]+)"/i,
    /class="[^"]*woocommerce-product-details__short-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /class="[^"]*short-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ];
  for (const pattern of descPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      product.description = match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().substring(0, 1000);
      break;
    }
  }

  // ==================== SKU ====================
  const skuPatterns = [
    /"sku"\s*:\s*"([^"]+)"/i,
    /class="[^"]*sku[^"]*"[^>]*>([^<]+)/i,
    /data-sku="([^"]+)"/i,
    /מק"ט[:\s]*([A-Za-z0-9-]+)/i,
  ];
  for (const pattern of skuPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      product.sku = match[1].trim();
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
    /data-zoom-image="([^"]+)"/gi,
    /"image"\s*:\s*"([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
  ];
  
  for (const pattern of imagePatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      let imgUrl = match[1];
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
          !imgUrl.includes("data:image") &&
          !imgUrl.includes("logo") &&
          !imgUrl.includes("icon") &&
          imgUrl.length < 500 &&
          !imageUrls.includes(imgUrl)) {
        imageUrls.push(imgUrl);
      }
    }
  }
  product.images = imageUrls.slice(0, 20);

  // ==================== PRICES ====================
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
            product.basePrice = parseFloat(offer.price);
          }
          if (offer.priceCurrency) {
            product.currency = offer.priceCurrency;
          }
        }
      } catch {}
    }
  }

  // Fallback to HTML patterns for prices
  if (!product.basePrice) {
    const salePriceMatch = html.match(/<ins[^>]*>[\s\S]*?(\d+(?:[.,]\d{1,2})?)[\s\S]*?<\/ins>/i);
    const originalPriceMatch = html.match(/<del[^>]*>[\s\S]*?(\d+(?:[.,]\d{1,2})?)[\s\S]*?<\/del>/i);
    
    if (salePriceMatch) {
      product.salePrice = parseFloat(salePriceMatch[1].replace(",", "."));
    }
    if (originalPriceMatch) {
      product.basePrice = parseFloat(originalPriceMatch[1].replace(",", "."));
    }
    
    if (!product.basePrice && !product.salePrice) {
      const pricePatterns = [
        /class="[^"]*woocommerce-Price-amount[^"]*"[^>]*>.*?(\d+(?:[.,]\d{1,2})?)/is,
        /₪\s*(\d+(?:[.,]\d{1,2})?)/i,
      ];
      for (const pattern of pricePatterns) {
        const match = html.match(pattern);
        if (match) {
          product.basePrice = parseFloat(match[1].replace(",", "."));
          break;
        }
      }
    }
  }

  // ==================== VARIANTS EXTRACTION (CRITICAL) ====================
  
  // Method 1: WooCommerce data-product_variations
  const variationsMatch = html.match(/data-product_variations='([^']+)'/i) ||
                          html.match(/data-product_variations="([^"]+)"/i);
  
  if (variationsMatch) {
    try {
      let variationsJson = variationsMatch[1];
      variationsJson = variationsJson.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
      const variationsData = JSON.parse(variationsJson);
      
      if (Array.isArray(variationsData) && variationsData.length > 0) {
        console.log("WooCommerce variations found:", variationsData.length);
        
        for (const v of variationsData) {
          const attrs = v.attributes || {};
          const variant: ProductVariant = {
            label: "",
            price: null,
            sale_price: null,
            sku: v.sku || null,
            options: {},
          };
          
          // Handle pricing correctly
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
              
              // Store in options
              const cleanKey = key.replace("attribute_", "").replace("pa_", "");
              variant.options![cleanKey] = decodedValue;
              
              // Extract weight
              const keyLower = key.toLowerCase();
              if (keyLower.includes("weight") || keyLower.includes("משקל") || 
                  keyLower.includes("size") || keyLower.includes("גודל")) {
                const parsed = parseWeight(decodedValue);
                if (parsed) {
                  variant.weight = parsed.weight;
                  variant.weight_unit = parsed.unit;
                }
              }
            }
          }
          
          variant.label = labelParts.join(" - ") || `וריאנט ${product.variants.length + 1}`;
          
          // Try to extract weight from label if not found
          if (!variant.weight && variant.label) {
            const parsed = parseWeight(variant.label);
            if (parsed) {
              variant.weight = parsed.weight;
              variant.weight_unit = parsed.unit;
            }
          }
          
          product.variants.push(variant);
        }
      }
    } catch (e) {
      console.error("Failed to parse WooCommerce variations:", e);
    }
  }

  // Method 2: JSON-LD ProductGroup or hasVariant
  if (product.variants.length === 0 && jsonLdMatch) {
    for (const jsonScript of jsonLdMatch) {
      try {
        const jsonContent = jsonScript.replace(/<\/?script[^>]*>/gi, "");
        const data = JSON.parse(jsonContent);
        const variants = data.hasVariant || data.model || [];
        if (Array.isArray(variants) && variants.length > 0) {
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
            product.variants.push(variant);
          }
        }
      } catch {}
    }
  }

  // Method 3: Select/option dropdowns
  if (product.variants.length === 0) {
    const selectMatches = html.matchAll(/<select[^>]*(?:id|name)="([^"]*)"[^>]*>([\s\S]*?)<\/select>/gi);
    
    for (const selectMatch of selectMatches) {
      const selectIdOrName = selectMatch[1].toLowerCase();
      const optionsHtml = selectMatch[2];
      
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
        
        const parsed = parseWeight(decodedLabel);
        if (parsed) {
          variant.weight = parsed.weight;
          variant.weight_unit = parsed.unit;
        }
        
        if (dataPrice) {
          variant.price = parsePrice(dataPrice);
        }
        
        product.variants.push(variant);
      }
    }
  }

  // Method 4: Radio buttons / swatches
  if (product.variants.length === 0) {
    const swatchPatterns = [
      /class="[^"]*swatch[^"]*"[^>]*data-value="([^"]+)"[^>]*(?:data-price="([^"]*)")?/gi,
      /class="[^"]*variation-option[^"]*"[^>]*data-value="([^"]+)"[^>]*(?:data-price="([^"]*)")?/gi,
    ];
    
    for (const pattern of swatchPatterns) {
      const swatches = html.matchAll(pattern);
      for (const swatch of swatches) {
        const value = decodeValue(swatch[1]);
        const dataPrice = swatch[2];
        
        if (value && !product.variants.some(v => v.label === value)) {
          const variant: ProductVariant = {
            label: value,
            price: dataPrice ? parsePrice(dataPrice) : null,
          };
          
          const parsed = parseWeight(value);
          if (parsed) {
            variant.weight = parsed.weight;
            variant.weight_unit = parsed.unit;
          }
          
          product.variants.push(variant);
        }
      }
    }
  }

  // If no variants but we have base price, check title for weight info
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

  return product;
}

// Scrape a single URL with Firecrawl
async function scrapeUrl(url: string, apiKey: string): Promise<string | null> {
  try {
    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["html"],
        onlyMainContent: false,
      }),
    });

    if (!scrapeResponse.ok) {
      console.error("Firecrawl scrape error:", scrapeResponse.status);
      return null;
    }

    const scrapeData = await scrapeResponse.json();
    return scrapeData.data?.html || scrapeData.html || null;
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
    const pageType = detectPageType(initialHtml);
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

      // Process pages until we have enough products or hit the page limit
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

        // Check for next page
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
