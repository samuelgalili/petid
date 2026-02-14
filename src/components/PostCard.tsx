import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Share2, Heart, MoreVertical, Flag, Link2, EyeOff, Trash2, User, Music, Disc3 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { haptic } from "@/lib/haptics";
import { useNavigate } from "react-router-dom";
import { useFollow } from "@/hooks/useFollow";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ReportDialog } from "@/components/ReportDialog";
import { ProductTagOverlay } from "@/components/post/ProductTagOverlay";
import { HeartBurstAnimation } from "@/components/post/HeartBurstAnimation";
import { ImageCarousel } from "@/components/post/ImageCarousel";
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
    music_title?: string;
    music_artist?: string;
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

const formatCount = (count: number): string => {
  if (!count) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return count.toString();
};

const sidebarStagger = {
  hidden: { opacity: 0, x: 20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.15 + i * 0.06, duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

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
  const [showProductTags, setShowProductTags] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = currentUserId === post.user_id;

  const allImages = post.media_urls?.length
    ? post.media_urls
    : [post.image_url].filter(Boolean);

  const playLikeSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1175, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
    } catch { /* silent */ }
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

  const handleShare = async () => {
    haptic("light");
    const shareUrl = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'PetID Post', text: post.caption || 'צפה בפוסט הזה!', url: shareUrl }); }
      catch (e) { if ((e as Error).name !== 'AbortError') { navigator.clipboard.writeText(shareUrl); toast.success("הקישור הועתק"); } }
    } else {
      navigator.clipboard.writeText(shareUrl); toast.success("הקישור הועתק");
    }
  };

  const handleFollow = () => {
    if (!checkAuth("כדי לעקוב אחרי משתמשים, יש להתחבר")) return;
    haptic("selection");
    toggleFollow();
  };

  const handleDeletePost = async () => {
    if (!currentUserId || post.user_id !== currentUserId) return;
    setDeleting(true);
    try {
      await supabase.from("post_likes").delete().eq("post_id", post.id);
      await supabase.from("post_comments").delete().eq("post_id", post.id);
      await supabase.from("saved_posts").delete().eq("post_id", post.id);
      const { error } = await supabase.from("posts").delete().eq("id", post.id).eq("user_id", currentUserId);
      if (error) throw error;
      toast.success("הפוסט נמחק בהצלחה");
      if (onDelete) onDelete(post.id);
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("שגיאה במחיקת הפוסט");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const musicTitle = post.music_title || "PetID · Original Sound";

  return (
    <article
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: '9/16', maxWidth: 'calc((100vh - 140px) * 9 / 16)', margin: '2px auto', borderRadius: '0' }}
    >
      {/* Full-bleed media */}
      <div className="absolute inset-0 bg-black" onClick={handleDoubleTap}>
        <ImageCarousel images={allImages} alt={post.caption || "פוסט"} onDoubleClick={handleDoubleTap}>
          <HeartBurstAnimation isVisible={showDoubleTapAnimation} />
          {post.product_tags && post.product_tags.length > 0 && (
            <ProductTagOverlay tags={post.product_tags} showTags={showProductTags} onToggleTags={() => setShowProductTags(!showProductTags)} />
          )}
        </ImageCarousel>
      </div>

      {/* Bottom gradient — deeper, smoother */}
      <div 
        className="absolute inset-x-0 bottom-0 pointer-events-none z-[5]" 
        style={{ 
          height: '50%', 
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.45) 35%, rgba(0,0,0,0.1) 70%, transparent 100%)' 
        }} 
      />
      {/* Top gradient — subtle */}
      <div 
        className="absolute inset-x-0 top-0 pointer-events-none z-[5]" 
        style={{ height: '60px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 100%)' }} 
      />

      {/* Owner menu — top-right */}
      <div className="absolute top-3 right-3 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="p-1.5 rounded-full focus:outline-none" 
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }} 
              aria-label="אפשרויות"
            >
              <MoreVertical className="w-5 h-5 text-white" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }} strokeWidth={2} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card z-50 border-border min-w-[180px]">
            <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`); toast.success("הקישור הועתק"); }} className="text-card-foreground">
              <Link2 className="w-4 h-4 ml-2" /> העתק קישור
            </DropdownMenuItem>
            <ShareToStoryButton postId={post.id} imageUrl={post.image_url} caption={post.caption} />
            {!isOwner && (
              <DropdownMenuItem onClick={() => toast.success("הפוסט הוסתר")} className="text-card-foreground">
                <EyeOff className="w-4 h-4 ml-2" /> הסתר פוסט
              </DropdownMenuItem>
            )}
            {!isOwner && (
              <DropdownMenuItem onClick={() => { if (checkAuth("כדי לדווח, יש להתחבר")) setShowReportDialog(true); }} className="text-destructive focus:text-destructive">
                <Flag className="w-4 h-4 ml-2" /> דווח
              </DropdownMenuItem>
            )}
            {isOwner && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive focus:text-destructive">
                  <Trash2 className="w-4 h-4 ml-2" /> מחק פוסט
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* RIGHT SIDEBAR — TikTok precise positioning         */}
      {/* ═══════════════════════════════════════════════════ */}
      <motion.div
        className="absolute flex flex-col items-center z-10"
        style={{ right: '10px', bottom: '140px', gap: '20px' }}
        initial="hidden"
        animate="visible"
      >
        {/* Profile Avatar with follow badge */}
        <motion.button
          custom={0}
          variants={sidebarStagger}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(`/user/${post.user.id}`)}
          className="relative"
        >
          <div 
            className="rounded-full overflow-hidden"
            style={{ 
              width: '48px', height: '48px', 
              border: '2.5px solid white', 
              boxShadow: '0 2px 12px rgba(0,0,0,0.4)' 
            }}
          >
            {post.user.avatar_url ? (
              <img src={post.user.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-600">
                <User className="w-5 h-5 text-white/70" />
              </div>
            )}
          </div>
          {!isOwner && !isFollowing && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 400 }}
              onClick={(e) => { e.stopPropagation(); handleFollow(); }}
              className="absolute rounded-full flex items-center justify-center"
              style={{ 
                bottom: '-6px', left: '50%', transform: 'translateX(-50%)', 
                width: '20px', height: '20px', 
                background: 'linear-gradient(135deg, #FE2C55, #FF0050)',
                boxShadow: '0 2px 8px rgba(254,44,85,0.5)',
                border: '2px solid white',
              }}
            >
              <span className="text-white font-black" style={{ fontSize: '13px', lineHeight: 1 }}>+</span>
            </motion.button>
          )}
        </motion.button>

        {/* Like */}
        <motion.button
          custom={1}
          variants={sidebarStagger}
          whileTap={{ scale: 0.75 }}
          onClick={handleLike}
          className="flex flex-col items-center"
          style={{ gap: '2px' }}
        >
          <motion.div
            animate={isLicking ? { scale: [1, 1.5, 0.85, 1.15, 1], rotate: [0, -8, 8, -4, 0] } : {}}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <Heart
              className={post.is_liked ? 'text-white' : 'text-white'}
              fill={post.is_liked ? '#FE2C55' : 'none'}
              style={{ 
                width: '32px', height: '32px', 
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))',
                color: post.is_liked ? '#FE2C55' : 'white',
              }}
              strokeWidth={post.is_liked ? 0 : 1.8}
            />
          </motion.div>
          <span 
            className="font-semibold tabular-nums" 
            style={{ 
              fontSize: '12px', color: 'white',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
              letterSpacing: '-0.02em',
            }}
          >
            {formatCount(post.likes_count)}
          </span>
        </motion.button>

        {/* Comments */}
        <motion.button
          custom={2}
          variants={sidebarStagger}
          whileTap={{ scale: 0.75 }}
          onClick={() => { haptic("light"); navigate(`/post/${post.id}`); }}
          className="flex flex-col items-center"
          style={{ gap: '2px' }}
        >
          <MessageCircle 
            className="text-white" 
            style={{ 
              width: '30px', height: '30px', 
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' 
            }} 
            strokeWidth={1.8} 
          />
          <span 
            className="font-semibold tabular-nums" 
            style={{ 
              fontSize: '12px', color: 'white',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
              letterSpacing: '-0.02em',
            }}
          >
            {formatCount(post.comments_count)}
          </span>
        </motion.button>

        {/* Share */}
        <motion.button
          custom={3}
          variants={sidebarStagger}
          whileTap={{ scale: 0.75 }}
          onClick={handleShare}
          className="flex flex-col items-center"
          style={{ gap: '2px' }}
        >
          <Share2 
            className="text-white" 
            style={{ 
              width: '28px', height: '28px', 
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' 
            }} 
            strokeWidth={1.8} 
          />
          <span 
            className="font-semibold" 
            style={{ 
              fontSize: '12px', color: 'white',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
            }}
          >
            שתף
          </span>
        </motion.button>

        {/* Spinning Disc — TikTok music disc */}
        <motion.button
          custom={4}
          variants={sidebarStagger}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(`/post/${post.id}`)}
          className="relative"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="rounded-full overflow-hidden"
            style={{ 
              width: '36px', height: '36px',
              border: '2px solid rgba(255,255,255,0.3)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              background: 'linear-gradient(135deg, #1a1a1a, #333)',
            }}
          >
            {post.user.avatar_url ? (
              <img src={post.user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-4 h-4 text-white/60" />
              </div>
            )}
          </motion.div>
        </motion.button>
      </motion.div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* BOTTOM-LEFT INFO — TikTok precise                  */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="absolute z-10 text-white" dir="rtl" style={{ bottom: '16px', left: '12px', right: '72px' }}>
        {/* Username — bold, clean, no @ */}
        <p 
          className="font-bold truncate" 
          style={{ 
            fontSize: '16px', 
            lineHeight: 1.3,
            filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))',
            marginBottom: '6px',
            letterSpacing: '-0.01em',
          }}
          onClick={() => navigate(`/user/${post.user.id}`)}
        >
          {post.user.full_name || "משתמש"}
        </p>

        {/* Caption — clean, max 2 lines */}
        {post.caption && (
          <p 
            className="line-clamp-2" 
            style={{ 
              fontSize: '14px', 
              lineHeight: 1.5, 
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
              marginBottom: '10px',
              opacity: 0.95,
              fontWeight: 400,
            }}
          >
            {post.caption}
          </p>
        )}

        {/* Music bar — TikTok style with marquee */}
        <div className="flex items-center" style={{ gap: '6px' }}>
          <Music className="shrink-0" style={{ width: '14px', height: '14px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }} />
          <div className="overflow-hidden flex-1" style={{ maxWidth: '200px' }}>
            <motion.p
              animate={{ x: ['0%', '-50%'] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear', repeatType: 'loop' }}
              className="whitespace-nowrap"
              style={{ 
                fontSize: '13px', 
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
                fontWeight: 500,
              }}
            >
              ♫ {musicTitle} &nbsp;&nbsp;&nbsp; ♫ {musicTitle}
            </motion.p>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        reportedUserId={post.user_id}
        reportedPostId={post.id}
      />
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir="rtl" className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת פוסט</AlertDialogTitle>
            <AlertDialogDescription>האם אתה בטוח שברצונך למחוק את הפוסט? פעולה זו לא ניתנת לביטול.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel disabled={deleting} className="rounded-xl">ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePost} disabled={deleting} className="bg-destructive hover:bg-destructive/90 rounded-xl">
              {deleting ? "מוחק..." : "מחק"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
};
