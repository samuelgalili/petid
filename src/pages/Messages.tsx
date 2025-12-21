import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ChevronDown, Edit, Camera, Ghost } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { ActivityStatus } from "@/components/ActivityStatus";
import { VanishModeToggle } from "@/components/VanishModeToggle";

interface Conversation {
  userId: string;
  userName: string;
  userAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline?: boolean;
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

  const fetchCurrentUser = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    if (data) setCurrentUserName(data.full_name || "");
  };

  const fetchConversations = async () => {
    if (!user) return;

    try {
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
            isOnline: Math.random() > 0.5, // Simulated for demo
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      <div className="max-w-lg mx-auto">
        {/* Instagram-style Header */}
        <div className="bg-background border-b border-border sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <h1 className="text-xl font-bold text-foreground">
                {currentUserName || "הודעות"}
              </h1>
              <ChevronDown className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex items-center gap-4">
              <button 
                className={`p-1 ${vanishMode ? 'text-purple-500' : ''}`}
                onClick={() => setShowVanishDialog(true)}
              >
                <Ghost className="h-6 w-6" />
              </button>
              <button className="p-1">
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
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="w-24 h-24 rounded-full border-2 border-foreground flex items-center justify-center mb-4">
                <Camera className="h-12 w-12 text-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                ההודעות שלך
              </h3>
              <p className="text-sm text-gray-500 text-center max-w-[260px]">
                שלח תמונות והודעות פרטיות לחבר או לקבוצה
              </p>
              <button className="mt-4 text-primary font-semibold text-sm">
                שלח הודעה
              </button>
            </div>
          ) : (
            conversations.map((conversation, index) => (
              <motion.div
                key={conversation.userId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => navigate(`/messages/${conversation.userId}`)}
                className="hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={conversation.userAvatar || undefined} />
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground text-lg">
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

                  {conversation.unreadCount > 0 && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Vanish Mode Dialog */}
      <VanishModeToggle
        open={showVanishDialog}
        onOpenChange={setShowVanishDialog}
        vanishMode={vanishMode}
        onToggle={setVanishMode}
      />
      
      <BottomNav />
    </div>
  );
}
