import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatCompletion } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Bots whose output requires admin approval before reaching users
const APPROVAL_REQUIRED_SLUGS = new Set([
  "sales", "marketing", "compliance", "cashflow-guardian",
  "financial-algo", "fraud-detection", "crisis-pr", "content",
]);

// Bots that send informational output directly
const DIRECT_OUTPUT_SLUGS = new Set([
  "brain", "crm", "nrc-science", "support", "inventory", "medical",
  "system-architect", "ofek-visual-monitor", "prometheus", "market-intelligence",
  "ethics-safety", "vip-experience", "supply-chain", "health-prediction", "onboarding-guide",
]);

const SLUG_CATEGORY_MAP: Record<string, string> = {
  "sales": "commercial", "marketing": "commercial", "compliance": "legal",
  "cashflow-guardian": "financial", "financial-algo": "financial",
  "fraud-detection": "security", "crisis-pr": "communications", "content": "content",
};

const MAX_SELF_HEAL_ATTEMPTS = 2;

// ─── Inter-Agent Synergy Map ───
const SYNERGY_MAP: Record<string, string[]> = {
  "maya-ux": ["system-architect", "ofek-visual-monitor"],
  "system-architect": ["maya-ux", "ofek-visual-monitor"],
  "ofek-visual-monitor": ["maya-ux", "system-architect"],
  "sales": ["crm", "content"],
  "content": ["maya-ux", "ofek-visual-monitor"],
  "nrc-science": ["health-prediction", "ethics-safety"],
  "health-prediction": ["nrc-science", "ethics-safety"],
  "cashflow-guardian": ["financial-algo", "fraud-detection"],
  "financial-algo": ["cashflow-guardian", "fraud-detection"],
};

// ─── Agent expertise domains for Brain routing ───
const AGENT_EXPERTISE: Record<string, string> = {
  "sales": "מכירות, הנחות, מבצעים, pricing",
  "nrc-science": "תזונה, מדע, NRC, בריאות מזון, רכיבים",
  "health-prediction": "חיזוי בריאות, מחלות, ניטור רפואי",
  "crm": "לקוחות, CRM, פרופילים, נתוני משתמשים",
  "content": "תוכן, מאמרים, בלוג, שיווק תוכן",
  "support": "שירות לקוחות, תמיכה, FAQ",
  "system-architect": "קוד, ארכיטקטורה, באגים, מערכת",
  "maya-ux": "UX, עיצוב, חוויית משתמש, המרות",
  "ofek-visual-monitor": "ויזואליות, תמונות, עיצוב גרפי",
  "prometheus": "אופטימיזציה, ביצועים, prompt engineering",
  "market-intelligence": "מתחרים, מחקר שוק, מגמות",
  "cashflow-guardian": "תזרים מזומנים, כספים, תשלומים",
  "financial-algo": "אלגוריתמים פיננסיים, תמחור",
  "fraud-detection": "הונאה, אבטחה, חריגות",
  "crisis-pr": "משברים, יח\"צ, תקשורת חיצונית",
  "ethics-safety": "אתיקה, בטיחות, פרטיות",
  "vip-experience": "VIP, חוויית פרימיום, נאמנות",
  "supply-chain": "שרשרת אספקה, ספקים, לוגיסטיקה",
  "inventory": "מלאי, מוצרים, ניהול מלאי",
  "onboarding-guide": "הצטרפות, אונבורדינג, הדרכה",
  "compliance": "רגולציה, ביטוח, תאימות",
};

