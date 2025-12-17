import * as React from "react";

type PetType = "dog" | "cat" | null;

interface PetPreferenceContextType {
  petType: PetType;
  setPetType: (type: PetType) => void;
}

const PetPreferenceContext = React.createContext<PetPreferenceContextType | undefined>(undefined);

export function PetPreferenceProvider({ children }: { children: React.ReactNode }) {
  const [petType, setPetTypeState] = React.useState<PetType>(null);

  React.useEffect(() => {
    const saved = localStorage.getItem("petPreference");
    if (saved) {
      setPetTypeState(saved as PetType);
    }
  }, []);

  const setPetType = React.useCallback((type: PetType) => {
    setPetTypeState(type);
    if (type) {
      localStorage.setItem("petPreference", type);
    } else {
      localStorage.removeItem("petPreference");
    }
  }, []);

  return (
    <PetPreferenceContext.Provider value={{ petType, setPetType }}>
      {children}
    </PetPreferenceContext.Provider>
  );
}

export function usePetPreference() {
  const context = React.useContext(PetPreferenceContext);
  if (context === undefined) {
    throw new Error("usePetPreference must be used within a PetPreferenceProvider");
  }
  return context;
}
