import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Require an Authorization header.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: jsonHeaders }
      );
    }

    // 2. Resolve the caller from their JWT using the anon client.
    const supabaseUser = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseUser.auth.getUser(token);

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: jsonHeaders }
      );
    }

    // 3. Only admins may deploy code to the repository.
    const { data: adminRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) {
      console.log("Unauthorized architect-deploy attempt by user:", caller.id);
      return new Response(
        JSON.stringify({ error: "Unauthorized. Admin access required." }),
        { status: 403, headers: jsonHeaders }
      );
    }

    const GITHUB_PAT = Deno.env.get("GITHUB_PAT");
    const REPO_OWNER = Deno.env.get("GITHUB_REPO_OWNER");
    const REPO_NAME = Deno.env.get("GITHUB_REPO_NAME");

    if (!GITHUB_PAT || !REPO_OWNER || !REPO_NAME) {
      throw new Error("GitHub credentials not configured");
    }

    const { card_id } = await req.json();
    if (!card_id) throw new Error("card_id required");

    // 4. Record the attempt before touching the repository.
    await supabase.from("admin_audit_log").insert({
      admin_id: caller.id,
      action_type: "architect.deploy",
      entity_type: "architect_evolution_card",
      entity_id: card_id,
      metadata: {
        deployed_by_email: caller.email,
        card_id,
      },
    });

    // Fetch the card
    const { data: card, error: cardErr } = await supabase
      .from("architect_evolution_cards")
      .select("*")
      .eq("id", card_id)
      .single();

    if (cardErr || !card) throw new Error("Card not found");
    if (!card.file_path || !card.code_after) throw new Error("Card missing file_path or code_after");

    const branchName = `ido/evolution-${card.id.slice(0, 8)}`;
    const ghApi = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
    const headers = {
      Authorization: `Bearer ${GITHUB_PAT}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };

    // 1. Get default branch SHA
    const repoRes = await fetch(ghApi, { headers });
    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch || "main";

    const refRes = await fetch(`${ghApi}/git/ref/heads/${defaultBranch}`, { headers });
    const refData = await refRes.json();
    const baseSha = refData.object?.sha;
    if (!baseSha) throw new Error("Could not get base SHA");

    // 2. Create branch
    const createBranchRes = await fetch(`${ghApi}/git/refs`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
    });
    if (!createBranchRes.ok) {
      const branchErr = await createBranchRes.text();
      // Branch might already exist
      if (!branchErr.includes("Reference already exists")) {
        throw new Error(`Branch creation failed: ${branchErr}`);
      }
    }

    // 3. Create/update file
    // First try to get existing file SHA
    let fileSha: string | undefined;
    const fileRes = await fetch(`${ghApi}/contents/${card.file_path}?ref=${branchName}`, { headers });
    if (fileRes.ok) {
      const fileData = await fileRes.json();
      fileSha = fileData.sha;
    }

    const content = btoa(unescape(encodeURIComponent(card.code_after)));
    const commitRes = await fetch(`${ghApi}/contents/${card.file_path}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `[Ido Architect] ${card.solution}`,
        content,
        branch: branchName,
        ...(fileSha ? { sha: fileSha } : {}),
      }),
    });

    if (!commitRes.ok) {
      const commitErr = await commitRes.text();
      throw new Error(`File commit failed: ${commitErr}`);
    }

    const commitData = await commitRes.json();

    // 4. Create PR
    const prRes = await fetch(`${ghApi}/pulls`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: `🏗️ [Ido] ${card.solution}`,
        body: `## Evolution Card\n\n**Insight:** ${card.insight}\n\n**Solution:** ${card.solution}\n\n**Category:** ${card.category}\n**Confidence:** ${(card.confidence * 100).toFixed(0)}%\n\n---\n*Auto-generated by Ido — The System Architect*`,
        head: branchName,
        base: defaultBranch,
      }),
    });

    let prUrl = "";
    if (prRes.ok) {
      const prData = await prRes.json();
      prUrl = prData.html_url || "";
    }

    // 5. Update card status
    await supabase.from("architect_evolution_cards").update({
      status: "deployed",
      deploy_pr_url: prUrl,
      deploy_commit_sha: commitData.commit?.sha || "",
      deployed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", card_id);

    return new Response(JSON.stringify({
      success: true,
      pr_url: prUrl,
      branch: branchName,
      commit_sha: commitData.commit?.sha,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("architect-deploy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
