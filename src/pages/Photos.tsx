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
  Trash2, 
  Check,
  Camera,
  Bookmark,
  Copy,
  Sparkles,
  ImagePlus
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { HighlightsSection } from "@/components/HighlightsSection";
import { motion, AnimatePresence } from "framer-motion";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
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
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const totalComments = posts.reduce((sum, post) => sum + post.comments_count, 0);

  const tabs = [
    { key: "posts" as const, icon: Grid3X3, label: "פוסטים" },
    { key: "saved" as const, icon: Bookmark, label: "שמורים" },
    { key: "tagged" as const, icon: Copy, label: "תיוגים" },
  ];

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
      
      <div className="min-h-screen bg-background pb-20" dir="rtl">
        {/* Hero Header */}
        <div className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/8 rounded-full blur-3xl" />
          
          <div className="relative px-5 pt-4 pb-6">
            {/* Title Row */}
            <div className="flex items-center gap-3 mb-5">
              <motion.div 
                className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"
                whileTap={{ scale: 0.95 }}
              >
                <Camera className="w-6 h-6 text-primary" strokeWidth={1.5} />
              </motion.div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-foreground">האלבום שלי</h1>
                <p className="text-sm text-muted-foreground">הרגעים המיוחדים שלי</p>
              </div>
            </div>
            
            {/* Stats Row */}
            <div className="flex items-stretch gap-2">
              <StatCard value={posts.length} label="פוסטים" />
              <StatCard value={totalLikes} label="לייקים" icon={<Heart className="w-3.5 h-3.5 text-[hsl(var(--petid-coral))]" />} />
              <StatCard value={totalComments} label="תגובות" icon={<MessageCircle className="w-3.5 h-3.5 text-primary" />} />
              
              {/* Upload Button */}
              <motion.button
                onClick={() => setShowCreateDialog(true)}
                className="flex-1 flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors min-h-[72px]"
                whileTap={{ scale: 0.95 }}
              >
                <ImagePlus className="w-5 h-5 text-primary" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-primary">העלאה</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Highlights Section */}
        {user && (
          <HighlightsSection userId={user.id} isOwnProfile={true} />
        )}

        {/* Tabs */}
        <div className="flex border-b border-border sticky top-16 z-10 bg-background/80 backdrop-blur-md">
          {tabs.map(tab => {
            const isActive = filter === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-all relative ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-[10px] font-medium">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="photos-tab-indicator"
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Gallery Content */}
        <div className="w-full">
          {loading ? (
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {[...Array(12)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-none" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <EmptyAlbumState filter={filter} onUpload={() => setShowCreateDialog(true)} />
          ) : filter !== "posts" ? (
            <EmptyAlbumState filter={filter} onUpload={() => setShowCreateDialog(true)} />
          ) : (
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              <AnimatePresence>
                {posts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: 1, 
                      scale: pressedPostId === post.id ? 0.96 : 1 
                    }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.015, duration: 0.2 }}
                    className="relative aspect-square bg-muted cursor-pointer overflow-hidden group"
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
                          ? "scale-[0.88] rounded-xl brightness-75" 
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
                          className="absolute inset-0 bg-background/20"
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
                              : "bg-background/40 border-white backdrop-blur-sm"
                          }`}
                        >
                          {selectedPosts.has(post.id) && (
                            <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Video Indicator */}
                    {(post.media_type === "video" || post.video_url) && !selectionMode && (
                      <div className="absolute top-2 right-2 bg-background/30 backdrop-blur-sm rounded-full p-1">
                        <Play className="w-3.5 h-3.5 text-white" fill="white" />
                      </div>
                    )}
                    
                    {/* Hover Overlay - Desktop */}
                    {!selectionMode && (
                      <div className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-5 max-sm:hidden">
                        <div className="flex items-center gap-1.5 text-white">
                          <Heart className="w-5 h-5" fill="white" strokeWidth={1.5} />
                          <span className="font-bold text-sm">{post.likes_count}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-white">
                          <MessageCircle className="w-5 h-5" fill="white" strokeWidth={1.5} />
                          <span className="font-bold text-sm">{post.comments_count}</span>
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

      {/* Floating Selection Bar */}
      <AnimatePresence>
        {selectionMode && selectedPosts.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 bg-card border border-border rounded-2xl shadow-xl p-3 z-50"
            dir="rtl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exitSelectionMode}
                  className="text-muted-foreground hover:text-foreground rounded-xl text-xs"
                >
                  ביטול
                </Button>
                <div className="h-4 w-px bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  className="text-primary hover:bg-primary/10 rounded-xl text-xs"
                  disabled={selectedPosts.size === posts.length}
                >
                  בחר הכל
                </Button>
              </div>
              <Button
                size="sm"
                onClick={() => setShowMultiDeleteDialog(true)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl px-4 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 ml-1" />
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
            className="fixed bottom-24 left-0 right-0 text-center text-[11px] text-muted-foreground"
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
              className="bg-destructive hover:bg-destructive/90 rounded-xl"
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
              className="bg-destructive hover:bg-destructive/90 rounded-xl"
            >
              {deleting ? "מוחק..." : `מחק ${selectedPosts.size} פוסטים`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ── Sub-components ── */

function StatCard({ value, label, icon }: { value: number; label: string; icon?: React.ReactNode }) {
  return (
    <motion.div 
      className="flex-1 bg-card border border-border rounded-2xl px-3 py-3 text-center min-h-[72px] flex flex-col items-center justify-center"
      whileTap={{ scale: 0.95 }}
    >
      <div className="flex items-center gap-1 justify-center">
        {icon}
        <span className="text-xl font-bold text-foreground">{value}</span>
      </div>
      <span className="text-[11px] text-muted-foreground mt-0.5">{label}</span>
    </motion.div>
  );
}

function EmptyAlbumState({ filter, onUpload }: { filter: string; onUpload: () => void }) {
  if (filter === "saved") {
    return (
      <motion.div 
        className="flex flex-col items-center justify-center py-20 px-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
          <Bookmark className="w-9 h-9 text-primary" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">אין פוסטים שמורים</h3>
        <p className="text-muted-foreground text-sm text-center max-w-[260px]">
          פוסטים ששמרת יופיעו כאן
        </p>
      </motion.div>
    );
  }
  
  if (filter === "tagged") {
    return (
      <motion.div 
        className="flex flex-col items-center justify-center py-20 px-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
          <Copy className="w-9 h-9 text-primary" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">אין תיוגים</h3>
        <p className="text-muted-foreground text-sm text-center max-w-[260px]">
          פוסטים שתויגת בהם יופיעו כאן
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="flex flex-col items-center justify-center py-20 px-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="relative mb-5">
        <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
          <Camera className="w-11 h-11 text-primary" strokeWidth={1.5} />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-accent-foreground" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="text-xl font-bold text-foreground mb-1">שתף תמונות</h3>
      <p className="text-muted-foreground text-sm text-center mb-6 max-w-[260px]">
        כשתשתף תמונות, הן יופיעו באלבום שלך
      </p>
      <Button
        onClick={onUpload}
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 shadow-md"
      >
        <Plus className="w-4 h-4 ml-2" />
        שתף את התמונה הראשונה
      </Button>
    </motion.div>
  );
}
