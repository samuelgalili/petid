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

    if (action === "monitor-shipments") {
      // Check all active shipments
      const { data: orders } = await supabase
        .from("orders")
        .select("id, status, shipping, tracking_number, created_at")
        .in("status", ["processing", "shipped"])
        .order("created_at", { ascending: false })
        .limit(50);

      const activeShipments = orders?.length || 0;
      const staleShipments = (orders || []).filter(o => {
        const age = Date.now() - new Date(o.created_at).getTime();
        return o.status === "processing" && age > 3 * 24 * 60 * 60 * 1000; // 3+ days
      });

      await supabase.from("agent_action_logs").insert({
        action_type: "shipment_monitor",
        description: `Walt: ${activeShipments} משלוחים פעילים, ${staleShipments.length} עיכובים אפשריים`,
        metadata: { active: activeShipments, stale: staleShipments.length, stale_ids: staleShipments.map(s => s.id) },
      });

      // Alert on stale shipments
      if (staleShipments.length > 0) {
        await supabase.from("admin_approval_queue").insert({
          title: `📦 Walt: ${staleShipments.length} משלוחים עם עיכוב אפשרי`,
          description: `משלוחים שנמצאים ב-processing מעל 3 ימים`,
          category: "logistics",
          status: "pending",
          proposed_changes: staleShipments as any,
        });
      }

      await supabase.from("automation_bots").update({ last_run_at: new Date().toISOString() }).eq("slug", "supply-chain");

      return new Response(JSON.stringify({ success: true, active: activeShipments, stale: staleShipments.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Walt error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
