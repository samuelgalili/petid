import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const type = formData.get("type") as string || "profile"; // profile or pet
    const petId = formData.get("petId") as string | null;

    if (!file) {
      throw new Error("No file provided");
    }

    // Generate file path
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = type === "pet" && petId 
      ? `pet-${petId}-${Date.now()}.${fileExt}`
      : `avatar-${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload using service role (bypasses RLS)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("pet-avatars")
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("pet-avatars")
      .getPublicUrl(filePath);

    const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

    // Update the appropriate table
    if (type === "pet" && petId) {
      const { error: updateError } = await supabase
        .from("pets")
        .update({ avatar_url: cacheBustedUrl })
        .eq("id", petId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;
    } else {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: cacheBustedUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, url: cacheBustedUrl }),
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
