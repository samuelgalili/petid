import { Heart, MessageCircle, Share2, Bookmark, Camera, Plus, TrendingUp, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { StoriesBar } from "@/components/StoriesBar";
import { OptimizedImage } from "@/components/OptimizedImage";
import { toast } from "sonner";

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

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    
    try {
      // Fetch posts with user profiles
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!posts_user_id_fkey (
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

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-24" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FFD700] to-[#FFC107] sticky top-0 z-10 px-4 py-4 shadow-md">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-gray-900" />
            <h1 className="text-2xl font-black text-gray-900 font-jakarta">
              הפיד שלי
            </h1>
          </div>
          <Button 
            size="icon"
            className="rounded-full bg-gray-900 hover:bg-gray-800 text-white shadow-lg w-12 h-12"
            onClick={() => setCreatePostOpen(true)}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* New Posts Banner */}
      <AnimatePresence>
        {newPostsAvailable && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="sticky top-[72px] z-10 px-4 py-3 bg-blue-500 text-white text-center cursor-pointer shadow-md"
            onClick={handleLoadNewPosts}
          >
            <div className="flex items-center justify-center gap-2 max-w-2xl mx-auto">
              <TrendingUp className="w-5 h-5" />
              <span className="font-bold font-jakarta">פוסטים חדשים זמינים - לחץ לטעינה</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stories Bar */}
      <StoriesBar />

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
        ) : posts.length === 0 ? (
          // Empty state
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 px-4"
          >
            <div className="w-32 h-32 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Camera className="w-16 h-16 text-gray-400" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 font-jakarta mb-3">
              אין פוסטים עדיין
            </h3>
            <p className="text-gray-500 font-jakarta text-base mb-6">
              התחל לשתף תמונות וסיפורים של חיות המחמד שלך 🐕🐈
            </p>
            <Button
              onClick={() => setCreatePostOpen(true)}
              className="bg-gradient-to-r from-[#FFD700] to-[#FFC107] hover:from-[#FFC107] hover:to-[#FFB700] text-gray-900 font-bold shadow-lg"
            >
              <Plus className="w-5 h-5 ml-2" />
              צור פוסט ראשון
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4 px-4 py-4">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-3xl shadow-md overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Post Header */}
                <div className="flex items-center justify-between p-4">
                  <div 
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => navigate(`/user/${post.user.id}`)}
                  >
                    <Avatar className="w-12 h-12 ring-2 ring-gray-100">
                      <AvatarImage src={post.user.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-white font-black">
                        {post.user.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-black text-gray-900 font-jakarta">{post.user.full_name}</p>
                      <p className="text-sm text-gray-500 font-jakarta">{getTimeAgo(post.created_at)}</p>
                    </div>
                  </div>
                  <button className="text-gray-600 hover:text-gray-900 p-2">
                    <span className="text-2xl">⋯</span>
                  </button>
                </div>

                {/* Post Image */}
                <div className="relative">
                  <OptimizedImage
                    src={post.image_url}
                    alt={post.caption || "פוסט"}
                    className="w-full aspect-square cursor-pointer"
                    objectFit="cover"
                    sizes="(max-width: 768px) 100vw, 672px"
                    onClick={() => navigate(`/post/${post.id}`)}
                  />
                </div>

                {/* Post Actions */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-5">
                      <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-2 transition-colors ${
                          post.is_liked ? 'text-red-500' : 'text-gray-700'
                        }`}
                      >
                        <Heart className={`w-7 h-7 ${post.is_liked ? 'fill-current' : ''}`} />
                        {post.likes_count > 0 && (
                          <span className="font-black font-jakarta">{post.likes_count}</span>
                        )}
                      </motion.button>
                      
                      <motion.button 
                        whileTap={{ scale: 0.9 }}
                        className="flex items-center gap-2 text-gray-700"
                        onClick={() => navigate(`/post/${post.id}`)}
                      >
                        <MessageCircle className="w-7 h-7" />
                        {post.comments_count > 0 && (
                          <span className="font-black font-jakarta">{post.comments_count}</span>
                        )}
                      </motion.button>
                      
                      <motion.button 
                        whileTap={{ scale: 0.9 }}
                        className="text-gray-700"
                      >
                        <Share2 className="w-7 h-7" />
                      </motion.button>
                    </div>
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      className={`${post.is_saved ? 'text-yellow-500' : 'text-gray-700'}`}
                    >
                      <Bookmark className={`w-7 h-7 ${post.is_saved ? 'fill-current' : ''}`} />
                    </motion.button>
                  </div>

                  {/* Liked by */}
                  {post.likes_count > 0 && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-900 font-jakarta">
                        <span className="font-black">
                          {post.likes_count} {post.likes_count === 1 ? 'לייק' : 'לייקים'}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Post Caption */}
                  {post.caption && (
                    <div className="mb-2">
                      <p className="text-gray-900 font-jakarta">
                        <span 
                          className="font-black cursor-pointer hover:underline"
                          onClick={() => navigate(`/user/${post.user.id}`)}
                        >
                          {post.user.full_name}
                        </span>{" "}
                        {post.caption}
                      </p>
                    </div>
                  )}

                  {/* View Comments */}
                  {post.comments_count > 0 && (
                    <button 
                      className="text-gray-500 text-sm font-jakarta hover:text-gray-700 font-semibold"
                      onClick={() => navigate(`/post/${post.id}`)}
                    >
                      הצג את כל {post.comments_count} התגובות
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Hint */}
      {!loading && posts.length > 0 && (
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