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

// ============= Clean Prose Post-Processor =============
function cleanProse(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")     // Remove **bold**
    .replace(/__(.*?)__/g, "$1")          // Remove __bold__
    .replace(/\*(.*?)\*/g, "$1")          // Remove *italic*
    .replace(/_(.*?)_/g, "$1")            // Remove _italic_
    .replace(/^#{1,6}\s+/gm, "")         // Remove # headings
    .replace(/^[\s]*[-*•]\s+/gm, "")     // Remove bullet points
    .replace(/^[\s]*\d+\.\s+/gm, "")     // Remove numbered lists
    .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, "")) // Remove code backticks
    .replace(/\n{3,}/g, "\n\n")           // Collapse excessive newlines
    .trim();
}


const DOUBLE_CHECK_KEYWORDS_HE = [
  "שבב", "מיקרוצ'יפ", "chip", "שבב אלקטרוני",
  "משקל", "שוקל", "weight", "קילו",
  "חיסון", "חיסונים", "vaccine", "vaccination",
  "nrc", "קלוריות", "kcal", "תזונה", "דיאטה", "מזון",
  "גזע", "breed", "סוג",
  "רישיון", "license", "רשיון",
  "ביטוח", "insurance", "פוליסה",
  "וטרינר", "vet", "רופא", "קליניקה",
  "עיקור", "סירוס", "neutered",
  "גיל", "תאריך לידה", "age",
];

interface DoubleCheckResult {
  triggered: boolean;
  matchedKeywords: string[];
  verifiedFacts: { field: string; value: string; source: string }[];
  antiHallucinationRecoveries: { field: string; value: string; source: string }[];
}

function detectDoubleCheckKeywords(text: string): string[] {
  const t = text.toLowerCase();
  return DOUBLE_CHECK_KEYWORDS_HE.filter(k => t.includes(k));
}

async function runDoubleCheckProtocol(
  supabase: any,
  petId: string,
  keywords: string[],
  petData: any,
): Promise<DoubleCheckResult> {
  const result: DoubleCheckResult = {
    triggered: true,
    matchedKeywords: keywords,
    verifiedFacts: [],
    antiHallucinationRecoveries: [],
  };

  // Map keywords to fields
  const keywordFieldMap: Record<string, { field: string; label: string }[]> = {
    "שבב": [{ field: "microchip_number", label: "מספר שבב" }],
    "מיקרוצ'יפ": [{ field: "microchip_number", label: "מספר שבב" }],
    "chip": [{ field: "microchip_number", label: "מספר שבב" }],
    "משקל": [{ field: "weight", label: "משקל" }],
    "שוקל": [{ field: "weight", label: "משקל" }],
    "weight": [{ field: "weight", label: "משקל" }],
    "קילו": [{ field: "weight", label: "משקל" }],
    "חיסון": [{ field: "vaccinations", label: "חיסונים" }],
    "חיסונים": [{ field: "vaccinations", label: "חיסונים" }],
    "vaccine": [{ field: "vaccinations", label: "חיסונים" }],
    "nrc": [{ field: "weight", label: "NRC/משקל" }],
    "קלוריות": [{ field: "weight", label: "NRC/קלוריות" }],
    "תזונה": [{ field: "current_food", label: "מזון נוכחי" }],
    "גזע": [{ field: "breed", label: "גזע" }],
    "breed": [{ field: "breed", label: "גזע" }],
    "רישיון": [{ field: "license_number", label: "רישיון" }],
    "ביטוח": [{ field: "insurance_company", label: "ביטוח" }],
    "וטרינר": [{ field: "vet_name", label: "וטרינר" }],
    "עיקור": [{ field: "is_neutered", label: "עיקור/סירוס" }],
    "גיל": [{ field: "birth_date", label: "תאריך לידה" }],
  };

  // Collect unique fields to verify
  const fieldsToVerify = new Set<{ field: string; label: string }>();
  for (const kw of keywords) {
    const mappings = keywordFieldMap[kw];
    if (mappings) mappings.forEach(m => fieldsToVerify.add(m));
  }

  // Step 1: Check pet profile (primary source)
  for (const { field, label } of fieldsToVerify) {
    if (field === "vaccinations") continue; // handled separately via OCR
    const val = petData?.[field];
    if (val != null && val !== "" && val !== "לא ידוע") {
      result.verifiedFacts.push({
        field: label,
        value: String(val),
        source: "Pet Profile (Manual Entry)",
      });
    }
  }

  // Step 2: Anti-Hallucination — deep search OCR + documents for missing fields
  const verifiedFieldLabels = new Set(result.verifiedFacts.map(f => f.field));

  // Fetch OCR data for unverified fields
  const { data: ocrDocs } = await supabase
    .from("pet_document_extracted_data")
    .select("chip_number, provider_name, vaccination_type, vaccination_date, vaccination_expiry, diagnosis, treatment_type, created_at")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: vaultDocs } = await supabase
    .from("pet_documents")
    .select("title, description, document_type")
    .eq("pet_id", petId)
    .order("uploaded_at", { ascending: false })
    .limit(20);

  // Recover microchip from OCR
  if (!verifiedFieldLabels.has("מספר שבב")) {
    const ocrChip = ocrDocs?.find((d: any) => d.chip_number)?.chip_number;
    if (ocrChip) {
      result.antiHallucinationRecoveries.push({
        field: "מספר שבב",
        value: ocrChip,
        source: "OCR Scan (recovered from document)",
      });
    }
  }

  // Recover vet from OCR
  if (!verifiedFieldLabels.has("וטרינר")) {
    const ocrVet = ocrDocs?.find((d: any) => d.provider_name)?.provider_name;
    if (ocrVet) {
      result.antiHallucinationRecoveries.push({
        field: "וטרינר",
        value: ocrVet,
        source: "OCR Scan (recovered from document)",
      });
    }
  }

  // Vaccinations from OCR
  if (keywords.some(k => ["חיסון", "חיסונים", "vaccine", "vaccination"].includes(k)) && ocrDocs) {
    const vaccines = ocrDocs.filter((d: any) => d.vaccination_type);
    for (const v of vaccines.slice(0, 5)) {
      const expiry = v.vaccination_expiry ? new Date(v.vaccination_expiry) : null;
      const status = expiry && expiry < new Date() ? "פג תוקף ⚠️" : "בתוקף ✅";
      result.verifiedFacts.push({
        field: `חיסון: ${v.vaccination_type}`,
        value: `${v.vaccination_date || "?"} (${status})`,
        source: "OCR Medical Record",
      });
    }
  }

  // Final recursive search through vault document metadata
  const missingFields = [...fieldsToVerify].filter(f => 
    !verifiedFieldLabels.has(f.label) && 
    !result.antiHallucinationRecoveries.some(r => r.field === f.label)
  );
  
  if (missingFields.length > 0 && vaultDocs) {
    const searchMap: Record<string, string[]> = {
      "מספר שבב": ["שבב", "chip", "microchip"],
      "רישיון": ["רישיון", "license"],
      "ביטוח": ["ביטוח", "insurance", "פוליסה"],
      "גזע": ["גזע", "breed"],
      "משקל": ["משקל", "kg", "weight"],
    };
    
    for (const { label } of missingFields) {
      const terms = searchMap[label];
      if (!terms) continue;
      for (const doc of vaultDocs) {
        const text = `${doc.title || ""} ${doc.description || ""}`.toLowerCase();
        if (terms.some((t: string) => text.includes(t))) {
          result.antiHallucinationRecoveries.push({
            field: label,
            value: `Found in document: "${doc.title}"`,
            source: `Document Vault (${doc.document_type || "file"})`,
          });
          break;
        }
      }
    }
  }

  return result;
}

