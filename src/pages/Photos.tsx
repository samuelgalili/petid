import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Grid3X3, 
  Play, 
  Heart, 
  MessageCircle, 
  Plus, 
  Image as ImageIcon, 
  Trash2, 
  Check,
  Camera,
  Bookmark,
  Copy
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { motion, AnimatePresence } from "framer-motion";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [filter, setFilter] = useState<"posts" | "saved" | "tagged">("posts");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [showMultiDeleteDialog, setShowMultiDeleteDialog] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [pressedPostId, setPressedPostId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

  const fetchPosts = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: postsData, error } = await supabase
        .from("posts")
        .select("id, image_url, video_url, caption, media_type, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

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

  // Long press handlers for selection mode
  const handleTouchStart = useCallback((postId: string) => {
    setPressedPostId(postId);
    longPressTimer.current = setTimeout(() => {
      if (!selectionMode) {
        setSelectionMode(true);
        setSelectedPosts(new Set([postId]));
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    }, 500);
  }, [selectionMode]);

  const handleTouchEnd = useCallback(() => {
    setPressedPostId(null);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePostClick = (postId: string) => {
    if (selectionMode) {
      togglePostSelection(postId);
    } else {
      navigate(`/post/${postId}`);
    }
  };

  const togglePostSelection = (postId: string) => {
    setSelectedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
        // Exit selection mode if no posts selected
        if (newSet.size === 0) {
          setSelectionMode(false);
        }
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedPosts(new Set());
  };

  const selectAll = () => {
    setSelectedPosts(new Set(posts.map(p => p.id)));
  };

  const handleDeletePost = async () => {
    if (!deletePostId) return;
    
    setDeleting(true);
    try {
      await supabase.from("post_likes").delete().eq("post_id", deletePostId);
      await supabase.from("post_comments").delete().eq("post_id", deletePostId);
      
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", deletePostId)
        .eq("user_id", user?.id);

      if (error) throw error;

      toast.success("הפוסט נמחק בהצלחה");
      setPosts(posts.filter(p => p.id !== deletePostId));
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("שגיאה במחיקת הפוסט");
    } finally {
      setDeleting(false);
      setDeletePostId(null);
    }
  };

  const handleMultiDelete = async () => {
    if (selectedPosts.size === 0) return;
    
    setDeleting(true);
    try {
      const postIds = Array.from(selectedPosts);
      
      await supabase.from("post_likes").delete().in("post_id", postIds);
      await supabase.from("post_comments").delete().in("post_id", postIds);
      
      const { error } = await supabase
        .from("posts")
        .delete()
        .in("id", postIds)
        .eq("user_id", user?.id);

      if (error) throw error;

      toast.success(`${selectedPosts.size} פוסטים נמחקו בהצלחה`);
      setPosts(posts.filter(p => !selectedPosts.has(p.id)));
      setSelectedPosts(new Set());
      setSelectionMode(false);
    } catch (error) {
      console.error("Error deleting posts:", error);
      toast.error("שגיאה במחיקת הפוסטים");
    } finally {
      setDeleting(false);
      setShowMultiDeleteDialog(false);
    }
  };

  const totalLikes = posts.reduce((sum, post) => sum + post.likes_count, 0);

  return (
    <>
      <AppHeader 
        title={selectionMode ? `${selectedPosts.size} נבחרו` : "האלבום שלי"}
        showBackButton={!selectionMode}
        showMenuButton={false}
        extraAction={selectionMode ? {
          icon: Check,
          onClick: exitSelectionMode
        } : {
          icon: Plus,
          onClick: () => setShowCreateDialog(true)
        }}
      />
      
      <div className="min-h-screen bg-background pb-24">
        {/* Stats Section - Instagram Style */}
        <div className="px-4 py-5 border-b border-border/50">
          <div className="flex justify-around text-center">
            <motion.div 
              className="flex flex-col"
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-xl font-bold text-foreground">{posts.length}</span>
              <span className="text-xs text-muted-foreground">פוסטים</span>
            </motion.div>
            <motion.div 
              className="flex flex-col"
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-xl font-bold text-foreground">{totalLikes}</span>
              <span className="text-xs text-muted-foreground">לייקים</span>
            </motion.div>
            <motion.div 
              className="flex flex-col cursor-pointer"
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateDialog(true)}
            >
              <span className="text-xl font-bold text-primary">+</span>
              <span className="text-xs text-muted-foreground">חדש</span>
            </motion.div>
          </div>
        </div>

        {/* Instagram Style Tabs */}
        <div className="flex border-b border-border/50 sticky top-16 z-10 bg-background">
          <button
            onClick={() => setFilter("posts")}
            className={`flex-1 py-3 flex justify-center transition-all relative ${
              filter === "posts" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <Grid3X3 className="w-6 h-6" strokeWidth={filter === "posts" ? 2 : 1.5} />
            {filter === "posts" && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground"
              />
            )}
          </button>
          <button
            onClick={() => setFilter("saved")}
            className={`flex-1 py-3 flex justify-center transition-all relative ${
              filter === "saved" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <Bookmark className="w-6 h-6" strokeWidth={filter === "saved" ? 2 : 1.5} />
            {filter === "saved" && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground"
              />
            )}
          </button>
          <button
            onClick={() => setFilter("tagged")}
            className={`flex-1 py-3 flex justify-center transition-all relative ${
              filter === "tagged" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <Copy className="w-6 h-6" strokeWidth={filter === "tagged" ? 2 : 1.5} />
            {filter === "tagged" && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground"
              />
            )}
          </button>
        </div>

        {/* Gallery Grid */}
        <div className="w-full">
          {loading ? (
            <div className="grid grid-cols-3 gap-px bg-border/30">
              {[...Array(12)].map((_, i) => (
                <motion.div 
                  key={i} 
                  className="aspect-square bg-muted"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="w-full h-full animate-pulse bg-gradient-to-br from-muted to-muted-foreground/10" />
                </motion.div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <motion.div 
              className="flex flex-col items-center justify-center py-20 px-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-24 h-24 rounded-full border-2 border-foreground flex items-center justify-center mb-4">
                <Camera className="w-12 h-12 text-foreground" strokeWidth={1} />
              </div>
              <h3 className="text-2xl font-light text-foreground mb-2">שתף תמונות</h3>
              <p className="text-muted-foreground text-center text-sm mb-6 max-w-xs">
                כשתשתף תמונות, הן יופיעו בפרופיל שלך
              </p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                variant="link"
                className="text-primary font-semibold"
              >
                שתף את התמונה הראשונה שלך
              </Button>
            </motion.div>
          ) : filter !== "posts" ? (
            <motion.div 
              className="flex flex-col items-center justify-center py-20 px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-20 h-20 rounded-full border-2 border-foreground flex items-center justify-center mb-4">
                {filter === "saved" ? (
                  <Bookmark className="w-10 h-10 text-foreground" strokeWidth={1} />
                ) : (
                  <Copy className="w-10 h-10 text-foreground" strokeWidth={1} />
                )}
              </div>
              <h3 className="text-xl font-light text-foreground">
                {filter === "saved" ? "אין פוסטים שמורים" : "אין תיוגים"}
              </h3>
            </motion.div>
          ) : (
            <div className="grid grid-cols-3 gap-px bg-border/30">
              <AnimatePresence>
                {posts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ 
                      opacity: 1, 
                      scale: pressedPostId === post.id ? 0.95 : 1 
                    }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ 
                      delay: index * 0.02,
                      duration: 0.2
                    }}
                    className="relative aspect-square bg-muted cursor-pointer overflow-hidden"
                    onClick={() => handlePostClick(post.id)}
                    onTouchStart={() => handleTouchStart(post.id)}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    onMouseDown={() => handleTouchStart(post.id)}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleTouchEnd}
                  >
                    <img
                      src={post.image_url || post.video_url || ""}
                      alt={post.caption || "Post"}
                      className={`w-full h-full object-cover transition-all duration-200 ${
                        selectionMode && selectedPosts.has(post.id) 
                          ? "scale-90 rounded-lg opacity-70" 
                          : ""
                      }`}
                      loading="lazy"
                    />
                    
                    {/* Selection Overlay */}
                    <AnimatePresence>
                      {selectionMode && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-black/20"
                        />
                      )}
                    </AnimatePresence>
                    
                    {/* Selection Indicator */}
                    <AnimatePresence>
                      {selectionMode && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            selectedPosts.has(post.id)
                              ? "bg-primary border-primary"
                              : "bg-black/40 border-white"
                          }`}
                        >
                          {selectedPosts.has(post.id) && (
                            <Check className="w-4 h-4 text-white" strokeWidth={3} />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Video Indicator */}
                    {(post.media_type === "video" || post.video_url) && !selectionMode && (
                      <div className="absolute top-2 right-2">
                        <Play className="w-5 h-5 text-white drop-shadow-lg" fill="white" />
                      </div>
                    )}
                    
                    {/* Hover Overlay - Desktop only */}
                    {!selectionMode && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-6 max-sm:hidden">
                        <div className="flex items-center gap-1.5 text-white">
                          <Heart className="w-5 h-5" fill="white" />
                          <span className="font-bold">{post.likes_count}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-white">
                          <MessageCircle className="w-5 h-5" fill="white" />
                          <span className="font-bold">{post.comments_count}</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Floating Selection Bar - Instagram Style */}
      <AnimatePresence>
        {selectionMode && selectedPosts.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 bg-background/95 backdrop-blur-lg border border-border rounded-2xl shadow-2xl p-4 z-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exitSelectionMode}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ביטול
                </Button>
                <div className="h-4 w-px bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  className="text-primary"
                  disabled={selectedPosts.size === posts.length}
                >
                  בחר הכל
                </Button>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowMultiDeleteDialog(true)}
                className="rounded-full px-4"
              >
                <Trash2 className="w-4 h-4 ml-1" />
                מחק {selectedPosts.size}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Long Press Hint */}
      <AnimatePresence>
        {!selectionMode && posts.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-24 left-0 right-0 text-center text-xs text-muted-foreground"
          >
            לחץ ארוך לבחירה מרובה
          </motion.p>
        )}
      </AnimatePresence>

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onPostCreated={fetchPosts}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePostId} onOpenChange={(open) => !open && setDeletePostId(null)}>
        <AlertDialogContent dir="rtl" className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת פוסט</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את הפוסט? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel disabled={deleting} className="rounded-xl">ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 rounded-xl"
            >
              {deleting ? "מוחק..." : "מחק"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Multi-Delete Confirmation Dialog */}
      <AlertDialog open={showMultiDeleteDialog} onOpenChange={setShowMultiDeleteDialog}>
        <AlertDialogContent dir="rtl" className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת {selectedPosts.size} פוסטים</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק {selectedPosts.size} פוסטים? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel disabled={deleting} className="rounded-xl">ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMultiDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 rounded-xl"
            >
              {deleting ? "מוחק..." : `מחק ${selectedPosts.size} פוסטים`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
