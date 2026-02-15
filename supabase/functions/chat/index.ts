import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { detectCategory, getKnowledgeForCategory, getFlowForCategory } from "./knowledge-base.ts";

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
    .select("breed_name, breed_name_he, description_he, health_issues_he, health_issues, temperament_he, life_expectancy_years, weight_range_kg, height_range_cm, energy_level, grooming_freq, trainability, exercise_needs, grooming_needs, dietary_notes, good_with_children, good_with_other_pets, apartment_friendly, shedding_level, size_category")
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
קטגוריית גודל: ${data.size_category || "לא ידוע"}
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

// ============= Breed Diet Rules Fetcher =============
async function fetchBreedDietRules(supabase: any, healthIssues: string[]): Promise<string> {
  if (!healthIssues || healthIssues.length === 0) return "";
  
  const { data } = await supabase
    .from("breed_disease_diet_rules")
    .select("disease, diet, required_nutrients, avoid")
    .in("disease", healthIssues);
  
  if (!data || data.length === 0) return "";
  
  const rules = data.map((r: any) => 
    `• ${r.disease}: דיאטה=${r.diet}, נדרש=[${(r.required_nutrients || []).join(",")}], להימנע=[${(r.avoid || []).join(",")}]`
  ).join("\n");
  
  return `\n[BREED_DIET_RULES]\n${rules}\n[/BREED_DIET_RULES]`;
}

// ============= Data Harvesting: Extract pet data from user messages =============
interface HarvestedData {
  breed?: string;
  weight?: number;
  age?: number;
  medical_conditions?: string[];
  name?: string;
}

