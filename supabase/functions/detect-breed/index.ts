import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { chatCompletion } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXPERT_PROMPT = (animalType: string, animalTypeHe: string) => `You are the Lead Veterinary Image Analyst for PetID — target 99% breed accuracy.

## STEP 1 — Image Quality Check
Before analyzing the breed, evaluate the photo quality:
- Is the animal clearly visible?
- Is lighting sufficient?
- Is the image blurry or obstructed?
If the photo is too dark, blurry, or the animal is not clearly visible, set "photo_quality" to "poor" and provide guidance in "photo_feedback".

## STEP 2 — Feature Detection Protocol
Systematically analyze these morphological features:
1. **Snout**: Length, width, shape (brachycephalic/mesocephalic/dolichocephalic)
2. **Ears**: Shape (erect/floppy/semi-erect), size, set position
3. **Coat**: Texture (smooth/wire/curly/double), length, color pattern, markings
4. **Body**: Size estimate (toy/small/medium/large/giant), proportions, build type
5. **Eyes**: Shape, color, set
6. **Tail**: Length, curl, carriage
7. **Distinctive features**: Any breed-specific markers (e.g., wrinkles, spots, mask)

## STEP 3 — Breed Determination
Cross-reference all detected features against known breed standards. If mixed breed, identify the dominant breeds.

## STEP 4 — Health Risk Assessment (NRC 2006 + Breed-Specific)
Once breed is identified, provide the top 3-5 breed-specific health risks based on veterinary literature and NRC 2006 nutritional guidelines.

The user says this is a ${animalType} (${animalTypeHe}).

Response MUST be valid JSON only, no markdown wrapping:
{
  "breed": "English breed name (e.g., Golden Retriever)",
  "breed_he": "Hebrew breed name (e.g., גולדן רטריבר)",
  "confidence": 0.92,
  "detectedType": "${animalType}",
  "is_${animalType}": true,
  "mixed_breeds": ["breed1", "breed2"] or null,
  "photo_quality": "good" | "fair" | "poor",
  "photo_feedback": "string or null — guidance if photo quality is poor/fair",
  "features_detected": {
    "snout": "short description",
    "ears": "short description",
    "coat": "short description",
    "body_size": "toy/small/medium/large/giant",
    "distinctive": "any notable features"
  },
  "health_risks": [
    {"risk": "English name", "risk_he": "Hebrew name", "severity": "high/medium/low", "note": "brief explanation"},
    ...
  ],
  "notes": "any additional observations"
}

If the animal in the photo is NOT a ${animalType}, set detectedType to the actual animal type and still identify the breed.

If no animal is detected:
{
  "breed": null,
  "breed_he": null,
  "confidence": 0,
  "is_${animalType}": false,
  "detectedType": null,
  "photo_quality": "good/fair/poor",
  "photo_feedback": "reason",
  "features_detected": null,
  "health_risks": [],
  "mixed_breeds": null,
  "notes": "reason why no animal detected"
}`;

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

    const imageSource = imageBase64 || imageUrl;
    const animalType = petType === "cat" ? "cat" : "dog";
    const animalTypeHe = petType === "cat" ? "חתול" : "כלב";

    const geminiData = await chatCompletion({
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
              text: EXPERT_PROMPT(animalType, animalTypeHe)
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.2
    });

    const content = (geminiData as any).choices?.[0]?.message?.content || "";
    
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

    // Enrich with database info if breed detected
    if (detectionResult.breed) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const detectedAnimalType = detectionResult.detectedType || animalType;

        const { data: breedInfo } = await supabase
          .from("breed_information")
          .select("breed_name, breed_name_he, description_he, energy_level, trainability, grooming_freq, kids_friendly, life_expectancy_years, affection_family, size_category, health_issues, health_issues_he")
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
          // Merge DB health issues with AI-detected risks
          if (breedInfo.health_issues_he || breedInfo.health_issues) {
            detectionResult.db_health_issues = breedInfo.health_issues_he || breedInfo.health_issues;
          }
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
