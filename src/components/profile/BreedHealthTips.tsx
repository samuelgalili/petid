/**
 * BreedHealthTips - Breed-specific health tips for the pet profile
 * Clicking a tip opens a bottom sheet with 1 relevant product for quick purchase
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Eye, Wind, Scissors, Utensils, X, ShoppingBag, ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";

interface BreedHealthTipsProps {
  petName: string;
  breed?: string;
  ageMonths?: number;
  ageYears?: number;
  petType: 'dog' | 'cat';
}

interface BreedTip {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bg: string;
  productKeywords: string[];
  productCategory?: string;
}

// Shih Tzu-specific tips with product keywords
const SHIH_TZU_TIPS: BreedTip[] = [
  {
    icon: Eye,
    title: 'מניעת כתמי דמעות',
    description: 'נקו מדי יום סביב העיניים עם מגבונים ייעודיים. שיצו נוטים לדמיעה מוגברת.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    productKeywords: ['tear', 'stain', 'eye', 'wipe', 'דמעות', 'עיניים', 'מגבונ'],
    productCategory: 'grooming',
  },
  {
    icon: Wind,
    title: 'בטיחות נשימתית',
    description: 'גזע ברכיצפלי — הימנעו ממאמץ בחום, טיולים קצרים, רתמה ולא קולר.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    productKeywords: ['harness', 'רתמה', 'cooling', 'קירור'],
    productCategory: 'accessories',
  },
  {
    icon: Scissors,
    title: 'טיפוח פרווה ארוכה',
    description: 'ברישינג יומי למניעת סבכים. רחצה בשמפו היפואלרגני פעם בשבועיים.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    productKeywords: ['brush', 'shampoo', 'מברשת', 'שמפו', 'grooming', 'detangle'],
    productCategory: 'grooming',
  },
  {
    icon: Utensils,
    title: 'גודל אוכל מותאם',
    description: 'קיבל Extra Small / Easy Grip — גודל קטן במיוחד מותאם ללסת של שיצו.',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    productKeywords: ['small breed', 'mini', 'small', 'שיצו', 'גזע קטן'],
    productCategory: 'food',
  },
];

// Puppy-specific tips
const PUPPY_TIPS: BreedTip[] = [
  {
    icon: Sparkles,
    title: 'עצות גדילה לגיל הגור',
    description: 'מזון גורים עשיר בחלבון, ביקור וטרינר כל 3-4 שבועות, חיסונים ראשוניים.',
    color: 'text-primary',
    bg: 'bg-primary/10',
    productKeywords: ['puppy', 'junior', 'גורים', 'starter'],
    productCategory: 'food',
  },
];

const isShihTzu = (breed?: string) => {
  if (!breed) return false;
  const lower = breed.toLowerCase();
  return lower.includes('shih tzu') || lower.includes('שיצו') || lower.includes('שי טסו');
};

// Quick product sheet for a tip
const TipProductSheet = ({ tip, petName, onClose }: { tip: BreedTip; petName: string; onClose: () => void }) => {
  const navigate = useNavigate();

  const { data: product, isLoading } = useQuery({
    queryKey: ["tip-product", tip.title],
    queryFn: async () => {
      // Search for a matching product by keywords
      for (const keyword of tip.productKeywords) {
        const { data } = await supabase
          .from("business_products")
          .select("id, name, price, sale_price, image_url, safety_score, brand, category")
          .eq("in_stock", true)
          .or(`name.ilike.%${keyword}%,description.ilike.%${keyword}%`)
          .order("safety_score", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) return data;
      }
      // Fallback: get highest-rated product in category
      if (tip.productCategory) {
        const { data } = await supabase
          .from("business_products")
          .select("id, name, price, sale_price, image_url, safety_score, brand, category")
          .eq("in_stock", true)
          .ilike("category", `%${tip.productCategory}%`)
          .order("safety_score", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) return data;
      }
      return null;
    },
    staleTime: 1000 * 60 * 10,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-card rounded-t-2xl border-t border-border/30 shadow-2xl p-5 pb-8"
        dir="rtl"
      >
        {/* Handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Tip context */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className={`w-9 h-9 rounded-full ${tip.bg} flex items-center justify-center`}>
            <tip.icon className={`w-4 h-4 ${tip.color}`} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">{tip.title}</p>
            <p className="text-[10px] text-muted-foreground">מוצר מומלץ עבור {petName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted/60">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 animate-pulse">
            <div className="w-16 h-16 rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
          </div>
        ) : product ? (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              haptic("light");
              onClose();
              navigate("/shop", { state: { highlightProductId: product.id } });
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/20 hover:bg-muted/50 transition-colors text-right"
          >
            <div className="w-16 h-16 rounded-xl bg-background border border-border/20 overflow-hidden shrink-0">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
              {product.brand && (
                <p className="text-[10px] text-muted-foreground">{product.brand}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                {product.sale_price ? (
                  <>
                    <span className="text-sm font-bold text-primary">₪{product.sale_price}</span>
                    <span className="text-[10px] text-muted-foreground line-through">₪{product.price}</span>
                  </>
                ) : (
                  <span className="text-sm font-bold text-foreground">₪{product.price}</span>
                )}
                {product.safety_score && product.safety_score >= 8 && (
                  <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                    ✓ מאושר
                  </span>
                )}
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
          </motion.button>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">אין מוצר מתאים כרגע</p>
            <button
              onClick={() => { onClose(); navigate("/shop"); }}
              className="mt-2 text-xs font-medium text-primary"
            >
              חפשו בחנות →
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export const BreedHealthTips = ({ petName, breed, ageMonths, ageYears, petType }: BreedHealthTipsProps) => {
  const [activeTip, setActiveTip] = useState<BreedTip | null>(null);

  const tips = useMemo(() => {
    const result: BreedTip[] = [];
    const totalMonths = (ageYears || 0) * 12 + (ageMonths || 0);
    if (totalMonths > 0 && totalMonths <= 6) {
      result.push(...PUPPY_TIPS);
    }
    if (isShihTzu(breed)) {
      result.push(...SHIH_TZU_TIPS);
    }
    return result;
  }, [breed, ageMonths, ageYears]);

  if (tips.length === 0) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mb-4"
      >
        <div className="p-4 bg-card rounded-2xl border border-border/30">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
            <span className="font-semibold text-foreground text-sm">
              טיפים ל{petName}
            </span>
            {breed && (
              <span className="text-[10px] text-muted-foreground">({breed})</span>
            )}
          </div>

          <div className="space-y-2">
            {tips.map((tip, i) => {
              const Icon = tip.icon;
              return (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    haptic("light");
                    setActiveTip(tip);
                  }}
                  className="w-full flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors text-right"
                >
                  <div className={`w-8 h-8 rounded-full ${tip.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${tip.color}`} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{tip.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{tip.description}</p>
                  </div>
                  <ShoppingBag className="w-3.5 h-3.5 text-primary/50 mt-1 shrink-0" strokeWidth={1.5} />
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Product bottom sheet */}
      <AnimatePresence>
        {activeTip && (
          <TipProductSheet
            tip={activeTip}
            petName={petName}
            onClose={() => setActiveTip(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};
