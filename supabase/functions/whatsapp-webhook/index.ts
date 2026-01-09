import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// WhatsApp API configuration
const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";
const VERIFY_TOKEN = "petid_verify_2026";

// Default fallback template when reopening conversation outside 24h window
const FALLBACK_TEMPLATE = "petid_followup";

// ===== Logging Helper =====

async function logMessageEvent(
  supabase: any,
  data: {
    provider?: string;
    direction: "inbound" | "outbound";
    sender?: string;
    recipient?: string;
    message_text?: string;
    message_id?: string;
    status: string;
    error?: string;
    latency_ms?: number;
    metadata?: Record<string, any>;
  }
) {
  try {
    await supabase.from("message_events").insert({
      provider: data.provider || "whatsapp",
      direction: data.direction,
      sender: data.sender,
      recipient: data.recipient,
      message_text: data.message_text?.substring(0, 1000), // Limit text length
      message_id: data.message_id,
      status: data.status,
      error: data.error,
      latency_ms: data.latency_ms,
      metadata: data.metadata,
    });
  } catch (e) {
    console.error("Failed to log message event:", e);
  }
}

// ===== Template Logic =====

interface TemplateCheckResult {
  requiresTemplate: boolean;
  templateName?: string;
  variables?: Record<string, string>;
  reason?: string;
}

function isWithin24Hours(lastInboundAt: string | null): boolean {
  if (!lastInboundAt) return false;
  const lastMessage = new Date(lastInboundAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - lastMessage.getTime()) / (1000 * 60 * 60);
  return hoursDiff <= 24;
}

async function getLastInboundAt(supabase: any, waId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .select("last_inbound_at")
    .eq("wa_id", waId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching last_inbound_at:", error);
    return null;
  }
  return data?.last_inbound_at || null;
}

async function updateLastInboundAt(supabase: any, waId: string): Promise<void> {
  const { error } = await supabase
    .from("whatsapp_conversations")
    .upsert(
      {
        wa_id: waId,
        last_inbound_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "wa_id" }
    );

  if (error) {
    console.error("Error updating last_inbound_at:", error);
  }
}

function determineTemplate(messageType: string): string {
  switch (messageType) {
    case "welcome":
      return "petid_welcome";
    case "followup":
      return "petid_followup";
    case "confirmation":
      return "petid_confirmation";
    case "update":
      return "petid_update";
    case "reminder":
      return "petid_reminder";
    case "handoff":
      return "petid_handoff";
    default:
      return FALLBACK_TEMPLATE;
  }
}

function checkTemplateRequirement(
  lastUserMessageAt: string | null,
  initiatedBy: "platform" | "ai" | "user_reply" = "user_reply",
  messageType: string = "conversation",
  firstName?: string
): TemplateCheckResult {
  const within24h = isWithin24Hours(lastUserMessageAt);

  if (initiatedBy === "user_reply" && within24h) {
    return {
      requiresTemplate: false,
      reason: "User-initiated conversation within 24-hour window",
    };
  }

  if (!within24h) {
    const templateName = determineTemplate(messageType);
    const safeFirstName = firstName?.trim() ? firstName.trim() : "חבר";

    return {
      requiresTemplate: true,
      templateName,
      variables: { "1": safeFirstName },
      reason:
        initiatedBy === "platform"
          ? "Platform initiated message outside 24-hour window"
          : initiatedBy === "ai"
            ? "AI initiated message outside 24-hour window"
            : "More than 24 hours since last user message",
    };
  }

  return {
    requiresTemplate: false,
    reason: "Within active conversation window",
  };
}

// ===== WhatsApp Message Sending Functions =====

interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

