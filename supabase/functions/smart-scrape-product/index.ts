import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Step 1: Scrape with Firecrawl ──
    console.log("Scraping URL:", url);
    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "html", "links"],
        onlyMainContent: false,
        waitFor: 3000,
      }),
    });

    const scrapeData = await scrapeRes.json();
    if (!scrapeRes.ok || !scrapeData.success) {
      console.error("Firecrawl error:", scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to scrape page: " + (scrapeData.error || scrapeRes.status) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const html = scrapeData.data?.html || scrapeData.html || "";
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

    // Extract main image from HTML
    const ogImage = metadata?.ogImage || metadata?.["og:image"] || "";
    const imageMatch = html.match(/<img[^>]+class="[^"]*(?:wp-post-image|woocommerce-product-gallery__image|product-image)[^"]*"[^>]+src="([^"]+)"/i)
      || html.match(/<div[^>]+class="[^"]*woocommerce-product-gallery[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i)
      || html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
    const mainImage = ogImage || (imageMatch ? imageMatch[1] : "");

    console.log("Scraped successfully, markdown length:", markdown.length, "image:", mainImage ? "found" : "none");

    // ── Step 2: Send to LLM for structured extraction ──
    const extractionPrompt = `You are a product data extraction specialist for a pet e-commerce platform that sells BOTH food AND accessories (collars, leashes, toys, beds, grooming tools).

Analyze the following scraped product page content and extract ALL data into the exact JSON structure below.

CATEGORY DETECTION - CRITICAL:
- If the page contains keywords like "מחסום", "muzzle", "זמם" → set category to "muzzles"
- If the page contains keywords like "חטיף", "treat", "snack", "חטיפון", "מקל לעיסה", "עצם לעיסה", "לעיסה", "chew", "פרס", "reward", "זרעי דלעת" → set category to "treats"
- If the page contains keywords like "שימורים", "פטה", "pate", "paté", "פחית", "canned", "wet food", "מזון רטוב" AND/OR weight ~400g → set category to "wet-food"
- If the page contains keywords like "collar", "קולר", "צווארון", "רצועה", "leash", "harness", "הרנס", "מיטה", "bed", "toy", "צעצוע", "nylon", "ניילון", "D-ring", "buckle", "אבזם", "quick-release", "שחרור מהיר" → set category to "accessories"
- If the page contains keywords like "מזון", "food", "kibble" → set category to "dry-food" or "food"
- For WET FOOD: populate product_attributes with texture (e.g. "פטה", "נתחים ברוטב", "מוס"), origin/made_in (e.g. "איטליה", "Italy"), moisture_pct if mentioned. If text mentions glucosamine/chondroitin/מפרקים, note joint_support: true. If text mentions hydration/כליות/kidney/לחות, note hydration_support: true. Also extract mixing_tip if topper/mixed feeding is mentioned.
- For accessories/muzzles: populate product_attributes with technical specs (material, size, color, features, closure, dimensions, care_instructions)
- For muzzles specifically: map "היקף" to "circumference", "אורך" to "length", extract size_number, and add breed_recommendations as an array of breed names
- For TREATS/SNACKS: populate product_attributes with texture (e.g. "קשה", "רך"), purpose (e.g. "פרס אילוף", "העסקה ולעיסה"), safety_tip (e.g. "מומלץ לעיסה בפיקוח"), and highlight special ingredients like "זרעי דלעת", "כבד עוף"
- For food: populate product_attributes with nutritional values (protein_pct, fat_pct, fiber_pct, moisture_pct, ash_pct)

RULES:
- Extract EXACTLY what is on the page. Do NOT invent or hallucinate data.
- For Hebrew text, keep it in Hebrew.
- For FOOD products:
  - feeding_guide: Extract EVERY row from feeding tables. Format: { "range": "weight range text", "amount": "daily amount text" }
  - ingredients: Extract the FULL ingredients list as a single string
  - benefits: Health benefits as [{ "title": "name", "description": "short description" }]
- For TREAT/SNACK products:
  - Extract ingredients as a single string
  - feeding_guide: Use for serving suggestions if available, otherwise empty array []
  - benefits: Extract health benefits focusing on ingredient-derived advantages. Map specific ingredients to health claims:
    - Chicken liver / כבד עוף → "תמיכה בשרירים" (Muscle Support)
    - Pumpkin seeds / זרעי דלעת → "סיוע בעיכול" (Digestion Aid)
    - Fatty acids / חומצות שומן / אומגה → "פרווה בריאה" (Shiny Coat)
    - Long chew / לעיסה ממושכת → "הפגת מתח" (Stress Relief)
    - Teeth cleaning / ניקוי שיניים / dental → "היגיינת שיניים" (Dental Hygiene)
  - special_diet: Include texture and natural claims like ["טבעי", "ללא חומרים משמרים", "ללא צבעים"]
  - In product_attributes, include:
    - texture: describe the chew texture in Hebrew (e.g. "קשה ועמיד", "לעיסתי ועמיד", "רך")
    - chew_duration: integer 1-5 (1=very short, 2=short, 3=medium, 4=long, 5=very long). If product name includes "Donut", "דונאט", "Bone", or "עצם", default to 4+
    - protein_pct: extract protein percentage if mentioned (e.g. "70% protein" → 70)
    - purpose: usage purpose (e.g. "פרס אילוף", "העסקה ולעיסה ממושכת")
    - safety_tip: safety recommendation if applicable (e.g. "מומלץ לעיסה בפיקוח")
  - PRIORITY RULE: If product name includes "Donut"/"דונאט"/"Bone"/"עצם", always extract chew_duration and dental-related benefits first
- For ACCESSORY products:
  - Set feeding_guide to empty array []
  - Set ingredients to null
  - In product_attributes, include: material, size, color, features (as comma-separated text), closure type, dimensions, and care_instructions (e.g. "ניקוי במטלית לחה")
  - For MUZZLE products specifically: in product_attributes also include circumference (map from "היקף"), length (map from "אורך"), size_number, and breed_recommendations as an array of Hebrew breed names the muzzle fits (e.g. ["ברניז", "באסט האונד", "רוטוויילר"])
  - benefits: Product features/advantages as [{ "title": "name", "description": "short description" }]
- category: one of: dry-food, wet-food, treats, toys, grooming, health, food, accessories, collars, leashes, beds, clothing, muzzles. Use null if unclear.
- PRIORITY RULE: If product weight is ~400g and keywords like "Pate"/"פטה"/"Can"/"פחית"/"שימורים" appear, always set category to "wet-food" and extract hydration/moisture benefits first
- pet_type: dog, cat, or all.
- life_stage: puppy, kitten, adult, senior, all. Use null if unclear.
- dog_size: small, medium, large, all. Use null if unclear.
- brand: Extract the brand/manufacturer name.
- special_diet: Array of dietary features (food) or product features (accessories) like ["grain-free"] or ["reflective", "padded"].

Return ONLY valid JSON, no markdown fences, no explanation.

JSON STRUCTURE:
{
  "name": "string",
  "brand": "string or null",
  "price": number or 0,
  "sale_price": number or null,
  "original_price": number or null,
  "description": "string",
  "ingredients": "string or null",
  "benefits": [{"title":"string","description":"string"}],
  "feeding_guide": [{"range":"string","amount":"string"}],
  "product_attributes": {},
  "category": "string or null",
  "pet_type": "string",
  "life_stage": "string or null",
  "dog_size": "string or null",
  "special_diet": ["string"],
  "sku": "string or null",
  "weight_text": "string or null"
}

PAGE CONTENT:
${markdown.slice(0, 12000)}`;

    console.log("Sending to AI for extraction...");
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: extractionPrompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded, try again shortly" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ success: false, error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: false, error: "AI extraction failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse the JSON from LLM response (strip markdown fences if any)
    let extracted: any;
    try {
      const jsonStr = rawContent.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      extracted = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", rawContent.slice(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: "AI returned invalid JSON", raw: rawContent.slice(0, 1000) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 3: Assemble final result ──
    const result = {
      name: extracted.name || metadata?.title || "",
      brand: extracted.brand || null,
      price: extracted.price || 0,
      sale_price: extracted.sale_price || null,
      original_price: extracted.original_price || null,
      description: extracted.description || "",
      image_url: mainImage || "/placeholder.svg",
      images: mainImage ? [mainImage] : [],
      sku: extracted.sku || null,
      source_url: url,
      category: extracted.category || null,
      pet_type: extracted.pet_type || "all",
      ingredients: extracted.ingredients || null,
      benefits: Array.isArray(extracted.benefits) ? extracted.benefits : [],
      feeding_guide: Array.isArray(extracted.feeding_guide) ? extracted.feeding_guide : [],
      product_attributes: extracted.product_attributes || {},
      life_stage: extracted.life_stage || null,
      dog_size: extracted.dog_size || null,
      special_diet: Array.isArray(extracted.special_diet) ? extracted.special_diet : [],
      weight_text: extracted.weight_text || null,
      needs_review: !extracted.ingredients,
      review_reasons: !extracted.ingredients ? ["missing_ingredients"] : [],
    };

    console.log("Extraction complete:", result.name, "| benefits:", result.benefits.length, "| feeding rows:", result.feeding_guide.length);

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("smart-scrape-product error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
