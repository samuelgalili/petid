// Shared CORS configuration for Edge Functions
// Restricts origins based on environment

const ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:5173",
  "https://lovable.dev",
];

// Get the Supabase URL to allow it as an origin
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
if (SUPABASE_URL) {
  ALLOWED_ORIGINS.push(SUPABASE_URL);
}

// Add the app's production URL if configured
const APP_URL = Deno.env.get("APP_URL");
if (APP_URL) {
  ALLOWED_ORIGINS.push(APP_URL);
}

export function getCorsHeaders(origin?: string | null): Record<string, string> {
  // Check if origin is allowed
  const isAllowed = origin && (
    ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed)) ||
    origin.endsWith(".lovable.app") ||
    origin.endsWith(".lovable.dev")
  );

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

export function handleCorsPreflightRequest(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("origin");
    return new Response(null, { 
      headers: getCorsHeaders(origin),
      status: 204 
    });
  }
  return null;
}
