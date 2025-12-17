import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface GuestContextType {
  isGuest: boolean;
  setGuestMode: (value: boolean) => void;
  showLoginPrompt: boolean;
  loginPromptMessage: string;
  promptLogin: (message?: string) => void;
  closeLoginPrompt: () => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const GuestProvider = ({ children }: { children: ReactNode }) => {
  const [isGuest, setIsGuest] = useState(() => {
    return localStorage.getItem("guestMode") === "true";
  });
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState("");

  const setGuestMode = (value: boolean) => {
    setIsGuest(value);
    if (value) {
      localStorage.setItem("guestMode", "true");
    } else {
      localStorage.removeItem("guestMode");
    }
  };

  const promptLogin = useCallback((message?: string) => {
    setLoginPromptMessage(message || "כדי להמשיך, יש להתחבר או להירשם");
    setShowLoginPrompt(true);
  }, []);

  const closeLoginPrompt = useCallback(() => {
    setShowLoginPrompt(false);
    setLoginPromptMessage("");
  }, []);

  return (
    <GuestContext.Provider value={{ 
      isGuest, 
      setGuestMode, 
      showLoginPrompt, 
      loginPromptMessage,
      promptLogin, 
      closeLoginPrompt 
    }}>
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
