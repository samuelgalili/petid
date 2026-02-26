import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FORBIDDEN_SALES_LANGUAGE = ["amazing", "must-have", "best", "deal", "hurry", "perfect"];
const MEDICAL_RED_FLAGS = ["prescribe", "diagnose", "guaranteed cure", "100% safe"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action } = await req.json();

    if (action === "audit-agents") {
      // Audit recent agent action logs for ethics violations
      const { data: recentLogs } = await supabase
        .from("agent_action_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      let violations = 0;
      const issues: any[] = [];

      // Check for forbidden sales language in action descriptions
      for (const log of recentLogs || []) {
        const desc = (log.description || "").toLowerCase();
        for (const word of FORBIDDEN_SALES_LANGUAGE) {
          if (desc.includes(word)) {
            violations++;
            issues.push({
              log_id: log.id,
              type: "forbidden_sales_language",
              word,
              agent: log.bot_id,
            });
          }
        }
        for (const flag of MEDICAL_RED_FLAGS) {
          if (desc.includes(flag)) {
            violations++;
            issues.push({
              log_id: log.id,
              type: "medical_red_flag",
              flag,
              agent: log.bot_id,
            });
          }
        }
      }

      // Check prompt versions for hallucination risk
      const { data: activePrompts } = await supabase
        .from("agent_prompt_versions")
        .select("*")
        .eq("is_active", true);

      for (const prompt of activePrompts || []) {
        const content = (prompt.system_prompt || "").toLowerCase();
        for (const flag of MEDICAL_RED_FLAGS) {
          if (content.includes(flag)) {
            violations++;
            issues.push({
              prompt_id: prompt.id,
              type: "prompt_medical_risk",
              agent: prompt.agent_slug,
              flag,
            });
          }
        }
      }

      await supabase.from("agent_action_logs").insert({
        action_type: "ethics_audit",
        description: violations > 0
          ? `⚠️ נמצאו ${violations} הפרות אתיקה — דורש בדיקת אדמין`
          : `✅ ביקורת אתיקה עברה בהצלחה — 0 הפרות`,
        metadata: { violations, issues, logs_scanned: recentLogs?.length || 0 },
      });

      // If violations found, add to approval queue
      if (violations > 0) {
        await supabase.from("admin_approval_queue").insert({
          title: `🛡️ Ethi: ${violations} הפרות אתיקה/בטיחות זוהו`,
          description: `הפרות: ${issues.map((i: any) => i.type).join(", ")}`,
          category: "ethics",
          status: "pending",
          proposed_changes: issues as any,
        });
      }

      await supabase
        .from("automation_bots")
        .update({ last_run_at: new Date().toISOString() })
        .eq("slug", "ethics-safety");

      return new Response(
        JSON.stringify({ success: true, violations, issues }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "hallucination-check") {
      // Use AI to verify NRC medical outputs against known data
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(
          JSON.stringify({ success: false, error: "LOVABLE_API_KEY not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get recent NRC-related logs
      const { data: nrcLogs } = await supabase
        .from("agent_action_logs")
        .select("*")
        .ilike("action_type", "%nrc%")
        .order("created_at", { ascending: false })
        .limit(10);

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
              content: "You are Ethi, a veterinary safety auditor. Review the following NRC agent logs and identify any potential hallucinations, inaccurate medical claims, or dangerous advice. Respond in Hebrew with a JSON object: { safe: boolean, issues: string[] }",
            },
            {
              role: "user",
              content: JSON.stringify(nrcLogs),
            },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "Payment required" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const result = await aiResponse.json();
      const content = result.choices?.[0]?.message?.content || "{}";

      await supabase.from("agent_action_logs").insert({
        action_type: "hallucination_check",
        description: "בדיקת הזיות AI לפלטי ד\"ר NRC",
        metadata: { ai_result: content, logs_checked: nrcLogs?.length || 0 },
      });

      return new Response(
        JSON.stringify({ success: true, audit_result: content }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Ethi error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
