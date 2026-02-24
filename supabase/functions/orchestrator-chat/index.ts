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

const MAX_PAYLOAD_SIZE = 1024 * 1024;

// The 9 PetID Fleet Bots
const BOT_CAPABILITIES = `
You are the PetID Brain Bot — the central orchestrator of 10 autonomous robots (The Fleet).
Your mission: protect pets by ensuring accurate data, safe products, and proactive care.

## The Fleet — 10 Autonomous Robots:

1. **Brain Bot** (brain) — YOU. Orchestrate, prioritize, and delegate tasks to other bots based on KPIs.
2. **CRM Bot** (crm) — Maintains 100% data integrity in user/pet profiles. Detects duplicates, syncs OCR data, validates owner info.
3. **Inventory Bot** (inventory) — Predicts stock depletion based on pet weight and NRC 2006 standards. Triggers reorder alerts.
4. **Marketing Bot** (marketing) — Segments users (e.g., "Doberman owners in Tel Aviv") for targeted campaigns. Creates push notifications.
5. **Sales Bot** (sales) — Generates leads for Libra Insurance and store products post-scan. Manages upsell logic.
6. **Support Bot** (support) — 24/7 AI assistance based on pet history, medical records, and vaccination schedules.
7. **Medical Bot** (medical) — Locates nearby clinics, schedules vaccinations, sends health alerts based on scanned documents.
8. **Compliance Bot** (compliance) — Tracks licenses, expiry dates, dangerous dog status, and municipal rules.
9. **NRC Science Bot** (nrc-science) — Verifies food ingredients against NRC 2006 guidelines. Analyzes product images for safety.
10. **Content Creation Bot** (content-creation) — Generates blog posts, social captions, pet care tips, and infographic briefs. Uses scanned_documents, nrc_standards, and breed_information for fact-based, personalized content. All output requires admin approval.

## CORE RULES:
1. Each bot has a single responsibility — never overlap.
2. **CRITICAL ACTIONS require approval**: price changes, refunds, notifications to users, deletions, ad spend, insurance lead forwarding.
3. Non-critical actions (data analysis, report generation, stock checks) execute automatically.
4. Every action is logged with: timestamp, bot name, reason, expected outcome.
5. Prioritize by: (a) Pet safety, (b) Data integrity, (c) Revenue.
6. PetID Core: If doubt — do not recommend. If data missing — ask. Default = inaction.

## SAFETY PROTOCOLS:
- Kill Switch: Admin can deactivate any bot instantly via is_active flag.
- Human-in-the-loop: All user-facing messages and financial actions require approval.
- Never hallucinate data. Only use verified information from the database.

## Task Creation Format:
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

## Naming: Always use "PetID" — never "Vet Life".
Respond in Hebrew.
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
    const [{ data: recentTasks }, { data: bots }, { data: recentLogs }] = await Promise.all([
      supabase.from('agent_tasks').select('title, status, priority, bot_id, created_at').order('created_at', { ascending: false }).limit(15),
      supabase.from('agent_bots').select('id, name, slug, is_active').order('created_at'),
      supabase.from('agent_action_logs').select('action_type, description, created_at').order('created_at', { ascending: false }).limit(10),
    ]);

    const activeBots = bots?.filter(b => b.is_active) || [];
    const inactiveBots = bots?.filter(b => !b.is_active) || [];

    const contextInfo = `
## Current System State:
- Active Bots: ${activeBots.map(b => b.name).join(', ') || 'None'}
- Deactivated Bots (Kill Switch): ${inactiveBots.map(b => b.name).join(', ') || 'None'}
- Tasks in Queue: ${recentTasks?.length || 0}
- Pending Approval: ${recentTasks?.filter(t => t.status === 'pending_approval').length || 0}
- Recent Actions: ${recentLogs?.map(l => l.description).slice(0, 5).join('; ') || 'None'}
- Date: ${new Date().toLocaleDateString('he-IL')}
- Admin: ${user.email}
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

        // Parse tasks from response
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
