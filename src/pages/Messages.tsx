import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Edit, Camera, Bot, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { timeAgo } from "@/utils/timeAgo";
import { ActivityStatus } from "@/components/ActivityStatus";
import { VanishModeToggle } from "@/components/VanishModeToggle";
import petidIcon from "@/assets/petid-icon.png";
import { SEO } from "@/components/SEO";

// AI Support ID - special identifier for AI chat
const AI_SUPPORT_ID = "ai-support";

interface Conversation {
  userId: string;
  userName: string;
  userAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline?: boolean;
  isAI?: boolean;
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState("");
  const [vanishMode, setVanishMode] = useState(false);
  const [showVanishDialog, setShowVanishDialog] = useState(false);

  useEffect(() => {
    if (!user) return;

    fetchConversations();
    fetchCurrentUser();

    // Subscribe to new messages
    const channel = supabase.
    channel("messages-changes").
    on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${user.id}`
      },
      () => {
        fetchConversations();
      }
    ).
    subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchCurrentUser = async () => {
    if (!user) return;
    const { data } = await supabase.
    from("profiles").
    select("full_name").
    eq("id", user.id).
    maybeSingle();
    if (data) setCurrentUserName(data.full_name || "");
  };

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data: messages, error } = await supabase.
      from("messages").
      select(
        `
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url),
          receiver:profiles!messages_receiver_id_fkey(id, full_name, avatar_url)
        `
      ).
      or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).
      order("created_at", { ascending: false });

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
            isOnline: Math.random() > 0.5 // Simulated for demo
          });
        }

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
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="px-4 py-4 border-b flex items-center justify-between">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <div className="space-y-1 p-4">
          {[...Array(6)].map((_, i) =>
          <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="w-14 h-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-3 w-10" />
            </div>
          )}
        </div>
      </div>);

  }

  return (
    <div className="h-screen bg-background overflow-hidden" dir="rtl">
      <SEO title="הודעות" description="שלחו וקבלו הודעות מחברי הקהילה" url="/messages" noIndex={true} />
      <div className="h-full overflow-y-auto pb-[70px]">
      <div className="max-w-lg mx-auto">
        {/* Instagram-style Header */}
        <div className="bg-background border-b border-border sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              
              <h1 className="text-xl font-bold text-foreground">
                {currentUserName || "הודעות"}
              </h1>
              
            </div>
            <div className="flex items-center gap-4">
              





              <button className="p-1" onClick={() => navigate("/messages/new")}>
                <Edit className="h-6 w-6 text-foreground" />
              </button>
            </div>
          </div>
          
          {/* Search/Notes Tab */}
          <div className="px-4 pb-2">
            <div className="flex gap-2">
              <button className="flex-1 py-2 text-sm font-semibold text-foreground border-b-2 border-primary">
                הודעות
              </button>
              <button className="flex-1 py-2 text-sm font-medium text-muted-foreground">
                בקשות
              </button>
            </div>
          </div>
        </div>

        {/* Conversations List */}
        <div>
          {/* AI Support Chat removed - use central AI Chat instead */}

          {conversations.length === 0 ?
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 rounded-full border border-foreground flex items-center justify-center mb-4">
                <Camera className="h-10 w-10 text-foreground" strokeWidth={1} />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                ההודעות שלך
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-[260px]">
                שלח תמונות והודעות פרטיות לחבר או לקבוצה
              </p>
              <button className="mt-4 text-primary font-semibold text-sm">
                שלח הודעה
              </button>
            </div> :

            conversations.map((conversation) =>
            <div
              key={conversation.userId}
              onClick={() => navigate(`/messages/${conversation.userId}`)}
              className="hover:bg-muted transition-colors cursor-pointer">

                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={conversation.userAvatar || undefined} />
                      <AvatarFallback className="bg-muted text-foreground text-lg">
                        {conversation.userName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 left-0">
                      <ActivityStatus userId={conversation.userId} showText={false} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-[15px] ${conversation.unreadCount > 0 ? 'font-bold' : 'font-normal'} text-foreground truncate`}>
                        {conversation.userName}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className={`text-sm truncate ${conversation.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {conversation.lastMessage}
                      </p>
                      <span className="text-sm text-muted-foreground flex-shrink-0">
                        · {formatDistanceToNow(new Date(conversation.lastMessageTime), { locale: he })}
                      </span>
                    </div>
                  </div>

                  {conversation.unreadCount > 0 &&
                <div className="w-2 h-2 rounded-full bg-primary" />
                }
                </div>
              </div>
            )
            }
        </div>
      </div>

      {/* Vanish Mode Dialog */}
      <VanishModeToggle
          open={showVanishDialog}
          onOpenChange={setShowVanishDialog}
          vanishMode={vanishMode}
          onToggle={setVanishMode} />

      </div>
      
      <BottomNav />
    </div>);

}