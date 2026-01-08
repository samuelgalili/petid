import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bot capabilities for the orchestrator to understand
const BOT_CAPABILITIES = `
You are PetID Ops Commander, the orchestrator of a multi-agent system for PetID.

Available Bots and their capabilities:
1. Marketing Manager (marketing) - Campaign management, promotions, audience targeting
2. Content Creator (content) - Social posts, blog writing, email copy
3. Ads Manager (ads) - Google/Facebook/Instagram ads, budget management
4. WhatsApp Sales (whatsapp-sales) - Lead qualification, sales followup
5. Store Operations (store-ops) - Inventory, pricing, catalog updates
6. Fulfillment (fulfillment) - Orders, shipping, returns
7. Finance (finance) - Financial reports, expense tracking
8. Support (support) - Ticket management, FAQ responses
9. Analytics (analytics) - Data analysis, reporting, insights

CORE RULES:
1. Each bot has a single responsibility
2. All actions are DRAFTS first - high-impact actions require user approval
3. High-impact actions include: ad spend changes, price changes, refunds, supplier orders
4. Every action must be logged with: timestamp, bot name, reason, expected outcome
5. Prioritize tasks using business KPIs

When creating tasks, respond with structured JSON in this format:
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

Be helpful, proactive, and always think about what's best for the PetID business.
Respond in Hebrew.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client for task creation
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch current business context (recent tasks, KPIs, etc.)
    const { data: recentTasks } = await supabase
      .from('agent_tasks')
      .select('title, status, priority, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: bots } = await supabase
      .from('agent_bots')
      .select('id, name, slug')
      .eq('is_active', true);

    const contextInfo = `
Current Context:
- Recent Tasks: ${recentTasks?.length || 0} tasks in queue
- Active Bots: ${bots?.map(b => b.name).join(', ') || 'None'}
- Current Date: ${new Date().toLocaleDateString('he-IL')}
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
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    // Create a TransformStream to process the response
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    let fullResponse = '';

    // Process the stream
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

        // After stream completes, check for task creation
        if (fullResponse.includes('<task>')) {
          const taskMatches = fullResponse.match(/<task>([\s\S]*?)<\/task>/g);
          if (taskMatches) {
            for (const match of taskMatches) {
              try {
                const jsonStr = match.replace(/<\/?task>/g, '').trim();
                const taskData = JSON.parse(jsonStr);
                
                // Find bot ID
                const bot = bots?.find(b => b.slug === taskData.bot);
                if (bot) {
                  await supabase.from('agent_tasks').insert({
                    bot_id: bot.id,
                    title: taskData.title,
                    description: taskData.description,
                    priority: taskData.priority || 'medium',
                    task_type: taskData.bot,
                    requires_approval: taskData.requires_approval || false,
                    reason: taskData.reason,
                    expected_outcome: taskData.expected_outcome,
                    status: taskData.requires_approval ? 'pending_approval' : 'draft'
                  });

                  // Log the action
                  await supabase.from('agent_action_logs').insert({
                    bot_id: bot.id,
                    action_type: 'task_created',
                    description: `Created task: ${taskData.title}`,
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
