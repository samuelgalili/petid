import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Send, ChevronRight, Sparkles, Heart, Image, Mic, Smile } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const streamChat = async (messages: Message[]) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
    setIsTyping(true);
    
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ messages }),
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
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      {/* Instagram-style Header */}
      <div className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center"
          >
            <ChevronRight className="w-6 h-6 text-foreground" />
          </button>
          
          <div className="flex items-center gap-3">
            {/* AI Avatar with Instagram gradient ring */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-[2px]">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <span className="text-lg">🐾</span>
                </div>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <div className="text-right">
              <h1 className="text-base font-bold text-foreground font-jakarta">Petid AI</h1>
              <p className="text-xs text-success font-jakarta">פעיל עכשיו</p>
            </div>
          </div>
          
          <div className="w-10 h-10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#DD2A7B]" />
          </div>
        </div>
      </div>

      <div className="flex flex-col h-[calc(100vh-140px)]">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <AnimatePresence>
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full py-8"
              >
                {/* AI Profile Card */}
                <div className="w-24 h-24 rounded-full bg-gradient-instagram p-[3px] mb-4">
                  <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                    <span className="text-4xl">🐾</span>
                  </div>
                </div>
                <h2 className="text-xl font-bold text-foreground font-jakarta mb-1">Petid AI</h2>
                <p className="text-sm text-muted-foreground font-jakarta mb-6">העוזר החכם לבעלי חיות מחמד</p>
                
                {/* Example Questions Grid */}
                <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                  {exampleQuestions.map((q, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setInput(q.text)}
                      className="flex items-center gap-2 px-4 py-3 bg-secondary hover:bg-secondary/80 rounded-2xl transition-colors text-right"
                    >
                      <span className="text-xl">{q.icon}</span>
                      <span className="text-sm text-foreground font-jakarta">{q.text}</span>
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
                className={`flex mb-3 ${message.role === "user" ? "justify-start" : "justify-end"}`}
              >
                <div className={`flex items-end gap-2 max-w-[80%] ${message.role === "user" ? "flex-row" : "flex-row-reverse"}`}>
                  {/* Avatar */}
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-instagram p-[1.5px]">
                      <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                        <span className="text-xs">🐾</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Message Bubble */}
                  <div
                    className={`px-4 py-2.5 rounded-3xl ${
                      message.role === "user"
                        ? "bg-gradient-instagram text-white rounded-br-lg"
                        : "bg-secondary text-foreground rounded-bl-lg"
                    }`}
                  >
                    <p className="text-[15px] leading-relaxed font-jakarta whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}

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

        {/* Instagram-style Input Area */}
        <div className="px-4 py-3 bg-card border-t border-border">
          <div className="flex items-center gap-2">
            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <button className="w-9 h-9 flex items-center justify-center text-instagram-blue hover:bg-secondary rounded-full transition-colors">
                <Image className="w-5 h-5" />
              </button>
              <button className="w-9 h-9 flex items-center justify-center text-instagram-blue hover:bg-secondary rounded-full transition-colors">
                <Mic className="w-5 h-5" />
              </button>
            </div>
            
            {/* Input Field */}
            <div className="flex-1 flex items-center bg-secondary rounded-full border border-border px-4 py-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="כתוב הודעה..."
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-[15px] placeholder:text-muted-foreground p-0 h-auto font-jakarta"
                disabled={isLoading}
                dir="rtl"
              />
              <button className="mr-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Smile className="w-5 h-5" />
              </button>
            </div>
            
            {/* Send Button */}
            {input.trim() ? (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={handleSend}
                disabled={isLoading}
                className="w-9 h-9 flex items-center justify-center bg-gradient-to-r from-[#405DE6] via-[#5851DB] to-[#833AB4] rounded-full text-white disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            ) : (
              <button className="w-9 h-9 flex items-center justify-center text-[#ED4956] hover:bg-gray-50 rounded-full transition-colors">
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
