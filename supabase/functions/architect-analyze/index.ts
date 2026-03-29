import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatCompletion } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch recent open errors
    const { data: errors } = await supabase
      .from("system_error_logs")
      .select("*")
      .eq("status", "open")
      .order("occurrence_count", { ascending: false })
      .limit(10);

    if (!errors || errors.length === 0) {
      return new Response(JSON.stringify({ cards: [], message: "No open errors to analyze" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build analysis prompt
    const errorSummary = errors.map((e: any) =>
      `[${e.severity}] ${e.error_source} | ${e.component || "unknown"} | ${e.route || "/"} | "${e.message}" (×${e.occurrence_count})`
    ).join("\n");

    const aiResult = await chatCompletion({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are Ido, The System Architect bot for PetID — a React/TypeScript/Supabase pet-tech platform.
Your job: analyze production errors and propose concrete code fixes.
For EACH error pattern, produce an Evolution Card with:
- insight: 1-sentence describing what users/system are struggling with
- solution: 1-sentence describing your proposed fix
- code_before: The problematic code pattern (realistic React/TS)
- code_after: Your improved code (realistic React/TS)
- file_path: Likely file path in the PetID codebase (src/...)
- component: Component name
- category: one of 'ui', 'performance', 'security', 'ux', 'data'
- confidence: 0.0 to 1.0

Return JSON array of cards. Max 5 cards. Be specific and actionable.`
        },
        {
          role: "user",
          content: `Analyze these production errors and generate Evolution Cards:\n\n${errorSummary}`
        }
      ],
      tools: [{
        type: "function",
        function: {
          name: "generate_evolution_cards",
          description: "Generate evolution cards from error analysis",
          parameters: {
            type: "object",
            properties: {
              cards: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    insight: { type: "string" },
                    solution: { type: "string" },
                    code_before: { type: "string" },
                    code_after: { type: "string" },
                    file_path: { type: "string" },
                    component: { type: "string" },
                    category: { type: "string", enum: ["ui", "performance", "security", "ux", "data"] },
                    confidence: { type: "number" },
                    error_id: { type: "string" },
                  },
                  required: ["insight", "solution", "code_before", "code_after", "category", "confidence"],
                },
              },
            },
            required: ["cards"],
          },
        },
      }],
    });
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let cards: any[] = [];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      cards = parsed.cards || [];
    }

    // Insert cards into DB
    for (const card of cards) {
      const errorMatch = errors.find((e: any) => card.error_id === e.id);
      await supabase.from("architect_evolution_cards").insert({
        insight: card.insight,
        solution: card.solution,
        code_before: card.code_before,
        code_after: card.code_after,
        file_path: card.file_path || null,
        component: card.component || null,
        category: card.category,
        confidence: card.confidence,
        error_source_id: errorMatch?.id || null,
        status: "draft",
      });
    }

    return new Response(JSON.stringify({ cards, count: cards.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("architect-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
