/**
 * PetPreferenceContext — Global active-pet state.
 * Stores the full pet fleet, the active pet, and provides switchPet().
 * All consumers (useActivePet, BottomNav, HamburgerMenu, Shop, Feed)
 * react instantly when the active pet changes.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PetProfile {
  id: string;
  name: string;
  breed: string | null;
  pet_type: string;
  avatar_url: string | null;
  weight: number | null;
  birth_date: string | null;
  medical_conditions: string[] | null;
  theme_color: string | null; // user-assigned accent color
}

interface PetPreferenceContextType {
  /** Legacy — dog | cat | null */
  petType: "dog" | "cat" | null;
  setPetType: (type: "dog" | "cat" | null) => void;
  /** Full active pet profile */
  activePet: PetProfile | null;
  /** All non-archived pets for the user */
  pets: PetProfile[];
  /** Switch active pet by id — triggers global re-render */
  switchPet: (petId: string) => void;
  /** Loading state */
  loading: boolean;
  /** Force refresh from DB */
  refresh: () => void;
}

const PetPreferenceContext = createContext<PetPreferenceContextType | undefined>(undefined);

// Theme color palette for pets without an assigned color
const PET_COLORS = [
  "hsl(204, 100%, 48%)", // blue
  "hsl(160, 70%, 45%)",  // green
  "hsl(280, 65%, 55%)",  // purple
  "hsl(25, 90%, 55%)",   // orange
  "hsl(340, 75%, 55%)",  // pink
];

export const PetPreferenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pets, setPets] = useState<PetProfile[]>([]);
  const [activePet, setActivePet] = useState<PetProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const petType = activePet?.pet_type === "cat" ? "cat" : activePet?.pet_type === "dog" ? "dog" : null;

  const setPetType = (type: "dog" | "cat" | null) => {
    if (type) localStorage.setItem("petPreference", type);
    else localStorage.removeItem("petPreference");
  };

  const fetchPets = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("pets")
      .select("id, name, breed, type, avatar_url, weight, birth_date, medical_conditions")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at", { ascending: false });

    const list: PetProfile[] = (data || []).map((p: any, i: number) => ({
      id: p.id,
      name: p.name,
      breed: p.breed,
      pet_type: p.type || "dog",
      avatar_url: p.avatar_url,
      weight: p.weight,
      birth_date: p.birth_date,
      medical_conditions: p.medical_conditions,
      theme_color: PET_COLORS[i % PET_COLORS.length],
    }));

    setPets(list);

    // Restore last active pet from localStorage, or default to first
    const savedId = localStorage.getItem("activePetId");
    const match = list.find((p) => p.id === savedId);
    setActivePet(match || list[0] || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPets();

    // Re-fetch when auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchPets();
    });
    return () => subscription.unsubscribe();
  }, [fetchPets]);

  const switchPet = useCallback((petId: string) => {
    const pet = pets.find((p) => p.id === petId);
    if (pet) {
      setActivePet(pet);
      localStorage.setItem("activePetId", petId);
      if (pet.pet_type) {
        localStorage.setItem("petPreference", pet.pet_type);
      }

      // Cross-pet safety toast: warn if OTHER pets have medical conditions
      const sickOthers = pets.filter(
        (p) => p.id !== petId && p.medical_conditions && p.medical_conditions.length > 0
      );
      if (sickOthers.length > 0) {
        // Dispatch a custom event so any toast system can pick it up
        window.dispatchEvent(
          new CustomEvent("petid:fleet-safety", {
            detail: { sickPets: sickOthers, activePet: pet },
          })
        );
      }
    }
  }, [pets]);

  return (
    <PetPreferenceContext.Provider value={{ petType, setPetType, activePet, pets, switchPet, loading, refresh: fetchPets }}>
      {children}
    </PetPreferenceContext.Provider>
  );
};

export const usePetPreference = () => {
  const context = useContext(PetPreferenceContext);
  if (context === undefined) {
    throw new Error("usePetPreference must be used within a PetPreferenceProvider");
  }
  return context;
};
