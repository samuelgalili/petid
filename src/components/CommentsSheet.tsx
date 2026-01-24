import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Heart, MoreHorizontal, SlidersHorizontal } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

interface Comment {
  id: string;
  comment_text: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  likes_count?: number;
  is_liked?: boolean;
}

interface CommentsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postAuthor?: {
    name: string;
    avatar_url: string;
    subtitle?: string;
  };
  commentsCount: number;
  reactionsCount?: number;
}

const quickReplies = [
  { text: "אהבתי! 💖", emoji: "💖" },
  { text: "מדהים!", emoji: "🔥" },
  { text: "כל כך חמוד! 🥰", emoji: "🥰" },
];

export const CommentsSheet = ({ 
  isOpen, 
  onClose, 
  postId, 
  postAuthor,
  commentsCount,
  reactionsCount = 0
}: CommentsSheetProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userAvatar, setUserAvatar] = useState("");

  useEffect(() => {
    if (isOpen && postId) {
      fetchComments();
      fetchUserAvatar();
    }
  }, [isOpen, postId]);

  const fetchUserAvatar = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single();
    if (data) setUserAvatar(data.avatar_url || "");
  };

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("post_comments")
        .select(`
          id,
          comment_text,
          created_at,
          user_id
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      if (data) {
        const commentsWithUsers = await Promise.all(
          data.map(async (comment) => {
            const { data: userData } = await supabase
              .from("profiles")
              .select("id, full_name, avatar_url")
              .eq("id", comment.user_id)
              .single();
            return {
              ...comment,
              user: userData || { id: comment.user_id, full_name: "משתמש", avatar_url: "" },
              likes_count: 0,
              is_liked: false
            };
          })
        );
        setComments(commentsWithUsers);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (text?: string) => {
    const commentText = text || newComment;
    if (!commentText.trim() || !user) return;

    setSubmitting(true);
    try {
      await supabase.from("post_comments").insert({
        post_id: postId,
        user_id: user.id,
        comment_text: commentText.trim()
      });
      setNewComment("");
      await fetchComments();
      toast.success("התגובה נוספה!");
    } catch (error) {
      toast.error("שגיאה בהוספת התגובה");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: false, locale: he });
    } catch {
      return "";
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] rounded-t-3xl bg-[#1C1C1E] border-none p-0"
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <SheetHeader className="px-4 pb-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="p-2 -ml-2">
              <ChevronDown className="w-6 h-6 text-white" />
            </button>
            <h2 className="text-white font-semibold text-base">תגובות</h2>
            <button className="p-2 -mr-2">
              <SlidersHorizontal className="w-5 h-5 text-white" />
            </button>
          </div>
        </SheetHeader>

        {/* Post Author Info */}
        {postAuthor && (
          <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
            <Avatar className="w-12 h-12">
              <AvatarImage src={postAuthor.avatar_url} />
              <AvatarFallback className="bg-gray-700 text-white">
                {postAuthor.name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-semibold">{postAuthor.name}</p>
              {postAuthor.subtitle && (
                <p className="text-gray-400 text-sm">{postAuthor.subtitle}</p>
              )}
            </div>
          </div>
        )}

        {/* Reactions & Stats */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              <span className="text-lg">🔥</span>
              <span className="text-lg">👏</span>
              <span className="text-lg">😍</span>
            </div>
            <span className="text-gray-400 text-sm">{reactionsCount}</span>
          </div>
          <span className="text-gray-400 text-sm">
            {commentsCount} תגובות
          </span>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-4 py-2" style={{ maxHeight: "calc(85vh - 300px)" }}>
          <AnimatePresence>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">אין תגובות עדיין</p>
                <p className="text-gray-600 text-sm mt-1">היה הראשון להגיב!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 py-4"
                >
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={comment.user.avatar_url} />
                    <AvatarFallback className="bg-gray-700 text-white text-sm">
                      {comment.user.full_name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-sm">
                        {comment.user.full_name}
                      </span>
                      <span className="text-blue-400 text-xs">
                        {formatTime(comment.created_at)}
                      </span>
                    </div>
                    
                    <p className="text-gray-300 text-sm mt-1 leading-relaxed">
                      {comment.comment_text}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-2">
                      <button className="text-gray-500 text-xs font-medium hover:text-white transition-colors">
                        הגב
                      </button>
                      <button className="text-gray-500 hover:text-white transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <button className="flex-shrink-0 p-1">
                    <Heart className="w-5 h-5 text-gray-600 hover:text-red-500 transition-colors" />
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Quick Replies */}
        <div className="px-4 py-3 border-t border-gray-800">
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
            {quickReplies.map((reply, index) => (
              <button
                key={index}
                onClick={() => handleSubmitComment(reply.text)}
                disabled={submitting || !user}
                className="flex-shrink-0 px-4 py-2 bg-gray-800 rounded-full text-white text-sm hover:bg-gray-700 transition-colors"
              >
                {reply.text}
              </button>
            ))}
          </div>

          {/* Comment Input */}
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src={userAvatar} />
              <AvatarFallback className="bg-gradient-to-br from-pink-500 to-blue-500 text-white">
                {user?.email?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 relative">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmitComment()}
                placeholder="הוסף תגובה..."
                disabled={!user || submitting}
                className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-600"
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
