/**
 * SmartPostCard — PetID's flagship UGC post card.
 * V69: Visual Information Density — icon consistency, smart overlay positioning,
 * save micro-animation, and breed-specific silhouette.
 */

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Bookmark,
  ShoppingBag,
  ShieldCheck,
  Star,
  X,
  Dog,
  Cat,
  ClipboardPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";

/* ─── Types ─── */

interface TaggedProduct {
  id: string;
  name: string;
  price: string;
  image_url?: string;
  verified_purchase?: boolean;
}

interface SmartPostCardProps {
  mediaUrl: string;
  mediaType?: "image" | "video";
  userName: string;
  userAvatar?: string;
  petName: string;
  petBreed?: string;
  petType?: "dog" | "cat" | null;
  caption?: string;
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  taggedProduct?: TaggedProduct | null;
  healthImprovement?: string;
  onLike?: () => void;
  onComment?: () => void;
  onSave?: () => void;
  onBuyProduct?: (product: TaggedProduct) => void;
  onAvatarClick?: () => void;
}

/* ─── Breed silhouette mapping ─── */
const BREED_SILHOUETTE: Record<string, string> = {
  "shih tzu": "🐾",
  "שיצו": "🐾",
  "golden retriever": "🦮",
  "גולדן רטריבר": "🦮",
  "poodle": "🐩",
  "פודל": "🐩",
};

