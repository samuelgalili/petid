/**
 * PublicPetProfile — Full-screen overlay showing another pet's public profile.
 * Includes: follow, stats, featured products, media grid, send treat.
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, ChevronDown, ShoppingBag, PawPrint, Users, UserPlus,
  Gift, Grid3x3, Shield, ExternalLink, X, Dog, Cat,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import confetti from "canvas-confetti";

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

  // Fetch pet data + stats
  useEffect(() => {
    const load = async () => {
      // Pet info
      const { data: petData } = await supabase
        .from("pets" as any)
        .select("id, name, breed, type, avatar_url, user_id")
        .eq("id", petId)
        .maybeSingle();

      if (petData) {
        setPet(petData as any);

        // Owner name
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", (petData as any).user_id)
          .maybeSingle();
        if (profile) setOwnerName((profile as any).full_name || "");

        // Posts by this pet's owner
        const { data: postsData } = await supabase
          .from("posts")
          .select("id, image_url, media_urls")
          .eq("user_id", (petData as any).user_id)
          .order("created_at", { ascending: false })
          .limit(30);
        setPosts((postsData || []) as PetPost[]);
      }

      // Followers count
      const { count: fCount } = await supabase
        .from("pet_follows" as any)
        .select("*", { count: "exact", head: true })
        .eq("pet_id", petId);
      setFollowersCount(fCount || 0);

      // Following count (pets this pet's owner follows)
      if (petData) {
        const { count: fgCount } = await supabase
          .from("pet_follows" as any)
          .select("*", { count: "exact", head: true })
          .eq("follower_id", (petData as any).user_id);
        setFollowingCount(fgCount || 0);
      }

      // Paws (treats) received
      const { count: tCount } = await supabase
        .from("pet_treats" as any)
        .select("*", { count: "exact", head: true })
        .eq("pet_id", petId);
      setPawsCount(tCount || 0);

      // Is current user following?
      if (user) {
        const { data: followData } = await supabase
          .from("pet_follows" as any)
          .select("id")
          .eq("follower_id", user.id)
          .eq("pet_id", petId)
          .maybeSingle();
        setIsFollowing(!!followData);
      }

      // Featured products — top 3 with high safety_score
      const { data: prodData } = await supabase
        .from("business_products")
        .select("id, name, price, image_url, safety_score, brand")
        .gte("safety_score", 8)
        .eq("in_stock", true)
        .order("safety_score", { ascending: false })
        .limit(3);
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
      // Paw-Pulse animation
      setPawPulse(true);
      if (navigator.vibrate) navigator.vibrate([15, 50, 15]);
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
    if (navigator.vibrate) navigator.vibrate([10, 30, 10, 30, 10]);

    // Confetti burst
    confetti({
      particleCount: 60,
      spread: 80,
      origin: { y: 0.7 },
      colors: ["#FF6B8A", "#FFD93D", "#6BCB77", "#4D96FF"],
    });

    toast.success("🦴 Treat sent!", { duration: 2000 });
    setTimeout(() => {
      setShowTreatAnim(false);
      setTreatSending(false);
    }, 1500);
  }, [user, treatSending, petId]);

  const PetIcon = pet?.type === "cat" ? Cat : Dog;

  const formatCount = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[300] bg-background overflow-auto"
    >
      {/* ── Close Handle ── */}
      <div className="sticky top-0 z-10 w-full flex items-center justify-center py-2 bg-background/80 backdrop-blur-md">
        <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
      </div>
      <button
        onClick={onClose}
        className="absolute top-3 right-4 z-20 w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center"
      >
        <ChevronDown className="w-5 h-5 text-foreground" />
      </button>

      {/* ── Header: Avatar + Name + Follow ── */}
      <div className="flex flex-col items-center px-4 pt-2 pb-4">
        <div className="relative">
          <Avatar className="w-24 h-24 border-4 border-primary/20">
            {pet?.avatar_url ? (
              <AvatarImage src={pet.avatar_url} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-muted">
              <PetIcon className="w-10 h-10 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>

          {/* Paw-Pulse overlay */}
          <AnimatePresence>
            {pawPulse && (
              <motion.div
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ scale: 2.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 rounded-full border-4 border-primary"
              />
            )}
          </AnimatePresence>
        </div>

        <h2 className="text-xl font-bold mt-3 text-foreground">{pet?.name || "..."}</h2>
        <p className="text-sm text-muted-foreground">{pet?.breed || ""}</p>
        {ownerName && (
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            by {ownerName}
          </p>
        )}

        {/* Follow + Treat buttons */}
        <div className="flex gap-3 mt-4">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={toggleFollow}
            disabled={followLoading}
            className={`px-5 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all ${
              isFollowing
                ? "bg-muted text-foreground border border-border"
                : "bg-primary text-primary-foreground shadow-md"
            }`}
            style={
              !isFollowing
                ? {
                    background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                    backdropFilter: "blur(8px)",
                  }
                : undefined
            }
          >
            {isFollowing ? (
              <>
                <PawPrint className="w-4 h-4" /> Following
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Follow
              </>
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={sendTreat}
            disabled={treatSending}
            className="px-5 py-2 rounded-full text-sm font-semibold flex items-center gap-2 bg-accent/20 text-accent-foreground border border-accent/30 hover:bg-accent/30 transition-all"
          >
            <Gift className="w-4 h-4" />
            Send Treat
          </motion.button>
        </div>

        {/* Treat animation */}
        <AnimatePresence>
          {showTreatAnim && (
            <motion.div
              initial={{ y: 0, opacity: 1, scale: 1 }}
              animate={{ y: -80, opacity: 0, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              className="absolute top-1/3 text-4xl"
            >
              🦴
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Stats Bar ── */}
      <div className="flex justify-around py-4 border-y border-border mx-4">
        <StatItem label="Followers" value={formatCount(followersCount)} />
        <StatItem label="Following" value={formatCount(followingCount)} />
        <StatItem label="Paws" value={formatCount(pawsCount)} icon={<PawPrint className="w-3.5 h-3.5 text-primary" />} />
      </div>

      {/* ── Featured Products ── */}
      {products.length > 0 && (
        <div className="px-4 py-5">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            Featured Products
          </h3>
          <div className="space-y-3">
            {products.map((product) => (
              <motion.div
                key={product.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onClose();
                  navigate(`/product/${product.id}`);
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-14 h-14 rounded-lg object-cover bg-muted"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
                  {product.brand && (
                    <p className="text-xs text-muted-foreground">{product.brand}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-bold text-primary">₪{product.price}</span>
                    {product.safety_score && (
                      <span className="flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                        <Shield className="w-3 h-3" />
                        {product.safety_score}/10
                      </span>
                    )}
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Media Grid ── */}
      <div className="px-4 pb-6">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Grid3x3 className="w-4 h-4 text-primary" />
          Posts
        </h3>
        {posts.length > 0 ? (
          <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
            {posts.map((post) => {
              const thumb =
                post.media_urls?.[0] || post.image_url || "";
              return (
                <motion.div
                  key={post.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    onClose();
                    navigate(`/post/${post.id}`);
                  }}
                  className="aspect-square bg-muted cursor-pointer overflow-hidden"
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
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
            No posts yet
          </div>
        )}
      </div>

      {/* Bottom padding for nav */}
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
