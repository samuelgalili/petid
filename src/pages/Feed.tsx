import { Heart, MessageCircle, Share2, Bookmark, Camera, Plus, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { StoriesBar } from "@/components/StoriesBar";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { PostCard } from "@/components/PostCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const [doubleTapLike, setDoubleTapLike] = useState<string | null>(null);
  const [feedFilter, setFeedFilter] = useState<"all" | "following">("all");
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    
    try {
      // Fetch following IDs if user is authenticated
      if (user) {
        const { data: followingData } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", user.id);
        
        const ids = followingData?.map(f => f.following_id) || [];
        setFollowingIds(ids);
      }

      // Fetch posts with user profiles
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (
            id,
            full_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (postsError) throw postsError;

      if (postsData) {
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

        // Format posts
        const formattedPosts = postsData.map((post: any) => ({
          id: post.id,
          user_id: post.user_id,
          image_url: post.image_url,
          caption: post.caption,
          created_at: post.created_at,
          user: {
            id: post.profiles?.id || post.user_id,
            full_name: post.profiles?.full_name || "משתמש",
            avatar_url: post.profiles?.avatar_url || "",
          },
          likes_count: likesCount[post.id] || 0,
          comments_count: commentsCount[post.id] || 0,
          is_liked: userLikes.includes(post.id),
          is_saved: userSaves.includes(post.id),
        }));

        setPosts(formattedPosts);
      }
    } catch (error: any) {
      console.error("Error fetching posts:", error);
      toast.error("שגיאה בטעינת הפיד");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPosts();

    // Setup realtime subscription for new posts
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  const handleLike = useCallback(async (postId: string) => {
    if (!user) {
      toast.error("יש להתחבר כדי לאהוב פוסטים");
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Optimistic update
    setPosts(posts.map(p =>
      p.id === postId
        ? { 
            ...p, 
            is_liked: !p.is_liked, 
            likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 
          }
        : p
    ));

    try {
      if (post.is_liked) {
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
      // Revert on error
      setPosts(posts.map(p =>
        p.id === postId
          ? { ...p, is_liked: post.is_liked, likes_count: post.likes_count }
          : p
      ));
      toast.error("שגיאה בעדכון הלייק");
    }
  }, [user, posts]);
  
  const handleSave = useCallback(async (postId: string) => {
    if (!user) {
      toast.error("יש להתחבר כדי לשמור פוסטים");
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Optimistic update
    setPosts(posts.map(p =>
      p.id === postId ? { ...p, is_saved: !p.is_saved } : p
    ));

    try {
      if (post.is_saved) {
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
      // Revert on error
      setPosts(posts.map(p =>
        p.id === postId ? { ...p, is_saved: post.is_saved } : p
      ));
      toast.error("שגיאה בשמירת הפוסט");
    }
  }, [user, posts]);
  
  const handleDoubleTap = useCallback((postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post || post.is_liked) return;
    
    // Show animation
    setDoubleTapLike(postId);
    setTimeout(() => setDoubleTapLike(null), 1000);
    
    // Trigger like
    handleLike(postId);
  }, [posts, handleLike]);

  const handleLoadNewPosts = () => {
    setNewPostsAvailable(false);
    fetchPosts();
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
    <div className="min-h-screen bg-white pb-24" dir="rtl">
      <AppHeader 
        title="הפיד שלי" 
        showBackButton={true}
        extraAction={{
          icon: Plus,
          onClick: () => setCreatePostOpen(true)
        }}
      />

      {/* New Posts Banner */}
      <AnimatePresence>
        {newPostsAvailable && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-[56px] left-0 right-0 z-50 px-4 py-3 bg-blue-500 text-white text-center cursor-pointer shadow-md"
            onClick={handleLoadNewPosts}
          >
            <div className="flex items-center justify-center gap-2 max-w-2xl mx-auto">
              <TrendingUp className="w-5 h-5" strokeWidth={1.5} />
              <span className="font-bold font-jakarta">פוסטים חדשים זמינים - לחץ לטעינה</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stories Bar */}
      <div className="bg-white">
        <StoriesBar />
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-2">
          <Tabs value={feedFilter} onValueChange={(value) => setFeedFilter(value as "all" | "following")}>
            <TabsList className="w-full grid grid-cols-2 font-jakarta bg-gray-100">
              <TabsTrigger value="all" className="font-black data-[state=active]:bg-white">
                הכל
              </TabsTrigger>
              <TabsTrigger value="following" className="font-black data-[state=active]:bg-white">
                עוקבים ({followingIds.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-2xl mx-auto">
        {loading ? (
          // Loading skeleton
          <div className="space-y-4 px-4 py-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl shadow-md overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="w-full aspect-square" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          // Empty state
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 px-4"
          >
            <div className="w-32 h-32 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Camera className="w-16 h-16 text-gray-400" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 font-jakarta mb-3">
              {feedFilter === "following" ? "אין פוסטים מעוקבים" : "אין פוסטים עדיין"}
            </h3>
            <p className="text-gray-500 font-jakarta text-base mb-6">
              {feedFilter === "following" 
                ? "עקוב אחרי משתמשים כדי לראות את הפוסטים שלהם כאן"
                : "התחל לשתף תמונות וסיפורים של חיות המחמד שלך 🐕🐈"}
            </p>
            <Button
              onClick={() => setCreatePostOpen(true)}
              className="bg-accent hover:bg-accent-hover text-text-inverse font-bold shadow-lg"
            >
              <Plus className="w-5 h-5 ml-2" strokeWidth={1.5} />
              צור פוסט ראשון
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4 px-4 py-4">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                onLike={handleLike}
                onSave={handleSave}
                onDoubleTap={handleDoubleTap}
                showDoubleTapAnimation={doubleTapLike === post.id}
                getTimeAgo={getTimeAgo}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Hint */}
      {!loading && filteredPosts.length > 0 && (
        <div className="text-center py-8 px-4">
          <p className="text-gray-400 font-jakarta text-sm">
            הגעת לסוף הפיד
          </p>
        </div>
      )}

      <CreatePostDialog
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        onPostCreated={fetchPosts}
      />

      <BottomNav />
    </div>
  );
};

export default Feed;
