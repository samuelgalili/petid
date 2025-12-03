import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

interface Conversation {
  userId: string;
  userName: string;
  userAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    fetchConversations();

    // Subscribe to new messages
    const channel = supabase
      .channel("messages-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      // Get all messages where user is sender or receiver
      const { data: messages, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url),
          receiver:profiles!messages_receiver_id_fkey(id, full_name, avatar_url)
        `
        )
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group messages by conversation partner
      const conversationsMap = new Map<string, Conversation>();

      messages?.forEach((message: any) => {
        const isReceiver = message.receiver_id === user.id;
        const partnerId = isReceiver ? message.sender_id : message.receiver_id;
        const partner = isReceiver ? message.sender : message.receiver;

        if (!conversationsMap.has(partnerId)) {
          conversationsMap.set(partnerId, {
            userId: partnerId,
            userName: partner?.full_name || "משתמש",
            userAvatar: partner?.avatar_url || null,
            lastMessage: message.message_text,
            lastMessageTime: message.created_at,
            unreadCount: 0,
          });
        }

        // Count unread messages
        if (isReceiver && !message.is_read) {
          const conv = conversationsMap.get(partnerId)!;
          conv.unreadCount++;
        }
      });

      setConversations(Array.from(conversationsMap.values()));
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      <div className="max-w-2xl mx-auto">
        {/* Petish Inbox Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Petish Inbox</h1>
          </div>
        </div>

        {/* Conversations List */}
        <div className="divide-y divide-gray-200">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <MessageCircle className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                אין הודעות עדיין
              </h3>
              <p className="text-sm text-gray-500 text-center">
                כאשר תתחיל שיחה עם משתמשים אחרים, ההודעות יופיעו כאן
              </p>
            </div>
          ) : (
            conversations.map((conversation, index) => (
              <motion.div
                key={conversation.userId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/messages/${conversation.userId}`)}
                className="bg-white hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="px-4 py-4 flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.userAvatar || undefined} />
                    <AvatarFallback>
                      {conversation.userName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-base font-semibold text-gray-900 truncate">
                        {conversation.userName}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(
                          new Date(conversation.lastMessageTime),
                          { addSuffix: true, locale: he }
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.lastMessage}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-[#FBD66A] text-gray-900 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
