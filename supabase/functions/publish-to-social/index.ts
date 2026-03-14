import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_GRAPH_URL = "https://graph.facebook.com/v21.0";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
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

    // Verify admin
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: adminRole } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const META_PAGE_ACCESS_TOKEN = Deno.env.get("META_PAGE_ACCESS_TOKEN");
    const META_PAGE_ID = Deno.env.get("META_PAGE_ID");
    const META_INSTAGRAM_ACCOUNT_ID = Deno.env.get("META_INSTAGRAM_ACCOUNT_ID");

    if (!META_PAGE_ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: "META_PAGE_ACCESS_TOKEN not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { platform, message, imageUrl, link } = await req.json();

    const results: Record<string, any> = {};

    // Publish to Facebook Page
    if (platform === "facebook" || platform === "both") {
      if (!META_PAGE_ID) {
        results.facebook = { success: false, error: "META_PAGE_ID not configured" };
      } else {
        try {
          const fbBody: Record<string, string> = {
            access_token: META_PAGE_ACCESS_TOKEN,
          };

          if (imageUrl) {
            // Photo post
            fbBody.url = imageUrl;
            fbBody.caption = message || "";
            
            const fbRes = await fetch(`${META_GRAPH_URL}/${META_PAGE_ID}/photos`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(fbBody),
            });
            const fbData = await fbRes.json();
            
            if (fbData.error) {
              results.facebook = { success: false, error: fbData.error.message };
            } else {
              results.facebook = { success: true, postId: fbData.id || fbData.post_id };
            }
          } else {
            // Text post (with optional link)
            fbBody.message = message || "";
            if (link) fbBody.link = link;

            const fbRes = await fetch(`${META_GRAPH_URL}/${META_PAGE_ID}/feed`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(fbBody),
            });
            const fbData = await fbRes.json();

            if (fbData.error) {
              results.facebook = { success: false, error: fbData.error.message };
            } else {
              results.facebook = { success: true, postId: fbData.id };
            }
          }
        } catch (e) {
          results.facebook = { success: false, error: e instanceof Error ? e.message : "Unknown" };
        }
      }
    }

    // Publish to Instagram
    if (platform === "instagram" || platform === "both") {
      if (!META_INSTAGRAM_ACCOUNT_ID) {
        results.instagram = { success: false, error: "META_INSTAGRAM_ACCOUNT_ID not configured" };
      } else if (!imageUrl) {
        results.instagram = { success: false, error: "Instagram requires an image" };
      } else {
        try {
          // Step 1: Create media container
          const containerRes = await fetch(`${META_GRAPH_URL}/${META_INSTAGRAM_ACCOUNT_ID}/media`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image_url: imageUrl,
              caption: message || "",
              access_token: META_PAGE_ACCESS_TOKEN,
            }),
          });
          const containerData = await containerRes.json();

          if (containerData.error) {
            results.instagram = { success: false, error: containerData.error.message };
          } else {
            // Step 2: Publish the container
            const publishRes = await fetch(`${META_GRAPH_URL}/${META_INSTAGRAM_ACCOUNT_ID}/media_publish`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                creation_id: containerData.id,
                access_token: META_PAGE_ACCESS_TOKEN,
              }),
            });
            const publishData = await publishRes.json();

            if (publishData.error) {
              results.instagram = { success: false, error: publishData.error.message };
            } else {
              results.instagram = { success: true, postId: publishData.id };
            }
          }
        } catch (e) {
          results.instagram = { success: false, error: e instanceof Error ? e.message : "Unknown" };
        }
      }
    }

    // Log the publish action
    await supabase.from("agent_action_logs").insert({
      action_type: "social_publish",
      description: `Published to ${platform}: ${message?.slice(0, 80) || "image post"}`,
      reason: "Admin manual social publish",
      expected_outcome: "Content visible on social platforms",
      metadata: { platform, results, imageUrl: !!imageUrl },
    });

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[publish-to-social]", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
