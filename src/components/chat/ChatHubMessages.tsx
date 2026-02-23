/**
 * ChatHubMessages — Embedded conversation list for the Chat Hub "Messages" tab.
 * Reuses the same data logic as Messages page but in a compact, embedded format.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, Store } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { ActivityStatus } from "@/components/ActivityStatus";

interface Conversation {
  userId: string;
  userName: string;
  userAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isVerifiedShop?: boolean;
}

export const ChatHubMessages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchConversations();

    const channel = supabase
      .channel("hub-messages-changes")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${user.id}`,
      }, () => fetchConversations())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;
    try {
      const { data: messages, error } = await supabase
        .from("messages")
        .select(`*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url), receiver:profiles!messages_receiver_id_fkey(id, full_name, avatar_url)`)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

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
            isVerifiedShop: false, // Will be enriched if business_profiles match
          });
        }
        if (isReceiver && !message.is_read) {
          conversationsMap.get(partnerId)!.unreadCount++;
        }
      });

      // Check for verified shops
      const partnerIds = Array.from(conversationsMap.keys());
      if (partnerIds.length > 0) {
        const { data: shops } = await (supabase as any)
          .from("business_profiles")
          .select("user_id, is_verified")
          .in("user_id", partnerIds)
          .eq("is_verified", true);
        
        shops?.forEach((shop: any) => {
          const conv = conversationsMap.get(shop.user_id);
          if (conv) conv.isVerifiedShop = true;
        });
      }

      setConversations(Array.from(conversationsMap.values()));
    } catch (e) {
      console.error("Error fetching conversations:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-1 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton className="w-14 h-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" dir="rtl">
      {/* New message button */}
      <div className="px-4 pt-3 pb-2">
        <button
          onClick={() => navigate("/messages/new")}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-primary/5 border border-primary/15 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors"
        >
          <Edit className="w-4 h-4" />
          הודעה חדשה
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Edit className="w-7 h-7 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">אין הודעות עדיין</p>
          <p className="text-xs text-muted-foreground">שלחו הודעה לחברי הקהילה 🐾</p>
        </div>
      ) : (
        conversations.map((conv, i) => (
          <motion.div
            key={conv.userId}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => navigate(`/messages/${conv.userId}`)}
            className="hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={conv.userAvatar || undefined} />
                  <AvatarFallback className="bg-muted text-foreground text-lg">
                    {conv.userName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 left-0">
                  <ActivityStatus userId={conv.userId} showText={false} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-[15px] ${conv.unreadCount > 0 ? "font-bold" : "font-normal"} text-foreground truncate`}>
                    {conv.userName}
                  </h3>
                  {conv.isVerifiedShop && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                      <Store className="w-3 h-3 text-primary" />
                      <span className="text-[9px] font-bold text-primary">חנות מאומתת</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <p className={`text-sm truncate ${conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {conv.lastMessage}
                  </p>
                  <span className="text-sm text-muted-foreground flex-shrink-0">
                    · {formatDistanceToNow(new Date(conv.lastMessageTime), { locale: he })}
                  </span>
                </div>
              </div>

              {conv.unreadCount > 0 && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary-foreground">{conv.unreadCount}</span>
                </div>
              )}
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
};
