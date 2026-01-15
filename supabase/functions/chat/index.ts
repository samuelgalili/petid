import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

// ============= Types =============
type Pet = {
  id?: string;
  name: string;
  type: string;
  breed?: string | null;
  age?: number | string | null;
  gender?: string | null;
  health_notes?: string | null;
};

type ProductRecord = {
  id: string;
  name: string;
  price?: number | null;
  sale_price?: number | null;
  category?: string | null;
  pet_type?: string | null;
  description?: string | null;
  image_url?: string | null;
};

// ============= Input Validation =============
const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(10000, "Message content too long (max 10000 chars)")
});

const UserContextSchema = z.object({
  pets: z.array(z.object({
    id: z.string().optional(),
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

const MAX_PAYLOAD_SIZE = 1024 * 1024;

// ============= Pet Resolver Utilities =============
function normalize(s: string): string {
  return (s || "").trim().toLowerCase();
}

function pickPetFromMessage(userText: string, pets: Pet[]): Pet | null {
  const t = normalize(userText);
  if (!t || !pets?.length) return null;
  
  // Search for pet name mentioned in user message
  const byName = pets.find(p => p.name && t.includes(normalize(p.name)));
  if (byName) return byName;
  
  return null;
}

// ============= Product Search Utilities =============
function isProductIntent(text: string): boolean {
  const t = normalize(text);
  return (
    t.includes("מזון") ||
    t.includes("אוכל") ||
    t.includes("חטיף") ||
    t.includes("צעצוע") ||
    t.includes("מוצר") ||
    t.includes("המלצ") ||
    t.includes("לקנות") ||
    t.includes("מומלץ") ||
    t.includes("מה כדאי") ||
    t.includes("חנות") ||
    t.includes("קנ")
  );
}

async function searchProducts(
  supabase: any,
  searchTerms: string[],
  petType?: string | null,
  limit = 6
): Promise<ProductRecord[]> {
  const allItems: ProductRecord[] = [];
  
  for (const term of searchTerms) {
    // Search business_products
    const { data: businessProducts } = await supabase
      .from("business_products")
      .select("id, name, price, sale_price, category, pet_type, description, image_url")
      .eq("in_stock", true)
      .ilike("name", `%${term}%`)
      .limit(limit);
    
    if (businessProducts) allItems.push(...businessProducts);
    
    // Search scraped_products
    const { data: scrapedProducts } = await supabase
      .from("scraped_products")
      .select("id, name, price, category, pet_type, description, image_url")
      .ilike("name", `%${term}%`)
      .limit(limit);
    
    if (scrapedProducts) allItems.push(...scrapedProducts);
  }
  
  // Filter by pet type if specified
  const filtered = petType 
    ? allItems.filter(p => !p.pet_type || p.pet_type === petType)
    : allItems;
  
  // Dedupe by id
  const map = new Map(filtered.map(x => [x.id, x]));
  return [...map.values()].slice(0, limit);
}

function extractSearchTerms(text: string): string[] {
  const terms: string[] = [];
  const t = normalize(text);
  
  if (t.includes("מזון") || t.includes("אוכל")) terms.push("מזון");
  if (t.includes("חטיף")) terms.push("חטיף");
  if (t.includes("צעצוע")) terms.push("צעצוע");
  if (t.includes("קולר") || t.includes("רצועה")) terms.push("קולר", "רצועה");
  if (t.includes("מיטה") || t.includes("מזרן")) terms.push("מיטה");
  if (t.includes("שמפו") || t.includes("טיפוח")) terms.push("שמפו");
  
  // Default to "מזון" if no specific term found but it's a product intent
  if (terms.length === 0) terms.push("מזון");
  
  return terms;
}

// ============= PRODUCTS Tag Utilities =============
function extractProductIds(text: string): { ids: string[]; hasTag: boolean } {
  const match = text.match(/\[PRODUCTS:([^\]]+)\]/);
  if (!match) return { ids: [], hasTag: false };
  const ids = match[1].split(",").map(x => x.trim()).filter(Boolean);
  return { ids, hasTag: true };
}

function stripProductsTag(text: string): string {
  return text.replace(/\n?\[PRODUCTS:[^\]]+\]\s*/g, "").trim();
}

function keepOnlyValidProducts(text: string, validIds: Set<string>): string {
  const { ids, hasTag } = extractProductIds(text);
  if (!hasTag) return text;
  
  const filtered = ids.filter(id => validIds.has(id));
  const body = stripProductsTag(text);
  
  if (filtered.length === 0) return body; // No valid products → remove PRODUCTS tag
  return `${body}\n\n[PRODUCTS:${filtered.join(",")}]`;
}

// ============= Main Handler =============
serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Check content length
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ============= Pet Context Resolver =============
    const pets: Pet[] = (userContext?.pets ?? []).map(p => ({
      id: p.id,
      name: p.name || "חיה",
      type: p.type || "unknown",
      breed: p.breed,
      age: p.age,
      gender: p.gender,
      health_notes: p.health_notes
    }));
    
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user")?.content ?? "";
    let activePet: Pet | null = pickPetFromMessage(lastUserMsg, pets);

    // If no match by name in message:
    if (!activePet) {
      if (pets.length === 1) {
        activePet = pets[0]; // Easy: only one pet
      } else if (pets.length > 1) {
        // Multiple pets and no selection → ask user to choose
        const names = pets.map(p => p.name).join(" / ");
        return new Response(
          JSON.stringify({
            role: "assistant",
            content: `על איזו חיה מדובר? 😊\n${names}`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build Pet Card (short context for model)
    const petCard = activePet
      ? `\n\n[ACTIVE_PET]
name: ${activePet.name}
type: ${activePet.type === 'dog' ? 'כלב' : activePet.type === 'cat' ? 'חתול' : activePet.type}
breed: ${activePet.breed ?? "לא ידוע"}
age: ${activePet.age ?? "לא ידוע"}
gender: ${activePet.gender === 'male' ? 'זכר' : activePet.gender === 'female' ? 'נקבה' : activePet.gender ?? "לא ידוע"}
health_notes: ${activePet.health_notes ?? "אין"}
[/ACTIVE_PET]`
      : "\n\n[ACTIVE_PET]\nnone\n[/ACTIVE_PET]";

    const userName = userContext?.userName ? `\nשם הלקוח: ${userContext.userName}` : '';

    // ============= Product Search =============
    const productIntent = isProductIntent(lastUserMsg);
    let productContext = "";
    let foundProducts: ProductRecord[] = [];

    if (productIntent && !isWhatsApp) {
      const searchTerms = extractSearchTerms(lastUserMsg);
      const petType = activePet?.type ?? null;
      foundProducts = await searchProducts(supabase, searchTerms, petType, 6);

      if (foundProducts.length) {
        productContext = `\n\n[PRODUCT_CANDIDATES]
${foundProducts.map(p => 
  `- ${p.id} | ${p.name} | ₪${p.sale_price ?? p.price ?? "?"} | ${p.category ?? ""} | ${p.pet_type === 'dog' ? 'לכלבים' : p.pet_type === 'cat' ? 'לחתולים' : ''}`
).join('\n')}
[/PRODUCT_CANDIDATES]

כשאתה ממליץ על מוצרים, השתמש רק ב-IDs מהרשימה למעלה.
בסוף ההודעה הוסף: [PRODUCTS:id1,id2,...]`;
      } else {
        productContext = `\n\n[PRODUCT_CANDIDATES]\nאין מוצרים תואמים בחיפוש\n[/PRODUCT_CANDIDATES]`;
      }
    }

    // ============= Build System Prompt =============
    let channelInstructions = "";
    if (isWhatsApp) {
      channelInstructions = `

=== כללים קריטיים לערוץ WhatsApp ===
❌ אסור להחזיר [PRODUCTS:...] או מזהי UUID
❌ אסור לכלול קודים, טוקנים או placeholders
✅ רק טקסט נקי, אנושי וידידותי
✅ המלץ על עד 3 מוצרים בשמותיהם בלבד
✅ בסוף כל המלצה הוסף CTA: "רוצה לינקים? כתוב 1/2/3"`;
    }

    const systemPrompt = `את/ה נציג/ת שירות של PetID. המטרה: לעזור במהירות ובדיוק, בלי להמציא מידע, ולהכווין לפעולה הבאה.
${userName}${petCard}${productContext}

=== עקרונות חובה ===
1. אין המצאות: אסור להמציא גיל/גזע/גודל/רגישויות/סטטוס הזמנה/מחיר/מלאי. אם אין נתון — שואלים שאלה אחת בלבד.
2. נאמנות לפרופיל: השתמש/י רק במידע מ-[ACTIVE_PET]. אסור לסתור או להמציא פרטים.
3. תשובות קצרות: 2–5 שורות, ואז פעולה/בחירה (אופציות ממוספרות 1-4).
4. שאלה אחת בהודעה: לעולם לא שתי שאלות באותה הודעה.
5. [PRODUCTS:...] רק מ-[PRODUCT_CANDIDATES]: אם אין מוצרים ברשימה — לא מציגים PRODUCTS.

=== מסלולי שיחה ===

📍 WELCOME (הודעה ראשונה):
"היי {שם} 👋
אני נציג השירות של PetID.
על איזה נושא נעזור היום?
1) מזון/תזונה 2) מוצרים 3) הזמנה/משלוח 4) אילוף 5) אחר"

📍 מסלול מזון/תזונה:
- אם חסר גיל/שלב: "כדי להמליץ במדויק: {שם החיה} היא 1) גור/ה 2) בוגרת 3) מבוגרת?"
- אם חסרות רגישויות: "יש ל{שם} רגישות ידועה (עוף/דגנים/קיבה)? כן/לא"
- אחרי שיש סוג+גיל+גודל: "לפי הפרופיל של {שם} ({גזע}, {גיל}), אלו אופציות שמתאימות: 1) פרימיום 2) קיבה רגישה 3) תקציבי. לבחור מספר?"
- כשהלקוח בחר: "הנה 3 אופציות שמתאימות ל{שם}. רוצה שאסביר את ההבדלים?"
  [PRODUCTS:uuid1,uuid2,uuid3]

📍 מסלול מוצרים (חטיפים/צעצועים):
- שאלת סינון: "מחפש/ת 1) חטיף 2) צעצוע 3) משהו לשיניים?"
- התאמה לפי הרגלים אם יש ב-health_notes (fast_eater/chewer/anxiety)

📍 מסלול הזמנה/משלוח:
- "בכיף. יש לך מספר הזמנה? אם לא — שלח/י את מספר הטלפון של ההזמנה."
- אחרי מזהה: "מצאתי את ההזמנה ✅ סטטוס: {סטטוס}. רוצה עדכון משלוח או שינוי כתובת?"

📍 מסלול אילוף/טיפים:
- "מה הכי מאתגר כרגע? 1) נשיכות/לעיסה 2) משיכות בטיול 3) צרכים בבית 4) נביחות"
- ואז 3 צעדים קצרים + שאלה אחת להמשך

📍 מסלול בריאות (מוגבל!):
- "אני יכול לעזור בהכוונה כללית, אבל לא מחליף וטרינר. מה הסימפטום המרכזי? (מילה-שתיים)"
- אם "דם/קריסה/חירום": "זה נשמע דחוף — ממליץ לפנות מייד לוטרינר/מיון. רוצה שאעביר לנציג אנושי להמשך?"

📍 הסלמה (כעס/קללות/חיוב/ביטול):
- טריגרים: "לא עובד", "חיוב כפול", "אני עצבני", קללות
- תגובה: "מבין אותך. אני מעביר לנציג אנושי עכשיו. כדי לזרז — מספר הזמנה או טלפון?"

=== כללי UI ===
• תמיד 1–4 אופציות ממוספרות
• תמיד "פעולה הבאה" בסוף
• [PRODUCTS:...] בשורה נפרדת בלבד, רק אם יש מוצרים אמיתיים
• במקום "ראיתי שיש לך..." → "לפי הפרופיל שמופיע..."
• שפה: עברית, קצר, שירותי, מקסימום אמוג'י אחד
${channelInstructions}`;

    // ============= AI Request =============
    // If product intent → no stream (so we can validate PRODUCTS tag)
    const shouldStream = !productIntent || isWhatsApp;

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
        stream: shouldStream,
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
        return new Response(JSON.stringify({ error: "נדרש תשלום, אנא הוסף כספים לחשבון" }), {
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

    // ============= Non-Streaming Response (with PRODUCTS validation) =============
    if (!shouldStream) {
      const json = await response.json();
      let text = json?.choices?.[0]?.message?.content ?? "";
      
      // Validate PRODUCTS tag - keep only valid IDs
      const validIds = new Set(foundProducts.map(p => p.id));
      const safeText = keepOnlyValidProducts(text, validIds);
      
      // Build response with products data header
      const headers: Record<string, string> = { 
        ...corsHeaders, 
        "Content-Type": "application/json" 
      };
      
      // Extract final valid product IDs for client
      const { ids: finalProductIds } = extractProductIds(safeText);
      if (finalProductIds.length > 0) {
        const productsForClient = foundProducts.filter(p => finalProductIds.includes(p.id));
        headers["X-Products-Data"] = encodeURIComponent(JSON.stringify(productsForClient));
      }
      
      return new Response(
        JSON.stringify({ role: "assistant", content: safeText }),
        { headers }
      );
    }

    // ============= Streaming Response =============
    const headers: Record<string, string> = { 
      ...corsHeaders, 
      "Content-Type": "text/event-stream" 
    };

    return new Response(response.body, { headers });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "שגיאה לא ידועה" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
