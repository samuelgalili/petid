import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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

    const systemPrompt = `You are PetID's visual product scanner. Analyze the provided video frame of a pet.

TASK 1 — PRODUCT DETECTION:
Look for visible pet products: food bags, treats, toys, bowls, leashes, grooming tools, beds, carriers, etc.
If you detect any, try to match them to these available shop products:
${productList}

Return matches as: [PRODUCT:id:name:price]
Only match if confidence is HIGH. Never invent products.

TASK 2 — BREED DETECTION:
${pet_breed ? `The pet is a ${pet_breed}.` : "Try to detect the breed."}
${pet_name ? `The pet's name is ${pet_name}.` : ""}

TASK 3 — SAFETY CHECK (CRITICAL):
Scan for dangerous items or behaviors:
- Chocolate, grapes, raisins, onions, xylitol, alcohol near a pet
- Small objects that could be swallowed
- Toxic plants (lilies, tulips for cats; sago palm for dogs)
- Dangerous situations (near traffic, heights, hot surfaces)
- Aggressive or distressed behavior

If ANY danger is detected, respond with:
[DANGER:description of the danger]

RESPONSE FORMAT (JSON):
{
  "products": [{"id": "...", "name": "...", "price": "..."}],
  "breed_detected": "...",
  "safety_issues": [{"type": "...", "description": "...", "severity": "high|medium"}],
  "is_dangerous": true/false,
  "danger_message": "Hebrew warning message if dangerous",
  "description": "Brief Hebrew description of what's in the frame"
}

Respond ONLY with valid JSON, no markdown.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, try again shortly" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "{}";

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
