// Caller checks for Edge Functions.
//
// Functions registered with verify_jwt = false in config.toml are reachable by
// anyone on the internet, and most of them hold the service role key, which
// bypasses RLS entirely. Anything in that position must establish who is
// calling before it does work.
//
// Pattern follows reset-admin-password: resolve the user from the bearer token
// with the anon client, then check user_roles with the admin client.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthorizedCaller {
  id: string;
  email: string | null;
}

export interface AuthFailure {
  ok: false;
  status: 401 | 403;
  error: string;
}

export type AuthResult = { ok: true; caller: AuthorizedCaller } | AuthFailure;

function bearer(req: Request): string | null {
  const header = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/** True when the request carries the project's service role key. */
export function isServiceRoleCall(req: Request): boolean {
  const token = bearer(req);
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return Boolean(token && serviceKey && token === serviceKey);
}

/** Resolve the signed-in user, or explain why we could not. */
export async function requireUser(req: Request): Promise<AuthResult> {
  const token = bearer(req);
  if (!token) return { ok: false, status: 401, error: "Missing authorization header" };

  // The anon key is what unauthenticated clients send; it identifies no one.
  if (token === Deno.env.get("SUPABASE_ANON_KEY")) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  const anon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, status: 401, error: "Invalid or expired token" };
  }

  return { ok: true, caller: { id: data.user.id, email: data.user.email ?? null } };
}

/** Resolve the caller and require an admin row in user_roles. */
export async function requireAdmin(req: Request, admin: SupabaseClient): Promise<AuthResult> {
  const result = await requireUser(req);
  if (!result.ok) return result;

  const { data: role, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", result.caller.id)
    .eq("role", "admin")
    .maybeSingle();

  if (error || !role) {
    console.log("Unauthorized admin call by user:", result.caller.id);
    return { ok: false, status: 403, error: "Unauthorized. Admin access required." };
  }

  return result;
}

/** Turn an AuthFailure into a response. */
export function authErrorResponse(
  failure: AuthFailure,
  corsHeaders: Record<string, string>
): Response {
  return new Response(JSON.stringify({ error: failure.error }), {
    status: failure.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
