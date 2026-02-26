import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scanning invoice image with line-item extraction...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an expert invoice parser. Analyze this invoice/receipt image and extract EVERY line item with full detail.

Return ONLY valid JSON in this exact structure:
{
  "invoiceNumber": "string or null",
  "vendor": "supplier/vendor name or null",
  "vendorPhone": "phone or null",
  "vendorEmail": "email or null",
  "vendorAddress": "address or null",
  "vendorTaxId": "tax ID / business number or null",
  "date": "YYYY-MM-DD or null",
  "currency": "ILS",
  "lineItems": [
    {
      "name": "product name as written on invoice",
      "sku": "SKU/catalog number if visible, or null",
      "quantity": 1,
      "unitPrice": 0.00,
      "totalPrice": 0.00,
      "unit": "unit of measure if visible (kg, pcs, etc) or null"
    }
  ],
  "subtotal": 0.00,
  "taxRate": 17,
  "taxAmount": 0.00,
  "shippingCost": 0.00,
  "discount": 0.00,
  "total": 0.00
}

Rules:
- Extract EVERY line item row from the invoice. Do not summarize or skip items.
- For numeric fields, return only numbers (no currency symbols).
- If tax rate is visible use that, otherwise default to 17 (Israel VAT).
- If shipping/delivery cost is listed separately, put it in shippingCost.
- If discount is listed, put it in discount.
- Respond ONLY with valid JSON, no additional text.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${image}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add credits.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';
    
    console.log('AI Response:', content);

    let parsedData;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      const jsonStr = jsonMatch[1] || content;
      parsedData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      parsedData = {
        invoiceNumber: null,
        vendor: 'לא זוהה',
        date: new Date().toISOString().split('T')[0],
        total: 0,
        currency: 'ILS',
        lineItems: [],
        subtotal: 0,
        taxRate: 17,
        taxAmount: null,
        shippingCost: 0,
        discount: 0,
      };
    }

    // Backwards compat: keep items as string array too
    if (parsedData.lineItems) {
      parsedData.items = parsedData.lineItems.map((li: any) => li.name);
    }

    console.log('Parsed invoice data:', JSON.stringify(parsedData));

    return new Response(
      JSON.stringify(parsedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error scanning invoice:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