// ─── Fetch Real Data Context Per Agent ───
async function fetchAgentContext(supabase: any, slug: string): Promise<string> {
  try {
    switch (slug) {
      case "health-prediction": {
        const { data: pets } = await supabase.from("pets").select("id, name, pet_type, breed, date_of_birth, weight_kg, health_notes, last_vet_visit").limit(20);
        const { data: rules } = await supabase.from("breed_disease_diet_rules").select("disease, diet, avoid").limit(10);
        return `## נתונים אמיתיים — חיות מחמד רשומות:\n${JSON.stringify(pets || [], null, 1)}\n\n## כללי מחלות/תזונה לפי גזע:\n${JSON.stringify(rules || [], null, 1)}`;
      }
      case "fraud-detection": {
        const { data: leads } = await supabase.from("insurance_leads").select("id, pet_name, phone, email, status, created_at").order("created_at", { ascending: false }).limit(50);
        const phoneMap: Record<string, number> = {};
        for (const l of leads || []) { if (l.phone) phoneMap[l.phone] = (phoneMap[l.phone] || 0) + 1; }
        const dupes = Object.entries(phoneMap).filter(([, c]) => c > 2);
        return `## לידים אחרונים (${leads?.length || 0}):\n${JSON.stringify((leads || []).slice(0, 15), null, 1)}\n\n## טלפונים כפולים (חשודים): ${JSON.stringify(dupes)}`;
      }
      case "cashflow-guardian": {
        const { data: payments } = await supabase.from("cardcom_payments").select("id, amount, status, created_at").order("created_at", { ascending: false }).limit(30);
        const { data: subs } = await supabase.from("cardcom_subscriptions").select("id, plan_name, status, amount").eq("status", "active").limit(20);
        const { data: payouts } = await supabase.from("business_payouts").select("id, amount, status, payout_date").order("created_at", { ascending: false }).limit(10);
        const totalRevenue = (payments || []).filter((p: any) => p.status === "completed").reduce((s: number, p: any) => s + (p.amount || 0), 0);
        return `## תשלומים אחרונים (${payments?.length || 0}), הכנסה כוללת: ₪${totalRevenue}:\n${JSON.stringify((payments || []).slice(0, 10), null, 1)}\n\n## מנויים פעילים (${subs?.length || 0}):\n${JSON.stringify(subs || [], null, 1)}\n\n## תשלומים לעסקים:\n${JSON.stringify(payouts || [], null, 1)}`;
      }
      case "financial-algo": {
        const { data: products } = await supabase.from("business_products").select("name, price, cost_price, in_stock, auto_restock, sale_price, category").limit(30);
        const { data: invoices } = await supabase.from("supplier_invoices").select("amount, status, currency, due_date").limit(15);
        const lowMargin = (products || []).filter((p: any) => p.cost_price && p.price && (p.price - p.cost_price) / p.price < 0.3);
        const oos = (products || []).filter((p: any) => !p.in_stock);
        return `## מוצרים (${products?.length || 0}), חסרים במלאי: ${oos.length}, מרווח נמוך: ${lowMargin.length}:\n${JSON.stringify((products || []).slice(0, 15), null, 1)}\n\n## חשבוניות ספקים:\n${JSON.stringify(invoices || [], null, 1)}`;
      }
      case "supply-chain": {
        const { data: orders } = await supabase.from("orders").select("id, status, shipping, tracking_number, created_at").in("status", ["processing", "shipped"]).order("created_at", { ascending: false }).limit(30);
        const stale = (orders || []).filter((o: any) => o.status === "processing" && (Date.now() - new Date(o.created_at).getTime()) > 3 * 24 * 3600000);
        return `## משלוחים פעילים (${orders?.length || 0}), עיכובים: ${stale.length}:\n${JSON.stringify((orders || []).slice(0, 15), null, 1)}\n\n## הזמנות מעוכבות (3+ ימים):\n${JSON.stringify(stale, null, 1)}`;
      }
      case "crm": {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, city, last_login, created_at, loyalty_points").order("created_at", { ascending: false }).limit(30);
        const { data: petCount } = await supabase.from("pets").select("id", { count: "exact", head: true });
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        const inactive = (profiles || []).filter((p: any) => p.last_login && p.last_login < sevenDaysAgo);
        return `## משתמשים (${profiles?.length || 0}), לא פעילים 7+ ימים: ${inactive.length}, סה"כ חיות: ${petCount?.length || 0}:\n${JSON.stringify((profiles || []).slice(0, 15), null, 1)}`;
      }
      case "onboarding-guide": {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url, phone, city, created_at").order("created_at", { ascending: false }).limit(50);
        const { data: pets } = await supabase.from("pets").select("owner_id").limit(500);
        const petOwners = new Set((pets || []).map((p: any) => p.owner_id));
        let incomplete = 0;
        const gaps: any[] = [];
        for (const p of profiles || []) {
          const missing: string[] = [];
          if (!p.full_name) missing.push("name");
          if (!p.avatar_url) missing.push("avatar");
          if (!p.phone) missing.push("phone");
          if (!petOwners.has(p.id)) missing.push("pet");
          if (missing.length > 0) { incomplete++; gaps.push({ user_id: p.id, missing }); }
        }
        const rate = profiles?.length ? Math.round(((profiles.length - incomplete) / profiles.length) * 100) : 0;
        return `## אונבורדינג — שיעור השלמה: ${rate}%, חסרים: ${incomplete}/${profiles?.length || 0}\nפערים עיקריים:\n${JSON.stringify(gaps.slice(0, 10), null, 1)}`;
      }
      case "vip-experience": {
        const today = new Date();
        const { data: pets } = await supabase.from("pets").select("id, name, date_of_birth, owner_id").not("date_of_birth", "is", null).limit(200);
        const birthdays = (pets || []).filter((p: any) => {
          const d = new Date(p.date_of_birth);
          return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
        });
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        const { data: inactive } = await supabase.from("profiles").select("id, display_name, last_login").lt("last_login", sevenDaysAgo).not("last_login", "is", null).limit(30);
        return `## ימי הולדת היום: ${birthdays.length}\n${JSON.stringify(birthdays, null, 1)}\n\n## משתמשים לא פעילים 7+ ימים: ${inactive?.length || 0}\n${JSON.stringify((inactive || []).slice(0, 10), null, 1)}`;
      }
      case "ethics-safety": {
        const { data: logs } = await supabase.from("agent_action_logs").select("id, action_type, description, created_at").order("created_at", { ascending: false }).limit(50);
        const { data: prompts } = await supabase.from("agent_prompt_versions").select("id, agent_slug, system_prompt, is_active").eq("is_active", true).limit(20);
        return `## לוגים אחרונים לביקורת (${logs?.length || 0}):\n${JSON.stringify((logs || []).slice(0, 20), null, 1)}\n\n## פרומפטים פעילים (${prompts?.length || 0}):\n${JSON.stringify((prompts || []).map((p: any) => ({ slug: p.agent_slug, prompt_preview: (p.system_prompt || "").substring(0, 200) })), null, 1)}`;
      }
      case "crisis-pr": {
        const { data: reports } = await supabase.from("content_reports").select("id, reason, status, created_at").eq("status", "pending").limit(15);
        const { data: feedback } = await supabase.from("chat_message_feedback").select("id, rating, comment, created_at").eq("rating", "negative").order("created_at", { ascending: false }).limit(15);
        const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
        const { count: errorCount } = await supabase.from("system_error_logs").select("id", { count: "exact", head: true }).gte("created_at", oneHourAgo);
        return `## דוחות תוכן ממתינים: ${reports?.length || 0}\n${JSON.stringify(reports || [], null, 1)}\n\n## פידבק שלילי: ${feedback?.length || 0}\n${JSON.stringify((feedback || []).slice(0, 5), null, 1)}\n\n## שגיאות בשעה האחרונה: ${errorCount || 0}`;
      }
      case "market-intelligence": {
        const { data: products } = await supabase.from("business_products").select("name, price, brand, category, source_url, created_at").order("created_at", { ascending: false }).limit(20);
        const { data: competitors } = await supabase.from("business_profiles").select("business_name, business_type, city, rating").limit(15);
        return `## מוצרים אחרונים:\n${JSON.stringify(products || [], null, 1)}\n\n## עסקים רשומים:\n${JSON.stringify(competitors || [], null, 1)}`;
      }
      case "nrc-science": {
        const { data: rules } = await supabase.from("breed_disease_diet_rules").select("*").limit(20);
        const { data: breeds } = await supabase.from("breed_information").select("breed_name, breed_name_he, health_issues, dietary_notes, size_category, energy_level").limit(20);
        return `## כללי תזונה לפי מחלה/גזע:\n${JSON.stringify(rules || [], null, 1)}\n\n## מידע גזעי:\n${JSON.stringify(breeds || [], null, 1)}`;
      }
      case "sales": {
        const { data: products } = await supabase.from("business_products").select("name, price, sale_price, in_stock, category, is_featured").eq("in_stock", true).limit(20);
        const { data: recentOrders } = await supabase.from("orders").select("id, total_amount, status, created_at").order("created_at", { ascending: false }).limit(15);
        return `## מוצרים זמינים למכירה (${products?.length || 0}):\n${JSON.stringify(products || [], null, 1)}\n\n## הזמנות אחרונות:\n${JSON.stringify(recentOrders || [], null, 1)}`;
      }
      case "prometheus": {
        const { data: scores } = await supabase.from("agent_performance_scores").select("agent_slug, accuracy_score, response_quality, empathy_score, score_date").order("score_date", { ascending: false }).limit(30);
        const { data: healLogs } = await supabase.from("agent_action_logs").select("description, created_at, metadata").in("action_type", ["self_heal_success", "self_heal_failed"]).order("created_at", { ascending: false }).limit(10);
        const { data: bots } = await supabase.from("automation_bots").select("slug, name, health_status, last_error, run_count, last_run_at").eq("is_active", true);
        return `## ביצועי סוכנים:\n${JSON.stringify(scores || [], null, 1)}\n\n## לוגים של ריפוי עצמי:\n${JSON.stringify(healLogs || [], null, 1)}\n\n## סטטוס בוטים:\n${JSON.stringify(bots || [], null, 1)}`;
      }
      case "compliance": {
        const { data: leads } = await supabase.from("insurance_leads").select("id, status, pet_name, created_at").order("created_at", { ascending: false }).limit(20);
        const { data: approvals } = await supabase.from("admin_approval_queue").select("id, title, status, category, created_at").eq("status", "pending").limit(15);
        return `## לידי ביטוח:\n${JSON.stringify(leads || [], null, 1)}\n\n## אישורים ממתינים:\n${JSON.stringify(approvals || [], null, 1)}`;
      }
      default:
        return "";
    }
  } catch (err) {
    console.warn(`⚠️ Failed to fetch context for ${slug}:`, err);
    return `[שגיאה בשליפת נתונים עבור ${slug}]`;
  }
}

