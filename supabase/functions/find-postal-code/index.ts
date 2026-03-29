import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { chatCompletion } from "../_shared/ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, address } = await req.json();
    
    if (!city) {
      return new Response(
        JSON.stringify({ error: 'City is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = address
      ? `מצא את המיקוד (postal code) המדויק בישראל עבור הכתובת: ${address}, ${city}. החזר רק את המיקוד בפורמט של 7 ספרות, בלי שום טקסט נוסף.`
      : `מצא את המיקוד (postal code) הראשי בישראל עבור העיר: ${city}. החזר רק את המיקוד בפורמט של 7 ספרות, בלי שום טקסט נוסף.`;

    const data = await chatCompletion({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'אתה מומחה למיקודים בישראל. החזר רק את המיקוד בפורמט של 7 ספרות. אל תוסיף הסברים או טקסט נוסף.'
        },
        { role: 'user', content: prompt }
      ],
    });

    const postalCode = data.choices?.[0]?.message?.content?.trim();
    
    // Validate that we got a 7-digit number
    const cleanPostalCode = postalCode?.replace(/\D/g, '');
    if (cleanPostalCode && cleanPostalCode.length === 7) {
      return new Response(
        JSON.stringify({ postal_code: cleanPostalCode }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Could not find postal code', raw: postalCode }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in find-postal-code:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
