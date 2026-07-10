import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import {
  getCurrentUser,
  getMyNotifications,
  getMyPets,
  markMyNotificationRead,
  sendAiChat,
  type MipoNotification,
} from "@/lib/mipoApi";

// ============= Types =============
export interface Product {
  id: string;
  name: string;
  price?: number | null;
  sale_price?: number | null;
  image_url?: string | null;
  category?: string | null;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  products?: Product[];
  showGroomingPicker?: boolean;
  showAppointmentPicker?: boolean;
  showTrainingPicker?: boolean;
  trainingSubOptions?: string[];
  showDogParkPicker?: boolean;
  showDocumentPicker?: boolean;
  showBoardingPicker?: boolean;
  showStorePicker?: boolean;
  showAdoptionTraits?: boolean;
  showAdoptionRequirements?: boolean;
  suggestions?: string[];
  botSource?: string; // which bot generated this message
}

export interface Pet {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  avatar_url: string | null;
}

// Maximum messages to send as context to the AI (saves tokens)
const MAX_CONTEXT_MESSAGES = 50;

// ============= Context =============
interface ChatContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  isTyping: boolean;
  setIsTyping: (val: boolean) => void;
  userPets: Pet[];
  selectedPet: Pet | null;
  setSelectedPet: (pet: Pet | null) => void;
  showPetSelection: boolean;
  setShowPetSelection: (val: boolean) => void;
  showCategories: boolean;
  setShowCategories: (val: boolean) => void;
  showDatePicker: boolean;
  setShowDatePicker: (val: boolean) => void;
  selectedDate: Date;
  setSelectedDate: (val: Date) => void;
  pendingDateContext: string | null;
  setPendingDateContext: (val: string | null) => void;
  userName: string | null;
  /** Returns only the last N messages for AI context (token optimization) */
  getContextMessages: () => Message[];
  /** Send a message programmatically */
  sendMessage: (content: string) => Promise<void>;
  /** Stream chat with AI */
  streamChat: (messagesToSend: Message[]) => Promise<void>;
  /** Set an intent that triggers the Scientist to open with a context-aware message */
  setIntent: (intent: string | null) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}

