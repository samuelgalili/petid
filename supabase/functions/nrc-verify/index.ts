import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { product_name, ingredients, pet_type, pet_weight_kg, pet_age_months, life_stage, image_url } = await req.json();

    if (!product_name && !ingredients) {
      return new Response(JSON.stringify({ error: "product_name or ingredients required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are the NRC Science Bot for PetID. Analyze the following pet food product using a multi-standard scientific approach.

## Scientific Framework (Priority Order):
1. **NRC 2006** — Primary baseline for all nutrient adequacy assessments (energy, protein, fat, minerals, vitamins).
2. **FEDIAF 2024 Guidelines** — Cross-reference European standards for breed-specific and life-stage-specific tolerances, especially upper safe limits for calcium, phosphorus, and vitamin D.
3. **Peer-Reviewed Research (2021-2026)** — Apply breed-specific optimizations from recent veterinary nutrition journals (e.g., JAVMA, Journal of Animal Physiology and Animal Nutrition, British Journal of Nutrition). Prioritize studies on DCM-linked ingredients, grain-free formulations, and breed-predisposed deficiencies.
4. **AAFCO Profiles** — Use as a secondary compliance check for US-market labeling adequacy.

## Product Info:
- Name: ${product_name || 'Unknown'}
- Ingredients: ${ingredients || 'Not provided'}
- Pet Type: ${pet_type || 'dog'}
- Pet Weight: ${pet_weight_kg ? pet_weight_kg + ' kg' : 'Unknown'}
- Pet Age: ${pet_age_months ? pet_age_months + ' months' : 'Unknown'}
- Life Stage: ${life_stage || 'adult'}
${image_url ? `- Product Image URL: ${image_url}` : ''}

## Analyze and return JSON:
{
  "nrc_compliant": true/false,
  "compliance_score": 0-100,
  "meets_standards": ["NRC 2006", "AAFCO", "FEDIAF"] (whichever apply),
  "standards_applied": {
    "nrc_2006": { "status": "pass/fail/partial", "note": "..." },
    "fediaf_2024": { "status": "pass/fail/partial/not_evaluated", "note": "..." },
    "recent_research": { "status": "applied/not_applicable", "note": "cite specific finding if applied" }
  },
  "key_nutrients": {
    "protein": { "adequate": true/false, "note": "..." },
    "fat": { "adequate": true/false, "note": "..." },
    "fiber": { "adequate": true/false, "note": "..." },
    "calcium": { "adequate": true/false, "note": "..." },
    "phosphorus": { "adequate": true/false, "note": "..." }
  },
  "red_flags": ["list of concerning ingredients"],
  "warnings": ["warnings specific to this pet's profile"],
  "breed_specific_notes": "any breed-specific dietary considerations from recent research",
  "recommendation": "Hebrew summary - brief, factual, no marketing language",
  "daily_serving_grams": number or null,
  "depletion_days": number or null
}

RULES:
- NRC 2006 is always the primary baseline. Never skip it.
- If FEDIAF or recent research contradicts NRC on a specific nutrient for a specific breed/life-stage, note the conflict and recommend the more conservative (safer) value.
- If ingredients are missing, say so clearly. Do not guess.
- Be conservative. If unsure, flag as "insufficient data".
- Never use: Amazing, Must-have, Best, Deal, Perfect.
- Use: Recommended, Not suitable, Insufficient data, Better to wait.
Return only valid JSON.`;

    const messages: any[] = [
      { role: "system", content: "You are the NRC Science Bot. Return only valid JSON. No markdown." },
      { role: "user", content: prompt },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.choices?.[0]?.message?.content || "{}";
    
    // Parse JSON from response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Failed to parse AI response" };

    return new Response(JSON.stringify({ success: true, analysis: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("NRC verify error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
