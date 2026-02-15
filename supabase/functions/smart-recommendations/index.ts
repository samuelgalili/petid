import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

/**
 * Smart Recommendations Engine
 * Returns 3 context-aware products based on the clicked stat category.
 * Applies Zero-Noise filter: returns empty if no perfect match.
 * Applies life-stage filter: hides Adult for Puppies, hides Growth for Adults.
 * Generates personalized copy using the pet's name.
 */

interface PetContext {
  id: string;
  name: string;
  type: string;
  breed?: string | null;
  birth_date?: string | null;
  medical_conditions?: string[] | null;
  weight?: number | null;
  size?: string | null;
}

type StatCategory = 'coat' | 'energy' | 'health' | 'feeding' | 'mobility' | 'digestion';

interface SearchRule {
  label: string;
  searchTerms: string[];
  categoryFilters: string[];
}

function getLifeStage(birthDate: string | null | undefined): 'puppy' | 'junior' | 'adult' | 'senior' {
  if (!birthDate) return 'adult';
  const birth = new Date(birthDate);
  const ageMonths = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (ageMonths < 6) return 'puppy';
  if (ageMonths < 18) return 'junior';
  if (ageMonths > 84) return 'senior'; // 7+ years
  return 'adult';
}

function getSearchRules(category: StatCategory): SearchRule[] {
  switch (category) {
    case 'coat':
      return [
        { label: 'שמפו מומלץ', searchTerms: ['שמפו', 'shampoo'], categoryFilters: ['shampoo', 'שמפו', 'grooming', 'טיפוח'] },
        { label: 'שמן סלמון', searchTerms: ['סלמון', 'salmon', 'omega', 'אומגה', 'שמן דגים', 'fish oil'], categoryFilters: ['supplement', 'תוסף', 'oil', 'שמן'] },
        { label: 'מברשת', searchTerms: ['מברשת', 'brush', 'מסרק', 'comb'], categoryFilters: ['brush', 'מברשת', 'grooming', 'טיפוח'] },
      ];
    case 'energy':
      return [
        { label: 'צעצוע אינטראקטיבי', searchTerms: ['צעצוע', 'toy', 'interactive', 'אינטראקטיבי', 'puzzle', 'חשיבה'], categoryFilters: ['toy', 'צעצוע', 'game', 'משחק'] },
        { label: 'מזון דיאטטי', searchTerms: ['diet', 'דיאט', 'light', 'לייט', 'metabolic'], categoryFilters: ['food', 'מזון', 'diet'] },
        { label: 'חטיף דל קלוריות', searchTerms: ['חטיף', 'treat', 'low calorie', 'דל קלוריות', 'light'], categoryFilters: ['treat', 'חטיף', 'snack'] },
      ];
    case 'health':
      return [
        { label: 'פרוביוטיקה', searchTerms: ['probiotic', 'פרוביוטיקה', 'prebiotic', 'digestive'], categoryFilters: ['supplement', 'תוסף', 'health', 'בריאות'] },
        { label: 'תמיכת מפרקים', searchTerms: ['joint', 'מפרק', 'glucosamine', 'גלוקוזאמין', 'mobility', 'ניידות'], categoryFilters: ['supplement', 'תוסף', 'joint', 'מפרק'] },
        { label: 'ביטוח Libra', searchTerms: [], categoryFilters: [] }, // Special: insurance offer
      ];
    case 'feeding':
      return [
        { label: 'מזון יבש מומלץ', searchTerms: ['מזון', 'food', 'dry'], categoryFilters: ['food', 'מזון'] },
        { label: 'מזון יבש חלופי', searchTerms: ['מזון', 'food'], categoryFilters: ['food', 'מזון'] },
        { label: 'מזון רטוב', searchTerms: ['רטוב', 'wet', 'pate', 'פטה', 'can', 'שימורים'], categoryFilters: ['food', 'מזון', 'wet'] },
      ];
    case 'mobility':
      return [
        { label: 'תוסף מפרקים', searchTerms: ['joint', 'מפרק', 'glucosamine', 'גלוקוזאמין', 'chondroitin'], categoryFilters: ['supplement', 'תוסף'] },
        { label: 'מזון למפרקים', searchTerms: ['joint', 'mobility', 'ניידות'], categoryFilters: ['food', 'מזון'] },
        { label: 'מיטה אורתופדית', searchTerms: ['מיטה', 'bed', 'orthopedic', 'אורתופד', 'memory foam'], categoryFilters: ['bed', 'מיטה', 'accessories'] },
      ];
    case 'digestion':
      return [
        { label: 'פרוביוטיקה', searchTerms: ['probiotic', 'פרוביוטיקה'], categoryFilters: ['supplement', 'תוסף'] },
        { label: 'מזון GI', searchTerms: ['gastrointestinal', 'gi', 'intestinal', 'עיכול', 'sensitive'], categoryFilters: ['food', 'מזון'] },
        { label: 'סיבים תזונתיים', searchTerms: ['fiber', 'סיבים', 'prebiotic', 'פרהביוטיקה'], categoryFilters: ['supplement', 'תוסף', 'food'] },
      ];
    default:
      return [];
  }
}

