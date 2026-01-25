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

interface VerifyOtpRequest {
  phone: string;
  otp: string;
  fullName?: string;
}

// Rate limiting configuration for failed attempts
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

// Format phone number for WhatsApp (remove leading 0, add country code if needed)
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '972' + cleaned.substring(1);
  }
  
  if (!cleaned.startsWith('972') && cleaned.length === 9) {
    cleaned = '972' + cleaned;
  }
  
  return cleaned;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Apply IP-based rate limiting
    const clientIP = getClientIP(req);
    const rateLimit = checkRateLimit(clientIP, "verify_whatsapp_otp", RATE_LIMITS.verifyOtp);
    
    if (!rateLimit.allowed) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return rateLimitExceededResponse(rateLimit, corsHeaders);
    }

    const { phone, otp, fullName }: VerifyOtpRequest = await req.json();
    
    if (!phone || !otp) {
      return new Response(
        JSON.stringify({ error: "Phone and OTP are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate OTP format (must be 6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return new Response(
        JSON.stringify({ error: "OTP must be 6 digits" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedPhone = formatPhoneNumber(phone);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check for lockout in database (persistent across function restarts)
    const lockoutThreshold = new Date(Date.now() - LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString();
    const { data: recentAttempts, error: attemptsError } = await supabase
      .from("whatsapp_otps")
      .select("id, failed_attempts, last_failed_at")
      .eq("phone", formattedPhone)
      .gte("created_at", lockoutThreshold)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!attemptsError && recentAttempts && recentAttempts.length > 0) {
      const latestOtp = recentAttempts[0];
      if (latestOtp.failed_attempts >= MAX_ATTEMPTS) {
        const lockoutEnd = new Date(new Date(latestOtp.last_failed_at).getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
        if (new Date() < lockoutEnd) {
          const remainingMinutes = Math.ceil((lockoutEnd.getTime() - Date.now()) / 60000);
          return new Response(
            JSON.stringify({ 
              error: `Too many failed attempts. Please try again in ${remainingMinutes} minutes.`,
              locked: true,
              remainingMinutes 
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Find valid OTP
    const { data: otpRecord, error: fetchError } = await supabase
      .from("whatsapp_otps")
      .select("*")
      .eq("phone", formattedPhone)
      .eq("otp_code", otp)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (fetchError || !otpRecord) {
      console.log("OTP verification failed for phone:", formattedPhone);
      
      // Increment failed attempts counter
      const { data: latestOtpRecord } = await supabase
        .from("whatsapp_otps")
        .select("id, failed_attempts")
        .eq("phone", formattedPhone)
        .eq("used", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latestOtpRecord) {
        await supabase
          .from("whatsapp_otps")
          .update({ 
            failed_attempts: (latestOtpRecord.failed_attempts || 0) + 1,
            last_failed_at: new Date().toISOString()
          })
          .eq("id", latestOtpRecord.id);
      }

      return new Response(
        JSON.stringify({ error: "Invalid or expired OTP" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as used and reset failed attempts
    await supabase
      .from("whatsapp_otps")
      .update({ used: true, failed_attempts: 0 })
      .eq("id", otpRecord.id);

    // Check if user exists with this phone
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.phone === formattedPhone);

    const email = `${formattedPhone}@phone.petid.app`;

    if (existingUser) {
      // User exists - check their auth method to decide how to authenticate
      const userMetadata = existingUser.user_metadata || {};
      const authMethod = userMetadata.auth_method;
      
      // If user signed up via WhatsApp (has no email/password set), use temp password approach
      // Otherwise, use magic link to preserve their existing password
      if (authMethod === 'whatsapp' || existingUser.email?.endsWith('@phone.petid.app')) {
        // WhatsApp-only user - safe to use temp password
        const tempPassword = crypto.randomUUID();
        
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          { password: tempPassword }
        );

        if (updateError) {
          console.error("Error updating user password:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to authenticate user" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Sign in with the temp password to get a session
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: existingUser.email || email,
          password: tempPassword,
        });

        if (signInError || !signInData.session) {
          console.error("Error signing in user:", signInError);
          return new Response(
            JSON.stringify({ error: "Failed to create session" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            isNewUser: false,
            userId: existingUser.id,
            session: {
              access_token: signInData.session.access_token,
              refresh_token: signInData.session.refresh_token,
              expires_in: signInData.session.expires_in,
              expires_at: signInData.session.expires_at,
            },
            message: "User authenticated successfully"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // User has email/password set - use magic link to preserve their password
        try {
          const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: existingUser.email!,
          });

          if (linkError || !linkData) {
            console.error("Error generating magic link:", linkError);
            // Fallback: Return success without session, user will need to sign in manually
            return new Response(
              JSON.stringify({ 
                success: true,
                isNewUser: false,
                userId: existingUser.id,
                needsManualSignIn: true,
                message: "OTP verified. Please sign in with your email credentials."
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // The magic link contains session tokens
          const actionLink = linkData.properties?.action_link;
          if (actionLink) {
            const url = new URL(actionLink);
            // Extract the token from the magic link
            const token = url.hash?.replace('#access_token=', '').split('&')[0] ||
                          url.searchParams.get('access_token');
            
            if (token) {
              // Verify the token to get the session
              const { data: sessionData, error: sessionError } = await supabase.auth.getUser(token);
              
              if (!sessionError && sessionData.user) {
                return new Response(
                  JSON.stringify({ 
                    success: true,
                    isNewUser: false,
                    userId: existingUser.id,
                    magicLink: actionLink,
                    message: "User verified. Use the magic link to complete sign in."
                  }),
                  { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }
            }
          }

          // Fallback: Return success with magic link
          return new Response(
            JSON.stringify({ 
              success: true,
              isNewUser: false,
              userId: existingUser.id,
              needsManualSignIn: true,
              message: "OTP verified. Please check your email to complete sign in."
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (error) {
          console.error("Error with magic link approach:", error);
          // Final fallback
          return new Response(
            JSON.stringify({ 
              success: true,
              isNewUser: false,
              userId: existingUser.id,
              needsManualSignIn: true,
              message: "OTP verified. Please sign in with your email credentials."
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } else {
      // New user - create account with WhatsApp auth method marker
      const tempPassword = crypto.randomUUID();

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        phone: formattedPhone,
        password: tempPassword,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          full_name: fullName || '',
          phone: formattedPhone,
          auth_method: 'whatsapp' // Mark as WhatsApp-only user
        }
      });

      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Sign in the new user to get a session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: tempPassword,
      });

      if (signInError || !signInData.session) {
        console.error("Error signing in new user:", signInError);
        // User was created, but session failed - still return success for user creation
        return new Response(
          JSON.stringify({ 
            success: true,
            isNewUser: true,
            userId: newUser.user?.id,
            message: "User created successfully, please sign in"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          isNewUser: true,
          userId: newUser.user?.id,
          session: {
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
            expires_in: signInData.session.expires_in,
            expires_at: signInData.session.expires_at,
          },
          message: "User created and authenticated successfully"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Error in verify-whatsapp-otp:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