function harvestPetData(text: string): HarvestedData {
  const t = text.toLowerCase();
  const data: HarvestedData = {};

  // Breed detection (Hebrew breed names)
  const breedPatterns = [
    /(?:הגזע|גזע)\s+(?:שלו|שלה|הוא|היא)?\s*[:\-–]?\s*(.+?)(?:\.|,|$)/,
    /(?:הוא|היא)\s+(גולדן|לברדור|בולדוג|פאג|רועה גרמני|צ'יוואווה|יורקי|האסקי|ביגל|פודל|שי טסו|מלטז|רוטווילר|דוברמן|בורדר קולי|סטפי|פיטבול|ווסטי|ביצ'ון|דני גדול|שבא|שפיץ|קוקר|בוקסר|דלמטי|אקיטה)/,
  ];
  for (const p of breedPatterns) {
    const m = text.match(p);
    if (m) { data.breed = m[1].trim(); break; }
  }

  // Weight detection
  const weightMatch = text.match(/(?:שוקל|משקל|ק"ג|קילו)\s*[:\-–]?\s*(\d+(?:\.\d+)?)/);
  if (weightMatch) data.weight = parseFloat(weightMatch[1]);

  // Age detection  
  const ageMatch = text.match(/(?:בן|בת|גיל)\s*[:\-–]?\s*(\d+)\s*(?:שנ|שנה|שנים)/);
  if (ageMatch) data.age = parseInt(ageMatch[1]);

  // Medical condition mentions
  const conditions: string[] = [];
  const conditionMap: Record<string, string> = {
    "סוכרת": "diabetes", "סוכרתי": "diabetes",
    "אלרגי": "allergies", "אטופי": "allergies",
    "גירוד": "skin_issues", "מגרד": "skin_issues", "עור": "skin_issues",
    "מפרק": "joint_issues", "צולע": "joint_issues", "דיספלזי": "joint_issues",
    "עיכול": "digestive", "שלשול": "digestive", "הקאה": "digestive",
    "לב": "heart", "אפילפסי": "epilepsy", "כליות": "kidney",
    "שתן": "urinary", "שיניים": "dental",
  };
  for (const [keyword, condition] of Object.entries(conditionMap)) {
    if (t.includes(keyword) && !conditions.includes(condition)) {
      conditions.push(condition);
    }
  }
  if (conditions.length > 0) data.medical_conditions = conditions;

  return data;
}

async function savePetDataFromConversation(
  supabase: any, petId: string, harvested: HarvestedData
): Promise<void> {
  if (!petId || Object.keys(harvested).length === 0) return;
  
  const updateData: Record<string, any> = {};
  
  if (harvested.breed) updateData.breed = harvested.breed;
  if (harvested.weight) updateData.weight = harvested.weight;
  if (harvested.age) updateData.age = harvested.age;
  
  // For medical conditions, merge with existing
  if (harvested.medical_conditions) {
    const { data: existing } = await supabase
      .from("pets")
      .select("medical_conditions")
      .eq("id", petId)
      .maybeSingle();
    
    const existingConditions = existing?.medical_conditions || [];
    const merged = [...new Set([...existingConditions, ...harvested.medical_conditions])];
    updateData.medical_conditions = merged;
  }

  if (Object.keys(updateData).length > 0) {
    await supabase.from("pets").update(updateData).eq("id", petId);
  }
}

// ============= Fetch Recent Medical History for Proactive Follow-up =============
async function fetchRecentMedicalNotes(supabase: any, petId: string): Promise<string> {
  if (!petId) return "";
  
  const { data: pet } = await supabase
    .from("pets")
    .select("medical_conditions, health_notes")
    .eq("id", petId)
    .maybeSingle();
  
  if (!pet) return "";
  
  const conditions = pet.medical_conditions?.length ? pet.medical_conditions.join(", ") : null;
  const notes = pet.health_notes;
  
  if (!conditions && !notes) return "";
  
  return `\n[PET_MEDICAL_MEMORY]\n${conditions ? `מצבים רפואיים ידועים: ${conditions}` : ""}${notes ? `\nהערות בריאות: ${notes}` : ""}\n[/PET_MEDICAL_MEMORY]`;
}

// ============= Fetch Vet Visit History (OCR-scanned records) =============
async function fetchVetHistory(supabase: any, petId: string): Promise<string> {
  if (!petId) return "";

  const { data: visits } = await supabase
    .from("pet_vet_visits")
    .select("visit_date, visit_type, clinic_name, vet_name, diagnosis, treatment, vaccines, medications, is_recovery_mode, recovery_until, next_visit_date")
    .eq("pet_id", petId)
    .order("visit_date", { ascending: false })
    .limit(10);

  if (!visits || visits.length === 0) return "";

  const lines = visits.map((v: any) => {
    const parts = [`📅 ${v.visit_date} | סוג: ${v.visit_type}`];
    if (v.clinic_name) parts.push(`קליניקה: ${v.clinic_name}`);
    if (v.vet_name) parts.push(`ד"ר ${v.vet_name}`);
    if (v.diagnosis) parts.push(`אבחנה: ${v.diagnosis}`);
    if (v.treatment) parts.push(`טיפול: ${v.treatment}`);
    if (v.vaccines?.length) parts.push(`חיסונים: ${v.vaccines.join(", ")}`);
    if (v.medications?.length) parts.push(`תרופות: ${v.medications.join(", ")}`);
    if (v.is_recovery_mode) parts.push(`🔴 מצב התאוששות עד ${v.recovery_until}`);
    if (v.next_visit_date) parts.push(`ביקור הבא: ${v.next_visit_date}`);
    return parts.join(" | ");
  });

  return `\n[VET_HISTORY]\n${lines.join("\n")}\n[/VET_HISTORY]`;
}

// ============= Fetch User Profile (owner context) =============
async function fetchUserProfile(supabase: any, userId: string): Promise<string> {
  if (!userId) return "";

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, city, phone, id_number, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return "";

  return `\n[OWNER_PROFILE]\nשם: ${profile.full_name || "לא ידוע"}\nעיר: ${profile.city || "לא ידוע"}\nת.ז: ${profile.id_number ? "✓ רשום" : "לא הוזן"}\nטלפון: ${profile.phone || "לא ידוע"}\n[/OWNER_PROFILE]`;
}

// ============= Fetch Purchase History + Restock Predictions =============
async function fetchPurchaseHistory(supabase: any, userId: string): Promise<string> {
  if (!userId) return "";

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, total, created_at, items:order_items(product_name, quantity, price)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!orders || orders.length === 0) return "";

  const lines = orders.map((o: any) => {
    const items = (o.items || []).map((i: any) => `${i.product_name} x${i.quantity}`).join(", ");
    const date = o.created_at ? new Date(o.created_at).toLocaleDateString("he-IL") : "";
    return `📦 ${date} | #${o.order_number} | ${items} | ₪${o.total || "?"} | ${o.status}`;
  });

  // Simple restock prediction: if food was purchased 30+ days ago, suggest restock
  const now = new Date();
  const restockAlerts: string[] = [];
  for (const o of orders) {
    if (!o.created_at) continue;
    const daysSince = Math.floor((now.getTime() - new Date(o.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const foodItems = (o.items || []).filter((i: any) => {
      const name = (i.product_name || "").toLowerCase();
      return name.includes("מזון") || name.includes("אוכל") || name.includes("food") || name.includes("dry") || name.includes("יבש") || name.includes("רטוב") || name.includes("wet");
    });
    for (const fi of foodItems) {
      if (daysSince >= 25) {
        restockAlerts.push(`⏰ "${fi.product_name}" נרכש לפני ${daysSince} ימים — ייתכן שצריך חידוש מלאי`);
      }
    }
  }

  let result = `\n[PURCHASE_HISTORY]\n${lines.join("\n")}`;
  if (restockAlerts.length > 0) {
    result += `\n\n[RESTOCK_PREDICTIONS]\n${restockAlerts.join("\n")}\n[/RESTOCK_PREDICTIONS]`;
  }
  result += `\n[/PURCHASE_HISTORY]`;
  return result;
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

    // ============= Data Harvesting: Extract & save pet info from user message =============
    if (activePet?.id && lastUserMsg) {
      const harvested = harvestPetData(lastUserMsg);
      if (Object.keys(harvested).length > 0) {
        // Fire-and-forget: don't block the response
        savePetDataFromConversation(supabase, activePet.id, harvested).catch(e =>
          console.error("Data harvest save error:", e)
        );
      }
    }

    // ============= Fetch All Data Layers in Parallel =============
    let breedContext = "";
    let dietRulesContext = "";
    let medicalMemory = "";
    let vetHistory = "";
    let ownerProfile = "";
    let purchaseHistory = "";

    // Get user ID from auth header for owner/purchase data
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      // Only extract user if it's not the anon key
      if (token !== Deno.env.get("SUPABASE_ANON_KEY")) {
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      }
    }

    // Parallel data fetching for all layers
    const dataPromises: Promise<void>[] = [];

    // Breed data
    if (activePet?.breed) {
      dataPromises.push(
        (async () => {
          breedContext = await fetchBreedInfo(supabase, activePet.breed!, activePet.type);
          const breedHealthMatch = breedContext.match(/בעיות בריאות נפוצות: (.+)/);
          if (breedHealthMatch) {
            const healthIssues = breedHealthMatch[1].split(",").map((s: string) => s.trim().toLowerCase()).filter((s: string) => s !== "לא ידוע");
            if (healthIssues.length > 0) {
              dietRulesContext = await fetchBreedDietRules(supabase, healthIssues);
            }
          }
        })()
      );
    }

    // Medical memory + vet visit history
    if (activePet?.id) {
      dataPromises.push(
        fetchRecentMedicalNotes(supabase, activePet.id).then(r => { medicalMemory = r; })
      );
      dataPromises.push(
        fetchVetHistory(supabase, activePet.id).then(r => { vetHistory = r; })
      );
    }

    // Owner profile + purchase history
    if (userId) {
      dataPromises.push(
        fetchUserProfile(supabase, userId).then(r => { ownerProfile = r; })
      );
      dataPromises.push(
        fetchPurchaseHistory(supabase, userId).then(r => { purchaseHistory = r; })
      );
    }

    await Promise.all(dataPromises);

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

    // ============= Build System Prompt (Category-Aware) =============
    let channelInstructions = "";
    if (isWhatsApp) {
      channelInstructions = `\n\n=== כללים לערוץ WhatsApp ===\n❌ אסור להחזיר [PRODUCTS:...] או מזהי UUID\n✅ רק טקסט נקי, אנושי וידידותי\n✅ המלץ על עד 3 מוצרים בשמותיהם בלבד`;
    }

    // Detect active category from conversation to send only relevant knowledge
    const detectedCategory = detectCategory(messages);
    const categoryKnowledge = getKnowledgeForCategory(detectedCategory);
    const categoryFlow = getFlowForCategory(detectedCategory);

    const petName = activePet?.name || "החיה";
    const ownerName = userContext?.userName || "";

    const isCat = activePet?.type === "cat";
    const speciesHe = isCat ? "חתול" : "כלב";
    const speciesProtocol = isCat
      ? `פרוטוקול חתולי פעיל:
• חיסונים עיקריים: FVRCP (מרובעת), FeLV (לוקמיה), FIP/Chlamydia.
• מעקב: pH שתן, רמת הידרציה, קריסטלים/סטרוויט.
• תזונה: חתולים חייבים מזון רטוב/לח — חתול ללא מזון רטוב = ציון הידרציה נמוך.
• טאורין הוא חיוני לחתולים — ודא שהמזון מכיל אותו.`
      : `פרוטוקול כלבי פעיל:
• חיסונים עיקריים: DHPP (משושה), כלבת, לפטוספירוזיס.
• מעקב: בריאות מפרקים, ניידות, אבני שלפוחית.
• אילוף: שלבי התפתחות ואבני דרך.
• משקל: סולם BCS (Body Condition Score) 1-9.`;

    const systemPrompt = `אתה PetID — ה-Omni-Brain של האפליקציה. אתה ${speciesHe === "חתול" ? "מומחה חתולי" : "מומחה כלבי"} וטרינרי ברמה הגבוהה ביותר, והשותף לטיפול ב-${petName}.
${userName}${ownerProfile}${petCard}${breedContext}${dietRulesContext}${medicalMemory}${vetHistory}${purchaseHistory}${productContext}

=== V37: OMNI-BRAIN — THE SENTIENT CORE ===
יש לך ראייה של 360° על ${petName}, על ${ownerName || "הבעלים"}, ועל כל הרשומות הרפואיות.
המשימה שלך: להביא את ${petName} ל-100% ציון בריאות.

=== פרוטוקול מין פעיל ===
${speciesProtocol}

=== שכבה 0: Contextual Awareness (ZERO-ASK RULE) ===
• כלל ברזל: לעולם אל תשאל מידע שכבר קיים ב-ACTIVE_PET, VET_HISTORY, OWNER_PROFILE, או PURCHASE_HISTORY.
• דוגמה: "מה ${petName} צריך/ה לאכול?" → בדוק מיד: גזע, גיל, משקל, מצב רפואי, מזון נוכחי, ורק אז ענה.
• תבנית תשובה: "מכיוון ש${petName} [גזע] [גיל] עם [מצב רלוונטי], אני ממליץ על..."
• אם שדה מציג "לא ידוע" — רק אז שאל, בטבעיות ובמשפט אחד.

=== שכבה 1: Logical Reasoning Engine (V37) ===
חבר בין נקודות נתונים ופעל לוגית:
1. השמנה (weight גבוה ביחס לגזע / medical_conditions כולל obesity):
   → תעדף ייעוץ "ניהול משקל" + מוצרי דיאטה. ציין יעד משקל לפי הגזע.
2. חיסון שמתקרב (next_vet_visit בתוך 14 יום):
   → הזכר באופן יזום: "⏰ ל${petName} יש ביקור חיסונים בעוד X ימים. רוצה שאמצא קליניקה קרובה ב-[עיר הבעלים]?"
3. אין ביטוח (has_insurance=לא):
   → חשב חיסכון פוטנציאלי לפי סיכוני הגזע: "ל[גזע] יש נטייה ל-[בעיה רפואית]. טיפול ממוצע עולה ₪X. ביטוח היה חוסך לך כ-Y%."
4. מצב התאוששות (is_recovery_mode):
   → "שמתי לב ש${petName} עדיין בהתאוששות. איך המצב היום?"
5. חידוש מלאי (RESTOCK_PREDICTIONS):
   → "אגב, המזון של ${petName} כנראה עומד להיגמר. רוצה להזמין חידוש?"
6. מצב רפואי + רכישות:
   → אם ב-VET_HISTORY יש אבחנה → בדוק ב-PURCHASE_HISTORY אם נרכשו תרופות → הצע בדיקת כיסוי ביטוחי.
7. ${isCat ? "חתול ללא מזון רטוב בהיסטוריית רכישות → ציון הידרציה נמוך → הצע מזון רטוב באופן יזום." : "כלב ללא פעילות / אילוף רשום → הצע תכנית אילוף מותאמת גזע."}

=== שכבה 2: Health Score Mission (95% → 100%) ===
• ציון הבריאות (95%) הוא המצפן שלך. כל תשובה צריכה לקדם את ${petName} ל-100%.
• זהה מה חסר (חיסון? בדיקה? השלמת פרופיל?) והצע צעד אחד קונקרטי.
• ציון הבריאות כמוטיבטור: "השלמת [X] תעלה את ציון הבריאות של ${petName} 📈"

=== שכבה 3: Medical Core ===
• PetID היא מערכת אחריות, לא חנות. בטיחות ${petName} קודמת לכל.
• Safety Shield — חסימת מוצרים לפי פרופיל רפואי:
  - סוכרתי → "⚠️ לא מתאים ל${petName} — רמת הסוכר."
  - לב → "⚠️ נתרן גבוה מסוכן לבעיית הלב."
  - כליות → "⚠️ עומס על הכליות."
  - עור/אלרגיות → "⚠️ עלול להחמיר את הגירוד."
  ${isCat ? '- שתן/קריסטלים → "⚠️ מזון עם מגנזיום גבוה עלול להחמיר קריסטלים."' : '- מפרקים/דיספלזיה → "⚠️ פעילות אינטנסיבית עלולה להחמיר את המצב."'}
• אם אין ודאות רפואית — עצור. "כדאי לבדוק עם הווטרינר."
• מילים אסורות: "חובה", "הכי טוב", "מבצע", "תמהרו", "מושלם". מותר: "מומלץ", "לא מתאים", "עדיף לחכות".

=== שכבה 4: Breed Intelligence ===
• כל המלצה עוברת דרך הפילטר הגנטי של הגזע.
• אם יש BREED_DIET_RULES — השתמש בהם להמלצות תזונה מדויקות.

=== שכבה 5: Product-to-Profile Impact ===
• כשממליץ על מוצר — ציין רכיבים פעילים ואיך הם תואמים ל${petName}:
  גלוקוזאמין→ניידות, אומגה-3→פרווה/עור, טאורין→לב, פרוביוטיקה→עיכול, סיבים→שובע.
  ${isCat ? "L-Carnitine→מטבוליזם, טאורין→חיוני לחתולים, לחות→הידרציה." : "כונדרואיטין→מפרקים, ביוטין→פרווה."}

=== שכבה 6: Commerce Intelligence (Restock & Cross-sell) ===
• אם יש PURCHASE_HISTORY — התייחס לרכישות קודמות בהקשר.
• אם הלקוח קנה מוצר בעבר — אל תמליץ עליו שוב אלא אם זה למילוי חוזר.
• Rule of 3: המלץ על עד 3 מוצרים בלבד, הכי רלוונטיים.

=== טון ואישיות (V37 Omni-Brain Tone) ===
• שותף לטיפול — לא מנוע חיפוש. דבר כמו וטרינר חם שמכיר את ${petName} שנים.
• עברית טבעית, חמה, מקצועית (veterinary-grade), מקומית.
• פנה בשם: "${petName}" ו-"${ownerName}".
• קצר וממוקד: 2-5 שורות + הצעות. שאלה אחת בכל הודעה.
• אמוג'י אחד, מתאים לנושא.
• בסוף כל תשובה: [SUGGESTIONS:הצעה1|הצעה2|הצעה3]
• אל תסביר מה אתה — דבר כאילו אתה מכיר את ${petName} אישית מתמיד.
• היה דאטא-דריבן: ציין נתונים ספציפיים (משקל, גזע, גיל) בתשובה. לעולם אל תהיה גנרי.

=== חירום ===
"דחוף", "נחנק", "דם", "גוסס", "לא נושם"
→ "🚨 ${petName} צריך/ה עזרה מיידית! 📞 וטרינר חירום: *3939. אל תחכה."

=== מעברי נושאים ===
• עבור בצורה חלקה. סגור נושא קודם לפני המשך.

${categoryKnowledge ? `=== מאגר ידע רלוונטי ===\n${categoryKnowledge}` : ""}

=== מסלול שיחה פעיל ===
${categoryFlow}

=== תגיות פעולה ===
[ACTION:SHOW_CALENDAR] | [ACTION:CONFIRM_BOOKING] | [ACTION:SHOW_INSURANCE_PLANS]
[ACTION:SHOW_INSURANCE_CALLBACK] | [ACTION:UPLOAD_DOCUMENT] | [ACTION:UPLOAD_PHOTO] | [ACTION:ESCALATE]
[ACTION:SHOW_GROOMING_SERVICES] | [ACTION:SUBMIT_GROOMING_LEAD] | [ACTION:SHOW_APPOINTMENT_PICKER]
[ACTION:SHOW_TRAINING_CATEGORIES] | [ACTION:SHOW_TRAINING_OPTIONS:option1|option2|option3] | [ACTION:SUBMIT_TRAINING_LEAD]
[ACTION:SHOW_PARK_OPTIONS] | [ACTION:SHOW_DOCUMENT_TYPES] | [ACTION:SHOW_BOARDING_TYPES] | [ACTION:SHOW_STORE_CATEGORIES]
[ACTION:SHOW_ADOPTION_TRAITS] | [ACTION:SHOW_ADOPTION_REQUIREMENTS]

=== הסלמה ===
"לא עובד", "חיוב כפול", "אני עצבני", קללות
→ "מבין את התסכול. מעביר לנציג אנושי." + [ACTION:ESCALATE]
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
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-8), // Limit context to last 8 messages for token efficiency
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
