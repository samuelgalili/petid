import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductVariant {
  name: string;
  value: string;
  price?: number;
  sku?: string;
  stock_status?: string;
  image_url?: string;
}

interface ScrapedProduct {
  product_id?: string;
  sku?: string;
  product_name: string;
  product_url: string;
  brand?: string;
  category_path?: string;
  main_category?: string;
  sub_category?: string;
  regular_price?: number;
  sale_price?: number;
  final_price?: number;
  currency?: string;
  discount_text?: string;
  stock_status?: 'in_stock' | 'out_of_stock' | 'preorder' | 'unknown';
  stock_badge?: string;
  short_description?: string;
  long_description?: string;
  long_description_html?: string;
  bullet_points?: string[];
  technical_details?: Record<string, any>;
  main_image_url?: string;
  meta_title?: string;
  meta_description?: string;
  h1_title?: string;
  badges?: string[];
  rating?: number;
  review_count?: number;
  json_ld_data?: Record<string, any>;
  // New fields for variants
  variants?: ProductVariant[];
  pet_type?: string;
  weight?: string;
  weight_unit?: string;
  flavors?: string[];
  sizes?: string[];
  colors?: string[];
}

// Parse product data from HTML content
function parseProductFromHtml(html: string, url: string): ScrapedProduct | null {
  try {
    // Extract product name from title or h1
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const h1Match = html.match(/<h1[^>]*class="[^"]*product[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
                    html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    
    const productName = h1Match?.[1]?.trim() || titleMatch?.[1]?.split('|')[0]?.trim() || '';
    
    if (!productName) return null;

    // Extract prices
    const priceMatches = html.match(/₪\s*([\d,]+(?:\.\d{2})?)/g) || [];
    const prices = priceMatches.map(p => parseFloat(p.replace('₪', '').replace(',', '').trim()));
    
    // Look for sale/regular price patterns
    const salePriceMatch = html.match(/class="[^"]*sale[^"]*"[^>]*>₪\s*([\d,]+(?:\.\d{2})?)/i);
    const regularPriceMatch = html.match(/class="[^"]*regular[^"]*"[^>]*>₪\s*([\d,]+(?:\.\d{2})?)/i) ||
                              html.match(/class="[^"]*was[^"]*"[^>]*>₪\s*([\d,]+(?:\.\d{2})?)/i);
    
    let finalPrice = prices[0] || 0;
    let regularPrice = prices[1] || prices[0] || 0;
    let salePrice: number | undefined;

    if (salePriceMatch) {
      salePrice = parseFloat(salePriceMatch[1].replace(',', ''));
      finalPrice = salePrice;
    }
    if (regularPriceMatch) {
      regularPrice = parseFloat(regularPriceMatch[1].replace(',', ''));
    }

    // Extract stock status
    let stockStatus: 'in_stock' | 'out_of_stock' | 'preorder' | 'unknown' = 'unknown';
    if (html.includes('במלאי') || html.includes('in-stock') || html.includes('instock')) {
      stockStatus = 'in_stock';
    } else if (html.includes('אזל') || html.includes('out-of-stock') || html.includes('outofstock')) {
      stockStatus = 'out_of_stock';
    }

    // Extract images - improved patterns for WooCommerce
    let mainImageUrl: string | undefined;
    
    // Try multiple patterns in order of preference
    const imagePatterns = [
      // WooCommerce gallery large image
      /data-large_image="([^"]+)"/i,
      // WooCommerce data-src
      /data-src="([^"]+)"/i,
      // OG image meta tag (most reliable)
      /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i,
      /property="og:image"[^>]+content="([^"]+)"/i,
      // WooCommerce gallery wrapper
      /class="[^"]*woocommerce-product-gallery__image[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i,
      // WordPress post image
      /<img[^>]+class="[^"]*wp-post-image[^"]*"[^>]+src="([^"]+)"/i,
      // Any image with attachment or product in class
      /<img[^>]+class="[^"]*(?:attachment|product)[^"]*"[^>]+src="([^"]+)"/i,
      // Image in product figure
      /<figure[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i,
      // General srcset (get highest res)
      /srcset="([^"\s]+)[^"]*"/i,
      // Any reasonable product image
      /<img[^>]+src="(https?:\/\/[^"]+(?:\.jpg|\.jpeg|\.png|\.webp)[^"]*)"/i,
    ];
    
    for (const pattern of imagePatterns) {
      const match = html.match(pattern);
      if (match && match[1] && !match[1].includes('placeholder') && !match[1].includes('data:image')) {
        mainImageUrl = match[1];
        break;
      }
    }
    
    // Also try to find image URL in JSON-LD
    const jsonLdImgMatch = html.match(/"image"\s*:\s*"([^"]+)"/i) ||
                           html.match(/"image"\s*:\s*\[\s*"([^"]+)"/i);
    if (!mainImageUrl && jsonLdImgMatch) {
      mainImageUrl = jsonLdImgMatch[1];
    }
    
    // Extract category/breadcrumb
    const breadcrumbMatch = html.match(/class="[^"]*breadcrumb[^"]*"[^>]*>(.*?)<\/nav>/is);
    let categoryPath = '';
    if (breadcrumbMatch) {
      const links = breadcrumbMatch[1].match(/>([^<]+)<\/a>/g) || [];
      categoryPath = links.map(l => l.replace(/>|<\/a>/g, '')).join(' > ');
    }

    // Extract SKU - more specific patterns to avoid JSON fragments
    let sku: string | undefined;
    const skuPatterns = [
      /class="[^"]*sku[^"]*"[^>]*>([A-Za-z0-9\-_]+)</i,
      /data-sku="([A-Za-z0-9\-_]+)"/i,
      /מק"ט[:\s]*<[^>]+>([A-Za-z0-9\-_]+)</i,
      /מק"ט[:\s]*([A-Za-z0-9\-_]+)/i,
      /sku[:\s]*([A-Za-z0-9\-_]+)(?:\s|<|$)/i,
    ];
    for (const pattern of skuPatterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].length < 50 && !match[1].includes('quot')) {
        sku = match[1].trim();
        break;
      }
    }

    // Extract brand
    const brandMatch = html.match(/מותג[:\s]*([^<]+)/i) ||
                       html.match(/brand[:\s]*([^<]+)/i);

    // Extract description
    const shortDescMatch = html.match(/class="[^"]*short-description[^"]*"[^>]*>(.*?)<\/div>/is) ||
                          html.match(/class="[^"]*woocommerce-product-details__short-description[^"]*"[^>]*>(.*?)<\/div>/is);
    
    const longDescMatch = html.match(/id="tab-description"[^>]*>(.*?)<\/div>/is) ||
                         html.match(/class="[^"]*description[^"]*"[^>]*>(.*?)<\/div>/is);

    // Extract JSON-LD
    let jsonLdData: Record<string, any> | undefined;
    const jsonLdMatch = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>(.*?)<\/script>/is);
    if (jsonLdMatch) {
      try {
        jsonLdData = JSON.parse(jsonLdMatch[1]);
      } catch (e) {
        console.log('Failed to parse JSON-LD');
      }
    }

    // Extract meta
    const metaTitleMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
    const metaDescMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);

    // Extract badges
    const badges: string[] = [];
    const badgeMatches = html.match(/class="[^"]*badge[^"]*"[^>]*>([^<]+)/gi) || [];
    badgeMatches.forEach(b => {
      const text = b.match(/>([^<]+)/)?.[1]?.trim();
      if (text) badges.push(text);
    });

    // Check for discount text
    const discountMatch = html.match(/(\d+%\s*הנחה)/i) ||
                         html.match(/(מבצע[^<]*)/i);

    // Extract rating
    const ratingMatch = html.match(/class="[^"]*rating[^"]*"[^>]*>.*?([\d.]+)/is);
    const reviewCountMatch = html.match(/(\d+)\s*(?:ביקורות|reviews|חוות דעת)/i);

    // ===== NEW: Extract variants, flavors, sizes, colors =====
    const variants: ProductVariant[] = [];
    const flavors: string[] = [];
    const sizes: string[] = [];
    const colors: string[] = [];
    let petType: string | undefined;
    let weight: string | undefined;
    let weightUnit: string | undefined;

    // Extract pet type from category or URL
    const urlLower = url.toLowerCase();
    let decodedUrl = urlLower;
    try { decodedUrl = decodeURIComponent(url).toLowerCase(); } catch (e) {}
    
    if (decodedUrl.includes('כלב') || urlLower.includes('dog')) {
      petType = 'dog';
    } else if (decodedUrl.includes('חתול') || urlLower.includes('cat')) {
      petType = 'cat';
    } else if (decodedUrl.includes('ציפור') || urlLower.includes('bird')) {
      petType = 'bird';
    } else if (decodedUrl.includes('דג') || urlLower.includes('fish')) {
      petType = 'fish';
    }

    // Extract weight from product name or description
    const weightMatch = productName.match(/(\d+(?:\.\d+)?)\s*(ק"ג|קג|ק״ג|kg|גרם|g)\b/i) ||
                       shortDescMatch?.[1]?.match(/(\d+(?:\.\d+)?)\s*(ק"ג|קג|ק״ג|kg|גרם|g)\b/i);
    if (weightMatch) {
      weight = weightMatch[1];
      const unit = weightMatch[2].toLowerCase();
      if (unit.includes('ק') || unit === 'kg') {
        weightUnit = 'kg';
      } else {
        weightUnit = 'g';
      }
    }

    // Helper function to decode URL-encoded strings
    const decodeValue = (val: string): string => {
      try {
        return decodeURIComponent(val.replace(/-/g, ' ').replace(/%/g, '%'));
      } catch {
        return val.replace(/-/g, ' ');
      }
    };

    // Extract WooCommerce variations from data attributes
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
                  stock_status: v.is_in_stock ? 'in_stock' : 'out_of_stock',
                  image_url: v.image?.url
                });
                
                // Categorize variants
                const keyLower = decodedName.toLowerCase();
                if (keyLower.includes('flavor') || keyLower.includes('taste') || keyLower.includes('טעם')) {
                  if (!flavors.includes(decodedValue)) flavors.push(decodedValue);
                } else if (keyLower.includes('size') || keyLower.includes('גודל') || keyLower.includes('משקל')) {
                  if (!sizes.includes(decodedValue)) sizes.push(decodedValue);
                } else if (keyLower.includes('color') || keyLower.includes('צבע')) {
                  if (!colors.includes(decodedValue)) colors.push(decodedValue);
                }
              }
            });
          });
        }
      } catch (e) {
        console.log('Failed to parse variations:', e);
      }
    }

    // Extract from select/option elements (common pattern)
    const selectMatches = html.matchAll(/<select[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/select>/gi);
    for (const selectMatch of selectMatches) {
      const selectId = selectMatch[1].toLowerCase();
      const optionsHtml = selectMatch[2];
      const options = optionsHtml.matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/gi);
      
      for (const opt of options) {
        const value = opt[1] || opt[2];
        const label = opt[2]?.trim();
        if (value && label && !value.includes('בחר')) {
          if (selectId.includes('flavor') || selectId.includes('טעם')) {
            if (!flavors.includes(label)) flavors.push(label);
          } else if (selectId.includes('size') || selectId.includes('גודל') || selectId.includes('weight') || selectId.includes('משקל')) {
            if (!sizes.includes(label)) sizes.push(label);
          } else if (selectId.includes('color') || selectId.includes('צבע')) {
            if (!colors.includes(label)) colors.push(label);
          }
        }
      }
    }

    // Extract from swatches (WooCommerce Swatches plugin)
    const swatchMatches = html.matchAll(/class="[^"]*swatch[^"]*"[^>]*data-value="([^"]+)"/gi);
    for (const swatch of swatchMatches) {
      const value = swatch[1];
      if (value && !sizes.includes(value) && !flavors.includes(value)) {
        // Determine category based on content
        if (/^\d+/.test(value) || value.includes('kg') || value.includes('g')) {
          if (!sizes.includes(value)) sizes.push(value);
        } else {
          if (!flavors.includes(value)) flavors.push(value);
        }
      }
    }

    return {
      product_name: productName,
      product_url: url,
      sku: sku,
      brand: brandMatch?.[1]?.trim(),
      category_path: categoryPath || undefined,
      main_category: categoryPath?.split(' > ')[1],
      sub_category: categoryPath?.split(' > ')[2],
      regular_price: regularPrice > 0 ? regularPrice : undefined,
      sale_price: salePrice,
      final_price: finalPrice > 0 ? finalPrice : undefined,
      currency: '₪',
      discount_text: discountMatch?.[1],
      stock_status: stockStatus,
      main_image_url: mainImageUrl,
      short_description: shortDescMatch?.[1]?.replace(/<[^>]+>/g, '').trim(),
      long_description: longDescMatch?.[1]?.replace(/<[^>]+>/g, '').trim(),
      long_description_html: longDescMatch?.[1],
      meta_title: metaTitleMatch?.[1],
      meta_description: metaDescMatch?.[1],
      h1_title: h1Match?.[1]?.trim(),
      badges: badges.length > 0 ? badges : undefined,
      rating: ratingMatch ? parseFloat(ratingMatch[1]) : undefined,
      review_count: reviewCountMatch ? parseInt(reviewCountMatch[1]) : undefined,
      json_ld_data: jsonLdData,
      // New fields
      variants: variants.length > 0 ? variants : undefined,
      pet_type: petType,
      weight,
      weight_unit: weightUnit,
      flavors: flavors.length > 0 ? flavors : undefined,
      sizes: sizes.length > 0 ? sizes : undefined,
      colors: colors.length > 0 ? colors : undefined,
    };
  } catch (error) {
    console.error('Error parsing product:', error);
    return null;
  }
}

