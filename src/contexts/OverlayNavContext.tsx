import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface OverlayNavState {
  dashboardOpen: boolean;
  openDashboard: () => void;
  closeDashboard: () => void;
}

const OverlayNavContext = createContext<OverlayNavState | null>(null);

export const OverlayNavProvider = ({ children }: { children: ReactNode }) => {
  const [dashboardOpen, setDashboardOpen] = useState(false);

  const openDashboard = useCallback(() => setDashboardOpen(true), []);
  const closeDashboard = useCallback(() => setDashboardOpen(false), []);

  return (
    <OverlayNavContext.Provider value={{ dashboardOpen, openDashboard, closeDashboard }}>
      {children}
    </OverlayNavContext.Provider>
  );
};

export const useOverlayNav = () => {
  const ctx = useContext(OverlayNavContext);
  if (!ctx) throw new Error("useOverlayNav must be used within OverlayNavProvider");
  return ctx;
};
