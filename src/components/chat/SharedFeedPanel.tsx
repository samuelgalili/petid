import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { X, ChevronUp, ChevronDown, Users, Loader2, Heart, MessageCircle, Eye } from "lucide-react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OptimizedImage } from "@/components/OptimizedImage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Post {
  id: string;
  image_url: string | null;
  video_url: string | null;
  caption: string | null;
  media_type: string | null;
  media_urls: string[] | null;
  user_id: string;
  created_at: string;
  user?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface SharedFeed {
  id: string;
  user1_id: string;
  user2_id: string;
  post_ids: string[];
  current_index_user1: number;
  current_index_user2: number;
  is_active: boolean;
}

interface SharedFeedPanelProps {
  isOpen: boolean;
  onClose: () => void;
  otherUserId: string;
  otherUserName: string;
  onReaction?: (postId: string, type: "like" | "comment", text?: string) => void;
}

export function SharedFeedPanel({ isOpen, onClose, otherUserId, otherUserName, onReaction }: SharedFeedPanelProps) {
  const { user } = useAuth();
  const [feed, setFeed] = useState<SharedFeed | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [otherUserIndex, setOtherUserIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const isUser1 = useCallback(() => {
    if (!user || !feed) return true;
    const sorted = [user.id, otherUserId].sort();
    return sorted[0] === user.id;
  }, [user, feed, otherUserId]);

  // Generate or fetch shared feed
  useEffect(() => {
    if (!isOpen || !user) return;

    const initFeed = async () => {
      setLoading(true);
      try {
        // Call edge function to generate/get feed
        const { data, error } = await supabase.functions.invoke("generate-shared-feed", {
          body: { user1_id: user.id, user2_id: otherUserId },
        });

        if (error || !data?.success) {
          toast.error("לא הצלחנו ליצור פיד משותף");
          onClose();
          return;
        }

        const feedData = data.feed as SharedFeed;
        setFeed(feedData);

        // Set current index based on user position
        const sorted = [user.id, otherUserId].sort();
        const myIndex = sorted[0] === user.id ? feedData.current_index_user1 : feedData.current_index_user2;
        const theirIndex = sorted[0] === user.id ? feedData.current_index_user2 : feedData.current_index_user1;
        setCurrentIndex(myIndex);
        setOtherUserIndex(theirIndex);

        // Fetch posts
        if (feedData.post_ids.length > 0) {
          const { data: postsData } = await supabase
            .from("posts")
            .select(`id, image_url, video_url, caption, media_type, media_urls, user_id, created_at`)
            .in("id", feedData.post_ids);

          if (postsData) {
            // Fetch user profiles for posts
            const userIds = [...new Set(postsData.map(p => p.user_id))];
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, full_name, avatar_url")
              .in("id", userIds);

            const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
            
            // Sort posts by feed order
            const orderedPosts = feedData.post_ids
              .map(id => postsData.find(p => p.id === id))
              .filter(Boolean)
              .map(p => ({
                ...p!,
                user: profileMap.get(p!.user_id) || null,
              }));

            setPosts(orderedPosts);
          }
        }
      } catch (e) {
        console.error("Error initializing shared feed:", e);
        toast.error("שגיאה בטעינת הפיד המשותף");
      } finally {
        setLoading(false);
      }
    };

    initFeed();
  }, [isOpen, user, otherUserId]);

  // Subscribe to realtime updates for partner's position
  useEffect(() => {
    if (!feed || !user) return;

    const channel = supabase
      .channel(`shared-feed-${feed.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "shared_feeds",
          filter: `id=eq.${feed.id}`,
        },
        (payload) => {
          const updated = payload.new as SharedFeed;
          const sorted = [user.id, otherUserId].sort();
          const theirIndex = sorted[0] === user.id ? updated.current_index_user2 : updated.current_index_user1;
          setOtherUserIndex(theirIndex);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [feed, user, otherUserId]);

  // Update position in DB
  const updateMyIndex = useCallback(async (newIndex: number) => {
    if (!feed || !user) return;
    const sorted = [user.id, otherUserId].sort();
    const field = sorted[0] === user.id ? "current_index_user1" : "current_index_user2";
    
    await supabase
      .from("shared_feeds")
      .update({ [field]: newIndex })
      .eq("id", feed.id);
  }, [feed, user, otherUserId]);

  const goToPost = (direction: "next" | "prev") => {
    const newIndex = direction === "next" 
      ? Math.min(currentIndex + 1, posts.length - 1)
      : Math.max(currentIndex - 1, 0);
    
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      updateMyIndex(newIndex);
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y < -50) goToPost("next");
    else if (info.offset.y > 50) goToPost("prev");
  };

  const handleLike = (postId: string) => {
    setLiked(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
    onReaction?.(postId, "like");
  };

  const currentPost = posts[currentIndex];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: "50%" }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-50 h-full"
        style={{ top: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} style={{ height: "50%" }} />

        {/* Panel */}
        <motion.div 
          className="absolute bottom-0 inset-x-0 bg-background rounded-t-3xl overflow-hidden border-t border-border shadow-2xl"
          style={{ height: "55%" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-sm font-bold text-foreground">פיד משותף</span>
              <span className="text-xs text-muted-foreground">עם {otherUserName}</span>
            </div>
            <div className="flex items-center gap-3">
              {posts.length > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {currentIndex + 1}/{posts.length}
                </span>
              )}
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                <X className="h-5 w-5 text-foreground" />
              </button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">מייצרים פיד מותאם לשניכם...</p>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center h-full px-6">
              <div className="text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-base font-medium text-foreground mb-1">לא מצאנו מספיק תוכן משותף</p>
                <p className="text-sm text-muted-foreground">נסו לעקוב אחרי עוד אנשים או להוסיף חיות מחמד לפרופיל</p>
              </div>
            </div>
          ) : currentPost ? (
            <motion.div
              key={currentPost.id}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              onDragEnd={handleDragEnd}
              className="relative h-[calc(100%-52px)] overflow-hidden"
            >
              {/* Post Media */}
              <div className="relative w-full h-full bg-black">
                {currentPost.video_url ? (
                  <video
                    src={currentPost.video_url}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={currentPost.media_urls?.[0] || currentPost.image_url || ""}
                    alt={currentPost.caption || ""}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Bottom gradient */}
                <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />

                {/* Partner indicator */}
                {otherUserIndex === currentIndex && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute top-3 left-3 flex items-center gap-1.5 bg-primary/90 backdrop-blur-sm px-2.5 py-1 rounded-full"
                  >
                    <Eye className="h-3 w-3 text-primary-foreground" />
                    <span className="text-[11px] font-medium text-primary-foreground">
                      {otherUserName.split(" ")[0]} כאן
                    </span>
                  </motion.div>
                )}

                {otherUserIndex !== currentIndex && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-muted/80 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    <span className="text-[11px] text-muted-foreground">
                      {otherUserName.split(" ")[0]} בפוסט {otherUserIndex + 1}
                    </span>
                  </div>
                )}

                {/* Navigation arrows */}
                {currentIndex > 0 && (
                  <button
                    onClick={() => goToPost("prev")}
                    className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 rounded-full bg-black/30 backdrop-blur-sm"
                  >
                    <ChevronUp className="h-5 w-5 text-white" />
                  </button>
                )}
                {currentIndex < posts.length - 1 && (
                  <button
                    onClick={() => goToPost("next")}
                    className="absolute top-1/2 translate-y-4 right-2 p-1.5 rounded-full bg-black/30 backdrop-blur-sm"
                  >
                    <ChevronDown className="h-5 w-5 text-white" />
                  </button>
                )}

                {/* Post info overlay */}
                <div className="absolute bottom-4 right-4 left-16">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-8 w-8 border-2 border-white">
                      <AvatarImage src={currentPost.user?.avatar_url || undefined} />
                      <AvatarFallback className="bg-muted text-xs">
                        {currentPost.user?.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-semibold text-white drop-shadow-lg">
                      {currentPost.user?.full_name || "משתמש"}
                    </span>
                  </div>
                  {currentPost.caption && (
                    <p className="text-xs text-white/90 line-clamp-2 drop-shadow-lg">
                      {currentPost.caption}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="absolute bottom-4 left-3 flex flex-col items-center gap-4">
                  <button
                    onClick={() => handleLike(currentPost.id)}
                    className="flex flex-col items-center"
                  >
                    <Heart
                      className={cn(
                        "h-7 w-7 drop-shadow-lg transition-colors",
                        liked.has(currentPost.id) ? "fill-destructive text-destructive" : "text-white"
                      )}
                    />
                  </button>
                  <button
                    onClick={() => onReaction?.(currentPost.id, "comment")}
                    className="flex flex-col items-center"
                  >
                    <MessageCircle className="h-7 w-7 text-white drop-shadow-lg" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