/* ─── Save Confirmation Toast ─── */
const SaveConfirmation = ({ petName, visible }: { petName: string; visible: boolean }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        className="absolute z-40 bottom-24 inset-x-0 flex justify-center pointer-events-none"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-2xl border border-white/25 shadow-xl">
          <ClipboardPlus className="w-4 h-4 text-primary" strokeWidth={1.5} />
          <span className="text-[11px] font-bold text-white">
            נוסף לתוכנית הטיפול של {petName}
          </span>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

/* ─── Component ─── */

export const SmartPostCard = ({
  mediaUrl,
  mediaType = "image",
  userName,
  userAvatar,
  petName,
  petBreed,
  petType,
  caption,
  likeCount = 0,
  commentCount = 0,
  isLiked = false,
  isSaved = false,
  taggedProduct,
  healthImprovement,
  onLike,
  onComment,
  onSave,
  onBuyProduct,
  onAvatarClick,
}: SmartPostCardProps) => {
  const { direction } = useLanguage();
  const isRtl = direction === "rtl";
  const [liked, setLiked] = useState(isLiked);
  const [saved, setSaved] = useState(isSaved);
  const [showProductCard, setShowProductCard] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const lastTapRef = useRef(0);

  /* Breed silhouette emoji */
  const breedKey = petBreed?.toLowerCase().trim() || "";
  const breedSilhouette = BREED_SILHOUETTE[breedKey] || null;
  const BreedIcon = petType === "cat" ? Cat : Dog;

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!liked) {
        setLiked(true);
        onLike?.();
      }
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 900);
    }
    lastTapRef.current = now;
  };

  const toggleLike = () => {
    setLiked((v) => !v);
    onLike?.();
  };

  const toggleSave = () => {
    const next = !saved;
    setSaved(next);
    onSave?.();
    if (next) {
      setShowSaveConfirm(true);
      setTimeout(() => setShowSaveConfirm(false), 2200);
    }
  };

  const formatCount = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return n.toString();
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl bg-card border border-border/30 shadow-lg"
      style={{ aspectRatio: "9/16" }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* ─── Media ─── */}
      <div className="absolute inset-0" onClick={handleDoubleTap}>
        {mediaType === "video" ? (
          <video
            src={mediaUrl}
            className="w-full h-full object-cover"
            loop
            muted
            playsInline
            autoPlay
          />
        ) : (
          <img
            src={mediaUrl}
            alt={`${petName}'s post`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {/* Cinematic gradient — heavier at bottom, lighter top to not obscure pet */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/15" />
      </div>

      {/* ─── Double-tap heart burst ─── */}
      <AnimatePresence>
        {showHeartBurst && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
          >
            <Heart className="w-24 h-24 text-white fill-white drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Save Confirmation Micro-animation ─── */}
      <SaveConfirmation petName={petName} visible={showSaveConfirm} />

      {/* ─── Header (Top) ─── */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-3.5">
        <div
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={onAvatarClick}
        >
          <Avatar className="w-10 h-10 border-2 border-white/30 shadow-md">
            <AvatarImage src={userAvatar} alt={userName} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
              {userName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white drop-shadow-md leading-tight">
              {userName}
            </span>
            <span className="text-[11px] text-white/70 drop-shadow-sm leading-tight">
              {petName}
              {petBreed && ` · ${petBreed}`}
            </span>
          </div>
        </div>

        {/* Personalized badge — glassmorphism */}
        <motion.div
          initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-xl border border-white/20 shadow-lg"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
          <span className="text-[10px] font-semibold text-white whitespace-nowrap">
            מותאם ל{petName}
          </span>
        </motion.div>
      </div>

      {/* ─── Breed Silhouette (Bottom-corner watermark) ─── */}
      {(breedSilhouette || petType) && (
        <div
          className={cn(
            "absolute z-10 bottom-20 opacity-[0.08] pointer-events-none",
            isRtl ? "right-3" : "left-3"
          )}
        >
          {breedSilhouette ? (
            <span className="text-[72px] leading-none select-none">{breedSilhouette}</span>
          ) : (
            <BreedIcon className="w-16 h-16 text-white" strokeWidth={0.8} />
          )}
        </div>
      )}

      {/* ─── Sidebar Actions — positioned at 60% from top to stay below pet's face ─── */}
      <div
        className={cn(
          "absolute z-20 flex flex-col items-center gap-4",
          isRtl ? "left-2.5" : "right-2.5"
        )}
        style={{ top: "55%", transform: "translateY(-40%)" }}
      >
        {/* Like */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={toggleLike}
          className="flex flex-col items-center gap-0.5"
        >
          <div
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-all",
              liked
                ? "bg-destructive/30 shadow-[0_0_16px_hsl(var(--destructive)/0.4)]"
                : "bg-white/10"
            )}
          >
            <Heart
              className={cn(
                "w-[22px] h-[22px] transition-all",
                liked ? "text-destructive fill-destructive" : "text-white"
              )}
              strokeWidth={1.5}
            />
          </div>
          <span className="text-[10px] font-semibold text-white drop-shadow-md">
            {formatCount(likeCount + (liked && !isLiked ? 1 : 0))}
          </span>
        </motion.button>

        {/* Comment */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onComment}
          className="flex flex-col items-center gap-0.5"
        >
          <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
            <MessageCircle className="w-[22px] h-[22px] text-white" strokeWidth={1.5} />
          </div>
          <span className="text-[10px] font-semibold text-white drop-shadow-md">
            {formatCount(commentCount)}
          </span>
        </motion.button>

        {/* Save / Bookmark */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={toggleSave}
          className="flex flex-col items-center gap-0.5"
        >
          <motion.div
            animate={saved ? { scale: [1, 1.25, 1] } : {}}
            transition={{ duration: 0.35 }}
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-colors",
              saved ? "bg-primary/30" : "bg-white/10"
            )}
          >
            <Bookmark
              className={cn(
                "w-[22px] h-[22px] transition-all",
                saved ? "text-primary fill-primary" : "text-white"
              )}
              strokeWidth={1.5}
            />
          </motion.div>
        </motion.button>

        {/* Product Tag (Shoppable) */}
        {taggedProduct && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
            whileTap={{ scale: 0.85 }}
            onClick={() => setShowProductCard((v) => !v)}
            className="relative flex flex-col items-center gap-0.5"
          >
            <div className="w-11 h-11 rounded-full bg-primary/25 backdrop-blur-md flex items-center justify-center border border-primary/30">
              <ShoppingBag className="w-[22px] h-[22px] text-white" strokeWidth={1.5} />
            </div>
            <span className="absolute -top-0.5 ltr:-right-0.5 rtl:-left-0.5 w-2.5 h-2.5 rounded-full bg-primary animate-pulse border border-black/20" />
          </motion.button>
        )}
      </div>

      {/* ─── Product Popup Card ─── */}
      <AnimatePresence>
        {showProductCard && taggedProduct && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={cn(
              "absolute z-30 bottom-28",
              isRtl ? "left-16" : "right-16"
            )}
          >
            <div className="w-52 rounded-2xl bg-white/15 backdrop-blur-2xl border border-white/25 shadow-2xl overflow-hidden">
              {taggedProduct.image_url && (
                <img
                  src={taggedProduct.image_url}
                  alt={taggedProduct.name}
                  className="w-full h-28 object-cover"
                />
              )}

              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {taggedProduct.name}
                    </p>
                    <p className="text-xs text-white/70 font-semibold mt-0.5">
                      ₪{taggedProduct.price}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowProductCard(false);
                    }}
                    className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5 text-white/80" />
                  </button>
                </div>

                {taggedProduct.verified_purchase && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-primary">
                    <ShieldCheck className="w-3 h-3" strokeWidth={1.5} />
                    קנייה מאומתת
                  </div>
                )}

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onBuyProduct?.(taggedProduct)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
                >
                  <ShoppingBag className="w-3.5 h-3.5" strokeWidth={1.5} />
                  קנה עכשיו
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bottom: Caption + Health Bar ─── */}
      <div className="absolute bottom-0 inset-x-0 z-20 space-y-0">
        {caption && (
          <div className="px-4 pb-2">
            <p className="text-sm text-white drop-shadow-md leading-relaxed line-clamp-2">
              <span className="font-bold">{userName}</span>{" "}
              {caption}
            </p>
          </div>
        )}

        {healthImprovement && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="w-full px-4 py-2.5 bg-black/40 backdrop-blur-lg border-t border-white/10"
          >
            <div className="flex items-center justify-center gap-2">
              <Star className="w-4 h-4 text-primary" strokeWidth={1.5} fill="currentColor" />
              <span className="text-xs font-bold text-white/90">
                {healthImprovement.replace("{petName}", petName)}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
