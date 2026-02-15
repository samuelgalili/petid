/**
 * RecoveryBanner - Shows "Get Well Soon" message during recovery mode
 * Displays for 14 days after surgery/infection with product suggestions
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RecoveryBannerProps {
  petId: string;
  petName: string;
  onOpenRecoveryProducts?: () => void;
}

export const RecoveryBanner = ({ petId, petName, onOpenRecoveryProducts }: RecoveryBannerProps) => {
  const [isInRecovery, setIsInRecovery] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);

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
          {onOpenRecoveryProducts && (
            <button
              onClick={onOpenRecoveryProducts}
              className="p-2 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-colors"
            >
              <ShoppingBag className="w-4 h-4 text-red-500" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
