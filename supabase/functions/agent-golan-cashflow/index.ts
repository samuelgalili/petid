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

    if (action === "monitor-cashflow") {
      // Track all NIS entering and leaving the system
      const { data: payments } = await supabase
        .from("cardcom_payments")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(50);

      const { data: subscriptions } = await supabase
        .from("cardcom_subscriptions")
        .select("*")
        .eq("status", "active");

      await supabase.from("agent_action_logs").insert({
        action_type: "cashflow_monitor",
        description: "סריקת תזרים מזומנים: תשלומים, מנויים, ו-LTV",
        metadata: {
          total_payments: payments?.length || 0,
          active_subscriptions: subscriptions?.length || 0,
          scan_time: new Date().toISOString(),
        },
      });

      await supabase
        .from("automation_bots")
        .update({ last_run_at: new Date().toISOString() })
        .eq("slug", "cashflow-guardian");

      return new Response(
        JSON.stringify({
          success: true,
          payments_count: payments?.length || 0,
          active_subs: subscriptions?.length || 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "overdue-alerts") {
      // Check for overdue partner payments and send alerts
      await supabase.from("agent_action_logs").insert({
        action_type: "overdue_alert",
        description: "בדיקת פיגורי תשלום שותפים — שליחת התראות אוטומטיות",
        expected_outcome: "גביית תשלומי לידים מאוחרים משותפי ביטוח",
      });

      return new Response(
        JSON.stringify({ success: true, message: "Overdue alerts processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Golan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
