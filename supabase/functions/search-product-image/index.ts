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
    const { productName, searchQuery, sku } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Searching image for:', productName, 'Query:', searchQuery);

    // Use AI to suggest image URLs from known pet product sources
    const prompt = `אתה עוזר למצוא תמונות מוצרים לחיות מחמד.

המוצר: "${productName}"
${sku ? `מק"ט: ${sku}` : ''}
${searchQuery ? `מונח חיפוש: ${searchQuery}` : ''}

ספק 3 אפשרויות של URLs לתמונות מוצרים דומים מאתרים ידועים כמו:
- אמזון
- Chewy
- Petco
- אתרי יצרנים (Royal Canin, Hill's, etc.)

החזר בפורמט JSON:
{
  "suggested_images": [
    {"url": "URL לתמונה", "source": "שם האתר", "confidence": "high/medium/low"}
  ],
  "search_terms": ["מונחי חיפוש נוספים באנגלית"]
}

ענה רק בפורמט JSON.`;

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

    let imageData: Record<string, unknown> = { suggested_images: [], search_terms: [] };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        imageData = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: imageData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error searching product image:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
