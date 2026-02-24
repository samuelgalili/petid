import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  ShoppingCart,
  Music,
  Share2,
  Trophy,
  PawPrint,
  CalendarPlus,
  Crown,
  ShieldCheck,
  ShieldAlert,
  MoreVertical,
  Trash2,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { playAddToCartSound } from "@/lib/sounds";
import { useCart } from "@/contexts/CartContext";
import { useFlyingCart } from "@/components/FlyingCartAnimation";
import { CommentsSheet } from "@/components/CommentsSheet";
import { ShareSheet } from "@/components/feed/ShareSheet";
import { ConsultAIButton } from "@/components/feed/ConsultAIButton";
import { RelevanceBadge } from "@/components/feed/RelevanceBadge";
import { SmartCheckoutSheet } from "@/components/feed/SmartCheckoutSheet";

import { QuickTipOverlay } from "@/components/feed/QuickTipOverlay";
import { ProductSafetyBadge, useProductSafety } from "@/components/feed/ProductSafetyBadge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { useOverlayNav } from "@/contexts/OverlayNavContext";
import type { FeedPost } from "@/hooks/useSoundtrackFeed";
import type { ActivePet } from "@/hooks/useActivePet";

/* ─── Smart tag → shop category mapping ─── */
const TAG_CATEGORY_MAP: Record<string, { path: string; label: string }> = {
  "חרדה": { path: "/shop?category=calming", label: "תוספי הרגעה" },
  "anxiety": { path: "/shop?category=calming", label: "תוספי הרגעה" },
  "stress": { path: "/shop?category=calming", label: "תוספי הרגעה" },
  "לחץ": { path: "/shop?category=calming", label: "תוספי הרגעה" },
  "תזונה": { path: "/shop?category=food", label: "מזון ותזונה" },
  "nutrition": { path: "/shop?category=food", label: "מזון ותזונה" },
  "אוכל": { path: "/shop?category=food", label: "מזון ותזונה" },
  "food": { path: "/shop?category=food", label: "מזון ותזונה" },
  "טיפוח": { path: "/shop?category=grooming", label: "טיפוח ופרווה" },
  "grooming": { path: "/shop?category=grooming", label: "טיפוח ופרווה" },
  "פרווה": { path: "/shop?category=grooming", label: "טיפוח ופרווה" },
  "fur": { path: "/shop?category=grooming", label: "טיפוח ופרווה" },
  "צעצוע": { path: "/shop?category=toys", label: "צעצועים" },
  "toys": { path: "/shop?category=toys", label: "צעצועים" },
  "משחק": { path: "/shop?category=toys", label: "צעצועים" },
  "בריאות": { path: "/shop?category=health", label: "תוספי בריאות" },
  "health": { path: "/shop?category=health", label: "תוספי בריאות" },
  "ויטמין": { path: "/shop?category=health", label: "ויטמינים ותוספים" },
  "vitamin": { path: "/shop?category=health", label: "ויטמינים ותוספים" },
  "מפרקים": { path: "/shop?category=joints", label: "בריאות מפרקים" },
  "joint": { path: "/shop?category=joints", label: "בריאות מפרקים" },
  "עור": { path: "/shop?category=skin", label: "בריאות העור" },
  "skin": { path: "/shop?category=skin", label: "בריאות העור" },
  "אימון": { path: "/shop?category=training", label: "ציוד אימון" },
  "training": { path: "/shop?category=training", label: "ציוד אימון" },
};

function getSmartShopLink(caption: string | null): { path: string; label: string } | null {
  if (!caption) return null;
  const lower = caption.toLowerCase();
  for (const [keyword, target] of Object.entries(TAG_CATEGORY_MAP)) {
    if (lower.includes(keyword)) return target;
  }
  return null;
}

/* ─── Engagement topic tracking ─── */
const TOPIC_KEYWORDS: Record<string, string[]> = {
  grooming: ["טיפוח", "grooming", "פרווה", "fur", "רחצה", "bath"],
  nutrition: ["תזונה", "nutrition", "אוכל", "food", "מזון", "diet"],
  health: ["בריאות", "health", "ויטמין", "vitamin", "תוסף", "supplement"],
  training: ["אימון", "training", "משמעת", "discipline"],
  toys: ["צעצוע", "toy", "משחק", "play"],
  anxiety: ["חרדה", "anxiety", "stress", "לחץ", "הרגעה", "calming"],
};

