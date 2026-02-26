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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase credentials missing");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse optional body to run a specific bot
    let targetBotId: string | null = null;
    try {
      const body = await req.json();
      targetBotId = body?.bot_id || null;
    } catch {
      // No body = run all active bots
    }

    // Fetch active bots
    let query = supabase.from("automation_bots").select("*").eq("is_active", true);
    if (targetBotId) {
      query = query.eq("id", targetBotId);
    }

    const { data: bots, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    if (!bots || bots.length === 0) {
      return new Response(JSON.stringify({ message: "No active bots to run", results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const bot of bots) {
      try {
        console.log(`Running bot: ${bot.name} (${bot.slug})...`);

        // Build prompt from bot's system_prompt or description
        const prompt = bot.system_prompt || 
          `You are "${bot.name}", a specialized AI agent for PetID. Your role: ${bot.description || "assist with pet management"}. Capabilities: ${JSON.stringify(bot.capabilities || [])}. Analyze current status and provide a brief action report.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: prompt },
              { role: "user", content: `Run your scheduled check. Current time: ${new Date().toISOString()}. Provide a brief status report (max 200 words).` },
            ],
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error(`AI error for ${bot.name}:`, aiResponse.status, errText);
          
          await supabase
            .from("automation_bots")
            .update({
              last_run_at: new Date().toISOString(),
              health_status: "error",
              last_error: `AI gateway returned ${aiResponse.status}`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", bot.id);

          results.push({ bot: bot.name, status: "error", error: `AI ${aiResponse.status}` });
          continue;
        }

        const aiData = await aiResponse.json();
        const aiOutput = aiData.choices?.[0]?.message?.content || "No output";

        // Update bot status
        await supabase
          .from("automation_bots")
          .update({
            last_run_at: new Date().toISOString(),
            last_output: aiOutput,
            health_status: "healthy",
            last_error: null,
            run_count: (bot.run_count || 0) + 1,
            last_health_check: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", bot.id);

        results.push({ bot: bot.name, status: "success" });
      } catch (botError) {
        console.error(`Error running bot ${bot.name}:`, botError);
        
        await supabase
          .from("automation_bots")
          .update({
            last_run_at: new Date().toISOString(),
            health_status: "error",
            last_error: botError instanceof Error ? botError.message : "Unknown error",
            updated_at: new Date().toISOString(),
          })
          .eq("id", bot.id);

        results.push({ bot: bot.name, status: "error", error: String(botError) });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;
    return new Response(
      JSON.stringify({
        message: `Executed ${results.length} bots: ${successCount} success, ${results.length - successCount} errors`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Agent runner error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
