import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Radio,
  X,
  Heart,
  Send,
  MoreVertical,
  Share2,
  Flag,
  Users,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  user?: {
    username: string;
    avatar_url: string | null;
  };
}

interface FloatingHeart {
  id: string;
  x: number;
}

export const LiveStreamViewer = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stream, setStream] = useState<any>(null);
  const [streamer, setStreamer] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!streamId) return;

    fetchStream();
    joinStream();
    subscribeToUpdates();

    return () => {
      leaveStream();
    };
  }, [streamId]);

  const fetchStream = async () => {
    const { data, error } = await (supabase.from("live_streams") as any)
      .select("*")
      .eq("id", streamId)
      .single();

    if (error || !data) {
      toast.error("השידור לא נמצא");
      navigate("/");
      return;
    }

    setStream(data);
    setViewerCount(data.viewer_count || 0);

    // Fetch streamer info
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", data.user_id)
      .single();

    setStreamer(profile ? { ...profile, username: profile.full_name } : null);

    // Fetch comments
    const { data: commentsData } = await (supabase.from("live_stream_comments") as any)
      .select("*")
      .eq("stream_id", streamId)
      .order("created_at", { ascending: true })
      .limit(50);

    setComments(commentsData || []);
  };

  const joinStream = async () => {
    if (!user || !streamId) return;

    await (supabase.from("live_stream_viewers") as any).insert({
      stream_id: streamId,
      user_id: user.id,
      is_active: true,
    });
  };

  const leaveStream = async () => {
    if (!user || !streamId) return;

    await (supabase.from("live_stream_viewers") as any)
      .update({ is_active: false, left_at: new Date().toISOString() })
      .eq("stream_id", streamId)
      .eq("user_id", user.id);
  };

  const subscribeToUpdates = () => {
    // Subscribe to stream updates
    const streamChannel = supabase
      .channel(`stream-${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_streams",
          filter: `id=eq.${streamId}`,
        },
        (payload) => {
          setStream(payload.new);
          setViewerCount((payload.new as any).viewer_count || 0);
          
          if ((payload.new as any).status === "ended") {
            toast.info("השידור הסתיים");
            navigate("/");
          }
        }
      )
      .subscribe();

    // Subscribe to comments
    const commentsChannel = supabase
      .channel(`comments-${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_stream_comments",
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          setComments((prev) => [...prev, payload.new as Comment]);
          commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      )
      .subscribe();

    // Subscribe to reactions
    const reactionsChannel = supabase
      .channel(`reactions-${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_stream_reactions",
          filter: `stream_id=eq.${streamId}`,
        },
        () => {
          // Show floating heart
          const heartId = crypto.randomUUID();
          const x = Math.random() * 60 + 20; // 20-80% from left
          setFloatingHearts((prev) => [...prev, { id: heartId, x }]);
          setTimeout(() => {
            setFloatingHearts((prev) => prev.filter((h) => h.id !== heartId));
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(streamChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(reactionsChannel);
    };
  };

  const sendComment = async () => {
    if (!user || !newComment.trim()) return;

    await (supabase.from("live_stream_comments") as any).insert({
      stream_id: streamId,
      user_id: user.id,
      content: newComment.trim(),
    });

    setNewComment("");
  };

  const sendReaction = async () => {
    if (!user) {
      toast.error("יש להתחבר כדי לשלוח לב");
      return;
    }

    await (supabase.from("live_stream_reactions") as any).insert({
      stream_id: streamId,
      user_id: user.id,
      reaction_type: "heart",
    });
  };

  if (!stream) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Radio className="w-12 h-12 text-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Video Area */}
      <div className="flex-1 relative">
        {/* Placeholder for video stream */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 flex items-center justify-center">
          <Radio className="w-24 h-24 text-white/50 animate-pulse" />
        </div>

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center justify-between" dir="rtl">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 ring-2 ring-red-500">
                <AvatarImage src={streamer?.avatar_url} />
                <AvatarFallback>{streamer?.username?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white font-medium">{streamer?.username}</p>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-600 text-white border-none text-xs gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </Badge>
                  <span className="text-white/70 text-xs flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {viewerCount}
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => navigate("/")}
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Floating Hearts */}
        <AnimatePresence>
          {floatingHearts.map((heart) => (
            <motion.div
              key={heart.id}
              initial={{ opacity: 1, y: 0, scale: 0 }}
              animate={{ opacity: 0, y: -200, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute bottom-32 pointer-events-none"
              style={{ left: `${heart.x}%` }}
            >
              <Heart className="w-8 h-8 text-red-500 fill-red-500" />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Comments Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide" dir="rtl">
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={comment.user?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {comment.user?.username?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-white/10 rounded-xl px-3 py-1.5 max-w-[80%]">
                  <span className="text-white/70 text-xs font-medium">
                    {comment.user?.username || "משתמש"}
                  </span>
                  <p className="text-white text-sm">{comment.content}</p>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>

          {/* Comment Input */}
          <div className="flex items-center gap-2 mt-4" dir="rtl">
            <div className="flex-1 relative">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendComment()}
                placeholder="כתוב תגובה..."
                className="bg-white/10 border-none text-white placeholder:text-white/50 pr-4 pl-10"
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute left-1 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-8 w-8"
                onClick={sendComment}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Reaction Button */}
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20 h-10 w-10"
              onClick={sendReaction}
            >
              <Heart className="w-6 h-6" />
            </Button>

            {/* Share Button */}
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20 h-10 w-10"
              onClick={() => {
                navigator.share?.({
                  title: stream.title,
                  url: window.location.href,
                });
              }}
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
