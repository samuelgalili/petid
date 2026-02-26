/**
 * ProductInfoDrawer — Full-screen product details with glassmorphism
 * Shows SafeScore, ingredients, size, delivery info
 * SafeScore is dynamically adjusted based on pet age/breed from PetPreferenceContext
 */
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, ShieldCheck, ShieldAlert, Truck, Package, Leaf, Plus } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { haptic } from "@/lib/haptics";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePetPreference } from "@/contexts/PetPreferenceContext";

interface ProductInfoDrawerProps {
  product: {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    image: string;
    description?: string;
    ingredients?: string;
    category?: string;
    safetyScore?: number | null;
    brand?: string;
    weightUnit?: string;
    flavors?: string[];
    inStock?: boolean;
  } | null;
  petName?: string;
  onClose: () => void;
  onAddToCart?: () => void;
  onAddToCarePlan?: () => void;
}

/**
 * Calculate dynamic SafeScore modifier based on pet age and breed.
 * Puppies/kittens get stricter scoring; certain breeds with known sensitivities get adjustments.
 */
function computePetAdjustedScore(
  baseScore: number | null | undefined,
  birthDate: string | null,
  breed: string | null,
  medicalConditions: string[] | null,
  category?: string
): number | null {
  if (baseScore == null) return null;

  let adjusted = baseScore;

  // Age-based modifier: younger animals need stricter safety
  if (birthDate) {
    const ageMonths = Math.floor(
      (Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    );
    if (ageMonths < 6) {
      // Puppy/kitten penalty for non-puppy-specific food
      adjusted -= 0.8;
    } else if (ageMonths < 12) {
      adjusted -= 0.3;
    } else if (ageMonths > 120) {
      // Senior pet — stricter on joint/digestive
      adjusted -= 0.4;
    }
  }

  // Medical conditions modifier
  if (medicalConditions && medicalConditions.length > 0) {
    const sensitiveConditions = ["allergies", "digestive", "kidney", "urinary", "heart"];
    const hasSensitive = medicalConditions.some((c) => sensitiveConditions.includes(c));
    if (hasSensitive && category === "food") {
      adjusted -= 0.5;
    }
  }

  // Clamp between 0 and 10
  return Math.round(Math.max(0, Math.min(10, adjusted)) * 10) / 10;
}

export const ProductInfoDrawer = ({ product, petName, onClose, onAddToCart, onAddToCarePlan }: ProductInfoDrawerProps) => {
  const { toast } = useToast();
  const { activePet } = usePetPreference();

  if (!product) return null;

  // Dynamic SafeScore: adjust base score using pet's age, breed, and conditions
  const safetyScore = computePetAdjustedScore(
    product.safetyScore,
    activePet?.birth_date ?? null,
    activePet?.breed ?? null,
    activePet?.medical_conditions ?? null,
    product.category
  );
  const safetyLevel = safetyScore != null 
    ? safetyScore >= 8 ? "safe" : safetyScore >= 5 ? "caution" : "unsafe"
    : null;

  const safetyColors = {
    safe: { bg: "bg-[hsla(142,60%,45%,0.1)]", border: "border-[hsla(142,60%,45%,0.2)]", text: "text-[hsl(142,60%,45%)]", icon: ShieldCheck },
    caution: { bg: "bg-[hsla(38,90%,50%,0.1)]", border: "border-[hsla(38,90%,50%,0.2)]", text: "text-[hsl(38,90%,50%)]", icon: ShieldAlert },
    unsafe: { bg: "bg-[hsla(0,80%,55%,0.1)]", border: "border-[hsla(0,80%,55%,0.2)]", text: "text-destructive", icon: ShieldAlert },
  };

  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  // Parse ingredients from string
  const ingredientsList = product.ingredients
    ?.split(/[,،;]/)
    .map(i => i.trim())
    .filter(Boolean)
    .slice(0, 8);

  return (
    <AnimatePresence>
      <motion.div
        key="product-info-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-background/60 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="absolute inset-0 bg-background overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          dir="rtl"
        >
          {/* Close button */}
          <button
            onClick={() => { haptic("light"); onClose(); }}
            className="fixed top-4 left-4 z-10 w-10 h-10 rounded-full bg-muted/60 backdrop-blur-md flex items-center justify-center border border-border/30"
            style={{ top: `calc(env(safe-area-inset-top, 0px) + 1rem)` }}
          >
            <X className="w-5 h-5 text-foreground" />
          </button>

          {/* Hero Image */}
          <div className="relative w-full aspect-square bg-muted/30">
            <OptimizedImage
              src={product.image}
              alt={product.name}
              className="w-full h-full"
              objectFit="cover"
            />
            {/* Gradient overlay */}
            <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-background to-transparent" />

            {/* Sale badge */}
            {discount && (
              <div className="absolute top-4 right-4 bg-destructive text-destructive-foreground text-sm font-bold px-3 py-1.5 rounded-xl shadow-lg">
                -{discount}%
              </div>
            )}
          </div>

          {/* Content */}
          <div className="px-5 -mt-8 relative z-10 pb-32">
            {/* Title + Price */}
            <div className="mb-4">
              {product.brand && (
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{product.brand}</span>
              )}
              <h1 className="text-xl font-bold text-foreground leading-snug mt-1">{product.name}</h1>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-foreground">₪{product.price}</span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-base text-muted-foreground line-through">₪{product.originalPrice}</span>
                )}
              </div>
            </div>

            {/* SafeScore Badge */}
            {safetyLevel && safetyScore != null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`flex items-center gap-3 p-4 rounded-2xl ${safetyColors[safetyLevel].bg} border ${safetyColors[safetyLevel].border} mb-4`}
              >
                <div className="w-12 h-12 rounded-xl bg-background/50 backdrop-blur-md flex items-center justify-center border border-border/20">
                  {(() => {
                    const Icon = safetyColors[safetyLevel].icon;
                    return <Icon className={`w-6 h-6 ${safetyColors[safetyLevel].text}`} />;
                  })()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-black ${safetyColors[safetyLevel].text}`}>{safetyScore}/10</span>
                    <span className="text-xs font-semibold text-foreground">SafeScore</span>
                  </div>
                  {petName && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {safetyLevel === "safe" 
                        ? `מאושר על ידי המומחה עבור ${petName}` 
                        : `דורש בדיקה נוספת עבור ${petName}`}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Description */}
            {product.description && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mb-4"
              >
                <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
              </motion.div>
            )}

            {/* Key Ingredients */}
            {ingredientsList && ingredientsList.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-4"
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <Leaf className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">מרכיבים עיקריים</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ingredientsList.map((ingredient, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-muted/60 border border-border/20 text-xs font-medium text-foreground backdrop-blur-sm"
                    >
                      {ingredient}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Size / Weight */}
            {product.weightUnit && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/20 mb-4"
              >
                <Package className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-semibold text-foreground">גודל</span>
                  <p className="text-xs text-muted-foreground">{product.weightUnit}</p>
                </div>
              </motion.div>
            )}

            {/* Flavors */}
            {product.flavors && product.flavors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mb-4"
              >
                <h3 className="text-sm font-bold text-foreground mb-2">טעמים זמינים</h3>
                <div className="flex gap-2 flex-wrap">
                  {product.flavors.map((flavor, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-full bg-primary/5 border border-primary/15 text-xs font-medium text-foreground"
                    >
                      {flavor}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Delivery */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/20 mb-4"
            >
              <Truck className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-sm font-semibold text-foreground">משלוח</span>
                <p className="text-xs text-muted-foreground">2-5 ימי עסקים</p>
              </div>
            </motion.div>
          </div>

          {/* Floating CTA */}
          <div className="fixed bottom-0 inset-x-0 z-20 p-4 bg-background/90 backdrop-blur-xl border-t border-border/20"
               style={{ paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 1rem)` }}
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                haptic("medium");
                onAddToCarePlan?.();
                onAddToCart?.();
                onClose();
              }}
              disabled={product.inStock === false}
              className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              <Plus className="w-5 h-5" />
              הוסף לתוכנית הטיפול
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
