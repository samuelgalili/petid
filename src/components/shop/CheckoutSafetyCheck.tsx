/**
 * CheckoutSafetyCheck — Runs product safety analysis against pet profile before payment.
 * Shows warnings for products that may be harmful based on medical conditions.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";
import { useActivePet } from "@/hooks/useActivePet";
import { checkProductSafety, type ProductSafety } from "@/components/shop/ShopSafetyFilter";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variant?: string;
}

interface SafetyResult {
  item: CartItem;
  level: ProductSafety;
  reason: string | null;
}

export const CheckoutSafetyCheck = ({ items }: { items: CartItem[] }) => {
  const { pet } = useActivePet();

  const results = useMemo<SafetyResult[]>(() => {
    if (!pet) return [];
    return items
      .map(item => {
        const { level, reason } = checkProductSafety(`${item.name} ${item.variant || ""}`, pet);
        return { item, level, reason };
      })
      .filter(r => r.level !== "safe");
  }, [items, pet]);

  if (!pet || results.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/5 border border-primary/10 max-w-md mx-auto"
      >
        <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
        <span className="text-xs font-semibold text-primary">
          בדיקת בטיחות הושלמה — כל המוצרים מתאימים{pet ? ` ל${pet.name}` : ""}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2 max-w-md mx-auto"
    >
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="w-4 h-4 text-amber-600" strokeWidth={2} />
        <span className="text-xs font-bold text-foreground">בדיקת בטיחות ל{pet.name}</span>
      </div>

      {results.map(({ item, level, reason }) => (
        <div
          key={item.id}
          className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border text-xs ${
            level === "unsafe"
              ? "bg-destructive/5 border-destructive/20"
              : "bg-amber-500/5 border-amber-500/20"
          }`}
        >
          <ShieldAlert
            className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
              level === "unsafe" ? "text-destructive" : "text-amber-600"
            }`}
            strokeWidth={2}
          />
          <div>
            <p className="font-semibold text-foreground">{item.name}</p>
            <p className={level === "unsafe" ? "text-destructive" : "text-amber-700"}>
              {level === "unsafe" ? "⚠️ " : ""}
              {reason}
            </p>
          </div>
        </div>
      ))}
    </motion.div>
  );
};
