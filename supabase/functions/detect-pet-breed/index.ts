import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

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
                text: `Analyze this ${petType} image and identify the breed. You must respond with a JSON object in this exact format: {"breed": "breed name", "confidence": 85}. The breed should be the specific breed name (e.g., "Golden Retriever", "Persian", "Mixed Breed"). The confidence should be a number from 0-100 indicating how certain you are of the breed identification. If you cannot determine the breed, use "Unknown Breed" with a low confidence score.`
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
    const aiResponse = data.choices?.[0]?.message?.content?.trim() || "{}";
    
    // Parse the JSON response from AI
    let detectedBreed = "Unknown Breed";
    let confidenceScore = 0;
    
    try {
      const parsed = JSON.parse(aiResponse);
      detectedBreed = parsed.breed || "Unknown Breed";
      confidenceScore = parsed.confidence || 0;
    } catch (e) {
      // Fallback: if AI didn't return valid JSON, treat the response as the breed name
      detectedBreed = aiResponse;
      confidenceScore = 50; // Default medium confidence if format is wrong
    }
    
    // Determine if we consider this "confident" (>70%)
    const isConfident = confidenceScore > 70;

    return new Response(
      JSON.stringify({ 
        breed: detectedBreed,
        confident: isConfident,
        confidence: confidenceScore
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
        confident: false,
        confidence: 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});