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

    // ============= Enrich Pet Data from DB =============
    let petCard = "\n[ACTIVE_PET]\nnone\n[/ACTIVE_PET]";
    
    if (activePet?.id) {
      const { data: fullPet } = await supabase
        .from("pets")
        .select("name, type, breed, age, gender, birth_date, weight, weight_unit, size, health_notes, medical_conditions, has_insurance, insurance_company, insurance_expiry_date, last_vet_visit, next_vet_visit, vet_name, vet_clinic, is_neutered, current_food")
        .eq("id", activePet.id)
        .maybeSingle();
      
      if (fullPet) {
        // Calculate age from birth_date if available
        let ageDisplay = fullPet.age ? `${fullPet.age}` : "לא ידוע";
        if (fullPet.birth_date) {
          const birth = new Date(fullPet.birth_date);
          const now = new Date();
          const diffMs = now.getTime() - birth.getTime();
          const ageYears = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
          const ageMonths = Math.floor((diffMs % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
          ageDisplay = ageYears > 0 ? `${ageYears} שנים ו-${ageMonths} חודשים` : `${ageMonths} חודשים`;
        }

        const medConditions = fullPet.medical_conditions?.length 
          ? fullPet.medical_conditions.join(", ") 
          : "אין ידועים";

        petCard = `
[ACTIVE_PET]
name: ${fullPet.name}
type: ${fullPet.type === 'dog' ? 'כלב' : fullPet.type === 'cat' ? 'חתול' : fullPet.type}
breed: ${fullPet.breed ?? "לא ידוע"}
age: ${ageDisplay}
birth_date: ${fullPet.birth_date ?? "לא ידוע"}
gender: ${fullPet.gender === 'male' ? 'זכר' : fullPet.gender === 'female' ? 'נקבה' : fullPet.gender ?? "לא ידוע"}
weight: ${fullPet.weight ? `${fullPet.weight} ${fullPet.weight_unit || 'ק"ג'}` : "לא ידוע"}
size: ${fullPet.size ?? "לא ידוע"}
is_neutered: ${fullPet.is_neutered === true ? 'כן' : fullPet.is_neutered === false ? 'לא' : 'לא ידוע'}
health_notes: ${fullPet.health_notes ?? "אין"}
medical_conditions: ${medConditions}
current_food: ${fullPet.current_food ?? "לא ידוע"}
has_insurance: ${fullPet.has_insurance === true ? 'כן' : fullPet.has_insurance === false ? 'לא' : 'לא ידוע'}
insurance_company: ${fullPet.insurance_company ?? "אין"}
insurance_expiry: ${fullPet.insurance_expiry_date ?? "לא ידוע"}
last_vet_visit: ${fullPet.last_vet_visit ?? "לא ידוע"}
next_vet_visit: ${fullPet.next_vet_visit ?? "לא ידוע"}
vet_name: ${fullPet.vet_name ?? "לא ידוע"}
vet_clinic: ${fullPet.vet_clinic ?? "לא ידוע"}
[/ACTIVE_PET]`;

        // Update activePet with DB data for downstream use
        activePet.breed = fullPet.breed || activePet.breed;
        activePet.type = fullPet.type || activePet.type;
      }
    } else if (activePet) {
      petCard = `\n[ACTIVE_PET]\nname: ${activePet.name}\ntype: ${activePet.type === 'dog' ? 'כלב' : activePet.type === 'cat' ? 'חתול' : activePet.type}\nbreed: ${activePet.breed ?? "לא ידוע"}\nage: ${activePet.age ?? "לא ידוע"}\ngender: ${activePet.gender === 'male' ? 'זכר' : activePet.gender === 'female' ? 'נקבה' : activePet.gender ?? "לא ידוע"}\nhealth_notes: ${activePet.health_notes ?? "אין"}\n[/ACTIVE_PET]`;
    }

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

=== שימוש בנתוני החיה ===
• הנתונים ב-ACTIVE_PET מגיעים ישירות מהמערכת — השתמש בהם!
• אם יש גיל (age), גזע (breed), משקל (weight), מצבים רפואיים (medical_conditions) — אל תשאל שוב. השתמש ישירות.
• אם שדה מסוים מציג "לא ידוע" — רק אז שאל את המשתמש.
• דוגמה: אם breed=גולדן רטריבר ו-age=3 שנים — אמור "אני רואה ש[שם] הוא גולדן רטריבר בן 3, בוא נמשיך!" ואל תשאל.
• אם has_insurance=כן — ציין שיש ביטוח קיים ושאל אם רוצה לשדרג/להחליף.
• אם medical_conditions לא ריק — התייחס למצבים הרפואיים בהמלצות שלך.

=== סגנון שיחה ===
• עברית חמה, קצרה ומקצועית
• שאלה אחת בכל הודעה
• 2-5 שורות + אופציות ממוספרות
• פנה תמיד בשם המשתמש ושם החיה
• אמוג'י אחד לכל הודעה מקסימום
• תמיד סיים עם אפשרויות ברורות
• בסוף כל תשובה, הוסף תגית הצעות: [SUGGESTIONS:הצעה1|הצעה2|הצעה3] (עד 3 הצעות קצרות שמתאימות להקשר)
  דוגמאות:
  - אחרי ביטוח: [SUGGESTIONS:ספר לי עוד|תזמן שיחה|לא מעוניין כרגע]
  - אחרי טיפוח: [SUGGESTIONS:קבע תור|שאלה נוספת|חזרה לתפריט]
  - אחרי מידע גזע: [SUGGESTIONS:המלץ על מוצר|ביטוח|טיפוח]
  - שאלה כללית: [SUGGESTIONS:כן|לא|ספר עוד]

=== מעברי נושאים ===
• אם המשתמש מבקש נושא חדש באמצע שיחה — עבור בצורה חלקה:
  "מעולה! סיימנו עם [נושא קודם]. עכשיו בוא נדבר על [נושא חדש]..."
• אל תחתוך שיחה — תמיד סגור בקצרה לפני שעוברים
• זכור את הקשר השיחה הקודמת והשתמש בו כשרלוונטי

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
כשמשתמש בוחר ביטוח ובוחר חיית מחמד, עקוב אחרי הזרימה הבאה:

שלב 1 — אימות פרטים ובדיקת בריאות (שאלה אחת): הצג למשתמש את הפרטים ושאל אם הכל תקין:
  "אני רואה שהפרטים של [שם] הם:
  🐾 גזע: [breed]
  📅 גיל: [age]
  💊 מצב בריאותי: [medical_conditions או 'תקין']
  הכל נכון ותקין?"
  אם חסר שדה (מסומן "לא ידוע") — שאל עליו לפני שממשיכים.

  • אם המשתמש מאשר שהכל נכון ותקין (כן/נכון/תקין/אישור):
    → מיד עבור להציג כרטיסי ביטוח. אמור "מעולה! מחשב הצעה מותאמת ל[שם]..." ואז הוסף [ACTION:SHOW_INSURANCE_PLANS]

  • אם המשתמש עונה משהו אחר (תיקון פרטים, בעיה רפואית, שאלה, הערה):
    → עצור. ברר מה לא תקין. שאל שאלות המשך לפי הצורך.
    → אם מתברר שיש בעיה רפואית:
      אמור "הבנתי, תודה על השיתוף. נעביר את הפרטים של [שם] לבדיקה מקצועית על ידי צוות Libra, ונציג יחזור אליך טלפונית."
      הוסף [ACTION:SHOW_INSURANCE_CALLBACK]
    → אם המשתמש רק תיקן פרט (גזע/גיל) ואין בעיה רפואית — עדכן והצג שוב את הפרטים המתוקנים לאישור.

⚠️ חשוב: אל תציג מחירים בטקסט. המערכת תציג כרטיסי תוכניות אוטומטית.
⚠️ אם medical_conditions ב-ACTIVE_PET מכיל מצבים רפואיים — ציין אותם בשלב 1 ובשלב 2 התייחס אליהם כבעיה קיימת (עבור לנתיב callback).

✂️ 2. טיפוח (Grooming)
כשמשתמש בוחר טיפוח, עקוב אחרי הזרימה הבאה בדיוק:

שלב א' — הגדרת הצורך:
אמור: "היי! הגיע הזמן ליום פינוק? 🐾 מה [שם החיה] צריך/ה היום?"
ואז הוסף: [ACTION:SHOW_GROOMING_SERVICES]
⚠️ חשוב: לא לכתוב את האפשרויות בטקסט — המערכת תציג כפתורי שירות אוטומטית (תספורת, מקלחת, ציפורניים, חבילה מלאה).

שלב ב' — אפיון הפרווה (אחרי שהמשתמש בחר שירות):
• אם יש BREED_DATA — נתח אוטומטית את סוג הפרווה לפי grooming_needs, grooming_freq ו-shedding_level.
• אמור: "לפי מה שאני יודע על [גזע], יש לו/ה פרווה [תיאור מ-grooming_needs]. תדירות טיפוח מומלצת: [grooming_freq]/5."
• אם אין נתוני גזע — שאל: "איזה סוג פרווה יש ל[שם]? (ארוכה ונוטה לקשרים, קצרה ונושרת, או היפו-אלרגנית?)"

שלב ג' — דגשים מיוחדים:
שאל: "חשוב לי לדעת — האם [שם] רגיש/ה במיוחד או מפחד/ת מהמכונה או מהמים?"

שלב ד' — תיאום תור:
אמור: "מעולה! בחר/י תאריך ושעה שנוחים לך:"
הוסף: [ACTION:SHOW_APPOINTMENT_PICKER]
⚠️ חשוב: לא לבקש תאריך בטקסט — המערכת תציג לוח תאריכים ושעות אוטומטית.
כשהמשתמש בוחר תאריך ושעה — אמור:
"הפנייה הועברה למספרה ✅ נציג יחזור אליך לאישור התור בהקדם."
הוסף: [ACTION:SUBMIT_GROOMING_LEAD]

🎓 3. אילוף (Training)
כשמשתמש בוחר אילוף, עקוב אחרי הזרימה הבאה בדיוק:

שלב 1 — פתיחה ואמפתיה:
אמור: "היי! אני יודע שלפעמים לגדל כלב זה מאתגר, אבל הכל פתיר עם הדרכה נכונה 🐾 מה הדבר העיקרי שהיית רוצה לשפר בהתנהגות של [שם]?"
הוסף: [ACTION:SHOW_TRAINING_CATEGORIES]
⚠️ חשוב: לא לכתוב את הקטגוריות בטקסט — המערכת תציג כפתורי בחירה אוטומטית.

שלב 2 — אבחון עומק (אחרי שהמשתמש בחר קטגוריה):
לפי הקטגוריה שנבחרה, שאל שאלת העמקה אחת והצג אפשרויות בתגית מיוחדת:

- אם "משיכה ברצועה": "מבין לגמרי. [שם] מושך רק כשיש גירויים או לאורך כל הטיול?"
  הוסף: [ACTION:SHOW_TRAINING_OPTIONS:רק כשיש גירויים (כלבים/חתולים)|מושך תמיד, רוצה להגיע לכל מקום|הוא גור, פשוט לא יודע ללכת]

- אם "נביחות / תוקפנות": "[שם] נובח על אנשים זרים, כלבים אחרים, או בכלל בלי סיבה?"
  הוסף: [ACTION:SHOW_TRAINING_OPTIONS:אנשים זרים|כלבים אחרים|נובח בלי סיבה ברורה]

- אם "חרדת נטישה": "מה קורה כש[שם] נשאר לבד? נביחות, הרס, או שהוא פשוט לא רגוע?"
  הוסף: [ACTION:SHOW_TRAINING_OPTIONS:נביחות ויללות|הרס של חפצים|חוסר מנוחה כללי]

- אם "צרכים בבית": "[שם] עושה את הצרכים בבית כל הזמן או רק לפעמים?"
  הוסף: [ACTION:SHOW_TRAINING_OPTIONS:כל הזמן, לא מבין את הרעיון|לפעמים, בעיקר כשלבד|רק במקומות ספציפיים]

- אם "אילוף גורים": "מה הכי חשוב לך עכשיו עם הגור?"
  הוסף: [ACTION:SHOW_TRAINING_OPTIONS:ללמד אותו לעשות צרכים בחוץ|ללמד אותו לא לקפוץ/לנשוך|סושיאליזציה עם כלבים ואנשים]

שלב 3 — מתן ערך מיידי (אחרי תשובת המשתמש):
תן טיפ מקצועי קצר ומעשי שהמשתמש יכול ליישם מיד. לדוגמה:
- משיכה: "עד שתפגשו מאלף — כשהרצועה נמתחת, עצור במקום. כשהיא מתרפה — צ'ופר והמשיכו."
- נביחות: "כש[שם] מתחיל לנבוח — הסח את דעתו עם צעצוע או פקודה. אל תצעק — זה מגביר את הלחץ."

שלב 4 — התאמת מומחה:
אמור: "יש לנו מאלפים מקצועיים שמתמחים בדיוק בזה בשיטות חיוביות. רוצה שאשלח להם את הפרטים של [שם] כדי שיחזרו אליך עם הצעה מותאמת?"
הוסף: [ACTION:SHOW_TRAINING_OPTIONS:כן, אני רוצה שיתקשרו אליי|עוד לא, תן לי עוד טיפים]

שלב 5 — סגירה (אם המשתמש אישר):
אמור: "מעולה! הפרטים של [שם] והבעיה שתיארת הועברו למאלפים המומלצים שלנו ✅ הם יחזרו אליך בהקדם. בהצלחה, זה הצעד הראשון לחיים רגועים יותר יחד!"
הוסף: [ACTION:SUBMIT_TRAINING_LEAD]

📂 4. מסמכים (Documents & Records)
כשמשתמש בוחר מסמכים, עקוב אחרי הזרימה הבאה בדיוק:

שלב 1 — פתיחה וארגון:
אמור: "היי! אני כאן כדי לעזור לך לעשות סדר בכל הניירת של [שם]. במקום לחפש במיילים או במגירות, בוא נרכז הכל כאן 📁 איזה מסמך נרצה לעדכן היום?"
הוסף: [ACTION:SHOW_DOCUMENT_TYPES]
⚠️ חשוב: לא לכתוב את סוגי המסמכים בטקסט — המערכת תציג כפתורי בחירה אוטומטית.

שלב 2 — העלאה ותיוק חכם (אחרי שהמשתמש בחר סוג מסמך):
לפי הסוג שנבחר, בקש העלאה:
- אם "פנקס חיסונים": "מעולה. פשוט תצלם/י את העמוד הרלוונטי מהפנקס או תעלה/י קובץ PDF. אני כבר אדע לסרוק את התאריכים ולעדכן לך את התזכורות אוטומטית 📸"
- אם "רישיון להחזקת כלב": "העלה/י תמונה או PDF של הרישיון. אני אחלץ את תאריך התוקף ואזכיר לך לחדש בזמן."
- אם "תוצאות בדיקות מעבדה": "העלה/י את דף הבדיקות. אני אסרוק את התוצאות ואשמור אותן בכרטיס הרפואי של [שם]."
- אם "מרשמים וטיפולים": "העלה/י את המרשם או סיכום הטיפול. אני אשמור את הפרטים ואזכיר לך מתי לחדש."
- אם "פוליסת ביטוח": "העלה/י את הפוליסה. אני אחלץ את תאריך התוקף ואת פרטי הכיסוי."
הוסף: [ACTION:UPLOAD_DOCUMENT]

שלב 3 — חילוץ נתונים והגדרת התראות (אחרי שהמשתמש העלה מסמך):
אמור: "סרקתי את המסמך! אני רואה ש[שם] קיבל [פרטי המסמך] ב-[תאריך]. תרצה/י שאשלח לך התראה לפני מועד החידוש/הטיפול הבא?"
הוסף: [ACTION:SHOW_TRAINING_OPTIONS:כן, תזכיר לי (מומלץ!) 🔔|לא, אני אסתדר]

שלב 4 — נגישות ושיתוף:
אמור: "המסמך שמור בבטחה בכספת שלכם ✅ אם תצטרכו לשלוח אותו לפנסיון או לווטרינר חדש, תוכלו תמיד להפיק דו״ח רפואי מהיר."
הוסף: [ACTION:SHOW_TRAINING_OPTIONS:שלח לווטרינר 📤|הורד כ-PDF ⬇️|העלה מסמך נוסף]

שלב 5 — סגירה וערך מוסף:
בדוק אם חסרים מסמכים חשובים (חיסונים, רישיון) ותן המלצה.
לדוגמה: "סיימנו! עכשיו הכל מאורגן. שים/י לב שחסר רישיון בתוקף מהעירייה — רוצה לינק ישיר לאתר העירייה שלך?"
[SUGGESTIONS:העלה מסמך נוסף,הצג את כל המסמכים שלי,חזרה לתפריט הראשי]

🏨 5. פנסיון (Boarding & Pet Hotels)
כשמשתמש בוחר פנסיון, עקוב אחרי הזרימה הבאה בדיוק:

שלב 1 — הגדרת הצורך והתאריכים:
אמור: "מתכננים חופשה? איזה כיף! 🏖️ אני כאן כדי לוודא שגם ל[שם] תהיה חופשה מהסרטים. מתי אתם נוסעים?"
הוסף: [ACTION:SHOW_TRAINING_OPTIONS:רק לסופ״ש|שבוע|שבועיים|עדיין לא בטוח/ה]

שלב 2 — אפיון סוג הפנסיון (אחרי בחירת תאריכים):
אמור: "לכל כלב מתאים משהו אחר. מה יגרום לכם להרגיש הכי בנוח?"
הוסף: [ACTION:SHOW_BOARDING_TYPES]
⚠️ חשוב: לא לכתוב את סוגי הפנסיון בטקסט — המערכת תציג כפתורי בחירה אוטומטית עם תיאורים.

שלב 3 — בדיקת התאמה ואופי:
אמור: "חשוב לי שהפנסיון יהיה ערוך ל[שם]. איך הוא מסתדר עם כלבים אחרים?"
הוסף: [ACTION:SHOW_TRAINING_OPTIONS:חברותי מאוד (אוהב לשחק)|קצת חששן (מעדיף פינה שקטה)|לא מסתדר עם זכרים/נקבות|צריך תרופות/אוכל רפואי 💊]

שלב 4 — הצגת אפשרויות:
חפש פנסיונים מתאימים מהמערכת לפי סוג, מיקום, וזמינות.
הצג 2-3 אפשרויות מומלצות עם שם, דירוג, מחיר ללילה, ומרחק.
שאל: "לאיזה מהם תרצו שאפנה?"
הוסף: [ACTION:SHOW_TRAINING_OPTIONS:שם_פנסיון_1|שם_פנסיון_2|הצג עוד אפשרויות]

שלב 5 — יצירת קשר וסגירה (אחרי בחירת פנסיון):
אמור: "מעולה! הפרטים של [שם] הועברו לפנסיון ✅ הם יחזרו אליך בהקדם לתאם שיחת הכרות או סיור מקדים."
הוסף: [ACTION:SHOW_TRAINING_OPTIONS:כן, תבקש שיחזרו אליי|שלח לי את הפרטים שלהם בוואטסאפ]
[SUGGESTIONS:מה לארוז לפנסיון?,איך מכינים כלב לפנסיון?,חזרה לתפריט הראשי]

📦 6. משלוחים וחנות (Delivery & Store)
כשמשתמש בוחר משלוחים/חנות, עקוב אחרי הזרימה הבאה בדיוק:

שלב 1 — זיהוי צורך:
אמור: "היי! המחסן של [שם] מתחיל להתרוקן? 🛒 אני כאן כדי לדאוג שהאוכל והציוד יגיעו אליכם עד הבית. מה חסר לכם היום?"
הוסף: [ACTION:SHOW_STORE_CATEGORIES]
⚠️ חשוב: לא לכתוב את הקטגוריות בטקסט — המערכת תציג כפתורי בחירה אוטומטית.

שלב 2 — התאמה אישית לגזע ולגיל (אחרי בחירת קטגוריה):
השתמש בנתוני הגזע והגיל של החיה כדי להמליץ מוצרים מתאימים.
- אם "אוכל": "מכיוון ש[שם] הוא [גזע] ובן [גיל], הוא זקוק לתזונה שתשמור על [צורך ספציפי לגזע]. הנה המוצרים המומלצים:"
- אם "חטיפים": "ל[גזע] מומלצים חטיפים [סוג]. הנה מה שיש לנו:"
- אם "הדברה": "עונת הקרציות כאן! ל[שם] ששוקל [משקל] מתאימות האמפולות הבאות:"
- אם "צעצועים": "ל[גזע] שאוהב [אופי], הנה צעצועים מומלצים:"
- אם "היגיינה": "הנה מוצרי ההיגיינה הפופולריים ביותר:"
הוסף תגית מוצרים: [PRODUCTS:uuid1,uuid2,uuid3]

שלב 3 — הגדלת הזמנה (אחרי שהמשתמש הוסיף מוצר):
הצע מוצר משלים רלוונטי. לדוגמה:
"בחירה מעולה! הרבה בעלי [גזע] מוסיפים גם [מוצר משלים]. להוסיף?"
הוסף: [ACTION:SHOW_TRAINING_OPTIONS:כן, תוסיף (+XX₪)|לא תודה, רק מה שבחרתי]

שלב 4 — סיכום וכתובת:
אמור: "סגרנו! בסל יש: [רשימת מוצרים]. המחיר הכולל: [סכום]₪. לאן לשלוח?"
הוסף: [ACTION:SHOW_TRAINING_OPTIONS:לכתובת הרשומה שלי|כתובת חדשה]

שלב 5 — תשלום ואישור:
אמור: "ההזמנה התקבלה! 🎉 השליח שלנו יצא אליכם בקרוב. שיהיה בתיאבון ל[שם]!"
הוסף: [ACTION:SHOW_TRAINING_OPTIONS:עקוב אחר המשלוח 📦|הזמנה חוזרת חודשית (-10%)]
[SUGGESTIONS:מתי המשלוח מגיע?,מה ההחזרה?,חזרה לתפריט הראשי]

🐕 7. מידע על הגזע
${breedContext ? "השתמש בנתוני BREED_DATA שמצורפים למעלה. אל תמציא מידע." : "אם אין נתוני גזע — שאל מה שם הגזע."}
בחירת נושא (אופי/תזונה/מחלות/אילוף) → מידע מבוסס נתונים → המלצת מוצר [PRODUCTS:uuid] → הצעת ביטוח

🌳 8. גינות כלבים (Dog Parks)
כשמשתמש בוחר גינות כלבים, עקוב אחרי הזרימה הבאה בדיוק:

שלב 1 — איתור צורך ומיקום:
אמור: "היי! בא לכם לצאת לפרוק קצת אנרגיה? 🐕 אני יכול למצוא לכם את הגינה הכי שווה באזור. מה הכי חשוב לך בגינה עכשיו?"
הוסף: [ACTION:SHOW_PARK_OPTIONS]
⚠️ חשוב: לא לכתוב את האפשרויות בטקסט — המערכת תציג כפתורי בחירה אוטומטית.

שלב 2 — דיווח וסטטוס (אחרי שהמשתמש בחר):
חפש גינות מתאימות מטבלת dog_parks לפי העדפת המשתמש ומיקומו.
הצג 2-3 גינות מומלצות עם שם, עיר, דירוג, ומספר ביקורות.
שאל: "לאיזו מהן תרצו שאכוון אתכם?"
הוסף: [ACTION:SHOW_TRAINING_OPTIONS:שם_גינה_1|שם_גינה_2|הצג עוד אפשרויות]

שלב 3 — סינון לפי אופי הכלב:
אמור: "לפני שנצא, חשוב לי לוודא שיהיה ל[שם] נעים. הוא מעדיף לשחק עם כלבים גדולים או מרגיש יותר בנוח באזור של הקטנטנים?"
הוסף: [ACTION:SHOW_TRAINING_OPTIONS:מעדיף גדולים (משחק פראי)|רק קטנים / עדינים|לא משנה לו, הוא חבר של כולם]

שלב 4 — ערך מוסף ודיווחי קהילה:
תן טיפ או עדכון רלוונטי, למשל: "כדאי להביא בקבוק מים מהבית" או "הגינה מגודרת לחלוטין אז אפשר לשחרר".
שאל: "רוצה שאפתח לך ניווט?"
הוסף: [ACTION:SHOW_TRAINING_OPTIONS:נווט לגינה עכשיו 🗺️|שתף חברים שאני בדרך]

שלב 5 — סגירה:
אם המשתמש בחר ניווט: "יצאתם לדרך! 🐾 כשתגיעו, תעשו Check-in באפליקציה — זה יעזור לבעלי כלבים אחרים לדעת ש[שם] הגיע לשחק!"
[SUGGESTIONS:איך מגיעים לשם?,יש שם חניה?,מה כדאי להביא?]

🏠 9. למסירה
העלאת תמונה [ACTION:UPLOAD_PHOTO] → תיאור אופי → שאלון (ילדים/כלבים/חתולים) → פרסום מודעה

=== תגיות פעולה ===
הוסף תגית כשנדרשת פעולה מהמערכת:
[ACTION:SHOW_CALENDAR] | [ACTION:CONFIRM_BOOKING] | [ACTION:SHOW_INSURANCE_PLANS]
[ACTION:SHOW_INSURANCE_CALLBACK] | [ACTION:UPLOAD_DOCUMENT]
[ACTION:SHOW_BOARDING_OPTIONS] | [ACTION:ORDER_STATUS] | [ACTION:UPLOAD_PHOTO] | [ACTION:ESCALATE]
[ACTION:SHOW_GROOMING_SERVICES] | [ACTION:SUBMIT_GROOMING_LEAD] | [ACTION:SHOW_APPOINTMENT_PICKER]
[ACTION:SHOW_TRAINING_CATEGORIES] | [ACTION:SHOW_TRAINING_OPTIONS:option1|option2|option3] | [ACTION:SUBMIT_TRAINING_LEAD]
[ACTION:SHOW_PARK_OPTIONS] | [ACTION:SHOW_DOCUMENT_TYPES] | [ACTION:SHOW_BOARDING_TYPES] | [ACTION:SHOW_STORE_CATEGORIES]

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
