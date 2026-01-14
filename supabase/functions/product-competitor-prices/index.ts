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

// Extract price from HTML content
function extractPrice(html: string): { price: number | null; originalPrice: number | null } {
  let price: number | null = null;
  let originalPrice: number | null = null;

  // Try JSON-LD first (most reliable)
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const match of jsonLdMatch) {
      try {
        const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '');
        const data = JSON.parse(jsonContent);
        
        const findPrice = (obj: any): number | null => {
          if (!obj) return null;
          if (obj.offers?.price) return parseFloat(obj.offers.price);
          if (obj.offers?.[0]?.price) return parseFloat(obj.offers[0].price);
          if (Array.isArray(obj)) {
            for (const item of obj) {
              const found = findPrice(item);
              if (found) return found;
            }
          }
          if (obj['@graph']) return findPrice(obj['@graph']);
          return null;
        };
        
        const foundPrice = findPrice(data);
        if (foundPrice) {
          price = foundPrice;
          break;
        }
      } catch (e) {
        // Continue to next match
      }
    }
  }

  // Try common price patterns in HTML
  if (!price) {
    const pricePatterns = [
      // WooCommerce
      /<span[^>]*class="[^"]*woocommerce-Price-amount[^"]*"[^>]*>.*?(\d+(?:[.,]\d+)?)/gi,
      // Generic price with currency
      /₪\s*(\d+(?:[.,]\d+)?)/g,
      /(\d+(?:[.,]\d+)?)\s*₪/g,
      // Price meta tags
      /<meta[^>]*property="product:price:amount"[^>]*content="(\d+(?:[.,]\d+)?)"/gi,
      /<meta[^>]*name="price"[^>]*content="(\d+(?:[.,]\d+)?)"/gi,
      // Data attributes
      /data-price="(\d+(?:[.,]\d+)?)"/gi,
      // Common price class patterns
      /<[^>]*class="[^"]*(?:price|amount|cost)[^"]*"[^>]*>.*?(\d+(?:[.,]\d+)?)/gi,
    ];

    for (const pattern of pricePatterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        const potentialPrice = parseFloat(match[1].replace(',', '.'));
        // Validate price range (between 1 and 50000 ILS)
        if (potentialPrice >= 1 && potentialPrice <= 50000) {
          price = potentialPrice;
          break;
        }
      }
      if (price) break;
    }
  }

  // Try to find original/sale price
  if (price) {
    const salePatterns = [
      /<del[^>]*>.*?(\d+(?:[.,]\d+)?)/gi,
      /class="[^"]*(?:regular-price|was-price|original-price)[^"]*"[^>]*>.*?(\d+(?:[.,]\d+)?)/gi,
    ];

    for (const pattern of salePatterns) {
      const match = pattern.exec(html);
      if (match) {
        const potentialOriginal = parseFloat(match[1].replace(',', '.'));
        if (potentialOriginal > price && potentialOriginal <= 50000) {
          originalPrice = potentialOriginal;
          break;
        }
      }
    }
  }

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
  ];

  const inStockPatterns = [
    /במלאי/i,
    /in.?stock/i,
    /available/i,
    /הוסף לסל/i,
    /add.?to.?cart/i,
  ];

  const lowerHtml = html.toLowerCase();
  
  for (const pattern of outOfStockPatterns) {
    if (pattern.test(lowerHtml)) return false;
  }

  for (const pattern of inStockPatterns) {
    if (pattern.test(lowerHtml)) return true;
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
    // Build search query
    const searchQuery = sku 
      ? `${productName} ${sku} site:${competitor.domain}`
      : `${productName} site:${competitor.domain}`;

    console.log(`Searching for: ${searchQuery}`);

    // Use Firecrawl search API
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 3,
        lang: 'he',
        country: 'IL',
        scrapeOptions: {
          formats: ['rawHtml'],
          waitFor: 2000,
        },
      }),
    });

    if (!searchResponse.ok) {
      console.error(`Search failed for ${competitor.name}: ${searchResponse.status}`);
      return result;
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.success || !searchData.data || searchData.data.length === 0) {
      console.log(`No results found for ${competitor.name}`);
      return result;
    }

    // Get the first relevant result
    const firstResult = searchData.data[0];
    result.url = firstResult.url || `https://${competitor.domain}`;

    // If we have raw HTML, extract price
    if (firstResult.rawHtml) {
      const { price, originalPrice } = extractPrice(firstResult.rawHtml);
      result.price = price;
      result.originalPrice = originalPrice;
      result.inStock = checkInStock(firstResult.rawHtml);
      result.found = price !== null;
    }

    // If no price from search results, try to scrape the product page directly
    if (!result.price && firstResult.url) {
      console.log(`Scraping product page: ${firstResult.url}`);
      
      const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: firstResult.url,
          formats: ['rawHtml'],
          waitFor: 3000,
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
        }
      }
    }

    console.log(`${competitor.name}: price=${result.price}, found=${result.found}`);
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

    console.log(`Checking prices for: "${productName}" across ${competitorList.length} competitors`);

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
        averagePrice: Math.round(avgPrice),
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
      recommendations.push('⚠️ לא נמצאו מחירים אצל המתחרים');
    } else {
      recommendations.push(`✓ נמצאו ${foundPrices.length} מחירים מתוך ${competitorList.length} מתחרים`);
    }

    return new Response(
      JSON.stringify({
        productName,
        competitors: foundPrices,
        allResults: results, // Include all results for debugging
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
