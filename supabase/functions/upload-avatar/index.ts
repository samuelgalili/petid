import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string || "profile";
    const petId = formData.get("petId") as string | null;

    if (!file) {
      throw new Error("No file provided");
    }

    // Check file size (max 500KB for base64 storage)
    if (file.size > 500 * 1024) {
      throw new Error("File too large. Maximum 500KB allowed.");
    }

    // Convert file to base64 data URL
    const arrayBuffer = await file.arrayBuffer();
    const base64String = arrayBufferToBase64(arrayBuffer);
    const mimeType = file.type || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64String}`;

    console.log(`Uploading ${type} image for user ${user.id}, size: ${file.size} bytes`);

    // Update the appropriate table with the data URL
    if (type === "pet" && petId) {
      const { error: updateError } = await supabase
        .from("pets")
        .update({ avatar_url: dataUrl })
        .eq("id", petId)
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }
    } else {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: dataUrl })
        .eq("id", user.id);

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }
    }

    console.log("Successfully saved image as data URL");

    return new Response(
      JSON.stringify({ success: true, url: dataUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
