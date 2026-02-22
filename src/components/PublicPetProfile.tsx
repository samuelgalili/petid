/**
 * PublicPetProfile — Slide-from-right overlay showing another pet's public profile.
 * Elite Instagram-style: cover photo, glassmorphism follow, SafeScore stamp,
 * treat animation, 3-column media grid, public stats only.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import {
  ChevronLeft, ShoppingBag, PawPrint, UserPlus,
  Gift, Grid3x3, Shield, Dog, Cat, MessageCircle, Bone,
  Heart, Star, Sparkles, Award, BadgeCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { haptic } from "@/lib/haptics";
import { useLanguage } from "@/contexts/LanguageContext";

interface PublicPetProfileProps {
  petId: string;
  onClose: () => void;
}

interface PetData {
  id: string;
  name: string;
  breed: string | null;
  type: string;
  avatar_url: string | null;
  user_id: string;
  created_at: string | null;
}

interface FeaturedProduct {
  id: string;
  name: string;
  price: number;
  image_url: string;
  safety_score: number | null;
  brand: string | null;
}

interface PetPost {
  id: string;
  image_url: string | null;
  media_urls: string[] | null;
}

const PublicPetProfile = ({ petId, onClose }: PublicPetProfileProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { direction } = useLanguage();
  const isRtl = direction === "rtl";

  const [pet, setPet] = useState<PetData | null>(null);
  const [ownerName, setOwnerName] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [pawsCount, setPawsCount] = useState(0);
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [posts, setPosts] = useState<PetPost[]>([]);
  const [treatSending, setTreatSending] = useState(false);
  const [showTreatAnim, setShowTreatAnim] = useState(false);
  const [pawPulse, setPawPulse] = useState(false);

  // Average SafeScore across featured products
  const avgSafeScore = useMemo(() => {
    const scored = products.filter((p) => p.safety_score != null);
    if (scored.length === 0) return null;
    const avg = scored.reduce((sum, p) => sum + (p.safety_score || 0), 0) / scored.length;
    return Math.round(avg * 10) / 10;
  }, [products]);

  // Scientist Verified: all products have safety_score >= 8.5
  const isScientistVerified = useMemo(() => {
    if (products.length === 0) return false;
    return products.every((p) => p.safety_score != null && p.safety_score >= 8.5);
  }, [products]);

  // Achievement badges
  const achievementBadges = useMemo(() => {
    const badges: { id: string; icon: React.ReactNode; label: string; labelHe: string; desc: string; descHe: string; glow: string }[] = [];

    if (avgSafeScore !== null && avgSafeScore > 8.5) {
      badges.push({
        id: "healthy_hero",
        icon: <Heart className="w-4 h-4" />,
        label: "Healthy Hero",
        labelHe: "גיבור בריאות",
        desc: "Average SafeScore above 8.5",
        descHe: "ממוצע SafeScore מעל 8.5",
        glow: "from-emerald-400 to-green-500",
      });
    }

    if (pawsCount >= 500) {
      badges.push({
        id: "community_star",
        icon: <Star className="w-4 h-4" />,
        label: "Community Star",
        labelHe: "כוכב קהילה",
        desc: "Received 500+ Paws from the community",
        descHe: "קיבל 500+ כפות מהקהילה",
        glow: "from-amber-400 to-yellow-500",
      });
    }

    if (pet?.created_at) {
      const createdDate = new Date(pet.created_at);
      if (createdDate.getFullYear() === 2026 && createdDate.getMonth() <= 1) {
        badges.push({
          id: "early_adopter",
          icon: <Sparkles className="w-4 h-4" />,
          label: "Early Adopter",
          labelHe: "מאמץ מוקדם",
          desc: "Joined in Feb 2026 or earlier",
          descHe: "הצטרף בפברואר 2026 או לפני",
          glow: "from-violet-400 to-purple-500",
        });
      }
    }

    if (isScientistVerified) {
      badges.push({
        id: "scientist_verified",
        icon: <BadgeCheck className="w-4 h-4" />,
        label: "Scientist Verified",
        labelHe: "מאומת מדעית",
        desc: "All products score 8.5+ SafeScore",
        descHe: "כל המוצרים עם SafeScore מעל 8.5",
        glow: "from-blue-400 to-cyan-500",
      });
    }

    return badges;
  }, [avgSafeScore, pawsCount, pet?.created_at, isScientistVerified]);

  // Cover photo: use first post image or pet avatar
  const coverPhoto = useMemo(() => {
    for (const p of posts) {
      const img = p.media_urls?.[0] || p.image_url;
      if (img) return img;
    }
    return pet?.avatar_url || null;
  }, [posts, pet]);

  // Drag-to-dismiss (horizontal for slide-from-right)
  const dragX = useMotionValue(0);
  const overlayOpacity = useTransform(dragX, [0, 300], [1, 0.2]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 120 || info.velocity.x > 500) {
      onClose();
    }
  };

  // Fetch pet data + stats
  useEffect(() => {
    const load = async () => {
      const { data: petData } = await supabase
        .from("pets" as any)
        .select("id, name, breed, type, avatar_url, user_id, created_at")
        .eq("id", petId)
        .maybeSingle();

      if (petData) {
        setPet(petData as any);

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", (petData as any).user_id)
          .maybeSingle();
        if (profile) setOwnerName((profile as any).full_name || "");

        const { data: postsData } = await supabase
          .from("posts")
          .select("id, image_url, media_urls")
          .eq("user_id", (petData as any).user_id)
          .order("created_at", { ascending: false })
          .limit(30);
        setPosts((postsData || []) as PetPost[]);
      }

      const { count: fCount } = await supabase
        .from("pet_follows" as any)
        .select("*", { count: "exact", head: true })
        .eq("pet_id", petId);
      setFollowersCount(fCount || 0);

      if (petData) {
        const { count: fgCount } = await supabase
          .from("pet_follows" as any)
          .select("*", { count: "exact", head: true })
          .eq("follower_id", (petData as any).user_id);
        setFollowingCount(fgCount || 0);
      }

      const { count: tCount } = await supabase
        .from("pet_treats" as any)
        .select("*", { count: "exact", head: true })
        .eq("pet_id", petId);
      setPawsCount(tCount || 0);

      if (user) {
        const { data: followData } = await supabase
          .from("pet_follows" as any)
          .select("id")
          .eq("follower_id", user.id)
          .eq("pet_id", petId)
          .maybeSingle();
        setIsFollowing(!!followData);
      }

      const { data: prodData } = await supabase
        .from("business_products")
        .select("id, name, price, image_url, safety_score, brand")
        .gte("safety_score", 8)
        .eq("in_stock", true)
        .order("safety_score", { ascending: false })
        .limit(4);
      setProducts((prodData || []) as FeaturedProduct[]);
    };

    load();
  }, [petId, user]);

  // Follow / Unfollow
  const toggleFollow = useCallback(async () => {
    if (!user || followLoading) return;
    setFollowLoading(true);

    if (isFollowing) {
      await supabase
        .from("pet_follows" as any)
        .delete()
        .eq("follower_id", user.id)
        .eq("pet_id", petId);
      setIsFollowing(false);
      setFollowersCount((c) => Math.max(0, c - 1));
    } else {
      await (supabase as any)
        .from("pet_follows")
        .insert({ follower_id: user.id, pet_id: petId });
      setIsFollowing(true);
      setFollowersCount((c) => c + 1);
      setPawPulse(true);
      haptic("success");
      setTimeout(() => setPawPulse(false), 800);
    }
    setFollowLoading(false);
  }, [user, isFollowing, followLoading, petId]);

  // Send Treat
  const sendTreat = useCallback(async () => {
    if (!user || treatSending) return;
    setTreatSending(true);

    await (supabase as any)
      .from("pet_treats")
      .insert({ sender_id: user.id, pet_id: petId, treat_type: "bone" });

    setPawsCount((c) => c + 1);
    setShowTreatAnim(true);
    haptic("success");

    confetti({
      particleCount: 80,
      spread: 90,
      origin: { y: 0.5 },
      colors: ["#FF6B8A", "#FFD93D", "#6BCB77", "#4D96FF"],
    });

    toast.success(isRtl ? "🦴 פינוק נשלח!" : "🦴 Treat sent!", { duration: 2000 });
    setTimeout(() => {
      setShowTreatAnim(false);
      setTreatSending(false);
    }, 1500);
  }, [user, treatSending, petId, isRtl]);

  // Message Owner
  const handleMessageOwner = useCallback(() => {
    if (!pet?.user_id || !user) {
      toast.error(isRtl ? "התחבר כדי לשלוח הודעה" : "Sign in to send messages");
      return;
    }
    if (pet.user_id === user.id) {
      toast(isRtl ? "זה החיה שלך! 🐾" : "That's your own pet! 🐾");
      return;
    }
    haptic("light");
    onClose();
    navigate(`/messages/${pet.user_id}`);
  }, [pet, user, onClose, navigate, isRtl]);

  const handleShareProduct = useCallback(
    async (product: FeaturedProduct) => {
      haptic("light");
      const url = `${window.location.origin}/product/${product.id}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: product.name, text: `${product.name} — ₪${product.price}`, url });
        } catch { /* cancelled */ }
      } else {
        navigator.clipboard.writeText(url);
        toast.success(isRtl ? "הקישור הועתק!" : "Link copied!");
      }
    },
    [isRtl],
  );

  const PetIcon = pet?.type === "cat" ? Cat : Dog;

  const formatCount = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return n.toString();
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      style={{ x: dragX, opacity: overlayOpacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.6 }}
      onDragEnd={handleDragEnd}
      className="fixed inset-0 z-[300] bg-background overflow-auto touch-pan-x"
      dir={direction}
    >
      {/* ── Cover Photo + Avatar + Glassmorphism Follow ── */}
      <div className="relative w-full" style={{ height: "280px" }}>
        {/* Cover */}
        <div className="absolute inset-0 bg-muted overflow-hidden">
          {coverPhoto ? (
            <img src={coverPhoto} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <PetIcon className="w-16 h-16 text-muted-foreground/30" />
            </div>
          )}
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)",
            }}
          />
        </div>

        {/* Back button */}
        <motion.button
          onClick={onClose}
          whileTap={{ scale: 0.9 }}
          className="absolute top-4 z-20 w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            [isRtl ? "right" : "left"]: "16px",
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <ChevronLeft className={`w-5 h-5 text-white ${isRtl ? "rotate-180" : ""}`} />
        </motion.button>

        {/* Avatar + Name overlapping cover bottom */}
        <div className="absolute bottom-0 inset-x-0 z-10 flex items-end gap-3 px-5 pb-4">
          <div className="relative shrink-0">
            <Avatar className="w-20 h-20 border-[3px] border-background shadow-xl">
              {pet?.avatar_url ? (
                <AvatarImage src={pet.avatar_url} className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-muted">
                <PetIcon className="w-8 h-8 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>

            {/* Paw-Pulse overlay on follow */}
            <AnimatePresence>
              {pawPulse && (
                <>
                  <motion.div
                    initial={{ scale: 0.5, opacity: 1 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0 rounded-full border-4 border-primary"
                  />
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                      animate={{
                        scale: [0, 1.2, 0],
                        opacity: [1, 0.8, 0],
                        x: Math.cos((i * Math.PI * 2) / 6) * 40,
                        y: Math.sin((i * Math.PI * 2) / 6) * 40,
                      }}
                      transition={{ duration: 0.7, delay: i * 0.04 }}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    >
                      <PawPrint className="w-3.5 h-3.5 text-primary" />
                    </motion.div>
                  ))}
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="flex-1 min-w-0 mb-1">
            <h2 className="text-xl font-bold text-white drop-shadow-lg truncate">{pet?.name || "..."}</h2>
            <p className="text-sm text-white/70 drop-shadow truncate">{pet?.breed || ""}</p>
            {ownerName && (
              <p className="text-xs text-white/50 drop-shadow mt-0.5">
                {isRtl ? `מאת ${ownerName}` : `by ${ownerName}`}
              </p>
            )}
          </div>

          {/* Glassmorphism Follow Button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={toggleFollow}
            disabled={followLoading}
            className="shrink-0 px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all mb-1"
            style={{
              background: isFollowing
                ? "rgba(255,255,255,0.12)"
                : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: isFollowing
                ? "1.5px solid hsl(45, 90%, 55%)"
                : "1px solid rgba(255,255,255,0.3)",
              color: isFollowing ? "hsl(45, 90%, 65%)" : "white",
              boxShadow: isFollowing ? "0 0 10px hsla(45, 90%, 55%, 0.25)" : "0 4px 16px rgba(0,0,0,0.3)",
            }}
          >
            {isFollowing ? (
              <>
                <PawPrint className="w-4 h-4" /> {isRtl ? "עוקב" : "Following"}
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> {isRtl ? "עקוב" : "Follow"}
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="flex justify-around py-4 border-b border-border mx-4">
        <StatItem label={isRtl ? "עוקבים" : "Followers"} value={formatCount(followersCount)} />
        <StatItem label={isRtl ? "עוקב" : "Following"} value={formatCount(followingCount)} />
        <StatItem
          label={isRtl ? "כפות" : "Paws"}
          value={formatCount(pawsCount)}
          icon={<PawPrint className="w-3.5 h-3.5 text-primary" />}
        />
      </div>

      {/* ── Achievement Badges ── */}
      {achievementBadges.length > 0 && (
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-2 px-5 py-3">
            {achievementBadges.map((badge, i) => (
              <Tooltip key={badge.id}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1, type: "spring", stiffness: 300 }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white cursor-default bg-gradient-to-r ${badge.glow}`}
                    style={{
                      boxShadow: "0 0 12px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.2)",
                    }}
                  >
                    {badge.icon}
                    <span>{isRtl ? badge.labelHe : badge.label}</span>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="text-xs font-medium text-center">
                    {isRtl ? badge.descHe : badge.desc}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      )}

      {/* ── Scientist Verified Banner ── */}
      {isScientistVerified && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mx-4 mb-2 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5"
        >
          <BadgeCheck className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground">
              {isRtl ? "מאומת מדעית" : "Scientist Verified"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isRtl ? "כל המוצרים בפרופיל עם ציון בטיחות גבוה" : "All products scored high on SafeScore"}
            </p>
          </div>
          <Shield className="w-4 h-4 text-primary/50" />
        </motion.div>
      )}

      <div className="flex items-center gap-2 px-4 py-4 flex-wrap">
        {/* Message */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleMessageOwner}
          className="flex-1 min-w-[100px] py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-card border border-border/50 text-foreground transition-colors hover:bg-muted/60"
        >
          <MessageCircle className="w-4 h-4" />
          {isRtl ? "הודעה" : "Message"}
        </motion.button>

        {/* Send Treat */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={sendTreat}
          disabled={treatSending}
          className="flex-1 min-w-[100px] py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(45, 100%, 60%), hsl(35, 100%, 55%))",
            color: "#3d2800",
            boxShadow: "0 2px 10px hsl(45, 100%, 60%, 0.3)",
          }}
        >
          <Gift className="w-4 h-4" />
          {isRtl ? "שלח פינוק" : "Send Treat"}
        </motion.button>

        {/* SafeScore Stamp */}
        {avgSafeScore !== null && (
          <div
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold shrink-0"
            style={{
              background: avgSafeScore >= 8
                ? "rgba(34,197,94,0.1)"
                : avgSafeScore >= 6
                ? "rgba(245,158,11,0.1)"
                : "rgba(239,68,68,0.1)",
              border: `1px solid ${
                avgSafeScore >= 8
                  ? "rgba(34,197,94,0.2)"
                  : avgSafeScore >= 6
                  ? "rgba(245,158,11,0.2)"
                  : "rgba(239,68,68,0.2)"
              }`,
              color: avgSafeScore >= 8
                ? "hsl(142, 71%, 45%)"
                : avgSafeScore >= 6
                ? "hsl(38, 92%, 50%)"
                : "hsl(0, 84%, 60%)",
            }}
          >
            <Shield className="w-4 h-4" />
            {avgSafeScore}
          </div>
        )}
      </div>

      {/* Treat falling animation */}
      <AnimatePresence>
        {showTreatAnim && (
          <div className="fixed inset-0 z-[350] pointer-events-none overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  y: -60,
                  x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 300),
                  rotate: Math.random() * 60 - 30,
                  opacity: 1,
                }}
                animate={{
                  y: typeof window !== "undefined" ? window.innerHeight + 60 : 900,
                  rotate: Math.random() * 360,
                  opacity: [1, 1, 0.6, 0],
                }}
                transition={{
                  duration: 1.5 + Math.random() * 0.5,
                  delay: i * 0.08,
                  ease: "easeIn",
                }}
                className="absolute"
              >
                {i % 2 === 0 ? (
                  <Bone className="w-8 h-8 text-amber-400 drop-shadow-lg" strokeWidth={1.5} />
                ) : (
                  <span className="text-3xl">🦴</span>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* ── Featured Products ── */}
      {products.length > 0 && (
        <div className="px-4 py-4">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            {isRtl ? "מוצרים מומלצים" : "Featured Products"}
            {avgSafeScore !== null && (
              <span className="text-xs font-medium text-muted-foreground">
                {isRtl ? `(ממוצע SafeScore: ${avgSafeScore})` : `(avg SafeScore: ${avgSafeScore})`}
              </span>
            )}
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {products.map((product) => (
              <motion.div
                key={product.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => { onClose(); navigate(`/product/${product.id}`); }}
                className="shrink-0 w-[140px] rounded-xl bg-card border border-border/40 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              >
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-[100px] object-cover bg-muted"
                  loading="lazy"
                />
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-foreground truncate">{product.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-bold text-primary">₪{product.price}</span>
                    {product.safety_score && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                        <Shield className="w-2.5 h-2.5" />
                        {product.safety_score}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Media Grid ── */}
      <div className="px-4 pb-6">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Grid3x3 className="w-4 h-4 text-primary" />
          {isRtl ? "פוסטים" : "Posts"}
        </h3>
        {posts.length > 0 ? (
          <div className="grid grid-cols-3 gap-[2px] rounded-xl overflow-hidden">
            {posts.map((post) => {
              const thumb = post.media_urls?.[0] || post.image_url || "";
              return (
                <motion.div
                  key={post.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { onClose(); navigate(`/post/${post.id}`); }}
                  className="aspect-square bg-muted cursor-pointer overflow-hidden"
                >
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PawPrint className="w-6 h-6 text-muted-foreground/30" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center text-muted-foreground text-sm">
            {isRtl ? "אין פוסטים עדיין" : "No posts yet"}
          </div>
        )}
      </div>

      {/* Bottom padding */}
      <div className="h-24" />
    </motion.div>
  );
};

function StatItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-lg font-bold text-foreground">{value}</span>
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export default PublicPetProfile;
