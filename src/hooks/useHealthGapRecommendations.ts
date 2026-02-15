/**
 * useHealthGapRecommendations — Maps pet medical gaps (from profile + OCR docs)
 * to specific product categories for the health-to-shop funnel.
 */

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActivePet, type ActivePet } from "./useActivePet";

export interface HealthGap {
  condition: string;
  severity: "high" | "medium" | "low";
  reason_he: string;
  product_categories: string[];
  product_keywords: string[];
}

export interface RecommendedProduct {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  image_url: string;
  category: string | null;
  medical_tags: string[] | null;
  gap: HealthGap;
  relevance_reason: string;
}

// Medical condition → product mapping
const CONDITION_PRODUCT_MAP: Record<string, Omit<HealthGap, "condition">> = {
  "סוכרת": {
    severity: "high",
    reason_he: "מוצרים דלי סוכר מותאמים לסוכרת",
    product_categories: ["food", "treats", "מזון", "חטיפים"],
    product_keywords: ["diabetic", "סוכרת", "דל סוכר", "low sugar", "grain free", "ללא דגנים"],
  },
  "כליות": {
    severity: "high",
    reason_he: "מזון בחלבון מופחת לתמיכה בכליות",
    product_categories: ["food", "מזון", "רפואי"],
    product_keywords: ["renal", "כליות", "kidney", "low protein", "חלבון מופחת"],
  },
  "אלרגיה": {
    severity: "medium",
    reason_he: "מוצרים היפואלרגניים ללא רכיבים מגרים",
    product_categories: ["food", "treats", "מזון", "חטיפים", "שמפו"],
    product_keywords: ["hypoallergenic", "היפואלרגני", "grain free", "ללא גלוטן", "sensitive", "רגיש"],
  },
  "עיכול": {
    severity: "medium",
    reason_he: "מזון עדין לתמיכה במערכת העיכול",
    product_categories: ["food", "מזון", "תוספים"],
    product_keywords: ["digestive", "gastro", "עיכול", "פרוביוטיקה", "probiotic", "sensitive stomach"],
  },
  "עור": {
    severity: "medium",
    reason_he: "מוצרים לטיפוח עור ופרווה רגישים",
    product_categories: ["grooming", "food", "טיפוח", "מזון"],
    product_keywords: ["skin", "coat", "עור", "פרווה", "omega", "אומגה", "derma"],
  },
  "משקל": {
    severity: "medium",
    reason_he: "מוצרים דלי קלוריות לניהול משקל",
    product_categories: ["food", "treats", "מזון", "חטיפים"],
    product_keywords: ["weight", "diet", "דיאטה", "משקל", "light", "לייט", "low calorie"],
  },
  "מפרקים": {
    severity: "medium",
    reason_he: "תוספים וצעצועים לתמיכה במפרקים",
    product_categories: ["supplements", "תוספים", "מזון"],
    product_keywords: ["joint", "מפרקים", "glucosamine", "גלוקוזאמין", "mobility", "senior"],
  },
  "שיניים": {
    severity: "low",
    reason_he: "מוצרים לבריאות הפה והשיניים",
    product_categories: ["dental", "treats", "חטיפים", "טיפוח"],
    product_keywords: ["dental", "שיניים", "teeth", "oral", "chew", "לעיסה"],
  },
  "לב": {
    severity: "high",
    reason_he: "מזון מותאם לתמיכה בבריאות הלב",
    product_categories: ["food", "מזון", "תוספים"],
    product_keywords: ["cardiac", "heart", "לב", "taurine", "טאורין"],
  },
  // Cat-specific conditions
  "שתן": {
    severity: "high",
    reason_he: "מזון לתמיכה בבריאות מערכת השתן",
    product_categories: ["food", "מזון"],
    product_keywords: ["urinary", "שתן", "FLUTD", "struvite", "pH"],
  },
  "כדורי שיער": {
    severity: "low",
    reason_he: "מוצרים למניעת כדורי שיער",
    product_categories: ["food", "treats", "מזון", "חטיפים"],
    product_keywords: ["hairball", "כדורי שיער", "malt", "מאלט", "fiber", "סיבים"],
  },
};

