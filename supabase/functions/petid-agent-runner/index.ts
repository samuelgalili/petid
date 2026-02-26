import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Bots whose output requires admin approval before reaching users
const APPROVAL_REQUIRED_SLUGS = new Set([
  "sales", "marketing", "compliance", "cashflow-guardian",
  "financial-algo", "fraud-detection", "crisis-pr", "content",
]);

// Bots that send informational output directly
const DIRECT_OUTPUT_SLUGS = new Set([
  "brain", "crm", "nrc-science", "support", "inventory", "medical",
  "system-architect", "ofek-visual-monitor", "prometheus", "market-intelligence",
  "ethics-safety", "vip-experience", "supply-chain", "health-prediction", "onboarding-guide",
]);

const SLUG_CATEGORY_MAP: Record<string, string> = {
  "sales": "commercial", "marketing": "commercial", "compliance": "legal",
  "cashflow-guardian": "financial", "financial-algo": "financial",
  "fraud-detection": "security", "crisis-pr": "communications", "content": "content",
};

const MAX_SELF_HEAL_ATTEMPTS = 2;

// ─── Inter-Agent Synergy Map: which agents collaborate ───
const SYNERGY_MAP: Record<string, string[]> = {
  "maya-ux": ["system-architect", "ofek-visual-monitor"],
  "system-architect": ["maya-ux", "ofek-visual-monitor"],
  "ofek-visual-monitor": ["maya-ux", "system-architect"],
  "sales": ["crm", "content"],
  "content": ["maya-ux", "ofek-visual-monitor"],
  "nrc-science": ["health-prediction", "ethics-safety"],
  "health-prediction": ["nrc-science", "ethics-safety"],
  "cashflow-guardian": ["financial-algo", "fraud-detection"],
  "financial-algo": ["cashflow-guardian", "fraud-detection"],
};

