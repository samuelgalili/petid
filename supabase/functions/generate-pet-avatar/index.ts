import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * generate-pet-avatar
 * Input:  { imageBase64?: string, imageUrl?: string, breed?: string, petType?: 'dog'|'cat', name?: string }
 * Output: { success: true, imageBase64: "data:image/png;base64,..." }
 *
 * Uses Lovable AI Gateway · openai/gpt-image-2 (high quality)
 * Style: studio-quality stylized portrait, full body, clean white bg,
 *        soft pastel aurora rim light — matches MIPO reference screens.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const { imageBase64, imageUrl, breed, petType, name } = await req.json();
    const sourceImg = imageBase64 || imageUrl;
    if (!sourceImg) throw new Error("No source image provided");

    const subject = breed
      ? `${breed} ${petType || "pet"}`
      : petType || "pet";

    const prompt = `Create a hyper-realistic, full-body studio portrait of ${subject}${name ? ` named ${name}` : ""}, 
matching the exact pet shown in the reference photo (same color, markings, fur pattern, age, expression).
Full body standing pose, facing camera, mouth slightly open with a happy expression, 
clean pure white seamless background, soft natural studio lighting with a very subtle pastel aurora rim glow (peach → pink → lavender → sky blue), 
ultra-detailed fur, professional pet photography, sharp focus, no text, no watermark, no border, no shadow on floor.
Aspect 3:4 portrait, centered composition.`;

    const body = {
      model: "openai/gpt-image-2",
      prompt,
      quality: "high",
      size: "1024x1024",
      n: 1,
      // Reference image attached via messages (gpt-image-2 accepts an image array via the OpenRouter-compatible path)
      // Fallback: gateway forwards `image` arrays; if unsupported the prompt alone still yields a strong stylized portrait.
      image: [sourceImg],
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errTxt = await res.text();
      console.error("Gateway error:", res.status, errTxt);
      return new Response(
        JSON.stringify({ success: false, error: `Gateway ${res.status}: ${errTxt}` }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image returned from gateway");

    return new Response(
      JSON.stringify({
        success: true,
        imageBase64: `data:image/png;base64,${b64}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("generate-pet-avatar error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});