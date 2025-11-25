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
    const { imageBase64, petType } = await req.json();

    if (!imageBase64 || !petType) {
      throw new Error('Missing required fields: imageBase64 and petType');
    }

    // Call Lovable AI vision model to detect breed
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this ${petType} image and identify the breed. Return only the breed name (e.g., "Golden Retriever", "Persian", "Mixed Breed"). If you cannot determine the breed with high confidence, return "Unknown Breed". Be concise - only return the breed name, nothing else.`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        max_tokens: 50,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const detectedBreed = data.choices?.[0]?.message?.content?.trim() || "Unknown Breed";
    
    // Determine confidence based on response
    const isConfident = !detectedBreed.toLowerCase().includes('unknown') && 
                       !detectedBreed.toLowerCase().includes('cannot') &&
                       !detectedBreed.toLowerCase().includes('unsure');

    return new Response(
      JSON.stringify({ 
        breed: detectedBreed,
        confident: isConfident
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error detecting breed:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        breed: "Unknown Breed",
        confident: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});