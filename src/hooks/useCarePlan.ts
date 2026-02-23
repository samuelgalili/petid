/**
 * useCarePlan — Manage pet care plan items with realtime sync
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { haptic } from "@/lib/haptics";

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

export function useCarePlan(petId: string | undefined) {
  const { user } = useAuth();
  const [items, setItems] = useState<CarePlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);

  // Fetch care plan items
  useEffect(() => {
    if (!user?.id || !petId) return;

    const fetch = async () => {
      const { data } = await (supabase as any)
        .from("pet_care_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("pet_id", petId)
        .order("created_at", { ascending: false });

      if (data) {
        setItems(data);
        setTotalPoints(data.reduce((sum: number, i: any) => sum + (i.points_awarded || 0), 0));
      }
      setLoading(false);
    };
    fetch();

    // Realtime subscription
    const channel = supabase
      .channel(`care-plan-${petId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pet_care_plans",
          filter: `pet_id=eq.${petId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setItems((prev) => [payload.new as CarePlanItem, ...prev]);
            setTotalPoints((prev) => prev + ((payload.new as any).points_awarded || 0));
          } else if (payload.eventType === "DELETE") {
            setItems((prev) => prev.filter((i) => i.id !== (payload.old as any).id));
            setTotalPoints((prev) => prev - ((payload.old as any).points_awarded || 0));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, petId]);

  const addToCarePlan = useCallback(
    async (product: {
      id: string;
      name: string;
      image?: string;
      price?: number;
      safetyScore?: number | null;
      category?: string;
    }) => {
      if (!user?.id || !petId) return;

      const isApproved = (product.safetyScore ?? 0) >= 8;
      const points = isApproved ? 8 : 3;

      const { error } = await (supabase as any)
        .from("pet_care_plans")
        .insert({
          user_id: user.id,
          pet_id: petId,
          product_id: product.id,
          product_name: product.name,
          product_image: product.image || null,
          product_price: product.price || null,
          safety_score: product.safetyScore ?? null,
          is_scientist_approved: isApproved,
          category: product.category || null,
          points_awarded: points,
        });

      if (error) {
        toast({ title: "שגיאה בהוספה לתוכנית", variant: "destructive" });
        return;
      }

      haptic("success");

      // Toast with bone icon
      toast({
        title: "✨🦴 נוסף לתוכנית הטיפול!",
        description: isApproved
          ? `+${points} נקודות — מאושר על ידי המדען`
          : `+${points} נקודות`,
        duration: 2500,
      });

      // Confetti for approved products
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

      // Dispatch event for dashboard to listen
      window.dispatchEvent(
        new CustomEvent("care-plan-updated", {
          detail: { petId, productName: product.name, points, isApproved },
        })
      );
    },
    [user?.id, petId]
  );

  const hasProduct = useCallback(
    (productId: string) => items.some((i) => i.product_id === productId),
    [items]
  );

  const foodAdded = items.some((i) => i.category === "food" || i.is_scientist_approved);

  return { items, loading, totalPoints, addToCarePlan, hasProduct, foodAdded };
}
