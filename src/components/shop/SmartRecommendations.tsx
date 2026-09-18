/**
 * SmartRecommendations — "Recommended for [Pet Name]" top row.
 * Prioritizes products by pet age, breed, and health conditions.
 */

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Info, Sparkles } from "lucide-react";
import { useActivePet } from "@/hooks/useActivePet";
import { useCart } from "@/contexts/CartContext";
import { ShopRailCard } from "@/components/shop/ShopRailCard";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { getShopProducts } from "@/lib/mipoApi";

interface RecommendedProduct {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category: string | null;
  pet_type: string | null;
  description: string | null;
  relevanceScore: number;
  relevanceReason: string;
}

// Keywords by life stage
const PUPPY_CATEGORIES = ["puppy", "גורים", "growth", "גדילה", "teething", "שיניים", "vaccine", "חיסון"];
const SENIOR_CATEGORIES = ["senior", "מבוגר", "joint", "מפרקים", "mobility", "ניידות"];
const HEALTH_CATEGORY_MAP: Record<string, string[]> = {
  "עיכול": ["gastro", "digestive", "עיכול", "sensitive stomach", "קיבה רגישה"],
  "כליות": ["renal", "kidney", "כליות", "low protein"],
  "עור": ["skin", "derma", "עור", "hypoallergenic", "היפואלרגני", "omega"],
  "סוכרת": ["diabetic", "סוכרת", "low carb", "sugar free"],
  "משקל": ["diet", "דיאטה", "weight", "light", "obesity"],
  "שתן": ["urinary", "שתן", "struvite", "ph"],
};

function scoreProduct(
  product: any,
  petType: string,
  ageWeeks: number | null,
  breed: string | null,
  medicalConditions: string[] | null
): { score: number; reason: string } {
  let score = 0;
  let reason = "תואם לסוג חיית המחמד";
  const text = `${product.name || ""} ${product.description || ""} ${product.category || ""}`.toLowerCase();

  // Pet type match
  if (product.pet_type === petType || product.pet_type === "all" || !product.pet_type) {
    score += 20;
  } else {
    return { score: -100, reason: "" }; // Wrong pet type
  }

  // Age relevance
  if (ageWeeks !== null) {
    if (ageWeeks < 26) {
      // Puppy
      if (PUPPY_CATEGORIES.some(kw => text.includes(kw))) {
        score += 40;
        reason = "תיאור המוצר מזכיר התאמה לגורים";
      }
      // Penalize adult/senior food
      if (text.includes("senior") || text.includes("מבוגר")) score -= 20;
    } else if (ageWeeks > 364) {
      // Senior
      if (SENIOR_CATEGORIES.some(kw => text.includes(kw))) {
        score += 40;
        reason = "תיאור המוצר מזכיר גיל מבוגר";
      }
      if (text.includes("puppy") || text.includes("גורים")) score -= 20;
    }
  }

  // Medical condition match
  if (medicalConditions && medicalConditions.length > 0) {
    for (const condition of medicalConditions) {
      const condLower = condition.toLowerCase();
      for (const [key, keywords] of Object.entries(HEALTH_CATEGORY_MAP)) {
        if (condLower.includes(key)) {
          if (keywords.some(kw => text.includes(kw))) {
            score += 50;
            reason = "קשור לצורך שסומן בפרופיל";
            break;
          }
        }
      }
    }
  }

  // Breed relevance
  if (breed) {
    const breedLower = breed.toLowerCase();
    if (text.includes(breedLower)) {
      score += 30;
      reason = `מיוחד לגזע ${breed}`;
    }
    // Small breeds
    const smallBreeds = ["שי טסו", "shih tzu", "יורקשיר", "צ'יוואווה", "מלטז", "פומרניאן"];
    if (smallBreeds.some(b => breedLower.includes(b)) && (text.includes("קטן") || text.includes("small") || text.includes("mini"))) {
      score += 25;
      reason = "לגזעים קטנים";
    }
  }

  // Weight-based relevance
  if (product.dog_size) {
    const sizeMap: Record<string, [number, number]> = {
      small: [0, 10], medium: [10, 25], large: [25, 45], giant: [45, 200],
    };
    const range = sizeMap[product.dog_size.toLowerCase()];
    if (range && product._petWeight && product._petWeight >= range[0] && product._petWeight < range[1]) {
      score += 25;
      reason = "מותאם למשקל חיית המחמד";
    }
  }

  // NRC 2006 compliance signal
  if (text.includes("nrc") || text.includes("aafco") || text.includes("fediaf")) {
    score += 15;
    reason = "תיאור הקטלוג מזכיר תקן תזונתי";
  }

  // General quality signals
  if (text.includes("premium") || text.includes("פרימיום")) score += 5;
  if (text.includes("organic") || text.includes("אורגני")) score += 5;

  return { score, reason };
}

export const SmartRecommendations = () => {
  const { pet, loading: petLoading } = useActivePet();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [products, setProducts] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (petLoading || !pet) {
      setLoading(false);
      return;
    }

    const fetchAndScore = async () => {
      setLoading(true);
      try {
        const data = await getShopProducts();

        if (!data || data.length === 0) {
          setProducts([]);
          return;
        }

        const scored = data
          .filter((p) => p.in_stock !== false)
          .map(p => {
            const enriched = { ...p, price: Number(p.sale_price || p.price || 0), _petWeight: pet.weight };
            const { score, reason } = scoreProduct(enriched, pet.pet_type, pet.ageWeeks, pet.breed, pet.medical_conditions);
            return {
              id: p.id,
              name: p.name,
              price: Number(p.sale_price || p.price || 0),
              image_url: p.image_url || "/placeholder.svg",
              category: p.category,
              pet_type: p.pet_type || null,
              description: p.description || null,
              relevanceScore: score,
              relevanceReason: reason,
            };
          })
          .filter(p => p.relevanceScore > 0)
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, 3);

        setProducts(scored);
      } catch (error) {
        console.error("Error loading smart recommendations:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAndScore();
  }, [pet, petLoading]);

  if (loading || !pet || products.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 py-4"
    >
      {/* Header. The icon circle and the "סינון כללי" pill were both --primary
          on a --primary tint, next to a --primary price on a --primary button:
          five cyan things in one glance, so none of them meant anything. The
          section is named in ink and the qualifier is a thin-line chip. */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-mipo-line">
            <Sparkles className="h-4 w-4 text-mipo-ink" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold text-mipo-ink">
              מיון לפי הפרופיל של {pet.name}
            </h2>
            <p className="truncate text-[12px] text-mipo-muted">מבוסס על פרטי הפרופיל ותיאורי הקטלוג</p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1 rounded-full border border-mipo-line px-2.5 py-1">
          <Info className="h-3 w-3 text-mipo-muted" strokeWidth={2} />
          <span className="text-[12px] font-medium text-mipo-muted">סינון כללי</span>
        </div>
      </div>

      {/* Products Row */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {products.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex-shrink-0"
          >
            <ShopRailCard
              product={product}
              reason={product.relevanceReason}
              onOpen={() => navigate(`/product/${product.id}`)}
              onAdd={() => {
                addToCart({ productId: product.id, name: product.name, price: product.price, image: product.image_url, quantity: 1 });
                toast.success("נוסף לעגלה! 🛒");
              }}
            />
          </motion.div>
        ))}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-mipo-muted">
        המיון אינו קובע התאמה רפואית ואינו מחליף בדיקה של תווית המוצר או ייעוץ וטרינרי.
      </p>
    </motion.div>
  );
};
