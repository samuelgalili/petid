import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatCompletion } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { frame_base64, pet_name, pet_breed, user_id } = await req.json();

    if (!frame_base64) {
      return new Response(
        JSON.stringify({ error: "No frame provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch available products from the shop for matching
    const { data: shopProducts } = await supabase
      .from("business_products")
      .select("id, name, brand, category, image_url, price")
      .eq("in_stock", true)
      .limit(50);

    const productList = (shopProducts || [])
      .map((p: any) => `- ID:${p.id} | ${p.brand || ""} ${p.name} | ${p.category || ""} | ₪${p.price}`)
      .join("\n");

    // Check if user has purchases (for Verified Buyer badge)
    let purchasedProductIds: string[] = [];
    if (user_id) {
      const { data: orders } = await supabase
        .from("orders")
        .select("items")
        .eq("user_id", user_id)
        .eq("status", "completed");

      if (orders) {
        for (const order of orders) {
          const items = order.items as any[];
          if (Array.isArray(items)) {
            for (const item of items) {
              if (item.product_id) purchasedProductIds.push(item.product_id);
            }
          }
        }
      }
    }

    // Fetch pet health data for context
    let healthScore: number | null = null;
    let petData: any = null;
    if (user_id) {
      const { data: pets } = await supabase
        .from("pets")
        .select("id, name, breed, weight, date_of_birth")
        .eq("owner_id", user_id)
        .limit(1);
      if (pets?.length) {
        petData = pets[0];
        // Simple health score proxy
        let score = 70;
        if (petData.weight) score += 10;
        if (petData.date_of_birth) score += 10;
        const { count: vacCount } = await supabase
          .from("vet_visits")
          .select("id", { count: "exact", head: true })
          .eq("pet_id", petData.id);
        if ((vacCount || 0) > 0) score += 10;
        healthScore = Math.min(score, 100);
      }
    }

    const purchasedInfo = purchasedProductIds.length > 0
      ? `The user has purchased these product IDs: ${purchasedProductIds.join(", ")}. Prioritize auto-tagging these as 'Shoppable Tags'.`
      : "";

    const systemPrompt = `You are PetID's visual product scanner and content safety guardian. Analyze the provided video frame of a pet.

TASK 1 — PRODUCT DETECTION & SHOPPABLE TAGS:
Look for visible pet products: food bags, treats, toys, bowls, leashes, grooming tools, beds, carriers, etc.
If you detect any, try to match them to these available shop products:
${productList}

${purchasedInfo}

Return matches as JSON objects in the "products" array.
Only match if confidence is HIGH. Never invent products.

TASK 2 — BREED DETECTION:
${pet_breed ? `The pet is a ${pet_breed}.` : "Try to detect the breed."}
${pet_name ? `The pet's name is ${pet_name}.` : ""}

TASK 3 — SAFETY CHECK (CRITICAL — BE RUTHLESS):
Scan for dangerous items, unsafe feeding, dangerous training methods, or signs of pet distress:
- Chocolate, grapes, raisins, onions, xylitol, alcohol near a pet
- Small objects that could be swallowed
- Toxic plants (lilies, tulips for cats; sago palm for dogs)
- Dangerous situations (near traffic, heights, hot surfaces)
- Aggressive, distressed, or fearful body language
- Unsafe training methods (choke chains used improperly, hitting)
- Force-feeding or feeding from inappropriate containers

If ANY danger is detected, respond with is_dangerous: true.

TASK 4 — SOCIAL PROOF CAPTION (Hebrew):
Generate a short, health-focused Hebrew caption for the video that highlights any visible health benefits.
Examples: "הפרווה של וונדי נוצצת בזכות נוסחת Skin & Coat!" or "שיטסו פעיל ובריא אחרי אימון בחוץ 💪"
${pet_name ? `Use the pet's name "${pet_name}" in the caption.` : ""}
${pet_breed ? `The breed is ${pet_breed}.` : ""}
${healthScore !== null ? `The pet's current health score is ${healthScore}%.` : ""}

TASK 5 — HEALTH SCORE CONTEXT:
${healthScore !== null ? `The pet's health score is ${healthScore}%. Suggest how sharing this video or following the care routine shown could improve the score. Express as a percentage improvement (e.g., +5%).` : "Skip this task."}

RESPONSE FORMAT (JSON):
{
  "products": [{"id": "...", "name": "...", "price": "..."}],
  "breed_detected": "...",
  "safety_issues": [{"type": "...", "description": "...", "severity": "high|medium"}],
  "is_dangerous": true/false,
  "danger_message": "Hebrew warning message if dangerous",
  "description": "Brief Hebrew description of what's in the frame",
  "suggested_caption": "Hebrew social proof caption highlighting health benefits",
  "health_score_current": ${healthScore ?? "null"},
  "health_score_improvement": "+X%",
  "health_score_tip": "Hebrew tip about how this content helps other pet owners"
}

Respond ONLY with valid JSON, no markdown.`;

    const aiData = await chatCompletion({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${frame_base64}` },
            },
            {
              type: "text",
              text: "Analyze this video frame for products, breed, and safety issues.",
            },
          ],
        },
      ],
    });

    const rawContent = (aiData as any).choices?.[0]?.message?.content || "{}";

    // Clean and parse JSON
    let analysisResult;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysisResult = JSON.parse(cleaned);
    } catch {
      analysisResult = {
        products: [],
        breed_detected: null,
        safety_issues: [],
        is_dangerous: false,
        description: rawContent,
      };
    }

    // Enrich products with verified purchase status
    if (analysisResult.products && Array.isArray(analysisResult.products)) {
      analysisResult.products = analysisResult.products.map((p: any) => ({
        ...p,
        verified_purchase: purchasedProductIds.includes(p.id),
      }));
    }

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("video-analyze error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
