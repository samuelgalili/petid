import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatCompletion, chatCompletionStream } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ===== RISK ENGINE =====
interface RiskFactors {
  autonomy: number;
  dataSensitivity: number;
  financialImpact: number;
  customerImpact: number;
  reversibility: number;
  propagation: number;
  confidence: number;
}

function computeRiskScore(toolName: string, agentSlug: string, params: Record<string, unknown>): { score: number; factors: RiskFactors; decision: string } {
  const factors: RiskFactors = { autonomy: 0, dataSensitivity: 0, financialImpact: 0, customerImpact: 0, reversibility: 0, propagation: 0, confidence: 0 };

  // Autonomy - higher for destructive/write operations
  const destructiveKeywords = ["delete", "remove", "drop", "reset", "cancel"];
  const writeKeywords = ["create", "update", "insert", "send", "publish"];
  const paramStr = JSON.stringify(params).toLowerCase();
  
  if (destructiveKeywords.some(k => toolName.includes(k) || paramStr.includes(k))) factors.autonomy = 0.9;
  else if (writeKeywords.some(k => toolName.includes(k) || paramStr.includes(k))) factors.autonomy = 0.5;
  else factors.autonomy = 0.2;

  // Data sensitivity
  const sensitiveFields = ["password", "token", "secret", "payment", "credit_card", "ssn", "medical"];
  if (sensitiveFields.some(f => paramStr.includes(f))) factors.dataSensitivity = 0.9;
  else factors.dataSensitivity = 0.2;

  // Financial impact
  const financialTools = ["payment", "invoice", "refund", "charge", "payout", "order"];
  if (financialTools.some(t => toolName.includes(t))) factors.financialImpact = 0.8;
  else factors.financialImpact = 0.1;

  // Customer impact
  const customerTools = ["message", "email", "whatsapp", "notification", "sms"];
  if (customerTools.some(t => toolName.includes(t))) factors.customerImpact = 0.7;
  else factors.customerImpact = 0.1;

  // Reversibility (lower = harder to reverse)
  if (destructiveKeywords.some(k => toolName.includes(k))) factors.reversibility = 0.9;
  else factors.reversibility = 0.2;

  // Propagation
  const bulkKeywords = ["bulk", "all", "batch", "broadcast"];
  if (bulkKeywords.some(k => paramStr.includes(k))) factors.propagation = 0.8;
  else factors.propagation = 0.1;

  // Confidence
  factors.confidence = 0.3;

  // Weighted score
  const weights = { autonomy: 0.2, dataSensitivity: 0.2, financialImpact: 0.15, customerImpact: 0.15, reversibility: 0.1, propagation: 0.1, confidence: 0.1 };
  const score = Object.entries(weights).reduce((sum, [key, weight]) => sum + factors[key as keyof RiskFactors] * weight, 0);

  let decision = "allow";
  if (score >= 0.7) decision = "block";
  else if (score >= 0.5) decision = "escalate";
  else if (score >= 0.3) decision = "require_approval";

  return { score: Math.round(score * 100) / 100, factors, decision };
}