function detectPostTopics(caption: string | null): string[] {
  if (!caption) return [];
  const lower = caption.toLowerCase();
  const topics: string[] = [];
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) topics.push(topic);
  }
  return topics;
}

function trackLikedTopics(caption: string | null) {
  const topics = detectPostTopics(caption);
  if (topics.length === 0) return;
  try {
    const stored = JSON.parse(localStorage.getItem("petid_liked_topics") || "{}");
    for (const t of topics) {
      stored[t] = (stored[t] || 0) + 1;
    }
    localStorage.setItem("petid_liked_topics", JSON.stringify(stored));
  } catch { /* noop */ }
}

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
  activePet?: ActivePet | null;
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
  activePet,
}: SoundtrackPostCardProps) => {
  const navigate = useNavigate();
  const { direction } = useLanguage();
  const isRtl = direction === "rtl";
  const { activePet: contextPet, pets } = usePetPreference();
  const { openPublicPet } = useOverlayNav();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showSmartCheckout, setShowSmartCheckout] = useState(false);
  const [overlayDimmed, setOverlayDimmed] = useState(false);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const lastTapRef = useRef(0);
  const dimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addToCart } = useCart();
  const { triggerFly } = useFlyingCart();
  const productImageRef = useRef<HTMLImageElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [authorPetId, setAuthorPetId] = useState<string | null>(null);

  // Look up the post author's pet (for opening public profile)
  useEffect(() => {
    if (!post.user_id) return;
    supabase
      .from("pets" as any)
      .select("id")
      .eq("user_id", post.user_id)
      .eq("archived", false)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAuthorPetId((data as any).id);
      });
  }, [post.user_id]);

  const handleOpenAuthorProfile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (authorPetId) {
      openPublicPet(authorPetId);
    } else {
      navigate(`/user/${post.user_id}`);
    }
  }, [authorPetId, openPublicPet, navigate, post.user_id]);

  // Auto-play music when this post is the current visible post
  const isActive = index === currentIndex;

  // Auto-dim bottom overlay after 3 seconds of inactivity
  useEffect(() => {
    if (!isActive) { setOverlayDimmed(false); return; }
    setOverlayDimmed(false);
    if (dimTimerRef.current) clearTimeout(dimTimerRef.current);
    dimTimerRef.current = setTimeout(() => setOverlayDimmed(true), 3000);
    return () => { if (dimTimerRef.current) clearTimeout(dimTimerRef.current); };
  }, [isActive, currentImageIndex]);
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

  // Product safety check — must be after isProductPost is defined
  const productSafety = useProductSafety(
    isProductPost ? post.product_name || null : null,
    post.caption,
    activePet || null,
  );

  // Determine if this is a "tip" post (not product/challenge/cta)
  const isTipPost = !isProductPost && !isChallengePost && !isCtaPost;

  // Multi-pet match: calculate which pets this post is relevant for
  const matchingPets = useMemo(() => {
    if (!pets.length || !post.caption) return [];
    const captionLower = (post.caption || "").toLowerCase();
    return pets.filter((p) => {
      const nameMatch = captionLower.includes(p.name.toLowerCase());
      const typeMatch = captionLower.includes(p.pet_type === "dog" ? "כלב" : p.pet_type === "cat" ? "חתול" : "");
      const breedMatch = p.breed && captionLower.includes(p.breed.toLowerCase());
      return nameMatch || typeMatch || breedMatch;
    });
  }, [pets, post.caption]);

  const handleAddToCarePlan = () => {
    toast.success(isRtl ? "נוסף לתוכנית הטיפול 📋" : "Added to Care Plan 📋", {
      description: isRtl ? "תזכורת נשמרה בלוח הבקרה" : "Reminder saved to dashboard",
      duration: 3000,
    });
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!post.is_liked) {
        onLike(post.id);
        trackLikedTopics(post.caption);
      }
      setShowHeartBurst(true);
      // Haptic feedback for paw-confetti
      if (navigator.vibrate) navigator.vibrate([15, 30, 15]);
      setTimeout(() => setShowHeartBurst(false), 800);
    }
    lastTapRef.current = now;
  };

  // V73: Smart shop link derived from post caption tags
  const smartShopLink = useMemo(() => getSmartShopLink(post.caption), [post.caption]);

  const handleShare = () => {
    setShowShareSheet(true);
  };

  const isPostOwner = userId === post.user_id;

  const handleDeletePost = async () => {
    if (!userId || !isPostOwner) return;
    setDeletingPost(true);
    try {
      await supabase.from("post_likes").delete().eq("post_id", post.id);
      await supabase.from("post_comments").delete().eq("post_id", post.id);
      const { error } = await supabase.from("posts").delete().eq("id", post.id).eq("user_id", userId);
      if (error) throw error;
      toast.success("הפוסט נמחק בהצלחה");
      window.location.reload();
    } catch {
      toast.error("שגיאה במחיקת הפוסט");
    } finally {
      setDeletingPost(false);
      setShowPostMenu(false);
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
      navigate(`/product/${post.product_id}`);
    } else if (isCtaPost) {
      navigate('/adoption');
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

      {/* Bottom gradient — refined for glassmorphism overlay */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
        style={{
          height: "35%",
          background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 z-10 pointer-events-none"
        style={{
          height: "60px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 100%)",
        }}
      />

      {/* Header removed — focus on pet content only */}

      {/* Quick Tip Overlay */}
      <QuickTipOverlay
        caption={post.caption}
        activePet={activePet || null}
        isActive={isActive}
      />

      {/* Double-tap paw burst */}
      <AnimatePresence>
        {showHeartBurst && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
            initial={{ scale: 0, opacity: 1, rotate: -20 }}
            animate={{ scale: [0, 1.3, 1.1], opacity: [1, 1, 0], rotate: [-20, 5, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <PawPrint className="w-24 h-24 text-white fill-white drop-shadow-2xl" strokeWidth={0.5} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* SafeScore floating overlay for product posts */}
      {isProductPost && activePet && (
        <motion.div
          className="absolute top-14 z-40 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
          style={{
            [isRtl ? "left" : "right"]: "12px",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            background: productSafety.level === "safe" 
              ? "rgba(34,197,94,0.2)" 
              : productSafety.level === "caution"
              ? "rgba(245,158,11,0.2)"
              : "rgba(239,68,68,0.2)",
            border: `1px solid ${
              productSafety.level === "safe" 
                ? "rgba(34,197,94,0.3)" 
                : productSafety.level === "caution"
                ? "rgba(245,158,11,0.3)"
                : "rgba(239,68,68,0.3)"
            }`,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
        >
          {productSafety.level === "safe" ? (
            <ShieldCheck className="w-3.5 h-3.5 text-green-400" strokeWidth={2} />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" strokeWidth={2} />
          )}
          <span className="text-[10px] font-semibold text-white">
            {productSafety.level === "safe" ? "בטוח" : productSafety.level === "caution" ? "זהירות" : "לא מתאים"}
          </span>
        </motion.div>
      )}

      {/* RIGHT SIDEBAR — zen minimal: 3 icons only */}
      <motion.div
        className="absolute right-3 z-50 flex flex-col items-center gap-5"
        style={{ bottom: '140px' }}
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 0.6 }}
        whileHover={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* Like (Paw) */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onLike(post.id);
            if (!post.is_liked) trackLikedTopics(post.caption);
          }}
          whileTap={{ scale: 0.85 }}
          className="flex flex-col items-center gap-1"
        >
          <PawPrint
            className={cn(
              "w-7 h-7 drop-shadow-lg transition-all",
              post.is_liked ? "fill-white text-white opacity-100" : "text-white/80"
            )}
            strokeWidth={1.5}
          />
          <span className="text-white/80 font-medium drop-shadow-lg" style={{ fontSize: "11px" }}>
            {formatCount(post.likes_count)}
          </span>
        </motion.button>

        {/* Comment */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            setShowComments(true);
          }}
          whileTap={{ scale: 0.85 }}
          className="flex flex-col items-center gap-1"
        >
          <MessageCircle className="w-7 h-7 text-white/80 drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white/80 font-medium drop-shadow-lg" style={{ fontSize: "11px" }}>
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
          <Share2 className="w-7 h-7 text-white/80 drop-shadow-lg" strokeWidth={1.5} />
        </motion.button>

        {/* More (3-dot menu) */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            setShowPostMenu(true);
          }}
          whileTap={{ scale: 0.85 }}
          className="flex flex-col items-center gap-1"
        >
          <MoreVertical className="w-6 h-6 text-white/60 drop-shadow-lg" strokeWidth={1.5} />
        </motion.button>
      </motion.div>

      {/* Post menu overlay */}
      <AnimatePresence>
        {showPostMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/40"
              onClick={(e) => { e.stopPropagation(); setShowPostMenu(false); }}
            />
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 22, stiffness: 350 }}
              className="fixed bottom-24 inset-x-0 mx-auto w-fit z-[9999] flex flex-col gap-1 px-2 py-2 bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl min-w-[200px]"
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              {isPostOwner && (
                <button
                  onClick={handleDeletePost}
                  disabled={deletingPost}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors w-full text-right"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="text-sm font-semibold">{deletingPost ? "מוחק..." : "מחק פוסט"}</span>
                </button>
              )}
              <button
                onClick={() => { toast.success("הפוסט דווח"); setShowPostMenu(false); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground hover:bg-secondary transition-colors w-full text-right"
              >
                <Flag className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">דווח על פוסט</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ UNIFIED GLASSMORPHISM BOTTOM OVERLAY ═══ */}
      <motion.div
        className="absolute inset-x-0 bottom-0 z-40"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: overlayDimmed ? 0.3 : 1 }}
        transition={overlayDimmed ? { duration: 1, ease: "easeOut" } : { delay: 0.25, type: "spring", stiffness: 300, damping: 30 }}
        onTouchStart={() => { setOverlayDimmed(false); if (dimTimerRef.current) clearTimeout(dimTimerRef.current); dimTimerRef.current = setTimeout(() => setOverlayDimmed(true), 3000); }}
        onClick={() => { setOverlayDimmed(false); if (dimTimerRef.current) clearTimeout(dimTimerRef.current); dimTimerRef.current = setTimeout(() => setOverlayDimmed(true), 3000); }}
      >
        <div
          className="mx-2 mb-2 rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(0,0,0,0.45), rgba(0,0,0,0.3))",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}
          dir={isRtl ? "rtl" : "ltr"}
        >
          {/* Row 1: Product badges (price, safety, challenge) */}
          {(isProductPost || isCtaPost || isChallengePost) && (
            <div className="flex items-center gap-2 px-3 pt-3 pb-1 flex-wrap">
              {isProductPost && post.product_price && productSafety.level !== "unsafe" && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowSmartCheckout(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-opacity hover:opacity-80"
                  style={{
                    background: productSafety.level === "caution"
                      ? "rgba(245,158,11,0.3)"
                      : "rgba(255,59,92,0.3)",
                    border: `1px solid ${productSafety.level === "caution" ? "rgba(245,158,11,0.4)" : "rgba(255,59,92,0.4)"}`,
                  }}
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-white" />
                  <span className="text-white font-bold" style={{ fontSize: "14px" }}>₪{post.product_price}</span>
                </button>
              )}
              {isProductPost && productSafety.level === "caution" && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{ background: "rgba(245,158,11,0.25)", color: "#FCD34D", border: "1px solid rgba(245,158,11,0.3)" }}>
                  ⚠ {productSafety.reason}
                </span>
              )}
              {isProductPost && productSafety.level === "unsafe" && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{ background: "rgba(239,68,68,0.25)", color: "#FCA5A5", border: "1px solid rgba(239,68,68,0.3)" }}>
                  ⛔ {productSafety.reason}
                </span>
              )}
              {isChallengePost && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold"
                  style={{ background: "rgba(255,175,43,0.25)", color: "#FCD34D", border: "1px solid rgba(255,175,43,0.3)" }}>
                  <Trophy className="w-3 h-3" /> אתגר
                </span>
              )}
              {isCtaPost && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold"
                  style={{ background: "rgba(76,175,80,0.25)", color: "#86EFAC", border: "1px solid rgba(76,175,80,0.3)" }}>
                  <PawPrint className="w-3 h-3" /> {post.cta_text || "אימוץ"}
                </span>
              )}
              {/* Weight + Sizes inline */}
              {isProductPost && (post.product_weight || post.product_sizes) && (
                <>
                  {post.product_weight && (
                    <span className="px-2 py-1 rounded-full text-white/70 text-[11px] font-medium"
                      style={{ background: "rgba(255,255,255,0.1)" }}>
                      {post.product_weight}
                    </span>
                  )}
                  {post.product_sizes?.map((s) => (
                    <span key={s} className="px-2 py-1 rounded-full text-white/60 text-[11px] font-medium"
                      style={{ background: "rgba(255,255,255,0.08)" }}>
                      {s}
                    </span>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Author name (tappable → opens public profile) + Caption */}
          <div className="px-3.5 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              {/* Post author name — tappable to open their public pet profile */}
              {post.user_profile?.full_name && (
                <button
                  onClick={handleOpenAuthorProfile}
                  className="text-white/90 font-semibold drop-shadow-lg hover:text-white transition-colors"
                  style={{ fontSize: "13px" }}
                >
                  {post.user_profile.full_name}
                </button>
              )}
              {/* Scientist pill — relevance to viewer's pet */}
              {activePet && (
                <RelevanceBadge
                  caption={post.caption}
                  petName={activePet.name}
                  petBreed={activePet.breed}
                  petType={activePet.pet_type}
                  petAgeWeeks={activePet.ageWeeks}
                  medicalConditions={activePet.medical_conditions}
                />
              )}
            </div>
            {post.caption && (
              <p className="text-white/70 line-clamp-2" style={{ fontSize: "12px", lineHeight: 1.4 }}>
                {post.caption}
              </p>
            )}
          </div>

          {/* Row 4: Action bar */}
          {isProductPost && post.product_price && productSafety.level !== "unsafe" ? (
            <div className="px-3 pb-3">
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSmartCheckout(true);
                }}
                whileTap={{ scale: 0.96 }}
                className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-white" strokeWidth={1.5} />
                  <span className="text-white font-semibold" style={{ fontSize: "13px" }}>
                    {isRtl ? "קנייה ישירה" : "Direct Buy"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: "rgba(255,215,0,0.2)", color: "#FFD700" }}>
                    <Crown className="w-3 h-3 inline mr-0.5" />
                    {isRtl ? "הנחת חבר" : "Member"}
                  </span>
                  <span className="text-white font-bold" style={{ fontSize: "15px" }}>₪{post.product_price}</span>
                </div>
              </motion.button>
            </div>
          ) : isTipPost ? (
            <div className="px-3 pb-3 flex flex-col gap-2">
              {smartShopLink && (
                <motion.button
                  onClick={(e) => { e.stopPropagation(); navigate(smartShopLink.path); }}
                  whileTap={{ scale: 0.96 }}
                  className="w-full flex items-center justify-between py-2 px-4 rounded-xl"
                  style={{ background: "rgba(0,153,230,0.15)", border: "1px solid rgba(0,153,230,0.25)" }}
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-3.5 h-3.5 text-blue-300" strokeWidth={1.5} />
                    <span className="text-blue-200 font-semibold" style={{ fontSize: "12px" }}>{smartShopLink.label}</span>
                  </div>
                  <span className="text-white/50 text-[11px]">{isRtl ? "צפה ←" : "View →"}</span>
                </motion.button>
              )}
              <motion.button
                onClick={(e) => { e.stopPropagation(); handleAddToCarePlan(); }}
                whileTap={{ scale: 0.96 }}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl"
                style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.25)" }}
              >
                <CalendarPlus className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.5} />
                <span className="text-emerald-300 font-semibold" style={{ fontSize: "12px" }}>
                  {isRtl ? "הוסף לתוכנית הטיפול" : "Add to Care Plan"}
                </span>
              </motion.button>
            </div>
          ) : null}
        </div>
      </motion.div>

      {/* Old standalone bars removed — now unified in glassmorphism overlay */}

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

      <ShareSheet
        open={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        shareUrl={`${window.location.origin}/post/${post.id}`}
        caption={post.caption}
      />

      {/* Smart Checkout Sheet */}
      {isProductPost && post.product_id && (
        <SmartCheckoutSheet
          open={showSmartCheckout}
          onClose={() => setShowSmartCheckout(false)}
          productId={post.product_id}
          productName={post.product_name || "מוצר"}
          productPrice={post.product_price || 0}
          productWeight={post.product_weight}
          productImage={allImages[0] || ""}
        />
      )}
    </motion.div>
  );
};
