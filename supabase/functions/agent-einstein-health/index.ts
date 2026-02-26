import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, pet_id } = await req.json();

    if (action === "predict-risks") {
      // Get pet data for risk analysis
      const { data: pet } = pet_id
        ? await supabase.from("pets").select("*, breed_information(*)").eq("id", pet_id).maybeSingle()
        : { data: null };

      // Get breed disease rules
      const { data: diseaseRules } = await supabase
        .from("breed_disease_diet_rules")
        .select("*")
        .limit(50);

      // Use AI for health prediction
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are Einstein, a veterinary health prediction AI. Analyze pet data and NRC nutritional science to forecast health risks. Return JSON: { risks: [{ risk: string, level: 'low'|'medium'|'high', recommendation: string }], overall_score: number }. Respond in Hebrew.",
            },
            {
              role: "user",
              content: JSON.stringify({ pet, diseaseRules: diseaseRules?.slice(0, 10) }),
            },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const result = await aiResponse.json();
      const content = result.choices?.[0]?.message?.content || "{}";

      await supabase.from("agent_action_logs").insert({
        action_type: "health_prediction",
        description: `Einstein: חיזוי בריאותי${pet_id ? ` לחיית מחמד ${pet_id}` : " כללי"}`,
        metadata: { ai_result: content, pet_id },
      });

      await supabase.from("automation_bots").update({ last_run_at: new Date().toISOString() }).eq("slug", "health-prediction");

      return new Response(JSON.stringify({ success: true, prediction: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Einstein error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