async function sendTextMessage(to: string, text: string): Promise<SendMessageResult> {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")?.trim();
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")?.trim();

  if (!accessToken || !phoneNumberId) {
    return { success: false, error: "WhatsApp credentials not configured" };
  }

  try {
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
      console.error("WhatsApp text message error:", response.status, errorData);
      return { success: false, error: errorData };
    }

    const data = await response.json();
    console.log("WhatsApp text message sent:", data);
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error("WhatsApp text send error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function sendTemplateMessage(
  to: string,
  templateName: string,
  variables?: Record<string, string>,
  languageCode: string = "he"
): Promise<SendMessageResult> {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")?.trim();
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")?.trim();

  if (!accessToken || !phoneNumberId) {
    return { success: false, error: "WhatsApp credentials not configured" };
  }

  const templatePayload: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  };

  const hasVars = variables && Object.keys(variables).length > 0;

  if (hasVars) {
    const keys = Object.keys(variables!);
    const allNumeric = keys.every((k) => /^\d+$/.test(k));
    const orderedKeys = allNumeric ? keys.sort((a, b) => Number(a) - Number(b)) : keys.sort();

    if (templateName === "petid_followup") {
      const k = allNumeric ? "1" : keys.includes("first_name") ? "first_name" : orderedKeys[0];
      const v = variables![k];
      variables![k] = v && String(v).trim().length > 0 ? v : "חבר";
    }

    const parameters = orderedKeys.map((k) => ({
      type: "text",
      text: String(variables![k] ?? ""),
    }));

    templatePayload.template.components = [{ type: "body", parameters }];
  }

  try {
    const response = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(templatePayload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("WhatsApp template message error:", response.status, errorData);
      return { success: false, error: errorData };
    }

    const data = await response.json();
    console.log("WhatsApp template message sent:", data);
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error("WhatsApp template send error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function sendWhatsAppMessage(options: {
  to: string;
  text?: string;
  templateName?: string;
  templateVariables?: Record<string, string>;
  languageCode?: string;
}): Promise<SendMessageResult> {
  const { to, text, templateName, templateVariables, languageCode } = options;

  if (templateName) {
    const result = await sendTemplateMessage(to, templateName, templateVariables, languageCode);
    if (!result.success && templateName !== FALLBACK_TEMPLATE) {
      console.log(`Template ${templateName} failed, trying fallback template`);
      return await sendTemplateMessage(to, FALLBACK_TEMPLATE, templateVariables, languageCode);
    }
    return result;
  }

  if (text) {
    return await sendTextMessage(to, text);
  }

  return { success: false, error: "No message content provided" };
}

// ===== Call Chat Edge Function =====

// Sanitize text for WhatsApp - remove product tokens and clean up
function sanitizeForWhatsApp(text: string): string {
  return text
    .replace(/\[PRODUCTS:[^\]]+\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function callChatFunction(
  supabaseUrl: string,
  messages: Array<{ role: string; content: string }>
): Promise<{ success: boolean; reply?: string; error?: string; latency_ms: number }> {
  const startTime = Date.now();
  
  try {
    const chatUrl = `${supabaseUrl}/functions/v1/chat`;
    console.log(`Calling chat function at: ${chatUrl}`);
    
    const response = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({ messages, channel: "whatsapp" }),
    });

    const latency_ms = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Chat function error:", response.status, errorText);
      return {
        success: false,
        error: `Chat function returned ${response.status}: ${errorText}`,
        latency_ms,
      };
    }

    // Handle streaming response - collect all chunks
    const reader = response.body?.getReader();
    if (!reader) {
      return { success: false, error: "No response body", latency_ms };
    }

    const decoder = new TextDecoder();
    let fullContent = "";
    let textBuffer = "";

    let rawData = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      rawData += chunk;
      textBuffer += chunk;

      // Process SSE lines
      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) fullContent += content;
        } catch {
          // Incomplete JSON, put it back
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
    
    // Log first 500 chars of raw data for debugging
    console.log("Raw SSE data (first 500 chars):", rawData.substring(0, 500));

    const totalLatency = Date.now() - startTime;
    console.log(`Chat function completed in ${totalLatency}ms, reply length: ${fullContent.length}`);

    // Sanitize reply for WhatsApp before returning
    const sanitizedReply = sanitizeForWhatsApp(fullContent) || "מצטער, לא הצלחתי לעבד את הבקשה.";
    
    return {
      success: true,
      reply: sanitizedReply,
      latency_ms: totalLatency,
    };
  } catch (error) {
    const latency_ms = Date.now() - startTime;
    console.error("Chat function call error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      latency_ms,
    };
  }
}

