/**
 * SmartCheckoutSheet — Shows product fit for the active pet.
 * Calculates how many days a bag will last based on pet weight.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, X, Calculator, PawPrint, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface SmartCheckoutSheetProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productPrice: number;
  productWeight: string | undefined;
  productImage: string;
}

interface PetData {
  name: string;
  weight: number | null;
  breed: string | null;
  pet_type: string;
}

function estimateDaysLasting(bagWeightKg: number, petWeightKg: number): number {
  // Rough daily intake: ~2-3% of body weight for dogs
  const dailyIntakeKg = petWeightKg * 0.025;
  if (dailyIntakeKg <= 0) return 0;
  return Math.round(bagWeightKg / dailyIntakeKg);
}

function parseBagWeight(weightStr: string | undefined): number {
  if (!weightStr) return 0;
  const match = weightStr.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 0;
}

export const SmartCheckoutSheet = ({
  open, onClose, productId, productName, productPrice, productWeight, productImage,
}: SmartCheckoutSheetProps) => {
  const { addToCart } = useCart();
  const [pet, setPet] = useState<PetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetch = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: pets } = await (supabase as any)
        .from("pets")
        .select("name, weight, breed, type")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(1);

      setPet(pets?.[0] || null);
      setLoading(false);
    };
    fetch();
  }, [open]);

  const bagKg = parseBagWeight(productWeight);
  const daysLasting = pet?.weight && bagKg ? estimateDaysLasting(bagKg, pet.weight) : null;
  const pricePerDay = daysLasting ? (productPrice / daysLasting).toFixed(1) : null;

  const handleAdd = () => {
    addToCart({
      id: productId,
      name: productName,
      price: productPrice,
      image: productImage,
      quantity: 1,
    });
    setAdded(true);
    toast.success("נוסף לעגלה! 🛒");
    setTimeout(() => { setAdded(false); onClose(); }, 1200);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end justify-center"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-background rounded-t-3xl p-5 pb-8 shadow-2xl"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20 mx-auto mb-4" />

            {/* Close */}
            <button onClick={onClose} className="absolute top-4 left-4 p-1.5 rounded-full hover:bg-muted">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Product summary */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                <img src={productImage} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground line-clamp-2">{productName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-black text-primary">₪{productPrice}</span>
                  {productWeight && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{productWeight}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Smart calculation */}
            {!loading && pet && daysLasting && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-primary/5 border border-primary/10 rounded-2xl p-4 mb-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  <span className="text-sm font-bold text-foreground">חישוב חכם ל{pet.name}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <PawPrint className="w-3 h-3" /> משקל {pet.name}
                    </span>
                    <span className="text-xs font-semibold text-foreground">{pet.weight} ק״ג</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">📦 גודל שקית</span>
                    <span className="text-xs font-semibold text-foreground">{productWeight}</span>
                  </div>
                  <div className="h-px bg-border/50 my-1" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">⏱️ מספיק ל</span>
                    <span className="text-sm font-black text-primary">~{daysLasting} ימים</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">💰 עלות ליום</span>
                    <span className="text-xs font-semibold text-primary">₪{pricePerDay}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {!loading && pet && !daysLasting && (
              <div className="bg-muted/50 rounded-xl p-3 mb-5 text-center">
                <p className="text-xs text-muted-foreground">
                  {!pet.weight ? `הוסף את משקל ${pet.name} לפרופיל לחישוב מדויק` : "אין מספיק מידע לחישוב"}
                </p>
              </div>
            )}

            {/* Add to cart button */}
            <motion.button
              onClick={handleAdd}
              disabled={added}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              style={{
                background: added ? "hsl(var(--primary) / 0.15)" : "hsl(var(--primary))",
                color: added ? "hsl(var(--primary))" : "hsl(var(--primary-foreground))",
              }}
            >
              {added ? (
                <>
                  <Check className="w-5 h-5" /> נוסף לעגלה!
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" /> הוסף לעגלה — ₪{productPrice}
                </>
              )}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
