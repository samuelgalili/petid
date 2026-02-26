import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Bots whose output requires admin approval before reaching users
const APPROVAL_REQUIRED_SLUGS = new Set([
  "sales",           // Insurance leads, upsell — commercial
  "marketing",       // Push notifications, campaigns — commercial
  "compliance",      // Legal/regulatory actions
  "cashflow-guardian", // Financial decisions
  "financial-algo",  // Price changes, billing
  "fraud-detection", // Security-critical
  "crisis-pr",       // Public communications
  "content",         // Blog/social posts need review
]);

// Bots that send informational output directly (wrapped in approximation language)
const DIRECT_OUTPUT_SLUGS = new Set([
  "brain",
  "crm",
  "nrc-science",
  "support",
  "inventory",
  "medical",
  "system-architect",
  "ofek-visual-monitor",
  "prometheus",
  "market-intelligence",
  "ethics-safety",
  "vip-experience",
  "supply-chain",
  "health-prediction",
  "onboarding-guide",
]);

// Category mapping for approval queue
const SLUG_CATEGORY_MAP: Record<string, string> = {
  "sales": "commercial",
  "marketing": "commercial",
  "compliance": "legal",
  "cashflow-guardian": "financial",
  "financial-algo": "financial",
  "fraud-detection": "security",
  "crisis-pr": "communications",
  "content": "content",
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

        // Build prompt — informational bots get approximation instructions
        const isApprovalRequired = APPROVAL_REQUIRED_SLUGS.has(bot.slug);
        const approxInstruction = !isApprovalRequired
          ? `\n\nIMPORTANT: You provide informational insights only. Use approximation language: "כ-" (approximately), "הערכה" (estimate), "בסביבות" (around). Never give definitive commands. End with: "המידע הוא להעשרה בלבד ואינו מהווה המלצה רפואית או מקצועית."`
          : "";

        const prompt = bot.system_prompt ||
          `You are "${bot.name}", a specialized AI agent for PetID. Your role: ${bot.description || "assist with pet management"}. Capabilities: ${JSON.stringify(bot.capabilities || [])}.${approxInstruction}`;

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
              { role: "user", content: `Run your scheduled check. Current time: ${new Date().toISOString()}. Provide a brief status report (max 200 words). Respond in Hebrew.` },
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

          results.push({ bot: bot.name, status: "error", routed: "none", error: `AI ${aiResponse.status}` });
          continue;
        }

        const aiData = await aiResponse.json();
        const aiOutput = aiData.choices?.[0]?.message?.content || "No output";

        // Update bot status in automation_bots
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

        // === OUTPUT ROUTING ===
        let routed = "stored_only";

        if (isApprovalRequired) {
          // Route to admin_approval_queue for human review
          const category = SLUG_CATEGORY_MAP[bot.slug] || "general";
          const { error: queueError } = await supabase
            .from("admin_approval_queue")
            .insert({
              bot_id: bot.id,
              title: `[${bot.name}] דוח אוטומטי — ${new Date().toLocaleDateString("he-IL")}`,
              description: `פלט אוטומטי מהרובוט "${bot.name}" שדורש אישור אדמין לפני פרסום או ביצוע.`,
              category,
              status: "pending",
              draft_content: aiOutput,
              proposed_changes: { source: "petid-agent-runner", slug: bot.slug, run_at: new Date().toISOString() },
            });

          if (queueError) {
            console.error(`Approval queue insert error for ${bot.name}:`, queueError);
          } else {
            routed = "approval_queue";
            console.log(`→ ${bot.name} output routed to approval_queue (${category})`);
          }
        } else if (DIRECT_OUTPUT_SLUGS.has(bot.slug)) {
          // Route informational output — log to agent_action_logs for visibility
          const { error: logError } = await supabase
            .from("agent_action_logs")
            .insert({
              action_type: "bot_scheduled_report",
              description: `[${bot.name}] ${aiOutput}`.substring(0, 2000),
              reason: "Scheduled automated check",
              expected_outcome: "Informational report for admin dashboard",
              metadata: { slug: bot.slug, run_at: new Date().toISOString(), routed: "direct" },
            });

          if (logError) {
            console.error(`Action log insert error for ${bot.name}:`, logError);
          } else {
            routed = "direct_log";
            console.log(`→ ${bot.name} output routed to action_logs (informational)`);
          }
        }

        results.push({ bot: bot.name, status: "success", routed });
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

        results.push({ bot: bot.name, status: "error", routed: "none", error: String(botError) });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const approvalCount = results.filter((r) => r.routed === "approval_queue").length;
    const directCount = results.filter((r) => r.routed === "direct_log").length;

    return new Response(
      JSON.stringify({
        message: `Executed ${results.length} bots: ${successCount} success, ${approvalCount} → approval queue, ${directCount} → direct logs`,
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
