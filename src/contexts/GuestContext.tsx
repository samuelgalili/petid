import * as React from "react";

interface GuestContextType {
  isGuest: boolean;
  setGuestMode: (value: boolean) => void;
  showLoginPrompt: boolean;
  loginPromptMessage: string;
  promptLogin: (message?: string) => void;
  closeLoginPrompt: () => void;
}

const GuestContext = React.createContext<GuestContextType | undefined>(undefined);

export function GuestProvider({ children }: { children: React.ReactNode }) {
  const [isGuest, setIsGuest] = React.useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = React.useState(false);
  const [loginPromptMessage, setLoginPromptMessage] = React.useState("");

  React.useEffect(() => {
    setIsGuest(localStorage.getItem("guestMode") === "true");
  }, []);

  const setGuestMode = React.useCallback((value: boolean) => {
    setIsGuest(value);
    if (value) {
      localStorage.setItem("guestMode", "true");
    } else {
      localStorage.removeItem("guestMode");
    }
  }, []);

  const promptLogin = React.useCallback((message?: string) => {
    setLoginPromptMessage(message || "כדי להמשיך, יש להתחבר או להירשם");
    setShowLoginPrompt(true);
  }, []);

  const closeLoginPrompt = React.useCallback(() => {
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
}

export function useGuest() {
  const context = React.useContext(GuestContext);
  if (context === undefined) {
    throw new Error("useGuest must be used within a GuestProvider");
  }
  return context;
}
