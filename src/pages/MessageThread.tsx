import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ChevronRight, Phone, Video, Info, Heart, Image, Mic, Smile } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isYesterday } from "date-fns";
import { he } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
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
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !userId) return;

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
  }, [user, userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchOtherUser = async () => {
    if (!userId) return;

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

  const sendMessage = async () => {
    if (!user || !userId || !messageText.trim()) return;

    setSending(true);
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
    <div className="min-h-screen bg-white flex flex-col" dir="rtl">
      {/* Instagram-style Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-2 py-2 flex items-center gap-2">
          <button
            onClick={() => navigate("/messages")}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="h-6 w-6 text-[#262626]" />
          </button>

          <div 
            className="flex items-center gap-3 flex-1 cursor-pointer"
            onClick={() => navigate(`/profile/${userId}`)}
          >
            <div className="relative">
              <Avatar className="h-9 w-9">
                <AvatarImage src={otherUser?.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white">
                  {otherUser?.full_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
            </div>

            <div className="flex-1">
              <h2 className="text-base font-semibold text-[#262626] leading-tight">
                {otherUser?.full_name || "משתמש"}
              </h2>
              <p className="text-xs text-gray-500">פעיל/ה עכשיו</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <Phone className="h-6 w-6 text-[#262626]" />
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <Video className="h-6 w-6 text-[#262626]" />
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <Info className="h-6 w-6 text-[#262626]" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Profile Card at top */}
        {otherUser && messages.length === 0 && (
          <div className="flex flex-col items-center py-8 mb-4">
            <Avatar className="h-24 w-24 mb-3">
              <AvatarImage src={otherUser.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-2xl">
                {otherUser.full_name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-lg font-bold text-[#262626]">{otherUser.full_name}</h3>
            <p className="text-sm text-gray-500 mt-1">Petid</p>
            <button 
              onClick={() => navigate(`/profile/${userId}`)}
              className="mt-3 text-sm font-medium text-gray-500 hover:text-[#262626]"
            >
              צפה בפרופיל
            </button>
          </div>
        )}

        {messageGroups.map((group, groupIndex) => (
          <div key={group.date}>
            {/* Date Separator */}
            <div className="flex justify-center my-4">
              <span className="text-xs text-gray-500 bg-white px-2">
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
                      <span className="text-[10px] text-gray-400 self-end mb-1">
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
            <Avatar className="h-7 w-7">
              <AvatarImage src={otherUser?.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs">
                {otherUser?.full_name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="bg-gray-100 rounded-full px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Instagram-style Input */}
      <div className="bg-white border-t border-gray-100 px-3 py-2 safe-area-inset-bottom">
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full hover:bg-gray-100">
            <Image className="h-6 w-6 text-[#262626]" />
          </button>
          
          <div className="flex-1 flex items-center bg-gray-100 rounded-full px-4 py-2 gap-2">
            <input
              ref={inputRef}
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="הודעה..."
              className="flex-1 bg-transparent outline-none text-[15px] text-[#262626] placeholder:text-gray-500"
              disabled={sending}
            />
            {!messageText.trim() && (
              <>
                <button className="p-1">
                  <Mic className="h-5 w-5 text-[#262626]" />
                </button>
                <button className="p-1">
                  <Smile className="h-5 w-5 text-[#262626]" />
                </button>
              </>
            )}
          </div>

          {messageText.trim() ? (
            <button
              onClick={sendMessage}
              disabled={sending}
              className="text-[#0095F6] font-semibold text-sm px-2"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "שלח"
              )}
            </button>
          ) : (
            <button className="p-2">
              <Heart className="h-6 w-6 text-[#262626]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
