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

    if (action === "audit-completions") {
      // Check profile completion rates
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone, city, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      const { data: pets } = await supabase
        .from("pets")
        .select("owner_id")
        .limit(500);

      const petOwnerIds = new Set((pets || []).map(p => p.owner_id));
      
      let incomplete = 0;
      const gaps: any[] = [];

      for (const profile of profiles || []) {
        const missing: string[] = [];
        if (!profile.full_name) missing.push("name");
        if (!profile.avatar_url) missing.push("avatar");
        if (!profile.phone) missing.push("phone");
        if (!petOwnerIds.has(profile.id)) missing.push("pet");
        
        if (missing.length > 0) {
          incomplete++;
          gaps.push({ user_id: profile.id, missing, completion: Math.round(((4 - missing.length) / 4) * 100) });
        }
      }

      const completionRate = profiles?.length ? Math.round(((profiles.length - incomplete) / profiles.length) * 100) : 0;

      await supabase.from("agent_action_logs").insert({
        action_type: "onboarding_audit",
        description: `Ori: שיעור השלמת פרופיל — ${completionRate}%. ${incomplete} משתמשים עם פרופיל חלקי`,
        metadata: { completion_rate: completionRate, incomplete, total: profiles?.length || 0, top_gaps: gaps.slice(0, 5) },
      });

      await supabase.from("automation_bots").update({ last_run_at: new Date().toISOString() }).eq("slug", "onboarding-guide");

      return new Response(JSON.stringify({ success: true, completion_rate: completionRate, incomplete }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Ori error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
