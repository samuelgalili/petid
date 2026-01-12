import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Share2, Bookmark, MoreVertical, Flag, ShoppingBag, Link2, EyeOff, Send, Heart, Home, Mail, Trash2 } from "lucide-react";
import pawHeartIcon from "@/assets/paw-heart-icon.png";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFollow } from "@/hooks/useFollow";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ReportDialog } from "@/components/ReportDialog";
import { ProductTagOverlay } from "@/components/post/ProductTagOverlay";
import { HeartBurstAnimation } from "@/components/post/HeartBurstAnimation";
import { ImageCarousel } from "@/components/post/ImageCarousel";
import { CommentsPreview } from "@/components/post/CommentsPreview";
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
    setIsLicking(true);
    if (!post.is_liked) playLikeSound();
    onLike(post.id);
    setTimeout(() => setIsLicking(false), 600);
  };

  const handleDoubleTap = () => {
    if (!checkAuth("כדי לסמן לייק, יש להתחבר")) return;
    setIsLicking(true);
    if (!post.is_liked) playLikeSound();
    onDoubleTap(post.id);
    setTimeout(() => setIsLicking(false), 600);
  };

  const handleSave = () => {
    if (!checkAuth("כדי לשמור פוסטים, יש להתחבר")) return;
    setIsSaveAnimating(true);
    onSave(post.id);
    setTimeout(() => setIsSaveAnimating(false), 600);
  };

  const handleFollow = () => {
    if (!checkAuth("כדי לעקוב אחרי משתמשים, יש להתחבר")) return;
    toggleFollow();
  };

  const handleShare = async () => {
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
    <article 
      className="bg-white"
    >
      {/* Post Header - Instagram style */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            className="cursor-pointer focus:outline-none"
            onClick={() => navigate(`/user/${post.user.id}`)}
          >
            <Avatar className="w-9 h-9 rounded-lg ring-[1.5px] ring-neutral-200 ring-offset-[1px] ring-offset-white">
              <AvatarImage src={post.user.avatar_url} className="object-cover rounded-lg" />
              <AvatarFallback className="bg-neutral-100 text-neutral-800 text-xs font-medium rounded-lg">
                {post.user.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </button>
          <div className="flex flex-col">
            <button 
              className="cursor-pointer text-right focus:outline-none"
              onClick={() => navigate(`/user/${post.user.id}`)}
            >
              <span className="font-semibold text-neutral-900 text-[14px] leading-none tracking-tight">{post.user.full_name || "משתמש"}</span>
            </button>
            <span className="text-neutral-400 text-[12px] mt-0.5">{getTimeAgo(post.created_at)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {currentUserId !== post.user_id && !isFollowing && (
            <button
              className="text-[13px] font-bold text-[#0095F6] active:opacity-60 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                handleFollow();
              }}
            >
              עקוב
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-neutral-900 p-1 -m-1 focus:outline-none">
                <MoreVertical className="w-6 h-6" strokeWidth={1.25} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white z-50 border-[#DBDBDB]">
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
                  toast.success("הקישור הועתק");
                }}
                className="text-[#262626]"
              >
                <Link2 className="w-4 h-4 ml-2" />
                העתק קישור
              </DropdownMenuItem>
              {!isOwner && (
                <DropdownMenuItem
                  onClick={() => {
                    toast.success("הפוסט הוסתר");
                  }}
                  className="text-[#262626]"
                >
                  <EyeOff className="w-4 h-4 ml-2" />
                  הסתר פוסט
                </DropdownMenuItem>
              )}
              {!isOwner && (
                <DropdownMenuItem
                  onClick={() => {
                    if (checkAuth("כדי לדווח, יש להתחבר")) {
                      setShowReportDialog(true);
                    }
                  }}
                  className="text-[#ED4956] focus:text-[#ED4956]"
                >
                  <Flag className="w-4 h-4 ml-2" />
                  דווח
                </DropdownMenuItem>
              )}
              {isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-[#ED4956] focus:text-[#ED4956]"
                  >
                    <Trash2 className="w-4 h-4 ml-2" />
                    מחק פוסט
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Post Image with Carousel Support */}
      <ImageCarousel
        images={allImages}
        alt={post.caption || "פוסט"}
        onDoubleClick={handleDoubleTap}
      >
        {/* Heart Burst Animation */}
        <HeartBurstAnimation isVisible={showDoubleTapAnimation} />

        {/* Product Tags Overlay */}
        {post.product_tags && post.product_tags.length > 0 && (
          <ProductTagOverlay 
            tags={post.product_tags}
            showTags={showProductTags}
            onToggleTags={() => setShowProductTags(!showProductTags)}
          />
        )}
      </ImageCarousel>

      {/* Post Actions */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLike}
              className="p-0.5 active:opacity-50 transition-opacity focus:outline-none"
            >
              <motion.div
                animate={isLicking ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.25 }}
              >
                <img 
                  src={pawHeartIcon} 
                  alt="Like"
                  className={`w-7 h-7 transition-transform duration-200 ${
                    post.is_liked 
                      ? 'scale-105' 
                      : 'hover:scale-105'
                  }`}
                  style={post.is_liked ? { filter: 'invert(36%) sepia(98%) saturate(1752%) hue-rotate(330deg) brightness(95%) contrast(95%)' } : {}}
                />
              </motion.div>
            </button>
            
            <button 
              className="text-neutral-900 p-0.5 active:opacity-50 transition-opacity focus:outline-none"
              onClick={() => navigate(`/post/${post.id}`)}
            >
              <MessageCircle className="w-7 h-7" strokeWidth={1.25} />
            </button>
            
            <button 
              className="text-neutral-900 p-0.5 active:opacity-50 transition-opacity focus:outline-none"
              onClick={handleShare}
            >
              <Send className="w-7 h-7" strokeWidth={1.25} />
            </button>
          </div>
          <button 
            onClick={handleSave}
            className="text-neutral-900 p-0.5 active:opacity-50 transition-opacity focus:outline-none"
          >
            <motion.div
              animate={isSaveAnimating ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.25 }}
            >
              <Bookmark 
                className={`w-7 h-7 ${
                  post.is_saved 
                    ? 'fill-neutral-900' 
                    : ''
                }`} 
                strokeWidth={1.25} 
              />
            </motion.div>
          </button>
        </div>

        {/* Likes count */}
        {post.likes_count > 0 && (
          <p className="text-[14px] text-neutral-900 font-semibold mb-1.5 tabular-nums">
            {post.likes_count.toLocaleString('he-IL')} לייקים
          </p>
        )}

        {/* Post Caption */}
        {post.caption && (
          <p className="text-neutral-900 text-[14px] leading-[1.35] mb-1.5">
            <button
              className="font-bold cursor-pointer focus:outline-none ml-1"
              onClick={() => navigate(`/user/${post.user.id}`)}
            >
              {post.user.full_name || "משתמש"}
            </button>
            {post.caption}
          </p>
        )}

        {/* Comments Preview */}
        <CommentsPreview 
          postId={post.id} 
          totalComments={post.comments_count} 
        />


        {/* Adoption CTA - Show for adoption posts */}
        {isAdoptionPost && currentUserId !== post.user_id && (
          <motion.button
            onClick={() => navigate(`/messages/thread/${post.user_id}`)}
            className="w-full bg-gradient-to-l from-petid-blue to-petid-gold text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 mb-3 shadow-lg"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Mail className="w-5 h-5" />
            <span>שלח הודעה למוסר</span>
            <Home className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {/* Add comment section */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-neutral-100">
        <Avatar className="w-7 h-7 flex-shrink-0">
          <AvatarImage src={currentUserAvatar} className="object-cover" />
          <AvatarFallback className="bg-neutral-100 text-neutral-600 text-[10px] font-medium">
            U
          </AvatarFallback>
        </Avatar>
        <input
          type="text"
          placeholder="הוסף תגובה..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleComment()}
          onFocus={() => !isAuthenticated && checkAuth("כדי להגיב על פוסטים, יש להתחבר")}
          className="flex-1 bg-transparent text-[14px] text-neutral-900 placeholder-neutral-400 outline-none"
          readOnly={!isAuthenticated}
        />
        <AnimatePresence>
          {commentText.trim() && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleComment}
              className="text-[#0095F6] text-[14px] font-semibold"
            >
              פרסם
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Post Divider */}
      <div className="h-[1px] bg-neutral-100" />

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
