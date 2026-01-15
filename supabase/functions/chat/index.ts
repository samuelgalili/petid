import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

// Input validation schema
const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(10000, "Message content too long (max 10000 chars)")
});

const UserContextSchema = z.object({
  pets: z.array(z.object({
    name: z.string().max(100).optional(),
    type: z.string().max(50).optional(),
    breed: z.string().max(100).optional(),
    age: z.union([z.string(), z.number()]).optional(),
    gender: z.string().max(20).optional(),
    health_notes: z.string().max(500).optional()
  })).max(20).optional(),
  userName: z.string().max(100).optional()
}).optional();

const ChatInputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50, "Too many messages (max 50)"),
  userContext: UserContextSchema,
  channel: z.enum(["web", "whatsapp"]).optional()
});

// Max payload size: 1MB
const MAX_PAYLOAD_SIZE = 1024 * 1024;

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Check content length before parsing
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      return new Response(JSON.stringify({ error: "Payload too large (max 1MB)" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate input
    const rawBody = await req.json();
    const parseResult = ChatInputSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      return new Response(JSON.stringify({ 
        error: "Invalid input", 
        details: parseResult.error.errors.map(e => e.message).join(", ")
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, userContext, channel } = parseResult.data;
    const isWhatsApp = channel === "whatsapp";
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
      petTypes = [...new Set(userContext.pets.map((p) => p.type).filter(Boolean))] as string[];
      petsContext = `\n\n=== מידע על חיות המחמד של הלקוח (כבר במערכת - אל תשאל על זה!) ===
${userContext.pets.map((pet) => 
  `- ${pet.name || 'חיה'}: ${pet.type === 'dog' ? 'כלב' : pet.type === 'cat' ? 'חתול' : pet.type || 'לא ידוע'}${pet.breed ? `, גזע: ${pet.breed}` : ''}${pet.age ? `, גיל: ${pet.age}` : ''}${pet.gender ? `, ${pet.gender === 'male' ? 'זכר' : 'נקבה'}` : ''}${pet.health_notes ? `, הערות בריאות: ${pet.health_notes}` : ''}`
).join('\n')}
=== סוף מידע חיות מחמד ===`;
    }

    const userName = userContext?.userName ? `\nשם הלקוח: ${userContext.userName}` : '';

    // Check if last message is asking for product recommendations
    const lastUserMessage = messages.filter((m) => m.role === "user").slice(-1)[0]?.content?.toLowerCase() || "";
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
        .limit(3);
      
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

    // Build channel-specific instructions
    let channelInstructions = "";
    if (isWhatsApp) {
      channelInstructions = `

=== כללים קריטיים לערוץ WhatsApp ===
❌ אסור להחזיר [PRODUCTS:...] או מזהי UUID
❌ אסור לכלול קודים, טוקנים או placeholders
✅ רק טקסט נקי, אנושי וידידותי
✅ המלץ על עד 3 מוצרים בשמותיהם בלבד
✅ בסוף כל המלצה הוסף CTA: "רוצה לינקים? כתוב 1/2/3"

דוגמה לתשובה נכונה:
"בשמחה! לכלב קטן הייתי ממליץ על:
• חטיף דנטלי קטן
• חטיפי אימון רכים
• צעצוע קונג למילוי

רוצה שאשלח לינקים? כתוב 1️⃣/2️⃣/3️⃣"`;
    } else {
      channelInstructions = `

כשאתה ממליץ על מוצרים, הוסף בסוף ההודעה את ה-IDs בפורמט:
[PRODUCTS:id1,id2,id3]`;
    }

    // Build the PetID system prompt with strict rules
    const systemPrompt = `את/ה נציג/ת שירות של PetID. המטרה: לעזור במהירות ובדיוק, בלי להמציא מידע, ולהכווין לפעולה הבאה.
${userName}${petsContext}${productsContext}

=== עקרונות חובה ===
1. אין המצאות: אסור להמציא גיל/גזע/גודל/רגישויות/סטטוס הזמנה/מחיר/מלאי. אם אין נתון — שואלים שאלה אחת בלבד.

2. נאמנות לפרופיל: אם סופק Pet Profile למעלה — אסור לסתור אותו. אם יש סתירה/חוסר התאמה (למשל גזע גדול מול המלצה לגזע קטן) — עוצרים ומבקשים אימות.

3. בחירת חיה: אם למשתמש יש יותר מחיית מחמד אחת ואין pet_id פעיל — לא ממליצים. שואלים: "על איזו חיה מדובר? (שם1/שם2…)".

4. תשובות קצרות: 2–5 שורות, ואז פעולה/בחירה (כפתורים/מספרים).

5. תזונה/מזון: אסור לתת המלצת מזון בלי לפחות: סוג (כלב/חתול), שלב גיל (גור/בוגר/מבוגר), וגודל/גזע. אם חסר — שואלים שאלה אחת.

6. מוצרים: ניתן להציע מוצרים רק אם התקבלו רשומות מהחיפוש ב-DB (ראה "מוצרים זמינים" למעלה). אם אין התאמות — מציעים 2–3 שאלות סינון קצרות.

7. פורמט מוצרים: אם ממליץ/ה על מוצר(ים) — בסוף ההודעה חייב להופיע בדיוק: [PRODUCTS:id1,id2,…] בלי טקסט נוסף באותה שורה. אם אין מוצרים — לא מציגים PRODUCTS בכלל.

8. שפה וטון: עברית, קצר, שירותי, לא "חופר", בלי אמוג'ים מוגזמים (מקסימום 1).

9. הסלמה לנציג אנושי: אם המשתמש כועס/קללה/חיוב/ביטול/בעיה רפואית/טענה חמורה — מעבירים לנציג אנושי ושואלים רק פרט אחד לזירוז (מספר הזמנה/טלפון).

=== מבנה תשובה מומלץ ===
• משפט 1: מענה/הבהרה קצרה
• משפט 2: שאלה אחת או 2–3 אופציות בחירה
• שורה אחרונה (רק אם יש מוצרים): [PRODUCTS:…]
${channelInstructions}`;

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