function personalizeCopy(productName: string, petName: string, label: string, petType: string): string {
  const typeHe = petType === 'dog' ? 'כלב' : petType === 'cat' ? 'חתול' : 'חיה';
  
  const templates: Record<string, string> = {
    'שמפו מומלץ': `מומלץ במיוחד עבור ${petName} לשמירה על פרווה בריאה ונקייה`,
    'שמן סלמון': `אומגה-3 שישפר את הפרווה של ${petName} תוך שבועות ספורים`,
    'מברשת': `מותאם לסוג הפרווה של ${petName} — טיפוח קל ויעיל`,
    'צעצוע אינטראקטיבי': `ישמור את ${petName} פעיל/ה ומגורה/ת לאורך שעות`,
    'מזון דיאטטי': `פורמולה מאוזנת שתשמור על ${petName} בכושר מצוין`,
    'חטיף דל קלוריות': `תגמול בריא ל${petName} — טעים בלי להכביד`,
    'פרוביוטיקה': `יחזק את מערכת העיכול של ${petName} ויתמוך בבריאות הכללית`,
    'תמיכת מפרקים': `גלוקוזאמין וכונדרואיטין שישמרו על ${petName} גמיש/ה ופעיל/ה`,
    'מזון יבש מומלץ': `פורמולה מותאמת שתספק ל${petName} את כל הצרכים התזונתיים`,
    'מזון יבש חלופי': `אלטרנטיבה איכותית ל${petName} עם רכיבים מובחרים`,
    'מזון רטוב': `ארוחה עסיסית שתפנק את ${petName} — גם ${typeHe}ים בררנים אוהבים`,
    'תוסף מפרקים': `תמיכה יומית למפרקים של ${petName} לניידות טובה יותר`,
    'מזון למפרקים': `מזון עשיר בגלוקוזאמין שיתמוך במפרקים של ${petName}`,
    'מיטה אורתופדית': `תמיכה מושלמת לשינה של ${petName} — במיוחד למפרקים`,
    'מזון GI': `מזון עדין שיעזור למערכת העיכול של ${petName} להתאושש`,
    'סיבים תזונתיים': `תוסף שישפר את העיכול של ${petName} באופן טבעי`,
  };
  
  return templates[label] || `מומלץ עבור ${petName}`;
}

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { petId, category } = await req.json() as { petId: string; category: StatCategory };
    
    if (!petId || !category) {
      return new Response(JSON.stringify({ error: "Missing petId or category" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch pet context
    const { data: pet } = await supabase
      .from("pets")
      .select("id, name, type, breed, birth_date, medical_conditions, weight, size")
      .eq("id", petId)
      .maybeSingle();

    if (!pet) {
      return new Response(JSON.stringify({ error: "Pet not found", products: [] }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const petContext: PetContext = pet as PetContext;
    const lifeStage = getLifeStage(petContext.birth_date);
    const hasMedicalConditions = petContext.medical_conditions && petContext.medical_conditions.length > 0;
    let rules = getSearchRules(category);

    // V18 Safety: If pet has medical conditions, prioritize Vet-Diet products for feeding
    if (hasMedicalConditions && (category === 'feeding' || category === 'digestion')) {
      const conditions = (petContext.medical_conditions || []).map(c => c.toLowerCase());
      const vetDietTerms = conditions.flatMap(c => {
        if (c.includes('allerg')) return ['hypoallergenic', 'היפואלרגני'];
        if (c.includes('gastr') || c.includes('עיכול')) return ['gastrointestinal', 'gi', 'intestinal'];
        if (c.includes('renal') || c.includes('כליות')) return ['renal', 'כליות'];
        if (c.includes('urin') || c.includes('שתן')) return ['urinary', 'struvite'];
        if (c.includes('diabet') || c.includes('סוכרת')) return ['diabetic', 'סוכרתי'];
        if (c.includes('obes') || c.includes('השמנ')) return ['metabolic', 'obesity', 'light'];
        if (c.includes('joint') || c.includes('מפרק')) return ['joint', 'mobility', 'ניידות'];
        return [c];
      });
      if (vetDietTerms.length > 0) {
        // Prepend a vet-diet rule as highest priority
        rules = [
          { label: 'מזון רפואי מומלץ', searchTerms: [...vetDietTerms, 'vet', 'veterinary', 'רפואי'], categoryFilters: ['food', 'מזון', 'vet', 'diet'] },
          ...rules,
        ];
      }
    }

    const results: Array<{
      id: string;
      name: string;
      price: number;
      image_url: string;
      label: string;
      personalizedCopy: string;
    }> = [];

    // For each search rule, find the best matching product
    for (const rule of rules) {
      // Skip insurance placeholder
      if (rule.label === 'ביטוח Libra') {
        results.push({
          id: 'insurance-offer',
          name: 'ביטוח Libra',
          price: 0,
          image_url: '',
          label: rule.label,
          personalizedCopy: `הגנו על ${petContext.name} עם ביטוח בריאות מקיף מ-Libra`,
        });
        continue;
      }

      // Build search query
      const orConditions: string[] = [];
      for (const term of rule.searchTerms) {
        orConditions.push(`name.ilike.%${term}%`);
      }
      for (const cat of rule.categoryFilters) {
        orConditions.push(`category.ilike.%${cat}%`);
      }

      if (orConditions.length === 0) continue;

      let query = supabase
        .from("business_products")
        .select("id, name, price, image_url, category, pet_type, life_stage, brand")
        .eq("in_stock", true)
        .or(orConditions.join(","));

      // Filter by pet type
      if (petContext.type === 'dog' || petContext.type === 'cat') {
        query = query.or(`pet_type.eq.${petContext.type},pet_type.is.null`);
      }

      const { data: products } = await query.limit(5);

      if (!products || products.length === 0) continue;

      // Apply life-stage filter (Zero-Noise)
      let filtered = products;
      if (lifeStage === 'puppy') {
        // Hide adult-only products
        filtered = products.filter(p => {
          const name = (p.name || '').toLowerCase();
          const ls = ((p as any).life_stage || '').toLowerCase();
          const isAdultOnly = (name.includes('adult') || name.includes('בוגר')) && 
                              !name.includes('puppy') && !name.includes('גור') && !name.includes('junior');
          return !isAdultOnly && ls !== 'adult';
        });
      } else if (lifeStage === 'adult') {
        // Hide puppy/growth products
        filtered = products.filter(p => {
          const name = (p.name || '').toLowerCase();
          const ls = ((p as any).life_stage || '').toLowerCase();
          const isPuppyOnly = (name.includes('puppy') || name.includes('גור') || name.includes('growth')) &&
                               !name.includes('adult') && !name.includes('all');
          return !isPuppyOnly && ls !== 'puppy';
        });
      }

      // Zero-Noise: if no products match after filtering, skip
      if (filtered.length === 0) continue;

      // Pick the best one (first match)
      const best = filtered[0];
      results.push({
        id: best.id,
        name: best.name,
        price: best.price,
        image_url: best.image_url,
        label: rule.label,
        personalizedCopy: personalizeCopy(best.name, petContext.name, rule.label, petContext.type),
      });
    }

    return new Response(JSON.stringify({
      products: results,
      petName: petContext.name,
      lifeStage,
      category,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("smart-recommendations error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
