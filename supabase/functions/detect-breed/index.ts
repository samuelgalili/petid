import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BreedDetectionResult {
  breed: string;
  breed_he: string | null;
  confidence: number;
  description: string | null;
  traits: {
    energy_level: number | null;
    trainability: number | null;
    grooming_freq: number | null;
    kids_friendly: number | null;
    life_expectancy: string | null;
  } | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, imageBase64 } = await req.json();

    if (!imageUrl && !imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare image for Gemini
    let imageData: { inlineData?: { data: string; mimeType: string }; fileUri?: string } = {};
    
    if (imageBase64) {
      imageData = {
        inlineData: {
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
          mimeType: "image/jpeg"
        }
      };
    } else if (imageUrl) {
      // Fetch the image and convert to base64
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
      imageData = {
        inlineData: {
          data: base64,
          mimeType: imageResponse.headers.get("content-type") || "image/jpeg"
        }
      };
    }

    // Call Gemini for breed detection
    const geminiResponse = await fetch(
      `https://llm.lovable.dev/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: imageBase64 || imageUrl
                  }
                },
                {
                  type: "text",
                  text: `Analyze this image and identify the dog breed. 
                  
Response MUST be valid JSON only, no markdown:
{
  "breed": "English breed name (e.g., Golden Retriever)",
  "breed_he": "Hebrew breed name (e.g., גולדן רטריבר)",
  "confidence": 0.85,
  "is_dog": true,
  "mixed_breeds": ["breed1", "breed2"] (if mixed, otherwise null),
  "notes": "any additional observations"
}

If no dog is detected, return:
{
  "breed": null,
  "breed_he": null,
  "confidence": 0,
  "is_dog": false,
  "mixed_breeds": null,
  "notes": "reason why no dog detected"
}`
                }
              ]
            }
          ],
          max_tokens: 500,
          temperature: 0.3
        }),
      }
    );

    if (!geminiResponse.ok) {
      const error = await geminiResponse.text();
      console.error("Gemini API error:", error);
      throw new Error(`Gemini API error: ${error}`);
    }

    const geminiData = await geminiResponse.json();
    const content = geminiData.choices?.[0]?.message?.content || "";
    
    // Parse the JSON response
    let detectionResult;
    try {
      // Remove any markdown code blocks if present
      const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
      detectionResult = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", content);
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse breed detection", 
          raw: content 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If a breed was detected, fetch additional info from database
    if (detectionResult.breed && detectionResult.is_dog) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: breedInfo } = await supabase
        .from("breed_information")
        .select(`
          breed_name, breed_name_he, description_he,
          energy_level, trainability, grooming_freq, kids_friendly,
          life_expectancy_years, affection_family, size_category
        `)
        .or(`breed_name.ilike.%${detectionResult.breed}%,breed_name_he.ilike.%${detectionResult.breed}%`)
        .maybeSingle();

      if (breedInfo) {
        detectionResult.breed_he = breedInfo.breed_name_he || detectionResult.breed_he;
        detectionResult.description = breedInfo.description_he;
        detectionResult.traits = {
          energy_level: breedInfo.energy_level,
          trainability: breedInfo.trainability,
          grooming_freq: breedInfo.grooming_freq,
          kids_friendly: breedInfo.kids_friendly,
          life_expectancy: breedInfo.life_expectancy_years,
          affection_family: breedInfo.affection_family,
          size_category: breedInfo.size_category
        };
        detectionResult.found_in_database = true;
      } else {
        detectionResult.found_in_database = false;
      }
    }

    return new Response(
      JSON.stringify(detectionResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Breed detection error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