// ============= Provider =============
export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [userPets, setUserPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [showPetSelection, setShowPetSelection] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [pendingDateContext, setPendingDateContext] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<string | null>(null);

  // Keep a ref so streamChat always sees latest messages
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Load user pets on mount
  useEffect(() => {
    const loadPets = async () => {
      const authResult = await getCurrentUser().catch(() => null);
      const user = authResult?.user;
      const profile = authResult?.profile;
      if (!user) {
        setMessages([{
          role: "assistant",
          content: "היי! 🐾 אפשר לשאול אותי על תזונה, בריאות, קניות או מסמכים. להתחברות מלאה, היכנס/י לחשבון.",
          timestamp: new Date().toISOString(),
          suggestions: ["שאלה על תזונה", "סריקת מסמך", "חנות"],
        }]);
        return;
      }

      const fullName = profile?.full_name || user.full_name || "";
      const firstName = fullName.split(" ")[0] || user.email?.split("@")[0] || "חבר";
      setUserName(firstName);

      const pets = (await getMyPets().catch(() => [])).map((pet) => ({
        id: pet.id,
        name: pet.name,
        type: pet.type || pet.pet_type || "dog",
        breed: pet.breed || null,
        avatar_url: pet.avatar_url || null,
      }));

      if (pets && pets.length > 0) {
        setUserPets(pets);
        if (pets.length === 1) {
          setSelectedPet(pets[0]);
          
          const unreadNotifs = (await getMyNotifications({ unread: true, limit: 5 }).catch(() => ({ notifications: [] })))
            .notifications as MipoNotification[];
          
          let greeting = `היי ${firstName}! מה שלום ${pets[0].name}? 🐾\n\nאיך אוכל לעזור היום?`;
          const now = new Date().toISOString();
          const updates: string[] = [];

          if (updates.length > 0) {
            greeting = `היי ${firstName}! 🐾\n\n${updates.join("\n")}\n\nבמה נתמקד?`;
          }
          
          setMessages([{ role: "assistant", content: greeting, timestamp: now }]);

          // ─── Proactive Agent Notifications (delayed bubble) ───
          if (unreadNotifs.length > 0) {
            const NOTIF_ICON_MAP: Record<string, string> = {
              medical: "💉", insurance: "🛡️", care: "🎉", shop: "🍖",
            };
            const getNotificationTrigger = (notification: MipoNotification): string | null => {
              const trigger = notification.data?.trigger;
              return typeof trigger === "string" ? trigger : null;
            };

            // Build proactive messages grouped by urgency
            const urgentNotifs = unreadNotifs.filter(n => 
              n.type === "medical" || getNotificationTrigger(n) === "restock_alert"
            );
            const otherNotifs = unreadNotifs.filter(n => 
              n.type !== "medical" && getNotificationTrigger(n) !== "restock_alert"
            );

            const buildNotifMessage = (notifs: typeof unreadNotifs, prefix: string): string => {
              const lines = notifs.map((n) => {
                const icon = NOTIF_ICON_MAP[n.type] || "📌";
                return `${icon} ${n.message}`;
              });
              return `${prefix}\n\n${lines.join("\n")}`;
            };

            // Show urgent notifications after 1.5s delay
            if (urgentNotifs.length > 0) {
              setTimeout(() => {
                setMessages(prev => [...prev, {
                  role: "assistant",
                  content: buildNotifMessage(urgentNotifs, `${firstName}, יש כמה דברים שחשוב שתדע/י:`),
                  timestamp: new Date().toISOString(),
                  suggestions: urgentNotifs.some(n => n.type === "medical") 
                    ? ["קבע תור לוטרינר", "הצג פרטים"] 
                    : urgentNotifs.some(n => getNotificationTrigger(n) === "restock_alert")
                      ? ["הזמן מזון חדש", "הצג פרטים"]
                      : undefined,
                }]);
              }, 1500);
            }

            // Show other notifications after 3s delay (only if there are some)
            if (otherNotifs.length > 0) {
              setTimeout(() => {
                setMessages(prev => [...prev, {
                  role: "assistant",
                  content: buildNotifMessage(otherNotifs, "ועוד עדכונים:"),
                  timestamp: new Date().toISOString(),
                }]);
              }, urgentNotifs.length > 0 ? 3500 : 1500);
            }

            // Mark displayed notifications as read
            const notifIds = unreadNotifs.map(n => n.id);
            notifIds.forEach((id) => {
              markMyNotificationRead(id).catch(() => {});
            });
          }
        } else {
          setMessages([{
            role: "assistant",
            content: `היי ${firstName}! מה שלום? 🐾\n\nעל מי נדבר היום?`,
            suggestions: pets.map(p => p.name),
          }]);
        }
      } else {
        setMessages([{
          role: "assistant",
          content: `היי ${firstName}! 🐾\n\nבמה אוכל לעזור היום?`,
        }]);
      }
    };
    loadPets();
  }, []);

  // ===== Intent Processing =====
  // Check for a pending intent stored in localStorage (set before navigating to /chat)
  const setIntent = useCallback((intent: string | null) => {
    if (intent) {
      localStorage.setItem("chat_pending_intent", intent);
    } else {
      localStorage.removeItem("chat_pending_intent");
    }
    setPendingIntent(intent);
  }, []);

  // On mount, check localStorage for a pending intent
  useEffect(() => {
    const stored = localStorage.getItem("chat_pending_intent");
    if (stored) {
      setPendingIntent(stored);
      localStorage.removeItem("chat_pending_intent");
    }
  }, []);

  // Process intent once the chat is ready
  useEffect(() => {
    if (!pendingIntent || isLoading) return;
    const timer = setTimeout(() => {
      sendMessage(pendingIntent);
      setPendingIntent(null);
    }, 800);
    return () => clearTimeout(timer);
  }, [pendingIntent, isLoading, userPets]);

  /** Return only the last MAX_CONTEXT_MESSAGES for AI calls */
  const getContextMessages = useCallback((): Message[] => {
    const all = messagesRef.current;
    if (all.length <= MAX_CONTEXT_MESSAGES) return all;
    return all.slice(-MAX_CONTEXT_MESSAGES);
  }, []);

  /** Extract suggestions from AI response */
  const extractSuggestions = (content: string): string[] => {
    const match = content.match(/\[SUGGESTIONS:([^\]]+)\]/);
    if (match) {
      return match[1].split("|").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  /** Handle ACTION tags - imported logic stays in Chat.tsx for UI coupling */
  // Action tag handling is kept in Chat.tsx since it triggers UI state

  /** Stream chat with AI */
  const streamChat = useCallback(async (messagesToSend: Message[]) => {
    const fallbackAssistantMessage: Message = {
      role: "assistant",
      content: "לא הצלחתי לקבל תשובה מלאה כרגע. אפשר לנסות שוב, או לבחור פעולה כמו סריקת מסמך, צילום תמונה או שאלה על תזונה ובריאות.",
      timestamp: new Date().toISOString(),
      suggestions: ["סריקת מסמך", "צילום תמונה", "שאלה על תזונה"],
    };
    setIsTyping(true);

    const petsToSend = selectedPet
      ? [{ id: selectedPet.id, name: selectedPet.name, type: selectedPet.type, breed: selectedPet.breed }]
      : userPets.map((pet) => ({ id: pet.id, name: pet.name, type: pet.type, breed: pet.breed }));

    const userContext = {
      userName,
      selectedPetId: selectedPet?.id || null,
      pets: petsToSend,
      selectedPetName: selectedPet?.name || null,
    };

    // Only send the last N messages to save tokens
    const contextMessages = messagesToSend.length > MAX_CONTEXT_MESSAGES
      ? messagesToSend.slice(-MAX_CONTEXT_MESSAGES)
      : messagesToSend;

    try {
      const response = await sendAiChat({
        messages: contextMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        userContext,
      });

      const tagSuggestions = extractSuggestions(response.content);
      const suggestions = response.suggestions && response.suggestions.length > 0
        ? response.suggestions
        : tagSuggestions.length > 0
          ? tagSuggestions
          : undefined;

      setMessages((prev) => [...prev, {
        role: "assistant",
        content: response.content,
        timestamp: response.timestamp || new Date().toISOString(),
        suggestions,
        products: response.products,
        botSource: response.botSource || "gemini",
      }]);
    } catch (error) {
      console.error("AI chat error:", error);
      setMessages((prev) => [...prev, fallbackAssistantMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [selectedPet, userPets, userName]);

  /** Send a message programmatically */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;
    const userMessage: Message = { role: "user", content, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    try {
      await streamChat([...messagesRef.current, userMessage]);
    } catch (error) {
      console.error("Error:", error);
      setIsTyping(false);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: error instanceof Error
          ? `לא הצלחתי לשלוח את ההודעה: ${error.message}`
          : "לא הצלחתי לשלוח את ההודעה כרגע. נסה שוב בעוד רגע.",
        timestamp: new Date().toISOString(),
        suggestions: ["נסה שוב", "סריקת מסמך", "צילום תמונה"],
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, streamChat]);

  return (
    <ChatContext.Provider
      value={{
        messages, setMessages,
        input, setInput,
        isLoading, setIsLoading,
        isTyping, setIsTyping,
        userPets, selectedPet, setSelectedPet,
        showPetSelection, setShowPetSelection,
        showCategories, setShowCategories,
        showDatePicker, setShowDatePicker,
        selectedDate, setSelectedDate,
        pendingDateContext, setPendingDateContext,
        userName,
        getContextMessages,
        sendMessage,
        streamChat,
        setIntent,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
