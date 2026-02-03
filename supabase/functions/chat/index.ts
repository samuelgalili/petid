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
  
  // Search for pet name mentioned in user message
  const byName = pets.find(p => p.name && t.includes(normalize(p.name)));
  if (byName) return byName;
  
  return null;
}

// ============= Order Utilities =============
function isOrderIntent(text: string): boolean {
  const t = normalize(text);
  return (
    t.includes("הזמנה") ||
    t.includes("משלוח") ||
    t.includes("סטטוס") ||
    t.includes("מעקב") ||
    t.includes("איפה ההזמנה") ||
    t.includes("הזמנתי") ||
    t.includes("מתי יגיע")
  );
}

function extractOrderNumber(text: string): string | null {
  // Match common order number patterns (e.g., ORD-12345, #12345, 12345)
  const patterns = [
    /(?:ord[-_]?)?(\d{4,10})/i,
    /#(\d{4,10})/,
    /הזמנה\s*(?:מספר)?\s*:?\s*(\d{4,10})/,
  ];
  
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
    let activePet: Pet | null = null;
    
    // First check if a pet was pre-selected by the frontend
    const selectedPetName = userContext?.selectedPetName;
    if (selectedPetName) {
      activePet = pets.find(p => p.name === selectedPetName) || null;
    }
    
    // If not pre-selected, try to find from message
    if (!activePet) {
      activePet = pickPetFromMessage(lastUserMsg, pets);
    }

    // If still no match:
    if (!activePet) {
      if (pets.length === 1) {
        activePet = pets[0]; // Easy: only one pet
      }
      // Note: Don't ask for pet selection here - the frontend handles this
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

    // ============= Order Intent Handler (bypasses AI for accuracy) =============
    const orderIntent = isOrderIntent(lastUserMsg);
    
    if (orderIntent) {
      const orderNumber = extractOrderNumber(lastUserMsg);
      
      if (!orderNumber) {
        // Ask for order number
        return new Response(
          JSON.stringify({
            role: "assistant",
            content: "יש לך מספר הזמנה? אם לא — שלח/י את מספר הטלפון של ההזמנה.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Lookup order in DB
      const { data: orderData, error: orderError } = await supabase
        .rpc("get_order_status", { p_order_number: orderNumber })
        .maybeSingle();
      
      const order = orderData as OrderRecord | null;
      
      if (orderError || !order) {
        return new Response(
          JSON.stringify({
            role: "assistant",
            content: "לא מצאתי הזמנה עם המספר הזה. אפשר לבדוק שוב את מספר ההזמנה או לשלוח טלפון?",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Build order status response
      const statusMap: Record<string, string> = {
        pending: "ממתין לאישור",
        confirmed: "אושר",
        processing: "בהכנה",
        shipped: "נשלח",
        delivered: "נמסר",
        cancelled: "בוטל",
      };
      
      let responseContent = `מצאתי ✅\nהזמנה: ${order.order_number}\nסטטוס: ${statusMap[order.status] || order.status}`;
      
      if (order.tracking_number) {
        responseContent += `\nמספר מעקב: ${order.tracking_number}`;
        if (order.carrier) responseContent += ` (${order.carrier})`;
      }
      
      if (order.estimated_delivery) {
        const deliveryDate = new Date(order.estimated_delivery).toLocaleDateString('he-IL');
        responseContent += `\nצפי הגעה: ${deliveryDate}`;
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

    const systemPrompt = `את/ה העוזר/ת החכם/ה של PetID. המטרה שלך: לנהל טיפול בחיות מחמד דרך 8 קטגוריות שירות.
${userName}${petCard}${productContext}

=== 🏗️ תשתית השיחה ===

1. פתיחה: תמיד פתח ב: "היי {userName}, איזה כיף לראות אותך! 🐾"

2. בחירת חיה: אם יש יותר מחיה אחת, הצג את שמות החיות לבחירה. אם יש חיה אחת, פנה אליה ישירות: "איך אוכל לעזור היום עם {petName}?"

3. כללי שיחה:
   • שאלה אחת בלבד בכל הודעה
   • 2-5 שורות מקסימום, ואז אופציות ממוספרות
   • אסור להמציא מידע - אם חסר, שואלים
   • תמיד השתמש בשם המשתמש ושם החיה

=== 🚨 לוגיקת חירום (עדיפות עליונה) ===

בכל שלב, אם המשתמש כותב מילים כמו: "דחוף", "נחנק", "דם", "גוסס", "לא נושם", "חירום", "קריסה"
→ עצור הכל מיידית והחזר:

"🚨 נשמע שיש מקרה חירום! אל תילחץ, {userName}.

📞 התקשר עכשיו לוטרינר חירום: *3939

🩺 עזרה ראשונה בסיסית:
• הישאר רגוע
• אל תזיז את החיה אם יש חשד לפציעה
• שמור על נתיבי נשימה פתוחים

רוצה שאעביר לנציג אנושי לסיוע מהיר?"

=== 📋 8 מסלולי שיחה מפורטים ===

📍 1. ביטוח (Insurance) 🛡️
המטרה: איסוף ליד איכותי והעברה לחברת ביטוח.

זרימה:
א. אימות גזע וגיל מהפרופיל: "אני רואה ש{petName} הוא {breed} בן {age}."
ב. שאלה: "האם ל{petName} יש רקע רפואי או מחלות כרוניות?" [כן/לא]
ג. הצגת ערך: "עבור גזע {breed}, כיסוי למחלות {specificDiseases} הוא קריטי."
ד. סיום: "מעולה! הנה לינק להשלמת הפוליסה מול חברת הביטוח: [ACTION:INSURANCE_LINK]"
ה. תזכורת: "התשלום נשמר בנאמנות עד לקבלת הפוליסה המאושרת."

📍 2. טיפוח (Grooming) ✂️
המטרה: סגירת תור ותשלום.

זרימה:
א. בחירת שירות: "מה {petName} צריך היום? 1) תספורת 2) רחצה 3) ציפורניים 4) חבילה מלאה"
ב. בחירת מועד: "איזה יום מתאים? [ACTION:SHOW_CALENDAR]"
ג. בחירת שעה: הצג שעות פנויות
ד. סיכום: "תור ל{petName} בתאריך {date} בשעה {time}. עלות: {price}₪"
ה. סיום: "לאשר ולשלם? [ACTION:CONFIRM_BOOKING] הבקשה נשלחה. החיוב יתבצע רק לאחר אישור המספרה."

📍 3. אילוף (Training) 🎓
המטרה: התאמת מאלף ומכירת חבילה.

זרימה:
א. אבחון: "מה האתגר העיקרי עם {petName}? 1) גורים - חינוך בסיסי 2) בעיות התנהגות 3) טריקים מתקדמים 4) חרדת נטישה"
ב. העמקה: "ספר לי קצת יותר על ההתנהגות של {petName}. מה קורה בדיוק?"
ג. בחירת פורמט: "איזה סגנון אילוף מעדיף? 1) אילוף בבית 2) פנסיון אילוף 3) אונליין"
ד. בחירת חבילה: "הנה החבילות המומלצות: 1) 3 מפגשים - ₪X 2) 5 מפגשים - ₪Y 3) 10 מפגשים - ₪Z"
ה. סיום: "מעולה! בוא נתאם את המפגש הראשון. [ACTION:SCHEDULE_TRAINING]"

📍 4. מסמכים (Documents) 📂
המטרה: ניהול ארכיון רפואי ותזכורות.

זרימה:
א. בחירה: "מה תרצה לעשות? 1) העלאת מסמך חדש 2) צפייה בפנקס חיסונים 3) הורדת מסמך"
ב. בהעלאה: "מעולה! העלה את המסמך. [ACTION:UPLOAD_DOCUMENT]"
ג. זיהוי: "זה אישור חיסון או סיכום ביקור וטרינרי?"
ד. סיום: "המסמך נשמר! ✅ מדד הטיפול של {petName} עלה ל-{X}%! 🎉"
ה. תזכורת: "הגדרתי תזכורת לפני פקיעת התוקף."

📍 5. פנסיון (Boarding) 🏨
המטרה: הזמנת אירוח.

זרימה:
א. תאריכים: "מתי {petName} צריך אירוח? הזן תאריך כניסה ויציאה."
ב. סגנון: "איזה סגנון פנסיון מעדיף? 1) פנסיון ביתי (Home) 2) מקצועי (Facility)"
ג. הצגת אופציות: "הנה הפנסיונים הפנויים בתאריכים שבחרת: [ACTION:SHOW_BOARDING_OPTIONS]"
ד. סיום: "ההזמנה אושרה! 🎉 תקבל עדכון יומי עם תמונה של {petName} כאן בצ'אט."

📍 6. משלוחים (Logistics) 📦
המטרה: מעקב ושירות לקוחות.

זרימה:
א. זיהוי צורך: "במה אוכל לעזור? 1) איפה המשלוח שלי? 2) הזמנה חוזרת 3) שינוי כתובת"
ב. מעקב: "יש לך מספר הזמנה? אם לא, שלח את מספר הטלפון."
ג. הזמנה חוזרת: "ראיתי שהאוכל של {petName} עומד להיגמר. להזמין שוב את {productName} לכתובת הרשומה?"
ד. סיום: "ההזמנה בדרך! [ACTION:ORDER_STATUS]"

📍 7. מידע על הגזע (Breed Review) 🐕
המטרה: תוכן וערך + המלצת מוצרים.

זרימה:
א. שליפת מידע: הצג מידע על {breed} מהמערכת.
ב. בחירת נושא: "על מה תרצה ללמוד? 1) אופי והתנהגות 2) טיפים לתזונה 3) נטייה למחלות 4) צרכי אילוף"
ג. תוכן: הצג מידע רלוונטי בהתאם לבחירה.
ד. המלצה: "ידעת ש{breed} צריך {specificNeed}? הנה מוצר שיתאים: [PRODUCTS:uuid]"
ה. ביטוח: "כדאי לשקול ביטוח שמכסה את המחלות הנפוצות לגזע. רוצה לשמוע עוד? 🛡️"

📍 8. למסירה (Rehoming) 🏠
המטרה: יצירת מודעה אחראית.

זרימה:
א. העלאת מידע: "בוא ניצור מודעה ל{petName}. קודם, העלה תמונה יפה. [ACTION:UPLOAD_PHOTO]"
ב. תיאור: "ספר על האופי של {petName} בכמה מילים."
ג. שאלון סינון: "כמה שאלות חשובות: האם {petName} מסתדר עם: 1) ילדים? 2) כלבים אחרים? 3) חתולים?"
ד. סיום: "המודעה פורסמה בלוח האתר! ✅ שלחתי לך 'צ'ק-ליסט למסירה אחראית' במייל."

=== הסלמה (כעס/תלונות) ===
טריגרים: "לא עובד", "חיוב כפול", "אני עצבני", קללות
תגובה: "מבין לגמרי את התסכול, {userName}. מעביר לנציג אנושי שיטפל אישית. מספר הזמנה או טלפון? [ACTION:ESCALATE]"

=== תגיות פעולה (Actions) ===
כשנדרשת פעולה מהמערכת, הוסף תגית בפורמט: [ACTION:ACTION_NAME]
תגיות אפשריות:
• [ACTION:INSURANCE_LINK] - לינק לביטוח
• [ACTION:SHOW_CALENDAR] - הצג לוח שנה
• [ACTION:CONFIRM_BOOKING] - אישור תור
• [ACTION:SCHEDULE_TRAINING] - תיאום אילוף
• [ACTION:UPLOAD_DOCUMENT] - העלאת מסמך
• [ACTION:SHOW_BOARDING_OPTIONS] - הצג פנסיונים
• [ACTION:ORDER_STATUS] - סטטוס הזמנה
• [ACTION:UPLOAD_PHOTO] - העלאת תמונה
• [ACTION:ESCALATE] - העברה לנציג
• [ACTION:EMERGENCY_CALL] - חיוג חירום

=== טון ===
• אמפתי, מקצועי ואוהב חיות
• עברית חמה ונעימה
• מקסימום אמוג'י אחד לכל הודעה
• תמיד סיים עם אופציות ממוספרות או כפתור פעולה
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
