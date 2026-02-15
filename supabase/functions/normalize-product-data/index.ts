import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Key Normalization Map ──────────────────────────────
// Maps many possible incoming keys (EN/HE) → our canonical DB field
const KEY_MAP: Record<string, string> = {
  // Analytical
  protein: "protein_pct",
  "חלבון": "protein_pct",
  "חלבון גולמי": "protein_pct",
  "crude protein": "protein_pct",
  fat: "fat_pct",
  "שומן": "fat_pct",
  "שומן גולמי": "fat_pct",
  "crude fat": "fat_pct",
  fiber: "fiber_pct",
  "סיבים": "fiber_pct",
  "סיבים גולמיים": "fiber_pct",
  "crude fiber": "fiber_pct",
  ash: "ash_pct",
  "אפר": "ash_pct",
  "אפר גולמי": "ash_pct",
  "crude ash": "ash_pct",
  moisture: "moisture_pct",
  "לחות": "moisture_pct",
  calcium: "calcium_pct",
  "סידן": "calcium_pct",
  phosphorus: "phosphorus_pct",
  "זרחן": "phosphorus_pct",
  "omega 3": "omega3_pct",
  "אומגה 3": "omega3_pct",
  omega3: "omega3_pct",
  "omega 6": "omega6_pct",
  "אומגה 6": "omega6_pct",
  omega6: "omega6_pct",

  // Core fields
  name: "name",
  "שם": "name",
  title: "name",
  "שם המוצר": "name",
  brand: "brand",
  "מותג": "brand",
  price: "price",
  "מחיר": "price",
  sale_price: "sale_price",
  "מחיר מבצע": "sale_price",
  description: "description",
  "תיאור": "description",
  ingredients: "ingredients",
  "רכיבים": "ingredients",
  ingredients_list: "ingredients",
  image_url: "image_url",
  "תמונה": "image_url",
  category: "category",
  "קטגוריה": "category",
  sku: "sku",
  "מק\"ט": "sku",
  pet_type: "pet_type",
  "סוג חיה": "pet_type",
  life_stage: "life_stage",
  "שלב בחיים": "life_stage",
  dog_size: "dog_size",
  "גודל כלב": "dog_size",
  "גודל הכלב": "dog_size",
  weight: "packaging_weight_kg",
  "משקל": "packaging_weight_kg",
  packaging_weight: "packaging_weight_kg",
};

