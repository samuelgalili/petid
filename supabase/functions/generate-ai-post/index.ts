import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { trends, petStats, ocrInsights, breedDistribution } = await req.json();

    const systemPrompt = `You are PetID's Content Strategist AI. Your job is to generate a helpful "Daily Tip" post for pet owners based on trending topics and user data.

RULES:
- Write in Hebrew (RTL)
- Keep it professional but warm
- Focus on actionable health/care advice
- Never use forbidden words: Amazing, Must-have, Best, Deal, Hurry, Perfect
- Use allowed language: Recommended, Not required, Not suitable, Better to wait
- Include relevant emoji
- Generate both Hebrew and English versions
- If a medical topic, be cautious and suggest consulting a vet

OUTPUT FORMAT (JSON):
{
  "title_he": "כותרת בעברית",
  "title_en": "Title in English",
  "caption_he": "תוכן הפוסט בעברית (2-3 פסקאות קצרות)",
  "caption_en": "Post content in English (2-3 short paragraphs)",
  "target_species": "dog" | "cat" | "all",
  "target_age": "puppy" | "adult" | "senior" | "all",
  "medical_tags": ["relevant", "tags"],
  "target_city": "city name or null",
  "trend_summary": "One sentence explaining the detected trend",
  "urgency": "low" | "medium" | "high",
  "suggested_products": ["product type suggestions for shoppable tagging"]
}`;

    const userPrompt = `Here is the current data:

TRENDING TOPICS FROM USER CHATS:
${trends || "No specific trends detected"}

PET POPULATION STATS:
${petStats || "No stats available"}

OCR-EXTRACTED MEDICAL INSIGHTS (from uploaded vet documents):
${ocrInsights || "No OCR data available"}

BREED DISTRIBUTION:
${breedDistribution || "No breed data available"}

Based on this data, identify the most important trend or common issue and generate a "Daily Tip" post that addresses it. Target the post to the specific breeds, age groups, and medical conditions that are most relevant. Make it helpful and specific.`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_daily_tip",
              description: "Generate a structured daily tip post for pet owners",
              parameters: {
                type: "object",
                properties: {
                  title_he: { type: "string", description: "Hebrew title" },
                  title_en: { type: "string", description: "English title" },
                  caption_he: { type: "string", description: "Hebrew post content" },
                  caption_en: { type: "string", description: "English post content" },
                  target_species: { type: "string", enum: ["dog", "cat", "all"] },
                  target_age: { type: "string", enum: ["puppy", "adult", "senior", "all"] },
                  medical_tags: { type: "array", items: { type: "string" } },
                  target_city: { type: "string" },
                  trend_summary: { type: "string" },
                  urgency: { type: "string", enum: ["low", "medium", "high"] },
                  suggested_products: { type: "array", items: { type: "string" } },
                },
                required: ["title_he", "title_en", "caption_he", "caption_en", "target_species", "target_age", "trend_summary", "urgency"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_daily_tip" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    
    // Extract tool call result
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const generatedPost = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ post: generatedPost }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-ai-post error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