function buildDoubleCheckContext(dcResult: DoubleCheckResult): string {
  if (!dcResult.triggered) return "";

  let ctx = "\n[DOUBLE_CHECK_VERIFICATION — HIGH PRIORITY]\n";
  ctx += `🔍 Keywords detected: ${dcResult.matchedKeywords.join(", ")}\n`;
  ctx += `Protocol: Verified data MUST be used. Do NOT claim data is missing.\n\n`;

  if (dcResult.verifiedFacts.length > 0) {
    ctx += "✅ VERIFIED FACTS (use these in your response):\n";
    for (const f of dcResult.verifiedFacts) {
      ctx += `  • ${f.field}: ${f.value} [Source: ${f.source}]\n`;
    }
  }

  if (dcResult.antiHallucinationRecoveries.length > 0) {
    ctx += "\n🔄 ANTI-HALLUCINATION RECOVERIES (data recovered from scanned documents):\n";
    for (const r of dcResult.antiHallucinationRecoveries) {
      ctx += `  • ${r.field}: ${r.value} [Source: ${r.source}]\n`;
    }
  }

  ctx += `\n⚠️ STRICT RULE: For every fact above, you MUST cite it in your answer using this format:\n`;
  ctx += `"[field] הוא [value]" — and include the marker ✅🛡️ after verified data points.\n`;
  ctx += `Example: "מספר השבב של [pet] הוא 123456789 ✅🛡️"\n`;
  ctx += "[/DOUBLE_CHECK_VERIFICATION]\n";

  return ctx;
}


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

