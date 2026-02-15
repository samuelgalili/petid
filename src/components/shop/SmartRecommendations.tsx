/**
 * SmartRecommendations — "Recommended for [Pet Name]" top row.
 * Prioritizes products by pet age, breed, and health conditions.
 */

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, ShoppingCart, Shield, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActivePet } from "@/hooks/useActivePet";
import { useCart } from "@/contexts/CartContext";
import { OptimizedImage } from "@/components/OptimizedImage";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
  let reason = "מותאם אישית";
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
        reason = "מושלם לגורים 🐾";
      }
      // Penalize adult/senior food
      if (text.includes("senior") || text.includes("מבוגר")) score -= 20;
    } else if (ageWeeks > 364) {
      // Senior
      if (SENIOR_CATEGORIES.some(kw => text.includes(kw))) {
        score += 40;
        reason = "תמיכה לגיל מבוגר 💛";
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
            reason = `מותאם למצב רפואי ✅`;
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
      const { data } = await supabase
        .from("business_products")
        .select("id, name, price, image_url, category, pet_type, description")
        .eq("in_stock", true)
        .limit(50);

      if (!data || data.length === 0) {
        setLoading(false);
        return;
      }

      const scored = data
        .map(p => {
          const { score, reason } = scoreProduct(p, pet.pet_type, pet.ageWeeks, pet.breed, pet.medical_conditions);
          return { ...p, relevanceScore: score, relevanceReason: reason };
        })
        .filter(p => p.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 3);

      setProducts(scored);
      setLoading(false);
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
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">מומלץ ל{pet.name}</h2>
            <p className="text-[10px] text-muted-foreground">מותאם לגיל, גזע ומצב בריאותי</p>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/5">
          <Shield className="w-3 h-3 text-primary" strokeWidth={2} />
          <span className="text-[10px] font-semibold text-primary">AI מותאם</span>
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
            onClick={() => navigate(`/product/${product.id}`)}
            className="flex-shrink-0 w-[130px] cursor-pointer"
          >
            <div className="relative rounded-2xl overflow-hidden bg-card border border-border/30 shadow-sm">
              {/* Image */}
              <div className="relative aspect-square bg-muted">
                <OptimizedImage
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full"
                  objectFit="cover"
                  sizes="130px"
                />
                {/* Relevance badge */}
                <div
                  className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" }}
                >
                  {product.relevanceReason}
                </div>
              </div>

              {/* Info */}
              <div className="p-2.5">
                <h3 className="text-[11px] font-semibold text-foreground line-clamp-2 mb-1.5 leading-tight">
                  {product.name}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-primary">₪{product.price}</span>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart({ id: product.id, name: product.name, price: product.price, image: product.image_url, quantity: 1 });
                      toast.success("נוסף לעגלה! 🛒");
                    }}
                    className="w-7 h-7 rounded-full bg-primary flex items-center justify-center"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2} />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
