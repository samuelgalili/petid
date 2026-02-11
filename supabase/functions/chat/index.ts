import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

// ============= Types =============
type Pet = {
  id?: string | null;
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

type OrderRecord = {
  order_id: string;
  order_number: string;
  status: string;
  tracking_number?: string | null;
  carrier?: string | null;
  estimated_delivery?: string | null;
  total?: number | null;
  created_at?: string | null;
  shipping_address?: Record<string, any> | null;
};

// ============= Input Validation =============
const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(10000, "Message content too long (max 10000 chars)")
});

const UserContextSchema = z.object({
  pets: z.array(z.object({
    id: z.string().optional().nullable(),
    name: z.string().max(100).optional().nullable(),
    type: z.string().max(50).optional().nullable(),
    breed: z.string().max(100).optional().nullable(),
    age: z.union([z.string(), z.number()]).optional().nullable(),
    gender: z.string().max(20).optional().nullable(),
    health_notes: z.string().max(500).optional().nullable()
  })).max(20).optional(),
  userName: z.string().max(100).optional().nullable(),
  selectedPetName: z.string().max(100).optional().nullable()
}).optional().nullable();

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
  const byName = pets.find(p => p.name && t.includes(normalize(p.name)));
  if (byName) return byName;
  return null;
}

// ============= Order Utilities =============
function isOrderIntent(text: string): boolean {
  const t = normalize(text);
  return (
    t.includes("הזמנה") || t.includes("משלוח") || t.includes("סטטוס") ||
    t.includes("מעקב") || t.includes("איפה ההזמנה") || t.includes("הזמנתי") || t.includes("מתי יגיע")
  );
}

