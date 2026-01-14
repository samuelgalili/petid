import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompetitorInput {
  name: string;
  domain: string;
  logo: string;
}

interface CompetitorResult {
  competitor: string;
  logo: string;
  price: number | null;
  originalPrice: number | null;
  inStock: boolean;
  lastChecked: string;
  url: string;
  found: boolean;
}

// Extract price from HTML content with improved accuracy
function extractPrice(html: string): { price: number | null; originalPrice: number | null } {
  let price: number | null = null;
  let originalPrice: number | null = null;
  const allFoundPrices: number[] = [];

  // 1. Try JSON-LD first (most reliable)
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const match of jsonLdMatch) {
      try {
        const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '');
        const data = JSON.parse(jsonContent);
        
        const findPrice = (obj: any): number | null => {
          if (!obj) return null;
          
          // Direct price
          if (obj.offers?.price) {
            const p = parseFloat(String(obj.offers.price));
            if (!isNaN(p)) return p;
          }
          
          // Array of offers
          if (obj.offers?.[0]?.price) {
            const p = parseFloat(String(obj.offers[0].price));
            if (!isNaN(p)) return p;
          }
          
          // Low price in offers
          if (obj.offers?.lowPrice) {
            const p = parseFloat(String(obj.offers.lowPrice));
            if (!isNaN(p)) return p;
          }
          
          // Array recursion
          if (Array.isArray(obj)) {
            for (const item of obj) {
              const found = findPrice(item);
              if (found) return found;
            }
          }
          
          // @graph recursion
          if (obj['@graph']) return findPrice(obj['@graph']);
          
          return null;
        };
        
        const foundPrice = findPrice(data);
        if (foundPrice && foundPrice >= 1 && foundPrice <= 50000) {
          price = foundPrice;
          allFoundPrices.push(foundPrice);
          break;
        }
      } catch (e) {
        // Continue to next match
      }
    }
  }

  // 2. Try meta tags (very reliable)
  if (!price) {
    const metaPatterns = [
      /<meta[^>]*property="product:price:amount"[^>]*content="([^"]+)"/i,
      /<meta[^>]*content="([^"]+)"[^>]*property="product:price:amount"/i,
      /<meta[^>]*name="price"[^>]*content="([^"]+)"/i,
      /<meta[^>]*property="og:price:amount"[^>]*content="([^"]+)"/i,
    ];

    for (const pattern of metaPatterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        const p = parseFloat(match[1].replace(/[^\d.]/g, ''));
        if (!isNaN(p) && p >= 1 && p <= 50000) {
          price = p;
          allFoundPrices.push(p);
          break;
        }
      }
    }
  }

  // 3. Try data attributes
  if (!price) {
    const dataPatterns = [
      /data-price="(\d+(?:\.\d+)?)"/g,
      /data-product-price="(\d+(?:\.\d+)?)"/g,
      /data-current-price="(\d+(?:\.\d+)?)"/g,
    ];

    for (const pattern of dataPatterns) {
      const match = pattern.exec(html);
      if (match?.[1]) {
        const p = parseFloat(match[1]);
        if (!isNaN(p) && p >= 1 && p <= 50000) {
          price = p;
          allFoundPrices.push(p);
          break;
        }
      }
    }
  }

  // 4. Try Israeli shekel patterns (more specific)
  if (!price) {
    // Look for price in specific elements first
    const priceContainerPatterns = [
      // WooCommerce sale price (current price)
      /<ins[^>]*>.*?<bdi>₪([0-9,]+(?:\.[0-9]+)?)<\/bdi>/gi,
      /<ins[^>]*>.*?₪([0-9,]+(?:\.[0-9]+)?)/gi,
      // Price with bdi tag
      /<bdi>₪([0-9,]+(?:\.[0-9]+)?)<\/bdi>/gi,
      // Common price class with shekel
      /class="[^"]*(?:current-price|sale-price|final-price)[^"]*"[^>]*>[^<]*₪\s*([0-9,]+(?:\.[0-9]+)?)/gi,
      // Price followed by shekel
      /class="[^"]*price[^"]*"[^>]*>[^<]*([0-9,]+(?:\.[0-9]+)?)\s*₪/gi,
      // Shekel followed by price
      /₪\s*([0-9,]+(?:\.[0-9]+)?)/g,
      // Price followed by shekel
      /([0-9,]+(?:\.[0-9]+)?)\s*₪/g,
    ];

    for (const pattern of priceContainerPatterns) {
      let match;
      const localPrices: number[] = [];
      
      while ((match = pattern.exec(html)) !== null) {
        const priceStr = match[1].replace(/,/g, '');
        const p = parseFloat(priceStr);
        if (!isNaN(p) && p >= 5 && p <= 50000) {
          localPrices.push(p);
        }
      }
      
      // If we found prices, take the most common one or the first reasonable one
      if (localPrices.length > 0) {
        // Count occurrences
        const counts: Record<number, number> = {};
        for (const p of localPrices) {
          counts[p] = (counts[p] || 0) + 1;
        }
        
        // Get the most frequent price
        let maxCount = 0;
        let mostFrequent = localPrices[0];
        for (const [priceStr, count] of Object.entries(counts)) {
          if (count > maxCount) {
            maxCount = count;
            mostFrequent = parseFloat(priceStr);
          }
        }
        
        price = mostFrequent;
        allFoundPrices.push(...localPrices);
        break;
      }
    }
  }

  // 5. Try to find original/regular price (for sale items)
  const originalPricePatterns = [
    // WooCommerce deleted price (original)
    /<del[^>]*>.*?<bdi>₪([0-9,]+(?:\.[0-9]+)?)<\/bdi>/gi,
    /<del[^>]*>.*?₪([0-9,]+(?:\.[0-9]+)?)/gi,
    // Regular price class
    /class="[^"]*(?:regular-price|was-price|original-price|compare-price)[^"]*"[^>]*>[^<]*₪\s*([0-9,]+(?:\.[0-9]+)?)/gi,
    /class="[^"]*(?:regular-price|was-price|original-price|compare-price)[^"]*"[^>]*>[^<]*([0-9,]+(?:\.[0-9]+)?)\s*₪/gi,
  ];

  for (const pattern of originalPricePatterns) {
    const match = pattern.exec(html);
    if (match?.[1]) {
      const priceStr = match[1].replace(/,/g, '');
      const p = parseFloat(priceStr);
      if (!isNaN(p) && p >= 5 && p <= 50000) {
        if (price && p > price) {
          originalPrice = p;
          break;
        }
      }
    }
  }

  console.log(`Price extraction: found=${price}, original=${originalPrice}, all prices found: ${allFoundPrices.slice(0, 5).join(', ')}`);
  
  return { price, originalPrice };
}

