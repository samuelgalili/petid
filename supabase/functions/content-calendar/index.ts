import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: adminRole } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { week_start } = await req.json();

    // Gather real data for context-aware templates
    const [
      { data: pets },
      { data: breedInfo },
      { data: nrcRules },
      { data: scannedDocs },
      { data: recentPosts },
    ] = await Promise.all([
      supabase.from("pets").select("id, name, breed, weight, date_of_birth, medical_conditions, city").limit(20),
      supabase.from("breed_information").select("breed_name, health_issues, dietary_notes, exercise_needs").limit(15),
      supabase.from("breed_disease_diet_rules").select("disease, diet, avoid, required_nutrients").limit(10),
      supabase.from("admin_data_sources").select("title, extracted_data").eq("is_active", true).limit(5),
      supabase.from("blog_posts").select("title, tags").order("created_at", { ascending: false }).limit(10),
    ]);

    // Build personalized pet context
    const petProfiles = (pets || []).map((p: any) => 
      `${p.name} (${p.breed || "Unknown"}, ${p.weight || "?"}kg, ${p.city || ""})`
    ).join("; ");

    const nrcContext = (nrcRules || []).map((r: any) =>
      `Disease: ${r.disease} → Diet: ${r.diet}, Avoid: ${(r.avoid || []).join(",")}, Need: ${(r.required_nutrients || []).join(",")}`
    ).join("\n");

    const breedContext = (breedInfo || []).map((b: any) =>
      `${b.breed_name}: Health=${(b.health_issues || []).join(",")}, Diet=${b.dietary_notes || "N/A"}`
    ).join("\n");

    const recentTopics = (recentPosts || []).map((p: any) => p.title).join(", ");

    const startDate = week_start || new Date().toISOString().split("T")[0];

    const systemPrompt = `You are Lumi, the PetID Creative AI Director. Generate a 7-day content calendar for the week starting ${startDate}.

GANTT LOGIC (CRITICAL):
- Monday: Educational / NRC Insight — science-based nutrition tip referencing NRC 2006
- Wednesday: Social Proof — user success story from pet health data (weight goals, recovery)
- Friday: Commercial — insurance deal or product promotion
- Other days: Mix of pet care tips, push notifications, and community engagement

RULES:
1. Output MUST be valid JSON array with exactly 7 objects (one per day).
2. Each day object: { "day": "YYYY-MM-DD", "items": [...] }
3. Each item: { "type": "blog_post"|"social_caption"|"pet_care_tip"|"push_notification"|"email_newsletter", "title": "...", "draft": "...", "channel": "feed"|"email"|"whatsapp"|"push", "pet_context": "...", "lumi_category": "educational"|"social_proof"|"commercial"|"engagement"|"tip", "hashtags": ["...", "..."] }
4. Use REAL pet names and locations from the data below.
5. Every nutritional tip MUST reference NRC 2006 standards.
6. All content in Hebrew. Brand voice: high-end, scientific yet emotional, minimalist.
7. Mix content types: 2 blog posts, 3 social captions, 5 pet care tips, 3 push notifications, 1 email newsletter.
8. Never repeat topics from recent posts.
9. Use PetID branding only.
10. For WhatsApp/SMS items, ALWAYS end draft with: "להסרה השב הסר"
11. Include visual_description field for items that need images (describe what image to create).

PET PROFILES:
${petProfiles}

NRC 2006 DIET RULES:
${nrcContext}

BREED DATA:
${breedContext}

SCANNED DOCUMENTS:
${(scannedDocs || []).map((d: any) => d.title).join(", ")}

RECENT POSTS (avoid repeating):
${recentTopics}

Return ONLY the JSON array, no markdown fences.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a 7-day Lumi content calendar starting ${startDate}. Follow the Mon=Educational, Wed=Social, Fri=Commercial Gantt schedule. Use pet names like ${(pets || []).slice(0, 3).map((p: any) => p.name).join(", ")}. Every nutrition claim must cite NRC 2006. WhatsApp messages must end with unsubscribe option.` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required — add credits" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      throw new Error(`AI gateway error: ${response.status} - ${errText}`);
    }

    const aiResult = await response.json();
    let rawContent = aiResult.choices?.[0]?.message?.content || "[]";
    
    // Strip markdown fences if present
    rawContent = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let calendar;
    try {
      calendar = JSON.parse(rawContent);
    } catch {
      // Try to extract JSON array from response
      const match = rawContent.match(/\[[\s\S]*\]/);
      if (match) {
        calendar = JSON.parse(match[0]);
      } else {
        throw new Error("Failed to parse calendar JSON from AI response");
      }
    }

    // Create approval tasks for each item
    const { data: bot } = await supabase
      .from("agent_bots").select("id").eq("slug", "content-creation").maybeSingle();

    if (bot && Array.isArray(calendar)) {
      for (const day of calendar) {
        if (!day.items || !Array.isArray(day.items)) continue;
        for (const item of day.items) {
          await supabase.from("agent_tasks").insert({
            bot_id: bot.id,
            title: item.title || `Content: ${item.type}`,
            description: `יום: ${day.day} | סוג: ${item.type} | ערוץ: ${item.channel || "feed"} | קטגוריה: ${item.lumi_category || "general"}${item.pet_context ? ` | ${item.pet_context}` : ""}`,
            task_type: "content-creation",
            priority: "medium",
            requires_approval: true,
            status: "pending_approval",
            scheduled_for: day.day,
            reason: "Lumi Content Calendar — תוכן שנוצר אוטומטית דורש אישור",
            expected_outcome: `פרסום ב-${item.channel || "feed"} בתאריך ${day.day}`,
            payload: {
              draft_content: item.draft,
              content_type: item.type,
              channel: item.channel,
              scheduled_date: day.day,
              pet_context: item.pet_context,
              calendar_week: startDate,
              lumi_category: item.lumi_category,
              hashtags: item.hashtags,
              visual_description: item.visual_description,
              has_unsubscribe: item.channel === "whatsapp" || item.channel === "sms",
            },
          });
        }
      }

      await supabase.from("agent_action_logs").insert({
        bot_id: bot.id,
        action_type: "calendar_generated",
        description: `Generated weekly content calendar for ${startDate} with ${calendar.reduce((sum: number, d: any) => sum + (d.items?.length || 0), 0)} items`,
        reason: "Automated Content Calendar generation",
        expected_outcome: "All items sent to approval queue",
      });
    }

    return new Response(JSON.stringify({
      calendar,
      week_start: startDate,
      total_items: Array.isArray(calendar) ? calendar.reduce((sum: number, d: any) => sum + (d.items?.length || 0), 0) : 0,
      status: "pending_approval",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Content calendar error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
