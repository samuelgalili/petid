import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProductVariant {
  name: string;
  value: string;
  price?: number;
  sku?: string;
  image_url?: string;
}

interface ScrapedProductData {
  name: string;
  description?: string;
  price?: number;
  salePrice?: number;
  imageUrl?: string;
  allImageUrls?: string[];
  category?: string;
  petType?: string;
  brand?: string;
  flavors?: string[];
  sizes?: string[];
  variants?: ProductVariant[];
  weight?: string;
  weightUnit?: string;
  sku?: string;
}

// Parse product data from HTML content - comprehensive extraction
function parseProductFromHtml(html: string, url: string): ScrapedProductData | null {
  try {
    // Extract product name from title or h1
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const h1Match = html.match(/<h1[^>]*class="[^"]*product[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
                    html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    
    const productName = h1Match?.[1]?.trim() || titleMatch?.[1]?.split('|')[0]?.trim() || '';
    
    if (!productName) return null;

    // Extract prices - look for multiple patterns
    const pricePatterns = [
      /class="[^"]*woocommerce-Price-amount[^"]*"[^>]*><bdi>([^<]*)<span[^>]*class="[^"]*woocommerce-Price-currencySymbol/i,
      /₪\s*([\d,]+(?:\.\d{2})?)/g,
      /<span[^>]*class="[^"]*price[^"]*"[^>]*>[^₪]*₪\s*([\d,]+(?:\.\d{2})?)/i,
    ];
    
    let finalPrice: number | undefined;
    let regularPrice: number | undefined;
    let salePrice: number | undefined;
    
    // Look for sale/regular price patterns
    const salePriceMatch = html.match(/class="[^"]*sale[^"]*"[^>]*>.*?₪\s*([\d,]+(?:\.\d{2})?)/is) ||
                           html.match(/<ins[^>]*>.*?₪\s*([\d,]+(?:\.\d{2})?)/is);
    const regularPriceMatch = html.match(/class="[^"]*regular[^"]*"[^>]*>.*?₪\s*([\d,]+(?:\.\d{2})?)/is) ||
                              html.match(/<del[^>]*>.*?₪\s*([\d,]+(?:\.\d{2})?)/is);
    
    // Extract all prices
    const allPrices: number[] = [];
    const priceMatches = html.matchAll(/₪\s*([\d,]+(?:\.\d{2})?)/g);
    for (const match of priceMatches) {
      const price = parseFloat(match[1].replace(',', ''));
      if (price > 0 && price < 10000) {
        allPrices.push(price);
      }
    }
    
    if (salePriceMatch) {
      salePrice = parseFloat(salePriceMatch[1].replace(',', ''));
      finalPrice = salePrice;
    }
    if (regularPriceMatch) {
      regularPrice = parseFloat(regularPriceMatch[1].replace(',', ''));
    }
    
    // If no specific price found, use first price
    if (!finalPrice && allPrices.length > 0) {
      finalPrice = Math.min(...allPrices);
      if (allPrices.length > 1) {
        regularPrice = Math.max(...allPrices);
      }
    }

    // Extract main image - multiple patterns
    let mainImageUrl: string | undefined;
    const imagePatterns = [
      /data-large_image="([^"]+)"/i,
      /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i,
      /class="[^"]*woocommerce-product-gallery__image[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i,
      /<img[^>]+class="[^"]*wp-post-image[^"]*"[^>]+src="([^"]+)"/i,
    ];
    
    for (const pattern of imagePatterns) {
      const match = html.match(pattern);
      if (match && match[1] && !match[1].includes('placeholder')) {
        mainImageUrl = match[1];
        break;
      }
    }
    
    // Extract all gallery images
    const allImageUrls: string[] = [];
    const galleryPatterns = [
      /data-large_image="([^"]+)"/gi,
      /data-src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
    ];
    
    for (const pattern of galleryPatterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && !match[1].includes('placeholder') && !allImageUrls.includes(match[1])) {
          allImageUrls.push(match[1]);
        }
      }
    }

    // Extract description
    const shortDescMatch = html.match(/class="[^"]*woocommerce-product-details__short-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const description = shortDescMatch?.[1]?.replace(/<[^>]+>/g, '').trim();

    // Extract SKU
    let sku: string | undefined;
    const skuMatch = html.match(/class="[^"]*sku[^"]*"[^>]*>([A-Za-z0-9\-_]+)</i) ||
                     html.match(/מק"ט[:\s]*([A-Za-z0-9\-_]+)/i);
    if (skuMatch && skuMatch[1].length < 50) {
      sku = skuMatch[1].trim();
    }

    // Extract brand
    const brandMatch = html.match(/מותג[:\s]*<[^>]*>([^<]+)/i) ||
                       html.match(/class="[^"]*brand[^"]*"[^>]*>([^<]+)/i);

    // Extract pet type from URL/content
    let petType: string | undefined;
    const urlLower = url.toLowerCase();
    let decodedUrl = urlLower;
    try { decodedUrl = decodeURIComponent(url).toLowerCase(); } catch (e) {}
    
    if (decodedUrl.includes('כלב') || urlLower.includes('dog')) {
      petType = 'dog';
    } else if (decodedUrl.includes('חתול') || urlLower.includes('cat')) {
      petType = 'cat';
    }

    // Extract weight from product name
    let weight: string | undefined;
    let weightUnit: string | undefined;
    const weightMatch = productName.match(/(\d+(?:\.\d+)?)\s*(ק"ג|קג|ק״ג|kg|גרם|g)\b/i);
    if (weightMatch) {
      weight = weightMatch[1];
      const unit = weightMatch[2].toLowerCase();
      weightUnit = unit.includes('ק') || unit === 'kg' ? 'kg' : 'g';
    }

    // Extract WooCommerce variations - comprehensive extraction
    const variants: ProductVariant[] = [];
    const flavors: string[] = [];
    const sizes: string[] = [];

    // Helper function to decode URL-encoded strings
    const decodeValue = (val: string): string => {
      try {
        return decodeURIComponent(val.replace(/-/g, ' '));
      } catch {
        return val.replace(/-/g, ' ');
      }
    };

    // Pattern 1: data-product_variations attribute
    const variationsMatch = html.match(/data-product_variations='([^']+)'/i) ||
                            html.match(/data-product_variations="([^"]+)"/i);
    if (variationsMatch) {
      try {
        const variationsData = JSON.parse(variationsMatch[1].replace(/&quot;/g, '"'));
        if (Array.isArray(variationsData)) {
          variationsData.forEach((v: any) => {
            const attrs = v.attributes || {};
            Object.entries(attrs).forEach(([key, value]: [string, any]) => {
              if (value) {
                const decodedName = decodeValue(key.replace('attribute_', '').replace('pa_', ''));
                const decodedValue = decodeValue(String(value));
                
                variants.push({
                  name: decodedName,
                  value: decodedValue,
                  price: v.display_price,
                  sku: v.sku || undefined,
                  image_url: v.image?.url
                });
                
                // Categorize variants
                const keyLower = decodedName.toLowerCase();
                if (keyLower.includes('flavor') || keyLower.includes('taste') || keyLower.includes('טעם')) {
                  if (!flavors.includes(decodedValue)) flavors.push(decodedValue);
                } else if (keyLower.includes('size') || keyLower.includes('גודל') || keyLower.includes('משקל') || keyLower.includes('weight')) {
                  if (!sizes.includes(decodedValue)) sizes.push(decodedValue);
                }
              }
            });
          });
        }
      } catch (e) {
        console.log('Failed to parse variations:', e);
      }
    }

    // Pattern 2: Select/option elements
    const selectMatches = html.matchAll(/<select[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/select>/gi);
    for (const selectMatch of selectMatches) {
      const selectId = selectMatch[1].toLowerCase();
      const optionsHtml = selectMatch[2];
      const options = optionsHtml.matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/gi);
      
      for (const opt of options) {
        const value = opt[1] || opt[2];
        const label = opt[2]?.trim();
        if (value && label && !value.includes('בחר') && label !== 'בחר אפשרות') {
          const decodedLabel = decodeValue(label);
          
          if (selectId.includes('flavor') || selectId.includes('טעם')) {
            if (!flavors.includes(decodedLabel)) flavors.push(decodedLabel);
          } else if (selectId.includes('size') || selectId.includes('גודל') || selectId.includes('weight') || selectId.includes('משקל')) {
            if (!sizes.includes(decodedLabel)) sizes.push(decodedLabel);
          }
        }
      }
    }

    // Pattern 3: Swatches
    const swatchMatches = html.matchAll(/class="[^"]*swatch[^"]*"[^>]*data-value="([^"]+)"/gi);
    for (const swatch of swatchMatches) {
      const value = decodeValue(swatch[1]);
      if (value) {
        if (/^\d+/.test(value) || value.includes('kg') || value.includes('g') || value.includes('ק')) {
          if (!sizes.includes(value)) sizes.push(value);
        } else if (!flavors.includes(value)) {
          flavors.push(value);
        }
      }
    }

    // Determine category from URL
    let category: string | undefined;
    if (decodedUrl.includes('מזון-יבש') || decodedUrl.includes('dry')) {
      category = 'אוכל יבש';
    } else if (decodedUrl.includes('מזון-רטוב') || decodedUrl.includes('wet')) {
      category = 'אוכל רטוב';
    } else if (decodedUrl.includes('חטיפ') || decodedUrl.includes('treats')) {
      category = 'חטיפים';
    } else if (decodedUrl.includes('צעצוע') || decodedUrl.includes('toys')) {
      category = 'צעצועים';
    }

    return {
      name: productName,
      description,
      price: finalPrice,
      salePrice: salePrice !== finalPrice ? salePrice : undefined,
      imageUrl: mainImageUrl,
      allImageUrls: allImageUrls.length > 0 ? allImageUrls : undefined,
      category,
      petType,
      brand: brandMatch?.[1]?.trim(),
      flavors: flavors.length > 0 ? flavors : undefined,
      sizes: sizes.length > 0 ? sizes : undefined,
      variants: variants.length > 0 ? variants : undefined,
      weight,
      weightUnit,
      sku,
    };
  } catch (error) {
    console.error('Error parsing product:', error);
    return null;
  }
}