// ── Feeding Table Parser ──────────────────────────────
// Converts text/string feeding instructions → JSON array
function parseFeedingTable(input: unknown): Array<{ dog_weight_kg: string; daily_amount_grams: string }> {
  // Already structured array
  if (Array.isArray(input)) {
    return input.map((row: any) => ({
      dog_weight_kg: String(row.dog_weight_kg ?? row.range ?? row.weight ?? ""),
      daily_amount_grams: String(row.daily_amount_grams ?? row.amount ?? row.grams ?? ""),
    }));
  }

  if (typeof input !== "string") return [];

  const lines = input.split(/[\n;|]/).map((l) => l.trim()).filter(Boolean);
  const result: Array<{ dog_weight_kg: string; daily_amount_grams: string }> = [];

  for (const line of lines) {
    // Pattern: "1-5 ק"ג : 50-80 גרם" or "1-5 kg - 50-80g" or "5 kg → 100g"
    const match = line.match(
      /([\d.,]+(?:\s*[-–]\s*[\d.,]+)?)\s*(?:ק"ג|קג|kg|קילו)?\s*[:\-–→=]\s*([\d.,]+(?:\s*[-–]\s*[\d.,]+)?)\s*(?:גרם|גר|g|gr)?/i
    );
    if (match) {
      result.push({
        dog_weight_kg: match[1].trim(),
        daily_amount_grams: match[2].trim(),
      });
      continue;
    }

    // Simpler pattern: two number groups separated by whitespace/tab
    const simpleMatch = line.match(/([\d.,]+(?:\s*-\s*[\d.,]+)?)\s{2,}([\d.,]+(?:\s*-\s*[\d.,]+)?)/);
    if (simpleMatch) {
      result.push({
        dog_weight_kg: simpleMatch[1].trim(),
        daily_amount_grams: simpleMatch[2].trim(),
      });
    }
  }

  return result;
}

// ── Extract weight from title/name ────────────────────
function extractWeightKg(text: string): number | null {
  // Match patterns like "7 ק"ג", "2.5kg", "500 גרם"
  const kgMatch = text.match(/([\d.,]+)\s*(?:ק"ג|קג|ק״ג|kg|KG|קילו)/i);
  if (kgMatch) return parseFloat(kgMatch[1].replace(",", "."));

  const gMatch = text.match(/([\d.,]+)\s*(?:גרם|גר|g|gr)\b/i);
  if (gMatch) return parseFloat(gMatch[1].replace(",", ".")) / 1000;

  return null;
}

// ── Parse percentage value from string ────────────────
function parsePct(val: unknown): number | null {
  if (typeof val === "number") return val;
  if (typeof val !== "string") return null;
  const match = val.match(/([\d.,]+)/);
  if (match) return parseFloat(match[1].replace(",", "."));
  return null;
}

// ── Main Normalization Logic ──────────────────────────
interface NormalizedProduct {
  name: string;
  brand: string | null;
  description: string | null;
  ingredients: string | null;
  price: number;
  sale_price: number | null;
  image_url: string;
  category: string | null;
  pet_type: string | null;
  life_stage: string | null;
  dog_size: string | null;
  sku: string | null;
  price_per_weight: number | null;
  benefits: any[];
  feeding_guide: any[];
  product_attributes: Record<string, any>;
  special_diet: string[];
  needs_review: boolean;
  review_reasons: string[];
}

function normalizeProduct(raw: Record<string, any>, businessId: string): NormalizedProduct & { business_id: string } {
  const normalized: Record<string, any> = {};
  const analyticalValues: Record<string, number | null> = {};
  const unmappedKeys: Record<string, any> = {};
  const reviewReasons: string[] = [];

  // Step 1: Map known keys
  for (const [rawKey, rawValue] of Object.entries(raw)) {
    const lowerKey = rawKey.toLowerCase().trim();
    const mappedKey = KEY_MAP[lowerKey] || KEY_MAP[rawKey];

    if (mappedKey) {
      if (mappedKey.endsWith("_pct")) {
        analyticalValues[mappedKey] = parsePct(rawValue);
      } else {
        normalized[mappedKey] = rawValue;
      }
    } else {
      // Keep for product_attributes
      unmappedKeys[rawKey] = rawValue;
    }
  }

  // Step 2: Feeding table parsing
  const feedingRaw = raw.feeding_guide || raw.feeding_table || raw["טבלת האכלה"] || raw["המלצת האכלה"] || null;
  const feedingGuide = feedingRaw ? parseFeedingTable(feedingRaw) : [];

  // Step 3: Benefits normalization
  let benefits: any[] = [];
  const benefitsRaw = raw.benefits || raw["יתרונות"] || raw.health_benefits || [];
  if (Array.isArray(benefitsRaw)) {
    benefits = benefitsRaw.map((b: any) => ({
      title: b.title || b["כותרת"] || "",
      description: b.description || b["תיאור"] || "",
    })).filter((b: any) => b.title);
  }

  // Step 4: Auto-calculate price_per_kg
  const price = typeof normalized.price === "number"
    ? normalized.price
    : parseFloat(String(normalized.price || 0));
  
  let weightKg = normalized.packaging_weight_kg
    ? (typeof normalized.packaging_weight_kg === "number"
        ? normalized.packaging_weight_kg
        : parseFloat(String(normalized.packaging_weight_kg)))
    : null;

  // Try extracting weight from name/title
  if (!weightKg && normalized.name) {
    weightKg = extractWeightKg(String(normalized.name));
  }

  const pricePerWeight = (price > 0 && weightKg && weightKg > 0)
    ? Math.round((price / weightKg) * 100) / 100
    : null;

  // Step 5: Special diet
  let specialDiet: string[] = [];
  const dietRaw = raw.special_diet || raw["תזונה מיוחדת"] || null;
  if (Array.isArray(dietRaw)) {
    specialDiet = dietRaw;
  } else if (typeof dietRaw === "string") {
    specialDiet = dietRaw.split(",").map((s) => s.trim()).filter(Boolean);
  }

  // Step 6: Safety checks — flag for review if critical data is missing
  const name = String(normalized.name || "").trim();
  if (!name) reviewReasons.push("missing_name");

  const ingredients = normalized.ingredients ? String(normalized.ingredients).trim() : null;
  if (!ingredients) reviewReasons.push("missing_ingredients");

  if (!normalized.image_url) reviewReasons.push("missing_image");
  if (!price || price <= 0) reviewReasons.push("invalid_price");

  const needsReview = reviewReasons.length > 0;

  // Step 7: Build product_attributes from analytical + unmapped
  const productAttributes: Record<string, any> = { ...unmappedKeys };
  for (const [key, val] of Object.entries(analyticalValues)) {
    if (val !== null) {
      // Store as human-readable label
      const labelMap: Record<string, string> = {
        protein_pct: "חלבון גולמי",
        fat_pct: "שומן גולמי",
        fiber_pct: "סיבים גולמיים",
        ash_pct: "אפר גולמי",
        moisture_pct: "לחות",
        calcium_pct: "סידן",
        phosphorus_pct: "זרחן",
        omega3_pct: "אומגה 3",
        omega6_pct: "אומגה 6",
      };
      productAttributes[labelMap[key] || key] = `${val}%`;
    }
  }

  return {
    business_id: businessId,
    name: name || "מוצר ללא שם",
    brand: normalized.brand ? String(normalized.brand) : null,
    description: normalized.description ? String(normalized.description) : null,
    ingredients,
    price: price || 0,
    sale_price: normalized.sale_price ? parseFloat(String(normalized.sale_price)) : null,
    image_url: String(normalized.image_url || "/placeholder.svg"),
    category: normalized.category ? String(normalized.category) : null,
    pet_type: normalized.pet_type ? String(normalized.pet_type) : null,
    life_stage: normalized.life_stage ? String(normalized.life_stage) : null,
    dog_size: normalized.dog_size ? String(normalized.dog_size) : null,
    sku: normalized.sku ? String(normalized.sku) : null,
    price_per_weight: pricePerWeight,
    benefits,
    feeding_guide: feedingGuide,
    product_attributes: productAttributes,
    special_diet: specialDiet,
    needs_review: needsReview,
    review_reasons: reviewReasons,
  };
}

// ── Edge Function Handler ─────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin check
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { products, business_id, dry_run = false } = body;

    if (!business_id || typeof business_id !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "business_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(products) || products.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "products array is required and must not be empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize all products
    const normalized = products.map((p: any) => normalizeProduct(p, business_id));

    const needsReviewCount = normalized.filter((p) => p.needs_review).length;
    const summary = {
      total: normalized.length,
      needs_review: needsReviewCount,
      ready: normalized.length - needsReviewCount,
      review_details: normalized
        .filter((p) => p.needs_review)
        .map((p) => ({ name: p.name, reasons: p.review_reasons })),
    };

    // Dry run — return normalized data without inserting
    if (dry_run) {
      return new Response(
        JSON.stringify({ success: true, dry_run: true, summary, products: normalized }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert into database
    const toInsert = normalized.map((p) => {
      const { needs_review, review_reasons, ...dbFields } = p;
      return {
        ...dbFields,
        needs_price_review: needs_review,
        in_stock: true,
      };
    });

    const { data: inserted, error: insertError } = await supabase
      .from("business_products")
      .insert(toInsert)
      .select("id, name, needs_price_review");

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        inserted: inserted?.length || 0,
        products: inserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in normalize-product-data:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
