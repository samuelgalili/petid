import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Share2, Heart, MoreVertical, Flag, Link2, EyeOff, Trash2, User } from "lucide-react";
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
    <article
      className="relative w-full rounded-2xl overflow-hidden my-1"
      style={{ aspectRatio: '9/16', maxWidth: 'calc((100vh - 180px) * 9 / 16)', margin: '4px auto' }}
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

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none z-[5]" style={{ height: '45%', background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)' }} />
      {/* Top gradient */}
      <div className="absolute inset-x-0 top-0 pointer-events-none z-[5]" style={{ height: '80px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 100%)' }} />

      {/* Owner menu — top-right */}
      <div className="absolute top-3 right-3 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-white p-1.5 rounded-full backdrop-blur-sm focus:outline-none" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }} aria-label="אפשרויות">
              <MoreVertical className="w-5 h-5" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} strokeWidth={2} />
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

      {/* RIGHT SIDEBAR — Vertically centered */}
      <motion.div
       className="absolute flex flex-col items-center z-10"
        style={{ right: '12px', top: '50%', transform: 'translateY(-50%)', gap: '16px' }}
        initial="hidden"
        animate="visible"
      >
        {/* Profile Avatar */}
        <motion.button
          custom={0}
          variants={sidebarStagger}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(`/user/${post.user.id}`)}
          className="relative"
          style={{ marginBottom: '4px' }}
        >
          <div className="rounded-full overflow-hidden" style={{ width: '48px', height: '48px', border: '2px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            {post.user.avatar_url ? (
              <img src={post.user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#525252' }}>
                <User className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.7)' }} />
              </div>
            )}
          </div>
          {!isOwner && !isFollowing && (
            <button
              onClick={(e) => { e.stopPropagation(); handleFollow(); }}
              className="absolute rounded-full flex items-center justify-center text-white font-bold"
              style={{ bottom: '-4px', left: '50%', transform: 'translateX(-50%)', width: '16px', height: '16px', fontSize: '10px', backgroundColor: '#FF8C42', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
            >
              +
            </button>
          )}
        </motion.button>

        {/* Like */}
        <motion.button
          custom={1}
          variants={sidebarStagger}
          whileTap={{ scale: 0.8 }}
          onClick={handleLike}
          className="flex flex-col items-center"
          style={{ gap: '4px' }}
        >
          <motion.div
            animate={isLicking ? { scale: [1, 1.4, 0.9, 1.1, 1] } : {}}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Heart
              className={post.is_liked ? 'fill-rose-500 text-rose-500' : 'text-white'}
              style={{ width: '32px', height: '32px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
              strokeWidth={1.5}
            />
          </motion.div>
          <span className="text-white font-semibold tabular-nums" style={{ fontSize: '14px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>
            {formatCount(post.likes_count)}
          </span>
        </motion.button>

        {/* Comments */}
        <motion.button
          custom={2}
          variants={sidebarStagger}
          whileTap={{ scale: 0.8 }}
          onClick={() => { haptic("light"); navigate(`/post/${post.id}`); }}
          className="flex flex-col items-center"
          style={{ gap: '4px' }}
        >
          <MessageCircle className="text-white" style={{ width: '32px', height: '32px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} strokeWidth={1.5} />
          <span className="text-white font-semibold tabular-nums" style={{ fontSize: '14px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>
            {formatCount(post.comments_count)}
          </span>
        </motion.button>

        {/* Share */}
        <motion.button
          custom={3}
          variants={sidebarStagger}
          whileTap={{ scale: 0.8 }}
          onClick={handleShare}
          className="flex flex-col items-center"
          style={{ gap: '4px' }}
        >
          <Share2 className="text-white" style={{ width: '32px', height: '32px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} strokeWidth={1.5} />
          <span className="text-white font-semibold" style={{ fontSize: '14px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>
            שתף
          </span>
        </motion.button>

        {/* CTA Button */}
        <motion.button
          custom={4}
          variants={sidebarStagger}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(`/post/${post.id}`)}
          className="relative rounded-xl flex items-center justify-center"
          style={{ width: '64px', height: '44px', backgroundColor: '#FF8C42', boxShadow: '0 4px 12px rgba(255,140,66,0.4)' }}
        >
          <motion.div
            className="absolute inset-0 rounded-xl"
            style={{ backgroundColor: '#FF8C42' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-white font-bold relative z-10" style={{ fontSize: '11px' }}>פרטים</span>
        </motion.button>
      </motion.div>

      {/* BOTTOM-LEFT INFO */}
      <div className="absolute z-10 text-white" dir="rtl" style={{ bottom: '28px', left: '16px', right: '80px' }}>
        {/* Status badges */}
        <div className="flex items-center flex-wrap" style={{ gap: '8px', marginBottom: '8px' }}>
          {post.location_name && (
            <span className="rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(12px)', padding: '4px 12px', fontSize: '14px', fontWeight: 500 }}>
              📍 {post.location_name}
            </span>
          )}
          {post.views_count && post.views_count > 0 && (
            <span className="rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(12px)', padding: '4px 12px', fontSize: '14px', fontWeight: 500 }}>
              👁 {formatCount(post.views_count)}
            </span>
          )}
          <span className="rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(12px)', padding: '4px 12px', fontSize: '14px', fontWeight: 500 }}>
            {getTimeAgo(post.created_at)}
          </span>
        </div>

        {/* Username */}
        <p className="font-semibold" style={{ fontSize: '18px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))', marginBottom: '4px' }}>
          @{post.user.full_name || "משתמש"}
        </p>

        {/* Caption */}
        {post.caption && (
          <p className="line-clamp-2" style={{ fontSize: '16px', lineHeight: 1.4, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
            {post.caption}
          </p>
        )}
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
            <AlertDialogAction onClick={handleDeletePost} disabled={deleting} className="bg-red-500 hover:bg-red-600 rounded-xl">
              {deleting ? "מוחק..." : "מחק"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
};
