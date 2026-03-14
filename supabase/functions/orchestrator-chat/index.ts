import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(10000, "Message content too long (max 10000 chars)")
});

const OrchestratorInputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50, "Too many messages (max 50)")
});

const TaskSchema = z.object({
  bot: z.string().max(50),
  title: z.string().max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
  requires_approval: z.boolean().optional().default(false),
  reason: z.string().max(500).optional(),
  expected_outcome: z.string().max(500).optional()
});

const ActionSchema = z.object({
  type: z.enum(["content_update", "design_change", "code_fix", "config_change", "data_update", "feature_toggle"]),
  target: z.string().max(200),
  description: z.string().max(2000),
  changes: z.record(z.any()).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
  bot: z.string().max(50).optional().default("brain"),
});

const MAX_PAYLOAD_SIZE = 1024 * 1024;

const BOT_CAPABILITIES = `
You are the PetID Brain Bot — the central orchestrator of the entire PetID platform.
Your mission: protect pets by ensuring accurate data, safe products, and proactive care.
You can manage ALL aspects of the platform — content, design, code, settings, and data — all through admin approval.

## The Fleet — Autonomous Robots:
1. **Brain Bot** (brain) — YOU. Orchestrate, prioritize, delegate, and execute platform management.
2. **CRM Bot** (crm) — User/pet profiles, data integrity, duplicate detection.
3. **Inventory Bot** (inventory) — Stock predictions, reorder alerts, NRC 2006 compliance.
4. **Marketing Bot** (marketing) — User segmentation, campaigns, push notifications.
5. **Sales Bot** (sales) — Insurance leads, upsells, product recommendations.
6. **Support Bot** (support) — 24/7 AI assistance, pet history, medical records.
7. **Medical Bot** (medical) — Clinic locator, vaccination schedules, health alerts.
8. **Compliance Bot** (compliance) — Licenses, expiry dates, municipal rules.
9. **NRC Science Bot** (nrc-science) — Food safety, NRC 2006 verification.
10. **Content Bot** (content) — Blog posts, social content, pet care tips.
11. **Ido — Architect** (system-architect) — Code fixes, component optimization, GitHub PRs.
12. **Ofek — Visual Monitor** (ofek-visual-monitor) — UI/CSS issues, visual quality.
13. **Maya — UX** (maya) — User experience, flow optimization.

## PLATFORM MANAGEMENT CAPABILITIES:

### 📝 Content Management
- Update product descriptions, prices, images
- Create/edit blog posts and articles
- Modify FAQ and help content
- Update business profiles and listings

### 🎨 Design & UI Changes
- Fix CSS/styling issues (via Ido Architect → GitHub PR)
- Update color schemes, fonts, spacing
- Fix responsive/mobile layout problems
- Improve component visual quality (via Ofek)

### 🔧 Code & Logic Fixes
- Fix bugs and errors (via Ido Architect → GitHub PR)
- Optimize performance
- Update Edge Function logic
- Fix data flow issues

### ⚙️ Configuration & Settings
- Toggle features on/off
- Update system settings
- Manage bot configurations
- Adjust automation rules

### 📊 Data Management
- Clean/fix data inconsistencies
- Bulk update records
- Import/export data
- Fix data integrity issues

## ACTION FORMAT:
For platform changes, use <action> tags:
<action>
{
  "type": "content_update|design_change|code_fix|config_change|data_update|feature_toggle",
  "target": "What entity/page/component to change",
  "description": "Detailed description of the change",
  "changes": { "field": "new_value" },
  "priority": "low|medium|high|urgent",
  "bot": "which bot handles this"
}
</action>

## TASK FORMAT (for bot delegation):
<task>
{
  "bot": "slug",
  "title": "Task title",
  "description": "What needs to be done",
  "priority": "low|medium|high|urgent",
  "requires_approval": true/false,
  "reason": "Why this action is needed",
  "expected_outcome": "What we expect to achieve"
}
</task>

## CORE RULES:
1. **ALL changes require admin approval** — no exceptions.
2. Every action is logged with: timestamp, bot name, reason, expected outcome.
3. Prioritize by: (a) Pet safety, (b) Data integrity, (c) Revenue.
4. PetID Core: If doubt — do not recommend. If data missing — ask.
5. Kill Switch: Admin can deactivate any bot instantly.
6. Never hallucinate data. Only use verified information.
7. When asked to fix bugs — route to Ido (system-architect).
8. When asked about design — route to Ofek (ofek-visual-monitor) or Maya (maya).
9. When asked about content — route to Content Bot.
10. For code changes — always specify file path and what to change.

## Naming: Always use "PetID" — never "Vet Life".
Respond in Hebrew. Be concise and actionable.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { data: adminRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    
    if (roleError || !adminRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      return new Response(JSON.stringify({ error: "Payload too large (max 1MB)" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.json();
    const parseResult = OrchestratorInputSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      return new Response(JSON.stringify({ 
        error: "Invalid input", 
        details: parseResult.error.errors.map(e => e.message).join(", ")
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = parseResult.data;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch context
    const [{ data: recentTasks }, { data: bots }, { data: recentLogs }, { data: pendingApprovals }, { data: automationBots }] = await Promise.all([
      supabase.from('agent_tasks').select('title, status, priority, bot_id, created_at').order('created_at', { ascending: false }).limit(15),
      supabase.from('agent_bots').select('id, name, slug, is_active').order('created_at'),
      supabase.from('agent_action_logs').select('action_type, description, created_at').order('created_at', { ascending: false }).limit(10),
      supabase.from('admin_approval_queue').select('id, title, category, status, draft_content, bot_id, created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(20),
      supabase.from('automation_bots').select('name, slug, health_status, last_run_at, last_output, is_active').order('last_run_at', { ascending: false }).limit(10),
    ]);

    const activeBots = bots?.filter(b => b.is_active) || [];
    const inactiveBots = bots?.filter(b => !b.is_active) || [];

    const pendingApprovalsSummary = (pendingApprovals && pendingApprovals.length > 0)
      ? pendingApprovals.map((a: any) => `  • [${a.category || 'general'}] ${a.title} (${new Date(a.created_at).toLocaleString('he-IL')})\n    תוכן: ${(a.draft_content || '').substring(0, 150)}...`).join('\n')
      : 'אין פריטים ממתינים';

    const recentBotOutputs = (automationBots && automationBots.length > 0)
      ? automationBots.filter((b: any) => b.last_run_at).slice(0, 5).map((b: any) => `  • ${b.name} (${b.health_status}): ${(b.last_output || '').substring(0, 100)}...`).join('\n')
      : 'אין דוחות אחרונים';

    const contextInfo = `
