import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function searchProductBySku(sku: string, apiKey: string): Promise<string | null> {
  try {
    console.log("Searching for SKU:", sku);
    
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${sku} pet product Israel מוצר לחיות מחמד`,
        limit: 5,
        scrapeOptions: {
          formats: ["markdown"],
        },
      }),
    });

    if (!response.ok) {
      console.error("Firecrawl search error:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("Firecrawl search results:", JSON.stringify(data).substring(0, 500));
    
    // Combine all search results into one context
    let combinedContent = "";
    if (data.data && Array.isArray(data.data)) {
      for (const result of data.data) {
        combinedContent += `\n\nSource: ${result.url}\nTitle: ${result.title || ""}\nContent: ${result.markdown || result.description || ""}\n`;
      }
    }
    
    return combinedContent || null;
  } catch (error) {
    console.error("Error searching product:", error);
    return null;
  }
}

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
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // If SKU is provided, search the web first
    let webSearchContext = "";
    if (sku && FIRECRAWL_API_KEY) {
      const searchResults = await searchProductBySku(sku, FIRECRAWL_API_KEY);
      if (searchResults) {
        webSearchContext = searchResults;
        console.log("Found web search context for SKU");
      }
    }

    const searchQuery = sku || productName;
    const categoryContext = category ? `Category: ${category}` : "";
    
    const systemPrompt = `You are a pet products expert assistant for an Israeli pet store called "PetID" (פטאיידי).
You help enrich product data based on SKU numbers or product names.
Your responses should be in Hebrew and match the brand voice of PetID - friendly, professional, and pet-loving.
Focus on pet products - food, treats, toys, accessories, health products, grooming supplies.
When analyzing web search results, extract accurate product information.
Always respond in valid JSON format.`;

    const userPrompt = `Enrich this pet product based on the following information:
${sku ? `SKU/מק"ט: ${sku}` : ""}
${productName ? `Product Name: ${productName}` : ""}
${categoryContext}

${webSearchContext ? `
Web Search Results (use this to extract accurate product information):
${webSearchContext}
` : ""}

Return a JSON object with all these fields (use null if not applicable or unknown):
{
  "name": "שם המוצר בעברית (אם נמצא ברשת, תרגם לעברית)",
  "description": "תיאור מוצר מפורט בעברית בסגנון של פטאיידי - ידידותי ומקצועי (2-3 משפטים)",
  "petType": "dog" או "cat" או "both" או "other",
  "category": "קטגוריה - אוכל יבש/אוכל רטוב/חטיפים/צעצועים/אביזרים/טיפוח/בריאות/אחר",
  "dimensions": "מידות המוצר אם רלוונטי (לדוגמה: 30x20x10 ס\"מ)",
  "sizes": ["רשימת גדלים זמינים אם יש - S, M, L או משקל כמו 2 ק\"ג, 4 ק\"ג"],
  "colors": ["רשימת צבעים זמינים"],
  "flavors": ["רשימת טעמים אם רלוונטי למזון/חטיפים"],
  "benefits": ["יתרונות המוצר - 3-5 יתרונות עיקריים"],
  "feedingGuide": "הוראות האכלה מומלצות אם זה מזון (לפי משקל הכלב/חתול)",
  "brandWebsite": "כתובת אתר המותג הרשמי הבינלאומי (לא האתר שמכר את המוצר)",
  "suggestedPrice": מחיר מומלץ בש״ח לפי מחירי השוק בישראל - המחיר הגבוה (מספר בלבד),
  "priceReason": "הסבר קצר למחיר המומלץ - מאיפה נלקח המחיר",
  "imageSearchQuery": "search query in English to find product image on Google Images"
}

Important:
- For price, use the HIGHER price found in Israeli market
- For brand website, use the international brand's official website, NOT the Israeli retailer
- Description should be in PetID's friendly, professional Hebrew style
- If this is food, include detailed feeding guide based on manufacturer recommendations`;

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
