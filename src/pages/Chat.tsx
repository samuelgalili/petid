import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Send, ChevronRight, Sparkles, Heart, Image, Mic, Smile } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Pet {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  avatar_url: string | null;
}

// Helper function to fetch pets - outside component to avoid type issues
async function fetchUserPets(userId: string): Promise<Pet[]> {
  // Using explicit any to avoid deep type instantiation issues with Supabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (supabase as any).from("pets").select("id, name, type, breed, avatar_url").eq("user_id", userId);
  return (result.data || []) as Pet[];
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [userPets, setUserPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [showPetSelection, setShowPetSelection] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [userName, setUserName] = useState<string | null>(null);

  // Fetch user's pets on mount
  useEffect(() => {
    const loadPets = async () => {
      const authResult = await supabase.auth.getUser();
      const user = authResult.data?.user;
      if (!user) return;

      // Fetch user profile for name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      
      // Extract first name only from full name
      const fullName = profile?.full_name || "";
      const firstName = fullName.split(" ")[0] || user.email?.split('@')[0] || "חבר";
      setUserName(firstName);

      const pets = await fetchUserPets(user.id);

      if (pets && pets.length > 0) {
        setUserPets(pets);
        if (pets.length === 1) {
          setSelectedPet(pets[0]);
          setShowCategories(true);
          setMessages([{
            role: "assistant",
            content: `היי ${firstName}, איזה כיף לראות אותך! 🐾\n\nאיך אוכל לעזור היום עם ${pets[0].name}?`
          }]);
        } else {
          setShowPetSelection(true);
          setMessages([{
            role: "assistant",
            content: `היי ${firstName}, איזה כיף לראות אותך! 🐾\n\nאני רואה שיש לך כמה חיות מחמד.\nעל מי נדבר היום?`
          }]);
        }
      } else {
        setShowCategories(true);
        setMessages([{
          role: "assistant",
          content: `היי ${firstName}, איזה כיף לראות אותך! 🐾\n\nאני העוזר החכם של PetID.\nבמה אוכל לעזור היום?`
        }]);
      }
    };
    loadPets();
  }, []);

  const handlePetSelect = (pet: Pet) => {
    setSelectedPet(pet);
    setShowPetSelection(false);
    setShowCategories(true);
    setMessages(prev => [
      ...prev,
      { role: "user", content: pet.name },
      { role: "assistant", content: `מעולה! איך אוכל לעזור היום עם ${pet.name}?` }
    ]);
  };

  // Category buttons for quick selection
  const categoryButtons = [
    { id: "insurance", label: "ביטוח", icon: "🛡️" },
    { id: "grooming", label: "טיפוח", icon: "✂️" },
    { id: "training", label: "אילוף", icon: "🎓" },
    { id: "documents", label: "מסמכים", icon: "📂" },
    { id: "boarding", label: "פנסיון", icon: "🏨" },
    { id: "delivery", label: "משלוחים", icon: "📦" },
    { id: "breed", label: "מידע על הגזע", icon: "🐕" },
    { id: "rehoming", label: "למסירה", icon: "🏠" },
  ];

  const handleCategorySelect = async (category: { id: string; label: string; icon: string }) => {
    setShowCategories(false);
    const userMessage: Message = { role: "user", content: `${category.icon} ${category.label}` };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      await streamChat([...messages, userMessage]);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "שגיאה",
        description: error instanceof Error ? error.message : "משהו השתבש",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const streamChat = async (messagesToSend: Message[]) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
    setIsTyping(true);
    
    // Build user context with pet data - send only selected pet or all if none selected
    const petsToSend = selectedPet 
      ? [{ id: selectedPet.id, name: selectedPet.name, type: selectedPet.type, breed: selectedPet.breed }]
      : userPets.map(pet => ({ id: pet.id, name: pet.name, type: pet.type, breed: pet.breed }));
    
    const userContext = {
      userName: userName,
      pets: petsToSend,
      selectedPetName: selectedPet?.name || null
    };
    
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: messagesToSend, userContext }),
    });

    if (!resp.ok || !resp.body) {
      setIsTyping(false);
      if (resp.status === 429) {
        throw new Error("חרגת ממכסת הבקשות, אנא נסה שוב מאוחר יותר");
      }
      if (resp.status === 402) {
        throw new Error("נדרש תשלום, אנא הוסף כספים לחשבון שלך");
      }
      throw new Error("שגיאה בתקשורת עם השרת");
    }

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
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            setIsTyping(false);
            assistantContent += content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
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
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {}
      }
    }
    setIsTyping(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      await streamChat([...messages, userMessage]);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "שגיאה",
        description: error instanceof Error ? error.message : "משהו השתבש",
        variant: "destructive",
      });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const exampleQuestions = [
    { icon: "🐕", text: "איך לטפל בכלב?" },
    { icon: "🐈", text: "מה לתת לחתול?" },
    { icon: "🎓", text: "איך לאלף גור?" },
    { icon: "🏥", text: "מתי לפנות לווטרינר?" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pb-20" dir="rtl">
      {/* Modern Glassmorphism Header */}
      <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-foreground" />
          </button>
          
          <div className="flex items-center gap-3">
            {/* AI Avatar with animated gradient ring */}
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-petid-blue via-petid-gold to-petid-teal p-[2.5px] animate-pulse-slow">
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center shadow-inner">
                  <Sparkles className="w-5 h-5 text-petid-gold" />
                </div>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-card shadow-lg" />
            </div>
            <div className="text-right">
              <h1 className="text-base font-bold text-foreground font-heebo">PetID AI</h1>
              <p className="text-xs text-emerald-500 font-heebo flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                פעיל עכשיו
              </p>
            </div>
          </div>
          
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-petid-blue/10 to-petid-gold/10">
            <Heart className="w-5 h-5 text-petid-gold" />
          </div>
        </div>
      </div>

      <div className="flex flex-col h-[calc(100vh-140px)]">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <AnimatePresence>
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full py-8"
              >
                {/* AI Profile Card - Enhanced */}
                <div className="relative mb-6">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-petid-blue via-petid-gold to-petid-teal p-[3px] shadow-xl">
                    <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-petid-gold" />
                    </div>
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 rounded-full shadow-lg">
                    <span className="text-[10px] text-white font-bold">AI</span>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground font-heebo mb-1">PetID AI</h2>
                <p className="text-sm text-muted-foreground font-heebo mb-8">העוזר החכם שלך לכל מה שקשור לחיות המחמד</p>
                
                {/* Example Questions Grid - Enhanced */}
                <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                  {exampleQuestions.map((q, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setInput(q.text)}
                      className="flex items-center gap-3 px-4 py-3.5 bg-card hover:bg-card/80 rounded-2xl transition-all text-right border border-border/50 shadow-sm hover:shadow-md"
                    >
                      <span className="text-2xl">{q.icon}</span>
                      <span className="text-sm text-foreground font-heebo font-medium">{q.text}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex mb-4 ${message.role === "user" ? "justify-start" : "justify-end"}`}
              >
                <div className={`flex items-end gap-2.5 max-w-[85%] ${message.role === "user" ? "flex-row" : "flex-row-reverse"}`}>
                  {/* Avatar - Enhanced */}
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-petid-blue via-petid-gold to-petid-teal p-[2px] shadow-md">
                      <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-petid-gold" />
                      </div>
                    </div>
                  )}
                  
                  {/* Message Bubble - Enhanced */}
                  <div
                    className={`px-4 py-3 font-heebo shadow-sm ${
                      message.role === "user"
                        ? "bg-gradient-to-br from-petid-blue to-petid-blue/90 text-white rounded-2xl rounded-br-md"
                        : "bg-card border border-border/50 text-foreground rounded-2xl rounded-bl-md"
                    }`}
                  >
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Pet Selection Buttons - Circle Profile Style */}
            {showPetSelection && userPets.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-4 justify-center mb-4 px-4"
              >
                {userPets.map((pet, index) => (
                  <motion.button
                    key={pet.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePetSelect(pet)}
                    className="flex flex-col items-center gap-2"
                  >
                    {/* Pet Avatar Circle with Gradient Border */}
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-petid-blue via-petid-gold to-petid-teal p-[2.5px] shadow-lg">
                      <div className="w-full h-full rounded-full overflow-hidden bg-card">
                        {pet.avatar_url ? (
                          <img 
                            src={pet.avatar_url} 
                            alt={pet.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <span className="text-2xl">
                              {pet.type === 'dog' ? '🐕' : pet.type === 'cat' ? '🐈' : '🐾'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Pet Name */}
                    <span className="text-xs font-heebo font-medium text-foreground">{pet.name}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* Category Quick Buttons - Enhanced Grid */}
            {showCategories && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 px-2"
              >
                <p className="text-xs text-muted-foreground text-center mb-3 font-heebo">במה אוכל לעזור?</p>
                <div className="grid grid-cols-4 gap-2">
                  {categoryButtons.map((cat, index) => (
                    <motion.button
                      key={cat.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleCategorySelect(cat)}
                      className="flex flex-col items-center gap-1.5 p-3 bg-card hover:bg-card/80 rounded-2xl transition-all border border-border/50 shadow-sm hover:shadow-md"
                    >
                      <span className="text-2xl">{cat.icon}</span>
                      <span className="text-[10px] text-foreground font-heebo font-medium leading-tight text-center">{cat.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Typing Indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end mb-3"
              >
                <div className="flex items-end gap-2 flex-row-reverse">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-instagram p-[1.5px]">
                    <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                      <span className="text-xs">🐾</span>
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-secondary rounded-3xl rounded-bl-lg">
                    <div className="flex gap-1">
                      <motion.div
                        className="w-2 h-2 bg-muted rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-muted rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-muted rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Enhanced Input Area */}
        <div className="px-4 py-3 bg-card/80 backdrop-blur-xl border-t border-border/50">
          <div className="flex items-center gap-3">
            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <button className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-petid-blue hover:bg-muted/50 rounded-full transition-all">
                <Image className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-petid-blue hover:bg-muted/50 rounded-full transition-all">
                <Mic className="w-5 h-5" />
              </button>
            </div>
            
            {/* Input Field - Enhanced */}
            <div className="flex-1 flex items-center bg-muted/50 rounded-full border border-border/50 px-4 py-2.5 focus-within:border-petid-blue/50 focus-within:bg-background transition-all">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="כתוב הודעה..."
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-[15px] placeholder:text-muted-foreground p-0 h-auto font-heebo"
                disabled={isLoading}
                dir="rtl"
              />
              <button className="mr-2 text-muted-foreground hover:text-foreground transition-colors">
                <Smile className="w-5 h-5" />
              </button>
            </div>
            
            {/* Send Button - Enhanced */}
            {input.trim() ? (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSend}
                disabled={isLoading}
                className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-petid-blue via-petid-teal to-petid-gold rounded-full text-white disabled:opacity-50 shadow-lg hover:shadow-xl transition-shadow"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            ) : (
              <button className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-petid-gold hover:bg-muted/50 rounded-full transition-all">
                <Heart className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Chat;
