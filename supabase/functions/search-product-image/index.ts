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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Searching images for:', query);

    // Use AI to find relevant product images from known sources
    const prompt = `Find ${limit} real product images for pet products matching: "${query}"

Search for actual product images from major pet retailers and brands like:
- Amazon product images
- Chewy.com 
- Petco
- PetSmart
- Royal Canin, Hill's, Purina official sites
- Israeli pet stores (Pet2Go, Zoo-Land, etc.)

Return ONLY a JSON array of direct image URLs (no explanation text):
["https://example.com/image1.jpg", "https://example.com/image2.jpg", ...]

Important:
- Only include actual product images (not stock photos)
- Images should be high quality and square/product-oriented
- Prefer images with white/clean backgrounds
- Return real, working URLs from known e-commerce sites`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI image search response:', content);

    let images: string[] = [];
    try {
      // Try to parse JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          images = parsed.filter((url: unknown) => 
            typeof url === 'string' && 
            (url.startsWith('http://') || url.startsWith('https://'))
          );
        }
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Try to extract URLs with regex as fallback
      const urlRegex = /https?:\/\/[^\s"'\]]+\.(jpg|jpeg|png|webp|gif)/gi;
      const matches = content.match(urlRegex);
      if (matches) {
        images = matches.slice(0, limit);
      }
    }

    // Fallback: use placeholder product images if no results
    if (images.length === 0) {
      // Use Unsplash for pet product-related images as fallback
      const fallbackQueries = ['pet food', 'dog food bag', 'cat food', 'pet treats', 'dog toys'];
      const randomQuery = fallbackQueries[Math.floor(Math.random() * fallbackQueries.length)];
      images = [
        `https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&h=400&fit=crop`,
        `https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=400&fit=crop`,
        `https://images.unsplash.com/photo-1615751072497-5f5169febe17?w=400&h=400&fit=crop`,
        `https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=400&fit=crop`,
      ];
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
