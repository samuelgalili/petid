import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Share2, Bookmark, MoreVertical, Flag, ShoppingBag, Link2, EyeOff, Send, Heart, Home, Mail, Trash2, Repeat2, PlusCircle } from "lucide-react";
import pawHeartIcon from "@/assets/paw-heart-icon.png";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useState, useEffect, useCallback, useRef } from "react";
import { haptic } from "@/lib/haptics";
import { useNavigate } from "react-router-dom";
import { useFollow } from "@/hooks/useFollow";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ReportDialog } from "@/components/ReportDialog";
import { ProductTagOverlay } from "@/components/post/ProductTagOverlay";
import { HeartBurstAnimation } from "@/components/post/HeartBurstAnimation";
import { ImageCarousel } from "@/components/post/ImageCarousel";
import { CommentsPreview } from "@/components/post/CommentsPreview";
import { RichCaption } from "@/components/post/RichCaption";
import { CommentsPreviewSection } from "@/components/post/CommentsPreviewSection";
import { LocationTag } from "@/components/post/LocationTag";
import { ViewsCounter } from "@/components/post/ViewsCounter";
import { RepostButton } from "@/components/post/RepostButton";
import { ShareToStoryButton } from "@/components/post/ShareToStoryButton";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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


interface ProductTag {
  id: string;
  product_id: string;
  position_x: number;
  position_y: number;
  product?: {
    id: string;
    name: string;
    price: number;
    image_url: string;
    business_id: string;
  };
}

interface PostCardProps {
  post: {
    id: string;
    user_id: string;
    image_url: string;
    media_urls?: string[];
    caption: string;
    created_at: string;
    location_name?: string;
    views_count?: number;
    video_url?: string;
    media_type?: string;
    user: {
      id: string;
      full_name: string;
      avatar_url: string;
    };
    likes_count: number;
    comments_count: number;
    is_liked: boolean;
    is_saved: boolean;
    product_tags?: ProductTag[];
  };
  currentUserId?: string;
  currentUserAvatar?: string;
  onLike: (postId: string) => void;
  onSave: (postId: string) => void;
  onDoubleTap: (postId: string) => void;
  onComment?: (postId: string, comment: string) => void;
  onDelete?: (postId: string) => void;
  showDoubleTapAnimation: boolean;
  getTimeAgo: (dateString: string) => string;
}

