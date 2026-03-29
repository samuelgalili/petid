import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { chatCompletion } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { audit } = await req.json();

    const discrepancyLines = (audit.discrepancies || [])
      .map((d: any) => `- ${d.itemName || d.field}: הצעת מחיר ₪${d.quoteValue} → חשבונית ₪${d.invoiceValue} (הפרש: ₪${d.delta})`)
      .join("\n");

    const result = await chatCompletion({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are Sarah, PetID's professional support bot. Write a polite, professional email in Hebrew to a supplier about invoice discrepancies found during audit. The tone should be friendly but firm. Include the specific data points. Sign as "שרה — צוות PetID".`
        },
        {
          role: "user",
          content: `כתבי מייל מקצועי לספק בנושא הפערים הבאים שנמצאו בהזמנה #${audit.order_id}:\n\n${discrepancyLines}\n\nסה"כ הפרש: ₪${audit.total_delta}`
        }
      ],
    });

    const draft = result.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ draft }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-vendor-email error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
