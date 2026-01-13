import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

interface GenerateApiKeyRequest {
  name: string;
  permissions: string[];
}

Deno.serve(async (req: Request): Promise<Response> => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Verify user with anon client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use service role for admin check and insert
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify admin role
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse request body
    const { name, permissions }: GenerateApiKeyRequest = await req.json();

    if (!name || name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Name is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate cryptographically secure API key
    const keyPart1 = crypto.randomUUID();
    const keyPart2 = crypto.randomUUID();
    const fullKey = `pk_${keyPart1.replace(/-/g, "")}${keyPart2.replace(/-/g, "")}`;
    const keyPrefix = fullKey.substring(0, 12);

    // Hash the key with SHA-256 for secure storage
    const encoder = new TextEncoder();
    const keyData = encoder.encode(fullKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", keyData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Store the hashed key in database
    const { error: insertError } = await supabaseAdmin
      .from("api_keys")
      .insert({
        name: name.trim(),
        key_prefix: keyPrefix,
        key_hash: keyHash,
        permissions: permissions || [],
        is_active: true,
        created_by: user.id
      });

    if (insertError) {
      console.error("Failed to store API key:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create API key" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`API key created by admin ${user.id}: ${keyPrefix}...`);

    // Return the full key ONLY ONCE - it cannot be retrieved again
    return new Response(
      JSON.stringify({
        success: true,
        key: fullKey,
        prefix: keyPrefix,
        message: "Save this key securely - it will not be shown again!"
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in generate-api-key:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
