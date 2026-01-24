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
  VolumeX,
  Image,
  Images,
  Video,
  Check,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FeedPost {
  id: string;
  user_id: string;
  image_url: string | null;
  media_urls?: string[] | null;
  video_url?: string | null;
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
  media_type?: 'image' | 'gallery' | 'video';
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

        const enrichedPosts: FeedPost[] = postsData.map(post => {
          // Determine media type
          const hasVideo = !!(post as any).video_url;
          const mediaUrls = (post as any).media_urls as string[] | null;
          const hasMultipleImages = mediaUrls && mediaUrls.length > 1;
          
          let mediaType: 'image' | 'gallery' | 'video' = 'image';
          if (hasVideo) mediaType = 'video';
          else if (hasMultipleImages) mediaType = 'gallery';
          
          return {
            id: post.id,
            user_id: post.user_id,
            image_url: post.image_url,
            media_urls: mediaUrls,
            video_url: (post as any).video_url,
            caption: post.caption,
            created_at: post.created_at,
            likes_count: likesMap[post.id] || 0,
            comments_count: commentsMap[post.id] || 0,
            user_profile: profiles?.find(p => p.id === post.user_id) || undefined,
            is_liked: likedPostIds.includes(post.id),
            is_saved: savedPostIds.includes(post.id),
            is_following: followingIds.includes(post.user_id),
            recommendation_reason: activeTab === "discover" ? "בשבילך" : undefined,
            media_type: mediaType
          };
        });

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
      {/* Header with Tabs - at top */}
      <motion.header 
        className="absolute top-0 left-0 right-0 z-50 pointer-events-none pt-2"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center justify-center h-10 relative pointer-events-auto">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white"
          >
            <MoreHorizontal className="w-5 h-5 drop-shadow-md" />
          </Button>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "discover" | "following")}>
            <TabsList className="bg-transparent gap-8">
              <TabsTrigger 
                value="following" 
                className={cn(
                  "bg-transparent border-0 shadow-none text-base font-semibold px-0 py-1.5",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  activeTab === "following" 
                    ? "text-white drop-shadow-md border-b-2 border-white rounded-none" 
                    : "text-white/60"
                )}
              >
                עוקבים
              </TabsTrigger>
              <TabsTrigger 
                value="discover" 
                className={cn(
                  "bg-transparent border-0 shadow-none text-base font-semibold px-0 py-1.5",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  activeTab === "discover" 
                    ? "text-white drop-shadow-md border-b-2 border-white rounded-none" 
                    : "text-white/60"
                )}
              >
                גלה
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </motion.header>

      {/* Feed Cards */}
      <div 
        ref={containerRef}
        className="h-full pb-[70px] overflow-y-auto snap-y snap-mandatory"
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
            <PostCard
              key={post.id}
              post={post}
              index={index}
              currentIndex={currentIndex}
              muted={muted}
              setMuted={setMuted}
              onLike={handleLike}
              onSave={handleSave}
              onFollow={handleFollow}
              userId={user?.id}
            />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

// Separate PostCard component for cleaner code
interface PostCardProps {
  post: FeedPost;
  index: number;
  currentIndex: number;
  muted: boolean;
  setMuted: (v: boolean) => void;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onFollow: (id: string) => void;
  userId?: string;
}

