import { Heart, MessageCircle, Share2, Bookmark, Camera, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { StoriesBar } from "@/components/StoriesBar";

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
}

const Feed = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [createPostOpen, setCreatePostOpen] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    
    try {
      // Fetch posts with user profiles in a single query using joins
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
        .limit(20);

      if (postsError) throw postsError;

      if (postsData) {
        // Get all post IDs for batch queries
        const postIds = postsData.map(p => p.id);

        // Batch fetch likes count for all posts
        const { data: likesData } = await supabase
          .from("post_likes")
          .select("post_id")
          .in("post_id", postIds);

        // Batch fetch comments count for all posts
        const { data: commentsData } = await supabase
          .from("post_comments")
          .select("post_id")
          .in("post_id", postIds);

        // Batch fetch user's likes if authenticated
        let userLikes: string[] = [];
        if (user) {
          const { data: userLikesData } = await supabase
            .from("post_likes")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", postIds);
          
          userLikes = userLikesData?.map(l => l.post_id) || [];
        }

        // Count likes and comments per post
        const likesCount = likesData?.reduce((acc: any, like: any) => {
          acc[like.post_id] = (acc[like.post_id] || 0) + 1;
          return acc;
        }, {}) || {};

        const commentsCount = commentsData?.reduce((acc: any, comment: any) => {
          acc[comment.post_id] = (acc[comment.post_id] || 0) + 1;
          return acc;
        }, {}) || {};

        // Format posts with aggregated data
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
        }));

        setPosts(formattedPosts);
      }
    } catch (error: any) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;

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
        // Unlike
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        
        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from("post_likes")
          .insert({ post_id: postId, user_id: user.id });
        
        if (error) throw error;
      }
    } catch (error: any) {
      // Revert on error
      setPosts(posts.map(p =>
        p.id === postId
          ? { ...p, is_liked: post.is_liked, likes_count: post.likes_count }
          : p
      ));
      console.error("Error toggling like:", error);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "עכשיו";
    if (seconds < 3600) return `לפני ${Math.floor(seconds / 60)} דקות`;
    if (seconds < 86400) return `לפני ${Math.floor(seconds / 3600)} שעות`;
    if (seconds < 604800) return `לפני ${Math.floor(seconds / 86400)} ימים`;
    return date.toLocaleDateString("he-IL");
  };

  return (
    <div className="min-h-screen bg-white pb-24" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 font-jakarta">
            רשת חיות המחמד
          </h1>
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-full"
            onClick={() => setCreatePostOpen(true)}
          >
            <Camera className="w-6 h-6 text-gray-700" />
          </Button>
        </div>
      </div>

      {/* Stories Bar */}
      <StoriesBar />

      {/* Feed */}
      <div className="max-w-2xl mx-auto">
        {loading ? (
          // Loading skeleton
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white mb-1 border-b border-gray-100 p-4">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="w-full aspect-square" />
              <div className="mt-4 space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))
        ) : posts.length === 0 ? (
          // Empty state
          <div className="text-center py-16 px-4">
            <p className="text-gray-500 font-jakarta text-lg mb-4">
              עדיין אין פוסטים
            </p>
            <p className="text-gray-400 font-jakarta text-sm">
              שתפו תמונות וסיפורים של חיות המחמד שלכם 🐕🐈
            </p>
          </div>
        ) : (
          posts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white mb-1 border-b border-gray-100"
          >
            {/* Post Header */}
            <div className="flex items-center justify-between p-4">
              <div 
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => navigate(`/user/${post.user.id}`)}
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={post.user.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-white">
                    {post.user.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-gray-900 font-jakarta">{post.user.full_name}</p>
                  <p className="text-sm text-gray-500 font-jakarta">{getTimeAgo(post.created_at)}</p>
                </div>
              </div>
              <button className="text-gray-600 hover:text-gray-900">
                <span className="text-2xl">⋯</span>
              </button>
            </div>

            {/* Post Image */}
            <div 
              className="w-full aspect-square bg-gray-100 relative overflow-hidden cursor-pointer"
              onClick={() => navigate(`/post/${post.id}`)}
            >
              <img 
                src={post.image_url} 
                alt={post.caption || ""}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Post Actions */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-2 transition-colors ${
                      post.is_liked ? 'text-red-500' : 'text-gray-700 hover:text-red-500'
                    }`}
                  >
                    <Heart className={`w-6 h-6 ${post.is_liked ? 'fill-current' : ''}`} />
                    <span className="font-semibold font-jakarta">{post.likes_count}</span>
                  </button>
                  <button 
                    className="flex items-center gap-2 text-gray-700 hover:text-blue-500 transition-colors"
                    onClick={() => navigate(`/post/${post.id}`)}
                  >
                    <MessageCircle className="w-6 h-6" />
                    <span className="font-semibold font-jakarta">{post.comments_count}</span>
                  </button>
                  <button className="text-gray-700 hover:text-green-500 transition-colors">
                    <Share2 className="w-6 h-6" />
                  </button>
                </div>
                <button className="text-gray-700 hover:text-yellow-500 transition-colors">
                  <Bookmark className="w-6 h-6" />
                </button>
              </div>

              {/* Liked by */}
              {post.likes_count > 0 && (
                <div className="mb-2">
                  <p className="text-sm text-gray-900 font-jakarta">
                    אהבו על ידי{" "}
                    <span className="font-semibold cursor-pointer hover:underline">
                      {post.user.full_name}
                    </span>
                    {post.likes_count > 1 && (
                      <>
                        {" "}ועוד{" "}
                        <span className="font-semibold">
                          {post.likes_count - 1}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Post Caption */}
              <div className="mb-2">
                <p className="text-gray-900 font-jakarta">
                  <span 
                    className="font-semibold cursor-pointer hover:underline"
                    onClick={() => navigate(`/user/${post.user.id}`)}
                  >
                    {post.user.full_name}
                  </span>{" "}
                  {post.caption}
                </p>
              </div>

              {/* View Comments */}
              {post.comments_count > 0 && (
                <button 
                  className="text-gray-500 text-sm font-jakarta hover:text-gray-700"
                  onClick={() => navigate(`/post/${post.id}`)}
                >
                  הצג את כל {post.comments_count} התגובות
                </button>
              )}

              {/* Time ago */}
              <p className="text-xs text-gray-400 font-jakarta mt-1">
                {getTimeAgo(post.created_at)}
              </p>
            </div>
          </motion.div>
          ))
        )}
      </div>

      {/* Empty State Hint */}
      <div className="text-center py-8 px-4">
        <p className="text-gray-500 font-jakarta text-sm">
          שתפו תמונות וסיפורים של חיות המחמד שלכם 🐕🐈
        </p>
      </div>

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
