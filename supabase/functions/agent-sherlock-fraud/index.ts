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

    if (action === "audit-documents") {
      // Scan for duplicate/suspicious insurance leads
      const { data: leads } = await supabase
        .from("insurance_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      let flags = 0;
      const issues: any[] = [];

      // Check for duplicate phone/email patterns
      const phoneMap: Record<string, number> = {};
      for (const lead of leads || []) {
        const phone = (lead as any).phone || "";
        if (phone) {
          phoneMap[phone] = (phoneMap[phone] || 0) + 1;
          if (phoneMap[phone] > 2) {
            flags++;
            issues.push({ type: "duplicate_phone", phone, count: phoneMap[phone], lead_id: lead.id });
          }
        }
      }

      // Log findings
      await supabase.from("agent_action_logs").insert({
        action_type: "fraud_audit",
        description: flags > 0
          ? `🔍 Sherlock: ${flags} חשדות הונאה זוהו — דורש בדיקת אדמין`
          : `✅ Sherlock: ביקורת הונאה עברה בהצלחה — 0 חשדות`,
        metadata: { flags, issues, leads_scanned: leads?.length || 0 },
      });

      if (flags > 0) {
        await supabase.from("admin_approval_queue").insert({
          title: `🔍 Sherlock: ${flags} חשדות הונאה/שלמות נתונים`,
          description: `סוגי חשד: ${issues.map(i => i.type).join(", ")}`,
          category: "fraud",
          status: "pending",
          proposed_changes: issues as any,
        });
      }

      await supabase.from("automation_bots").update({ last_run_at: new Date().toISOString() }).eq("slug", "fraud-detection");

      return new Response(JSON.stringify({ success: true, flags, issues }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Sherlock error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
