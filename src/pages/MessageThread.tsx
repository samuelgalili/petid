import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowRight, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/messages")}
            className="rounded-full"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>

          <Avatar className="h-10 w-10">
            <AvatarImage src={otherUser?.avatar_url || undefined} />
            <AvatarFallback>
              {otherUser?.full_name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              {otherUser?.full_name || "משתמש"}
            </h2>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => {
            const isSender = message.sender_id === user?.id;
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`flex ${isSender ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    isSender
                      ? "bg-white text-gray-900"
                      : "bg-[#FBD66A] text-gray-900"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.message_text}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      isSender ? "text-gray-500" : "text-gray-700"
                    }`}
                  >
                    {formatDistanceToNow(new Date(message.created_at), {
                      addSuffix: true,
                      locale: he,
                    })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="כתוב הודעה..."
            className="flex-1 min-h-[44px] max-h-32 resize-none rounded-full px-4 py-2"
            disabled={sending}
          />
          <Button
            onClick={sendMessage}
            disabled={!messageText.trim() || sending}
            size="icon"
            className="rounded-full bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900 h-11 w-11 flex-shrink-0"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