// ===== Main Webhook Handler =====

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

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
        console.log("No messages in webhook, possibly a status update");
        return new Response(JSON.stringify({ status: "ok" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const message = messages[0];
      const from = message.from;
      const messageType = message.type;
      const messageId = message.id;
      const timestamp = message.timestamp;

      console.log(`Message from ${from}, type: ${messageType}, id: ${messageId}`);

      // Log inbound event immediately (even before validation)
      await logMessageEvent(supabase, {
        direction: "inbound",
        sender: from,
        message_text: message.text?.body || `[${messageType}]`,
        message_id: messageId,
        status: "received",
        metadata: { messageType, timestamp, raw: body },
      });

      // Only process text messages
      if (messageType !== "text") {
        const nonTextReply = "מצטער, אני יכול לעבד רק הודעות טקסט כרגע. איך אוכל לעזור לך?";
        const result = await sendWhatsAppMessage({ to: from, text: nonTextReply });
        
        await logMessageEvent(supabase, {
          direction: "outbound",
          recipient: from,
          message_text: nonTextReply,
          status: result.success ? "sent" : "failed",
          error: result.error,
        });

        return new Response(JSON.stringify({ status: "ok" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const customerMessage = message.text?.body || "";
      console.log(`Customer message: ${customerMessage}`);

      // Update last_inbound_at for 24h window
      await updateLastInboundAt(supabase, from);

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

      // Build messages array for chat function
      const chatMessages = (history || []).map((msg) => ({
        role: msg.message_type === "incoming" ? "user" : "assistant",
        content: msg.message_text,
      }));

      // Call the chat edge function
      const chatResult = await callChatFunction(supabaseUrl, chatMessages);

      // Log the chat function call
      await logMessageEvent(supabase, {
        direction: "inbound",
        sender: from,
        message_text: customerMessage,
        status: chatResult.success ? "chat_success" : "chat_failed",
        error: chatResult.error,
        latency_ms: chatResult.latency_ms,
        metadata: { step: "chat_function_call" },
      });

      if (!chatResult.success) {
        console.error("Chat function failed:", chatResult.error);
        
        const lastInboundAt = await getLastInboundAt(supabase, from);
        const templateCheck = checkTemplateRequirement(lastInboundAt, "user_reply", "conversation");

        let fallbackResult: SendMessageResult;
        if (templateCheck.requiresTemplate) {
          fallbackResult = await sendWhatsAppMessage({
            to: from,
            templateName: templateCheck.templateName || FALLBACK_TEMPLATE,
            templateVariables: templateCheck.variables,
          });
        } else {
          fallbackResult = await sendWhatsAppMessage({
            to: from,
            text: "אירעה שגיאה, אנא נסה שוב מאוחר יותר או פנה לנציג.",
          });
        }

        await logMessageEvent(supabase, {
          direction: "outbound",
          recipient: from,
          message_text: "[error_fallback]",
          status: fallbackResult.success ? "sent" : "failed",
          error: fallbackResult.error,
        });

        return new Response(JSON.stringify({ status: "error" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiReply = chatResult.reply!;
      console.log(`AI reply: ${aiReply.substring(0, 100)}...`);

      // Check 24h window for template requirement
      const lastInboundAt = await getLastInboundAt(supabase, from);
      const templateCheck = checkTemplateRequirement(lastInboundAt, "user_reply", "conversation");

      console.log(`24h check - lastInboundAt: ${lastInboundAt}, requiresTemplate: ${templateCheck.requiresTemplate}`);

      const FALLBACK_FIRST_NAME = "חבר";
      const getFirstNameVar = () => ({ "1": FALLBACK_FIRST_NAME });

      let sendResult: SendMessageResult;

      if (templateCheck.requiresTemplate) {
        const chosenTemplate = templateCheck.templateName || FALLBACK_TEMPLATE;
        const templateVariables =
          chosenTemplate === "petid_followup"
            ? templateCheck.variables?.["1"]
              ? templateCheck.variables
              : getFirstNameVar()
            : templateCheck.variables;

        console.log(`Outside 24h window, sending template: ${chosenTemplate}`);

        sendResult = await sendWhatsAppMessage({
          to: from,
          templateName: chosenTemplate,
          templateVariables,
        });

        await supabase.from("whatsapp_messages").insert({
          phone_number: from,
          message_type: "outgoing",
          message_text: `[TEMPLATE: ${chosenTemplate}] (Original: ${aiReply.substring(0, 100)}...)`,
        });
      } else {
        sendResult = await sendTextMessage(from, aiReply);

        if (!sendResult.success) {
          console.log("Text send failed, attempting fallback template");
          sendResult = await sendWhatsAppMessage({
            to: from,
            templateName: FALLBACK_TEMPLATE,
            templateVariables: getFirstNameVar(),
          });

          await supabase.from("whatsapp_messages").insert({
            phone_number: from,
            message_type: "outgoing",
            message_text: `[TEMPLATE: ${FALLBACK_TEMPLATE}] (Fallback after text failure)`,
          });
        } else {
          await supabase.from("whatsapp_messages").insert({
            phone_number: from,
            message_type: "outgoing",
            message_text: aiReply,
          });
        }
      }

      // Log outbound event
      await logMessageEvent(supabase, {
        direction: "outbound",
        recipient: from,
        message_text: aiReply.substring(0, 500),
        message_id: sendResult.messageId,
        status: sendResult.success ? "sent" : "failed",
        error: sendResult.error,
        latency_ms: chatResult.latency_ms,
        metadata: {
          templateUsed: templateCheck.requiresTemplate ? templateCheck.templateName : null,
        },
      });

      if (!sendResult.success) {
        console.error("Message send failed:", sendResult.error);
      }

      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error("Webhook error:", error);

    await logMessageEvent(supabase, {
      direction: "inbound",
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      metadata: { step: "webhook_handler" },
    });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
