import { createContext, useContext, useState, ReactNode } from "react";

interface GuestContextType {
  isGuest: boolean;
  setGuestMode: (value: boolean) => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const GuestProvider = ({ children }: { children: ReactNode }) => {
  const [isGuest, setIsGuest] = useState(() => {
    return localStorage.getItem("guestMode") === "true";
  });

  const setGuestMode = (value: boolean) => {
    console.log("setGuestMode called with:", value);
    setIsGuest(value);
    if (value) {
      localStorage.setItem("guestMode", "true");
      console.log("Guest mode saved to localStorage");
    } else {
      localStorage.removeItem("guestMode");
      console.log("Guest mode removed from localStorage");
    }
  };

  return (
    <GuestContext.Provider value={{ isGuest, setGuestMode }}>
      {children}
    </GuestContext.Provider>
  );
};

export const useGuest = () => {
  const context = useContext(GuestContext);
  if (context === undefined) {
    throw new Error("useGuest must be used within a GuestProvider");
  }
  return context;
};
