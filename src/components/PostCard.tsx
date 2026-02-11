import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Share2, Heart, MoreVertical, Flag, Link2, EyeOff, Trash2, User } from "lucide-react";
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

/** Format large numbers like TikTok (67.3k, 1.2M) */
const formatCount = (count: number): string => {
  if (!count) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return count.toString();
};

/** Stagger animation for sidebar actions */
const sidebarStagger = {
  hidden: { opacity: 0, x: 20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.2 + i * 0.07, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
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
  const isAdoptionPost = post.caption?.includes('#למסירה') || post.caption?.includes('#אימוץ');

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

  return (
    <article className="relative w-full aspect-[9/16] max-w-[calc((100vh-180px)*9/16)] mx-auto rounded-2xl overflow-hidden my-1">
      {/* ── Full-bleed media ── */}
      <div className="absolute inset-0 bg-black" onClick={handleDoubleTap}>
        <ImageCarousel images={allImages} alt={post.caption || "פוסט"} onDoubleClick={handleDoubleTap}>
          <HeartBurstAnimation isVisible={showDoubleTapAnimation} />
          {post.product_tags && post.product_tags.length > 0 && (
            <ProductTagOverlay tags={post.product_tags} showTags={showProductTags} onToggleTags={() => setShowProductTags(!showProductTags)} />
          )}
        </ImageCarousel>
      </div>

      {/* Bottom gradient — spec: linear-gradient to top, black/70 0% → transparent 40% */}
      <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none z-[5]" />
      {/* Top subtle gradient for menu readability */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent pointer-events-none z-[5]" />

      {/* ── Owner-only menu — top-right ── */}
      <div className="absolute top-3 right-3 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-white p-1.5 rounded-full bg-black/20 backdrop-blur-sm focus:outline-none" aria-label="אפשרויות">
              <MoreVertical className="w-5 h-5 drop-shadow-md" strokeWidth={2} />
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

      {/* ══════════════════════════════════════════════
          RIGHT SIDEBAR — Vertically centered, right-4
          Profile Avatar → Like → Comment → Share → CTA
         ══════════════════════════════════════════════ */}
      <motion.div
        className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-6 z-10"
        initial="hidden"
        animate="visible"
      >
        {/* ── Profile Avatar (48px, 2px white border, + badge) ── */}
        <motion.button
          custom={0}
          variants={sidebarStagger}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(`/user/${post.user.id}`)}
          className="relative mb-1"
        >
          <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-lg">
            {post.user.avatar_url ? (
              <img src={post.user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-700">
                <User className="w-5 h-5 text-white/70" />
              </div>
            )}
          </div>
          {/* + badge — 16px, #FF8C42 */}
          {!isOwner && !isFollowing && (
            <button
              onClick={(e) => { e.stopPropagation(); handleFollow(); }}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-lg"
              style={{ backgroundColor: '#FF8C42' }}
            >
              +
            </button>
          )}
        </motion.button>

        {/* ── Like (Heart) — 32px, label 14px ── */}
        <motion.button
          custom={1}
          variants={sidebarStagger}
          whileTap={{ scale: 0.8 }}
          onClick={handleLike}
          className="flex flex-col items-center gap-1"
        >
          <motion.div
            animate={isLicking ? { scale: [1, 1.4, 0.9, 1.1, 1] } : {}}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Heart
              className={`w-8 h-8 drop-shadow-lg ${post.is_liked ? 'fill-rose-500 text-rose-500' : 'text-white'}`}
              strokeWidth={1.5}
            />
          </motion.div>
          <span className="text-white text-[14px] font-semibold drop-shadow-md tabular-nums">
            {formatCount(post.likes_count)}
          </span>
        </motion.button>

        {/* ── Comments — 32px, label 14px ── */}
        <motion.button
          custom={2}
          variants={sidebarStagger}
          whileTap={{ scale: 0.8 }}
          onClick={() => { haptic("light"); navigate(`/post/${post.id}`); }}
          className="flex flex-col items-center gap-1"
        >
          <MessageCircle className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white text-[14px] font-semibold drop-shadow-md tabular-nums">
            {formatCount(post.comments_count)}
          </span>
        </motion.button>

        {/* ── Share — 32px, label 14px ── */}
        <motion.button
          custom={3}
          variants={sidebarStagger}
          whileTap={{ scale: 0.8 }}
          onClick={handleShare}
          className="flex flex-col items-center gap-1"
        >
          <Share2 className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white text-[14px] font-semibold drop-shadow-md tabular-nums">
            שתף
          </span>
        </motion.button>

        {/* ── Main CTA Button — 64x44px, #FF8C42, pulsing ── */}
        <motion.button
          custom={4}
          variants={sidebarStagger}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(`/post/${post.id}`)}
          className="relative rounded-xl w-16 h-11 flex items-center justify-center shadow-xl"
          style={{ backgroundColor: '#FF8C42' }}
        >
          {/* Pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-xl"
            style={{ backgroundColor: '#FF8C42' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-white text-[11px] font-bold relative z-10">פרטים</span>
        </motion.button>
      </motion.div>

      {/* ══════════════════════════════════════════════
          BOTTOM-LEFT INFORMATION OVERLAY
          Status badge → @username → Caption
         ══════════════════════════════════════════════ */}
      <div className="absolute bottom-7 left-4 right-20 z-10 text-white" dir="rtl">
        {/* Status badge — glassmorphism pill */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {post.location_name && (
            <span className="bg-white/20 backdrop-blur-md rounded-full px-3 py-1 text-[14px] font-medium drop-shadow-sm">
              📍 {post.location_name}
            </span>
          )}
          {post.views_count && post.views_count > 0 && (
            <span className="bg-white/20 backdrop-blur-md rounded-full px-3 py-1 text-[14px] font-medium drop-shadow-sm">
              👁 {formatCount(post.views_count)}
            </span>
          )}
          <span className="bg-white/20 backdrop-blur-md rounded-full px-3 py-1 text-[14px] font-medium drop-shadow-sm">
            {getTimeAgo(post.created_at)}
          </span>
        </div>

        {/* @username — 18px Semi-bold */}
        <p className="font-semibold text-[18px] drop-shadow-md mb-1">
          @{post.user.full_name || "משתמש"}
        </p>

        {/* Caption — 16px, max 2 lines */}
        {post.caption && (
          <p className="text-[16px] leading-snug line-clamp-2 drop-shadow-sm">
            {post.caption}
          </p>
        )}
      </div>

      {/* ── Dialogs ── */}
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
            <AlertDialogAction onClick={handleDeletePost} disabled={deleting} className="bg-red-500 hover:bg-red-600 rounded-xl">
              {deleting ? "מוחק..." : "מחק"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
};
