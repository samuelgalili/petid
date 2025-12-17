import { Heart, MessageCircle, Share2, Bookmark, Camera, Plus, TrendingUp, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { StoriesBar } from "@/components/StoriesBar";
import { toast } from "sonner";
import { PostCard } from "@/components/PostCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCardErrorBoundary } from "@/components/PostCardErrorBoundary";
import { PetishAnimations } from "@/animations/petish";

interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_saved: boolean;
}

const Feed = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const [doubleTapLike, setDoubleTapLike] = useState<string | null>(null);
  const [feedFilter, setFeedFilter] = useState<"all" | "following">("all");
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  const POSTS_PER_PAGE = 10;

  const fetchPosts = useCallback(async (pageNum: number, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setPage(0);
      setHasMore(true);
    }
    
    try {
      // Fetch following IDs if user is authenticated
      if (user && !append) {
        const { data: followingData } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", user.id);
        
        const ids = followingData?.map(f => f.following_id) || [];
        setFollowingIds(ids);
      }

      // Fetch posts with user profiles - specify exact relationship
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!posts_user_id_fkey_profiles (
            id,
            full_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false })
        .range(pageNum * POSTS_PER_PAGE, (pageNum + 1) * POSTS_PER_PAGE - 1);

      if (postsError) throw postsError;

      // Check if we have more posts
      if (!postsData || postsData.length < POSTS_PER_PAGE) {
        setHasMore(false);
      }

      if (postsData && postsData.length > 0) {
        const postIds = postsData.map(p => p.id);

        // Batch fetch likes
        const { data: likesData } = await supabase
          .from("post_likes")
          .select("post_id")
          .in("post_id", postIds);

        // Batch fetch comments
        const { data: commentsData } = await supabase
          .from("post_comments")
          .select("post_id")
          .in("post_id", postIds);

        // Fetch user's likes and saves if authenticated
        let userLikes: string[] = [];
        let userSaves: string[] = [];
        
        if (user) {
          const { data: userLikesData } = await supabase
            .from("post_likes")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", postIds);
          
          userLikes = userLikesData?.map(l => l.post_id) || [];
          
          const { data: userSavesData } = await supabase
            .from("saved_posts")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", postIds);
          
          userSaves = userSavesData?.map(s => s.post_id) || [];
        }

        // Count likes and comments
        const likesCount = likesData?.reduce((acc: any, like: any) => {
          acc[like.post_id] = (acc[like.post_id] || 0) + 1;
          return acc;
        }, {}) || {};

        const commentsCount = commentsData?.reduce((acc: any, comment: any) => {
          acc[comment.post_id] = (acc[comment.post_id] || 0) + 1;
          return acc;
        }, {}) || {};

        // Format posts - ensure profiles data is properly mapped
        const formattedPosts = postsData.map((post: any) => {
          const profile = post.profiles;
          return {
            id: post.id,
            user_id: post.user_id,
            image_url: post.image_url,
            caption: post.caption,
            created_at: post.created_at,
            user: {
              id: profile?.id || post.user_id,
              full_name: profile?.full_name || "משתמש",
              avatar_url: profile?.avatar_url || "",
            },
            likes_count: likesCount[post.id] || 0,
            comments_count: commentsCount[post.id] || 0,
            is_liked: userLikes.includes(post.id),
            is_saved: userSaves.includes(post.id),
          };
        });

        if (append) {
          setPosts(prev => [...prev, ...formattedPosts]);
        } else {
          setPosts(formattedPosts);
        }
      } else if (!append) {
        setPosts([]);
      }
    } catch (error: any) {
      console.error("Error fetching posts:", error);
      toast.error("שגיאה בטעינת ה-Petish Feed");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, POSTS_PER_PAGE]);

  useEffect(() => {
    fetchPosts(0, false);

    // Setup realtime subscription for new posts
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    
    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        () => {
          setNewPostsAvailable(true);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchPosts]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore && posts.length > 0) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchPosts(nextPage, true);
        }
      },
      { threshold: 0.5 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadingMore, hasMore, posts.length, page, fetchPosts]);

  const handleLike = useCallback(async (postId: string) => {
    if (!user) {
      toast.error("יש להתחבר כדי לאהוב פוסטים");
      return;
    }

    let previousState: { is_liked: boolean; likes_count: number } | null = null;

    // Optimistic update using functional setState
    setPosts(prevPosts => {
      const post = prevPosts.find(p => p.id === postId);
      if (!post) return prevPosts;
      
      // Store previous state for potential revert
      previousState = {
        is_liked: post.is_liked,
        likes_count: post.likes_count,
      };

      return prevPosts.map(p =>
        p.id === postId
          ? { 
              ...p, 
              is_liked: !p.is_liked, 
              likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 
            }
          : p
      );
    });

    try {
      if (previousState?.is_liked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("post_likes")
          .insert({ post_id: postId, user_id: user.id });
      }
    } catch (error: any) {
      // Revert on error using functional setState
      if (previousState) {
        setPosts(prevPosts =>
          prevPosts.map(p =>
            p.id === postId
              ? { ...p, is_liked: previousState!.is_liked, likes_count: previousState!.likes_count }
              : p
          )
        );
      }
      toast.error("שגיאה בעדכון הלייק");
    }
  }, [user]);
  
  const handleSave = useCallback(async (postId: string) => {
    if (!user) {
      toast.error("יש להתחבר כדי לשמור פוסטים");
      return;
    }

    let previousIsSaved: boolean | null = null;

    // Optimistic update using functional setState
    setPosts(prevPosts => {
      const post = prevPosts.find(p => p.id === postId);
      if (!post) return prevPosts;
      
      // Store previous state for potential revert
      previousIsSaved = post.is_saved;

      return prevPosts.map(p =>
        p.id === postId ? { ...p, is_saved: !p.is_saved } : p
      );
    });

    try {
      if (previousIsSaved) {
        await supabase
          .from("saved_posts")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        toast.success("הפוסט הוסר מהשמורים");
      } else {
        await supabase
          .from("saved_posts")
          .insert({ post_id: postId, user_id: user.id });
        toast.success("הפוסט נשמר בהצלחה");
      }
    } catch (error: any) {
      // Revert on error using functional setState
      if (previousIsSaved !== null) {
        setPosts(prevPosts =>
          prevPosts.map(p =>
            p.id === postId ? { ...p, is_saved: previousIsSaved! } : p
          )
        );
      }
      toast.error("שגיאה בשמירת הפוסט");
    }
  }, [user]);
  
  const handleDoubleTap = useCallback((postId: string) => {
    setPosts(prevPosts => {
      const post = prevPosts.find(p => p.id === postId);
      if (!post || post.is_liked) return prevPosts;
      
      // Show animation
      setDoubleTapLike(postId);
      setTimeout(() => setDoubleTapLike(null), 1000);
      
      // Trigger like
      handleLike(postId);
      
      return prevPosts;
    });
  }, [handleLike]);

  const handleLoadNewPosts = () => {
    setNewPostsAvailable(false);
    setPage(0);
    setHasMore(true);
    fetchPosts(0, false);
  };

  const getTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "עכשיו";
    if (seconds < 3600) return `לפני ${Math.floor(seconds / 60)} דקות`;
    if (seconds < 86400) return `לפני ${Math.floor(seconds / 3600)} שעות`;
    if (seconds < 604800) return `לפני ${Math.floor(seconds / 86400)} ימים`;
    return date.toLocaleDateString("he-IL");
  }, []);

  // Filter posts based on feed filter
  const filteredPosts = useMemo(() => {
    if (feedFilter === "following") {
      return posts.filter(post => followingIds.includes(post.user_id));
    }
    return posts;
  }, [posts, feedFilter, followingIds]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24" dir="rtl">
      {/* Petish Header - Premium glass effect */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="w-10" /> {/* Spacer for centering */}
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-black font-jakarta tracking-tight bg-gradient-to-r from-[#FF6B9D] via-[#C44FE2] to-[#7B68EE] bg-clip-text text-transparent"
          >
            Petish
          </motion.h1>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/messages')}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
          </motion.button>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-[60px]" />

      {/* Create Post FAB - Enhanced */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
      >
        <Button
          onClick={() => setCreatePostOpen(true)}
          className="fixed bottom-24 left-4 z-50 rounded-full w-14 h-14 bg-gradient-to-r from-[#FF6B9D] via-[#C44FE2] to-[#7B68EE] hover:opacity-90 shadow-xl shadow-purple-500/30"
          size="icon"
        >
          <Plus className="w-6 h-6 text-white" />
        </Button>
      </motion.div>

      {/* New Posts Banner - Enhanced */}
      <AnimatePresence>
        {newPostsAvailable && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="fixed top-[60px] left-0 right-0 z-40 px-4 py-3 bg-gradient-to-r from-[#FF6B9D] via-[#C44FE2] to-[#7B68EE] text-white text-center cursor-pointer shadow-lg"
            onClick={handleLoadNewPosts}
          >
            <div className="flex items-center justify-center gap-2 max-w-2xl mx-auto">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <TrendingUp className="w-5 h-5" strokeWidth={2} />
              </motion.div>
              <span className="font-bold font-jakarta">פוסטים חדשים זמינים - לחץ לטעינה</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stories Bar */}
      <div className="bg-white shadow-sm">
        <StoriesBar />
      </div>

      {/* Filter Tabs - Premium design */}
      <div className="bg-white border-b border-gray-100 sticky top-[60px] z-30">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setFeedFilter("all")}
              className={`flex-1 py-2.5 px-4 rounded-lg font-bold font-jakarta text-sm transition-all ${
                feedFilter === "all"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              הכל
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setFeedFilter("following")}
              className={`flex-1 py-2.5 px-4 rounded-lg font-bold font-jakarta text-sm transition-all flex items-center justify-center gap-2 ${
                feedFilter === "following"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              עוקבים
              {followingIds.length > 0 && (
                <span className="bg-gradient-to-r from-[#FF6B9D] to-[#C44FE2] text-white text-xs px-2 py-0.5 rounded-full">
                  {followingIds.length}
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-2xl mx-auto">
        {loading ? (
          // Premium Loading skeleton
          <div className="space-y-5 px-4 py-5">
            {[...Array(3)].map((_, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="flex items-center gap-3 p-4">
                  <Skeleton className="w-11 h-11 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-28 rounded-lg" />
                    <Skeleton className="h-3 w-16 rounded-lg" />
                  </div>
                </div>
                <Skeleton className="w-full aspect-square" />
                <div className="p-4 space-y-3">
                  <div className="flex gap-4">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <Skeleton className="h-7 w-7 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-20 rounded-lg" />
                  <Skeleton className="h-4 w-full rounded-lg" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          // Premium Empty state
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-16 px-6"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-28 h-28 bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg"
            >
              <Camera className="w-12 h-12 text-purple-400" strokeWidth={1.5} />
            </motion.div>
            <h3 className="text-xl font-black text-gray-900 font-jakarta mb-2">
              {feedFilter === "following" ? "אין פוסטים מעוקבים" : "הפיד ריק"}
            </h3>
            <p className="text-gray-500 font-jakarta text-sm mb-6 max-w-[280px] mx-auto">
              {feedFilter === "following" 
                ? "התחל לעקוב אחרי משתמשים כדי לראות את הפוסטים שלהם"
                : "שתף את הרגעים הכי חמודים של חיית המחמד שלך 🐾"}
            </p>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => setCreatePostOpen(true)}
                className="bg-gradient-to-r from-[#FF6B9D] via-[#C44FE2] to-[#7B68EE] hover:opacity-90 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-purple-500/25"
              >
                <Plus className="w-5 h-5 ml-2" strokeWidth={2} />
                צור פוסט ראשון
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          <div className="space-y-5 px-4 py-5">
            {filteredPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <PostCardErrorBoundary>
                  <PostCard
                    post={post}
                    currentUserId={user?.id}
                    onLike={handleLike}
                    onSave={handleSave}
                    onDoubleTap={handleDoubleTap}
                    showDoubleTapAnimation={doubleTapLike === post.id}
                    getTimeAgo={getTimeAgo}
                  />
                </PostCardErrorBoundary>
              </motion.div>
            ))}
            
            {/* Infinite Scroll Observer Target */}
            {hasMore && (
              <div ref={observerTarget} className="py-6 text-center">
                {loadingMore && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                    <span className="text-gray-400 font-jakarta text-sm">טוען עוד...</span>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Hint */}
      {!loading && !hasMore && filteredPosts.length > 0 && (
        <div className="text-center py-8 px-4">
          <p className="text-gray-400 font-jakarta text-sm">
            הגעת לסוף הפיד
          </p>
        </div>
      )}

      <CreatePostDialog
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        onPostCreated={() => {
          setPage(0);
          setHasMore(true);
          fetchPosts(0, false);
        }}
      />

      <BottomNav />
    </div>
  );
};

export default Feed;
