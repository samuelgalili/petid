import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 8 } = await req.json();
    
    if (!query) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Query is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Firecrawl connector not configured',
        images: []
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Searching images for:', query);

    // Use Firecrawl search to find real product pages
    const searchQuery = `${query} product image site:amazon.com OR site:chewy.com OR site:petco.com OR site:petsmart.com`;
    
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: limit * 2, // Get more results to filter
        lang: 'en',
        scrapeOptions: {
          formats: ['html']
        }
      }),
    });

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error('Firecrawl search error:', errorData);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Search failed',
        images: []
      }), {
        status: searchResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const searchData = await searchResponse.json();
    console.log('Firecrawl search results:', searchData.data?.length || 0);

    const images: string[] = [];
    
    // Extract images from search results
    if (searchData.data && Array.isArray(searchData.data)) {
      for (const result of searchData.data) {
        if (images.length >= limit) break;
        
        const html = result.html || '';
        const url = result.url || '';
        
        // Extract product images from HTML
        const extractedImages = extractProductImages(html, url);
        
        for (const img of extractedImages) {
          if (images.length >= limit) break;
          if (!images.includes(img) && isValidProductImage(img)) {
            images.push(img);
          }
        }
      }
    }

    console.log('Found images:', images.length);

    // If no images found, return empty array (no fake fallbacks)
    if (images.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        images: [],
        query,
        message: 'לא נמצאו תמונות רלוונטיות'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      images: images.slice(0, limit),
      query
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error searching product image:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      images: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractProductImages(html: string, pageUrl: string): string[] {
  const images: string[] = [];
  
  // Pattern 1: JSON-LD product images
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const match of jsonLdMatch) {
      try {
        const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '');
        const data = JSON.parse(jsonContent);
        
        if (data.image) {
          const imgs = Array.isArray(data.image) ? data.image : [data.image];
          for (const img of imgs) {
            if (typeof img === 'string') {
              images.push(img);
            } else if (img?.url) {
              images.push(img.url);
            }
          }
        }
      } catch (e) {
        // Continue if JSON parsing fails
      }
    }
  }
  
  // Pattern 2: Open Graph images
  const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/gi);
  if (ogImageMatch) {
    for (const match of ogImageMatch) {
      const urlMatch = match.match(/content="([^"]+)"/);
      if (urlMatch?.[1]) {
        images.push(urlMatch[1]);
      }
    }
  }
  
  // Pattern 3: Main product images with common class names
  const productImagePatterns = [
    /<img[^>]*class="[^"]*(?:product-image|main-image|primary-image|hero-image)[^"]*"[^>]*src="([^"]+)"/gi,
    /<img[^>]*data-src="([^"]+)"[^>]*class="[^"]*product[^"]*"/gi,
    /<img[^>]*id="[^"]*(?:main|primary|product)[^"]*"[^>]*src="([^"]+)"/gi,
  ];
  
  for (const pattern of productImagePatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      if (match[1]) {
        images.push(resolveUrl(match[1], pageUrl));
      }
    }
  }
  
  // Pattern 4: Amazon-specific images
  const amazonPatterns = [
    /data-old-hires="([^"]+)"/g,
    /data-a-dynamic-image='\{([^}]+)\}'/g,
    /"hiRes":"([^"]+)"/g,
    /"large":"([^"]+)"/g,
  ];
  
  for (const pattern of amazonPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      if (match[1]) {
        // For dynamic image JSON, extract URLs
        if (match[1].includes('http')) {
          const urls = match[1].match(/https?:\/\/[^"',\s]+\.(?:jpg|jpeg|png|webp)/gi);
          if (urls) {
            images.push(...urls);
          }
        } else {
          images.push(match[1]);
        }
      }
    }
  }
  
  // Pattern 5: Chewy/Petco-specific images
  const retailerPatterns = [
    /data-zoom-image="([^"]+)"/g,
    /data-main-image="([^"]+)"/g,
  ];
  
  for (const pattern of retailerPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      if (match[1]) {
        images.push(resolveUrl(match[1], pageUrl));
      }
    }
  }
  
  return images;
}

function resolveUrl(imgUrl: string, pageUrl: string): string {
  if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
    return imgUrl;
  }
  if (imgUrl.startsWith('//')) {
    return 'https:' + imgUrl;
  }
  try {
    return new URL(imgUrl, pageUrl).href;
  } catch {
    return imgUrl;
  }
}

function isValidProductImage(url: string): boolean {
  // Filter out small images, icons, logos, etc.
  const invalidPatterns = [
    /icon/i,
    /logo/i,
    /sprite/i,
    /button/i,
    /banner/i,
    /avatar/i,
    /placeholder/i,
    /loading/i,
    /spinner/i,
    /\d+x\d+/,  // Very small dimensions like 1x1
    /transparent/i,
    /blank/i,
  ];
  
  for (const pattern of invalidPatterns) {
    if (pattern.test(url)) {
      return false;
    }
  }
  
  // Must be an image URL
  if (!url.match(/\.(jpg|jpeg|png|webp|gif)/i) && !url.includes('/images/')) {
    return false;
  }
  
  return true;
}
