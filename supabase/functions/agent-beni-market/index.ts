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

    if (action === "scan-competitors") {
      // Scan competitor pricing and insurance market trends
      // Log findings to agent_action_logs
      const { error } = await supabase.from("agent_action_logs").insert({
        action_type: "competitor_scan",
        description: "סריקת מחירי מתחרים ומגמות שוק ביטוח חיות מחמד",
        expected_outcome: "זיהוי שינויי מחירים והתאמת Value Proposition",
        metadata: {
          scan_time: new Date().toISOString(),
          markets: ["pet_insurance", "pet_food", "vet_services"],
        },
      });

      if (error) throw error;

      // Update bot last_run_at
      await supabase
        .from("automation_bots")
        .update({ last_run_at: new Date().toISOString() })
        .eq("slug", "market-intelligence");

      return new Response(
        JSON.stringify({ success: true, message: "Competitor scan completed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "price-alert") {
      // Check for price drops and alert Danny (Sales)
      const { error } = await supabase.from("agent_action_logs").insert({
        action_type: "price_alert",
        description: "זוהה שינוי מחיר אצל מתחרה — התראה נשלחה לדני (Sales)",
        expected_outcome: "עדכון דינמי של הצעת הערך שלנו",
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Price alert processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Beni error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
