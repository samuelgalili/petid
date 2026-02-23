/**
 * useChatIntent — Navigate to chat with a context-aware intent.
 * Stores intent in localStorage before navigation so ChatProvider picks it up on mount.
 * 
 * Usage:
 *   const { navigateWithIntent } = useChatIntent();
 *   navigateWithIntent("אני מחפש אפשרויות ביטוח"); // navigates to /chat with intent
 */
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

export function useChatIntent() {
  const navigate = useNavigate();

  const navigateWithIntent = useCallback((intent: string) => {
    localStorage.setItem("chat_pending_intent", intent);
    navigate("/chat");
  }, [navigate]);

  return { navigateWithIntent };
}
