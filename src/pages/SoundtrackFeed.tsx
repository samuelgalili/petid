/**
 * SoundtrackFeed - Soundtrack-style vertical feed
 * Full-screen cards with overlayed actions
 * White theme with Discover/Following tabs
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Share2, 
  MoreHorizontal,
  Play,
  User,
  Star,
  Volume2,
  VolumeX
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FeedPost {
  id: string;
  user_id: string;
  image_url: string | null;
  caption: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  user_profile?: {
    full_name: string | null;
    avatar_url: string | null;
    is_verified?: boolean;
  };
  is_liked?: boolean;
  is_saved?: boolean;
  is_following?: boolean;
  recommendation_reason?: string;
}

const SoundtrackFeed = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"discover" | "following">("discover");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      let postsQuery = supabase
        .from("posts")
        .select(`id, user_id, image_url, caption, created_at`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (activeTab === "following" && user) {
        const { data: following } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", user.id);
        
        const followingIds = following?.map(f => f.following_id) || [];
        if (followingIds.length > 0) {
          postsQuery = postsQuery.in("user_id", followingIds);
        }
      }

      const { data: postsData, error } = await postsQuery;
      if (error) throw error;

      if (postsData && postsData.length > 0) {
        const userIds = [...new Set(postsData.map(p => p.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        let likedPostIds: string[] = [];
        let savedPostIds: string[] = [];
        let followingIds: string[] = [];

        if (user) {
          const [likesRes, savesRes, followsRes] = await Promise.all([
            supabase.from("post_likes").select("post_id").eq("user_id", user.id),
            supabase.from("saved_posts").select("post_id").eq("user_id", user.id),
            supabase.from("user_follows").select("following_id").eq("follower_id", user.id)
          ]);
          
          likedPostIds = likesRes.data?.map(l => l.post_id) || [];
          savedPostIds = savesRes.data?.map(s => s.post_id) || [];
          followingIds = followsRes.data?.map(f => f.following_id) || [];
        }

        // Count likes and comments for each post
        const postIds = postsData.map(p => p.id);
        const [likesCount, commentsCount] = await Promise.all([
          supabase.from("post_likes").select("post_id").in("post_id", postIds),
          supabase.from("post_comments").select("post_id").in("post_id", postIds)
        ]);

        const likesMap: Record<string, number> = {};
        const commentsMap: Record<string, number> = {};
        likesCount.data?.forEach(l => { likesMap[l.post_id] = (likesMap[l.post_id] || 0) + 1; });
        commentsCount.data?.forEach(c => { commentsMap[c.post_id] = (commentsMap[c.post_id] || 0) + 1; });

        const enrichedPosts: FeedPost[] = postsData.map(post => ({
          id: post.id,
          user_id: post.user_id,
          image_url: post.image_url,
          caption: post.caption,
          created_at: post.created_at,
          likes_count: likesMap[post.id] || 0,
          comments_count: commentsMap[post.id] || 0,
          user_profile: profiles?.find(p => p.id === post.user_id) || undefined,
          is_liked: likedPostIds.includes(post.id),
          is_saved: savedPostIds.includes(post.id),
          is_following: followingIds.includes(post.user_id),
          recommendation_reason: activeTab === "discover" ? "בשבילך" : undefined
        }));

        setPosts(enrichedPosts);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleLike = async (postId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isLiked = post.is_liked;

    // Optimistic update
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, is_liked: !isLiked, likes_count: p.likes_count + (isLiked ? -1 : 1) }
        : p
    ));

    try {
      if (isLiked) {
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
      }
    } catch (error) {
      // Revert on error
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, is_liked: isLiked, likes_count: p.likes_count + (isLiked ? 1 : -1) }
          : p
      ));
    }
  };

  const handleSave = async (postId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isSaved = post.is_saved;

    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, is_saved: !isSaved } : p
    ));

    try {
      if (isSaved) {
        await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("saved_posts").insert({ post_id: postId, user_id: user.id });
      }
      toast.success(isSaved ? "הוסר מהשמורים" : "נשמר!");
    } catch (error) {
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, is_saved: isSaved } : p
      ));
    }
  };

  const handleFollow = async (userId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const isFollowing = posts.find(p => p.user_id === userId)?.is_following;

    setPosts(prev => prev.map(p => 
      p.user_id === userId ? { ...p, is_following: !isFollowing } : p
    ));

    try {
      if (isFollowing) {
        await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", userId);
      } else {
        await supabase.from("user_follows").insert({ follower_id: user.id, following_id: userId });
      }
    } catch (error) {
      setPosts(prev => prev.map(p => 
        p.user_id === userId ? { ...p, is_following: isFollowing } : p
      ));
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const cardHeight = window.innerHeight - 56 - 70; // header + bottom nav
    const newIndex = Math.round(scrollTop / cardHeight);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden" dir="rtl">
      {/* Header with Tabs */}
      <motion.header 
        className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center justify-center h-14 relative">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "discover" | "following")}>
            <TabsList className="bg-transparent gap-6">
              <TabsTrigger 
                value="discover" 
                className={cn(
                  "bg-transparent border-0 shadow-none text-base font-semibold px-0 py-2",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  activeTab === "discover" 
                    ? "text-foreground border-b-2 border-foreground rounded-none" 
                    : "text-muted-foreground"
                )}
              >
                גלה
              </TabsTrigger>
              <TabsTrigger 
                value="following" 
                className={cn(
                  "bg-transparent border-0 shadow-none text-base font-semibold px-0 py-2",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  activeTab === "following" 
                    ? "text-foreground border-b-2 border-foreground rounded-none" 
                    : "text-muted-foreground"
                )}
              >
                עוקבים
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* More button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-4 top-1/2 -translate-y-1/2"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </motion.header>

      {/* Feed Cards */}
      <div 
        ref={containerRef}
        className="h-full pt-14 pb-[70px] overflow-y-auto snap-y snap-mandatory"
        onScroll={handleScroll}
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {posts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <p className="text-lg">אין פוסטים להצגה</p>
            <p className="text-sm mt-2">
              {activeTab === "following" ? "עקוב אחרי משתמשים כדי לראות את הפוסטים שלהם" : "בקרוב יופיעו כאן פוסטים"}
            </p>
          </div>
        ) : (
          posts.map((post, index) => (
            <motion.div
              key={post.id}
              className="h-[calc(100vh-56px-70px)] w-full snap-start relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              {/* Post Image/Video */}
              <div className="absolute inset-0">
                {post.image_url ? (
                  <img 
                    src={post.image_url} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <p className="text-lg text-foreground/70 px-8 text-center">
                      {post.caption || "פוסט ללא תמונה"}
                    </p>
                  </div>
                )}
              </div>

              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

              {/* Tap to preview overlay (optional) */}
              {index === currentIndex && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <button 
                    onClick={() => setMuted(!muted)}
                    className="p-4 rounded-full bg-black/30 backdrop-blur-sm pointer-events-auto"
                  >
                    {muted ? (
                      <VolumeX className="w-8 h-8 text-white" />
                    ) : (
                      <Volume2 className="w-8 h-8 text-white" />
                    )}
                  </button>
                </div>
              )}

              {/* Right side actions */}
              <div className="absolute left-4 bottom-32 flex flex-col items-center gap-5">
                {/* Like */}
                <motion.button
                  onClick={() => handleLike(post.id)}
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center"
                >
                  <Heart 
                    className={cn(
                      "w-7 h-7",
                      post.is_liked ? "fill-red-500 text-red-500" : "text-white"
                    )} 
                  />
                  <span className="text-white text-xs mt-1 font-medium">
                    {post.likes_count}
                  </span>
                </motion.button>

                {/* Comment */}
                <motion.button
                  onClick={() => navigate(`/post/${post.id}`)}
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center"
                >
                  <MessageCircle className="w-7 h-7 text-white" />
                  <span className="text-white text-xs mt-1 font-medium">
                    {post.comments_count}
                  </span>
                </motion.button>

                {/* Save */}
                <motion.button
                  onClick={() => handleSave(post.id)}
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center"
                >
                  <Bookmark 
                    className={cn(
                      "w-7 h-7",
                      post.is_saved ? "fill-white text-white" : "text-white"
                    )} 
                  />
                </motion.button>

                {/* Share */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center"
                >
                  <Share2 className="w-7 h-7 text-white" />
                </motion.button>
              </div>

              {/* Bottom info panel */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                {/* Recommendation reason */}
                {post.recommendation_reason && (
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-white/80 text-xs">
                      {post.recommendation_reason}
                    </span>
                  </div>
                )}

                {/* Caption */}
                {post.caption && (
                  <p className="text-white font-medium text-base mb-3 line-clamp-2">
                    {post.caption}
                  </p>
                )}

                {/* User info bar */}
                <div className="flex items-center justify-between bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <Avatar 
                      className="w-10 h-10 cursor-pointer"
                      onClick={() => navigate(`/user/${post.user_id}`)}
                    >
                      <AvatarImage src={post.user_profile?.avatar_url || ""} />
                      <AvatarFallback>
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1">
                        <span 
                          className="font-semibold text-foreground cursor-pointer"
                          onClick={() => navigate(`/user/${post.user_id}`)}
                        >
                          {post.user_profile?.full_name || "משתמש"}
                        </span>
                        {post.user_profile?.is_verified && (
                          <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-[8px]">✓</span>
                          </span>
                        )}
                      </div>
                    </div>
                    {!post.is_following && post.user_id !== user?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-4 text-xs font-semibold rounded-full"
                        onClick={() => handleFollow(post.user_id)}
                      >
                        עקוב
                      </Button>
                    )}
                  </div>

                  {/* Play button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center"
                    onClick={() => navigate(`/post/${post.id}`)}
                  >
                    <Play className="w-5 h-5 text-background fill-background mr-[-2px]" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default SoundtrackFeed;
