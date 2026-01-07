import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { messages, userContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Initialize Supabase client for fetching products
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build context about user's pets
    let petsContext = "";
    let petTypes: string[] = [];
    if (userContext?.pets && userContext.pets.length > 0) {
      petTypes = [...new Set(userContext.pets.map((p: any) => p.type))] as string[];
      petsContext = `\n\n=== מידע על חיות המחמד של הלקוח (כבר במערכת - אל תשאל על זה!) ===
${userContext.pets.map((pet: any) => 
  `- ${pet.name}: ${pet.type === 'dog' ? 'כלב' : pet.type === 'cat' ? 'חתול' : pet.type}${pet.breed ? `, גזע: ${pet.breed}` : ''}${pet.age ? `, גיל: ${pet.age}` : ''}${pet.gender ? `, ${pet.gender === 'male' ? 'זכר' : 'נקבה'}` : ''}${pet.health_notes ? `, הערות בריאות: ${pet.health_notes}` : ''}`
).join('\n')}
=== סוף מידע חיות מחמד ===`;
    }

    const userName = userContext?.userName ? `\nשם הלקוח: ${userContext.userName}` : '';

    // Check if last message is asking for product recommendations
    const lastUserMessage = messages.filter((m: any) => m.role === "user").slice(-1)[0]?.content?.toLowerCase() || "";
    const isProductRequest = 
      lastUserMessage.includes("מוצר") || 
      lastUserMessage.includes("המלצ") ||
      lastUserMessage.includes("אוכל") ||
      lastUserMessage.includes("מזון") ||
      lastUserMessage.includes("קנ") ||
      lastUserMessage.includes("חנות") ||
      lastUserMessage.includes("לקנות") ||
      lastUserMessage.includes("מומלץ") ||
      lastUserMessage.includes("מה כדאי");

    // Fetch relevant products if this looks like a product request
    let productsContext = "";
    let productsData: any[] = [];
    
    if (isProductRequest) {
      // Build query based on pet types
      let query = supabase
        .from('business_products')
        .select('id, name, description, price, sale_price, image_url, category, pet_type')
        .eq('in_stock', true)
        .limit(6);
      
      // Filter by pet type if we know what pets the user has
      if (petTypes.length === 1) {
        query = query.eq('pet_type', petTypes[0]);
      } else if (petTypes.length > 1) {
        query = query.in('pet_type', petTypes);
      }

      const { data: products, error } = await query;
      
      if (!error && products && products.length > 0) {
        productsData = products;
        productsContext = `\n\n=== מוצרים זמינים בחנות (השתמש ב-IDs האלה!) ===
${products.map((p: any) => 
  `[ID:${p.id}] ${p.name} - ₪${p.sale_price || p.price}${p.sale_price ? ` (במקום ₪${p.price})` : ''}${p.category ? ` | ${p.category}` : ''}${p.pet_type ? ` | ל${p.pet_type === 'dog' ? 'כלבים' : p.pet_type === 'cat' ? 'חתולים' : 'חיות מחמד'}` : ''}`
).join('\n')}
=== סוף רשימת מוצרים ===

כשאתה ממליץ על מוצרים, החזר בסוף ההודעה את ה-IDs של המוצרים המומלצים בפורמט:
[PRODUCTS:id1,id2,id3]
לדוגמה: [PRODUCTS:abc123,def456]
זה יאפשר הצגת כרטיסי המוצרים בצ'אט.`;
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: `אתה נציג שירות לקוחות AI מקצועי של PetID - אפליקציה לניהול חיות מחמד.${userName}${petsContext}${productsContext}

=== כלל קריטי: השתמש במידע שכבר יש לך! ===
יש לך גישה מלאה לכל המידע על חיות המחמד של הלקוח למעלה.
אסור לך לשאול שאלות על מידע שכבר קיים במערכת!
- אם יש לך את הגיל - השתמש בו ישירות, אל תשאל
- אם יש לך את הגזע - השתמש בו ישירות, אל תשאל  
- אם יש לך את המין - השתמש בו ישירות, אל תשאל

לדוגמה:
❌ שגוי: "מה הגיל של שיבס?" (כשיש לך את הגיל במידע)
✅ נכון: "שיבס בת 3, אז היא צריכה מזון לכלבים בוגרים..."

=== המלצות מוצרים ===
כשהלקוח מבקש המלצות על מוצרים:
1. המלץ על מוצרים ספציפיים מהרשימה שניתנה לך
2. התאם את ההמלצות לסוג החיה, הגיל והגזע
3. הסבר למה המוצר מתאים
4. ציין את המחיר
5. בסוף ההודעה, הוסף את ה-IDs בפורמט [PRODUCTS:id1,id2]

=== כללי התנהלות ===
1. פנה לחיות בשמן ובפרטים שיש לך
2. תן המלצות מדויקות על סמך הגיל, הגזע והמין
3. שאל רק על מידע שאין לך - כמו סימפטומים, העדפות, תקציב
4. אם הלקוח מזכיר חיה שאין ברשימה - אז כן תשאל פרטים עליה

=== כללים נוספים ===
- היה תמציתי וידידותי
- הצע פתרונות מעשיים ומותאמים אישית
- בסוף כל תשובה הצע המשך או פעולה

אתה יודע הכל על החיות שברשימה - תתנהג בהתאם!`
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "חרגת ממכסת הבקשות, אנא נסה שוב מאוחר יותר" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "נדרש תשלום, אנא הוסף כספים לחשבון Lovable AI שלך" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "שגיאה בשרת AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If we have products, we need to attach them to the response metadata
    // We'll add a custom header with the products data
    const headers: Record<string, string> = { 
      ...corsHeaders, 
      "Content-Type": "text/event-stream" 
    };
    
    if (productsData.length > 0) {
      headers["X-Products-Data"] = encodeURIComponent(JSON.stringify(productsData));
    }

    return new Response(response.body, { headers });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "שגיאה לא ידועה" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
