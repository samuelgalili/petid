import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatCompletion } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, agent_slug } = await req.json();

    // ─── ACTION: analyze — Logic Mining ───────────────────────
    if (action === "analyze") {
      // Gather recent action logs and feedback
      const [logsRes, feedbackRes, currentScoreRes] = await Promise.all([
        supabase.from("agent_action_logs").select("*")
          .order("created_at", { ascending: false }).limit(100),
        supabase.from("chat_message_feedback").select("*")
          .order("created_at", { ascending: false }).limit(50),
        supabase.from("agent_performance_scores").select("*")
          .eq("agent_slug", agent_slug || "all")
          .order("score_date", { ascending: false }).limit(7),
      ]);

      const analysisPrompt = `You are Prometheus, the Meta-Robot Agent Coach for PetID.
Analyze the following agent interaction data and identify:
1. Logic gaps or conversational failures
2. Areas where empathy/accuracy can be improved
3. Conversion rate optimization opportunities
4. Specific prompt engineering suggestions

Agent Logs (last 100): ${JSON.stringify(logsRes.data?.slice(0, 30))}
User Feedback (last 50): ${JSON.stringify(feedbackRes.data?.slice(0, 20))}
Recent Performance: ${JSON.stringify(currentScoreRes.data)}

Return a JSON with this structure:
{
  "logic_gaps": [{"agent": "slug", "issue": "description", "severity": "high|medium|low"}],
  "prompt_improvements": [{"agent": "slug", "current_weakness": "...", "suggested_change": "...", "expected_improvement_pct": 15}],
  "performance_summary": {"overall_score": 78, "empathy_avg": 80, "accuracy_avg": 85, "conversion_avg": 65}
}`;

      const aiData = await chatCompletion({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: analysisPrompt }],
        tools: [{
          type: "function",
          function: {
            name: "return_analysis",
            description: "Return the agent performance analysis",
            parameters: {
              type: "object",
              properties: {
                logic_gaps: { type: "array", items: { type: "object", properties: { agent: { type: "string" }, issue: { type: "string" }, severity: { type: "string" } }, required: ["agent", "issue", "severity"] } },
                prompt_improvements: { type: "array", items: { type: "object", properties: { agent: { type: "string" }, current_weakness: { type: "string" }, suggested_change: { type: "string" }, expected_improvement_pct: { type: "number" } }, required: ["agent", "current_weakness", "suggested_change", "expected_improvement_pct"] } },
                performance_summary: { type: "object", properties: { overall_score: { type: "number" }, empathy_avg: { type: "number" }, accuracy_avg: { type: "number" }, conversion_avg: { type: "number" } }, required: ["overall_score", "empathy_avg", "accuracy_avg", "conversion_avg"] }
              },
              required: ["logic_gaps", "prompt_improvements", "performance_summary"],
              additionalProperties: false,
            },
          },
        }],
      }) as any;
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      const analysis = toolCall ? JSON.parse(toolCall.function.arguments) : null;

      if (analysis) {
        // Store daily performance scores
        const today = new Date().toISOString().split("T")[0];
        await supabase.from("agent_performance_scores").upsert({
          agent_slug: agent_slug || "all",
          score_date: today,
          empathy_score: analysis.performance_summary.empathy_avg,
          accuracy_score: analysis.performance_summary.accuracy_avg,
          conversion_rate: analysis.performance_summary.conversion_avg,
          response_quality: analysis.performance_summary.overall_score,
          logic_gaps_found: analysis.logic_gaps.length,
          total_interactions: logsRes.data?.length || 0,
          metadata: analysis,
        }, { onConflict: "agent_slug,score_date" });
      }

      return new Response(JSON.stringify({ success: true, analysis }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: rewrite — Prompt Engineering ────────────────
    if (action === "rewrite") {
      if (!agent_slug) {
        return new Response(JSON.stringify({ error: "agent_slug required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Get current active prompt
      const { data: currentPrompt } = await supabase
        .from("agent_prompt_versions")
        .select("*")
        .eq("agent_slug", agent_slug)
        .eq("is_active", true)
        .single();

      // Get recent feedback for this agent
      const { data: feedback } = await supabase
        .from("chat_message_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      const rewritePrompt = `You are Prometheus, the Prompt Engineering AI for PetID.
Your task: Rewrite the system prompt for agent "${agent_slug}" to improve its performance.

Current prompt: ${currentPrompt?.system_prompt || "No current prompt found"}
Recent user feedback: ${JSON.stringify(feedback?.slice(0, 10))}

Guidelines:
- Maintain PetID's scientific yet warm brand voice
- Improve empathy and conversational flow
- Increase conversion-driving language (without being pushy)
- Keep Hebrew as the primary language
- Add NRC 2006 scientific citations where relevant
- Never use forbidden words: Amazing, Must-have, Best, Deal, Hurry, Perfect

Return ONLY the improved system prompt as plain text.`;

      const aiData = await chatCompletion({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: rewritePrompt }],
      }) as any;
      const newPrompt = aiData.choices?.[0]?.message?.content;

      if (newPrompt) {
        // Get next version number
        const { data: versions } = await supabase
          .from("agent_prompt_versions")
          .select("version")
          .eq("agent_slug", agent_slug)
          .order("version", { ascending: false })
          .limit(1);

        const nextVersion = (versions?.[0]?.version || 0) + 1;

        // Save new version (not active yet - needs A/B test or manual deploy)
        const { data: newVersion } = await supabase
          .from("agent_prompt_versions")
          .insert({
            agent_slug,
            version: nextVersion,
            system_prompt: newPrompt,
            created_by: "prometheus",
          })
          .select()
          .single();

        // Log the improvement
        await supabase.from("prometheus_intelligence_log").insert({
          agent_slug,
          improvement_type: "prompt_rewrite",
          description: `כתיבה מחדש של פרומפט v${nextVersion} עבור ${agent_slug} — שיפור צפוי באמפתיה ודיוק`,
          before_value: currentPrompt?.performance_score || 0,
          after_value: 0,
          auto_applied: false,
        });

        return new Response(JSON.stringify({ success: true, new_version: newVersion }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Failed to generate prompt" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── ACTION: shadow-test — A/B Testing ───────────────────
    if (action === "shadow-test") {
      if (!agent_slug) {
        return new Response(JSON.stringify({ error: "agent_slug required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Get active prompt and latest candidate
      const { data: prompts } = await supabase
        .from("agent_prompt_versions")
        .select("*")
        .eq("agent_slug", agent_slug)
        .order("version", { ascending: false })
        .limit(2);

      if (!prompts || prompts.length < 2) {
        return new Response(JSON.stringify({ error: "Need at least 2 prompt versions" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const activePrompt = prompts.find((p: any) => p.is_active) || prompts[1];
      const candidatePrompt = prompts.find((p: any) => !p.is_active) || prompts[0];

      // Create shadow test with sample conversations
      const { data: sampleLogs } = await supabase
        .from("agent_action_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      const testScenarios = sampleLogs?.slice(0, 5).map((log: any) => log.description) || [
        "שלום, הכלב שלי לא אוכל כבר יומיים",
        "מחפש ביטוח לחתול בן 3",
        "מה ההבדל בין מזון יבש לרטוב?",
      ];

      // Run both prompts through AI and score
      let variantAScore = 0;
      let variantBScore = 0;

      for (const scenario of testScenarios) {
        const [dataA, dataB] = await Promise.all([
          chatCompletion({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: activePrompt.system_prompt },
              { role: "user", content: scenario },
            ],
          }) as any,
          chatCompletion({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: candidatePrompt.system_prompt },
              { role: "user", content: scenario },
            ],
          }) as any,
        ]);

        const contentA = dataA.choices?.[0]?.message?.content || "";
        const contentB = dataB.choices?.[0]?.message?.content || "";

        // Score using AI judge
        const judgeData = await chatCompletion({
          model: "google/gemini-2.5-flash",
          messages: [{
            role: "user",
            content: `Score these two AI responses (1-100) on empathy, accuracy, and conversion potential.
User query: "${scenario}"
Response A: "${contentA.slice(0, 500)}"
Response B: "${contentB.slice(0, 500)}"
Return JSON: {"score_a": number, "score_b": number}`,
          }],
          tools: [{
            type: "function",
            function: {
              name: "return_scores",
              description: "Return the scores",
              parameters: {
                type: "object",
                properties: { score_a: { type: "number" }, score_b: { type: "number" } },
                required: ["score_a", "score_b"],
                additionalProperties: false,
              },
            },
          }],
        }) as any;

        const scores = JSON.parse(judgeData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || '{"score_a":50,"score_b":50}');
        variantAScore += scores.score_a;
        variantBScore += scores.score_b;
      }

      const winner = variantBScore > variantAScore ? "variant_b" : "variant_a";
      const improvementPct = Math.round(((variantBScore - variantAScore) / variantAScore) * 100);

      // Store A/B test result
      const { data: abTest } = await supabase.from("prometheus_ab_tests").insert({
        agent_slug,
        test_name: `Shadow Test v${activePrompt.version} vs v${candidatePrompt.version}`,
        variant_a_prompt_id: activePrompt.id,
        variant_b_prompt_id: candidatePrompt.id,
        variant_a_score: variantAScore,
        variant_b_score: variantBScore,
        variant_a_samples: testScenarios.length,
        variant_b_samples: testScenarios.length,
        winner,
        status: "completed",
        completed_at: new Date().toISOString(),
      }).select().single();

      // If new version wins, auto-deploy
      if (winner === "variant_b" && improvementPct > 5) {
        await supabase.from("agent_prompt_versions").update({ is_active: false }).eq("agent_slug", agent_slug);
        await supabase.from("agent_prompt_versions").update({ is_active: true, deployed_at: new Date().toISOString() }).eq("id", candidatePrompt.id);

        await supabase.from("prometheus_intelligence_log").insert({
          agent_slug,
          improvement_type: "auto_deploy",
          description: `שדרוג אוטומטי של ${agent_slug} מ-v${activePrompt.version} ל-v${candidatePrompt.version}`,
          before_value: variantAScore,
          after_value: variantBScore,
          improvement_pct: improvementPct,
          auto_applied: true,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        test: abTest,
        winner,
        improvement_pct: improvementPct,
        auto_deployed: winner === "variant_b" && improvementPct > 5,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── ACTION: brief — CEO Intelligence Growth ─────────────
    if (action === "brief") {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      const [todayScores, yesterdayScores, improvements] = await Promise.all([
        supabase.from("agent_performance_scores").select("*").eq("score_date", today),
        supabase.from("agent_performance_scores").select("*").eq("score_date", yesterday),
        supabase.from("prometheus_intelligence_log").select("*")
          .gte("created_at", yesterday)
          .order("created_at", { ascending: false }),
      ]);

      return new Response(JSON.stringify({
        success: true,
        brief: {
          today_scores: todayScores.data,
          yesterday_scores: yesterdayScores.data,
          improvements: improvements.data,
          summary: `${improvements.data?.length || 0} שיפורים בוצעו ב-24 שעות האחרונות`,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use: analyze, rewrite, shadow-test, brief" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Prometheus error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
