import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Red flag ingredients that trigger pending_review
const RED_FLAG_INGREDIENTS = [
  "BHA", "BHT", "ethoxyquin", "propylene glycol",
  "sodium nitrite", "sodium nitrate", "menadione",
  "artificial color", "artificial flavour", "artificial flavor",
  "by-product", "by product", "meat meal",
  "corn syrup", "MSG", "TBHQ",
];

export interface CurationResult {
  status: "auto_published" | "pending_review" | "draft";
  reason: string;
}

/**
 * Determines the curation status based on SafeScore and ingredients.
 * - Score >= 7 → auto_published
 * - Score < 5 OR red flags detected → pending_review
 * - Otherwise → draft
 */
export function determineCurationStatus(
  safetyScore: number | null,
  ingredients: string | null
): CurationResult {
  const hasRedFlags = ingredients
    ? RED_FLAG_INGREDIENTS.some((flag) =>
        ingredients.toLowerCase().includes(flag.toLowerCase())
      )
    : false;

  if ((safetyScore !== null && safetyScore < 5) || hasRedFlags) {
    const reasons: string[] = [];
    if (safetyScore !== null && safetyScore < 5) reasons.push(`SafeScore נמוך (${safetyScore})`);
    if (hasRedFlags) reasons.push("זוהו רכיבים בעייתיים (Red Flags)");
    return { status: "pending_review", reason: reasons.join(" + ") };
  }

  if (safetyScore !== null && safetyScore >= 7) {
    return { status: "auto_published", reason: `SafeScore גבוה (${safetyScore})` };
  }

  return { status: "draft", reason: "ללא ציון SafeScore מספיק" };
}

/**
 * Hook for admin to approve/reject products in the review queue.
 */
export function useProductCurationActions() {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: async ({ productId, notes }: { productId: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("business_products")
        .update({
          curation_status: "approved",
          curation_reviewed_at: new Date().toISOString(),
          curation_reviewed_by: user?.id || null,
          curation_notes: notes || "אושר ע״י אדמין",
        } as any)
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      toast.success("המוצר אושר בהצלחה");
    },
    onError: () => toast.error("שגיאה באישור המוצר"),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ productId, notes }: { productId: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("business_products")
        .update({
          curation_status: "rejected",
          curation_reviewed_at: new Date().toISOString(),
          curation_reviewed_by: user?.id || null,
          curation_notes: notes || "נדחה ע״י אדמין",
        } as any)
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      toast.success("המוצר נדחה");
    },
    onError: () => toast.error("שגיאה בדחיית המוצר"),
  });

  return { approveMutation, rejectMutation };
}
