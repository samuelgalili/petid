import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, sku, category } = await req.json();
    
    if (!productName && !sku) {
      return new Response(
        JSON.stringify({ error: "Product name or SKU is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const searchQuery = sku || productName;
    const categoryContext = category ? `Category: ${category}` : "";
    
    const systemPrompt = `You are a pet products expert assistant. You help enrich product data for a pet store.
Given a product name or SKU, provide accurate product information in Hebrew.
Focus on pet products - food, treats, toys, accessories, health products, grooming supplies.
If you're not sure about specific details, provide reasonable estimates based on similar products.
Always respond in valid JSON format.`;

    const userPrompt = `Enrich this pet product:
Product: ${searchQuery}
${categoryContext}

Return a JSON object with:
{
  "description": "תיאור מוצר מפורט בעברית (2-3 משפטים)",
  "dimensions": "מידות המוצר אם רלוונטי (לדוגמה: 30x20x10 ס\"מ)",
  "colors": ["רשימת צבעים זמינים"],
  "flavors": ["רשימת טעמים אם רלוונטי למזון/חטיפים"],
  "feedingGuide": "הוראות האכלה מומלצות אם זה מזון (לפי משקל הכלב/חתול)",
  "brandWebsite": "כתובת אתר המותג הרשמי",
  "suggestedPrice": מחיר מומלץ בש״ח (מספר בלבד),
  "priceReason": "הסבר קצר למחיר המומלץ",
  "petType": "dog" או "cat" או "both" או "other",
  "imageSearchQuery": "search query in English to find product image"
}

If a field is not applicable, use null.`;

    console.log("Enriching product:", searchQuery);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI request failed: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response:", content);

    // Parse JSON from response (handle markdown code blocks)
    let enrichedData;
    try {
      let jsonStr = content;
      // Remove markdown code blocks if present
      if (jsonStr.includes("```json")) {
        jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (jsonStr.includes("```")) {
        jsonStr = jsonStr.replace(/```\n?/g, "");
      }
      enrichedData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Return partial data if parsing fails
      enrichedData = {
        description: content.substring(0, 200),
        suggestedPrice: null,
        priceReason: "Unable to determine price",
      };
    }

    return new Response(
      JSON.stringify({ success: true, data: enrichedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error enriching product:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
