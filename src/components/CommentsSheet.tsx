import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, Heart, Send, Smile, MessageCircle, Bot, Sparkles,
  ShoppingCart, ExternalLink,
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

interface Comment {
  id: string;
  comment_text: string;
  created_at: string;
  is_ai?: boolean;
  ai_products?: Array<{ id: string; name: string; price: string; image_url?: string }>;
  user: {
    id: string;
    full_name: string;
    avatar_url: string;
    breed_badge?: string | null;
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
  { text: "❤️" },
  { text: "🔥" },
  { text: "👏" },
  { text: "😍" },
  { text: "😮" },
  { text: "😢" },
];

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
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userAvatar, setUserAvatar] = useState("");
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [aiMode, setAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showSOS, setShowSOS] = useState(false);

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
      .maybeSingle();
    if (data) setUserAvatar(data.avatar_url || "");
  };

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("post_comments")
        .select("id, comment_text, created_at, user_id")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      if (data) {
        const userIds = [...new Set(data.map((c) => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        // Get breed badges for commenters
        const { data: petData } = await supabase
          .from("pets" as any)
          .select("user_id, breed, type")
          .in("user_id", userIds)
          .eq("archived", false);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
        const breedMap = new Map<string, string>();
        (petData || []).forEach((p: any) => {
          if (p.breed && !breedMap.has(p.user_id)) {
            breedMap.set(p.user_id, p.breed);
          }
        });

        const commentsWithUsers: Comment[] = data.map((comment) => {
          const profile = profileMap.get(comment.user_id);
          return {
            ...comment,
            user: {
              id: comment.user_id,
              full_name: profile?.full_name || "משתמש",
              avatar_url: profile?.avatar_url || "",
              breed_badge: breedMap.get(comment.user_id) || null,
            },
            likes_count: Math.floor(Math.random() * 50),
            is_liked: false,
          };
        });
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
        comment_text: commentText.trim(),
      });
      setNewComment("");
      await fetchComments();
      toast.success("התגובה נוספה!");

      // If AI mode is on, get AI reply
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
          if ((error as any).status === 429) {
            toast.warning("יותר מדי בקשות, נסה שוב בעוד רגע");
            return;
          }
          if ((error as any).status === 402) {
            toast.error("נדרש חידוש קרדיטים");
            return;
          }
          throw error;
        }

        if (data?.is_sos) {
          // Trigger SOS overlay immediately
          setShowSOS(true);
        }

        if (data?.reply) {
          const aiComment: Comment = {
            id: `ai-${Date.now()}`,
            comment_text: data.reply,
            created_at: new Date().toISOString(),
            is_ai: true,
            ai_products: data.products || [],
            user: {
              id: "petid-ai",
              full_name: "PetID Expert",
              avatar_url: "",
              breed_badge: null,
            },
            likes_count: 0,
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

  const handleLikeComment = (commentId: string) => {
    setLikedComments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) newSet.delete(commentId);
      else newSet.add(commentId);
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
    <>
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-[28px] bg-card border-none p-0 flex flex-col z-[100]"
      >
        {/* Drag Handle */}
        <div className="flex flex-col items-center pt-3 pb-1">
          <div className="w-9 h-1 bg-muted rounded-full" />
          <h3 className="text-foreground font-bold text-[15px] mt-2">תגובות</h3>
        </div>

        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8 ring-2 ring-card shadow-sm">
                <AvatarImage src={userAvatar} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-medium">
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-foreground font-bold text-[14px]">
                  {postAuthor?.name || "תגובות"}
                </h2>
                <p className="text-muted-foreground text-[11px]">{commentsCount} תגובות</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {reactionsCount > 0 && (
                <div className="flex items-center gap-1.5 bg-secondary px-2.5 py-1 rounded-full">
                  <div className="flex -space-x-1">
                    <span className="text-sm">❤️</span>
                    <span className="text-sm">🔥</span>
                  </div>
                  <span className="text-muted-foreground text-xs font-medium">
                    {reactionsCount}
                  </span>
                </div>
              )}
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-secondary rounded-full transition-colors"
              >
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </SheetHeader>

        {/* Post Author Info */}
        {postAuthor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 px-4 py-3 bg-secondary/50"
          >
            <Avatar className="w-9 h-9 ring-2 ring-card shadow-sm">
              <AvatarImage src={postAuthor.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm font-medium">
                {postAuthor.name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-semibold text-sm truncate">{postAuthor.name}</p>
              <p className="text-muted-foreground text-xs">יוצר הפוסט</p>
            </div>
          </motion.div>
        )}

        {/* AI Loading indicator */}
        <AnimatePresence>
          {aiLoading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-2.5 border-b border-border"
            >
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                </motion.div>
                <span className="text-muted-foreground text-xs font-medium">
                  PetID Expert מנתח את השאלה שלך...
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                <div className="w-8 h-8 border-2 border-muted border-t-primary rounded-full animate-spin" />
                <p className="text-muted-foreground text-sm mt-3">טוען תגובות...</p>
              </motion.div>
            ) : comments.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-3">
                  <MessageCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-semibold text-base">אין תגובות עדיין</p>
                <p className="text-muted-foreground text-sm mt-1">היה הראשון להגיב!</p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="divide-y divide-border/30"
              >
                {comments.map((comment, index) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className={cn(
                      "flex gap-3 py-4",
                      comment.is_ai && "relative"
                    )}
                  >
                    {/* AI Glow Border */}
                    {comment.is_ai && (
                      <div
                        className="absolute inset-0 -m-2 rounded-2xl pointer-events-none"
                        style={{
                          background:
                            "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--accent) / 0.06))",
                          border: "1px solid hsl(var(--primary) / 0.2)",
                          boxShadow: "0 0 20px hsl(var(--primary) / 0.08)",
                        }}
                      />
                    )}

                    {/* Avatar */}
                    <Avatar
                      className={cn(
                        "w-9 h-9 flex-shrink-0 ring-1",
                        comment.is_ai
                          ? "ring-primary/40"
                          : "ring-border/50"
                      )}
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
                      {/* Name row + badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-foreground font-semibold text-[13px]">
                          {comment.user.full_name}
                        </span>

                        {/* AI Expert Badge */}
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

                        {/* Breed Owner Badge */}
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

                      {/* Shoppable Product Cards */}
                      {comment.is_ai &&
                        comment.ai_products &&
                        comment.ai_products.length > 0 && (
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
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                    <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0 text-right">
                                  <p className="text-foreground text-xs font-semibold truncate">
                                    {product.name}
                                  </p>
                                  <p className="text-primary text-xs font-bold">
                                    ₪{product.price}
                                  </p>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              </motion.button>
                            ))}
                          </div>
                        )}

                      <div className="flex items-center gap-4 mt-2">
                        <button className="text-muted-foreground text-[11px] font-semibold hover:text-foreground transition-colors active:scale-95">
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
                        onClick={() => handleLikeComment(comment.id)}
                        className="flex-shrink-0 flex flex-col items-center gap-0.5 pt-1"
                      >
                        <motion.div
                          whileTap={{ scale: 1.3 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          <Heart
                            className={cn(
                              "w-4 h-4 transition-colors",
                              likedComments.has(comment.id)
                                ? "fill-red-500 text-red-500"
                                : "text-muted-foreground/40 hover:text-muted-foreground/60"
                            )}
                          />
                        </motion.div>
                        {(comment.likes_count || 0) > 0 && (
                          <span className="text-muted-foreground text-[10px]">
                            {(comment.likes_count || 0) +
                              (likedComments.has(comment.id) ? 1 : 0)}
                          </span>
                        )}
                      </button>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Fixed Bottom Input */}
        <div className="border-t border-border bg-card px-4 pt-3 pb-20">
          {/* AI Toggle */}
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

            {/* AI toggle pill */}
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full mr-2 transition-all cursor-pointer select-none",
                aiMode
                  ? "bg-primary/10 border border-primary/25"
                  : "bg-secondary border border-transparent"
              )}
              onClick={() => setAiMode(!aiMode)}
            >
              <Bot
                className={cn(
                  "w-3.5 h-3.5 transition-colors",
                  aiMode ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-bold whitespace-nowrap transition-colors",
                  aiMode ? "text-primary" : "text-muted-foreground"
                )}
              >
                AI
              </span>
              <Switch
                checked={aiMode}
                onCheckedChange={setAiMode}
                className="h-4 w-7 data-[state=checked]:bg-primary"
              />
            </div>
          </div>

          {/* Comment Input */}
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8 flex-shrink-0 ring-1 ring-border/50">
              <AvatarImage src={userAvatar} />
              <AvatarFallback className="bg-gradient-to-br from-primary/60 to-accent/60 text-primary-foreground text-xs font-medium">
                {user?.email?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 relative">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleSubmitComment()
                }
                placeholder={
                  aiMode
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
              <button className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
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

    {/* Emergency SOS Overlay */}
    <EmergencyHub open={showSOS} onOpenChange={setShowSOS} />
    </>
  );
};
