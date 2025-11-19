import React, { createContext, useContext, useState, useEffect } from "react";

type PetType = "dog" | "cat" | null;

interface PetPreferenceContextType {
  petType: PetType;
  setPetType: (type: PetType) => void;
}

const PetPreferenceContext = createContext<PetPreferenceContextType | undefined>(undefined);

export const PetPreferenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [petType, setPetTypeState] = useState<PetType>(() => {
    const saved = localStorage.getItem("petPreference");
    return (saved as PetType) || null;
  });

  const setPetType = (type: PetType) => {
    setPetTypeState(type);
    if (type) {
      localStorage.setItem("petPreference", type);
    } else {
      localStorage.removeItem("petPreference");
    }
  };

  return (
    <PetPreferenceContext.Provider value={{ petType, setPetType }}>
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