// ─── Brain Orchestrator ───
async function brainOrchestrate(
  supabase: any,
  command: string,
  availableBots: any[]
): Promise<{ delegations: Array<{ slug: string; subCommand: string }>; reasoning: string; conflicts: string[] }> {
  const botList = availableBots.map(b => `- ${b.slug}: ${AGENT_EXPERTISE[b.slug] || b.description || b.name}`).join("\n");

  const brainPrompt = `You are "The Brain" — the central orchestrator of PetID's 21-agent fleet.

AVAILABLE AGENTS:
${botList}

RULES:
1. Analyze the admin command and decide which agent(s) should handle it.
2. NEVER do everything yourself — delegate sub-commands to the right specialists.
3. CONFLICT RESOLUTION: If a command could create a conflict (e.g., sales vs safety), ALWAYS rule in favor of science and safety (Dr. NRC / Ethics / Health Prediction win).
4. You may assign multiple agents. Each gets a specific sub-command.
5. Return ONLY valid JSON, no markdown.

OUTPUT FORMAT (strict JSON):
{
  "delegations": [
    { "slug": "agent-slug", "subCommand": "specific instruction for this agent in Hebrew" }
  ],
  "reasoning": "Brief explanation of your routing decision in Hebrew",
  "conflicts": ["Any detected conflicts and how you resolved them, in Hebrew"]
}`;

  const output = await callAI("", "google/gemini-2.5-flash", [
    { role: "system", content: brainPrompt },
    { role: "user", content: `פקודת אדמין: "${command}"` },
  ]);

  try {
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {
    console.error("Brain failed to parse delegation JSON:", output);
  }

  return {
    delegations: availableBots.map(b => ({ slug: b.slug, subCommand: command })),
    reasoning: "Brain לא הצליח לנתח — שולח לכל הסוכנים",
    conflicts: [],
  };
}

// ─── Call AI ───
async function callAI(_apiKey: string, model: string, messages: Array<{ role: string; content: string }>) {
  const data = await chatCompletion({ model, messages }) as any;
  return data.choices?.[0]?.message?.content || "";
}

// ─── Prometheus Self-Heal ───
async function prometheusHeal(
  supabase: any,
  bot: any,
  originalPrompt: string,
  errorMessage: string,
  attempt: number
): Promise<{ newPrompt: string; output: string } | null> {
  console.log(`🔧 Prometheus healing ${bot.name} (attempt ${attempt})...`);
  try {
    const healPrompt = `You are Prometheus, the Meta-Coach AI for the PetID fleet.
A bot named "${bot.name}" (slug: ${bot.slug}) just FAILED with this error:
"${errorMessage}"

Its current system prompt is:
"""
${originalPrompt}
"""

Your job: Rewrite the system prompt to fix the failure. Keep the bot's role and purpose intact.
Rules:
- Output ONLY the new system prompt, nothing else
- Keep it concise (under 500 words)
- Make it more resilient to errors
- Preserve Hebrew language instructions if present`;

    const newPrompt = await callAI("", "google/gemini-2.5-flash", [
      { role: "system", content: healPrompt },
      { role: "user", content: "Rewrite the prompt now." },
    ]);

    if (!newPrompt || newPrompt.length < 20) return null;

    await supabase.from("agent_prompt_versions").insert({
      agent_slug: bot.slug,
      system_prompt: newPrompt,
      is_active: false,
      created_by: "prometheus-self-heal",
    });

    const isApprovalRequired = APPROVAL_REQUIRED_SLUGS.has(bot.slug);
    const approxSuffix = !isApprovalRequired
      ? `\n\nIMPORTANT: Use approximation language: "כ-", "הערכה", "בסביבות". End with: "המידע הוא להעשרה בלבד ואינו מהווה המלצה רפואית או מקצועית."`
      : "";

    const output = await callAI("", "google/gemini-2.5-flash-lite", [
      { role: "system", content: newPrompt + approxSuffix },
      { role: "user", content: `Run your scheduled check. Current time: ${new Date().toISOString()}. Provide a brief status report (max 200 words). Respond in Hebrew.` },
    ]);

    if (!output || output.length < 10) return null;

    await supabase.from("agent_prompt_versions").update({ is_active: false }).eq("agent_slug", bot.slug).eq("is_active", true);
    await supabase.from("agent_prompt_versions").update({ is_active: true, deployed_at: new Date().toISOString() }).eq("agent_slug", bot.slug).eq("created_by", "prometheus-self-heal").order("created_at", { ascending: false }).limit(1);
    await supabase.from("automation_bots").update({ system_prompt: newPrompt, updated_at: new Date().toISOString() }).eq("id", bot.id);

    console.log(`✅ Prometheus healed ${bot.name} successfully on attempt ${attempt}`);
    return { newPrompt, output };
  } catch (healError) {
    console.error(`Prometheus heal failed for ${bot.name}:`, healError);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase credentials missing");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let targetBotId: string | null = null;
    let adminOverride: { command: string; source: string; synergy?: boolean } | null = null;
    let brainDirective: string | null = null;
    try {
      const body = await req.json();
      targetBotId = body?.bot_id || null;
      if (body?.brain_directive) {
        brainDirective = body.brain_directive;
        console.log(`🧠 BRAIN DIRECTIVE received: "${brainDirective}"`);
      }
      if (body?.admin_override) {
        adminOverride = {
          command: body.admin_override.command || "",
          source: body.admin_override.source || "admin-dashboard",
          synergy: body.admin_override.synergy !== false,
        };
        console.log(`🔴 ADMIN OVERRIDE received from ${adminOverride.source}: "${adminOverride.command}"`);
      }
    } catch {
      // No body = run all active bots
    }

    let query = supabase.from("automation_bots").select("*").eq("is_active", true);
    if (targetBotId) query = query.eq("id", targetBotId);

    const { data: bots, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    if (!bots || bots.length === 0) {
      return new Response(JSON.stringify({ message: "No active bots to run", results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── BRAIN DIRECTIVE MODE ───
    let brainDelegations: Map<string, string> | null = null;
    let brainReport: { reasoning: string; conflicts: string[] } | null = null;

    if (brainDirective) {
      console.log(`🧠 Brain analyzing directive and delegating to agents...`);
      const orchestration = await brainOrchestrate(supabase, brainDirective, bots);
      brainReport = { reasoning: orchestration.reasoning, conflicts: orchestration.conflicts };
      brainDelegations = new Map(orchestration.delegations.map(d => [d.slug, d.subCommand]));

      await supabase.from("agent_action_logs").insert({
        action_type: "brain_orchestration",
        description: `🧠 [Brain] ניתוח פקודה: "${brainDirective}"\nהנמקה: ${orchestration.reasoning}\nהאצלה ל: ${orchestration.delegations.map(d => d.slug).join(", ")}${orchestration.conflicts.length ? `\nקונפליקטים: ${orchestration.conflicts.join("; ")}` : ""}`.substring(0, 2000),
        reason: brainDirective,
        expected_outcome: "Delegation to specialized agents",
        actual_outcome: `Delegated to ${orchestration.delegations.length} agents`,
        metadata: { delegations: orchestration.delegations, reasoning: orchestration.reasoning, conflicts: orchestration.conflicts },
      });

      const delegatedSlugs = new Set(orchestration.delegations.map(d => d.slug));
      const filteredBots = bots.filter(b => delegatedSlugs.has(b.slug));
      if (filteredBots.length > 0) {
        bots.length = 0;
        bots.push(...filteredBots);
      }
      console.log(`🧠 Brain delegated to ${bots.length} agents: ${bots.map(b => b.slug).join(", ")}`);
    }

    const results = [];

    for (const bot of bots) {
      try {
        console.log(`Running bot: ${bot.name} (${bot.slug})...`);

        const isApprovalRequired = APPROVAL_REQUIRED_SLUGS.has(bot.slug);
        const approxInstruction = !isApprovalRequired
          ? `\n\nIMPORTANT: Use approximation language: "כ-", "הערכה", "בסביבות". Never give definitive commands. End with: "המידע הוא להעשרה בלבד ואינו מהווה המלצה רפואית או מקצועית."`
          : "";

        const prompt = bot.system_prompt ||
          `You are "${bot.name}", a specialized AI agent for PetID. Your role: ${bot.description || "assist with pet management"}. Capabilities: ${JSON.stringify(bot.capabilities || [])}.${approxInstruction}`;

        // ─── FETCH REAL DATA CONTEXT ───
        const dataContext = await fetchAgentContext(supabase, bot.slug);
        const dataInjection = dataContext
          ? `\n\n=== LIVE DATA FROM DATABASE (use this for your analysis) ===\n${dataContext}\n=== END LIVE DATA ===\n\nAnalyze the above REAL data. Base your report on actual numbers, not hypotheticals.`
          : "";

        let aiOutput: string | null = null;
        let healed = false;
        let healAttempts = 0;

        // ─── Determine user message ───
        const brainSubCommand = brainDelegations?.get(bot.slug);
        const userMessage = brainSubCommand
          ? `🧠 BRAIN DIRECTIVE (Priority 1) — הפקודה שהוקצתה לך:\n"${brainSubCommand}"\n${dataInjection}\n\nבצע את המשימה ודווח על סטטוס הביצוע. Current time: ${new Date().toISOString()}. Respond in Hebrew.`
          : adminOverride
            ? `🔴 ADMIN OVERRIDE (Priority 1) from ${adminOverride.source}:\n"${adminOverride.command}"\n${dataInjection}\n\nExecute this command immediately. Analyze the request, perform the action, and report completion status. Current time: ${new Date().toISOString()}. Respond in Hebrew.`
            : `Run your scheduled check.${dataInjection}\n\nCurrent time: ${new Date().toISOString()}. Provide a detailed status report based on the real data above (max 300 words). Respond in Hebrew.`;

        const useStrongerModel = !!(brainSubCommand || adminOverride);

        // ─── Try running the bot ───
        try {
          aiOutput = await callAI("", useStrongerModel ? "google/gemini-2.5-flash" : "google/gemini-2.5-flash-lite", [
            { role: "system", content: prompt + approxInstruction },
            { role: "user", content: userMessage },
          ]);
        } catch (aiError) {
          const errorMsg = aiError instanceof Error ? aiError.message : String(aiError);
          console.warn(`⚠️ Bot ${bot.name} failed: ${errorMsg}. Engaging Prometheus...`);

          for (let attempt = 1; attempt <= MAX_SELF_HEAL_ATTEMPTS; attempt++) {
            healAttempts = attempt;
            const healResult = await prometheusHeal(supabase, bot, prompt, errorMsg, attempt);
            if (healResult) { aiOutput = healResult.output; healed = true; break; }
          }

          if (!aiOutput) {
            await supabase.from("automation_bots").update({
              last_run_at: new Date().toISOString(),
              health_status: "critical",
              last_error: `Failed after ${healAttempts} self-heal attempts: ${errorMsg}`,
              updated_at: new Date().toISOString(),
            }).eq("id", bot.id);

            await supabase.from("agent_action_logs").insert({
              action_type: "self_heal_failed",
              description: `[Prometheus] Failed to heal "${bot.name}" after ${healAttempts} attempts. Error: ${errorMsg}`,
              reason: errorMsg,
              expected_outcome: "Bot recovery",
              actual_outcome: "All attempts failed — requires manual intervention",
              metadata: { slug: bot.slug, attempts: healAttempts },
            });

            results.push({ bot: bot.name, status: "critical", routed: "none", healed: false, healAttempts, error: errorMsg });
            continue;
          }
        }

        if (!aiOutput) aiOutput = "No output generated";

        // ─── Update bot status ───
        await supabase.from("automation_bots").update({
          last_run_at: new Date().toISOString(),
          last_output: aiOutput,
          health_status: healed ? "healed" : "healthy",
          last_error: healed ? `Self-healed after ${healAttempts} attempt(s)` : null,
          run_count: (bot.run_count || 0) + 1,
          last_health_check: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", bot.id);

        // ─── Log self-heal success ───
        if (healed) {
          await supabase.from("agent_action_logs").insert({
            action_type: "self_heal_success",
            description: `[Prometheus] ✅ Successfully healed "${bot.name}" — prompt rewritten and bot recovered.`,
            reason: `Original failure triggered self-heal`,
            expected_outcome: "Bot recovery via prompt rewrite",
            actual_outcome: "Bot recovered and produced valid output",
            metadata: { slug: bot.slug, attempts: healAttempts },
          });
        }

        // ─── OUTPUT ROUTING ───
        let routed = "stored_only";

        if (isApprovalRequired) {
          const category = SLUG_CATEGORY_MAP[bot.slug] || "general";
          const { error: queueError } = await supabase.from("admin_approval_queue").insert({
            bot_id: bot.id,
            title: `[${bot.name}] דוח אוטומטי — ${new Date().toLocaleDateString("he-IL")}`,
            description: `פלט אוטומטי מהרובוט "${bot.name}" שדורש אישור אדמין.`,
            category,
            status: "pending",
            draft_content: aiOutput,
            proposed_changes: { source: "petid-agent-runner", slug: bot.slug, run_at: new Date().toISOString(), healed, data_enriched: !!dataContext },
          });
          if (!queueError) {
            routed = "approval_queue";
            console.log(`→ ${bot.name} output routed to approval_queue (${category})`);
          }
        } else if (DIRECT_OUTPUT_SLUGS.has(bot.slug)) {
          const { error: logError } = await supabase.from("agent_action_logs").insert({
            action_type: "bot_scheduled_report",
            description: `[${bot.name}] ${aiOutput}`.substring(0, 2000),
            reason: "Scheduled automated check",
            expected_outcome: "Informational report for admin dashboard",
            metadata: { slug: bot.slug, run_at: new Date().toISOString(), routed: "direct", healed, data_enriched: !!dataContext },
          });
          if (!logError) {
            routed = "direct_log";
            console.log(`→ ${bot.name} output routed to action_logs (informational)`);
          }
        }

        // ─── ADMIN OVERRIDE: Log + Synergy ───
        if (adminOverride) {
          await supabase.from("agent_action_logs").insert({
            action_type: "admin_override_executed",
            bot_id: bot.id,
            description: `[${bot.name}] ביצע פקודת Admin Override: "${adminOverride.command}"`.substring(0, 2000),
            reason: `Admin Override (Priority 1) from ${adminOverride.source}`,
            expected_outcome: adminOverride.command,
            actual_outcome: aiOutput?.substring(0, 500) || "No output",
            metadata: { slug: bot.slug, source: adminOverride.source, override: true, healed },
          });

          if (adminOverride.synergy && SYNERGY_MAP[bot.slug]) {
            const synergyPartners = SYNERGY_MAP[bot.slug];
            console.log(`🔗 Synergy: ${bot.name} triggering partners: ${synergyPartners.join(", ")}`);
            for (const partnerSlug of synergyPartners) {
              const { data: partnerBots } = await supabase.from("automation_bots").select("id, name, slug").eq("slug", partnerSlug).eq("is_active", true).limit(1);
              if (partnerBots && partnerBots.length > 0) {
                await supabase.from("agent_action_logs").insert({
                  action_type: "synergy_notification",
                  bot_id: partnerBots[0].id,
                  description: `[סינרגיה] ${bot.name} → ${partnerBots[0].name}: "${adminOverride.command}"`.substring(0, 2000),
                  reason: `Admin Override synergy from ${bot.name}`,
                  expected_outcome: `${partnerBots[0].name} reviews and acts on related aspects`,
                  metadata: { source_slug: bot.slug, target_slug: partnerSlug, command: adminOverride.command },
                });
              }
            }
          }
        }

        results.push({ bot: bot.name, status: healed ? "healed" : "success", routed, healed, healAttempts, adminOverride: !!adminOverride, dataEnriched: !!dataContext });
      } catch (botError) {
        console.error(`Error running bot ${bot.name}:`, botError);
        await supabase.from("automation_bots").update({
          last_run_at: new Date().toISOString(),
          health_status: "error",
          last_error: botError instanceof Error ? botError.message : "Unknown error",
          updated_at: new Date().toISOString(),
        }).eq("id", bot.id);
        results.push({ bot: bot.name, status: "error", routed: "none", error: String(botError) });
      }
    }

    const successCount = results.filter((r) => r.status === "success" || r.status === "healed").length;
    const healedCount = results.filter((r) => r.status === "healed").length;
    const criticalCount = results.filter((r) => r.status === "critical").length;
    const approvalCount = results.filter((r) => r.routed === "approval_queue").length;
    const directCount = results.filter((r) => r.routed === "direct_log").length;
    const enrichedCount = results.filter((r: any) => r.dataEnriched).length;

    // ─── BRAIN DIRECTIVE: Chain report ───
    if (brainDirective && brainReport) {
      const chainStatus = results.map(r => `• ${r.bot}: ${r.status}${r.routed !== "none" ? ` → ${r.routed}` : ""}`).join("\n");
      await supabase.from("agent_action_logs").insert({
        action_type: "brain_chain_report",
        description: `🧠 [Brain] דוח שרשרת ביצוע:\nפקודה: "${brainDirective}"\nהנמקה: ${brainReport.reasoning}\n${brainReport.conflicts.length ? `⚠️ קונפליקטים: ${brainReport.conflicts.join("; ")}\n` : ""}סטטוס סוכנים:\n${chainStatus}`.substring(0, 2000),
        reason: brainDirective,
        expected_outcome: "Full chain execution report",
        actual_outcome: `${successCount}/${results.length} succeeded`,
        metadata: { directive: brainDirective, reasoning: brainReport.reasoning, conflicts: brainReport.conflicts, chain: results },
      });
    }

    return new Response(
      JSON.stringify({
        message: `Executed ${results.length} bots: ${successCount} success (${healedCount} self-healed), ${criticalCount} critical, ${approvalCount} → approval queue, ${directCount} → direct logs, ${enrichedCount} data-enriched`,
        results,
        ...(brainReport ? { brain: brainReport } : {}),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Agent runner error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