async function scrapeProductUrl(url: string, firecrawlKey: string): Promise<ScrapedProductData | null> {
  try {
    console.log('Scraping URL:', url);
    
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['html'],
        onlyMainContent: false,
      }),
    });

    if (!response.ok) {
      console.error('Firecrawl scrape error:', response.status);
      return null;
    }

    const data = await response.json();
    const html = data.data?.html || data.html || '';
    
    if (!html) {
      console.error('No HTML returned from scrape');
      return null;
    }

    return parseProductFromHtml(html, url);
  } catch (error) {
    console.error('Error scraping URL:', error);
    return null;
  }
}

async function searchProduct(query: string, apiKey: string, isSku: boolean): Promise<{ content: string; imageUrls: string[] } | null> {
  try {
    const searchQuery = isSku 
      ? `${query} pet product Israel מוצר לחיות מחמד barcode`
      : `${query} pet product Israel מוצר לחיות מחמד מחיר`;
    
    console.log("Searching for:", searchQuery);
    
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5,
        scrapeOptions: {
          formats: ["markdown"],
        },
      }),
    });

    if (!response.ok) {
      console.error("Firecrawl search error:", response.status);
      return null;
    }

    const data = await response.json();
    
    let combinedContent = "";
    const imageUrls: string[] = [];
    
    if (data.data && Array.isArray(data.data)) {
      for (const result of data.data) {
        combinedContent += `\nSource: ${result.url}\nTitle: ${result.title || ""}\nContent: ${result.markdown || result.description || ""}\n`;
        
        const markdown = result.markdown || "";
        const imgMatches = markdown.matchAll(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g);
        for (const match of imgMatches) {
          const imgUrl = match[1];
          if (imgUrl && !imgUrl.includes('logo') && !imgUrl.includes('icon')) {
            imageUrls.push(imgUrl);
          }
        }
      }
    }
    
    return { content: combinedContent, imageUrls };
  } catch (error) {
    console.error("Error searching product:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, sku, category, productUrl } = await req.json();
    
    if (!productName && !sku && !productUrl) {
      return new Response(
        JSON.stringify({ error: "Product name, SKU, or URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // If URL provided, scrape it directly - most accurate method
    if (productUrl && FIRECRAWL_API_KEY) {
      console.log("Direct URL scraping mode:", productUrl);
      
      const scrapedData = await scrapeProductUrl(productUrl, FIRECRAWL_API_KEY);
      
      if (scrapedData) {
        console.log("Successfully scraped product:", scrapedData.name);
        console.log("Found variants:", scrapedData.variants?.length || 0);
        console.log("Found sizes:", scrapedData.sizes);
        console.log("Found flavors:", scrapedData.flavors);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: {
              name: scrapedData.name,
              description: scrapedData.description,
              suggestedPrice: scrapedData.price,
              salePrice: scrapedData.salePrice,
              imageUrl: scrapedData.imageUrl,
              allImageUrls: scrapedData.allImageUrls,
              category: scrapedData.category,
              petType: scrapedData.petType,
              flavors: scrapedData.flavors,
              sizes: scrapedData.sizes,
              variants: scrapedData.variants,
              weight: scrapedData.weight,
              weightUnit: scrapedData.weightUnit,
              sku: scrapedData.sku,
              brand: scrapedData.brand,
              priceReason: "מחיר נמשך ישירות מהאתר",
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        console.log("Direct scraping failed, falling back to AI enrichment");
      }
    }

    // Fallback: Search the web and use AI for enrichment
    let webSearchContext = "";
    let foundImageUrls: string[] = [];
    
    if (FIRECRAWL_API_KEY) {
      const searchQuery = sku || productName;
      const isSku = !!sku;
      const searchResults = await searchProduct(searchQuery, FIRECRAWL_API_KEY, isSku);
      if (searchResults) {
        webSearchContext = searchResults.content;
        foundImageUrls = searchResults.imageUrls;
      }
    }

    const searchQuery = sku || productName;
    const categoryContext = category ? `Category: ${category}` : "";
    
    const prompt = `You are a pet products expert assistant for an Israeli pet store.
You help enrich product data based on SKU numbers or product names.
Your responses should be in Hebrew. Always respond in valid JSON format.

Enrich this pet product:
${sku ? `SKU/מק"ט: ${sku}` : ""}
${productName ? `Product Name: ${productName}` : ""}
${categoryContext}

${webSearchContext ? `Web Search Results:\n${webSearchContext.substring(0, 3000)}` : ""}

Return a JSON object with these fields (use null if unknown):
{
  "name": "שם המוצר בעברית",
  "description": "תיאור מוצר מפורט בעברית (2-3 משפטים)",
  "petType": "dog" או "cat" או "both" או "other",
  "category": "קטגוריה - אוכל יבש/אוכל רטוב/חטיפים/צעצועים/אביזרים/טיפוח/בריאות/אחר",
  "sizes": ["רשימת משקלים/גדלים זמינים"],
  "flavors": ["רשימת טעמים אם רלוונטי"],
  "suggestedPrice": מחיר בש״ח (מספר בלבד),
  "priceReason": "הסבר קצר למחיר"
}

IMPORTANT: Return ONLY the JSON object, no markdown formatting.`;

    console.log("AI enrichment for:", searchQuery);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI request failed: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    let enrichedData;
    try {
      let jsonStr = content;
      if (jsonStr.includes("```json")) {
        jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (jsonStr.includes("```")) {
        jsonStr = jsonStr.replace(/```\n?/g, "");
      }
      enrichedData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      enrichedData = {
        description: content.substring(0, 200),
        suggestedPrice: null,
      };
    }

    // Add found image URLs
    if (foundImageUrls.length > 0) {
      enrichedData.imageUrl = foundImageUrls[0];
      enrichedData.allImageUrls = foundImageUrls.slice(0, 5);
    }

    return new Response(
      JSON.stringify({ success: true, data: enrichedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error enriching product:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