function extractOrderNumber(text: string): string | null {
  const patterns = [/(?:ord[-_]?)?(\d{4,10})/i, /#(\d{4,10})/, /הזמנה\s*(?:מספר)?\s*:?\s*(\d{4,10})/];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ============= Product Search Utilities =============
function isProductIntent(text: string): boolean {
  const t = normalize(text);
  return (
    t.includes("מזון") || t.includes("אוכל") || t.includes("חטיף") || t.includes("צעצוע") ||
    t.includes("מוצר") || t.includes("המלצ") || t.includes("לקנות") || t.includes("מומלץ") ||
    t.includes("מה כדאי") || t.includes("חנות") || t.includes("קנ")
  );
}

async function searchProducts(supabase: any, searchTerms: string[], petType?: string | null, limit = 6): Promise<ProductRecord[]> {
  const allItems: ProductRecord[] = [];
  for (const term of searchTerms) {
    const { data: businessProducts } = await supabase
      .from("business_products")
      .select("id, name, price, sale_price, category, pet_type, description, image_url")
      .eq("in_stock", true)
      .ilike("name", `%${term}%`)
      .limit(limit);
    if (businessProducts) allItems.push(...businessProducts);
    
    const { data: scrapedProducts } = await supabase
      .from("scraped_products")
      .select("id, name, price, category, pet_type, description, image_url")
      .ilike("name", `%${term}%`)
      .limit(limit);
    if (scrapedProducts) allItems.push(...scrapedProducts);
  }
  const filtered = petType ? allItems.filter(p => !p.pet_type || p.pet_type === petType) : allItems;
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
  if (filtered.length === 0) return body;
  return `${body}\n\n[PRODUCTS:${filtered.join(",")}]`;
}

// ============= Breed Data Fetcher =============
async function fetchBreedInfo(supabase: any, breedName: string, petType: string): Promise<string> {
  if (!breedName || breedName === "לא ידוע") return "";
  
  const { data } = await supabase
    .from("breed_information")
    .select("breed_name, breed_name_he, description_he, health_issues_he, temperament_he, life_expectancy_years, weight_range_kg, height_range_cm, energy_level, grooming_freq, trainability, exercise_needs, grooming_needs, dietary_notes, good_with_children, good_with_other_pets, apartment_friendly, shedding_level")
    .or(`breed_name.ilike.%${breedName}%,breed_name_he.ilike.%${breedName}%`)
    .eq("pet_type", petType === "cat" ? "cat" : "dog")
    .limit(1)
    .maybeSingle();
  
  if (!data) return "";
  
  return `
[BREED_DATA]
שם: ${data.breed_name_he || data.breed_name}
תיאור: ${data.description_he || "לא זמין"}
תוחלת חיים: ${data.life_expectancy_years || "לא ידוע"} שנים
משקל: ${data.weight_range_kg || "לא ידוע"} ק"ג
גובה: ${data.height_range_cm || "לא ידוע"} ס"מ
אופי: ${data.temperament_he?.join(", ") || "לא ידוע"}
בעיות בריאות נפוצות: ${data.health_issues_he?.join(", ") || "לא ידוע"}
רמת אנרגיה: ${data.energy_level || "?"}/5
תדירות טיפוח: ${data.grooming_freq || "?"}/5
יכולת אילוף: ${data.trainability || "?"}/5
נשירה: ${data.shedding_level || "?"}/5
מתאים לילדים: ${data.good_with_children ? "כן" : data.good_with_children === false ? "לא" : "לא ידוע"}
מתאים לחיות אחרות: ${data.good_with_other_pets ? "כן" : data.good_with_other_pets === false ? "לא" : "לא ידוע"}
מתאים לדירה: ${data.apartment_friendly ? "כן" : data.apartment_friendly === false ? "לא" : "לא ידוע"}
צרכי פעילות: ${data.exercise_needs || "לא ידוע"}
טיפים לטיפוח: ${data.grooming_needs || "לא ידוע"}
הערות תזונה: ${data.dietary_notes || "לא ידוע"}
[/BREED_DATA]`;
}

// ============= Main Handler =============
serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      return new Response(JSON.stringify({ error: "Payload too large (max 1MB)" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.json();
    const parseResult = ChatInputSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      return new Response(JSON.stringify({ 
        error: "Invalid input", 
        details: parseResult.error.errors.map(e => e.message).join(", ")
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { messages, userContext, channel } = parseResult.data;
    const isWhatsApp = channel === "whatsapp";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ============= Pet Context Resolver =============
    const pets: Pet[] = (userContext?.pets ?? []).map(p => ({
      id: p.id, name: p.name || "חיה", type: p.type || "unknown",
      breed: p.breed, age: p.age, gender: p.gender, health_notes: p.health_notes
    }));
    
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user")?.content ?? "";
    let activePet: Pet | null = null;
    
    const selectedPetName = userContext?.selectedPetName;
    if (selectedPetName) {
      activePet = pets.find(p => p.name === selectedPetName) || null;
    }
    if (!activePet) activePet = pickPetFromMessage(lastUserMsg, pets);
    if (!activePet && pets.length === 1) activePet = pets[0];

    const petCard = activePet
      ? `\n[ACTIVE_PET]\nname: ${activePet.name}\ntype: ${activePet.type === 'dog' ? 'כלב' : activePet.type === 'cat' ? 'חתול' : activePet.type}\nbreed: ${activePet.breed ?? "לא ידוע"}\nage: ${activePet.age ?? "לא ידוע"}\ngender: ${activePet.gender === 'male' ? 'זכר' : activePet.gender === 'female' ? 'נקבה' : activePet.gender ?? "לא ידוע"}\nhealth_notes: ${activePet.health_notes ?? "אין"}\n[/ACTIVE_PET]`
      : "\n[ACTIVE_PET]\nnone\n[/ACTIVE_PET]";

    const userName = userContext?.userName ? `\nשם הלקוח: ${userContext.userName}` : '';

    // ============= Fetch Breed Data if available =============
    let breedContext = "";
    if (activePet?.breed) {
      breedContext = await fetchBreedInfo(supabase, activePet.breed, activePet.type);
    }

    // ============= Order Intent Handler =============
    const orderIntent = isOrderIntent(lastUserMsg);
    
    if (orderIntent) {
      const orderNumber = extractOrderNumber(lastUserMsg);
      
      if (!orderNumber) {
        return new Response(
          JSON.stringify({ role: "assistant", content: "יש לך מספר הזמנה? אם לא — שלח/י את מספר הטלפון של ההזמנה." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const { data: orderData, error: orderError } = await supabase
        .rpc("get_order_status", { p_order_number: orderNumber })
        .maybeSingle();
      
      const order = orderData as OrderRecord | null;
      
      if (orderError || !order) {
        return new Response(
          JSON.stringify({ role: "assistant", content: "לא מצאתי הזמנה עם המספר הזה. אפשר לבדוק שוב את מספר ההזמנה?" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const statusMap: Record<string, string> = {
        pending: "ממתין לאישור", confirmed: "אושר", processing: "בהכנה",
        shipped: "נשלח", delivered: "נמסר", cancelled: "בוטל",
      };
      
      let responseContent = `מצאתי ✅\nהזמנה: ${order.order_number}\nסטטוס: ${statusMap[order.status] || order.status}`;
      if (order.tracking_number) {
        responseContent += `\nמספר מעקב: ${order.tracking_number}`;
        if (order.carrier) responseContent += ` (${order.carrier})`;
      }
      if (order.estimated_delivery) {
        responseContent += `\nצפי הגעה: ${new Date(order.estimated_delivery).toLocaleDateString('he-IL')}`;
      }
      responseContent += "\n\nרוצה עדכון משלוח או שינוי כתובת?";
      
      return new Response(
        JSON.stringify({ role: "assistant", content: responseContent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= Product Search =============
    const productIntent = isProductIntent(lastUserMsg);
    let productContext = "";
    let foundProducts: ProductRecord[] = [];

    if (productIntent && !isWhatsApp) {
      const searchTerms = extractSearchTerms(lastUserMsg);
      const petType = activePet?.type ?? null;
      foundProducts = await searchProducts(supabase, searchTerms, petType, 6);

      if (foundProducts.length) {
        productContext = `\n\n[PRODUCT_CANDIDATES]\n${foundProducts.map(p => 
          `- ${p.id} | ${p.name} | ₪${p.sale_price ?? p.price ?? "?"} | ${p.category ?? ""} | ${p.pet_type === 'dog' ? 'לכלבים' : p.pet_type === 'cat' ? 'לחתולים' : ''}`
        ).join('\n')}\n[/PRODUCT_CANDIDATES]\n\nכשאתה ממליץ על מוצרים, השתמש רק ב-IDs מהרשימה למעלה.\nבסוף ההודעה הוסף: [PRODUCTS:id1,id2,...]`;
      } else {
        productContext = `\n\n[PRODUCT_CANDIDATES]\nאין מוצרים תואמים בחיפוש\n[/PRODUCT_CANDIDATES]`;
      }
    }

    // ============= Build System Prompt =============
    let channelInstructions = "";
    if (isWhatsApp) {
      channelInstructions = `\n\n=== כללים לערוץ WhatsApp ===\n❌ אסור להחזיר [PRODUCTS:...] או מזהי UUID\n✅ רק טקסט נקי, אנושי וידידותי\n✅ המלץ על עד 3 מוצרים בשמותיהם בלבד`;
    }

    const systemPrompt = `אתה העוזר החכם של PetID — מערכת אחריות לבעלי חיות מחמד.
${userName}${petCard}${breedContext}${productContext}

=== עקרונות ליבה ===
• PetID היא מערכת אחריות, לא חנות. בטיחות החיה קודמת לכל.
• אל תמליץ אם אתה לא בטוח. אם חסר מידע — שאל.
• אל תדחוף פעולות, דחיפות, או מכירות.
• מילים אסורות: "חובה", "הכי טוב", "מבצע", "תמהרו". מילים מותרות: "מומלץ", "לא נדרש", "לא מתאים", "עדיף לחכות".
• אם יש ספק רפואי, מידע סותר, או סיכון לחיה — עצור. הסבר בנחת ובקש הבהרה.

=== סגנון שיחה ===
• עברית חמה, קצרה ומקצועית
• שאלה אחת בכל הודעה
• 2-5 שורות + אופציות ממוספרות
• פנה תמיד בשם המשתמש ושם החיה
• אמוג'י אחד לכל הודעה מקסימום
• תמיד סיים עם אפשרויות ברורות

=== חירום ===
מילים כמו: "דחוף", "נחנק", "דם", "גוסס", "לא נושם", "חירום"
→ עצור הכל מיידית:
"🚨 נשמע מצב חירום!
📞 התקשר לוטרינר חירום: *3939
• הישאר רגוע
• אל תזיז את החיה אם יש חשד לפציעה
• שמור על נתיבי נשימה פתוחים
רוצה שאעביר לנציג אנושי?"

=== 9 מסלולי שיחה ===

🛡️ 1. ביטוח (Libra Insurance)
שלב 1: אמת גזע וגיל — "מה הגזע של [שם]? בן כמה?" (אם חסר מידע ב-ACTIVE_PET)
שלב 2: שאל 2 שאלות בריאות — "האם [שם] עבר ניתוחים בעבר?" ו-"יש מצבים רפואיים ידועים?"
שלב 3: אמור "מעולה! מחשב הצעה מותאמת..." ואז הוסף [ACTION:SHOW_INSURANCE_PLANS]
⚠️ חשוב: אל תציג מחירים בטקסט. המערכת תציג כרטיסי תוכניות אוטומטית.

✂️ 2. טיפוח
בחירת שירות (תספורת/רחצה/ציפורניים/חבילה) → בחירת מועד [ACTION:SHOW_CALENDAR] → שעה → סיכום ומחיר → [ACTION:CONFIRM_BOOKING]

🎓 3. אילוף
אבחון (חינוך בסיסי/בעיות התנהגות/טריקים/חרדת נטישה) → העמקה → פורמט (בית/פנסיון/אונליין) → חבילה ומחיר → [ACTION:SCHEDULE_TRAINING]

📂 4. מסמכים
בחירה (העלאה/צפייה בחיסונים/הורדה) → העלאה [ACTION:UPLOAD_DOCUMENT] → זיהוי סוג → אישור שמירה → תזכורת

🏨 5. פנסיון
תאריכי כניסה/יציאה → סגנון (ביתי/מקצועי) → הצגת אופציות [ACTION:SHOW_BOARDING_OPTIONS] → אישור

📦 6. משלוחים
זיהוי צורך (מעקב/הזמנה חוזרת/שינוי כתובת) → מספר הזמנה → סטטוס [ACTION:ORDER_STATUS]

🐕 7. מידע על הגזע
${breedContext ? "השתמש בנתוני BREED_DATA שמצורפים למעלה. אל תמציא מידע." : "אם אין נתוני גזע — שאל מה שם הגזע."}
בחירת נושא (אופי/תזונה/מחלות/אילוף) → מידע מבוסס נתונים → המלצת מוצר [PRODUCTS:uuid] → הצעת ביטוח

🌳 8. גינות כלבים
שאלה על עיר/שכונה → סינון (מגודר/שתייה/הפרדה) → המלצות עם כתובות → טיפים

🏠 9. למסירה
העלאת תמונה [ACTION:UPLOAD_PHOTO] → תיאור אופי → שאלון (ילדים/כלבים/חתולים) → פרסום מודעה

=== תגיות פעולה ===
הוסף תגית כשנדרשת פעולה מהמערכת:
[ACTION:SHOW_CALENDAR] | [ACTION:CONFIRM_BOOKING] | [ACTION:SHOW_INSURANCE_PLANS]
[ACTION:SCHEDULE_TRAINING] | [ACTION:UPLOAD_DOCUMENT] | [ACTION:SHOW_BOARDING_OPTIONS]
[ACTION:ORDER_STATUS] | [ACTION:UPLOAD_PHOTO] | [ACTION:ESCALATE]
[ACTION:ORDER_STATUS] | [ACTION:UPLOAD_PHOTO] | [ACTION:ESCALATE]

=== הסלמה ===
"לא עובד", "חיוב כפול", "אני עצבני", קללות
→ "מבין את התסכול. מעביר לנציג אנושי. מספר הזמנה או טלפון? [ACTION:ESCALATE]"
${channelInstructions}`;

    // ============= AI Request =============
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
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "נדרש תשלום, אנא הוסף כספים לחשבון" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "שגיאה בשרת AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============= Non-Streaming Response (with PRODUCTS validation) =============
    if (!shouldStream) {
      const json = await response.json();
      let text = json?.choices?.[0]?.message?.content ?? "";
      
      const validIds = new Set(foundProducts.map(p => p.id));
      const safeText = keepOnlyValidProducts(text, validIds);
      
      const headers: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
      
      const { ids: finalProductIds } = extractProductIds(safeText);
      if (finalProductIds.length > 0) {
        const productsForClient = foundProducts.filter(p => finalProductIds.includes(p.id));
        headers["X-Products-Data"] = encodeURIComponent(JSON.stringify(productsForClient));
      }
      
      return new Response(JSON.stringify({ role: "assistant", content: safeText }), { headers });
    }

    // ============= Streaming Response =============
    return new Response(response.body, { 
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" } 
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "שגיאה לא ידועה" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
