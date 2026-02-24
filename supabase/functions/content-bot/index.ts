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

    // Verify admin
    const { data: adminRole } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { content_type, pet_id, topic, extra_instructions } = await req.json();

    // Gather data sources
    const [
      { data: petData },
      { data: breedData },
      { data: scannedDocs },
    ] = await Promise.all([
      pet_id
        ? supabase.from("pets").select("*").eq("id", pet_id).maybeSingle()
        : Promise.resolve({ data: null }),
      pet_id
        ? supabase.from("pets").select("breed").eq("id", pet_id).maybeSingle().then(async (r) => {
            if (r.data?.breed) {
              const { data } = await supabase.from("breed_information").select("*").ilike("breed_name", `%${r.data.breed}%`).maybeSingle();
              return { data };
            }
            return { data: null };
          })
        : Promise.resolve({ data: null }),
      supabase.from("admin_data_sources").select("title, extracted_data").eq("is_active", true).limit(5),
    ]);

    // Fetch NRC diet rules if pet has medical conditions
    let nrcRules = null;
    if (petData?.medical_conditions) {
      const conditions = Array.isArray(petData.medical_conditions) ? petData.medical_conditions : [];
      if (conditions.length > 0) {
        const { data } = await supabase
          .from("breed_disease_diet_rules")
          .select("*")
          .in("disease", conditions)
          .limit(5);
        nrcRules = data;
      }
    }

    const petContext = petData
      ? `Pet: ${petData.name}, Breed: ${petData.breed || "Unknown"}, Weight: ${petData.weight || "Unknown"}kg, Age: ${petData.date_of_birth || "Unknown"}, Medical: ${JSON.stringify(petData.medical_conditions || [])}`
      : "No specific pet selected — generate general content.";

    const breedContext = breedData
      ? `Breed Info: ${JSON.stringify({
          name: breedData.breed_name,
          health_issues: breedData.health_issues,
          dietary_notes: breedData.dietary_notes,
          exercise_needs: breedData.exercise_needs,
          temperament: breedData.temperament,
        })}`
      : "";

    const nrcContext = nrcRules && nrcRules.length > 0
      ? `NRC 2006 Diet Rules: ${JSON.stringify(nrcRules)}`
      : "";

    const scannedContext = scannedDocs && scannedDocs.length > 0
      ? `Scanned Documents: ${scannedDocs.map((d: any) => d.title).join(", ")}`
      : "";

    const contentTypePrompts: Record<string, string> = {
      blog_post: "Write a professional, informative blog post (600-800 words) in Hebrew. Include headings, bullet points, and a conclusion.",
      social_caption: "Write 3 engaging social media captions in Hebrew (for Instagram/Facebook). Each should be 2-3 sentences, include relevant emojis, and end with 3-5 hashtags.",
      pet_care_tip: "Write 5 personalized pet care tips in Hebrew based on the pet's profile. Each tip should be 2-3 sentences with scientific backing from NRC 2006 where relevant.",
      infographic_brief: "Create a detailed creative brief for an infographic in Hebrew. Include: Title, 5-7 key data points, suggested visual layout, color scheme, and call-to-action. The infographic should be based on the pet's specific needs.",
    };

    const systemPrompt = `You are the PetID Content Creation Bot — an AI content engine that produces fact-based, personalized pet care content.

RULES:
1. All content MUST be in Hebrew.
2. All nutritional claims MUST reference NRC 2006 standards.
3. Content must be personalized to the pet's profile when available.
4. Never make medical diagnoses — suggest consulting a veterinarian.
5. Use PetID branding only — never mention "Vet Life".
6. Content goes through admin approval before publishing.

DATA CONTEXT:
${petContext}
${breedContext}
${nrcContext}
${scannedContext}

CONTENT TYPE: ${contentTypePrompts[content_type] || contentTypePrompts.blog_post}
${extra_instructions ? `\nADDITIONAL INSTRUCTIONS: ${extra_instructions}` : ""}
${topic ? `\nTOPIC: ${topic}` : ""}`;

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
          { role: "user", content: topic || `Generate ${content_type} content for PetID.` },
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
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      throw new Error(`AI gateway error: ${response.status} - ${errText}`);
    }

    const aiResult = await response.json();
    const generatedContent = aiResult.choices?.[0]?.message?.content || "";

    // Create an approval task
    const { data: bot } = await supabase
      .from("agent_bots").select("id").eq("slug", "content-creation").maybeSingle();

    if (bot) {
      await supabase.from("agent_tasks").insert({
        bot_id: bot.id,
        title: `תוכן חדש: ${topic || content_type}`,
        description: `סוג: ${content_type}${petData ? ` | חיה: ${petData.name}` : ""}`,
        task_type: "content-creation",
        priority: "medium",
        requires_approval: true,
        status: "pending_approval",
        reason: "תוכן שנוצר על ידי AI דורש אישור אדמין לפני פרסום",
        expected_outcome: "פרסום תוכן מאושר לפיד/בלוג",
        payload: {
          draft_content: generatedContent,
          content_type,
          pet_id: pet_id || null,
          topic: topic || null,
        },
      });

      await supabase.from("agent_action_logs").insert({
        bot_id: bot.id,
        action_type: "content_generated",
        description: `Generated ${content_type}: ${(topic || "auto-generated").substring(0, 200)}`,
        reason: "Content Creation Bot generated new content",
        expected_outcome: "Content sent to approval queue",
      });
    }

    return new Response(JSON.stringify({
      content: generatedContent,
      content_type,
      status: "pending_approval",
      message: "התוכן נוצר בהצלחה ונשלח לתור האישורים",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Content bot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
