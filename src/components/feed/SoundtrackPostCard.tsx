import { useState, useRef, useEffect, useMemo } from "react";
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
  Share2,
  Trophy,
  PawPrint,
  CalendarPlus,
  Dog,
  Cat,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { SocialProofLabel } from "@/components/feed";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import type { FeedPost } from "@/hooks/useSoundtrackFeed";
import type { ActivePet } from "@/hooks/useActivePet";

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showSmartCheckout, setShowSmartCheckout] = useState(false);
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
      if (!post.is_liked) onLike(post.id);
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 800);
    }
    lastTapRef.current = now;
  };

  const handleShare = () => {
    setShowShareSheet(true);
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

      {/* ── Pet-Aware Header ── */}
      <motion.div
        className="absolute top-3 z-40 flex items-center gap-2 px-3"
        style={{ [isRtl ? "right" : "left"]: "8px" }}
        dir={isRtl ? "rtl" : "ltr"}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        {/* Pet avatar */}
        <Avatar
          className="w-9 h-9 cursor-pointer"
          style={{
            border: "2px solid white",
            boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
          }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/user/${post.user_id}`);
          }}
        >
          <AvatarImage
            src={post.user_profile?.avatar_url || ""}
            className="object-cover"
          />
          <AvatarFallback className="bg-white/20">
            <User className="w-4 h-4 text-white" />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span
            className="text-white font-bold drop-shadow-lg leading-tight cursor-pointer"
            style={{ fontSize: "14px", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/user/${post.user_id}`);
            }}
          >
            {post.user_profile?.full_name || (isRtl ? "משתמש" : "User")}
          </span>
          {activePet && (
            <span
              className="flex items-center gap-1 text-white/80 drop-shadow-lg"
              style={{ fontSize: "11px", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
            >
              {activePet.pet_type === "cat" ? (
                <Cat className="w-3 h-3" strokeWidth={1.5} />
              ) : (
                <Dog className="w-3 h-3" strokeWidth={1.5} />
              )}
              {isRtl ? `עבור ${activePet.name}` : `For ${activePet.name}`}
            </span>
          )}
        </div>
      </motion.div>

      {activePet && (
        <div className="absolute top-[68px] right-3 z-40">
          <RelevanceBadge
            caption={post.caption}
            petName={activePet.name}
            petBreed={activePet.breed}
            petType={activePet.pet_type}
            petAgeWeeks={activePet.ageWeeks}
            medicalConditions={activePet.medical_conditions}
          />
        </div>
      )}


      {/* Quick Tip Overlay — contextual pet-specific tips */}
      <QuickTipOverlay
        caption={post.caption}
        activePet={activePet || null}
        isActive={isActive}
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
          <Share2 className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white font-semibold drop-shadow-lg" style={{ fontSize: "12px" }}>
            {formatCount(Math.max(Math.floor(post.likes_count * 0.3), 0))}
          </span>
        </motion.button>

        {/* Consult AI — "שאל את המוח" */}
        <ConsultAIButton
          postCaption={post.caption}
          petName={activePet?.name}
          petBreed={activePet?.breed}
          petType={activePet?.pet_type || "dog"}
        />

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
        <div className="absolute top-16 left-0 z-50 flex flex-col items-start gap-2" dir="ltr">
          {/* Price — prominent top badge (hidden if unsafe) */}
          {isProductPost && post.product_price && productSafety.level !== "unsafe" && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowSmartCheckout(true); }}
              className="pl-3 pr-4 py-1.5 rounded-r-full text-white font-bold flex items-center gap-1.5 shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
              style={{ 
                background: productSafety.level === "caution"
                  ? "linear-gradient(135deg, rgba(245,158,11,0.85), rgba(217,119,6,0.65))"
                  : "linear-gradient(135deg, rgba(255,59,92,0.85), rgba(255,59,92,0.65))",
                backdropFilter: "blur(16px)",
                fontSize: "15px"
              }}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              ₪{post.product_price}
            </button>
          )}
          {/* Product Safety Warning */}
          {isProductPost && (
            <ProductSafetyBadge
              productName={post.product_name || null}
              productCaption={post.caption}
              activePet={activePet || null}
            />
          )}
          {isChallengePost && (
            <div
              className="pl-3 pr-4 py-1.5 rounded-r-full text-white font-semibold flex items-center gap-1.5 shadow-lg"
              style={{ 
                background: "linear-gradient(135deg, rgba(255,175,43,0.85), rgba(255,140,0,0.7))",
                backdropFilter: "blur(16px)",
                fontSize: "14px"
              }}
            >
              <Trophy className="w-3.5 h-3.5" />
              אתגר
            </div>
          )}
          {isCtaPost && (
            <div
              className="pl-3 pr-4 py-1.5 rounded-r-full text-white font-semibold flex items-center gap-1.5 shadow-lg"
              style={{ 
                background: "linear-gradient(135deg, rgba(76,175,80,0.85), rgba(56,142,60,0.7))",
                backdropFilter: "blur(16px)",
                fontSize: "14px"
              }}
            >
              <PawPrint className="w-3.5 h-3.5" />
              {post.cta_text || "אימוץ"}
            </div>
          )}
          {/* Weight + Sizes row */}
          {isProductPost && (post.product_weight || post.product_sizes) && (
            <div className="flex items-center gap-1 pl-1">
              {post.product_weight && (
                <span
                  className="px-2.5 py-1 rounded-full text-white/90 text-[11px] font-medium"
                  style={{ backgroundColor: "rgba(255,255,255,0.18)", backdropFilter: "blur(10px)" }}
                >
                  {post.product_weight}
                </span>
              )}
              {post.product_sizes?.map((s) => (
                <span
                  key={s}
                  className="px-2 py-1 rounded-full text-white/80 text-[11px] font-medium"
                  style={{ backgroundColor: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)" }}
                >
                  {s}
                </span>
              ))}
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

      {/* ── Smart Action Bar ── */}
      <motion.div
        className="absolute inset-x-0 z-50 px-3"
        style={{ bottom: hasMultipleImages ? "108px" : "86px" }}
        dir={isRtl ? "rtl" : "ltr"}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        {isProductPost && post.product_price && productSafety.level !== "unsafe" ? (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              setShowSmartCheckout(true);
            }}
            whileTap={{ scale: 0.96 }}
            className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl"
            style={{
              background: "linear-gradient(135deg, rgba(0,0,0,0.65), rgba(0,0,0,0.45))",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-white" strokeWidth={1.5} />
              <span className="text-white font-semibold" style={{ fontSize: "14px" }}>
                {isRtl ? "קנייה ישירה" : "Direct Buy"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: "rgba(255,215,0,0.2)", color: "#FFD700" }}
              >
                <Crown className="w-3 h-3 inline mr-0.5" />
                {isRtl ? "הנחת חבר" : "Member Price"}
              </span>
              <span className="text-white font-bold" style={{ fontSize: "16px" }}>
                ₪{post.product_price}
              </span>
            </div>
          </motion.button>
        ) : isTipPost ? (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCarePlan();
            }}
            whileTap={{ scale: 0.96 }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl"
            style={{
              background: "linear-gradient(135deg, rgba(34,197,94,0.25), rgba(22,163,74,0.2))",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(34,197,94,0.3)",
            }}
          >
            <CalendarPlus className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
            <span className="text-emerald-300 font-semibold" style={{ fontSize: "13px" }}>
              {isRtl ? "הוסף לתוכנית הטיפול" : "Add to Care Plan"}
            </span>
          </motion.button>
        ) : null}
      </motion.div>

      {/* ── Multi-Pet Match Indicator ── */}
      {matchingPets.length > 0 && (
        <motion.div
          className="absolute inset-x-0 z-50 flex items-center justify-center"
          style={{ bottom: hasMultipleImages ? "82px" : "60px" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            dir={isRtl ? "rtl" : "ltr"}
          >
            <PawPrint className="w-3 h-3 text-white/70" strokeWidth={1.5} />
            <span className="text-white/80 font-medium" style={{ fontSize: "11px" }}>
              {isRtl
                ? `מתאים לפרופיל של ${matchingPets.map((p) => p.name).join(", ")}`
                : `Matches ${matchingPets.map((p) => p.name).join(", ")}'s profile`}
            </span>
            <div className="flex -space-x-1.5">
              {matchingPets.slice(0, 3).map((p) => (
                <Avatar key={p.id} className="w-4 h-4 border border-white/30">
                  {p.avatar_url ? (
                    <AvatarImage src={p.avatar_url} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-white/20 text-[6px] text-white">
                    {p.pet_type === "cat" ? "🐱" : "🐶"}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        </motion.div>
      )}

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