// ─── Call AI Gateway ───
async function callAI(apiKey: string, model: string, messages: Array<{ role: string; content: string }>) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI gateway ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ─── Prometheus Self-Heal: rewrite a failed prompt ───
async function prometheusHeal(
  apiKey: string,
  supabase: any,
  bot: any,
  originalPrompt: string,
  errorMessage: string,
  attempt: number
): Promise<{ newPrompt: string; output: string } | null> {
  console.log(`🔧 Prometheus healing ${bot.name} (attempt ${attempt})...`);

  try {
    // Ask Prometheus to rewrite the prompt
    const healPrompt = `You are Prometheus, the Meta-Coach AI for the PetID fleet.
A bot named "${bot.name}" (slug: ${bot.slug}) just FAILED with this error:
"${errorMessage}"

Its current system prompt is:
"""
${originalPrompt}
"""

Your job: Rewrite the system prompt to fix the failure. Keep the bot's role and purpose intact.
Rules:
- Output ONLY the new system prompt, nothing else
- Keep it concise (under 500 words)
- Make it more resilient to errors
- Preserve Hebrew language instructions if present`;

    const newPrompt = await callAI(apiKey, "google/gemini-2.5-flash", [
      { role: "system", content: healPrompt },
      { role: "user", content: "Rewrite the prompt now." },
    ]);

    if (!newPrompt || newPrompt.length < 20) {
      console.error(`Prometheus returned empty/short prompt for ${bot.name}`);
      return null;
    }

    // Log the prompt version
    await supabase.from("agent_prompt_versions").insert({
      agent_slug: bot.slug,
      system_prompt: newPrompt,
      is_active: false, // not deployed until success
      created_by: "prometheus-self-heal",
    });

    // Retry the bot with the new prompt
    const isApprovalRequired = APPROVAL_REQUIRED_SLUGS.has(bot.slug);
    const approxSuffix = !isApprovalRequired
      ? `\n\nIMPORTANT: Use approximation language: "כ-", "הערכה", "בסביבות". End with: "המידע הוא להעשרה בלבד ואינו מהווה המלצה רפואית או מקצועית."`
      : "";

    const output = await callAI(apiKey, "google/gemini-2.5-flash-lite", [
      { role: "system", content: newPrompt + approxSuffix },
      { role: "user", content: `Run your scheduled check. Current time: ${new Date().toISOString()}. Provide a brief status report (max 200 words). Respond in Hebrew.` },
    ]);

    if (!output || output.length < 10) {
      console.error(`Healed bot ${bot.name} still produced empty output`);
      return null;
    }

    // Success! Update the prompt version as active and deploy
    await supabase
      .from("agent_prompt_versions")
      .update({ is_active: false })
      .eq("agent_slug", bot.slug)
      .eq("is_active", true);

    await supabase
      .from("agent_prompt_versions")
      .update({ is_active: true, deployed_at: new Date().toISOString() })
      .eq("agent_slug", bot.slug)
      .eq("created_by", "prometheus-self-heal")
      .order("created_at", { ascending: false })
      .limit(1);

    // Update the bot's system_prompt with the healed version
    await supabase
      .from("automation_bots")
      .update({ system_prompt: newPrompt, updated_at: new Date().toISOString() })
      .eq("id", bot.id);

    console.log(`✅ Prometheus healed ${bot.name} successfully on attempt ${attempt}`);
    return { newPrompt, output };
  } catch (healError) {
    console.error(`Prometheus heal failed for ${bot.name}:`, healError);
    return null;
  }
}

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

    let targetBotId: string | null = null;
    let adminOverride: { command: string; source: string; synergy?: boolean } | null = null;
    try {
      const body = await req.json();
      targetBotId = body?.bot_id || null;
      // Admin Override Protocol: Priority 1 commands from dashboard
      if (body?.admin_override) {
        adminOverride = {
          command: body.admin_override.command || "",
          source: body.admin_override.source || "admin-dashboard",
          synergy: body.admin_override.synergy !== false,
        };
        console.log(`🔴 ADMIN OVERRIDE received from ${adminOverride.source}: "${adminOverride.command}"`);
      }
    } catch {
      // No body = run all active bots
    }

    let query = supabase.from("automation_bots").select("*").eq("is_active", true);
    if (targetBotId) query = query.eq("id", targetBotId);

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

        const isApprovalRequired = APPROVAL_REQUIRED_SLUGS.has(bot.slug);
        const approxInstruction = !isApprovalRequired
          ? `\n\nIMPORTANT: Use approximation language: "כ-", "הערכה", "בסביבות". Never give definitive commands. End with: "המידע הוא להעשרה בלבד ואינו מהווה המלצה רפואית או מקצועית."`
          : "";

        const prompt = bot.system_prompt ||
          `You are "${bot.name}", a specialized AI agent for PetID. Your role: ${bot.description || "assist with pet management"}. Capabilities: ${JSON.stringify(bot.capabilities || [])}.${approxInstruction}`;

        let aiOutput: string | null = null;
        let healed = false;
        let healAttempts = 0;

        // ─── Determine user message (Admin Override = Priority 1) ───
        const userMessage = adminOverride
          ? `🔴 ADMIN OVERRIDE (Priority 1) from ${adminOverride.source}:\n"${adminOverride.command}"\n\nExecute this command immediately. Analyze the request, perform the action, and report completion status. Current time: ${new Date().toISOString()}. Respond in Hebrew.`
          : `Run your scheduled check. Current time: ${new Date().toISOString()}. Provide a brief status report (max 200 words). Respond in Hebrew.`;

        // ─── Try running the bot ───
        try {
          aiOutput = await callAI(LOVABLE_API_KEY, adminOverride ? "google/gemini-2.5-flash" : "google/gemini-2.5-flash-lite", [
            { role: "system", content: prompt + approxInstruction },
            { role: "user", content: userMessage },
          ]);
        } catch (aiError) {
          // ─── SELF-HEALING: Prometheus kicks in ───
          const errorMsg = aiError instanceof Error ? aiError.message : String(aiError);
          console.warn(`⚠️ Bot ${bot.name} failed: ${errorMsg}. Engaging Prometheus...`);

          for (let attempt = 1; attempt <= MAX_SELF_HEAL_ATTEMPTS; attempt++) {
            healAttempts = attempt;
            const healResult = await prometheusHeal(
              LOVABLE_API_KEY, supabase, bot, prompt, errorMsg, attempt
            );
            if (healResult) {
              aiOutput = healResult.output;
              healed = true;
              break;
            }
          }

          if (!aiOutput) {
            // All heal attempts failed
            await supabase.from("automation_bots").update({
              last_run_at: new Date().toISOString(),
              health_status: "critical",
              last_error: `Failed after ${healAttempts} self-heal attempts: ${errorMsg}`,
              updated_at: new Date().toISOString(),
            }).eq("id", bot.id);

            // Log to agent_action_logs for visibility
            await supabase.from("agent_action_logs").insert({
              action_type: "self_heal_failed",
              description: `[Prometheus] Failed to heal "${bot.name}" after ${healAttempts} attempts. Error: ${errorMsg}`,
              reason: errorMsg,
              expected_outcome: "Bot recovery",
              actual_outcome: "All attempts failed — requires manual intervention",
              metadata: { slug: bot.slug, attempts: healAttempts },
            });

            results.push({ bot: bot.name, status: "critical", routed: "none", healed: false, healAttempts, error: errorMsg });
            continue;
          }
        }

        if (!aiOutput) {
          aiOutput = "No output generated";
        }

        // ─── Update bot status ───
        await supabase.from("automation_bots").update({
          last_run_at: new Date().toISOString(),
          last_output: aiOutput,
          health_status: healed ? "healed" : "healthy",
          last_error: healed ? `Self-healed after ${healAttempts} attempt(s)` : null,
          run_count: (bot.run_count || 0) + 1,
          last_health_check: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", bot.id);

        // ─── Log self-heal success ───
        if (healed) {
          await supabase.from("agent_action_logs").insert({
            action_type: "self_heal_success",
            description: `[Prometheus] ✅ Successfully healed "${bot.name}" — prompt rewritten and bot recovered.`,
            reason: `Original failure triggered self-heal`,
            expected_outcome: "Bot recovery via prompt rewrite",
            actual_outcome: "Bot recovered and produced valid output",
            metadata: { slug: bot.slug, attempts: healAttempts },
          });
        }

        // ─── OUTPUT ROUTING (same as before) ───
        let routed = "stored_only";

        if (isApprovalRequired) {
          const category = SLUG_CATEGORY_MAP[bot.slug] || "general";
          const { error: queueError } = await supabase.from("admin_approval_queue").insert({
            bot_id: bot.id,
            title: `[${bot.name}] דוח אוטומטי — ${new Date().toLocaleDateString("he-IL")}`,
            description: `פלט אוטומטי מהרובוט "${bot.name}" שדורש אישור אדמין.`,
            category,
            status: "pending",
            draft_content: aiOutput,
            proposed_changes: { source: "petid-agent-runner", slug: bot.slug, run_at: new Date().toISOString(), healed },
          });
          if (!queueError) {
            routed = "approval_queue";
            console.log(`→ ${bot.name} output routed to approval_queue (${category})`);
          }
        } else if (DIRECT_OUTPUT_SLUGS.has(bot.slug)) {
          const { error: logError } = await supabase.from("agent_action_logs").insert({
            action_type: "bot_scheduled_report",
            description: `[${bot.name}] ${aiOutput}`.substring(0, 2000),
            reason: "Scheduled automated check",
            expected_outcome: "Informational report for admin dashboard",
            metadata: { slug: bot.slug, run_at: new Date().toISOString(), routed: "direct", healed },
          });
          if (!logError) {
            routed = "direct_log";
            console.log(`→ ${bot.name} output routed to action_logs (informational)`);
          }
        }

        results.push({ bot: bot.name, status: healed ? "healed" : "success", routed, healed, healAttempts });
      } catch (botError) {
        console.error(`Error running bot ${bot.name}:`, botError);

        await supabase.from("automation_bots").update({
          last_run_at: new Date().toISOString(),
          health_status: "error",
          last_error: botError instanceof Error ? botError.message : "Unknown error",
          updated_at: new Date().toISOString(),
        }).eq("id", bot.id);

        results.push({ bot: bot.name, status: "error", routed: "none", error: String(botError) });
      }
    }

    const successCount = results.filter((r) => r.status === "success" || r.status === "healed").length;
    const healedCount = results.filter((r) => r.status === "healed").length;
    const criticalCount = results.filter((r) => r.status === "critical").length;
    const approvalCount = results.filter((r) => r.routed === "approval_queue").length;
    const directCount = results.filter((r) => r.routed === "direct_log").length;

    return new Response(
      JSON.stringify({
        message: `Executed ${results.length} bots: ${successCount} success (${healedCount} self-healed), ${criticalCount} critical, ${approvalCount} → approval queue, ${directCount} → direct logs`,
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
