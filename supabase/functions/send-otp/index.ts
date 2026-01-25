import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  checkRateLimit, 
  getClientIP, 
  rateLimitExceededResponse,
  RATE_LIMITS 
} from "../_shared/rate-limit.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOtpRequest {
  email: string;
  type: "password_reset" | "email_verification";
}

// Generate a random 6-digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Apply IP-based rate limiting
    const clientIP = getClientIP(req);
    const rateLimit = checkRateLimit(clientIP, "send_otp", RATE_LIMITS.sendOtp);
    
    if (!rateLimit.allowed) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return rateLimitExceededResponse(rateLimit, corsHeaders);
    }

    const { email, type }: SendOtpRequest = await req.json();
    
    console.log(`Sending OTP to ${email} for ${type}`);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      console.error("Invalid email format:", email);
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error("Error fetching users:", userError);
      return new Response(
        JSON.stringify({ error: "Failed to verify user" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userExists = userData.users.some(user => user.email === email);
    if (!userExists) {
      console.log("User not found:", email);
      // Return success anyway to prevent email enumeration
      return new Response(
        JSON.stringify({ success: true, message: "If the email exists, an OTP has been sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate OTP
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Store OTP in database
    const { error: insertError } = await supabase
      .from("password_reset_otps")
      .upsert({
        email,
        otp,
        expires_at: expiresAt.toISOString(),
        used: false,
      }, { onConflict: "email" });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to generate OTP" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email with OTP
    const emailResponse = await resend.emails.send({
      from: "PetID <onboarding@resend.dev>",
      to: [email],
      subject: "קוד אימות לאיפוס סיסמה - PetID",
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #ffffff; font-size: 28px; margin: 0;">🐾 PetID</h1>
          </div>
          
          <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 30px; text-align: center;">
            <h2 style="color: #ffffff; font-size: 22px; margin-bottom: 20px;">קוד האימות שלך</h2>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 20px; margin: 20px 0;">
              <p style="color: #ffffff; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 0;">${otp}</p>
            </div>
            
            <p style="color: #b0b0b0; font-size: 14px; margin-top: 20px;">
              הקוד תקף ל-10 דקות בלבד
            </p>
            
            <p style="color: #888888; font-size: 12px; margin-top: 30px;">
              אם לא ביקשת לאפס את הסיסמה, התעלם מהודעה זו
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <p style="color: #666666; font-size: 11px;">© 2024 PetID. כל הזכויות שמורות.</p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "OTP sent successfully" }),
      { 
        status: 200, 
        headers: { 
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          ...corsHeaders 
        } 
      }
    );
  } catch (error: any) {
    console.error("Error in send-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