## Current System State:
- Active Bots: ${activeBots.map(b => b.name).join(', ') || 'None'}
- Deactivated Bots (Kill Switch): ${inactiveBots.map(b => b.name).join(', ') || 'None'}
- Tasks in Queue: ${recentTasks?.length || 0}
- Pending Approval (Tasks): ${recentTasks?.filter(t => t.status === 'pending_approval').length || 0}
- Recent Actions: ${recentLogs?.map(l => l.description).slice(0, 5).join('; ') || 'None'}
- Date: ${new Date().toLocaleDateString('he-IL')}
- Admin: ${user.email}

## 🔔 Pending Bot Approvals (${pendingApprovals?.length || 0} items):
${pendingApprovalsSummary}

## 📊 Recent Automation Bot Reports:
${recentBotOutputs}

IMPORTANT: When the admin asks about pending approvals, bot status, or recent reports — present the above data clearly. Highlight items that need urgent attention.
When the admin asks to make changes — always create <action> or <task> tags so changes are tracked and queued for approval.
`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: BOT_CAPABILITIES + contextInfo },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    let fullResponse = '';

    const processStream = async () => {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
          await writer.write(encoder.encode(chunk));
        }

        // Parse and execute tasks
        if (fullResponse.includes('<task>')) {
          const taskMatches = fullResponse.match(/<task>([\s\S]*?)<\/task>/g);
          if (taskMatches) {
            for (const match of taskMatches) {
              try {
                const jsonStr = match.replace(/<\/?task>/g, '').trim();
                const rawTaskData = JSON.parse(jsonStr);
                const taskParseResult = TaskSchema.safeParse(rawTaskData);
                if (!taskParseResult.success) continue;
                
                const taskData = taskParseResult.data;
                const bot = bots?.find(b => b.slug === taskData.bot);
                
                if (bot && bot.is_active) {
                  await supabase.from('agent_tasks').insert({
                    bot_id: bot.id,
                    title: taskData.title,
                    description: taskData.description,
                    priority: taskData.priority,
                    task_type: taskData.bot,
                    requires_approval: taskData.requires_approval,
                    reason: taskData.reason,
                    expected_outcome: taskData.expected_outcome,
                    status: taskData.requires_approval ? 'pending_approval' : 'draft'
                  });

                  await supabase.from('agent_action_logs').insert({
                    bot_id: bot.id,
                    action_type: 'task_created',
                    description: `Created task: ${taskData.title}`.substring(0, 500),
                    reason: taskData.reason,
                    expected_outcome: taskData.expected_outcome
                  });
                }
              } catch (e) {
                console.error('Failed to parse task:', e);
              }
            }
          }
        }

        // Parse and queue actions for admin approval
        if (fullResponse.includes('<action>')) {
          const actionMatches = fullResponse.match(/<action>([\s\S]*?)<\/action>/g);
          if (actionMatches) {
            for (const match of actionMatches) {
              try {
                const jsonStr = match.replace(/<\/?action>/g, '').trim();
                const rawActionData = JSON.parse(jsonStr);
                const actionParseResult = ActionSchema.safeParse(rawActionData);
                if (!actionParseResult.success) continue;

                const actionData = actionParseResult.data;

                // Route to approval queue — ALL actions require admin approval
                const categoryMap: Record<string, string> = {
                  content_update: "content",
                  design_change: "design",
                  code_fix: "technical",
                  config_change: "system",
                  data_update: "data",
                  feature_toggle: "system",
                };

                await supabase.from('admin_approval_queue').insert({
                  title: `[${actionData.type}] ${actionData.target}`,
                  description: actionData.description,
                  category: categoryMap[actionData.type] || "general",
                  status: "pending",
                  proposed_changes: actionData.changes || {},
                  draft_content: JSON.stringify(actionData),
                  target_entity: actionData.target,
                });

                // Log the action
                const bot = bots?.find(b => b.slug === (actionData.bot || 'brain'));
                if (bot) {
                  await supabase.from('agent_action_logs').insert({
                    bot_id: bot.id,
                    action_type: actionData.type,
                    description: `Queued for approval: ${actionData.description}`.substring(0, 500),
                    reason: `Admin command → ${actionData.target}`,
                    expected_outcome: actionData.description,
                  });
                }
              } catch (e) {
                console.error('Failed to parse action:', e);
              }
            }
          }
        }
      } catch (e) {
        console.error('Stream processing error:', e);
      } finally {
        await writer.close();
      }
    };

    processStream();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Orchestrator error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});