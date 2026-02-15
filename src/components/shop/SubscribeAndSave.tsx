/**
 * SubscribeAndSave — Restock subscription option next to Add to Cart.
 * Calculates when the bag will end based on pet's daily feeding amount.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Check, Calculator } from "lucide-react";
import { useActivePet } from "@/hooks/useActivePet";

interface SubscribeAndSaveProps {
  productName: string;
  productPrice: number;
  productWeight: string | null;
  onSubscribe: (intervalDays: number) => void;
}

function parseBagWeightKg(w: string | null): number {
  if (!w) return 0;
  const match = w.match(/(\d+\.?\d*)/);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  // If text includes 'גרם' or 'g', convert to kg
  if (w.includes("גרם") || w.match(/\bg\b/i)) return val / 1000;
  return val;
}

function estimateDailyIntake(petWeightKg: number): number {
  // ~2.5% of body weight for dogs, ~3% for small breeds
  if (petWeightKg <= 5) return petWeightKg * 0.03;
  if (petWeightKg <= 15) return petWeightKg * 0.025;
  return petWeightKg * 0.02;
}

export const SubscribeAndSave = ({ productName, productPrice, productWeight, onSubscribe }: SubscribeAndSaveProps) => {
  const { pet } = useActivePet();
  const [showDetails, setShowDetails] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const calculation = useMemo(() => {
    if (!pet?.weight || !productWeight) return null;
    const bagKg = parseBagWeightKg(productWeight);
    if (bagKg <= 0) return null;

    const dailyKg = estimateDailyIntake(pet.weight);
    if (dailyKg <= 0) return null;

    const days = Math.round(bagKg / dailyKg);
    const pricePerDay = (productPrice / days).toFixed(1);
    const discountedPrice = (productPrice * 0.9).toFixed(0); // 10% subscription discount

    return { days, pricePerDay, discountedPrice, dailyGrams: Math.round(dailyKg * 1000) };
  }, [pet, productWeight, productPrice]);

  if (!calculation || !pet) return null;

  const handleSubscribe = () => {
    setSubscribed(true);
    onSubscribe(calculation.days);
  };

  return (
    <div className="mt-3">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-primary" strokeWidth={1.5} />
          <span className="text-xs font-semibold text-foreground">הירשם וחסוך 10%</span>
        </div>
        <span className="text-xs font-bold text-primary">₪{calculation.discountedPrice}/משלוח</span>
      </button>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 rounded-xl bg-card border border-border/30">
              <div className="flex items-center gap-1.5 mb-2">
                <Calculator className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                <span className="text-xs font-bold text-foreground">חישוב חכם ל{pet.name}</span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">מנה יומית מומלצת</span>
                  <span className="font-semibold text-foreground">{calculation.dailyGrams} גרם</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">משקל השקית</span>
                  <span className="font-semibold text-foreground">{productWeight}</span>
                </div>
                <div className="h-px bg-border/50 my-1" />
                <div className="flex justify-between">
                  <span className="font-bold text-foreground">⏱️ מספיק ל</span>
                  <span className="font-black text-primary">~{calculation.days} ימים</span>
                </div>
              </div>

              <motion.button
                onClick={handleSubscribe}
                disabled={subscribed}
                whileTap={{ scale: 0.97 }}
                className="w-full mt-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                style={{
                  background: subscribed ? "hsl(var(--primary) / 0.1)" : "hsl(var(--primary))",
                  color: subscribed ? "hsl(var(--primary))" : "hsl(var(--primary-foreground))",
                }}
              >
                {subscribed ? (
                  <>
                    <Check className="w-4 h-4" /> נרשמת! נשלח כל {calculation.days} ימים
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" /> נשלח לך שק חדש כל {calculation.days} ימים
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
