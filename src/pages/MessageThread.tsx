import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ChevronRight, Phone, Video, Info, Heart, Image, Mic, Smile, Sparkles, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isYesterday } from "date-fns";
import { he } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

// AI Support ID - special identifier for AI chat
const AI_SUPPORT_ID = "ai-support";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
}

interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function MessageThread() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Check if this is an AI chat
  const isAIChat = userId === AI_SUPPORT_ID;

  useEffect(() => {
    if (!user || !userId) return;

    if (isAIChat) {
      // For AI chat, set up virtual profile and load from localStorage
      setOtherUser({
        id: AI_SUPPORT_ID,
        full_name: "נציג שירות AI",
        avatar_url: null,
      });
      
      // Load AI messages from localStorage
      const savedMessages = localStorage.getItem(`ai-chat-${user.id}`);
      if (savedMessages) {
        setAiMessages(JSON.parse(savedMessages));
      }
      setLoading(false);
    } else {
      fetchMessages();
      fetchOtherUser();
      markMessagesAsRead();

      // Subscribe to new messages
      const channel = supabase
        .channel(`messages-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `sender_id=eq.${userId}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
            scrollToBottom();
            markMessagesAsRead();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, userId, isAIChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, aiMessages]);

  // Save AI messages to localStorage
  useEffect(() => {
    if (isAIChat && user && aiMessages.length > 0) {
      localStorage.setItem(`ai-chat-${user.id}`, JSON.stringify(aiMessages));
    }
  }, [aiMessages, isAIChat, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchOtherUser = async () => {
    if (!userId || isAIChat) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setOtherUser(data);
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const fetchMessages = async () => {
    if (!user || !userId) return;

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!user || !userId) return;

    try {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("receiver_id", user.id)
        .eq("sender_id", userId)
        .eq("is_read", false);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  // Stream AI response
  const streamAIChat = async (messages: AIMessage[]) => {
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
    let assistantContent = "";

    while (true) {
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
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            setIsTyping(false);
            assistantContent += content;
            setAiMessages((prev) => {
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
    setIsTyping(false);
  };

  const sendMessage = async () => {
    if (!user || !userId || !messageText.trim()) return;

    setSending(true);
    
    if (isAIChat) {
      // AI Chat flow
      const userMessage: AIMessage = { role: "user", content: messageText.trim() };
      setAiMessages((prev) => [...prev, userMessage]);
      setMessageText("");
      
      try {
        await streamAIChat([...aiMessages, userMessage]);
      } catch (error) {
        console.error("Error:", error);
        toast({
          title: "שגיאה",
          description: error instanceof Error ? error.message : "משהו השתבש",
          variant: "destructive",
        });
        setAiMessages((prev) => prev.slice(0, -1));
      } finally {
        setSending(false);
      }
    } else {
      // Regular message flow
      try {
        const { data, error } = await supabase
          .from("messages")
          .insert({
            sender_id: user.id,
            receiver_id: userId,
            message_text: messageText.trim(),
          })
          .select()
          .single();

        if (error) throw error;

        setMessages((prev) => [...prev, data]);
        setMessageText("");
        scrollToBottom();
      } catch (error) {
        console.error("Error sending message:", error);
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לשלוח את ההודעה. נסה שוב.",
          variant: "destructive",
        });
      } finally {
        setSending(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessageTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, "HH:mm");
    } else if (isYesterday(date)) {
      return `אתמול ${format(date, "HH:mm")}`;
    }
    return format(date, "d בMMM, HH:mm", { locale: he });
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";

    messages.forEach((message) => {
      const messageDate = new Date(message.created_at);
      const dateKey = format(messageDate, "yyyy-MM-dd");

      if (dateKey !== currentDate) {
        currentDate = dateKey;
        groups.push({
          date: isToday(messageDate)
            ? "היום"
            : isYesterday(messageDate)
            ? "אתמול"
            : format(messageDate, "d בMMMM yyyy", { locale: he }),
          messages: [message],
        });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });

    return groups;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#262626]" />
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Instagram-style Header */}
      <div className="bg-background border-b border-border sticky top-0 z-10">
        <div className="px-2 py-2 flex items-center gap-2">
          <button
            onClick={() => navigate("/messages")}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-6 w-6 text-foreground" />
          </button>

          <div 
            className="flex items-center gap-3 flex-1 cursor-pointer"
            onClick={() => !isAIChat && navigate(`/profile/${userId}`)}
          >
            <div className="relative">
              {isAIChat ? (
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary via-accent to-primary p-[2px]">
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                </div>
              ) : (
                <Avatar className="h-9 w-9">
                  <AvatarImage src={otherUser?.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white">
                    {otherUser?.full_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-1">
                <h2 className="text-base font-semibold text-foreground leading-tight">
                  {otherUser?.full_name || "משתמש"}
                </h2>
                {isAIChat && <Sparkles className="h-4 w-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground">
                {isAIChat ? "מוכן לעזור לך" : "פעיל/ה עכשיו"}
              </p>
            </div>
          </div>

          {!isAIChat && (
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-full hover:bg-muted transition-colors">
                <Phone className="h-6 w-6 text-foreground" />
              </button>
              <button className="p-2 rounded-full hover:bg-muted transition-colors">
                <Video className="h-6 w-6 text-foreground" />
              </button>
              <button className="p-2 rounded-full hover:bg-muted transition-colors">
                <Info className="h-6 w-6 text-foreground" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* AI Welcome Card */}
        {isAIChat && aiMessages.length === 0 && (
          <div className="flex flex-col items-center py-8 mb-4">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary via-accent to-primary p-[3px] mb-3">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                <Bot className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-foreground">נציג שירות AI</h3>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-[260px]">
              היי! 👋 אני כאן לעזור לך עם כל שאלה על חיות מחמד
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {["בריאות הכלב שלי", "מה לתת לחתול?", "איך לאלף גור?"].map((q) => (
                <button
                  key={q}
                  onClick={() => setMessageText(q)}
                  className="px-3 py-1.5 bg-muted text-foreground text-sm rounded-full hover:bg-muted/80 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Regular Profile Card at top */}
        {!isAIChat && otherUser && messages.length === 0 && (
          <div className="flex flex-col items-center py-8 mb-4">
            <Avatar className="h-24 w-24 mb-3">
              <AvatarImage src={otherUser.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-2xl">
                {otherUser.full_name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-lg font-bold text-foreground">{otherUser.full_name}</h3>
            <p className="text-sm text-muted-foreground mt-1">Petid</p>
            <button 
              onClick={() => navigate(`/profile/${userId}`)}
              className="mt-3 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              צפה בפרופיל
            </button>
          </div>
        )}

        {/* AI Messages */}
        {isAIChat && (
          <AnimatePresence>
            {aiMessages.map((message, index) => {
              const isUser = message.role === "user";
              const showAvatar = !isUser && 
                (index === aiMessages.length - 1 || 
                 aiMessages[index + 1]?.role !== "assistant");

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`flex items-end gap-2 mb-2 ${isUser ? "flex-row-reverse" : ""}`}
                >
                  {!isUser && (
                    <div className="w-7 flex-shrink-0">
                      {showAvatar && (
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px]">
                          <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`max-w-[75%] px-4 py-2.5 ${
                      isUser
                        ? "bg-primary text-primary-foreground rounded-[22px] rounded-br-md"
                        : "bg-muted text-foreground rounded-[22px] rounded-bl-md"
                    }`}
                  >
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {/* Regular Messages */}
        {!isAIChat && messageGroups.map((group, groupIndex) => (
          <div key={group.date}>
            {/* Date Separator */}
            <div className="flex justify-center my-4">
              <span className="text-xs text-muted-foreground bg-background px-2">
                {group.date}
              </span>
            </div>

            <AnimatePresence>
              {group.messages.map((message, index) => {
                const isSender = message.sender_id === user?.id;
                const showAvatar = !isSender && 
                  (index === group.messages.length - 1 || 
                   group.messages[index + 1]?.sender_id !== message.sender_id);

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={`flex items-end gap-2 mb-1 ${isSender ? "flex-row-reverse" : ""}`}
                  >
                    {!isSender && (
                      <div className="w-7 flex-shrink-0">
                        {showAvatar && (
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={otherUser?.avatar_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs">
                              {otherUser?.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}

                    <div
                      className={`max-w-[70%] px-4 py-2 ${
                        isSender
                          ? "bg-primary text-primary-foreground rounded-[22px] rounded-br-md"
                          : "bg-muted text-foreground rounded-[22px] rounded-bl-md"
                      }`}
                    >
                      <p className="text-[15px] leading-[20px] whitespace-pre-wrap break-words">
                        {message.message_text}
                      </p>
                    </div>

                    {isSender && (
                      <span className="text-[10px] text-muted-foreground self-end mb-1">
                        {message.is_read ? "נקראה" : ""}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-end gap-2 mb-1"
          >
            {isAIChat ? (
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px]">
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              </div>
            ) : (
              <Avatar className="h-7 w-7">
                <AvatarImage src={otherUser?.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs">
                  {otherUser?.full_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="bg-muted rounded-full px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Instagram-style Input */}
      <div className="bg-background border-t border-border px-3 py-2 safe-area-inset-bottom">
        <div className="flex items-center gap-2">
          {!isAIChat && (
            <button className="p-2 rounded-full hover:bg-muted">
              <Image className="h-6 w-6 text-foreground" />
            </button>
          )}
          
          <div className="flex-1 flex items-center bg-muted rounded-full px-4 py-2 gap-2">
            <input
              ref={inputRef}
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isAIChat ? "שאל אותי משהו..." : "הודעה..."}
              className="flex-1 bg-transparent outline-none text-[15px] text-foreground placeholder:text-muted-foreground"
              disabled={sending}
            />
            {!messageText.trim() && !isAIChat && (
              <>
                <button className="p-1">
                  <Mic className="h-5 w-5 text-foreground" />
                </button>
                <button className="p-1">
                  <Smile className="h-5 w-5 text-foreground" />
                </button>
              </>
            )}
          </div>

          {messageText.trim() ? (
            <button
              onClick={sendMessage}
              disabled={sending}
              className="text-primary font-semibold text-sm px-2"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "שלח"
              )}
            </button>
          ) : (
            <button className="p-2">
              <Heart className="h-6 w-6 text-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