const PostCard = ({ post, index, currentIndex, muted, setMuted, onLike, onSave, onFollow, userId }: PostCardProps) => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Get all images for gallery
  const allImages = post.media_urls && post.media_urls.length > 0 
    ? post.media_urls 
    : post.image_url 
      ? [post.image_url] 
      : [];
  
  const hasMultipleImages = allImages.length > 1;
  const isVideo = post.media_type === 'video';
  
  const nextImage = () => {
    if (currentImageIndex < allImages.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    }
  };
  
  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  };

  return (
    <motion.div
      className="h-[calc(100vh-56px-70px)] w-full snap-start relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.1 }}
    >

      {/* Post Image/Video with swipe support */}
      <div className="absolute inset-0">
        {allImages.length > 0 ? (
          <div className="relative w-full h-full">
            <AnimatePresence mode="wait">
              <motion.img 
                key={currentImageIndex}
                src={allImages[currentImageIndex]} 
                alt="" 
                className="w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                drag={hasMultipleImages ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -50) nextImage();
                  if (info.offset.x > 50) prevImage();
                }}
              />
            </AnimatePresence>
            
            {/* Navigation arrows for gallery */}
            {hasMultipleImages && (
              <>
                {currentImageIndex > 0 && (
                  <button
                    onClick={prevImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 backdrop-blur-sm"
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                )}
                {currentImageIndex < allImages.length - 1 && (
                  <button
                    onClick={nextImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 backdrop-blur-sm"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <p className="text-lg text-foreground/70 px-8 text-center">
              {post.caption || "פוסט ללא תמונה"}
            </p>
          </div>
        )}
      </div>

      {/* Second row - User info on right, media icon on left */}
      <div className="absolute top-14 left-4 right-4 z-20 flex items-center justify-between">
        {/* Media type icon - left side */}
        <div className="flex items-center">
          {isVideo ? (
            <div className="p-2 rounded-lg bg-black/20 backdrop-blur-sm border border-white/20">
              <Video className="w-5 h-5 text-white" />
            </div>
          ) : hasMultipleImages ? (
            <div className="p-2 rounded-lg bg-black/20 backdrop-blur-sm border border-white/20">
              <Images className="w-5 h-5 text-white" />
            </div>
          ) : allImages.length === 1 && (
            <div className="p-2 rounded-lg bg-black/20 backdrop-blur-sm border border-white/20">
              <Image className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        {/* User info - right side */}
        <div className="flex items-center gap-2 flex-row-reverse">
          <Avatar 
            className="w-10 h-10 cursor-pointer border-2 border-white/50"
            onClick={() => navigate(`/user/${post.user_id}`)}
          >
            <AvatarImage src={post.user_profile?.avatar_url || ""} className="object-cover" />
            <AvatarFallback className="bg-white/20">
              <User className="w-5 h-5 text-white" />
            </AvatarFallback>
          </Avatar>
          <span 
            className="font-semibold text-white text-sm cursor-pointer drop-shadow-lg"
            onClick={() => navigate(`/user/${post.user_id}`)}
          >
            {post.user_profile?.full_name || "משתמש"}
          </span>
          {post.user_profile?.is_verified && (
            <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" />
            </span>
          )}
        </div>
      </div>

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 pointer-events-none" />

      {/* Sound toggle for videos */}
      {isVideo && index === currentIndex && (
        <div className="absolute top-14 right-4 z-20">
          <button 
            onClick={() => setMuted(!muted)}
            className="p-2 rounded-full bg-black/30 backdrop-blur-sm"
          >
            {muted ? (
              <VolumeX className="w-5 h-5 text-white" />
            ) : (
              <Volume2 className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      )}

      {/* Gallery progress indicator */}
      {hasMultipleImages && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {allImages.map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                i === currentImageIndex 
                  ? "w-6 bg-white" 
                  : "w-1.5 bg-white/50"
              )}
            />
          ))}
        </div>
      )}

      {/* Bottom section - centered action buttons */}
      <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center pb-4">
        <div className="flex items-center gap-8">
          <motion.button
            onClick={() => onLike(post.id)}
            whileTap={{ scale: 0.85 }}
            className="flex flex-col items-center gap-1"
          >
            <Heart 
              className={cn(
                "w-7 h-7 drop-shadow-lg",
                post.is_liked 
                  ? "fill-red-500 text-red-500" 
                  : "text-white"
              )} 
            />
            {post.likes_count > 0 && (
              <span className="text-white text-xs drop-shadow-md">{post.likes_count}</span>
            )}
          </motion.button>

          <motion.button
            onClick={() => navigate(`/post/${post.id}`)}
            whileTap={{ scale: 0.85 }}
            className="flex flex-col items-center gap-1"
          >
            <MessageCircle className="w-7 h-7 text-white drop-shadow-lg" />
            {post.comments_count > 0 && (
              <span className="text-white text-xs drop-shadow-md">{post.comments_count}</span>
            )}
          </motion.button>

          <motion.button
            onClick={() => onSave(post.id)}
            whileTap={{ scale: 0.85 }}
            className="flex flex-col items-center gap-1"
          >
            <Bookmark 
              className={cn(
                "w-7 h-7 drop-shadow-lg",
                post.is_saved 
                  ? "fill-yellow-400 text-yellow-400" 
                  : "text-white"
              )} 
            />
          </motion.button>

          <motion.button 
            whileTap={{ scale: 0.85 }}
            className="flex flex-col items-center gap-1"
          >
            <Share2 className="w-7 h-7 text-white drop-shadow-lg" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default SoundtrackFeed;
