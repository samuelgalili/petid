import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

/**
 * Auth Guard Edge Function
 * Server-side rate limiting for login attempts.
 * Called BEFORE actual auth to check if IP is allowed.
 */
Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    const { action, ip_address } = await req.json();

    if (!ip_address) {
      return new Response(
        JSON.stringify({ error: 'ip_address required' }),
        { status: 400, headers }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (action === 'check') {
      // Check if login attempt is allowed
      const { data, error } = await supabase.rpc('check_login_rate_limit', {
        p_ip_address: ip_address,
        p_max_attempts: 5,
        p_window_minutes: 15,
        p_block_duration_minutes: 60,
      });

      if (error) {
        console.error('[AuthGuard] RPC error:', error);
        // Fail open — don't block legitimate users on DB errors
        return new Response(
          JSON.stringify({ allowed: true }),
          { headers }
        );
      }

      const result = data as { allowed: boolean; reason?: string; retry_after?: number; attempts_remaining?: number };

      if (!result.allowed) {
        console.warn(`[AuthGuard] BLOCKED IP ${ip_address}: ${result.reason}`);

        // Log to audit
        await supabase.from('admin_audit_log').insert({
          admin_id: '00000000-0000-0000-0000-000000000000',
          action_type: 'security_block',
          entity_type: 'auth',
          entity_id: ip_address,
          metadata: {
            reason: result.reason,
            retry_after: result.retry_after,
            ip: ip_address,
            timestamp: new Date().toISOString(),
          },
        });

        return new Response(
          JSON.stringify({
            allowed: false,
            reason: result.reason,
            retry_after: result.retry_after,
            message: 'יותר מדי ניסיונות. נסה שוב מאוחר יותר.',
          }),
          { status: 429, headers }
        );
      }

      return new Response(
        JSON.stringify({ allowed: true, attempts_remaining: result.attempts_remaining }),
        { headers }
      );
    }

    if (action === 'reset') {
      // Reset rate limit on successful login
      await supabase
        .from('auth_rate_limits')
        .delete()
        .eq('ip_address', ip_address);

      return new Response(
        JSON.stringify({ success: true }),
        { headers }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "check" or "reset".' }),
      { status: 400, headers }
    );

  } catch (error) {
    console.error('[AuthGuard] Error:', error);
    // Fail open
    return new Response(
      JSON.stringify({ allowed: true }),
      { headers }
    );
  }
});
