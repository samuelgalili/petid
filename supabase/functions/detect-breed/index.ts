import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, imageBase64, petType } = await req.json();

    if (!imageUrl && !imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const imageSource = imageBase64 || imageUrl;
    const animalType = petType === "cat" ? "cat" : "dog";
    const animalTypeHe = petType === "cat" ? "חתול" : "כלב";

    const geminiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: imageSource }
                },
                {
                  type: "text",
                  text: `Analyze this image. The user says this is a ${animalType} (${animalTypeHe}).

Identify the breed. Response MUST be valid JSON only, no markdown:
{
  "breed": "English breed name (e.g., Golden Retriever)",
  "breed_he": "Hebrew breed name (e.g., גולדן רטריבר)",
  "confidence": 0.85,
  "is_${animalType}": true,
  "detectedType": "${animalType}",
  "mixed_breeds": ["breed1", "breed2"] or null,
  "notes": "any additional observations"
}

If the animal in the photo is NOT a ${animalType}, set detectedType to the actual animal type ("dog" or "cat") and still try to identify the breed.

If no animal is detected:
{
  "breed": null,
  "breed_he": null,
  "confidence": 0,
  "is_${animalType}": false,
  "detectedType": null,
  "mixed_breeds": null,
  "notes": "reason why no animal detected"
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
      const errorText = await geminiResponse.text();
      console.error("AI gateway error:", geminiResponse.status, errorText);
      
      if (geminiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (geminiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    const content = geminiData.choices?.[0]?.message?.content || "";
    
    let detectionResult;
    try {
      const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
      detectionResult = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse breed detection", raw: content }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch additional breed info from database if breed detected
    if (detectionResult.breed) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const detectedAnimalType = detectionResult.detectedType || animalType;

        const { data: breedInfo } = await supabase
          .from("breed_information")
          .select("breed_name, breed_name_he, description_he, energy_level, trainability, grooming_freq, kids_friendly, life_expectancy_years, affection_family, size_category")
          .eq("pet_type", detectedAnimalType)
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
      } catch (dbError) {
        console.error("DB lookup error:", dbError);
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
