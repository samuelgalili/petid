import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Test Edge Function - CC Push Verification
 *
 * Created to verify that edge function deployment from GitHub works correctly.
 * This function can be safely deleted after verification.
 *
 * Created: 2026-01-31
 */

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Test CC Push - Edge function deployment verified!',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }),
    { status: 200, headers: corsHeaders }
  );
});
