import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// WhatsApp API configuration
const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";
const VERIFY_TOKEN = "petid_whatsapp_verify_token_2024";

// System prompt for AI customer service
const SYSTEM_PROMPT = `אתה נציג שירות לקוחות AI של PetID - אפליקציית ניהול חיות מחמד.

כללי התנהגות:
- ענה בעברית בצורה ידידותית ומקצועית
- תן מענה קצר וממוקד
- אם לא יודע - הפנה לנציג אנושי
- שאל שאלות הבהרה לפני שאתה נותן המלצות

תחומי מומחיות:
- מידע על המוצרים בחנות
- שעות פעילות ומיקום
- מעקב הזמנות
- שאלות על חיות מחמד
- תמיכה טכנית באפליקציה

אם זו שאלה רפואית דחופה - הפנה לוטרינר.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  try {
    // WhatsApp webhook verification (GET request)
    if (req.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      console.log("Webhook verification request:", { mode, token, challenge });

      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("Webhook verified successfully");
        return new Response(challenge, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }

      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    // Handle incoming WhatsApp messages (POST request)
    if (req.method === "POST") {
      const body = await req.json();
      console.log("Received WhatsApp webhook:", JSON.stringify(body, null, 2));

      // Extract message data
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (!messages || messages.length === 0) {
        // This might be a status update, not a message
        console.log("No messages in webhook, possibly a status update");
        return new Response(JSON.stringify({ status: "ok" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const message = messages[0];
      const from = message.from; // Customer phone number
      const messageType = message.type;
      const messageId = message.id;

      console.log(`Message from ${from}, type: ${messageType}, id: ${messageId}`);

      // Only process text messages
      if (messageType !== "text") {
        await sendWhatsAppMessage(from, "מצטער, אני יכול לעבד רק הודעות טקסט כרגע. איך אוכל לעזור לך?");
        return new Response(JSON.stringify({ status: "ok" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const customerMessage = message.text?.body || "";
      console.log(`Customer message: ${customerMessage}`);

      // Initialize Supabase client
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Store the incoming message
      await supabase.from("whatsapp_messages").insert({
        phone_number: from,
        message_type: "incoming",
        message_text: customerMessage,
        whatsapp_message_id: messageId,
      });

      // Get conversation history for context
      const { data: history } = await supabase
        .from("whatsapp_messages")
        .select("message_type, message_text")
        .eq("phone_number", from)
        .order("created_at", { ascending: true })
        .limit(10);

      // Build messages array for AI
      const aiMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...(history || []).map((msg) => ({
          role: msg.message_type === "incoming" ? "user" : "assistant",
          content: msg.message_text,
        })),
      ];

      // Call Lovable AI for response
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: aiMessages,
          max_tokens: 500,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI API error:", aiResponse.status, errorText);
        
        if (aiResponse.status === 429) {
          await sendWhatsAppMessage(from, "המערכת עמוסה כרגע, אנא נסה שוב בעוד כמה דקות.");
        } else {
          await sendWhatsAppMessage(from, "אירעה שגיאה, אנא נסה שוב מאוחר יותר או פנה לנציג.");
        }
        
        return new Response(JSON.stringify({ status: "error" }), {
          status: 200, // Return 200 to WhatsApp so it doesn't retry
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResponse.json();
      const aiReply = aiData.choices?.[0]?.message?.content || "מצטער, לא הצלחתי לעבד את הבקשה.";

      console.log(`AI reply: ${aiReply}`);

      // Send AI response to WhatsApp
      await sendWhatsAppMessage(from, aiReply);

      // Store the outgoing message
      await supabase.from("whatsapp_messages").insert({
        phone_number: from,
        message_type: "outgoing",
        message_text: aiReply,
      });

      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 200, // Return 200 to prevent WhatsApp retries
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Function to send WhatsApp message
async function sendWhatsAppMessage(to: string, text: string) {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

  if (!accessToken || !phoneNumberId) {
    throw new Error("WhatsApp credentials not configured");
  }

  const response = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("WhatsApp API error:", response.status, errorData);
    throw new Error(`Failed to send WhatsApp message: ${errorData}`);
  }

  const data = await response.json();
  console.log("WhatsApp message sent:", data);
  return data;
}
