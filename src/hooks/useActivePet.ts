/**
 * useActivePet — Reads from PetPreferenceContext for global pet state.
 * Returns the same interface as before so all 18+ consumers work unchanged.
 */

import { useMemo } from "react";
import { usePetPreference, type PetProfile } from "@/contexts/PetPreferenceContext";

export interface ActivePet {
  id?: string;
  name: string;
  breed: string | null;
  pet_type: string;
  weight: number | null;
  birth_date: string | null;
  ageWeeks: number | null;
  medical_conditions: string[] | null;
  avatar_url?: string | null;
}

export function useActivePet() {
  const { activePet, loading } = usePetPreference();

  const pet = useMemo<ActivePet | null>(() => {
    if (!activePet) return null;
    let ageWeeks: number | null = null;
    if (activePet.birth_date) {
      ageWeeks = Math.floor(
        (Date.now() - new Date(activePet.birth_date).getTime()) / (7 * 24 * 60 * 60 * 1000)
      );
    }
    return {
      id: activePet.id,
      name: activePet.name,
      breed: activePet.breed,
      pet_type: activePet.pet_type,
      weight: activePet.weight,
      birth_date: activePet.birth_date,
      ageWeeks,
      medical_conditions: activePet.medical_conditions,
      avatar_url: activePet.avatar_url,
    };
  }, [activePet]);

  return { pet, loading };
}
