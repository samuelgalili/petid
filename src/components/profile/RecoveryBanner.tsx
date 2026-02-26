/**
 * RecoveryBanner - Shows "Get Well Soon" message during recovery mode
 * Displays for 14 days after surgery/infection with 3 specific product suggestions
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingBag, Pill, Leaf, Utensils, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RecoveryBannerProps {
  petId: string;
  petName: string;
  onOpenRecoveryProducts?: () => void;
}

const RECOVERY_PRODUCTS = [
  {
    icon: Utensils,
    name: 'מזון החלמה רפואי',
    description: 'Health & Care Intestinal — מזון ייעודי לתמיכה במערכת העיכול בזמן החלמה',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  {
    icon: Leaf,
    name: 'תוסף הרגעה טבעי',
    description: 'Calming Aid — מפחית מתח ותומך בהחלמה שקטה',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Pill,
    name: 'תוסף תזונתי מותאם',
    description: 'תוסף המותאם לאבחנה — תמיכה חיסונית וחיזוק הגוף',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
];

export const RecoveryBanner = ({ petId, petName, onOpenRecoveryProducts }: RecoveryBannerProps) => {
  const [isInRecovery, setIsInRecovery] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);
  const [showProducts, setShowProducts] = useState(false);

  useEffect(() => {
    const checkRecovery = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("pet_vet_visits")
        .select("recovery_until, is_recovery_mode")
        .eq("pet_id", petId)
        .eq("is_recovery_mode", true)
        .gte("recovery_until", today)
        .order("recovery_until", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.recovery_until) {
        const until = new Date(data.recovery_until);
        const remaining = Math.ceil((until.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (remaining > 0) {
          setIsInRecovery(true);
          setDaysLeft(remaining);
        }
      }
    };
    checkRecovery();
  }, [petId]);

  if (!isInRecovery) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 mb-4"
      >
        <div className="p-4 bg-gradient-to-l from-pink-500/10 to-red-500/10 rounded-2xl border border-red-200/30 dark:border-red-800/30">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center"
            >
              <Heart className="w-5 h-5 text-red-500" fill="currentColor" strokeWidth={1.5} />
            </motion.div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">
                החלמה מהירה, {petName}! 💕
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {daysLeft} ימים נותרו במצב החלמה — מעקב אחר התאוששות
              </p>
            </div>
            <button
              onClick={() => setShowProducts(true)}
              className="p-2 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-colors"
            >
              <ShoppingBag className="w-4 h-4 text-red-500" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Recovery Products Sheet */}
      <AnimatePresence>
        {showProducts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-end justify-center bg-background/60 backdrop-blur-sm"
            onClick={() => setShowProducts(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-4 mb-[calc(env(safe-area-inset-bottom)+80px)] p-5 bg-card rounded-2xl border border-border/40 shadow-xl"
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground text-sm">
                  המלצות החלמה ל{petName} 💊
                </h3>
                <button onClick={() => setShowProducts(false)} className="p-1">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-3">
                {RECOVERY_PRODUCTS.map((product, i) => {
                  const Icon = product.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 p-3 bg-muted/20 rounded-xl"
                    >
                      <div className={`w-9 h-9 rounded-full ${product.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${product.color}`} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{product.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{product.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  setShowProducts(false);
                  onOpenRecoveryProducts?.();
                }}
                className="w-full mt-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold"
              >
                צפה במוצרי החלמה בחנות
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
