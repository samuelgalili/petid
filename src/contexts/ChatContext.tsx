import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  products?: Product[];
  insuranceData?: {
    petName: string;
    petType: string;
    breed: string | null;
    ageYears: number | null;
    petId?: string | null;
    healthAnswer1?: string;
    healthAnswer2?: string;
  };
  insuranceCallback?: {
    petName: string;
    petType: string;
    breed: string | null;
    ageYears: number | null;
    petId?: string | null;
    healthIssue?: string;
  };
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
}

export interface Pet {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  avatar_url: string | null;
}

// Maximum messages to send as context to the AI (saves tokens)
const MAX_CONTEXT_MESSAGES = 8;

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
  showInsuranceLoading: boolean;
  setShowInsuranceLoading: (val: boolean) => void;
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
}

const ChatContext = createContext<ChatContextType | null>(null);

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}

// Helper function to fetch pets
async function fetchUserPets(userId: string): Promise<Pet[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (supabase as any).from("pets").select("id, name, type, breed, avatar_url").eq("user_id", userId);
  return (result.data || []) as Pet[];
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
  const [showInsuranceLoading, setShowInsuranceLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [pendingDateContext, setPendingDateContext] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Keep a ref so streamChat always sees latest messages
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Load user pets on mount
  useEffect(() => {
    const loadPets = async () => {
      const authResult = await supabase.auth.getUser();
      const user = authResult.data?.user;
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const fullName = profile?.full_name || "";
      const firstName = fullName.split(" ")[0] || user.email?.split("@")[0] || "חבר";
      setUserName(firstName);

      const pets = await fetchUserPets(user.id);

      if (pets && pets.length > 0) {
        setUserPets(pets);
        if (pets.length === 1) {
          setSelectedPet(pets[0]);
          setShowCategories(true);
          setMessages([{
            role: "assistant",
            content: `היי ${firstName}, איזה כיף לראות אותך! 🐾\n\nאיך אוכל לעזור היום עם ${pets[0].name}?`,
          }]);
        } else {
          // Multiple pets — ask via chat with pet name suggestions
          setMessages([{
            role: "assistant",
            content: `היי ${firstName}, איזה כיף לראות אותך! 🐾\n\nאני רואה שיש לך כמה חיות מחמד.\nעל מי נדבר היום?`,
            suggestions: pets.map(p => p.name),
          }]);
        }
      } else {
        setShowCategories(true);
        setMessages([{
          role: "assistant",
          content: `היי ${firstName}, איזה כיף לראות אותך! 🐾\n\nאני העוזר החכם של PetID.\nבמה אוכל לעזור היום?`,
        }]);
      }
    };
    loadPets();
  }, []);

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
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
    setIsTyping(true);

    const petsToSend = selectedPet
      ? [{ id: selectedPet.id, name: selectedPet.name, type: selectedPet.type, breed: selectedPet.breed }]
      : userPets.map((pet) => ({ id: pet.id, name: pet.name, type: pet.type, breed: pet.breed }));

    const userContext = {
      userName,
      pets: petsToSend,
      selectedPetName: selectedPet?.name || null,
    };

    // Only send the last N messages to save tokens
    const contextMessages = messagesToSend.length > MAX_CONTEXT_MESSAGES
      ? messagesToSend.slice(-MAX_CONTEXT_MESSAGES)
      : messagesToSend;

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: contextMessages, userContext }),
    });

    if (!resp.ok || !resp.body) {
      setIsTyping(false);
      if (resp.status === 429) throw new Error("חרגת ממכסת הבקשות, אנא נסה שוב מאוחר יותר");
      if (resp.status === 402) throw new Error("נדרש תשלום, אנא הוסף כספים לחשבון שלך");
      throw new Error("שגיאה בתקשורת עם השרת");
    }

    const contentType = resp.headers.get("content-type") || "";

    // Handle non-streaming JSON response (product intents)
    if (contentType.includes("application/json")) {
      setIsTyping(false);
      const json = await resp.json();
      const content = json.content || (json.role === "assistant" ? json.content : "");

      let products: Product[] = [];
      const productsHeader = resp.headers.get("X-Products-Data");
      if (productsHeader) {
        try { products = JSON.parse(decodeURIComponent(productsHeader)); } catch { /* ignore */ }
      }

      const assistantMessage: Message = { role: "assistant", content, products };
      setMessages((prev) => [...prev, assistantMessage]);
      return;
    }

    // Streaming response
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;
    let assistantContent = "";

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") { streamDone = true; break; }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            setIsTyping(false);
            assistantContent += content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch { /* ignore */ }
      }
    }
    setIsTyping(false);

    // Extract suggestions and add to last assistant message
    const suggestions = extractSuggestions(assistantContent);
    if (suggestions.length > 0) {
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (updated[lastIdx]?.role === "assistant") {
          updated[lastIdx] = { ...updated[lastIdx], suggestions };
        }
        return updated;
      });
    }
  }, [selectedPet, userPets, userName]);

  /** Send a message programmatically */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;
    const userMessage: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    try {
      await streamChat([...messagesRef.current, userMessage]);
    } catch (error) {
      console.error("Error:", error);
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
        showInsuranceLoading, setShowInsuranceLoading,
        selectedDate, setSelectedDate,
        pendingDateContext, setPendingDateContext,
        userName,
        getContextMessages,
        sendMessage,
        streamChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
