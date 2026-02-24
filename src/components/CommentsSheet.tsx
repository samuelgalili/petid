import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, Heart, Send, Smile, MessageCircle, Bot, Sparkles,
  ShoppingCart, ExternalLink, Reply, Trash2,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActivePet } from "@/hooks/useActivePet";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { EmergencyHub } from "@/components/emergency/EmergencyHub";

/* ─── Types ─── */

interface Comment {
  id: string;
  comment_text: string;
  created_at: string;
  parent_id?: string | null;
  is_ai?: boolean;
  ai_products?: Array<{ id: string; name: string; price: string; image_url?: string }>;
  user: {
    id: string;
    full_name: string;
    avatar_url: string;
    breed_badge?: string | null;
  };
  likes_count: number;
  is_liked: boolean;
  replies?: Comment[];
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

const PET_EMOJIS = ["🐾", "🦴", "❤️", "🐕", "🐈", "🐶", "😻", "🎾"];

/* ─── Single Comment ─── */

const CommentItem = ({
  comment,
  depth = 0,
  currentUserId,
  likedComments,
  onLike,
  onReply,
  onDelete,
  navigate,
}: {
  comment: Comment;
  depth?: number;
  currentUserId?: string;
  likedComments: Set<string>;
  onLike: (id: string) => void;
  onReply: (comment: Comment) => void;
  onDelete: (id: string) => void;
  navigate: (path: string) => void;
}) => {
  const isLiked = likedComments.has(comment.id) || comment.is_liked;
  const likesCount = (comment.likes_count || 0) + (likedComments.has(comment.id) && !comment.is_liked ? 1 : 0);
  const isOwner = currentUserId === comment.user.id;

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: false, locale: he });
    } catch {
      return "";
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn("flex gap-2.5 py-2.5 relative group")}
        style={{ paddingRight: depth > 0 ? `${depth * 36}px` : undefined }}
      >
        {/* Thread guide line */}
        {depth > 0 && (
          <div
            className="absolute top-0 bottom-0 w-[1.5px] bg-border/30 rounded-full"
            style={{ right: `${(depth * 36) - 14}px` }}
          />
        )}

        {/* AI Glow */}
        {comment.is_ai && (
          <div
            className="absolute inset-0 -mx-1 -my-0.5 rounded-xl pointer-events-none"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.06), hsl(var(--accent) / 0.04))",
              border: "1px solid hsl(var(--primary) / 0.15)",
            }}
          />
        )}

        {/* Avatar */}
        <Avatar
          className={cn(
            "w-7 h-7 flex-shrink-0 cursor-pointer",
            comment.is_ai ? "ring-1 ring-primary/30" : "ring-1 ring-border/40"
          )}
          onClick={() => !comment.is_ai && navigate(`/user/${comment.user.id}`)}
        >
          {comment.is_ai ? (
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
              <Bot className="w-3.5 h-3.5" />
            </AvatarFallback>
          ) : (
            <>
              <AvatarImage src={comment.user.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary/60 to-accent/60 text-primary-foreground text-[10px] font-medium">
                {comment.user.full_name?.[0] || "U"}
              </AvatarFallback>
            </>
          )}
        </Avatar>

        <div className="flex-1 min-w-0 relative z-10">
          {/* Name + time inline */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-foreground font-semibold text-[12px] cursor-pointer hover:underline"
              onClick={() => !comment.is_ai && navigate(`/user/${comment.user.id}`)}
            >
              {comment.user.full_name}
            </span>

            {comment.is_ai && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary/10 text-primary border border-primary/15">
                <Sparkles className="w-2 h-2" />
                Expert
              </span>
            )}

            {!comment.is_ai && comment.user.breed_badge && (
              <span className="text-[9px] font-medium text-accent bg-accent/10 px-1 py-0.5 rounded-full">
                🐾 {comment.user.breed_badge}
              </span>
            )}

            <span className="text-muted-foreground text-[10px]">
              {formatTime(comment.created_at)}
            </span>
          </div>

          {/* Comment text */}
          <p className="text-foreground/90 text-[12px] mt-0.5 leading-[1.45] break-words">
            {comment.comment_text}
          </p>

          {/* AI Product Cards */}
          {comment.is_ai && comment.ai_products && comment.ai_products.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {comment.ai_products.map((product) => (
                <motion.button
                  key={product.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="w-full flex items-center gap-2 p-1.5 rounded-lg bg-secondary border border-border"
                >
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-foreground text-[11px] font-semibold truncate">{product.name}</p>
                    <p className="text-primary text-[11px] font-bold">₪{product.price}</p>
                  </div>
                  <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                </motion.button>
              ))}
            </div>
          )}

          {/* Actions row — compact */}
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => onReply(comment)}
              className="flex items-center gap-0.5 text-muted-foreground text-[10px] font-semibold hover:text-foreground transition-colors"
            >
              <Reply className="w-3 h-3" />
              הגב
            </button>
            <button className="text-muted-foreground text-[10px] font-semibold hover:text-foreground transition-colors">
              תרגם
            </button>
            {isOwner && !comment.is_ai && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-muted-foreground text-[10px] font-semibold hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Like */}
        {!comment.is_ai && (
          <button
            onClick={() => onLike(comment.id)}
            className="flex-shrink-0 flex flex-col items-center gap-0 pt-1"
          >
            <motion.div whileTap={{ scale: 1.3 }} transition={{ type: "spring", stiffness: 400 }}>
              <Heart
                className={cn(
                  "w-3.5 h-3.5 transition-colors",
                  isLiked
                    ? "fill-destructive text-destructive"
                    : "text-muted-foreground/30 hover:text-muted-foreground/50"
                )}
              />
            </motion.div>
            {likesCount > 0 && (
              <span className="text-muted-foreground text-[9px]">{likesCount}</span>
            )}
          </button>
        )}
      </motion.div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              currentUserId={currentUserId}
              likedComments={likedComments}
              onLike={onLike}
              onReply={onReply}
              onDelete={onDelete}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </>
  );
};

