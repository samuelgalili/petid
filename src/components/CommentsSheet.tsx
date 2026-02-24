import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, Heart, Send, Smile, MessageCircle, Bot, Sparkles,
  ShoppingCart, ExternalLink, Reply,
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

const quickReplies = [
  { text: "❤️" },
  { text: "🔥" },
  { text: "👏" },
  { text: "😍" },
  { text: "😮" },
  { text: "😢" },
];

/* ─── Single Comment Component ─── */

const CommentItem = ({
  comment,
  depth = 0,
  likedComments,
  onLike,
  onReply,
  navigate,
}: {
  comment: Comment;
  depth?: number;
  likedComments: Set<string>;
  onLike: (id: string) => void;
  onReply: (comment: Comment) => void;
  navigate: (path: string) => void;
}) => {
  const isLiked = likedComments.has(comment.id) || comment.is_liked;
  const likesCount = (comment.likes_count || 0) + (likedComments.has(comment.id) && !comment.is_liked ? 1 : 0);

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
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={cn("flex gap-3 py-3 relative", comment.is_ai && "relative")}
        style={{ paddingRight: depth > 0 ? `${depth * 40}px` : undefined }}
      >
        {/* Thread guide line */}
        {depth > 0 && (
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-border/40 rounded-full"
            style={{ right: `${(depth * 40) - 16}px` }}
          />
        )}

        {/* AI Glow Border */}
        {comment.is_ai && (
          <div
            className="absolute inset-0 -m-2 rounded-2xl pointer-events-none"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--accent) / 0.06))",
              border: "1px solid hsl(var(--primary) / 0.2)",
              boxShadow: "0 0 20px hsl(var(--primary) / 0.08)",
            }}
          />
        )}

        {/* Avatar */}
        <Avatar
          className={cn(
            "w-8 h-8 flex-shrink-0 ring-1 cursor-pointer",
            comment.is_ai ? "ring-primary/40" : "ring-border/50"
          )}
          onClick={() => !comment.is_ai && navigate(`/user/${comment.user.id}`)}
        >
          {comment.is_ai ? (
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
              <Bot className="w-4 h-4" />
            </AvatarFallback>
          ) : (
            <>
              <AvatarImage src={comment.user.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary/60 to-accent/60 text-primary-foreground text-xs font-medium">
                {comment.user.full_name?.[0] || "U"}
              </AvatarFallback>
            </>
          )}
        </Avatar>

        <div className="flex-1 min-w-0 relative z-10">
          {/* Name row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-foreground font-semibold text-[13px] cursor-pointer hover:underline"
              onClick={() => !comment.is_ai && navigate(`/user/${comment.user.id}`)}
            >
              {comment.user.full_name}
            </span>

            {comment.is_ai && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: "hsl(var(--primary) / 0.12)",
                  color: "hsl(var(--primary))",
                  border: "1px solid hsl(var(--primary) / 0.2)",
                }}
              >
                <Sparkles className="w-2.5 h-2.5" />
                PetID Expert
              </span>
            )}

            {!comment.is_ai && comment.user.breed_badge && (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                style={{
                  background: "hsl(var(--accent) / 0.1)",
                  color: "hsl(var(--accent))",
                }}
              >
                🐾 {comment.user.breed_badge}
              </span>
            )}

            <span className="text-muted-foreground text-[11px]">•</span>
            <span className="text-muted-foreground text-[11px]">
              {formatTime(comment.created_at)}
            </span>
          </div>

          {/* Comment text */}
          <p className="text-foreground/90 text-[13px] mt-1 leading-[1.5] break-words">
            {comment.comment_text}
          </p>

          {/* AI Product Cards */}
          {comment.is_ai && comment.ai_products && comment.ai_products.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {comment.ai_products.map((product) => (
                <motion.button
                  key={product.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl transition-colors"
                  style={{
                    background: "hsl(var(--secondary))",
                    border: "1px solid hsl(var(--border))",
                  }}
                >
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-foreground text-xs font-semibold truncate">{product.name}</p>
                    <p className="text-primary text-xs font-bold">₪{product.price}</p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                </motion.button>
              ))}
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => onReply(comment)}
              className="flex items-center gap-1 text-muted-foreground text-[11px] font-semibold hover:text-foreground transition-colors active:scale-95"
            >
              <Reply className="w-3 h-3" />
              הגב
            </button>
            <button className="text-muted-foreground text-[11px] font-semibold hover:text-foreground transition-colors active:scale-95">
              תרגם
            </button>
          </div>
        </div>

        {/* Like button */}
        {!comment.is_ai && (
          <button
            onClick={() => onLike(comment.id)}
            className="flex-shrink-0 flex flex-col items-center gap-0.5 pt-1"
          >
            <motion.div whileTap={{ scale: 1.3 }} transition={{ type: "spring", stiffness: 400 }}>
              <Heart
                className={cn(
                  "w-4 h-4 transition-colors",
                  isLiked
                    ? "fill-destructive text-destructive"
                    : "text-muted-foreground/40 hover:text-muted-foreground/60"
                )}
              />
            </motion.div>
            {likesCount > 0 && (
              <span className="text-muted-foreground text-[10px]">{likesCount}</span>
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
              likedComments={likedComments}
              onLike={onLike}
              onReply={onReply}
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
    return () => {
      setReplyingTo(null);
      setNewComment("");
    };
  }, [isOpen, postId]);

  /* Realtime subscription */
  useEffect(() => {
    if (!isOpen || !postId) return;

    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "post_comments", filter: `post_id=eq.${postId}` },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, postId]);

  const fetchUserAvatar = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle();
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
          supabase.from("comment_likes" as any).select("comment_id").in("comment_id", commentIds),
          user
            ? supabase.from("comment_likes" as any).select("comment_id").in("comment_id", commentIds).eq("user_id", user.id)
            : Promise.resolve({ data: [] }),
        ]);

        const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
        const breedMap = new Map<string, string>();
        ((petRes.data || []) as any[]).forEach((p: any) => {
          if (p.breed && !breedMap.has(p.user_id)) breedMap.set(p.user_id, p.breed);
        });

        // Count likes per comment
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

        // Build tree
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

        // Attach replies (max 1 level deep in display)
        rootComments.forEach((c) => {
          c.replies = childrenMap.get(c.id) || [];
        });

        setComments(rootComments.reverse()); // newest first
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

  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment("");
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
        // Always reply to root-level comment (flatten to 1 level)
        insertData.parent_id = replyingTo.parent_id || replyingTo.id;
      }

      await supabase.from("post_comments").insert(insertData);
      setNewComment("");
      setReplyingTo(null);
      // Realtime will trigger fetchComments, but also fetch immediately for responsiveness
      await fetchComments();
      toast.success("התגובה נוספה!");

      if (aiMode && commentText.length > 3) {
        await fetchAiReply(commentText);
      }
    } catch (error) {
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
              ? {
                  name: activePet.name,
                  breed: activePet.breed,
                  pet_type: activePet.pet_type,
                  age_weeks: activePet.ageWeeks,
                  medical_conditions: activePet.medical_conditions,
                }
              : null,
          },
        });

        if (error) {
          if ((error as any).status === 429) { toast.warning("יותר מדי בקשות, נסה שוב בעוד רגע"); return; }
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
    // Optimistic update
    setLikedComments((prev) => {
      const newSet = new Set(prev);
      if (wasLiked) newSet.delete(commentId);
      else newSet.add(commentId);
      return newSet;
    });

    try {
      if (wasLiked) {
        await supabase.from("comment_likes" as any).delete().eq("comment_id", commentId).eq("user_id", user.id);
      } else {
        await supabase.from("comment_likes" as any).insert({ comment_id: commentId, user_id: user.id });
      }
    } catch {
      // Revert on error
      setLikedComments((prev) => {
        const newSet = new Set(prev);
        if (wasLiked) newSet.add(commentId);
        else newSet.delete(commentId);
        return newSet;
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
          className="h-[70vh] rounded-t-[28px] bg-card border-none p-0 flex flex-col z-[100]"
        >
          {/* Drag Handle + Title */}
          <div className="flex flex-col items-center pt-3 pb-1">
            <div className="w-9 h-1 bg-muted rounded-full" />
            <h3 className="text-foreground font-bold text-[15px] mt-2">
              תגובות ({totalCount})
            </h3>
          </div>

          {/* Header */}
          <SheetHeader className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {postAuthor && (
                  <Avatar className="w-8 h-8 ring-2 ring-card shadow-sm">
                    <AvatarImage src={postAuthor.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-medium">
                      {postAuthor.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <h2 className="text-foreground font-bold text-[14px]">
                    {postAuthor?.name || "תגובות"}
                  </h2>
                  <p className="text-muted-foreground text-[11px]">{totalCount} תגובות</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {reactionsCount > 0 && (
                  <div className="flex items-center gap-1.5 bg-secondary px-2.5 py-1 rounded-full">
                    <div className="flex -space-x-1">
                      <span className="text-sm">❤️</span>
                      <span className="text-sm">🔥</span>
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">{reactionsCount}</span>
                  </div>
                )}
                <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-full transition-colors">
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </SheetHeader>

          {/* AI Loading */}
          <AnimatePresence>
            {aiLoading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 py-2.5 border-b border-border"
              >
                <div className="flex items-center gap-2">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
                    <Sparkles className="w-4 h-4 text-primary" />
                  </motion.div>
                  <span className="text-muted-foreground text-xs font-medium">PetID Expert מנתח את השאלה שלך...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto px-4">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-muted border-t-primary rounded-full animate-spin" />
                  <p className="text-muted-foreground text-sm mt-3">טוען תגובות...</p>
                </motion.div>
              ) : comments.length === 0 ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-3">
                    <MessageCircle className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-semibold text-base">אין תגובות עדיין</p>
                  <p className="text-muted-foreground text-sm mt-1">היה הראשון להגיב!</p>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="divide-y divide-border/30">
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      likedComments={likedComments}
                      onLike={handleLikeComment}
                      onReply={handleReply}
                      navigate={navigate}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ─── Sticky Bottom Input ─── */}
          <div className="sticky bottom-0 border-t border-border bg-card px-4 pt-3 pb-6">
            {/* Reply indicator */}
            <AnimatePresence>
              {replyingTo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between mb-2 px-2 py-1.5 rounded-lg bg-secondary"
                >
                  <span className="text-muted-foreground text-xs">
                    מגיב/ה ל-<span className="text-foreground font-semibold">{replyingTo.user.full_name}</span>
                  </span>
                  <button onClick={cancelReply} className="text-muted-foreground text-xs font-bold hover:text-foreground">
                    ✕
                  </button>
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
                  className="flex gap-1 mb-2 overflow-x-auto"
                >
                  {PET_EMOJIS.map((emoji, i) => (
                    <motion.button
                      key={i}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => insertEmoji(emoji)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary hover:bg-secondary/80 text-lg flex-shrink-0"
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick reactions + AI toggle */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex justify-around flex-1 gap-1">
                {quickReplies.map((reply, index) => (
                  <motion.button
                    key={index}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => handleSubmitComment(reply.text)}
                    disabled={submitting || !user}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary hover:bg-secondary/80 active:bg-muted transition-colors text-lg disabled:opacity-50"
                  >
                    {reply.text}
                  </motion.button>
                ))}
              </div>

              <div
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full mr-2 transition-all cursor-pointer select-none",
                  aiMode ? "bg-primary/10 border border-primary/25" : "bg-secondary border border-transparent"
                )}
                onClick={() => setAiMode(!aiMode)}
              >
                <Bot className={cn("w-3.5 h-3.5 transition-colors", aiMode ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-[10px] font-bold whitespace-nowrap transition-colors", aiMode ? "text-primary" : "text-muted-foreground")}>
                  AI
                </span>
                <Switch checked={aiMode} onCheckedChange={setAiMode} className="h-4 w-7 data-[state=checked]:bg-primary" />
              </div>
            </div>

            {/* Input */}
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8 flex-shrink-0 ring-1 ring-border/50">
                <AvatarImage src={userAvatar} />
                <AvatarFallback className="bg-gradient-to-br from-primary/60 to-accent/60 text-primary-foreground text-xs font-medium">
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
                    replyingTo
                      ? `הגב ל-${replyingTo.user.full_name}...`
                      : aiMode
                      ? "שאל את המוח של PetID..."
                      : "הוסף תגובה..."
                  }
                  disabled={!user || submitting}
                  className={cn(
                    "w-full bg-secondary text-foreground placeholder-muted-foreground rounded-full pl-10 pr-4 py-2.5 text-[13px] focus:outline-none focus:ring-2 transition-all disabled:opacity-50",
                    aiMode
                      ? "focus:ring-primary/30 border border-primary/20"
                      : "focus:ring-primary/20 border border-transparent"
                  )}
                />
                <button
                  onClick={() => setShowEmojiBar((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <Smile className="w-5 h-5" />
                </button>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleSubmitComment()}
                disabled={!newComment.trim() || submitting || !user}
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-50",
                  newComment.trim()
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <EmergencyHub open={showSOS} onOpenChange={setShowSOS} />
    </>
  );
};
