// Shared CORS configuration for Edge Functions
// Restricts origins based on environment

const ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:5173",
];

// Add the app's production URL if configured
const APP_URL = Deno.env.get("APP_URL");
if (APP_URL) {
  ALLOWED_ORIGINS.push(APP_URL.replace(/\/+$/, ""));
}

const APP_PREVIEW_URLS = (Deno.env.get("APP_PREVIEW_URLS") ?? "")
  .split(",")
  .map((value) => value.trim().replace(/\/+$/, ""))
  .filter(Boolean);

ALLOWED_ORIGINS.push(...APP_PREVIEW_URLS);

export function getCorsHeaders(origin?: string | null): Record<string, string> {
  // Check if origin is allowed
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);

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
