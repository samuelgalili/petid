import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: authError } = await supabaseClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { supplier_id } = await req.json();
    if (!supplier_id) {
      return new Response(JSON.stringify({ error: "supplier_id required" }), { status: 400, headers: corsHeaders });
    }

    // Verify ownership or admin
    const userId = claims.claims.sub;
    const { data: supplier } = await supabaseAdmin
      .from("suppliers")
      .select("id, user_id")
      .eq("id", supplier_id)
      .single();

    if (!supplier) {
      return new Response(JSON.stringify({ error: "Supplier not found" }), { status: 404, headers: corsHeaders });
    }

    // Check admin or owner
    if (supplier.user_id !== userId) {
      const { data: adminRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (!adminRole) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
      }
    }

    // Generate API key
    const rawKey = crypto.randomUUID() + "-" + crypto.randomUUID();
    const prefix = rawKey.substring(0, 8);
    
    // Hash the key
    const encoder = new TextEncoder();
    const data = encoder.encode(rawKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Store hash
    await supabaseAdmin
      .from("suppliers")
      .update({ api_key_hash: hashHex, api_key_prefix: prefix, api_enabled: true })
      .eq("id", supplier_id);

    return new Response(JSON.stringify({ api_key: rawKey, prefix }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
