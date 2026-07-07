import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { haptic } from "@/lib/haptics";
import { createClientId } from "@/lib/randomId";

export interface CarePlanItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  product_price: number | null;
  safety_score: number | null;
  is_scientist_approved: boolean;
  category: string | null;
  points_awarded: number;
  created_at: string;
}

const storageKey = (petId: string) => `mipo-care-plan:${petId}`;

const readItems = (petId: string): CarePlanItem[] => {
  try {
    return JSON.parse(localStorage.getItem(storageKey(petId)) || "[]") as CarePlanItem[];
  } catch {
    return [];
  }
};

const writeItems = (petId: string, items: CarePlanItem[]) => {
  try {
    localStorage.setItem(storageKey(petId), JSON.stringify(items));
  } catch {
    // Local care-plan persistence is best-effort.
  }
};

export function useCarePlan(petId: string | undefined) {
  const [items, setItems] = useState<CarePlanItem[]>([]);

  useEffect(() => {
    setItems(petId ? readItems(petId) : []);
  }, [petId]);

  const addToCarePlan = useCallback(
    async (product: {
      id: string;
      name: string;
      image?: string;
      price?: number;
      safetyScore?: number | null;
      category?: string;
    }) => {
      if (!petId) return;

      const isApproved = (product.safetyScore ?? 0) >= 8;
      const points = isApproved ? 8 : 3;
      const nextItem: CarePlanItem = {
        id: createClientId("care"),
        product_id: product.id,
        product_name: product.name,
        product_image: product.image || null,
        product_price: product.price || null,
        safety_score: product.safetyScore ?? null,
        is_scientist_approved: isApproved,
        category: product.category || null,
        points_awarded: points,
        created_at: new Date().toISOString(),
      };

      setItems((current) => {
        if (current.some((item) => item.product_id === product.id)) return current;
        const next = [nextItem, ...current];
        writeItems(petId, next);
        return next;
      });

      haptic("success");
      toast({
        title: "✨🦴 נוסף לתוכנית הטיפול!",
        description: isApproved ? `+${points} נקודות — מאושר על ידי המומחה` : `+${points} נקודות`,
        duration: 2500,
      });

      if (isApproved) {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.7 },
          colors: ["hsl(45,93%,58%)", "hsl(var(--primary))", "hsl(330,60%,55%)"],
          ticks: 60,
          shapes: ["circle"],
        });
      }

      window.dispatchEvent(
        new CustomEvent("care-plan-updated", {
          detail: { petId, productName: product.name, points, isApproved },
        }),
      );
      window.dispatchEvent(
        new CustomEvent("care-plan-game-trigger", {
          detail: { points, conditionType: "care_plan_items", currentValue: items.length + 1 },
        }),
      );
    },
    [items.length, petId],
  );

  const hasProduct = useCallback(
    (productId: string) => items.some((item) => item.product_id === productId),
    [items],
  );

  const totalPoints = useMemo(
    () => items.reduce((sum, item) => sum + (item.points_awarded || 0), 0),
    [items],
  );
  const foodAdded = items.some((item) => item.category === "food" || item.is_scientist_approved);

  return { items, loading: false, totalPoints, addToCarePlan, hasProduct, foodAdded };
}