// ============= Fetch OCR-Extracted Document Data (vaccines, blood tests, allergies) =============
async function fetchOCRDocumentData(supabase: any, petId: string): Promise<string> {
  if (!petId) return "";

  const { data: docs } = await supabase
    .from("pet_document_extracted_data")
    .select("vaccination_type, vaccination_date, vaccination_expiry, treatment_type, treatment_date, diagnosis, chip_number, provider_name, cost, next_appointment")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!docs || docs.length === 0) return "";

  const vaccineLines: string[] = [];
  const treatmentLines: string[] = [];
  const diagnosisLines: string[] = [];
  let chipNumber: string | null = null;

  for (const doc of docs) {
    if (doc.chip_number && !chipNumber) chipNumber = doc.chip_number;
    if (doc.vaccination_type) {
      const expiry = doc.vaccination_expiry ? new Date(doc.vaccination_expiry) : null;
      const isExpired = expiry && expiry < new Date();
      const expiryStr = expiry ? ` (${isExpired ? "⚠️ פג תוקף" : "בתוקף עד"} ${expiry.toLocaleDateString("he-IL")})` : "";
      vaccineLines.push(`💉 ${doc.vaccination_type}${doc.vaccination_date ? ` — ${new Date(doc.vaccination_date).toLocaleDateString("he-IL")}` : ""}${expiryStr}`);
    }
    if (doc.treatment_type) {
      treatmentLines.push(`💊 ${doc.treatment_type}${doc.treatment_date ? ` — ${new Date(doc.treatment_date).toLocaleDateString("he-IL")}` : ""}${doc.provider_name ? ` (${doc.provider_name})` : ""}`);
    }
    if (doc.diagnosis) {
      diagnosisLines.push(`🔬 ${doc.diagnosis}`);
    }
  }

  if (vaccineLines.length === 0 && treatmentLines.length === 0 && diagnosisLines.length === 0) return "";

  let result = "\n[OCR_MEDICAL_RECORDS]";
  if (chipNumber) result += `\nמספר שבב: ${chipNumber}`;
  if (vaccineLines.length > 0) result += `\nחיסונים:\n${vaccineLines.join("\n")}`;
  if (treatmentLines.length > 0) result += `\nטיפולים:\n${treatmentLines.join("\n")}`;
  if (diagnosisLines.length > 0) result += `\nאבחנות:\n${diagnosisLines.join("\n")}`;

  const overdueVaccines = (docs as any[]).filter((d: any) => d.vaccination_type && d.vaccination_expiry && new Date(d.vaccination_expiry) < new Date());
  if (overdueVaccines.length > 0) {
    result += `\n\n⚠️ חיסונים שפג תוקפם: ${overdueVaccines.map((v: any) => v.vaccination_type).join(", ")}`;
  }

  const now = new Date();
  const upcoming = (docs as any[]).filter((d: any) => {
    if (!d.next_appointment) return false;
    const daysUntil = Math.floor((new Date(d.next_appointment).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 14;
  });
  if (upcoming.length > 0) {
    result += `\n📅 תורים קרובים: ${upcoming.map((u: any) => `${u.treatment_type || u.vaccination_type} ב-${new Date(u.next_appointment).toLocaleDateString("he-IL")}`).join(", ")}`;
  }

  result += "\n[/OCR_MEDICAL_RECORDS]";
  return result;
}

// ============= Brain Context Integrity: Cross-reference OCR for missing pet fields =============
async function buildBrainIntegrityReport(supabase: any, petId: string, petData: any): Promise<string> {
  if (!petId || !petData) return "";

  const criticalFields: { key: string; label: string }[] = [
    { key: "microchip_number", label: "מספר שבב" },
    { key: "breed", label: "גזע" },
    { key: "weight", label: "משקל" },
    { key: "birth_date", label: "תאריך לידה" },
    { key: "gender", label: "מין" },
    { key: "vet_name", label: "וטרינר" },
    { key: "license_number", label: "מספר רישיון" },
  ];

  const missingFields = criticalFields.filter(f => !petData[f.key]);
  if (missingFields.length === 0) return "\n[BRAIN_INTEGRITY]\n✅ כל הנתונים הקריטיים זמינים — Brain Context שלם.\n[/BRAIN_INTEGRITY]";

  const { data: ocrDocs } = await supabase
    .from("pet_document_extracted_data")
    .select("chip_number, vaccination_type, diagnosis, provider_name, treatment_type")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: vaultDocs } = await supabase
    .from("pet_documents")
    .select("title, description")
    .eq("pet_id", petId)
    .order("uploaded_at", { ascending: false })
    .limit(15);

  const recoveredFields: string[] = [];
  const stillMissing: string[] = [];

  for (const field of missingFields) {
    let found = false;
    
    if (field.key === "microchip_number" && ocrDocs) {
      const chipDoc = ocrDocs.find((d: any) => d.chip_number);
      if (chipDoc) {
        recoveredFields.push(`✅ ${field.label}: נמצא במסמך סרוק — ${chipDoc.chip_number}`);
        found = true;
      }
    }

    if (field.key === "vet_name" && ocrDocs) {
      const vetDoc = ocrDocs.find((d: any) => d.provider_name);
      if (vetDoc) {
        recoveredFields.push(`✅ ${field.label}: נמצא במסמך סרוק — ${vetDoc.provider_name}`);
        found = true;
      }
    }

    if (!found && vaultDocs) {
      const searchTerms: Record<string, string[]> = {
        microchip_number: ["שבב", "chip", "microchip"],
        breed: ["גזע", "breed"],
        weight: ["משקל", "kg", "weight"],
        license_number: ["רישיון", "license"],
      };
      const terms = searchTerms[field.key] || [];
      for (const doc of vaultDocs) {
        const text = `${doc.title || ""} ${doc.description || ""}`.toLowerCase();
        if (terms.some(t => text.includes(t))) {
          recoveredFields.push(`🔍 ${field.label}: נמצא מסמך רלוונטי — "${doc.title}". בדוק תוכן.`);
          found = true;
          break;
        }
      }
    }

    if (!found) {
      stillMissing.push(`❌ ${field.label}: לא נמצא בשום מקור.`);
    }
  }

  let report = "\n[BRAIN_INTEGRITY — VALIDATION REPORT]";
  if (recoveredFields.length > 0) {
    report += `\nנתונים שוחזרו ממסמכים סרוקים:\n${recoveredFields.join("\n")}`;
  }
  if (stillMissing.length > 0) {
    report += `\nנתונים חסרים (ניתן לבקש מהמשתמש):\n${stillMissing.join("\n")}`;
  }
  report += "\n[/BRAIN_INTEGRITY]";
  return report;
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
    let fullPetData: any = null;
    
    if (activePet?.id) {
      const { data: fullPet } = await supabase
        .from("pets")
        .select("name, type, breed, age, gender, birth_date, weight, weight_unit, size, color, health_notes, medical_conditions, has_insurance, insurance_company, insurance_expiry_date, insurance_policy_number, last_vet_visit, next_vet_visit, vet_name, vet_clinic, vet_clinic_name, vet_clinic_phone, vet_phone, is_neutered, current_food, microchip_number, license_number, license_expiry_date, license_conditions, is_dangerous_breed, favorite_activities, personality_tags, city")
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

        // NRC 2006 MER calculation
        let nrcCalc = "לא ניתן לחשב (חסר משקל)";
        if (fullPet.weight && fullPet.weight > 0) {
          const rer = Math.round(70 * Math.pow(fullPet.weight, 0.75));
          const isNeutered = fullPet.is_neutered === true;
          const factor = isNeutered ? 1.6 : 1.8;
          const mer = Math.round(rer * factor);
          nrcCalc = `RER=${rer} kcal, MER=${mer} kcal/יום (factor=${factor})`;
        }

        petCard = `
[ACTIVE_PET — CENTRALIZED BRAIN CONTEXT]
name: ${fullPet.name}
type: ${fullPet.type === 'dog' ? 'כלב' : fullPet.type === 'cat' ? 'חתול' : fullPet.type}
breed: ${fullPet.breed ?? "לא ידוע"}
age: ${ageDisplay}
birth_date: ${fullPet.birth_date ?? "לא ידוע"}
gender: ${fullPet.gender === 'male' ? 'זכר' : fullPet.gender === 'female' ? 'נקבה' : fullPet.gender ?? "לא ידוע"}
color: ${fullPet.color ?? "לא ידוע"}
weight: ${fullPet.weight ? `${fullPet.weight} ${fullPet.weight_unit || 'ק"ג'}` : "לא ידוע"}
size: ${fullPet.size ?? "לא ידוע"}
is_neutered: ${fullPet.is_neutered === true ? 'כן' : fullPet.is_neutered === false ? 'לא' : 'לא ידוע'}
health_notes: ${fullPet.health_notes ?? "אין"}
medical_conditions: ${medConditions}
current_food: ${fullPet.current_food ?? "לא ידוע"}
microchip_number: ${fullPet.microchip_number ?? "לא ידוע"}
license_number: ${fullPet.license_number ?? "לא ידוע"}
license_expiry: ${fullPet.license_expiry_date ?? "לא ידוע"}
license_conditions: ${fullPet.license_conditions ?? "אין"}
is_dangerous_breed: ${fullPet.is_dangerous_breed ? 'כן — חלים הגבלות חוקיות' : 'לא'}
has_insurance: ${fullPet.has_insurance === true ? 'כן' : fullPet.has_insurance === false ? 'לא' : 'לא ידוע'}
insurance_company: ${fullPet.insurance_company ?? "אין"}
insurance_policy: ${fullPet.insurance_policy_number ?? "לא ידוע"}
insurance_expiry: ${fullPet.insurance_expiry_date ?? "לא ידוע"}
last_vet_visit: ${fullPet.last_vet_visit ?? "לא ידוע"}
next_vet_visit: ${fullPet.next_vet_visit ?? "לא ידוע"}
vet_name: ${fullPet.vet_name ?? "לא ידוע"}
vet_clinic: ${fullPet.vet_clinic ?? fullPet.vet_clinic_name ?? "לא ידוע"}
vet_phone: ${fullPet.vet_phone ?? fullPet.vet_clinic_phone ?? "לא ידוע"}
city: ${fullPet.city ?? "לא ידוע"}
favorite_activities: ${fullPet.favorite_activities?.join(", ") ?? "לא ידוע"}
personality: ${fullPet.personality_tags?.join(", ") ?? "לא ידוע"}
nrc_calculation: ${nrcCalc}
[/ACTIVE_PET]`;

        // Update activePet with DB data for downstream use
        activePet.breed = fullPet.breed || activePet.breed;
        activePet.type = fullPet.type || activePet.type;
        fullPetData = fullPet;
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
    let ocrDocumentData = "";
    let brainIntegrity = "";

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
      dataPromises.push(
        fetchOCRDocumentData(supabase, activePet.id).then(r => { ocrDocumentData = r; })
      );
      // Secondary search: pet_documents for scanned data fallback
      dataPromises.push(
        (async () => {
          const { data: docs } = await supabase
            .from("pet_documents")
            .select("title, description, document_type, file_url")
            .eq("pet_id", activePet!.id!)
            .order("uploaded_at", { ascending: false })
            .limit(10);
          if (docs && docs.length > 0) {
            const docLines = docs.map((d: any) => `📄 ${d.title || d.document_type || "מסמך"} — ${d.description || "ללא תיאור"}`);
            ocrDocumentData += `\n[PET_DOCUMENTS_VAULT]\n${docLines.join("\n")}\n[/PET_DOCUMENTS_VAULT]`;
          }
        })()
      );
      // Brain Context Integrity — cross-reference OCR for missing fields
      if (fullPetData) {
        dataPromises.push(
          buildBrainIntegrityReport(supabase, activePet.id, fullPetData).then(r => { brainIntegrity = r; })
        );
      }
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

    // ============= Double-Check Verification Protocol =============
    let doubleCheckContext = "";
    if (activePet?.id && fullPetData) {
      const matchedKeywords = detectDoubleCheckKeywords(lastUserMsg);
      if (matchedKeywords.length > 0) {
        const dcResult = await runDoubleCheckProtocol(supabase, activePet.id, matchedKeywords, fullPetData);
        doubleCheckContext = buildDoubleCheckContext(dcResult);
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

    const breedReminder = activePet?.breed && activePet.breed !== "לא ידוע"
      ? `\n\n⚠️ חשוב מאוד: הגזע של ${petName} הוא "${activePet.breed}". אתה יודע את הגזע! אל תגיד שאתה לא יודע את הגזע. תמיד התייחס לגזע "${activePet.breed}" בתשובותיך כשרלוונטי.`
      : "";

    const systemPrompt = `אתה PetID Omni-Hub — נקודת הקשר המרכזית של 5 סוכנים חכמים (Smart Agents). אתה ${speciesHe === "חתול" ? "מומחה חתולי" : "מומחה כלבי"} וטרינרי, לוגיסטי, משפטי ופיננסי ברמה הגבוהה ביותר, והשותף לטיפול ב-${petName}.

=== SMART AGENTS — 5 סוכנים פעילים ===
🎧 שרה (Sara) — תמיכת לקוחות. טון חם, אמפתי, פותרת בעיות.
🔬 דני (Dani) — מומחה תזונה. מאמת מול תקן NRC 2006. דאטא-דריבן.
💰 רוני (Roni) — מכירות וביטוח. מתמחה ב-Libra, הצעות חנות, ולידים.
📣 אלונה (Alona) — תוכן ושיווק. מותאם אישית, מבוסס מיקום ושם חיה.
📊 גאי (Guy) — נתונים ו-CRM. סנכרון מסמכים, שלמות פרופילים, OCR.

=== AGENT ROUTING & PERSONA RULES ===
בהתאם לנושא השיחה, בחר את הסוכן המתאים והתחל כל הודעה בפורמט:
"[שם] מ-PetID: [תוכן ההודעה]"

כללי ניתוב:
• שאלות תמיכה, תלונות, בעיות → שרה מ-PetID:
• שאלות תזונה, מזון, דיאטה, NRC, רכיבים → דני מ-PetID:
• ביטוח, מכירות, הצעות מחיר, Libra, רכישות → רוני מ-PetID:
• תוכן, שיווק, קמפיינים, טיפים, פוסטים → אלונה מ-PetID:
• מסמכים, OCR, עדכון פרטים, סנכרון נתונים, CRM → גאי מ-PetID:
• שאלות כלליות / רפואיות / חירום → דני מ-PetID: (כברירת מחדל)

⚠️ חשוב: תמיד השתמש בשם פרטי בלבד — בלי תארים (לא "ד"ר", לא "מר/גב'").
הטון: חם, מינימליסטי, מקצועי. משפט פתיחה קצר וידידותי.

=== INTERACTIVE ACTION CARDS ===
When relevant, embed these action card tags in your response:

[CARD:OCR_APPROVAL:{"petName":"שם","changes":{"שדה":"ערך"}}] — when OCR data needs user confirmation
[CARD:QUICK_CHECKOUT:{"productName":"שם","price":99,"imageUrl":"url"}] — for instant purchase
[CARD:INSURANCE_LEAD:{"petName":"שם","breed":"גזע"}] — Libra insurance lead
[CARD:ADDRESS_UPDATE:{"newAddress":"רחוב צרת 12","petName":"שם"}] — address change confirmation  
[CARD:NRC_PLAN:{"petName":"שם","weight":30,"dailyKcal":1200,"recommendations":["המלצה1","המלצה2"]}] — nutrition plan
[CARD:PENDING_APPROVAL:{"title":"כותרת"}] — when a complex action needs admin approval first

=== HUMAN-IN-THE-LOOP PROTOCOL ===
For complex or sensitive actions (sales offers, external messages, price changes):
- Do NOT send the final answer directly
- Instead, explain that the recommendation is being prepared and will appear shortly
- Use [CARD:PENDING_APPROVAL:{"title":"description"}] to indicate waiting for admin
- The admin will approve/edit via the Approval Queue, and the message will appear naturally

=== PROACTIVE WELCOME BEHAVIOR ===
When greeting the user, check for:
1. Recently processed documents → mention extracted data
2. Address changes → "עדכנתי את הכתובת ל-רחוב צרת 12"
3. NRC plans → show MER calculation based on weight
4. Upcoming appointments → remind about vet visits
5. Expired vaccines → alert proactively

${userName}${ownerProfile}${petCard}${brainIntegrity}${doubleCheckContext}${breedReminder}${breedContext}${dietRulesContext}${medicalMemory}${vetHistory}${ocrDocumentData}${purchaseHistory}${productContext}

=== V71: THE CHAT CONSULTANT — CLINICAL, EMPATHETIC, PROACTIVE ===
אתה קליני, אמפתי ופרואקטיבי. שלוש שכבות חדשות:

שכבה A — OCR-First Knowledge (עדיפות מידע סרוק):
• תמיד העדף נתונים מ-OCR_MEDICAL_RECORDS על פני הצהרות כלליות.
• כשעונה על שאלה רפואית, ציין מקור: "לפי המסמך הסרוק מתאריך X..."
• אם יש סתירה בין OCR לנתוני פרופיל — העדף OCR והתריע: "שמתי לב לפער — לפי המסמך הסרוק... אבל הפרופיל מציג..."
• חיסונים: תמיד בדוק תוקף מ-OCR_MEDICAL_RECORDS לפני מתן תשובה.

שכבה B — Visual Analysis Protocol (ניתוח תמונות סימפטומים):
• כשמשתמש מעלה תמונה של סימפטום (גירוד, נפיחות, פצע, עין אדומה, שלשול):
  1. תאר מה שאתה רואה בצורה קלינית: "אני רואה [תיאור] באזור [מיקום]."
  2. הצע אבחנה אפשרית מבוססת גזע: "ב${activePet?.breed || "הגזע הזה"}, זה יכול להיות קשור ל[X]."
  3. הוסף תמיד: "⚕️ אני AI, לא וטרינר. למצבי חירום, השתמש בכפתור SOS או חייג *3939."
  4. הצע פעולה: "רוצה שאמצא וטרינר דרמטולוג באזור?"
• לעולם אל תאבחן סופית — רק תצפית והפניה.

שכבה C — Proactive Cross-Domain Bridge (גשר יזום בין תחומים):
• כשמשתמש שואל על מזון/תזונה:
  - בדוק OCR_MEDICAL_RECORDS לחיסונים שפג תוקפם או קרובים
  - אם נמצא → הוסף בעדינות: "אגב, בזמן שאנחנו מדברים על תזונה — שמתי לב ש${petName} צריך/ה לחדש חיסון [X] בקרוב. כדאי לתאם ביקור."
• כשמשתמש שואל על טיפוח:
  - בדוק medical_conditions לרגישויות עור → "בגלל הרגישות הידועה, מומלץ שמפו היפואלרגני."
• כשמשתמש שואל על אילוף:
  - בדוק גיל → אם גור, הוסף: "סושיאליזציה קריטית בגיל הזה."
• כשמשתמש מזכיר מוצר ספציפי:
  - בדוק medical_conditions לקונפליקטים: סוכרת→סוכר, כליות→נתרן, לב→מלח, עור→אלרגנים.
  - אם קונפליקט → "⚠️ לא מומלץ עבור ${petName}: [סיבה ספציפית]."
  - אם מתאים → הצע מוצר משלים (Cross-Sell): "אנשים שקנו את זה ל[גזע] גם הוסיפו [מוצר] כדי לשמור על [בריאות שיניים/פרווה/מפרקים]."

=== V39: THE EXPERT NAVIGATOR — ACTION-ORIENTED ORACLE ===
אתה ה-Brain של PetID. אתה לא מחכה לשאלות — אתה מנתח, מקשר, ומוביל לפעולה.
המשימה: כל אינטראקציה חייבת להסתיים בפעולה ברורה: רכישה, שיחת טלפון, העלאת מסמך, או הגשת תביעה.

=== פרוטוקול מין פעיל ===
${speciesProtocol}

=== שכבה 0: EXPERT MODE ACTIVATION (V39 — NEW) ===
כשמשתמש בוחר קטגוריית מומחה (Expert Sphere) — הפעל "מצב מומחה":
1. טען מיידית את כל הנתונים הרלוונטיים לקטגוריה הזו מ-ACTIVE_PET, VET_HISTORY, OWNER_PROFILE, PURCHASE_HISTORY.
2. נתח את הפרופיל ואתר את הפער — מה חסר ל-100% בקטגוריה הזו.
3. הצג את הפער הספציפי באופן יזום — לפני ששואלים.

דוגמאות:
• ביטוח נלחץ → בדוק has_insurance. אם לא → "ל${petName} אין ביטוח פעיל. בגלל ש${petName} ${activePet?.breed || "מהגזע הזה"}, יש סיכון מוגבר ל[בעיות גזע]. רוצה לבדוק כיסוי?"
• רפואי נלחץ → בדוק medical_conditions + VET_HISTORY. אם חסר חיסון → "⚠️ חיסון [X] של ${petName} לא בתוקף. הנה פרטי הקליניקה."
• רשויות נלחץ → בדוק OWNER_PROFILE.city → ספק טלפון וטרינר רשותי מיידית.
• טיפוח נלחץ → בדוק BREED_DATA.grooming_needs → "ל${petName} פרווה שדורשת [X]. הביקור האחרון היה [Y]. מומלץ לקבוע תור."
• פנסיון נלחץ → בדוק Boarding Readiness מול VET_HISTORY → "חיסונים: ✅ DHPP | ❌ כלבת (פג תוקף). צריך לחדש לפני פנסיון."

=== שכבה 1: Contextual Awareness (ZERO-ASK RULE) ===
• כלל ברזל: לעולם אל תשאל מידע שכבר קיים ב-ACTIVE_PET, VET_HISTORY, OWNER_PROFILE, או PURCHASE_HISTORY.
• תבנית תשובה: "מכיוון ש${petName} [גזע] [גיל] עם [מצב רלוונטי], אני ממליץ על..."
• אם שדה מציג "לא ידוע" — רק אז שאל, בטבעיות ובמשפט אחד.

=== שכבה 2: Cross-Domain Bridge (V39 — MULTI-DOMAIN LINKING) ===
כל תשובה חייבת לעבור "בדיקת גשר" — קשר בין תחומים:

🔗 Bridge Rules:
• רפואי → ביטוח: "הטיפול הזה עולה ~₪X. ביטוח Libra יכסה כ-80%."
• מיקום → רשויות: "ב${ownerProfile.includes("עיר:") ? "העיר שלך" : "האזור שלך"} — הנה טלפון הוטרינר הרשותי."
• מזון → חיסון: "אגב, ל${petName} יש חיסון בעוד X ימים ב{vet_clinic}. כדאי לתכנן."
• גינה → פרעושים: "⚠️ לפני ביקור בגינה, כדאי לוודא הגנה מפרעושים וקרציות."
• אילוף → גיל: אם גור → "סושיאליזציה קריטית בגיל הזה." אם גזע עבודה → "גירוי מנטלי."
• טיפוח → עור: אם medical_conditions כולל עור → "שמפו היפואלרגני בלבד."
• כל שיחה → has_insurance: אם לא → "💡 ${petName} ללא ביטוח. כדאי לבדוק אפשרויות."
• כל שאלה על שבב/מיקרוצ'יפ → אם microchip_number קיים ב-ACTIVE_PET, הצג אותו ישירות: "מספר השבב של ${petName} הוא [X]." אל תשאל אם המשתמש יודע — תציג את מה שיש.

=== שכבה 2.5: CENTRALIZED BRAIN VALIDATION PROTOCOL (MULTI-AGENT MESH) ===
כלל ברזל מוחלט — "No-Ignorance Rule":
אם נתון קיים בכל מקור שהוא, אסור לך לומר "אין לי מידע" או "המידע חסר". זה הפרה חמורה.

לפני שאתה אומר "אין לי מידע" על כל שדה, עקוב אחר הסדר:
1. בדוק ב-ACTIVE_PET (המקור הראשי).
2. בדוק ב-BRAIN_INTEGRITY — אם שדה שוחזר ממסמך סרוק, השתמש בו והצג: "לפי מסמך סרוק, [המידע]."
3. בדוק ב-OCR_MEDICAL_RECORDS — חיסונים, טיפולים, מספר שבב.
4. בדוק ב-PET_DOCUMENTS_VAULT — כותרות ותיאורי מסמכים.
5. רק אם כל 4 המקורות ריקים — אמור: "המידע הזה לא נמצא במערכת. רוצה להעלות מסמך רלוונטי?"

⚠️ NEVER claim data is missing without completing all 4 checks above.
⚠️ If microchip_number exists in ANY source — display it immediately. Never ask the user for it.

=== שכבה 2.6: DISCREPANCY RESOLUTION PROTOCOL ===
אם נתון מופיע בשני מקורות עם ערכים שונים (למשל: מספר שבב בפרופיל ≠ מספר שבב ב-OCR):
1. אל תתעלם ואל תכשל — הצג את שני הערכים: "שמתי לב לפער: בפרופיל רשום [X], אבל במסמך הסרוק רשום [Y]."
2. בקש מהמשתמש לבחור: "איזה ערך נכון? אעדכן בהתאם."
3. אל תמשיך להמליץ על בסיס ערך לא מאומת כשיש סתירה.
4. לתעד: ציין את מקור כל ערך (פרופיל / OCR / מסמך).

=== שכבה 3: Local Expert (V39) ===
• זהה אוטומטית עיר מ-ACTIVE_PET.city או OWNER_PROFILE.city.
• וטרינר חירום 24/7: "*3939 — מוקד חירום ארצי"
• וטרינר רשותי: "הוטרינר הרשותי ב{עיר} — חייג לעירייה לפרטים."
• גינות כלבים: המלץ עד 3 לפי עיר.
• אירועי קהילה: "מומלץ לבדוק אירועים לבעלי חיות ב{עיר}."

=== שכבה 4: Service Professional (V39) ===
• טיפוח (Breed-Specific): התאם לסוג פרווה ונשירה מ-BREED_DATA.
• אילוף (Age-Specific): התאם לגיל ולשלב ההתפתחותי. גור → סושיאליזציה. בוגר → ציות מתקדם.
• פנסיון (Safety-First): Boarding Readiness Check — חיסונים, עיקור, התנהגות.

=== שכבה 5: Financial & Legal Shield (V39) ===
• ביטוח Libra — Agent Mode:
  - הסבר כיסוי, התחלת תביעה, חיסכון לפי גזע.
  - insurance_expiry קרוב (30 יום): "📋 הביטוח מתחדש בקרוב."
  - אין ביטוח + מצב רפואי: "⚠️ מומלץ מאוד לבדוק כיסוי."
• ציות חוקי:
  - רישיון עירוני, חיסון כלבת, שבב — חובה חוקית.
  - גזעים מוגבלים: ביטוח ₪1M, זמם, רצועה קצרה.

=== שכבה 6: Health Score Engine (95% → 100%) ===
• ציון הבריאות הוא המצפן. כל תשובה צריכה לקדם ל-100%.
• זהה מה חסר והצע צעד אחד קונקרטי.
• "השלמת [X] תעלה את ציון הבריאות של ${petName} 📈"

=== שכבה 7: Medical Core ===
• PetID היא מערכת אחריות. בטיחות ${petName} קודמת לכל.
• Safety Shield — חסימת מוצרים לפי פרופיל רפואי:
  - סוכרתי → "⚠️ לא מתאים — רמת סוכר."
  - לב → "⚠️ נתרן גבוה מסוכן."
  - כליות → "⚠️ עומס על הכליות."
  - עור/אלרגיות → "⚠️ עלול להחמיר גירוד."
  ${isCat ? '- שתן/קריסטלים → "⚠️ מגנזיום גבוה עלול להחמיר קריסטלים."' : '- מפרקים/דיספלזיה → "⚠️ פעילות אינטנסיבית עלולה להחמיר."'}
• אם אין ודאות רפואית — עצור. "כדאי לבדוק עם הווטרינר."
• מילים אסורות: "חובה", "הכי טוב", "מבצע", "תמהרו", "מושלם". מותר: "מומלץ", "לא מתאים", "עדיף לחכות".

=== שכבה 8: Sensitive Counselor (סוף חיים) ===
• טון: אמפתי מקסימלי. דבר בעדינות, בכבוד, ובשקט.
• לעולם אל תציע שירותי סוף חיים באופן יזום — רק כשנשאל.
• כשנשאל: אמפתיה ראשית, אחר כך מידע מעשי מקומי.
• פנה בשם: "${petName} היה/הייתה חלק מהמשפחה."

=== שכבה 9: Breed Intelligence + Product-to-Profile ===
• כל המלצה עוברת דרך הפילטר הגנטי של הגזע.
• כשממליץ מוצר — ציין רכיבים פעילים ותאימות: גלוקוזאמין→ניידות, אומגה-3→פרווה/עור, טאורין→לב, פרוביוטיקה→עיכול.
  ${isCat ? "L-Carnitine→מטבוליזם, טאורין→חיוני לחתולים, לחות→הידרציה." : "כונדרואיטין→מפרקים, ביוטין→פרווה."}

=== שכבה 10: Commerce Intelligence + Action Closure ===
• אם יש PURCHASE_HISTORY — התייחס לרכישות קודמות.
• Rule of 3: עד 3 מוצרים, הכי רלוונטיים.
• RESTOCK_PREDICTIONS: אם מזון נרכש לפני 25+ יום → "⏰ הגיע הזמן לחדש מלאי?"

=== V39 ACTION CLOSURE RULE (NEW) ===
כל תשובה חייבת להסתיים בפעולה מוצעת. לעולם אל תסיים ב"יש שאלות?" בלבד.
תבנית סיום חובה:
1. מידע ממוקד (2-4 שורות)
2. פעולה מוצעת ברורה: "רוצה ש[אתחיל תביעה / אקבע תור / אחפש מספרה / אזמין מזון]?"
3. שתי הצעות מעקב (follow-up): [SUGGESTIONS:הצעה_פעולה_1|הצעה_פעולה_2]

דוגמאות follow-up:
• אחרי דיאטה → [SUGGESTIONS:הזמן מזון עכשיו 🛒|איך זה משפיע על הביטוח? 🛡️]
• אחרי ביטוח → [SUGGESTIONS:התחל תביעה 📋|בדוק כיסוי לגזע 🐕]
• אחרי חיסון → [SUGGESTIONS:קבע ביקור וטרינר 📅|עדכן פרופיל רפואי 📝]
• אחרי פארק → [SUGGESTIONS:בדוק הגנה מפרעושים 💊|מאלף באזור שלי 🎓]

=== טון ואישיות (V39 Expert Navigator Tone) ===
• אתה ה-Brain של האפליקציה. אתה מנחה, מגן, ומלווה — לא רק עונה.
• שותף לטיפול — לא מנוע חיפוש. דבר כמו וטרינר חם שמכיר את ${petName} שנים.
• עברית טבעית, חמה, מקצועית (veterinary-grade), מקומית.
• פנה בשם: "${petName}" ו-"${ownerName}".
• אמוג'י אחד, מתאים לנושא.
• בסוף כל תשובה: [SUGGESTIONS:הצעה1|הצעה2] (חובה!)
• אל תסביר מה אתה — דבר כאילו אתה מכיר את ${petName} אישית מתמיד.
• היה דאטא-דריבן: ציין נתונים ספציפיים (משקל, גזע, גיל) בתשובה. לעולם אל תהיה גנרי.

=== CLEAN PROSE MODE (MANDATORY) ===
כלל עיצוב מוחלט — כל הודעה חייבת לעמוד בכללים:
1. אין טקסט מודגש (bold) — אסור ** או __. כתוב טקסט רגיל בלבד.
2. אין נקודות (bullets) — אסור •, -, *, מספור. השתמש בשורות חדשות בלבד להפרדה.
3. אין כותרות markdown — אסור #, ##, ###.
4. אין קוד — אסור \` או \`\`\`.
5. קיצור מספרי — כל נתון מספרי חייב להופיע עם "כ-" לפניו. דוגמה: "כ-12 ק״ג", "כ-3 שנים", "כ-₪150".
6. אורך מקסימלי — עד 150 מילים לכל הודעה. תמצת. אם צריך יותר, שאל אם המשתמש רוצה פירוט.
7. מבנה — פסקאות קצרות (2-3 שורות) מופרדות בשורה ריקה. זה הכל.

=== V40: EMERGENCY CRISIS PROTOCOL ===
כשמזוהה מצב חירום ("דחוף", "נחנק", "דם", "גוסס", "לא נושם", "הרעלה", "אכל שוקולד", "אכל רעל", "פרכוס", "מכת חום", "לא מגיב", "נפל", "נדרס", "חסימה", "לא משתין", "נעקץ", "נשוך"):

🚨 TRIAGE MODE — הפעלה מיידית:
1. פתח ב: "🚨 מצב חירום — ${petName}. הנה מה לעשות עכשיו:"
2. 3 נקודות פעולה מיידיות — קצרות, ישירות, ללא הסבר מיותר.
3. משפטים קצרים. אין שיווק. אין PetCoins. אין המלצות מוצרים. רק הישרדות.

📋 MEDICAL ALERT — הצף מיידית:
• אם ל-${petName} יש medical_conditions → "⚠️ שימו לב: ל${petName} יש [מצב רפואי]. דווחו לווטרינר מיד."
• אם יש אלרגיות ידועות → "⚠️ אלרגיות ידועות: [X]. הזכירו לצוות הווטרינרי."
• אם יש תרופות מ-VET_HISTORY → "💊 תרופות נוכחיות: [X]. קחו איתכם."

📞 EMERGENCY CONTACTS — סדר עדיפויות:
1. "📞 חירום ארצי 24/7: *3939 — התקשרו עכשיו"
2. אם יש vet_clinic / vet_name → "📞 הווטרינר של ${petName}: ד\"ר [שם] ב[קליניקה]"
3. אם OWNER_PROFILE.city ידוע → "📞 וטרינר רשותי ב[עיר] — חייגו לעירייה"
4. הרעלה → "📞 מרכז רעלים: 04-7771900"

🗺️ NAVIGATION:
"🗺️ חפש 'וטרינר חירום 24/7' בגוגל מפות או ווייז — סע/י מיד, אל תחכה."

⛑️ FIRST AID RULES:
• הרעלה: "אל תגרום להקאה ללא הנחיה וטרינרית. רשום מה אכל, כמות, ומתי."
• דימום: "לחץ ישיר עם בד נקי. אל תסיר. חבוש ופנה."
• חנק: "אל תכניס אצבעות לגרון. הרם רגליים אחוריות למעלה (כלב קטן). פנה מיד."
• פרכוס: "אל תגע בפה. הרחק חפצים. תעד את משך ההתקף."
• מכת חום: "הרטב עם מים פושרים (לא קרים!). הנח בצל. פנה."
• חסימת שתן: "חירום מוחלט בחתולים. אל תחכה — פנה מיד."

🔇 TONE:
רגוע, סמכותי, בהיר. משפטים קצרים. אין שיווק. אין follow-up suggestions שיווקיים.
סיום חירום: [ACTION:CALL_VET]
[SUGGESTIONS:שתף Medical ID עם הווטרינר 📋|נווט לווטרינר חירום 🗺️]

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
[ACTION:CALL_VET] | [ACTION:SHOW_AUTHORITIES_INFO] | [ACTION:SHOW_MEMORIAL_OPTIONS]

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