// ===== SECURITY GUARD =====
function securityCheck(toolName: string, agentSlug: string, params: Record<string, unknown>): { passed: boolean; reason?: string } {
  // Prompt injection detection in params
  const paramStr = JSON.stringify(params);
  const injectionPatterns = [
    /ignore\s+(previous|all)\s+(instructions|rules)/i,
    /you\s+are\s+now/i,
    /system\s*:\s*/i,
    /\boverride\b.*\bpolicy\b/i,
    /pretend\s+you/i,
    /disregard\s+(your|the)\s+(rules|instructions)/i,
  ];
  for (const pattern of injectionPatterns) {
    if (pattern.test(paramStr)) {
      return { passed: false, reason: `Prompt injection detected: ${pattern.source}` };
    }
  }

  // SQL injection patterns
  const sqlPatterns = [/;\s*DROP\s/i, /;\s*DELETE\s+FROM/i, /UNION\s+SELECT/i, /--\s*$/m];
  for (const pattern of sqlPatterns) {
    if (pattern.test(paramStr)) {
      return { passed: false, reason: `SQL injection attempt detected` };
    }
  }

  // Parameter size limits
  if (paramStr.length > 50000) {
    return { passed: false, reason: "Input parameters exceed size limit (50KB)" };
  }

  return { passed: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { action, tool_name, agent_slug, params, conversation_id, execution_id } = body;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ===== ROUTE ACTIONS =====
    switch (action) {
      case "execute_tool": {
        // 1. Validate tool exists
        const { data: tool } = await adminClient
          .from("ai_os_tool_registry")
          .select("*")
          .eq("name", tool_name)
          .eq("is_active", true)
          .single();

        if (!tool) {
          return new Response(JSON.stringify({ error: `Tool '${tool_name}' not found or disabled` }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 2. Check agent permissions
        const { data: permission } = await adminClient
          .from("ai_os_agent_permissions")
          .select("*")
          .eq("agent_slug", agent_slug)
          .eq("tool_name", tool_name)
          .eq("is_active", true)
          .single();

        if (!permission) {
          // Log security incident
          await adminClient.from("ai_os_security_incidents").insert({
            incident_type: "unauthorized_access",
            severity: "medium",
            agent_slug,
            tool_name,
            description: `Agent '${agent_slug}' attempted to use tool '${tool_name}' without permission`,
          });
          return new Response(JSON.stringify({ error: `Agent '${agent_slug}' lacks permission for tool '${tool_name}'` }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 3. Security Guard check
        const securityResult = securityCheck(tool_name, agent_slug, params || {});
        if (!securityResult.passed) {
          await adminClient.from("ai_os_security_incidents").insert({
            incident_type: "prompt_injection",
            severity: "high",
            agent_slug,
            tool_name,
            description: securityResult.reason,
            evidence: { params },
          });
          return new Response(JSON.stringify({ error: "Security check failed", reason: securityResult.reason }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 4. Risk assessment
        const risk = computeRiskScore(tool_name, agent_slug, params || {});

        // 5. Create execution record
        const needsApproval = risk.decision === "require_approval" || risk.decision === "escalate" || tool.requires_approval || permission.requires_approval;
        
        const { data: execution, error: execError } = await adminClient.from("ai_os_tool_executions").insert({
          tool_name,
          agent_slug,
          conversation_id,
          input_params: params || {},
          risk_score: risk.score,
          risk_factors: risk.factors,
          status: risk.decision === "block" ? "blocked" : needsApproval ? "pending" : "executing",
          approval_required: needsApproval,
          started_at: needsApproval ? null : new Date().toISOString(),
        }).select().single();

        if (execError) throw execError;

        // 6. Store risk assessment
        await adminClient.from("ai_os_risk_assessments").insert({
          execution_id: execution.id,
          overall_score: risk.score,
          autonomy_score: risk.factors.autonomy,
          data_sensitivity_score: risk.factors.dataSensitivity,
          financial_impact_score: risk.factors.financialImpact,
          reversibility_score: risk.factors.reversibility,
          customer_impact_score: risk.factors.customerImpact,
          propagation_score: risk.factors.propagation,
          confidence_score: risk.factors.confidence,
          decision: risk.decision,
          reasoning: `Risk score ${risk.score}: ${risk.decision}`,
        });

        // 7. If blocked, return immediately
        if (risk.decision === "block") {
          await adminClient.from("ai_os_security_incidents").insert({
            incident_type: "tool_misuse",
            severity: "high",
            agent_slug,
            tool_name,
            execution_id: execution.id,
            description: `Tool execution blocked due to high risk score: ${risk.score}`,
          });
          return new Response(JSON.stringify({
            execution_id: execution.id,
            status: "blocked",
            risk_score: risk.score,
            message: "Action blocked by risk engine. Risk score too high.",
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 8. If needs approval, return pending
        if (needsApproval) {
          return new Response(JSON.stringify({
            execution_id: execution.id,
            status: "pending_approval",
            risk_score: risk.score,
            risk_factors: risk.factors,
            message: "Action requires admin approval before execution.",
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 9. Execute (simulated — in production this would route to actual tool endpoints)
        const startTime = Date.now();
        let result: any = { success: true, message: `Tool '${tool_name}' executed successfully` };
        let status = "completed";

        try {
          // Route to actual tool implementation based on endpoint_type
          if (tool.endpoint_type === "edge_function" && tool.endpoint_config?.function_name) {
            const funcResp = await fetch(
              `${Deno.env.get("SUPABASE_URL")}/functions/v1/${tool.endpoint_config.function_name}`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(params),
              }
            );
            result = await funcResp.json();
            if (!funcResp.ok) status = "failed";
          } else if (tool.endpoint_type === "database") {
            // Database operations handled via the service role client
            result = { success: true, message: "Database operation executed" };
          }
        } catch (err) {
          status = "failed";
          result = { error: err instanceof Error ? err.message : "Unknown error" };
        }

        const executionTime = Date.now() - startTime;

        // 10. Update execution record
        await adminClient.from("ai_os_tool_executions").update({
          status,
          output_result: result,
          execution_time_ms: executionTime,
          completed_at: new Date().toISOString(),
        }).eq("id", execution.id);

        return new Response(JSON.stringify({
          execution_id: execution.id,
          status,
          risk_score: risk.score,
          result,
          execution_time_ms: executionTime,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "approve": {
        // Admin approves a pending execution
        const { data: exec } = await adminClient
          .from("ai_os_tool_executions")
          .select("*")
          .eq("id", execution_id)
          .eq("status", "pending")
          .single();

        if (!exec) {
          return new Response(JSON.stringify({ error: "Execution not found or not pending" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        await adminClient.from("ai_os_tool_executions").update({
          status: "approved",
          approved_by: userId,
          approved_at: new Date().toISOString(),
        }).eq("id", execution_id);

        return new Response(JSON.stringify({ status: "approved", execution_id }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "reject": {
        await adminClient.from("ai_os_tool_executions").update({
          status: "blocked",
          approved_by: userId,
          approved_at: new Date().toISOString(),
          error_message: body.reason || "Rejected by admin",
        }).eq("id", execution_id);

        return new Response(JSON.stringify({ status: "rejected", execution_id }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "chat": {
        // AI OS Chat - route to Brain Orchestrator
        const { messages, stream = true } = body;

        const systemPrompt = `You are the PetID AI Operating System — a central brain orchestrator managing a fleet of specialized AI agents.

You understand business intent and route tasks to the right agents. You have access to these agent capabilities:
- Marketing: content generation, campaigns, social media, hashtags
- Sales: lead follow-up, WhatsApp flows, upsell, quotes, cart recovery
- Customer Service: tickets, returns, order status, multilingual support
- CRM: customer records, segmentation, behavior tagging
- Analytics: sales reports, ROI, funnels, forecasting, anomaly detection
- Inventory: stock alerts, reorder, supplier management
- Finance: expenses, revenue, invoices, margins
- Automation: workflows, triggers, scheduled tasks
- Security: policy enforcement, anomaly monitoring

RULES:
1. Always identify which agent(s) should handle the request
2. For high-risk actions (payments, bulk messages, deletions), flag for approval
3. Respond in the user's language (Hebrew or English)
4. Be clear, concise, and actionable
5. Show reasoning when delegating to agents
6. Never make assumptions about data — query first

Format structured outputs as JSON when appropriate (charts, tables, action cards).
When suggesting actions, include a risk assessment.`;

        if (stream) {
          const aiStream = await chatCompletionStream({
            model: "google/gemini-3-flash-preview",
            messages: [{ role: "system", content: systemPrompt }, ...messages],
          });
          return new Response(aiStream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
        }

        const aiResult = await chatCompletion({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
        });
        return new Response(JSON.stringify(aiResult), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    console.error("AI OS Gateway error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
