import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Grid3X3, Play, Heart, MessageCircle, Plus, Image as ImageIcon } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { motion } from "framer-motion";
import { CreatePostDialog } from "@/components/CreatePostDialog";

interface Post {
  id: string;
  image_url: string | null;
  video_url: string | null;
  caption: string | null;
  media_type: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

export default function Photos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "images" | "videos">("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

  const fetchPosts = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch user's posts
      const { data: postsData, error } = await supabase
        .from("posts")
        .select("id, image_url, video_url, caption, media_type, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch likes and comments counts for each post
      const postsWithCounts = await Promise.all(
        (postsData || []).map(async (post) => {
          const [likesResult, commentsResult] = await Promise.all([
            supabase
              .from("post_likes")
              .select("id", { count: "exact", head: true })
              .eq("post_id", post.id),
            supabase
              .from("post_comments")
              .select("id", { count: "exact", head: true })
              .eq("post_id", post.id),
          ]);

          return {
            ...post,
            likes_count: likesResult.count || 0,
            comments_count: commentsResult.count || 0,
          };
        })
      );

      setPosts(postsWithCounts);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter((post) => {
    if (filter === "all") return true;
    if (filter === "images") return post.media_type === "image" || !post.video_url;
    if (filter === "videos") return post.media_type === "video" || post.video_url;
    return true;
  });

  const handlePostClick = (postId: string) => {
    navigate(`/post/${postId}`);
  };

  const handleCreatePost = () => {
    setShowCreateDialog(true);
  };

  const handlePostCreated = () => {
    fetchPosts();
  };

  return (
    <>
      <AppHeader 
        title="האלבום שלי" 
        showBackButton={true}
        showMenuButton={false}
        extraAction={{
          icon: Plus,
          onClick: handleCreatePost
        }}
      />
      
      <div className="min-h-screen bg-background pb-24">
        {/* Filter Tabs */}
        <div className="bg-background border-b sticky top-16 z-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-center gap-8 py-3">
              <button
                onClick={() => setFilter("all")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                  filter === "all"
                    ? "text-foreground border-b-2 border-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Grid3X3 className="w-5 h-5" />
                <span>הכל</span>
              </button>
              <button
                onClick={() => setFilter("images")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                  filter === "images"
                    ? "text-foreground border-b-2 border-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ImageIcon className="w-5 h-5" />
                <span>תמונות</span>
              </button>
              <button
                onClick={() => setFilter("videos")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                  filter === "videos"
                    ? "text-foreground border-b-2 border-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Play className="w-5 h-5" />
                <span>סרטונים</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-center gap-8 text-center">
            <div>
              <p className="text-xl font-bold text-foreground">{posts.length}</p>
              <p className="text-sm text-muted-foreground">פוסטים</p>
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {posts.reduce((sum, post) => sum + post.likes_count, 0)}
              </p>
              <p className="text-sm text-muted-foreground">לייקים</p>
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {posts.reduce((sum, post) => sum + post.comments_count, 0)}
              </p>
              <p className="text-sm text-muted-foreground">תגובות</p>
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="max-w-7xl mx-auto px-1">
          {loading ? (
            <div className="grid grid-cols-3 gap-0.5">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="aspect-square bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {filter === "all" ? "עדיין אין פוסטים" : filter === "images" ? "אין תמונות" : "אין סרטונים"}
              </h3>
              <p className="text-muted-foreground mb-6 text-sm">
                שתף את הרגעים המיוחדים עם חיות המחמד שלך
              </p>
              <Button
                onClick={handleCreatePost}
                className="bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-90 text-white rounded-xl"
              >
                <Plus className="w-4 h-4 ml-2" />
                צור פוסט חדש
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5">
              {filteredPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative aspect-square bg-muted cursor-pointer group"
                  onClick={() => handlePostClick(post.id)}
                >
                  <img
                    src={post.image_url || post.video_url || ""}
                    alt={post.caption || "Post"}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Video indicator */}
                  {(post.media_type === "video" || post.video_url) && (
                    <div className="absolute top-2 right-2">
                      <Play className="w-5 h-5 text-white drop-shadow-lg" fill="white" />
                    </div>
                  )}
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                    <div className="flex items-center gap-1.5 text-white">
                      <Heart className="w-5 h-5" fill="white" />
                      <span className="font-semibold">{post.likes_count}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-white">
                      <MessageCircle className="w-5 h-5" fill="white" />
                      <span className="font-semibold">{post.comments_count}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onPostCreated={handlePostCreated}
      />
    </>
  );
}
