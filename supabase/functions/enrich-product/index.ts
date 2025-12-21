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
    const { productName, sku, category, missingFields } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Enriching product:', productName, 'Missing fields:', missingFields);

    // Build the prompt based on what's missing
    let prompt = `אתה עוזר להשלמת מידע על מוצרים לחיות מחמד.

המוצר: "${productName}"
${sku ? `מק"ט: ${sku}` : ''}
${category ? `קטגוריה: ${category}` : ''}

אנא ספק את המידע הבא בפורמט JSON:
{`;

    const fieldsToEnrich: string[] = [];
    
    if (missingFields?.includes('description')) {
      fieldsToEnrich.push('"description": "תיאור מפורט של המוצר (2-3 משפטים)"');
    }
    if (missingFields?.includes('sku') && !sku) {
      fieldsToEnrich.push('"sku": "מק״ט משוער אם ידוע, או null"');
    }
    if (missingFields?.includes('pet_type')) {
      fieldsToEnrich.push('"pet_type": "dog או cat - לפי התאמת המוצר"');
    }
    if (missingFields?.includes('category') && !category) {
      fieldsToEnrich.push('"category": "קטגוריה מתאימה (מזון, חטיפים, צעצועים, טיפוח, בריאות, אביזרים)"');
    }
    if (missingFields?.includes('image_url')) {
      fieldsToEnrich.push('"image_search_query": "מונח חיפוש באנגלית למציאת תמונת המוצר"');
    }

    prompt += '\n  ' + fieldsToEnrich.join(',\n  ') + '\n}';
    prompt += '\n\nענה רק בפורמט JSON ללא הסבר נוסף.';

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
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, try again later' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', content);

    // Parse the JSON response
    let enrichedData: Record<string, unknown> = {};
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        enrichedData = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: enrichedData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error enriching product:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
