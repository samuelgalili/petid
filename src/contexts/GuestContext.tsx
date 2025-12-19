import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";

interface GuestContextType {
  isGuest: boolean;
  setGuestMode: (value: boolean) => void;
  showLoginPrompt: boolean;
  loginPromptMessage: string;
  promptLogin: (message?: string) => void;
  closeLoginPrompt: () => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

// Guest session expires after 24 hours
const GUEST_SESSION_DURATION = 24 * 60 * 60 * 1000;

const validateGuestSession = (): boolean => {
  const guestToken = localStorage.getItem("guestMode");
  const timestamp = localStorage.getItem("guestModeTimestamp");
  
  if (guestToken !== "true") return false;
  
  if (!timestamp) {
    // Legacy guest mode without timestamp - invalidate
    localStorage.removeItem("guestMode");
    return false;
  }
  
  const elapsed = Date.now() - parseInt(timestamp, 10);
  if (elapsed > GUEST_SESSION_DURATION) {
    // Session expired
    localStorage.removeItem("guestMode");
    localStorage.removeItem("guestModeTimestamp");
    return false;
  }
  
  return true;
};

export const GuestProvider = ({ children }: { children: ReactNode }) => {
  const [isGuest, setIsGuest] = useState(() => validateGuestSession());
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState("");

  // Periodically validate guest session
  useEffect(() => {
    if (!isGuest) return;
    
    const interval = setInterval(() => {
      if (!validateGuestSession()) {
        setIsGuest(false);
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [isGuest]);

  const setGuestMode = (value: boolean) => {
    setIsGuest(value);
    if (value) {
      localStorage.setItem("guestMode", "true");
      localStorage.setItem("guestModeTimestamp", Date.now().toString());
    } else {
      localStorage.removeItem("guestMode");
      localStorage.removeItem("guestModeTimestamp");
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
