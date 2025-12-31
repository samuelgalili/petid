import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const mainImageMatch = html.match(/data-large_image="([^"]+)"/i) ||
                          html.match(/data-src="([^"]+)"/i) ||
                          html.match(/class="[^"]*woocommerce-product-gallery__image[^"]*"[^>]*>.*?<img[^>]+src="([^"]+)"/is) ||
                          html.match(/<img[^>]+class="[^"]*wp-post-image[^"]*"[^>]+src="([^"]+)"/i) ||
                          html.match(/property="og:image"[^>]+content="([^"]+)"/i) ||
                          html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
    
    // Extract category/breadcrumb
    const breadcrumbMatch = html.match(/class="[^"]*breadcrumb[^"]*"[^>]*>(.*?)<\/nav>/is);
    let categoryPath = '';
    if (breadcrumbMatch) {
      const links = breadcrumbMatch[1].match(/>([^<]+)<\/a>/g) || [];
      categoryPath = links.map(l => l.replace(/>|<\/a>/g, '')).join(' > ');
    }

    // Extract SKU
    const skuMatch = html.match(/מק"ט[:\s]*([^<\s]+)/i) ||
                     html.match(/sku[:\s]*([^<\s]+)/i) ||
                     html.match(/data-sku="([^"]+)"/i);

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

    return {
      product_name: productName,
      product_url: url,
      sku: skuMatch?.[1]?.trim(),
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
      main_image_url: mainImageMatch?.[1],
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
    };
  } catch (error) {
    console.error('Error parsing product:', error);
    return null;
  }
}

// Extract product URLs from page
function extractProductUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const productLinkPattern = /href="(https?:\/\/[^"]*\/product\/[^"]+)"/gi;
  const matches = html.matchAll(productLinkPattern);
  
  for (const match of matches) {
    const url = match[1];
    if (url.startsWith(baseUrl) && !urls.includes(url)) {
      urls.push(url);
    }
  }

  // Also look for WooCommerce product links
  const wooPattern = /href="(https?:\/\/[^"]*\?add-to-cart=[^"]+)"/gi;
  const wooMatches = html.matchAll(wooPattern);
  
  for (const match of wooMatches) {
    const cartUrl = match[1];
    // Extract the actual product page URL
    const productPageUrl = cartUrl.split('?')[0];
    if (productPageUrl.startsWith(baseUrl) && !urls.includes(productPageUrl)) {
      urls.push(productPageUrl);
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

// Map pet types to URL patterns
const petTypePatterns: Record<string, string[]> = {
  'dog': ['כלב', 'כלבים', 'dog', 'dogs', '/dogs/', '/dog/'],
  'cat': ['חתול', 'חתולים', 'cat', 'cats', '/cats/', '/cat/'],
  'bird': ['ציפור', 'ציפורים', 'bird', 'birds', '/birds/', '/bird/'],
};

// Map product categories to URL patterns
const productCategoryPatterns: Record<string, string[]> = {
  'dry-food': ['מזון-יבש', 'dry-food', 'יבש'],
  'wet-food': ['מזון-רטוב', 'wet-food', 'רטוב', 'פאוץ', 'שימורים'],
  'treats': ['חטיפים', 'treats', 'snacks', 'חטיף'],
  'toys': ['צעצועים', 'toys', 'צעצוע'],
  'accessories': ['אביזרים', 'accessories', 'אביזר'],
  'health': ['בריאות', 'health', 'vitamins', 'ויטמינים'],
  'grooming': ['טיפוח', 'grooming', 'שמפו'],
};

function urlMatchesPetTypes(url: string, petTypes: string[]): boolean {
  if (!petTypes || petTypes.length === 0) return true;
  const lowerUrl = url.toLowerCase();
  return petTypes.some(petType => {
    const patterns = petTypePatterns[petType] || [];
    return patterns.some(pattern => lowerUrl.includes(pattern.toLowerCase()));
  });
}

function urlMatchesProductCategories(url: string, categories: string[]): boolean {
  if (!categories || categories.length === 0) return true;
  const lowerUrl = url.toLowerCase();
  return categories.some(cat => {
    const patterns = productCategoryPatterns[cat] || [];
    return patterns.some(pattern => lowerUrl.includes(pattern.toLowerCase()));
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      jobId, 
      baseUrl = 'https://homepetcenter.co.il', 
      maxProducts,
      petTypes = [],
      productCategories = []
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

    // Check if job was stopped
    const checkJobStatus = async (): Promise<boolean> => {
      const { data } = await supabase
        .from('scraping_jobs')
        .select('status')
        .eq('id', jobId)
        .single();
      return data?.status === 'stopped';
    };

    // Update job status
    await supabase
      .from('scraping_jobs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', jobId);

    console.log('Starting scrape for:', baseUrl);
    console.log('Pet types filter:', petTypes);
    console.log('Product categories filter:', productCategories);

    // Step 1: Map the website to get all URLs
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
    let productUrls = allUrls.filter(url => 
      url.includes('/product/') || 
      url.includes('/shop/') ||
      url.match(/\/[^\/]+\/$/) // Potential product pages
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

    console.log('Found', productUrls.length, 'potential product URLs after filtering');

    // Update job with total
    const totalToScrape = maxProducts ? Math.min(productUrls.length, maxProducts) : productUrls.length;
    await supabase
      .from('scraping_jobs')
      .update({ total_products: totalToScrape, total_pages: productUrls.length })
      .eq('id', jobId);

    let scrapedCount = 0;
    const urlsToScrape = productUrls.slice(0, totalToScrape);

    // Step 2: Scrape each product page
    for (const productUrl of urlsToScrape) {
      // Check if job was stopped
      if (await checkJobStatus()) {
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
            
            // Insert or update product
            const { data: insertedProduct, error: insertError } = await supabase
              .from('scraped_products')
              .upsert({
                ...product,
                scraped_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }, { onConflict: 'product_url' })
              .select()
              .single();

            if (insertError) {
              console.error('Error inserting product:', insertError);
            } else {
              scrapedCount++;
              console.log('Saved product:', product.product_name);

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

    console.log('Scraping completed. Total products:', scrapedCount);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Scraping completed. Found ${scrapedCount} products.`,
        scrapedCount 
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
