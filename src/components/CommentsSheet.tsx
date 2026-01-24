import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Heart, MoreHorizontal, Send, Smile, MessageCircle } from "lucide-react";
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
  { text: "❤️", emoji: true },
  { text: "🔥", emoji: true },
  { text: "👏", emoji: true },
  { text: "😍", emoji: true },
  { text: "😮", emoji: true },
  { text: "😢", emoji: true },
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
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

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
              likes_count: Math.floor(Math.random() * 50),
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

  const handleLikeComment = (commentId: string) => {
    setLikedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
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
        className="h-[80vh] rounded-t-[28px] bg-white border-none p-0 flex flex-col"
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-center relative">
            <button onClick={onClose} className="absolute right-0 p-1.5 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronDown className="w-5 h-5 text-gray-600" />
            </button>
            <div className="text-center">
              <h2 className="text-gray-900 font-bold text-[15px]">תגובות</h2>
              <p className="text-gray-400 text-xs mt-0.5">{commentsCount} תגובות</p>
            </div>
          </div>
        </SheetHeader>

        {/* Post Author Info - Compact */}
        {postAuthor && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 px-4 py-3 bg-gray-50/50"
          >
            <Avatar className="w-9 h-9 ring-2 ring-white shadow-sm">
              <AvatarImage src={postAuthor.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-sm font-medium">
                {postAuthor.name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 font-semibold text-sm truncate">{postAuthor.name}</p>
              <p className="text-gray-400 text-xs">יוצר הפוסט</p>
            </div>
            {reactionsCount > 0 && (
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full shadow-sm">
                <div className="flex -space-x-1">
                  <span className="text-sm">❤️</span>
                  <span className="text-sm">🔥</span>
                </div>
                <span className="text-gray-600 text-xs font-medium">{reactionsCount}</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-4">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-gray-400 text-sm mt-3">טוען תגובות...</p>
              </motion.div>
            ) : comments.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <MessageCircle className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-900 font-semibold text-base">אין תגובות עדיין</p>
                <p className="text-gray-400 text-sm mt-1">היה הראשון להגיב!</p>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="divide-y divide-gray-50"
              >
                {comments.map((comment, index) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex gap-3 py-4"
                  >
                    <Avatar className="w-9 h-9 flex-shrink-0 ring-1 ring-gray-100">
                      <AvatarImage src={comment.user.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-400 text-white text-xs font-medium">
                        {comment.user.full_name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-gray-900 font-semibold text-[13px]">
                          {comment.user.full_name}
                        </span>
                        <span className="text-gray-300 text-[11px]">•</span>
                        <span className="text-gray-400 text-[11px]">
                          {formatTime(comment.created_at)}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 text-[13px] mt-1 leading-[1.5] break-words">
                        {comment.comment_text}
                      </p>
                      
                      <div className="flex items-center gap-4 mt-2">
                        <button className="text-gray-400 text-[11px] font-semibold hover:text-gray-600 transition-colors active:scale-95">
                          הגב
                        </button>
                        <button className="text-gray-400 text-[11px] font-semibold hover:text-gray-600 transition-colors active:scale-95">
                          תרגם
                        </button>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleLikeComment(comment.id)}
                      className="flex-shrink-0 flex flex-col items-center gap-0.5 pt-1"
                    >
                      <motion.div
                        whileTap={{ scale: 1.3 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <Heart 
                          className={`w-4 h-4 transition-colors ${
                            likedComments.has(comment.id) 
                              ? "fill-red-500 text-red-500" 
                              : "text-gray-300 hover:text-gray-400"
                          }`} 
                        />
                      </motion.div>
                      {(comment.likes_count || 0) > 0 && (
                        <span className="text-gray-400 text-[10px]">
                          {(comment.likes_count || 0) + (likedComments.has(comment.id) ? 1 : 0)}
                        </span>
                      )}
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Fixed Bottom Input */}
        <div className="border-t border-gray-100 bg-white px-4 py-3 safe-area-inset-bottom">
          {/* Quick Emoji Reactions */}
          <div className="flex justify-around mb-3">
            {quickReplies.map((reply, index) => (
              <motion.button
                key={index}
                whileTap={{ scale: 0.85 }}
                onClick={() => handleSubmitComment(reply.text)}
                disabled={submitting || !user}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors text-xl disabled:opacity-50"
              >
                {reply.text}
              </motion.button>
            ))}
          </div>

          {/* Comment Input */}
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8 flex-shrink-0 ring-1 ring-gray-100">
              <AvatarImage src={userAvatar} />
              <AvatarFallback className="bg-gradient-to-br from-pink-400 to-orange-400 text-white text-xs font-medium">
                {user?.email?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 relative">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmitComment()}
                placeholder="הוסף תגובה..."
                disabled={!user || submitting}
                className="w-full bg-gray-100 text-gray-900 placeholder-gray-400 rounded-full pl-10 pr-4 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-gray-50 transition-all disabled:opacity-50"
              />
              <button className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <Smile className="w-5 h-5" />
              </button>
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleSubmitComment()}
              disabled={!newComment.trim() || submitting || !user}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                newComment.trim() 
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" 
                  : "bg-gray-100 text-gray-300"
              } disabled:opacity-50`}
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