// Extract product URLs from page - more comprehensive patterns
function extractProductUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const urlObj = new URL(baseUrl);
  const domain = urlObj.origin;
  
  // Multiple patterns for different WooCommerce setups
  const patterns = [
    // Standard /product/ path
    /href="(https?:\/\/[^"]*\/product\/[^"#?]+)/gi,
    // Shop page products
    /href="(https?:\/\/[^"]*\/shop\/[^"#?]+)/gi,
    // Hebrew product category pages with product links
    /href="(https?:\/\/[^"]*\/[^"]*-[^"]*\/)"[^>]*class="[^"]*woocommerce-loop-product__link/gi,
    // Product links by data-product-id
    /data-product_id="[^"]*"[^>]*href="([^"#?]+)"/gi,
    // WooCommerce product image links
    /<a[^>]*href="([^"#?]+)"[^>]*class="[^"]*woocommerce-LoopProduct-link/gi,
    // Any link inside product element
    /<li[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]*?href="([^"#?]+)"/gi,
    // Post type product links
    /href="([^"#?]+)"[^>]*class="[^"]*post-type-product/gi,
    // Products with data-id
    /data-id="[^"]*"[^>]*>[\s\S]*?href="([^"#?]+)"/gi,
  ];
  
  for (const pattern of patterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      let url = match[1];
      // Clean URL
      url = url.split('?')[0].split('#')[0];
      // Make absolute if relative
      if (url.startsWith('/')) {
        url = domain + url;
      }
      // Validate URL belongs to the domain and is not a category
      if (url.startsWith(domain) && 
          !urls.includes(url) && 
          !url.includes('/product-category/') &&
          !url.includes('/product-tag/') &&
          !url.includes('/cart') &&
          !url.includes('/checkout') &&
          !url.includes('/my-account') &&
          !url.endsWith('/shop/') &&
          !url.endsWith('/')) { // Skip directory-like URLs
        urls.push(url);
      }
    }
  }

  // Also look for WooCommerce add-to-cart links to find product pages
  const wooPattern = /href="([^"]*\?add-to-cart=\d+)"/gi;
  const wooMatches = html.matchAll(wooPattern);
  
  for (const match of wooMatches) {
    let cartUrl = match[1];
    // Make absolute
    if (cartUrl.startsWith('/')) {
      cartUrl = domain + cartUrl;
    }
    // Extract the actual product page URL (before query params)
    const productPageUrl = cartUrl.split('?')[0];
    if (productPageUrl.startsWith(domain) && 
        !urls.includes(productPageUrl) && 
        !productPageUrl.endsWith('/')) {
      urls.push(productPageUrl);
    }
  }

  // Look for products in structured JSON-LD data
  const jsonLdMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of jsonLdMatches) {
    try {
      const jsonData = JSON.parse(match[1]);
      // Handle ItemList schema
      if (jsonData['@type'] === 'ItemList' && jsonData.itemListElement) {
        for (const item of jsonData.itemListElement) {
          const productUrl = item.url || item.item?.url;
          if (productUrl && productUrl.startsWith(domain) && !urls.includes(productUrl)) {
            urls.push(productUrl);
          }
        }
      }
      // Handle Product array
      if (Array.isArray(jsonData)) {
        for (const item of jsonData) {
          if (item['@type'] === 'Product' && item.url) {
            if (!urls.includes(item.url)) urls.push(item.url);
          }
        }
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  return urls;
}

// Extract category/pagination URLs
function extractNavigationUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  
  // Category links
  const categoryPattern = /href="(https?:\/\/[^"]*\/product-category\/[^"]+)"/gi;
  const categoryMatches = html.matchAll(categoryPattern);
  
  for (const match of categoryMatches) {
    const url = match[1].split('?')[0]; // Remove query params
    if (url.startsWith(baseUrl) && !urls.includes(url)) {
      urls.push(url);
    }
  }

  // Pagination links
  const paginationPattern = /href="([^"]+\/page\/\d+[^"]*)"/gi;
  const paginationMatches = html.matchAll(paginationPattern);
  
  for (const match of paginationMatches) {
    let url = match[1];
    if (!url.startsWith('http')) {
      url = baseUrl + url;
    }
    if (url.startsWith(baseUrl) && !urls.includes(url)) {
      urls.push(url);
    }
  }

  return urls;
}

// Map pet types to URL patterns (including URL-encoded Hebrew)
const petTypePatterns: Record<string, string[]> = {
  'dog': ['כלב', 'כלבים', 'dog', 'dogs', '/dogs/', '/dog/', '%d7%9b%d7%9c%d7%91', '%D7%9B%D7%9C%D7%91'],
  'cat': ['חתול', 'חתולים', 'cat', 'cats', '/cats/', '/cat/', '%d7%97%d7%aa%d7%95%d7%9c', '%D7%97%D7%AA%D7%95%D7%9C'],
  'bird': ['ציפור', 'ציפורים', 'bird', 'birds', '/birds/', '/bird/', '%d7%a6%d7%99%d7%a4%d7%95%d7%a8', '%D6%A6%D7%99%D7%A4%D7%95%D7%A8'],
};

// Map product categories to URL patterns (including URL-encoded Hebrew)
const productCategoryPatterns: Record<string, string[]> = {
  'dry-food': ['מזון-יבש', 'dry-food', 'יבש', '%d7%99%d7%91%d7%a9', '%D7%99%D7%91%D7%A9', 'מזון'],
  'wet-food': ['מזון-רטוב', 'wet-food', 'רטוב', 'פאוץ', 'שימורים', '%d7%a8%d7%98%d7%95%d7%91', '%D7%A8%D7%98%D7%95%D7%91'],
  'treats': ['חטיפים', 'treats', 'snacks', 'חטיף', '%d7%97%d7%98%d7%99%d7%a4', '%D7%97%D7%98%D7%99%D7%A4'],
  'toys': ['צעצועים', 'toys', 'צעצוע', '%d7%a6%d7%a2%d7%a6%d7%95%d7%a2', '%D6%A6%D7%A2%D6%A6%D7%95%D7%A2'],
  'accessories': ['אביזרים', 'accessories', 'אביזר', '%d7%90%d7%91%d7%99%d7%96%d7%a8', '%D7%90%D7%91%D7%99%D7%96%D7%A8'],
  'health': ['בריאות', 'health', 'vitamins', 'ויטמינים', '%d7%91%d7%a8%d7%99%d7%90%d7%95%d7%aa', '%D7%91%D7%A8%D7%99%D7%90%D7%95%D7%AA'],
  'grooming': ['טיפוח', 'grooming', 'שמפו', '%d7%98%d7%99%d7%a4%d7%95%d7%97', '%D7%98%D7%99%D7%A4%D7%95%D7%97'],
};

function urlMatchesPetTypes(url: string, petTypes: string[]): boolean {
  if (!petTypes || petTypes.length === 0) return true;
  // Decode the URL for Hebrew comparison
  let decodedUrl = url.toLowerCase();
  try {
    decodedUrl = decodeURIComponent(url).toLowerCase();
  } catch (e) {
    // If decoding fails, use original
  }
  
  return petTypes.some(petType => {
    const patterns = petTypePatterns[petType] || [];
    return patterns.some(pattern => 
      decodedUrl.includes(pattern.toLowerCase()) || 
      url.toLowerCase().includes(pattern.toLowerCase())
    );
  });
}

function urlMatchesProductCategories(url: string, categories: string[]): boolean {
  if (!categories || categories.length === 0) return true;
  // Decode the URL for Hebrew comparison
  let decodedUrl = url.toLowerCase();
  try {
    decodedUrl = decodeURIComponent(url).toLowerCase();
  } catch (e) {
    // If decoding fails, use original
  }
  
  return categories.some(cat => {
    const patterns = productCategoryPatterns[cat] || [];
    return patterns.some(pattern => 
      decodedUrl.includes(pattern.toLowerCase()) || 
      url.toLowerCase().includes(pattern.toLowerCase())
    );
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      mode = 'full', // 'scan', 'preview', or 'full'
      jobId, 
      baseUrl = 'https://homepetcenter.co.il', 
      maxProducts,
      petTypes = [],
      productCategories = [],
      productUrl, // For preview mode
      productUrls: providedUrls, // For full mode with pre-scanned URLs
    } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');

    if (!firecrawlKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // SCAN MODE: Scrape the page and extract product URLs directly
    if (mode === 'scan') {
      console.log('Scan mode: Scraping page to find product URLs for', baseUrl);
      
      const urlObj = new URL(baseUrl);
      const baseDomain = urlObj.origin;
      
      // Scrape a page to extract links and find pagination
      const scrapePage = async (pageUrl: string) => {
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: pageUrl,
            formats: ['links', 'html'],
            onlyMainContent: false,
          }),
        });

        const scrapeData = await scrapeResponse.json();
        
        if (!scrapeResponse.ok) {
          console.error('Scrape failed for', pageUrl, ':', scrapeData);
          return { links: [], html: '', productUrls: [], paginationUrls: [], maxPage: 1 };
        }

        const links: string[] = scrapeData.data?.links || scrapeData.links || [];
        const html = scrapeData.data?.html || scrapeData.html || '';
        const extractedUrls = html ? extractProductUrls(html, baseDomain) : [];
        
        // Find pagination URLs - multiple patterns
        const paginationUrls: string[] = [];
        let maxPage = 1;
        
        // Pattern 1: /page/N/
        const pageMatches = html.matchAll(/href="([^"]*\/page\/(\d+)[^"]*)"/gi);
        for (const match of pageMatches) {
          let pageUrl = match[1];
          const pageNum = parseInt(match[2]);
          if (pageNum > maxPage) maxPage = pageNum;
          if (!pageUrl.startsWith('http')) {
            pageUrl = baseDomain + pageUrl;
          }
          if (!paginationUrls.includes(pageUrl)) {
            paginationUrls.push(pageUrl);
          }
        }
        
        // Pattern 2: ?paged=N or &paged=N (WooCommerce)
        const pagedMatches = html.matchAll(/href="([^"]*[?&]paged=(\d+)[^"]*)"/gi);
        for (const match of pagedMatches) {
          let pageUrl = match[1];
          const pageNum = parseInt(match[2]);
          if (pageNum > maxPage) maxPage = pageNum;
          if (!pageUrl.startsWith('http')) {
            pageUrl = baseDomain + pageUrl;
          }
          if (!paginationUrls.includes(pageUrl)) {
            paginationUrls.push(pageUrl);
          }
        }
        
        // Look for "last page" or total pages indicator
        const lastPageMatch = html.match(/page\/(\d+)[^"]*"[^>]*class="[^"]*last/i) ||
                              html.match(/עמוד\s+\d+\s+מתוך\s+(\d+)/i) ||
                              html.match(/Page\s+\d+\s+of\s+(\d+)/i);
        if (lastPageMatch) {
          const lastPage = parseInt(lastPageMatch[1]);
          if (lastPage > maxPage) maxPage = lastPage;
        }
        
        // Filter product URLs from links - more inclusive filtering
        const productUrls = links.filter(url => {
          const lowerUrl = url.toLowerCase();
          let decodedUrl = lowerUrl;
          try {
            decodedUrl = decodeURIComponent(url).toLowerCase();
          } catch (e) {}
          // Include any product-like URL from the same domain
          return url.startsWith(baseDomain) &&
                 (lowerUrl.includes('/product/') || 
                  decodedUrl.includes('/product/') ||
                  lowerUrl.includes('/shop/') ||
                  lowerUrl.includes('/store/')) && 
                 !lowerUrl.includes('/product-category/') &&
                 !lowerUrl.includes('/product-tag/') &&
                 !lowerUrl.includes('/cart') &&
                 !lowerUrl.includes('/checkout') &&
                 !lowerUrl.includes('/my-account');
        });
        
        // Also find category URLs for deeper crawling
        const categoryUrls = links.filter(url => {
          const lowerUrl = url.toLowerCase();
          return url.startsWith(baseDomain) &&
                 (lowerUrl.includes('/product-category/') ||
                  lowerUrl.includes('/shop/') && lowerUrl.split('/').length > 5);
        });
        
        return { 
          links, 
          html, 
          productUrls: [...new Set([...productUrls, ...extractedUrls])],
          paginationUrls,
          categoryUrls,
          maxPage
        };
      };

      // Scrape first page
      console.log('Scraping first page:', baseUrl);
      const firstPageResult = await scrapePage(baseUrl);
      
      let allProductUrls = [...firstPageResult.productUrls];
      console.log('First page: found', allProductUrls.length, 'product URLs');
      console.log('Pagination pages found:', firstPageResult.paginationUrls.length);
      console.log('Max page detected:', firstPageResult.maxPage);
      
      // Build pagination URLs if not found in links
      const maxPagesToScrape = 50; // Increased from 10 to 50
      let pagesToScrape: string[] = [...firstPageResult.paginationUrls];
      
      // If we found maxPage > what we have, generate missing page URLs
      if (firstPageResult.maxPage > pagesToScrape.length + 1) {
        const urlObj = new URL(baseUrl);
        for (let i = 2; i <= Math.min(firstPageResult.maxPage, maxPagesToScrape); i++) {
          // Try /page/N/ format
          let pageUrl = baseUrl.replace(/\/?$/, '') + `/page/${i}/`;
          if (!pagesToScrape.includes(pageUrl)) {
            pagesToScrape.push(pageUrl);
          }
        }
      }
      
      // If still no pagination found, try to generate pages anyway
      if (pagesToScrape.length === 0 && allProductUrls.length >= 10) {
        console.log('No pagination found but products exist, trying to generate page URLs...');
        for (let i = 2; i <= 20; i++) {
          pagesToScrape.push(baseUrl.replace(/\/?$/, '') + `/page/${i}/`);
        }
      }
      
      console.log('Will scrape', Math.min(pagesToScrape.length, maxPagesToScrape), 'pagination pages');
      
      // Scrape pagination pages
      let emptyPageCount = 0;
      const maxEmptyPages = 3; // Allow up to 3 consecutive empty pages before stopping
      
      for (const pageUrl of pagesToScrape.slice(0, maxPagesToScrape)) {
        console.log('Scraping pagination page:', pageUrl);
        try {
          const pageResult = await scrapePage(pageUrl);
          const newUrls = pageResult.productUrls.filter(url => !allProductUrls.includes(url));
          
          if (pageResult.productUrls.length === 0) {
            emptyPageCount++;
            console.log(`Empty page (${emptyPageCount}/${maxEmptyPages})`);
            if (emptyPageCount >= maxEmptyPages) {
              console.log('Too many consecutive empty pages, stopping pagination');
              break;
            }
          } else {
            emptyPageCount = 0; // Reset counter when we find products
          }
          
          allProductUrls = [...allProductUrls, ...newUrls];
          console.log('Page added', newUrls.length, 'new products. Total:', allProductUrls.length);
        } catch (e) {
          console.error('Failed to scrape page:', pageUrl, e);
          // Don't count errors as empty pages
        }
      }
      
      // Also scrape discovered category pages if we still don't have many products
      const categoryUrls = firstPageResult.categoryUrls || [];
      if (allProductUrls.length < 50 && categoryUrls.length > 0) {
        console.log('Scanning', categoryUrls.length, 'category pages for more products');
        const categoryUrlsToScrape = categoryUrls.slice(0, 10);
        
        for (const catUrl of categoryUrlsToScrape) {
          console.log('Scraping category:', catUrl);
          try {
            const catResult = await scrapePage(catUrl);
            const newUrls = catResult.productUrls.filter(url => !allProductUrls.includes(url));
            allProductUrls = [...allProductUrls, ...newUrls];
            console.log('Category added', newUrls.length, 'new products. Total:', allProductUrls.length);
          } catch (e) {
            console.error('Failed to scrape category:', catUrl, e);
          }
        }
      }

      // Remove duplicates
      allProductUrls = [...new Set(allProductUrls)];
      console.log('Final result:', allProductUrls.length, 'unique product URLs');

      // Note: We don't filter by pet type/category here because the user already 
      // selected a specific category page - all products on that page are relevant

      return new Response(
        JSON.stringify({ 
          success: true, 
          totalUrls: allProductUrls.length,
          productUrls: allProductUrls,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PREVIEW MODE: Scrape a single product and return its data
    if (mode === 'preview') {
      if (!productUrl) {
        return new Response(
          JSON.stringify({ success: false, error: 'Product URL is required for preview' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Preview mode: Scraping single product', productUrl);

      const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: productUrl,
          formats: ['html', 'markdown'],
          onlyMainContent: false,
        }),
      });

      const scrapeData = await scrapeResponse.json();

      if (!scrapeResponse.ok || !scrapeData.success) {
        throw new Error('Failed to scrape product');
      }

      const html = scrapeData.data?.html || scrapeData.html || '';
      const product = parseProductFromHtml(html, productUrl);

      if (!product) {
        throw new Error('Could not parse product data');
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          product: product,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FULL MODE: Full scraping with job tracking
    if (!jobId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Job ID is required for full scraping' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if job was stopped or paused
    const checkJobStatus = async (): Promise<'running' | 'stopped' | 'paused'> => {
      const { data } = await supabase
        .from('scraping_jobs')
        .select('status')
        .eq('id', jobId)
        .single();
      return data?.status || 'running';
    };

    // Wait while paused
    const waitIfPaused = async (): Promise<boolean> => {
      let status = await checkJobStatus();
      while (status === 'paused') {
        console.log('Job paused, waiting...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        status = await checkJobStatus();
      }
      return status === 'stopped';
    };

    // Update job status
    await supabase
      .from('scraping_jobs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', jobId);

    console.log('Full mode: Starting scrape for:', baseUrl);
    console.log('Pet types filter:', petTypes);
    console.log('Product categories filter:', productCategories);

    // Use provided URLs if available, otherwise map the site
    let productUrls: string[] = providedUrls || [];
    
    if (productUrls.length === 0) {
      console.log('Mapping website URLs...');
      const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: baseUrl,
          limit: 5000,
          includeSubdomains: false,
        }),
      });

      const mapData = await mapResponse.json();
      
      if (!mapResponse.ok) {
        throw new Error(mapData.error || 'Failed to map website');
      }

      const allUrls: string[] = mapData.links || [];
      console.log('Found', allUrls.length, 'URLs');

      // Filter for product URLs matching criteria
      productUrls = allUrls.filter(url => 
        url.includes('/product/') || 
        url.includes('/shop/') ||
        url.match(/\/[^\/]+\/$/)
      );

      // Apply pet type filter
      if (petTypes.length > 0) {
        productUrls = productUrls.filter(url => urlMatchesPetTypes(url, petTypes));
        console.log('After pet type filter:', productUrls.length, 'URLs');
      }

      // Apply product category filter
      if (productCategories.length > 0) {
        productUrls = productUrls.filter(url => urlMatchesProductCategories(url, productCategories));
        console.log('After category filter:', productUrls.length, 'URLs');
      }
    }

    console.log('Found', productUrls.length, 'potential product URLs');

    // Update job with total
    const totalToScrape = maxProducts ? Math.min(productUrls.length, maxProducts) : productUrls.length;
    await supabase
      .from('scraping_jobs')
      .update({ total_products: totalToScrape, total_pages: productUrls.length })
      .eq('id', jobId);

    let scrapedCount = 0;
    let skippedDuplicates = 0;
    const urlsToScrape = productUrls.slice(0, totalToScrape);

    // Get existing product URLs for duplicate checking
    const { data: existingProducts } = await supabase
      .from('scraped_products')
      .select('product_url, sku')
      .in('product_url', urlsToScrape);
    
    const existingUrls = new Set(existingProducts?.map(p => p.product_url) || []);
    const existingSkus = new Set(existingProducts?.filter(p => p.sku).map(p => p.sku) || []);
    console.log('Found', existingUrls.size, 'existing products in database');

    // Step 2: Scrape each product page
    for (const productUrl of urlsToScrape) {
      // Check if job was stopped or paused
      const shouldStop = await waitIfPaused();
      if (shouldStop) {
        console.log('Job stopped by user');
        return new Response(
          JSON.stringify({ success: true, message: 'Scraping stopped by user', scrapedCount }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        console.log('Scraping:', productUrl);

        // Add delay to be respectful to the server
        await new Promise(resolve => setTimeout(resolve, 500));

        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: productUrl,
            formats: ['html', 'markdown'],
            onlyMainContent: false,
          }),
        });

        const scrapeData = await scrapeResponse.json();

        if (!scrapeResponse.ok || !scrapeData.success) {
          console.log('Failed to scrape:', productUrl);
          continue;
        }

        const html = scrapeData.data?.html || scrapeData.html || '';
        const product = parseProductFromHtml(html, productUrl);

        if (product && product.product_name) {
          // Check if it's actually a product page (has price or add to cart)
          if (html.includes('add-to-cart') || html.includes('₪') || product.final_price) {
            
            // Check for duplicates by URL or SKU
            const isDuplicate = existingUrls.has(productUrl) || 
                               (product.sku && existingSkus.has(product.sku));
            
            if (isDuplicate) {
              console.log('Skipping duplicate product:', productUrl);
              skippedDuplicates++;
              
              // Still update if exists (upsert behavior)
              const { error: updateError } = await supabase
                .from('scraped_products')
                .update({
                  ...product,
                  updated_at: new Date().toISOString(),
                })
                .eq('product_url', productUrl);
              
              if (!updateError) {
                console.log('Updated existing product:', product.product_name);
              }
              continue;
            }
            
            // Insert new product
            const { data: insertedProduct, error: insertError } = await supabase
              .from('scraped_products')
              .insert({
                ...product,
                scraped_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (insertError) {
              console.error('Error inserting product:', insertError);
              // If duplicate error, track it
              if (insertError.code === '23505') {
                skippedDuplicates++;
                console.log('Duplicate detected:', productUrl);
              }
            } else {
              scrapedCount++;
              existingUrls.add(productUrl);
              if (product.sku) existingSkus.add(product.sku);
              console.log('Saved NEW product:', product.product_name);

              // Extract and save images - improved extraction
              const galleryImages: string[] = [];
              
              // Try multiple patterns for images
              const patterns = [
                /data-large_image="([^"]+)"/gi,
                /data-src="([^"]+\.(?:jpg|jpeg|png|webp|gif)[^"]*)"/gi,
                /srcset="([^"\s]+\.(?:jpg|jpeg|png|webp|gif)[^"\s]*)[\s,]/gi,
                /<img[^>]+src="([^"]+\.(?:jpg|jpeg|png|webp|gif)[^"]*)"/gi,
              ];
              
              for (const pattern of patterns) {
                const matches = html.matchAll(pattern);
                for (const match of matches) {
                  const imgUrl = match[1];
                  if (imgUrl && 
                      !galleryImages.includes(imgUrl) && 
                      !imgUrl.includes('placeholder') &&
                      !imgUrl.includes('woocommerce-placeholder') &&
                      imgUrl.includes('homepetcenter')) {
                    galleryImages.push(imgUrl);
                  }
                }
              }
              
              // Also try og:image
              const ogImageMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
              if (ogImageMatch && ogImageMatch[1] && !galleryImages.includes(ogImageMatch[1])) {
                galleryImages.unshift(ogImageMatch[1]); // Add to beginning as main
              }
              
              // Update product with main image if found
              if (galleryImages.length > 0 && !product.main_image_url) {
                await supabase
                  .from('scraped_products')
                  .update({ main_image_url: galleryImages[0] })
                  .eq('id', insertedProduct.id);
              }

              if (insertedProduct && galleryImages.length > 0) {
                const imageRecords = galleryImages.map((url, index) => ({
                  product_id: insertedProduct.id,
                  image_url: url,
                  is_main: index === 0,
                  display_order: index,
                }));

                await supabase.from('product_images').upsert(imageRecords, { onConflict: 'product_id,image_url' });
                console.log('Saved', galleryImages.length, 'images for product');
              }

              // Extract variations
              const variationMatches = html.match(/class="[^"]*variation[^"]*"[^>]*>([^<]+)/gi) || [];
              // ... variation extraction logic would go here
            }
          }
        }

        // Update progress
        await supabase
          .from('scraping_jobs')
          .update({ scraped_products: scrapedCount, scraped_pages: scrapedCount })
          .eq('id', jobId);

      } catch (error) {
        console.error('Error scraping URL:', productUrl, error);
      }
    }

    // Complete the job
    await supabase
      .from('scraping_jobs')
      .update({ 
        status: 'completed', 
        scraped_products: scrapedCount,
        completed_at: new Date().toISOString() 
      })
      .eq('id', jobId);

    console.log('Scraping completed. New products:', scrapedCount, 'Duplicates skipped/updated:', skippedDuplicates);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Scraping completed. Found ${scrapedCount} new products. ${skippedDuplicates} duplicates updated.`,
        scrapedCount,
        skippedDuplicates
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scraping error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
