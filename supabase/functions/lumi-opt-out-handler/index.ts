import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Hebrew + English opt-out keywords
const OPT_OUT_KEYWORDS = [
  "stop", "unsubscribe", "הסר", "הסרה", "תפסיקו", "הפסק", "הפסיקו",
  "לא רוצה", "בטל", "ביטול", "remove", "cancel", "opt out", "opt-out",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { message, phone, user_id, channel } = await req.json();

    if (!message || (!phone && !user_id)) {
      return new Response(JSON.stringify({ error: "Missing message or identifier" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = message.trim().toLowerCase();
    const isOptOut = OPT_OUT_KEYWORDS.some(kw => normalized.includes(kw));

    if (!isOptOut) {
      return new Response(JSON.stringify({ opt_out: false, message: "Not an opt-out keyword" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find user by phone or ID
    let targetUserId = user_id;
    if (!targetUserId && phone) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();
      targetUserId = profile?.id;
    }

    if (!targetUserId) {
      return new Response(JSON.stringify({ opt_out: true, error: "User not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile
    await supabase.from("profiles").update({
      marketing_consent: false,
      marketing_unsubscribed_at: new Date().toISOString(),
    }).eq("id", targetUserId);

    // Log for legal compliance
    await supabase.from("marketing_opt_out_log").insert({
      user_id: targetUserId,
      action: "opt_out",
      channel: channel || "whatsapp",
      keyword: normalized,
      source: "nlp_listener",
    });

    // Audit log
    await supabase.from("agent_data_access_log").insert({
      agent_slug: "lumi-content",
      agent_name: "Lumi Content Engine",
      action_type: "write",
      entity_type: "profile",
      entity_id: targetUserId,
      user_id: targetUserId,
      data_fields: ["marketing_consent", "marketing_unsubscribed_at"],
      reason: `User opted out via keyword: "${normalized}" on ${channel || "whatsapp"}`,
    });

    return new Response(JSON.stringify({
      opt_out: true,
      user_id: targetUserId,
      keyword: normalized,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[Lumi Opt-Out]", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
