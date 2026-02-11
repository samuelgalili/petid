import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageCircle,
  User,
  Check,
  ShoppingCart,
  Plus,
  Music,
  Send,
  Trophy,
  PawPrint,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { playAddToCartSound } from "@/lib/sounds";
import { useCart } from "@/contexts/CartContext";
import { useFlyingCart } from "@/components/FlyingCartAnimation";
import { CommentsSheet } from "@/components/CommentsSheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SocialProofLabel } from "@/components/feed";
import type { FeedPost } from "@/hooks/useSoundtrackFeed";

interface SoundtrackPostCardProps {
  post: FeedPost;
  index: number;
  currentIndex: number;
  muted: boolean;
  setMuted: (v: boolean) => void;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onFollow: (id: string) => void;
  userId?: string;
}

const formatCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
};

export const SoundtrackPostCard = ({
  post,
  index,
  currentIndex,
  muted,
  setMuted,
  onLike,
  onSave,
  onFollow,
  userId,
}: SoundtrackPostCardProps) => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const lastTapRef = useRef(0);
  const { addToCart } = useCart();
  const { triggerFly } = useFlyingCart();
  const productImageRef = useRef<HTMLImageElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-play music when this post is the current visible post
  const isActive = index === currentIndex;
  useEffect(() => {
    if (!post.music_url) return;
    
    if (isActive && !muted) {
      if (!audioRef.current || audioRef.current.src !== post.music_url) {
        audioRef.current?.pause();
        audioRef.current = new Audio(post.music_url);
        audioRef.current.loop = true;
        audioRef.current.volume = 0.5;
      }
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current?.pause();
    }
    
    return () => { audioRef.current?.pause(); };
  }, [isActive, muted, post.music_url]);

  // Update volume when muted changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted;
    }
  }, [muted]);

  const allImages =
    post.media_urls && post.media_urls.length > 0
      ? post.media_urls
      : post.image_url
        ? [post.image_url]
        : [];

  const hasMultipleImages = allImages.length > 1;
  const isProductPost = post.post_type === "product";
  const isChallengePost = post.post_type === "challenge";
  const isCtaPost = post.post_type === "cta";
  const hasPromotion = isProductPost || isChallengePost || isCtaPost;

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!post.is_liked) onLike(post.id);
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 800);
    }
    lastTapRef.current = now;
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.caption || "PetID", url: shareUrl });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("הקישור הועתק!");
    }
  };

  const handleAddToCart = () => {
    if (!post.product_id || addedToCart) return;

    if (productImageRef.current) {
      const rect = productImageRef.current.getBoundingClientRect();
      triggerFly(allImages[0] || "", rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    addToCart({
      id: post.product_id,
      name: post.product_name || "מוצר",
      price: post.product_price || 0,
      image: allImages[0] || "",
      quantity: 1,
    });

    playAddToCartSound();
    confetti({
      particleCount: 60,
      spread: 55,
      origin: { y: 0.8 },
      colors: ["#FBD66A", "#F4C542", "#FFD748", "#37B679"],
    });

    setAddedToCart(true);
    toast.success("נוסף לעגלה! 🛒");
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleCtaClick = () => {
    if (isChallengePost && post.challenge_id) {
      navigate(`/challenges/${post.challenge_id}`);
    } else if (isCtaPost && post.cta_link) {
      navigate(post.cta_link);
    } else if (isProductPost && post.product_id) {
      navigate(`/shop/product/${post.product_id}`);
    }
  };

  return (
    <motion.div
      className="h-[calc(100vh-56px-70px)] w-full snap-start relative overflow-hidden"
      style={{ aspectRatio: "9/16" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      onClick={handleDoubleTap}
    >
      {/* Full-bleed media */}
      <div className="absolute inset-0 z-0 bg-black">
        {allImages.length > 0 ? (
          <div
            className="relative w-full h-full overflow-x-auto snap-x snap-mandatory scroll-smooth flex"
            style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
            onScroll={(e) => {
              const container = e.currentTarget;
              const newIdx = Math.round(container.scrollLeft / container.offsetWidth);
              if (newIdx !== currentImageIndex && newIdx >= 0 && newIdx < allImages.length) {
                setCurrentImageIndex(newIdx);
              }
            }}
          >
            {allImages.map((img, imgIndex) => (
              <img
                key={imgIndex}
                ref={imgIndex === 0 ? productImageRef : undefined}
                src={img}
                alt=""
                className="w-full h-full object-cover flex-shrink-0 snap-center"
                loading={imgIndex === 0 ? "eager" : "lazy"}
              />
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-lg text-white/70 px-8 text-center">
              {post.caption || "פוסט ללא תמונה"}
            </p>
          </div>
        )}
      </div>

      {/* Bottom gradient — TikTok: very subtle, ~25% height */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
        style={{
          height: "20%",
          background: "linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 z-10 pointer-events-none"
        style={{
          height: "60px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 100%)",
        }}
      />

      {/* Double-tap heart burst */}
      <AnimatePresence>
        {showHeartBurst && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Heart className="w-24 h-24 text-red-500 fill-red-500 drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* RIGHT SIDEBAR — aligned so avatar sits at ~50% screen height */}
      <motion.div
        className="absolute right-3 z-50 flex flex-col items-center gap-4"
        style={{ bottom: '16px' }}
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* CTA — top of sidebar, above avatar */}
        {hasPromotion && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              isProductPost ? handleAddToCart() : handleCtaClick();
            }}
            whileTap={{ scale: 0.85 }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className="w-12 h-12 rounded-full flex items-center justify-center text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]"
          >
            {isProductPost ? (
              <ShoppingCart className="w-7 h-7" strokeWidth={1.5} />
            ) : isChallengePost ? (
              <Trophy className="w-7 h-7" strokeWidth={1.5} />
            ) : (
              <PawPrint className="w-7 h-7" strokeWidth={1.5} />
            )}
          </motion.button>
        )}

        {/* Avatar */}
        <div className="relative mb-1">
          <Avatar
            className="w-12 h-12 cursor-pointer border-2 border-white"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/user/${post.user_id}`);
            }}
          >
            <AvatarImage src={post.user_profile?.avatar_url || ""} className="object-cover" />
            <AvatarFallback className="bg-white/20">
              <User className="w-5 h-5 text-white" />
            </AvatarFallback>
          </Avatar>
          {!post.is_following && post.user_id !== userId && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onFollow(post.user_id);
              }}
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#FF3B5C" }}
              whileTap={{ scale: 0.85 }}
            >
              <Plus className="w-3 h-3 text-white" strokeWidth={3} />
            </motion.button>
          )}
        </div>

        {/* Like */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onLike(post.id);
          }}
          whileTap={{ scale: 0.85 }}
          className="flex flex-col items-center gap-1"
        >
          <Heart
            className={cn(
              "w-8 h-8 drop-shadow-lg",
              post.is_liked ? "fill-red-500 text-red-500" : "text-white"
            )}
            strokeWidth={1.5}
          />
          <span className="text-white font-semibold drop-shadow-lg" style={{ fontSize: "12px" }}>
            {formatCount(post.likes_count)}
          </span>
        </motion.button>

        {/* Comments */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            setShowComments(true);
          }}
          whileTap={{ scale: 0.85 }}
          className="flex flex-col items-center gap-1"
        >
          <MessageCircle className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white font-semibold drop-shadow-lg" style={{ fontSize: "12px" }}>
            {formatCount(post.comments_count)}
          </span>
        </motion.button>

        {/* Share */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            handleShare();
          }}
          whileTap={{ scale: 0.85 }}
          className="flex flex-col items-center gap-1"
        >
          <Send className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white font-semibold drop-shadow-lg" style={{ fontSize: "12px" }}>
            {formatCount(Math.max(Math.floor(post.likes_count * 0.3), 0))}
          </span>
        </motion.button>

        {/* Spinning disc */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="rounded-full overflow-hidden bg-neutral-800"
          style={{ width: "36px", height: "36px", border: "4px solid rgba(50,50,50,0.9)" }}
        >
          {post.user_profile?.avatar_url ? (
            <img src={post.user_profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-3.5 h-3.5 text-white/60" />
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Product info — top-right, vertical */}
      {(isProductPost || isCtaPost || isChallengePost) && (
        <div className="absolute top-16 left-0 z-50 flex flex-col items-start gap-1.5 px-2">
          {/* Weight / Challenge / CTA label */}
          {isProductPost && post.product_weight && (
            <span
              className="px-2 py-0.5 rounded-full text-white text-xs"
              style={{ backgroundColor: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
            >
              {post.product_weight}
            </span>
          )}
          {isChallengePost && (
            <div
              className="px-3 py-1 rounded-full text-white text-sm font-medium"
              style={{ backgroundColor: "rgba(255,255,255,0.2)", backdropFilter: "blur(12px)" }}
            >
              🏆 אתגר
            </div>
          )}
          {isCtaPost && (
            <div
              className="px-3 py-1 rounded-full text-white text-sm font-medium"
              style={{ backgroundColor: "rgba(255,255,255,0.2)", backdropFilter: "blur(12px)" }}
            >
              🐾 {post.cta_text || "אימוץ"}
            </div>
          )}
          {/* Sizes */}
          {isProductPost && post.product_sizes && (
            <div className="flex flex-wrap gap-1">
              {post.product_sizes.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded-full text-white text-xs"
                  style={{ backgroundColor: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          {/* Price — bottom */}
          {isProductPost && post.product_price && (
            <div
              className="px-3 py-1 rounded-full text-white text-sm font-bold"
              style={{ backgroundColor: "rgba(255,255,255,0.2)", backdropFilter: "blur(12px)" }}
            >
              ₪{post.product_price}
            </div>
          )}
        </div>
      )}

      {/* BOTTOM-LEFT info */}
      <div className="absolute left-3 z-50 max-w-[72%] flex flex-col gap-0.5" style={{ bottom: '16px' }}>

        {/* Username */}
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className="text-white font-bold cursor-pointer drop-shadow-lg"
            style={{ fontSize: "16px" }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/user/${post.user_id}`);
            }}
          >
            {post.user_profile?.full_name || "משתמש"}
          </span>
          {post.user_profile?.is_verified && (
            <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" />
            </span>
          )}
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-white drop-shadow-lg line-clamp-2" style={{ fontSize: "14px", lineHeight: 1.4 }}>
            {post.caption}
          </p>
        )}

        {/* Social proof */}
        <SocialProofLabel postId={post.id} userId={userId} />

        {/* Music / Sound bar */}
        <div className="flex items-center gap-2 mt-2">
          <Music className="w-4 h-4 text-white flex-shrink-0" />
          <div className="overflow-hidden max-w-[200px]">
            <p className="text-white whitespace-nowrap animate-marquee" style={{ fontSize: "14px" }}>
              ♫ {post.music_title ? `${post.music_title} — ${post.music_artist || "PetID"}` : "PetID · Original Sound"} &nbsp;&nbsp;&nbsp; ♫ {post.music_title ? `${post.music_title} — ${post.music_artist || "PetID"}` : "PetID · Original Sound"}
            </p>
          </div>
        </div>
      </div>


      {/* Gallery indicator dots */}
      {hasMultipleImages && (
        <div className="absolute bottom-[100px] left-1/2 -translate-x-1/2 z-50 flex gap-1.5">
          {allImages.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                i === currentImageIndex ? "w-5 bg-white" : "w-1.5 bg-white/50"
              )}
            />
          ))}
        </div>
      )}

      {/* Comments Sheet */}
      <CommentsSheet
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        postId={post.id}
        postAuthor={{
          name: post.user_profile?.full_name || "משתמש",
          avatar_url: post.user_profile?.avatar_url || "",
        }}
        commentsCount={post.comments_count}
        reactionsCount={post.likes_count}
      />
    </motion.div>
  );
};