// Age-based gaps — species-aware
function getAgeGaps(pet: ActivePet): HealthGap[] {
  const gaps: HealthGap[] = [];
  const isCat = pet.pet_type === "cat";
  if (pet.ageWeeks !== null) {
    if (pet.ageWeeks < 26) {
      gaps.push({
        condition: isCat ? "kitten_growth" : "puppy_growth",
        severity: "medium",
        reason_he: isCat ? "מוצרי גדילה מותאמים לגורי חתולים" : "מוצרי גדילה מותאמים לגורים",
        product_categories: ["food", "מזון", "חטיפים"],
        product_keywords: isCat
          ? ["kitten", "גורי חתולים", "growth", "junior", "starter"]
          : ["puppy", "גורים", "growth", "junior", "starter"],
      });
    } else if (pet.ageWeeks > 364) {
      gaps.push({
        condition: "senior_care",
        severity: "medium",
        reason_he: "מוצרים לתמיכה בגיל המבוגר",
        product_categories: ["food", "supplements", "מזון", "תוספים"],
        product_keywords: ["senior", "מבוגר", "joint", "מפרקים", "mature", "7+"],
      });
    }
  }
  return gaps;
}

export function useHealthGapRecommendations() {
  const { pet, loading: petLoading } = useActivePet();
  const [ocrConditions, setOcrConditions] = useState<string[]>([]);
  const [products, setProducts] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch OCR-extracted medical data
  useEffect(() => {
    const fetchOCR = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pets } = await (supabase as any)
        .from("pets")
        .select("id")
        .eq("user_id", user.id)
        .eq("archived", false)
        .limit(1);

      if (!pets?.[0]) return;

      const { data: extracted } = await supabase
        .from("pet_document_extracted_data")
        .select("vaccination_type, treatment_type, diagnosis")
        .eq("pet_id", pets[0].id);

      if (extracted?.length) {
        const conditions: string[] = [];
        extracted.forEach((doc: any) => {
          if (doc.diagnosis) conditions.push(doc.diagnosis);
          if (doc.treatment_type) conditions.push(doc.treatment_type);
        });
        setOcrConditions(conditions);
      }
    };
    fetchOCR();
  }, []);

  // Identify health gaps
  const gaps = useMemo((): HealthGap[] => {
    if (!pet) return [];
    const allConditions = [
      ...(pet.medical_conditions || []),
      ...ocrConditions,
    ];

    const matchedGaps: HealthGap[] = [];
    const seen = new Set<string>();

    for (const condition of allConditions) {
      const lower = condition.toLowerCase();
      for (const [key, mapping] of Object.entries(CONDITION_PRODUCT_MAP)) {
        if (lower.includes(key) && !seen.has(key)) {
          seen.add(key);
          matchedGaps.push({ condition: key, ...mapping });
        }
      }
    }

    // Add age-based gaps
    getAgeGaps(pet).forEach(g => {
      if (!seen.has(g.condition)) {
        seen.add(g.condition);
        matchedGaps.push(g);
      }
    });

    // Sort by severity
    const order = { high: 0, medium: 1, low: 2 };
    return matchedGaps.sort((a, b) => order[a.severity] - order[b.severity]);
  }, [pet, ocrConditions]);

  // Fetch matching products
  useEffect(() => {
    if (gaps.length === 0 || petLoading) {
      setLoading(false);
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);
      const allKeywords = gaps.flatMap(g => g.product_keywords);

      // Build a search across product names, descriptions, and medical_tags
      const { data: prods } = await supabase
        .from("business_products")
        .select("id, name, price, sale_price, image_url, category, medical_tags, description, ingredients")
        .eq("in_stock", true)
        .order("average_rating", { ascending: false })
        .limit(50);

      if (!prods?.length) { setLoading(false); return; }

      // Score each product against gaps
      const scored: RecommendedProduct[] = [];

      for (const prod of prods) {
        const searchText = `${prod.name} ${prod.description || ""} ${prod.ingredients || ""} ${(prod.medical_tags || []).join(" ")}`.toLowerCase();

        let bestGap: HealthGap | null = null;
        let bestScore = 0;

        for (const gap of gaps) {
          let score = 0;
          for (const kw of gap.product_keywords) {
            if (searchText.includes(kw.toLowerCase())) score += 10;
          }
          // Medical tags direct match
          if (prod.medical_tags?.length) {
            for (const tag of prod.medical_tags) {
              if (gap.product_keywords.some(kw => tag.toLowerCase().includes(kw.toLowerCase()))) {
                score += 20;
              }
            }
          }
          if (score > bestScore) {
            bestScore = score;
            bestGap = gap;
          }
        }

        if (bestGap && bestScore >= 10) {
          scored.push({
            ...prod,
            gap: bestGap,
            relevance_reason: bestGap.reason_he,
          });
        }
      }

      // Sort by gap severity then score, limit to 8
      const order = { high: 0, medium: 1, low: 2 };
      scored.sort((a, b) => order[a.gap.severity] - order[b.gap.severity]);
      setProducts(scored.slice(0, 8));
      setLoading(false);
    };

    fetchProducts();
  }, [gaps, petLoading]);

  return { pet, gaps, products, loading: petLoading || loading };
}
