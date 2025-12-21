import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchResult {
  content: string;
  imageUrls: string[];
}

async function searchProduct(query: string, apiKey: string, isSku: boolean): Promise<SearchResult | null> {
  try {
    const searchQuery = isSku 
      ? `${query} pet product Israel מוצר לחיות מחמד barcode`
      : `${query} pet product Israel מוצר לחיות מחמד מחיר`;
    
    console.log("Searching for:", searchQuery, "isSku:", isSku);
    
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5,
        scrapeOptions: {
          formats: ["markdown", "html"],
        },
      }),
    });

    if (!response.ok) {
      console.error("Firecrawl search error:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("Firecrawl search results:", JSON.stringify(data).substring(0, 1000));
    
    // Combine all search results and extract image URLs
    let combinedContent = "";
    const imageUrls: string[] = [];
    
    if (data.data && Array.isArray(data.data)) {
      for (const result of data.data) {
        combinedContent += `\n\nSource: ${result.url}\nTitle: ${result.title || ""}\nContent: ${result.markdown || result.description || ""}\n`;
        
        // Extract image URLs from markdown
        const markdown = result.markdown || "";
        const imgMatches = markdown.matchAll(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g);
        for (const match of imgMatches) {
          const imgUrl = match[1];
          // Filter for likely product images
          if (imgUrl && 
              !imgUrl.includes('logo') && 
              !imgUrl.includes('icon') && 
              !imgUrl.includes('avatar') &&
              !imgUrl.includes('placeholder') &&
              (imgUrl.includes('.jpg') || imgUrl.includes('.jpeg') || imgUrl.includes('.png') || imgUrl.includes('.webp') || imgUrl.includes('product'))) {
            imageUrls.push(imgUrl);
          }
        }
        
        // Also check for img src in HTML
        const html = result.html || "";
        const srcMatches = html.matchAll(/src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi);
        for (const match of srcMatches) {
          const imgUrl = match[1];
          if (imgUrl && 
              !imgUrl.includes('logo') && 
              !imgUrl.includes('icon') && 
              !imgUrl.includes('avatar') &&
              !imgUrl.includes('placeholder')) {
            imageUrls.push(imgUrl);
          }
        }
      }
    }
    
    console.log("Found", imageUrls.length, "potential product images");
    
    return { content: combinedContent, imageUrls };
  } catch (error) {
    console.error("Error searching product:", error);
    return null;
  }
}

async function searchProductImage(query: string, apiKey: string): Promise<string | null> {
  try {
    console.log("Searching for product image:", query);
    
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${query} product image`,
        limit: 3,
        scrapeOptions: {
          formats: ["markdown"],
        },
      }),
    });

    if (!response.ok) {
      console.error("Firecrawl image search error:", response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.data && Array.isArray(data.data)) {
      for (const result of data.data) {
        const markdown = result.markdown || "";
        // Look for image URLs in markdown
        const imgMatches = markdown.matchAll(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g);
        for (const match of imgMatches) {
          const imgUrl = match[1];
          if (imgUrl && 
              !imgUrl.includes('logo') && 
              !imgUrl.includes('icon') &&
              !imgUrl.includes('avatar') &&
              (imgUrl.includes('.jpg') || imgUrl.includes('.jpeg') || imgUrl.includes('.png') || imgUrl.includes('.webp'))) {
            console.log("Found product image:", imgUrl);
            return imgUrl;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error searching product image:", error);
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

    // Search the web for product info
    let webSearchContext = "";
    let foundImageUrls: string[] = [];
    
    if (FIRECRAWL_API_KEY) {
      const searchQuery = sku || productName;
      const isSku = !!sku;
      const searchResults = await searchProduct(searchQuery, FIRECRAWL_API_KEY, isSku);
      if (searchResults) {
        webSearchContext = searchResults.content;
        foundImageUrls = searchResults.imageUrls;
        console.log("Found web search context for", isSku ? "SKU" : "product name");
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
  "imageSearchQuery": "search query in English to find product image - be specific with brand and product name"
}

Important:
- For price, use the HIGHER price found in Israeli market
- For brand website, use the international brand's official website, NOT the Israeli retailer
- Description should be in PetID's friendly, professional Hebrew style
- If this is food, include detailed feeding guide based on manufacturer recommendations
- For imageSearchQuery, include the exact brand name and product name in English`;

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

    // Add found image URLs to the response
    if (foundImageUrls.length > 0) {
      enrichedData.imageUrl = foundImageUrls[0];
      enrichedData.allImageUrls = foundImageUrls.slice(0, 5); // Return up to 5 images
      console.log("Adding image URL to response:", foundImageUrls[0]);
    } else if (enrichedData.imageSearchQuery && FIRECRAWL_API_KEY) {
      // If no images found in initial search, try a dedicated image search
      console.log("No images in initial search, trying dedicated image search");
      const imageUrl = await searchProductImage(enrichedData.imageSearchQuery, FIRECRAWL_API_KEY);
      if (imageUrl) {
        enrichedData.imageUrl = imageUrl;
        enrichedData.allImageUrls = [imageUrl];
      }
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