/* ─── Main CommentsSheet ─── */

export const CommentsSheet = ({
  isOpen,
  onClose,
  postId,
  postAuthor,
  commentsCount,
  reactionsCount = 0,
}: CommentsSheetProps) => {
  const { user } = useAuth();
  const { pet: activePet } = useActivePet();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userAvatar, setUserAvatar] = useState("");
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [aiMode, setAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [totalCount, setTotalCount] = useState(commentsCount);

  useEffect(() => {
    if (isOpen && postId) {
      fetchComments();
      fetchUserAvatar();
    }
    return () => { setReplyingTo(null); setNewComment(""); };
  }, [isOpen, postId]);

  /* Realtime */
  useEffect(() => {
    if (!isOpen || !postId) return;
    const channel = supabase
      .channel(`comments-${postId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments", filter: `post_id=eq.${postId}` }, () => fetchComments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isOpen, postId]);

  const fetchUserAvatar = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
    if (data) setUserAvatar(data.avatar_url || "");
  };

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("post_comments")
        .select("id, comment_text, created_at, user_id, parent_id")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (data) {
        const userIds = [...new Set(data.map((c: any) => c.user_id))];
        const commentIds = data.map((c: any) => c.id);

        const [profilesRes, petRes, likesRes, myLikesRes] = await Promise.all([
          supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds),
          supabase.from("pets" as any).select("user_id, breed, type").in("user_id", userIds).eq("archived", false),
          commentIds.length > 0 ? supabase.from("comment_likes" as any).select("comment_id").in("comment_id", commentIds) : Promise.resolve({ data: [] }),
          user && commentIds.length > 0
            ? supabase.from("comment_likes" as any).select("comment_id").in("comment_id", commentIds).eq("user_id", user.id)
            : Promise.resolve({ data: [] }),
        ]);

        const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
        const breedMap = new Map<string, string>();
        ((petRes.data || []) as any[]).forEach((p: any) => {
          if (p.breed && !breedMap.has(p.user_id)) breedMap.set(p.user_id, p.breed);
        });

        const likesCountMap = new Map<string, number>();
        ((likesRes.data || []) as any[]).forEach((l: any) => {
          likesCountMap.set(l.comment_id, (likesCountMap.get(l.comment_id) || 0) + 1);
        });
        const myLikedSet = new Set(((myLikesRes as any).data || []).map((l: any) => l.comment_id));

        const allComments: Comment[] = data.map((c: any) => {
          const profile = profileMap.get(c.user_id);
          return {
            id: c.id,
            comment_text: c.comment_text,
            created_at: c.created_at,
            parent_id: c.parent_id,
            user: {
              id: c.user_id,
              full_name: (profile as any)?.full_name || "משתמש",
              avatar_url: (profile as any)?.avatar_url || "",
              breed_badge: breedMap.get(c.user_id) || null,
            },
            likes_count: likesCountMap.get(c.id) || 0,
            is_liked: myLikedSet.has(c.id),
          };
        });

        const rootComments: Comment[] = [];
        const childrenMap = new Map<string, Comment[]>();
        allComments.forEach((c) => {
          if (c.parent_id) {
            const arr = childrenMap.get(c.parent_id) || [];
            arr.push(c);
            childrenMap.set(c.parent_id, arr);
          } else {
            rootComments.push(c);
          }
        });
        rootComments.forEach((c) => { c.replies = childrenMap.get(c.id) || []; });
        setComments(rootComments.reverse());
        setTotalCount(allComments.length);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
    setNewComment(`@${comment.user.full_name} `);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const cancelReply = () => { setReplyingTo(null); setNewComment(""); };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    try {
      // Delete child replies first (cascade should handle, but be safe)
      await supabase.from("comment_likes" as any).delete().eq("comment_id", commentId);
      const { error } = await supabase
        .from("post_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("התגובה נמחקה");
      await fetchComments();
    } catch {
      toast.error("שגיאה במחיקת התגובה");
    }
  };

  const handleSubmitComment = async (text?: string) => {
    const commentText = text || newComment;
    if (!commentText.trim() || !user) return;

    setSubmitting(true);
    try {
      const insertData: any = {
        post_id: postId,
        user_id: user.id,
        comment_text: commentText.trim(),
      };
      if (replyingTo) {
        insertData.parent_id = replyingTo.parent_id || replyingTo.id;
      }
      await supabase.from("post_comments").insert(insertData);
      setNewComment("");
      setReplyingTo(null);
      await fetchComments();
      toast.success("התגובה נוספה!");

      if (aiMode && commentText.length > 3) {
        await fetchAiReply(commentText);
      }
    } catch {
      toast.error("שגיאה בהוספת התגובה");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchAiReply = useCallback(
    async (commentText: string) => {
      setAiLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("comment-ai", {
          body: {
            comment_text: commentText,
            post_id: postId,
            pet_context: activePet
              ? { name: activePet.name, breed: activePet.breed, pet_type: activePet.pet_type, age_weeks: activePet.ageWeeks, medical_conditions: activePet.medical_conditions }
              : null,
          },
        });
        if (error) {
          if ((error as any).status === 429) { toast.warning("יותר מדי בקשות"); return; }
          if ((error as any).status === 402) { toast.error("נדרש חידוש קרדיטים"); return; }
          throw error;
        }
        if (data?.is_sos) setShowSOS(true);
        if (data?.reply) {
          const aiComment: Comment = {
            id: `ai-${Date.now()}`,
            comment_text: data.reply,
            created_at: new Date().toISOString(),
            is_ai: true,
            ai_products: data.products || [],
            user: { id: "petid-ai", full_name: "PetID Expert", avatar_url: "", breed_badge: null },
            likes_count: 0,
            is_liked: false,
          };
          setComments((prev) => [aiComment, ...prev]);
        }
      } catch (e) {
        console.error("AI reply error:", e);
        toast.error("שגיאה בקבלת תשובת AI");
      } finally {
        setAiLoading(false);
      }
    },
    [postId, activePet]
  );

  const handleLikeComment = async (commentId: string) => {
    if (!user || commentId.startsWith("ai-")) return;
    const wasLiked = likedComments.has(commentId);
    setLikedComments((prev) => {
      const s = new Set(prev);
      wasLiked ? s.delete(commentId) : s.add(commentId);
      return s;
    });
    try {
      if (wasLiked) {
        await supabase.from("comment_likes" as any).delete().eq("comment_id", commentId).eq("user_id", user.id);
      } else {
        await supabase.from("comment_likes" as any).insert({ comment_id: commentId, user_id: user.id });
      }
    } catch {
      setLikedComments((prev) => {
        const s = new Set(prev);
        wasLiked ? s.add(commentId) : s.delete(commentId);
        return s;
      });
    }
  };

  const insertEmoji = (emoji: string) => {
    setNewComment((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent
          side="bottom"
          className="h-[70vh] max-h-[70vh] rounded-t-[28px] bg-card border-none p-0 flex flex-col z-[100] overflow-hidden"
        >
          {/* Handle + Title */}
          <div className="flex flex-col items-center pt-2.5 pb-1">
            <div className="w-8 h-1 bg-muted rounded-full" />
            <h3 className="text-foreground font-bold text-[14px] mt-1.5">
              תגובות ({totalCount})
            </h3>
          </div>

          {/* Compact Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
            {postAuthor && (
              <div className="flex items-center gap-2">
                <Avatar className="w-7 h-7 ring-1 ring-card">
                  <AvatarImage src={postAuthor.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-[10px]">
                    {postAuthor.name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-foreground font-semibold text-[12px]">{postAuthor.name}</span>
              </div>
            )}
            <button onClick={onClose} className="p-1 hover:bg-secondary rounded-full transition-colors">
              <ChevronDown className="w-4.5 h-4.5 text-muted-foreground" />
            </button>
          </div>

          {/* AI Loading */}
          <AnimatePresence>
            {aiLoading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 py-2 border-b border-border/50"
              >
                <div className="flex items-center gap-2">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </motion.div>
                  <span className="text-muted-foreground text-[11px] font-medium">PetID Expert מנתח...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto px-3">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-10">
                  <div className="w-7 h-7 border-2 border-muted border-t-primary rounded-full animate-spin" />
                  <p className="text-muted-foreground text-xs mt-2">טוען תגובות...</p>
                </motion.div>
              ) : comments.length === 0 ? (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-10">
                  <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mb-2">
                    <MessageCircle className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-semibold text-sm">אין תגובות עדיין</p>
                  <p className="text-muted-foreground text-xs mt-0.5">היה הראשון להגיב!</p>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      currentUserId={user?.id}
                      likedComments={likedComments}
                      onLike={handleLikeComment}
                      onReply={handleReply}
                      onDelete={handleDeleteComment}
                      navigate={navigate}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ─── Sticky Bottom Input ─── */}
          <div className="sticky bottom-0 border-t border-border/50 bg-card px-3 pt-2 pb-5">
            {/* Reply indicator */}
            <AnimatePresence>
              {replyingTo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between mb-1.5 px-2 py-1 rounded-lg bg-secondary/70"
                >
                  <span className="text-muted-foreground text-[11px]">
                    ↩ <span className="text-foreground font-semibold">{replyingTo.user.full_name}</span>
                  </span>
                  <button onClick={cancelReply} className="text-muted-foreground text-[10px] font-bold hover:text-foreground px-1">✕</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pet emoji bar */}
            <AnimatePresence>
              {showEmojiBar && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex gap-1 mb-1.5 overflow-x-auto"
                >
                  {PET_EMOJIS.map((emoji, i) => (
                    <motion.button
                      key={i}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => insertEmoji(emoji)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary hover:bg-secondary/80 text-base flex-shrink-0"
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input row */}
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7 flex-shrink-0 ring-1 ring-border/40">
                <AvatarImage src={userAvatar} />
                <AvatarFallback className="bg-gradient-to-br from-primary/60 to-accent/60 text-primary-foreground text-[10px] font-medium">
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmitComment()}
                  placeholder={
                    replyingTo ? `הגב ל-${replyingTo.user.full_name}...`
                      : aiMode ? "שאל את PetID..."
                      : "הוסף תגובה..."
                  }
                  disabled={!user || submitting}
                  className={cn(
                    "w-full bg-secondary text-foreground placeholder-muted-foreground rounded-full pl-9 pr-3 py-2 text-[12px] focus:outline-none focus:ring-1.5 transition-all disabled:opacity-50",
                    aiMode ? "focus:ring-primary/30 border border-primary/20" : "focus:ring-primary/20 border border-transparent"
                  )}
                />
                <button
                  onClick={() => setShowEmojiBar((v) => !v)}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <Smile className="w-4 h-4" />
                </button>
              </div>

              {/* AI toggle — minimal pill */}
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-1.5 rounded-full cursor-pointer select-none transition-all",
                  aiMode ? "bg-primary/10 border border-primary/20" : "bg-secondary border border-transparent"
                )}
                onClick={() => setAiMode(!aiMode)}
              >
                <Bot className={cn("w-3 h-3", aiMode ? "text-primary" : "text-muted-foreground")} />
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleSubmitComment()}
                disabled={!newComment.trim() || submitting || !user}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-40",
                  newComment.trim()
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                <Send className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <EmergencyHub open={showSOS} onOpenChange={setShowSOS} />
    </>
  );
};
