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

    const { action } = await req.json();

    if (action === "monitor-sentiment") {
      // Analyze content reports and negative feedback
      const { data: reports } = await supabase
        .from("content_reports")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20);

      const { data: feedback } = await supabase
        .from("chat_message_feedback")
        .select("*")
        .eq("rating", "negative")
        .order("created_at", { ascending: false })
        .limit(20);

      const crisisLevel = (reports?.length || 0) > 5 || (feedback?.length || 0) > 10
        ? "HIGH" : (reports?.length || 0) > 2 ? "MEDIUM" : "LOW";

      await supabase.from("agent_action_logs").insert({
        action_type: "sentiment_monitor",
        description: `ניטור סנטימנט — רמת משבר: ${crisisLevel}`,
        metadata: {
          pending_reports: reports?.length || 0,
          negative_feedback: feedback?.length || 0,
          crisis_level: crisisLevel,
        },
      });

      await supabase
        .from("automation_bots")
        .update({ last_run_at: new Date().toISOString() })
        .eq("slug", "crisis-pr");

      return new Response(
        JSON.stringify({
          success: true,
          crisis_level: crisisLevel,
          reports: reports?.length || 0,
          negative_feedback: feedback?.length || 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "error-spike-check") {
      // Check system_error_logs for spikes
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentErrors, count } = await supabase
        .from("system_error_logs")
        .select("*", { count: "exact" })
        .gte("created_at", oneHourAgo);

      const isSpike = (count || 0) > 20;

      if (isSpike) {
        // Draft apology and queue compensation
        await supabase.from("admin_approval_queue").insert({
          title: `⚠️ ספייק שגיאות: ${count} שגיאות בשעה האחרונה`,
          description: "מנחם זיהה ספייק בשגיאות — טיוטת הודעת התנצלות ופיצוי מוכנות לאישור",
          category: "crisis",
          status: "pending",
        });
      }

      await supabase.from("agent_action_logs").insert({
        action_type: "error_spike_check",
        description: isSpike
          ? `⚠️ ספייק שגיאות! ${count} שגיאות בשעה האחרונה — טיוטת פיצוי הוכנה`
          : `✅ ללא ספייק — ${count || 0} שגיאות בשעה האחרונה`,
        metadata: { error_count: count || 0, is_spike: isSpike },
      });

      return new Response(
        JSON.stringify({ success: true, is_spike: isSpike, error_count: count || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Menachem error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