export const PostCard = ({
  post,
  currentUserId,
  currentUserAvatar,
  onLike,
  onSave,
  onDoubleTap,
  onComment,
  onDelete,
  showDoubleTapAnimation,
  getTimeAgo,
}: PostCardProps) => {
  const navigate = useNavigate();
  const { isFollowing, toggleFollow } = useFollow(post.user_id);
  const { checkAuth, isAuthenticated } = useRequireAuth();
  const [isLicking, setIsLicking] = useState(false);
  const [isSaveAnimating, setIsSaveAnimating] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showProductTags, setShowProductTags] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<{
    id: string;
    title_he: string;
    hashtag: string;
    participant_count: number;
  } | null>(null);
  const [showChallengeCTA, setShowChallengeCTA] = useState(false);
  
  const isOwner = currentUserId === post.user_id;

  // Check if this is an adoption post (contains #למסירה hashtag)
  const isAdoptionPost = post.caption?.includes('#למסירה') || post.caption?.includes('#אימוץ');

  // Get all images (support both single and multi-image posts)
  const allImages = post.media_urls?.length 
    ? post.media_urls 
    : [post.image_url].filter(Boolean);

  // Check if post caption contains a challenge hashtag
  useEffect(() => {
    const checkForChallenge = async () => {
      if (!post.caption) return;
      
      const hashtagMatches = post.caption.match(/#[\u0590-\u05FFa-zA-Z0-9_]+/g);
      if (!hashtagMatches || hashtagMatches.length === 0) return;
      
      const hashtags = hashtagMatches.map(h => h.replace('#', ''));
      
      const { data: challenges } = await supabase
        .from("challenges")
        .select("id, title_he, hashtag, participant_count")
        .eq("is_active", true)
        .in("hashtag", hashtags)
        .limit(1);
      
      if (challenges && challenges.length > 0) {
        setActiveChallenge(challenges[0]);
        setShowChallengeCTA(true);
      }
    };
    
    checkForChallenge();
  }, [post.caption]);

  const handleComment = () => {
    if (!checkAuth("כדי להגיב על פוסטים, יש להתחבר")) return;
    if (commentText.trim() && onComment) {
      onComment(post.id, commentText.trim());
      setCommentText("");
    }
  };

  // Heart/like sound - warm and pleasant "pop" with shimmer
  const playLikeSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Main "pop" tone - warm and round
      const mainOsc = audioContext.createOscillator();
      const mainGain = audioContext.createGain();
      mainOsc.connect(mainGain);
      mainGain.connect(audioContext.destination);
      
      mainOsc.type = 'sine';
      mainOsc.frequency.setValueAtTime(880, audioContext.currentTime); // A5 - pleasant
      mainOsc.frequency.exponentialRampToValueAtTime(1175, audioContext.currentTime + 0.08); // D6
      mainOsc.frequency.exponentialRampToValueAtTime(1047, audioContext.currentTime + 0.15); // C6
      
      mainGain.gain.setValueAtTime(0, audioContext.currentTime);
      mainGain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.02);
      mainGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
      
      mainOsc.start(audioContext.currentTime);
      mainOsc.stop(audioContext.currentTime + 0.25);
      
      // High shimmer for sparkle effect
      const shimmerOsc = audioContext.createOscillator();
      const shimmerGain = audioContext.createGain();
      shimmerOsc.connect(shimmerGain);
      shimmerGain.connect(audioContext.destination);
      
      shimmerOsc.type = 'sine';
      shimmerOsc.frequency.setValueAtTime(2093, audioContext.currentTime + 0.05); // C7
      shimmerOsc.frequency.exponentialRampToValueAtTime(2637, audioContext.currentTime + 0.12); // E7
      
      shimmerGain.gain.setValueAtTime(0, audioContext.currentTime + 0.05);
      shimmerGain.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 0.07);
      shimmerGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      shimmerOsc.start(audioContext.currentTime + 0.05);
      shimmerOsc.stop(audioContext.currentTime + 0.2);
      
      // Soft sub bass for warmth
      const bassOsc = audioContext.createOscillator();
      const bassGain = audioContext.createGain();
      bassOsc.connect(bassGain);
      bassGain.connect(audioContext.destination);
      
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(220, audioContext.currentTime); // A3
      
      bassGain.gain.setValueAtTime(0, audioContext.currentTime);
      bassGain.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      bassGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.12);
      
      bassOsc.start(audioContext.currentTime);
      bassOsc.stop(audioContext.currentTime + 0.12);
    } catch (error) {
      console.log('Could not play like sound:', error);
    }
  };

  const handleLike = () => {
    if (!checkAuth("כדי לסמן לייק, יש להתחבר")) return;
    haptic("light");
    setIsLicking(true);
    if (!post.is_liked) playLikeSound();
    onLike(post.id);
    setTimeout(() => setIsLicking(false), 600);
  };

  const handleDoubleTap = () => {
    if (!checkAuth("כדי לסמן לייק, יש להתחבר")) return;
    haptic("success");
    setIsLicking(true);
    if (!post.is_liked) playLikeSound();
    onDoubleTap(post.id);
    setTimeout(() => setIsLicking(false), 600);
  };

  const handleSave = () => {
    if (!checkAuth("כדי לשמור פוסטים, יש להתחבר")) return;
    haptic("light");
    setIsSaveAnimating(true);
    onSave(post.id);
    setTimeout(() => setIsSaveAnimating(false), 600);
  };

  const handleFollow = () => {
    if (!checkAuth("כדי לעקוב אחרי משתמשים, יש להתחבר")) return;
    haptic("selection");
    toggleFollow();
  };

  const handleShare = async () => {
    haptic("light");
    const shareUrl = `${window.location.origin}/post/${post.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PetID Post',
          text: post.caption || 'צפה בפוסט הזה!',
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(shareUrl);
          toast.success("הקישור הועתק");
        }
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("הקישור הועתק");
    }
  };

  const handleDeletePost = async () => {
    if (!currentUserId || post.user_id !== currentUserId) return;
    
    setDeleting(true);
    try {
      // Delete related data first
      await supabase.from("post_likes").delete().eq("post_id", post.id);
      await supabase.from("post_comments").delete().eq("post_id", post.id);
      await supabase.from("saved_posts").delete().eq("post_id", post.id);
      
      // Delete the post
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id)
        .eq("user_id", currentUserId);

      if (error) throw error;

      toast.success("הפוסט נמחק בהצלחה");
      if (onDelete) {
        onDelete(post.id);
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("שגיאה במחיקת הפוסט");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <article className="relative w-full aspect-[9/16] max-w-[calc((100vh-180px)*9/16)] mx-auto rounded-2xl overflow-hidden my-1">
      {/* Full-bleed image */}
      <div className="absolute inset-0 bg-black" onClick={handleDoubleTap}>
        <ImageCarousel
          images={allImages}
          alt={post.caption || "פוסט"}
          onDoubleClick={handleDoubleTap}
        >
          <HeartBurstAnimation isVisible={showDoubleTapAnimation} />
          {post.product_tags && post.product_tags.length > 0 && (
            <ProductTagOverlay
              tags={post.product_tags}
              showTags={showProductTags}
              onToggleTags={() => setShowProductTags(!showProductTags)}
            />
          )}
        </ImageCarousel>
      </div>

      {/* Top gradient */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-[5]" />
      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none z-[5]" />

      {/* Header overlay — avatar + name + menu */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate(`/user/${post.user.id}`)} className="focus:outline-none">
            <Avatar className="w-10 h-10 ring-2 ring-white/40">
              <AvatarImage src={post.user.avatar_url} className="object-cover" />
              <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                {post.user.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </button>
          <div className="flex flex-col">
            <button onClick={() => navigate(`/user/${post.user.id}`)} className="focus:outline-none">
              <span className="font-bold text-white text-[14px] drop-shadow-md">{post.user.full_name || "משתמש"}</span>
            </button>
            <span className="text-white/60 text-[11px] drop-shadow-sm">{getTimeAgo(post.created_at)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentUserId !== post.user_id && !isFollowing && (
            <button
              className="text-[13px] font-semibold text-white bg-white/20 backdrop-blur-sm rounded-full px-3 py-1"
              onClick={(e) => { e.stopPropagation(); handleFollow(); }}
            >
              עקוב
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-white p-1 focus:outline-none" aria-label="אפשרויות פוסט">
                <MoreVertical className="w-5 h-5 drop-shadow-md" strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card z-50 border-border min-w-[180px]">
              <DropdownMenuItem
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`); toast.success("הקישור הועתק"); }}
                className="text-card-foreground"
              >
                <Link2 className="w-4 h-4 ml-2" />
                העתק קישור
              </DropdownMenuItem>
              <ShareToStoryButton postId={post.id} imageUrl={post.image_url} caption={post.caption} />
              {!isOwner && (
                <DropdownMenuItem onClick={() => toast.success("הפוסט הוסתר")} className="text-card-foreground">
                  <EyeOff className="w-4 h-4 ml-2" />
                  הסתר פוסט
                </DropdownMenuItem>
              )}
              {!isOwner && (
                <DropdownMenuItem
                  onClick={() => { if (checkAuth("כדי לדווח, יש להתחבר")) setShowReportDialog(true); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Flag className="w-4 h-4 ml-2" />
                  דווח
                </DropdownMenuItem>
              )}
              {isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive focus:text-destructive">
                    <Trash2 className="w-4 h-4 ml-2" />
                    מחק פוסט
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Right side action buttons — TikTok style */}
      <motion.div
        className="absolute right-2 bottom-36 flex flex-col items-center gap-5 z-10"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
      >
        {/* Like */}
        <motion.button
          variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0 } }}
          whileTap={{ scale: 0.8 }}
          onClick={handleLike}
          className="flex flex-col items-center gap-0.5"
        >
          <motion.div
            animate={isLicking ? { scale: [1, 1.3, 0.9, 1.1, 1] } : {}}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Heart
              className={`w-8 h-8 drop-shadow-lg ${post.is_liked ? 'fill-rose-500 text-rose-500' : 'text-white'}`}
              strokeWidth={1.5}
            />
          </motion.div>
          <span className="text-white text-[12px] font-bold drop-shadow-md tabular-nums">
            {post.likes_count >= 1000 ? `${(post.likes_count / 1000).toFixed(1)}k` : post.likes_count > 0 ? post.likes_count : ''}
          </span>
        </motion.button>

        {/* Comment */}
        <motion.button
          variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0 } }}
          whileTap={{ scale: 0.8 }}
          onClick={() => { haptic("light"); navigate(`/post/${post.id}`); }}
          className="flex flex-col items-center gap-0.5"
        >
          <MessageCircle className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white text-[12px] font-bold drop-shadow-md tabular-nums">
            {post.comments_count >= 1000 ? `${(post.comments_count / 1000).toFixed(1)}k` : post.comments_count > 0 ? post.comments_count : ''}
          </span>
        </motion.button>

        {/* Bookmark */}
        <motion.button
          variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0 } }}
          whileTap={{ scale: 0.8 }}
          onClick={handleSave}
        >
          <motion.div animate={isSaveAnimating ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.3 }}>
            <Bookmark className={`w-8 h-8 drop-shadow-lg ${post.is_saved ? 'fill-white text-white' : 'text-white'}`} strokeWidth={1.5} />
          </motion.div>
        </motion.button>

        {/* Share */}
        <motion.button
          variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0 } }}
          whileTap={{ scale: 0.8 }}
          onClick={handleShare}
        >
          <Share2 className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={1.5} />
        </motion.button>
      </motion.div>

      {/* Bottom info — username, caption, location */}
      <div className="absolute bottom-4 left-3 right-14 z-10 text-white" dir="rtl">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-extrabold text-[15px] drop-shadow-md">@{post.user.full_name || "משתמש"}</span>
        </div>
        {post.caption && (
          <p className="text-[13px] line-clamp-2 drop-shadow-sm mb-1.5">
            {post.caption}
          </p>
        )}
        {post.location_name && (
          <span className="text-[11px] text-white/70 drop-shadow-sm">📍 {post.location_name}</span>
        )}
        {isAdoptionPost && currentUserId !== post.user_id && (
          <motion.button
            onClick={() => navigate(`/messages/thread/${post.user_id}`)}
            className="mt-2 bg-rose-500 text-white font-semibold py-2 px-4 rounded-full flex items-center gap-2 text-sm"
            whileTap={{ scale: 0.95 }}
          >
            <Mail className="w-4 h-4" />
            <span>שלח הודעה למוסר</span>
          </motion.button>
        )}
      </div>

      {/* Report Dialog */}
      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        reportedUserId={post.user_id}
        reportedPostId={post.id}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
    </article>
  );
};
