import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_BUSINESS_ID =
  import.meta.env.VITE_DEFAULT_BUSINESS_ID || "cf941cc4-e1d1-4d7c-8122-a5df81a1e53c";

export const DEFAULT_BUSINESS_MISSING_MESSAGE =
  "לא מוגדר עסק ברירת מחדל לחנות. יש ליצור פרופיל עסקי לפני הוספת מוצרים.";

export type ProductPetType = "dog" | "cat" | "other" | "all";

export const normalizeProductPetType = (petType?: string | null): ProductPetType | null => {
  if (!petType) return null;
  if (petType === "both") return "all";
  if (["dog", "cat", "other", "all"].includes(petType)) return petType as ProductPetType;
  return "other";
};

export const assertDefaultBusinessProfileExists = async (businessId = DEFAULT_BUSINESS_ID) => {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("id")
    .eq("id", businessId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(DEFAULT_BUSINESS_MISSING_MESSAGE);
  }

  return businessId;
};