// Check if product is in stock
function checkInStock(html: string): boolean {
  const outOfStockPatterns = [
    /אזל מהמלאי/i,
    /לא במלאי/i,
    /out.?of.?stock/i,
    /sold.?out/i,
    /unavailable/i,
    /class="[^"]*out-of-stock/i,
  ];

  const inStockPatterns = [
    /במלאי/i,
    /in.?stock/i,
    /available/i,
    /הוסף לסל/i,
    /add.?to.?cart/i,
    /class="[^"]*in-stock/i,
  ];

  for (const pattern of outOfStockPatterns) {
    if (pattern.test(html)) return false;
  }

  for (const pattern of inStockPatterns) {
    if (pattern.test(html)) return true;
  }

  return true; // Default to in stock if no indicators found
}

// Search for product on competitor site using Firecrawl
async function searchCompetitor(
  productName: string,
  sku: string | undefined,
  competitor: CompetitorInput,
  apiKey: string
): Promise<CompetitorResult> {
  const result: CompetitorResult = {
    competitor: competitor.name,
    logo: competitor.logo,
    price: null,
    originalPrice: null,
    inStock: false,
    lastChecked: new Date().toISOString(),
    url: '',
    found: false,
  };

  try {
    // Build search query - search for the exact product
    const searchQuery = sku 
      ? `"${productName}" OR "${sku}" site:${competitor.domain}`
      : `"${productName}" site:${competitor.domain}`;

    console.log(`Searching ${competitor.name}: ${searchQuery}`);

    // Use Firecrawl search API
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5,
        lang: 'he',
        country: 'IL',
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`Search failed for ${competitor.name}: ${searchResponse.status} - ${errorText}`);
      return result;
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.success || !searchData.data || searchData.data.length === 0) {
      console.log(`No results found for ${competitor.name}`);
      return result;
    }

    // Find the best matching result (product page, not category)
    let bestResult = searchData.data[0];
    for (const r of searchData.data) {
      const url = r.url?.toLowerCase() || '';
      // Prefer product pages over category pages
      if (url.includes('/product/') || url.includes('/item/') || url.includes('product_id=')) {
        bestResult = r;
        break;
      }
    }

    result.url = bestResult.url || `https://${competitor.domain}`;
    console.log(`Found URL for ${competitor.name}: ${result.url}`);

    // Scrape the product page to get accurate price
    console.log(`Scraping product page: ${result.url}`);
    
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: result.url,
        formats: ['rawHtml'],
        waitFor: 3000,
        onlyMainContent: false,
      }),
    });

    if (scrapeResponse.ok) {
      const scrapeData = await scrapeResponse.json();
      if (scrapeData.success && scrapeData.data?.rawHtml) {
        const { price, originalPrice } = extractPrice(scrapeData.data.rawHtml);
        result.price = price;
        result.originalPrice = originalPrice;
        result.inStock = checkInStock(scrapeData.data.rawHtml);
        result.found = price !== null;
        console.log(`${competitor.name}: scraped price=${price}, original=${originalPrice}, inStock=${result.inStock}`);
      } else {
        console.log(`${competitor.name}: scrape failed or no HTML`);
      }
    } else {
      const errorText = await scrapeResponse.text();
      console.error(`Scrape failed for ${competitor.name}: ${scrapeResponse.status} - ${errorText}`);
    }

    return result;

  } catch (error) {
    console.error(`Error searching ${competitor.name}:`, error);
    return result;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, sku, competitors } = await req.json();

    if (!productName) {
      return new Response(
        JSON.stringify({ error: 'Product name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      return new Response(
        JSON.stringify({ error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use provided competitors or default list
    const competitorList: CompetitorInput[] = competitors && competitors.length > 0 
      ? competitors 
      : [
          { name: 'פטשופ', domain: 'petshop.co.il', logo: '🐕' },
          { name: 'זופלוס', domain: 'zooplus.co.il', logo: '🐱' },
        ];

    console.log(`Checking prices for: "${productName}" (SKU: ${sku || 'none'}) across ${competitorList.length} competitors`);

    // Search all competitors in parallel
    const results = await Promise.all(
      competitorList.map(comp => searchCompetitor(productName, sku, comp, firecrawlApiKey))
    );

    // Filter only results with found prices
    const foundPrices = results.filter(r => r.found && r.price !== null);

    // Sort by price
    foundPrices.sort((a, b) => (a.price || 0) - (b.price || 0));

    // Calculate market analysis only from real prices
    let marketAnalysis = null;
    if (foundPrices.length > 0) {
      const prices = foundPrices.map(r => r.price!);
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const lowestPrice = Math.min(...prices);
      const highestPrice = Math.max(...prices);

      marketAnalysis = {
        averagePrice: Math.round(avgPrice * 100) / 100,
        lowestPrice,
        highestPrice,
        priceSpread: Math.round(((highestPrice - lowestPrice) / avgPrice) * 100),
        totalCompetitors: competitorList.length,
        foundPrices: foundPrices.length,
      };
    }

    // Build recommendations
    const recommendations: string[] = [];
    if (foundPrices.length === 0) {
      recommendations.push('⚠️ לא נמצאו מחירים אצל המתחרים - ייתכן שהמוצר לא קיים או שהחיפוש לא תואם');
    } else {
      recommendations.push(`✓ נמצאו ${foundPrices.length} מחירים מתוך ${competitorList.length} מתחרים`);
    }

    return new Response(
      JSON.stringify({
        productName,
        sku,
        competitors: foundPrices,
        allResults: results,
        marketAnalysis,
        recommendations,
        lastUpdated: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in product-competitor-prices:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
