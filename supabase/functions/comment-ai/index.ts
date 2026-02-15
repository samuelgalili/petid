import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { comment_text, post_id, pet_context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch post context
    let postContext = "";
    if (post_id) {
      const { data: post } = await supabase
        .from("posts")
        .select("caption, hashtags, product_name, product_price")
        .eq("id", post_id)
        .maybeSingle();
      if (post) {
        postContext = `Post caption: "${post.caption || ""}". Hashtags: ${post.hashtags || "none"}. Product: ${post.product_name || "none"} (₪${post.product_price || "N/A"}).`;
      }
    }

    // Fetch relevant products for potential recommendations
    let productContext = "";
    const { data: products } = await supabase
      .from("business_products")
      .select("id, name, price, sale_price, image_url, category")
      .eq("in_stock", true)
      .limit(5);

    if (products && products.length > 0) {
      productContext = `Available products: ${products.map(p => `[${p.id}] ${p.name} ₪${p.sale_price || p.price}`).join("; ")}`;
    }

    // Pet medical context
    let petInfo = "";
    if (pet_context) {
      petInfo = `Active pet: ${pet_context.name} (${pet_context.breed || pet_context.pet_type}), age: ${pet_context.age_weeks ? Math.floor(pet_context.age_weeks / 52) + " years" : "unknown"}. Medical: ${pet_context.medical_conditions?.join(", ") || "none"}.`;
    }

    const systemPrompt = `You are PetID Expert — a concise, warm veterinary-informed advisor replying to social feed comments in Hebrew.
${petInfo ? `The pet's name is mentioned in the context below. ALWAYS refer to the pet by name.` : ""}

PRIVACY RULES (CRITICAL):
- This is a PUBLIC comment thread. NEVER reveal specific medical diagnoses, conditions, or sensitive health data.
- Use general phrasing: "בהתאם לרגישויות הידועות..." or "בהתבסס על הפרופיל..." — never name specific conditions publicly.
- If a user needs detailed medical guidance, suggest they use the private PetID chat.

EMERGENCY DETECTION:
- If the comment describes a medical emergency (chocolate ingestion, poisoning, seizure, difficulty breathing, bleeding, collapse, bloat), respond ONLY with the exact marker: [SOS_EMERGENCY] followed by a single calm sentence telling them to call a vet immediately.
- Do NOT provide treatment advice for emergencies — only the SOS marker and vet referral.

COMMERCIAL CONVERSION:
- If the user describes a problem (shedding, anxiety, digestion, etc.), provide a brief helpful tip AND recommend ONE relevant product using format: [PRODUCT:id:name:price].
- Only recommend products from the available list below. Never invent products.

TONE:
- Helpful, clinical yet friendly. Use "מומלץ", "לא נדרש", "עדיף להמתין".
- FORBIDDEN words: מדהים, חובה, הכי טוב, מבצע, מושלם.
- 2-3 sentences max.

${petInfo}
${postContext}
${productContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: comment_text },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "rate_limit" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "payment_required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || "מצטער, לא הצלחתי לעבד את הבקשה.";

    // Detect SOS emergency
    const isSOS = aiText.includes("[SOS_EMERGENCY]");

    // Parse product references from AI response: [PRODUCT:id:name:price]
    const productRegex = /\[PRODUCT:([^:]+):([^:]+):([^\]]+)\]/g;
    const referencedProducts: Array<{ id: string; name: string; price: string; image_url?: string }> = [];
    let cleanText = aiText.replace("[SOS_EMERGENCY]", "").trim();
    let match;

    while ((match = productRegex.exec(aiText)) !== null) {
      const productId = match[1];
      const product = products?.find(p => p.id === productId);
      referencedProducts.push({
        id: productId,
        name: match[2],
        price: match[3],
        image_url: product?.image_url || undefined,
      });
      cleanText = cleanText.replace(match[0], "");
    }

    return new Response(
      JSON.stringify({
        reply: cleanText.trim(),
        products: referencedProducts,
        is_sos: isSOS,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("comment-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
