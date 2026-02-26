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

    if (action === "birthday-check") {
      // Find pets with upcoming birthdays
      const today = new Date();
      const { data: pets } = await supabase
        .from("pets")
        .select("id, name, date_of_birth, owner_id")
        .not("date_of_birth", "is", null);

      const birthdayPets = (pets || []).filter((pet: any) => {
        if (!pet.date_of_birth) return false;
        const dob = new Date(pet.date_of_birth);
        return dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate();
      });

      await supabase.from("agent_action_logs").insert({
        action_type: "birthday_celebration",
        description: `זוהו ${birthdayPets.length} חיות מחמד עם יום הולדת היום — שליחת ברכות`,
        metadata: {
          birthday_pets: birthdayPets.map((p: any) => ({ id: p.id, name: p.name })),
        },
      });

      await supabase
        .from("automation_bots")
        .update({ last_run_at: new Date().toISOString() })
        .eq("slug", "vip-experience");

      return new Response(
        JSON.stringify({ success: true, birthdays: birthdayPets.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "inactivity-scan") {
      // Find users who haven't logged in for 7+ days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: inactive } = await supabase
        .from("profiles")
        .select("id, display_name, last_login")
        .lt("last_login", sevenDaysAgo.toISOString())
        .not("last_login", "is", null)
        .limit(50);

      await supabase.from("agent_action_logs").insert({
        action_type: "inactivity_detection",
        description: `זוהו ${inactive?.length || 0} משתמשים לא פעילים (7+ ימים) — הכנת הודעות Win-Back`,
        expected_outcome: "שליחת הודעות 'מתגעגעים ל-[שם החיה]' עם תובנת NRC",
        metadata: { inactive_count: inactive?.length || 0 },
      });

      return new Response(
        JSON.stringify({ success: true, inactive_users: inactive?.length || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Siggy error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
