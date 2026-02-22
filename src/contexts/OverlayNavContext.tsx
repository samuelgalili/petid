import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface OverlayNavState {
  dashboardOpen: boolean;
  openDashboard: () => void;
  closeDashboard: () => void;
  /** Public pet profile overlay */
  publicPetId: string | null;
  openPublicPet: (petId: string) => void;
  closePublicPet: () => void;
}

const OverlayNavContext = createContext<OverlayNavState | null>(null);

export const OverlayNavProvider = ({ children }: { children: ReactNode }) => {
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [publicPetId, setPublicPetId] = useState<string | null>(null);

  const openDashboard = useCallback(() => setDashboardOpen(true), []);
  const closeDashboard = useCallback(() => setDashboardOpen(false), []);
  const openPublicPet = useCallback((petId: string) => setPublicPetId(petId), []);
  const closePublicPet = useCallback(() => setPublicPetId(null), []);

  return (
    <OverlayNavContext.Provider value={{ dashboardOpen, openDashboard, closeDashboard, publicPetId, openPublicPet, closePublicPet }}>
      {children}
    </OverlayNavContext.Provider>
  );
};

export const useOverlayNav = () => {
  const ctx = useContext(OverlayNavContext);
  if (!ctx) throw new Error("useOverlayNav must be used within OverlayNavProvider");
  return ctx;
};
