import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// WhatsApp API configuration
const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";
const VERIFY_TOKEN = "petid_whatsapp_verify_token_2024";

// Default fallback template when reopening conversation outside 24h window
const FALLBACK_TEMPLATE = "petid_followup";

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

// ===== Template Logic (imported from whatsapp-template-check) =====

interface TemplateCheckResult {
  requiresTemplate: boolean;
  templateName?: string;
  variables?: Record<string, string>;
  reason?: string;
}

// Regex to detect template instruction at start of AI response
// Matches: [TEMPLATE: template_name] at the beginning
const TEMPLATE_REGEX = /^\[TEMPLATE:\s*([a-zA-Z0-9_]+)\s*\]/i;

/**
 * Check if the last user message was within 24 hours
 */
function isWithin24Hours(lastInboundAt: string | null): boolean {
  if (!lastInboundAt) return false;
  
  const lastMessage = new Date(lastInboundAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - lastMessage.getTime()) / (1000 * 60 * 60);
  
  return hoursDiff <= 24;
}

/**
 * Get last_inbound_at from whatsapp_conversations table
 */
async function getLastInboundAt(
  supabase: any,
  waId: string
): Promise<string | null> {
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

/**
 * Update or insert last_inbound_at for a wa_id (upsert)
 */
async function updateLastInboundAt(
  supabase: any,
  waId: string
): Promise<void> {
  const { error } = await supabase
    .from("whatsapp_conversations")
    .upsert(
      {
        wa_id: waId,
        last_inbound_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { onConflict: "wa_id" }
    );

  if (error) {
    console.error("Error updating last_inbound_at:", error);
  }
}

/**
 * Determine which template to use based on message context
 */
function determineTemplate(messageType: string): string {
  switch (messageType) {
    case 'welcome':
      return 'petid_welcome';
    case 'followup':
      return 'petid_followup';
    case 'confirmation':
      return 'petid_confirmation';
    case 'update':
      return 'petid_update';
    case 'reminder':
      return 'petid_reminder';
    case 'handoff':
      return 'petid_handoff';
    default:
      return FALLBACK_TEMPLATE;
  }
}

/**
 * Check if a template is required for the outgoing message
 * For AI replies to user messages, we check the 24h window
 */
function checkTemplateRequirement(
  lastUserMessageAt: string | null,
  initiatedBy: 'platform' | 'ai' | 'user_reply' = 'user_reply',
  messageType: string = 'conversation',
  firstName?: string
): TemplateCheckResult {
  // User is replying within 24h - free text allowed
  if (initiatedBy === 'user_reply' && isWithin24Hours(lastUserMessageAt)) {
    return {
      requiresTemplate: false,
      reason: 'User-initiated conversation within 24-hour window'
    };
  }
  
  // Outside 24h window - template required
  if (!isWithin24Hours(lastUserMessageAt)) {
    const templateName = determineTemplate(messageType);
    return {
      requiresTemplate: true,
      templateName,
      variables: {
        first_name: firstName || 'חבר/ה'
      },
      reason: 'More than 24 hours since last user message'
    };
  }
  
  // Platform/AI initiated messages outside window
  if ((initiatedBy === 'platform' || initiatedBy === 'ai') && !isWithin24Hours(lastUserMessageAt)) {
    const templateName = determineTemplate(messageType);
    return {
      requiresTemplate: true,
      templateName,
      variables: {
        first_name: firstName || 'חבר/ה'
      },
      reason: 'Platform initiated message outside 24-hour window'
    };
  }
  
  // Default: within window, free text allowed
  return {
    requiresTemplate: false,
    reason: 'Within active conversation window'
  };
}

// ===== WhatsApp Message Sending Functions =====

interface SendMessageOptions {
  to: string;
  text?: string;
  templateName?: string;
  templateVariables?: Record<string, string>;
  languageCode?: string;
}

interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a text message via WhatsApp Cloud API
 */
async function sendTextMessage(to: string, text: string): Promise<SendMessageResult> {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

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

/**
 * Send a template message via WhatsApp Cloud API
 * Only adds components if there are actual variables
 */
async function sendTemplateMessage(
  to: string,
  templateName: string,
  variables?: Record<string, string>,
  languageCode: string = "he"
): Promise<SendMessageResult> {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

  if (!accessToken || !phoneNumberId) {
    return { success: false, error: "WhatsApp credentials not configured" };
  }

  // Build template payload
  const templatePayload: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode }
    }
  };

  // Only add components if we have actual variables
  // WhatsApp expects parameters in order: {{1}}, {{2}}, etc.
  if (variables && Object.keys(variables).length > 0) {
    const parameters = Object.values(variables).map(value => ({
      type: "text",
      text: String(value)
    }));
    
    templatePayload.template.components = [
      {
        type: "body",
        parameters
      }
    ];
  }
  // If no variables, do NOT include components field at all

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

/**
 * Smart message sender - decides between text and template based on 24h rule
 * Includes fallback logic for failures
 */
async function sendWhatsAppMessage(options: SendMessageOptions): Promise<SendMessageResult> {
  const { to, text, templateName, templateVariables, languageCode } = options;

  // If explicitly requesting template
  if (templateName) {
    const result = await sendTemplateMessage(to, templateName, templateVariables, languageCode);
    
    // Fallback to default template if specific template fails
    if (!result.success && templateName !== FALLBACK_TEMPLATE) {
      console.log(`Template ${templateName} failed, trying fallback template`);
      return await sendTemplateMessage(to, FALLBACK_TEMPLATE, templateVariables, languageCode);
    }
    
    return result;
  }

  // Send as text message
  if (text) {
    return await sendTextMessage(to, text);
  }

  return { success: false, error: "No message content provided" };
}

// getLastUserMessageTime is now replaced by getLastInboundAt above
// This function is kept for backwards compatibility but uses the new table

// ===== Main Webhook Handler =====

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

      // Initialize Supabase client
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Only process text messages
      if (messageType !== "text") {
        await sendWhatsAppMessage({
          to: from,
          text: "מצטער, אני יכול לעבד רק הודעות טקסט כרגע. איך אוכל לעזור לך?"
        });
        return new Response(JSON.stringify({ status: "ok" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const customerMessage = message.text?.body || "";
      console.log(`Customer message: ${customerMessage}`);

      // Update last_inbound_at in whatsapp_conversations table (for 24h window)
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
        
        // Get last_inbound_at from DB for template decision
        const lastInboundAt = await getLastInboundAt(supabase, from);
        const templateCheck = checkTemplateRequirement(lastInboundAt, 'user_reply', 'conversation');
        
        if (templateCheck.requiresTemplate) {
          // Outside 24h - send template
          await sendWhatsAppMessage({
            to: from,
            templateName: templateCheck.templateName || FALLBACK_TEMPLATE,
            templateVariables: templateCheck.variables
          });
        } else {
          // Within 24h - send text
          if (aiResponse.status === 429) {
            await sendWhatsAppMessage({
              to: from,
              text: "המערכת עמוסה כרגע, אנא נסה שוב בעוד כמה דקות."
            });
          } else {
            await sendWhatsAppMessage({
              to: from,
              text: "אירעה שגיאה, אנא נסה שוב מאוחר יותר או פנה לנציג."
            });
          }
        }
        
        return new Response(JSON.stringify({ status: "error" }), {
          status: 200, // Return 200 to WhatsApp so it doesn't retry
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResponse.json();
      let aiReply = aiData.choices?.[0]?.message?.content || "מצטער, לא הצלחתי לעבד את הבקשה.";

      console.log(`AI reply: ${aiReply}`);

      // Check if AI returned a template instruction at the START of response
      // Using strict regex: ^[TEMPLATE: template_name]
      const templateMatch = aiReply.match(TEMPLATE_REGEX);
      
      if (templateMatch) {
        // AI explicitly requested a template - extract template name from capture group
        const templateName = templateMatch[1];
        
        // Remove the [TEMPLATE:...] prefix from the response for logging
        const cleanedReply = aiReply.replace(TEMPLATE_REGEX, '').trim();
        
        console.log(`Template detected: ${templateName}, cleaned reply: ${cleanedReply.substring(0, 50)}...`);
        
        // Send template without variables (template defines its own content)
        const result = await sendWhatsAppMessage({
          to: from,
          templateName
          // No templateVariables - template content is pre-defined in WhatsApp
        });

        // Store the outgoing template message
        await supabase.from("whatsapp_messages").insert({
          phone_number: from,
          message_type: "outgoing",
          message_text: `[TEMPLATE: ${templateName}]`,
        });

        if (!result.success) {
          console.error("Template send failed:", result.error);
        }
      } else {
        // Regular text response - check 24h window from DB
        const lastInboundAt = await getLastInboundAt(supabase, from);
        const templateCheck = checkTemplateRequirement(lastInboundAt, 'user_reply', 'conversation');

        console.log(`24h check - lastInboundAt: ${lastInboundAt}, requiresTemplate: ${templateCheck.requiresTemplate}`);

        let sendResult: SendMessageResult;

        if (templateCheck.requiresTemplate) {
          // Outside 24h window - must send template
          console.log(`Outside 24h window, sending template: ${templateCheck.templateName}`);
          
          sendResult = await sendWhatsAppMessage({
            to: from,
            templateName: templateCheck.templateName || FALLBACK_TEMPLATE,
            templateVariables: templateCheck.variables
          });

          // Store the outgoing template message
          await supabase.from("whatsapp_messages").insert({
            phone_number: from,
            message_type: "outgoing",
            message_text: `[TEMPLATE: ${templateCheck.templateName}] (Original: ${aiReply.substring(0, 100)}...)`,
          });
        } else {
          // Within 24h window - send regular text
          sendResult = await sendTextMessage(from, aiReply);

          if (!sendResult.success) {
            // Text failed - try fallback based on window
            console.log("Text send failed, attempting fallback");
            
            sendResult = await sendWhatsAppMessage({
              to: from,
              templateName: FALLBACK_TEMPLATE,
              templateVariables: { first_name: "חבר/ה" }
            });

            // Store fallback message
            await supabase.from("whatsapp_messages").insert({
              phone_number: from,
              message_type: "outgoing",
              message_text: `[TEMPLATE: ${FALLBACK_TEMPLATE}] (Fallback after text failure)`,
            });
          } else {
            // Store the successful text message
            await supabase.from("whatsapp_messages").insert({
              phone_number: from,
              message_type: "outgoing",
              message_text: aiReply,
            });
          }
        }

        if (!sendResult.success) {
          console.error("All send attempts failed:", sendResult.error);
        }
      }

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
