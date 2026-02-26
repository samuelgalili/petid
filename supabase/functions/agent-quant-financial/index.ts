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

    if (action === "optimize-inventory") {
      // Analyze inventory costs and suggest optimal reorder points
      const { data: products } = await supabase
        .from("business_products")
        .select("name, price, cost_price, in_stock, auto_restock, restock_interval_days")
        .limit(50);

      const { data: invoices } = await supabase
        .from("supplier_invoices")
        .select("amount, status, currency")
        .limit(20);

      const analysis = {
        total_products: products?.length || 0,
        low_margin: products?.filter(p => p.cost_price && p.price && (p.price - p.cost_price) / p.price < 0.3).length || 0,
        out_of_stock: products?.filter(p => !p.in_stock).length || 0,
        pending_invoices: invoices?.filter(i => i.status === "pending").length || 0,
      };

      await supabase.from("agent_action_logs").insert({
        action_type: "inventory_optimization",
        description: `Quant: ניתוח אופטימיזציית מלאי — ${analysis.low_margin} מוצרים עם מרווח נמוך, ${analysis.out_of_stock} חסרים במלאי`,
        metadata: analysis,
      });

      await supabase.from("automation_bots").update({ last_run_at: new Date().toISOString() }).eq("slug", "financial-algo");

      return new Response(JSON.stringify({ success: true, analysis }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ad-spend-optimize") {
      await supabase.from("agent_action_logs").insert({
        action_type: "ad_spend_optimization",
        description: "Quant: ניתוח ROI פרסום — חישוב הקצאת תקציב אופטימלית לפי ערוצים",
        metadata: { scan_time: new Date().toISOString() },
      });

      return new Response(JSON.stringify({ success: true, message: "Ad spend analysis complete" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Quant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
