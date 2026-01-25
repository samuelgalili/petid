import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  checkRateLimit, 
  getClientIP, 
  rateLimitExceededResponse,
  RATE_LIMITS 
} from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate 6-digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Format phone number for WhatsApp (remove leading 0, add country code if needed)
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, assume Israeli number and replace with 972
  if (cleaned.startsWith('0')) {
    cleaned = '972' + cleaned.substring(1);
  }
  
  // If doesn't start with country code, assume Israeli
  if (!cleaned.startsWith('972') && cleaned.length === 9) {
    cleaned = '972' + cleaned;
  }
  
  return cleaned;
}

interface SendOtpRequest {
  phone: string;
  type: 'signup' | 'login' | 'reset';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Apply IP-based rate limiting
    const clientIP = getClientIP(req);
    const rateLimit = checkRateLimit(clientIP, "send_whatsapp_otp", RATE_LIMITS.sendOtp);
    
    if (!rateLimit.allowed) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return rateLimitExceededResponse(rateLimit, corsHeaders);
    }

    const { phone, type }: SendOtpRequest = await req.json();
    
    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedPhone = formatPhoneNumber(phone);
    
    // Validate phone format (should be valid Israeli number)
    if (!/^972[0-9]{9}$/.test(formattedPhone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Store OTP in database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Delete any existing OTPs for this phone
    await supabase
      .from("whatsapp_otps")
      .delete()
      .eq("phone", formattedPhone);

    // Insert new OTP
    const { error: insertError } = await supabase
      .from("whatsapp_otps")
      .insert({
        phone: formattedPhone,
        otp_code: otp,
        type,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to generate OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send WhatsApp message via Meta Cloud API
    const whatsappToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")?.trim();
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")?.trim();

    console.log("Using Phone Number ID:", phoneNumberId);
    console.log("Token length:", whatsappToken?.length);

    if (!whatsappToken || !phoneNumberId) {
      console.error("WhatsApp credentials not configured");
      return new Response(
        JSON.stringify({ error: "WhatsApp not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messageText = `🔐 קוד האימות שלך ל-PetID הוא: *${otp}*\n\nהקוד תקף ל-10 דקות.\nאל תשתף קוד זה עם אף אחד.`;

    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text",
          text: {
            preview_url: false,
            body: messageText,
          },
        }),
      }
    );

    const whatsappResult = await whatsappResponse.json();
    console.log("WhatsApp API response:", whatsappResult);

    if (!whatsappResponse.ok) {
      console.error("WhatsApp API error:", whatsappResult);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send WhatsApp message",
          details: whatsappResult.error?.message || "Unknown error"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "OTP sent via WhatsApp",
        messageId: whatsappResult.messages?.[0]?.id
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        } 
      }
    );

  } catch (error) {
    console.error("Error in send-whatsapp-otp:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
