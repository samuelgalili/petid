import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// TODO: Claude does not support image generation — this function needs an alternative provider
import { chatCompletion } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify admin
    const { data: adminRole } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, pet_name, breed, nrc_stat, style } = await req.json();

    // Build visual prompt with PetID branding
    const visualPrompt = `Create a professional, minimalist social media image for PetID pet health app.
Style: ${style || "clean, modern, white background, soft lighting"}
Subject: ${prompt}
${pet_name ? `Pet name to overlay: ${pet_name}` : ""}
${breed ? `Breed: ${breed}` : ""}
${nrc_stat ? `NRC Science stat to overlay: "${nrc_stat}"` : ""}
Branding: Include subtle "PetID Science" watermark in bottom-right corner.
Format: Vertical 9:16 for TikTok/Reels/Stories.
Color palette: White, black, with subtle blue accents. Ultra-minimalist.`;

    // TODO: Claude does not support image generation — this function needs an alternative provider
    const result = await chatCompletion({
      model: "google/gemini-3-pro-image-preview",
      messages: [
        { role: "user", content: visualPrompt },
      ],
    }) as any;

    // Log visual creation
    await supabase.from("agent_action_logs").insert({
      action_type: "visual_created",
      description: `Lumi generated visual: ${prompt?.slice(0, 80)}`,
      reason: "Automated visual content creation",
      expected_outcome: "Image ready for content calendar",
    });

    return new Response(JSON.stringify({
      result: result.choices?.[0]?.message?.content,
      prompt_used: visualPrompt,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[Lumi Visual]", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
