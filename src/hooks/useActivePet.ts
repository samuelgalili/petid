/**
 * useActivePet — Shared hook for feed components to access the active pet's data.
 * Caches in memory to avoid repeated DB calls.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ActivePet {
  name: string;
  breed: string | null;
  pet_type: string;
  weight: number | null;
  birth_date: string | null;
  ageWeeks: number | null;
  medical_conditions: string[] | null;
}

let cachedPet: ActivePet | null = null;
let cacheUserId: string | null = null;

export function useActivePet() {
  const [pet, setPet] = useState<ActivePet | null>(cachedPet);
  const [loading, setLoading] = useState(!cachedPet);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Use cache if same user
      if (cachedPet && cacheUserId === user.id) {
        setPet(cachedPet);
        setLoading(false);
        return;
      }

      const { data: pets } = await (supabase as any)
        .from("pets")
        .select("name, breed, type, weight, birth_date, medical_conditions")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(1);

      const raw = pets?.[0];
      if (raw) {
        let ageWeeks: number | null = null;
        if (raw.birth_date) {
          ageWeeks = Math.floor((Date.now() - new Date(raw.birth_date).getTime()) / (7 * 24 * 60 * 60 * 1000));
        }
        const result: ActivePet = {
          name: raw.name,
          breed: raw.breed,
          pet_type: raw.type || "dog",
          weight: raw.weight,
          birth_date: raw.birth_date,
          ageWeeks,
          medical_conditions: raw.medical_conditions,
        };
        cachedPet = result;
        cacheUserId = user.id;
        setPet(result);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return { pet, loading };
}
