/**
 * SoundtrackFeed - Soundtrack-style vertical feed
 * Full-screen cards with overlayed actions
 * White theme with Discover/Following tabs
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MoreHorizontal,
  Play,
  User,
  Star,
  Volume2,
  VolumeX,
  Image,
  Images,
  Video,
  Check,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Plus,
  Trophy,
  ExternalLink,
  Weight,
  Ruler,
  Palette,
  Info } from
"lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { playAddToCartSound } from "@/lib/sounds";
import { useCart } from "@/contexts/CartContext";
import { useFlyingCart } from "@/components/FlyingCartAnimation";
import { CommentsSheet } from "@/components/CommentsSheet";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import {
  FeedPullToRefresh,
  FeedSkeletonList,
  FeedProgressBar,
  NewPostToast,
  DailyStreak,
  FeedOnboarding,
  SocialProofLabel,
} from "@/components/feed";

interface FeedPost {
  id: string;
  user_id: string;
  image_url: string | null;
  media_urls?: string[] | null;
  video_url?: string | null;
  caption: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  user_profile?: {
    full_name: string | null;
    avatar_url: string | null;
    is_verified?: boolean;
  };
  is_liked?: boolean;
  is_saved?: boolean;
  is_following?: boolean;
  recommendation_reason?: string;
  media_type?: 'image' | 'gallery' | 'video';
  // Promotional post types
  post_type?: 'regular' | 'product' | 'challenge' | 'cta';
  product_id?: string;
  product_name?: string;
  product_price?: number;
  challenge_id?: string;
  challenge_title?: string;
  cta_link?: string;
  cta_text?: string;
  // Product variants
  product_weight?: string;
  product_sizes?: string[];
  product_colors?: string[];
}

const SoundtrackFeed = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"discover" | "following">("discover");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [newPostCount, setNewPostCount] = useState(0);

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await fetchPostsInner();
  }, []);
  const { pullDistance, isRefreshing, progress, shouldTrigger, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  const fetchPostsInner = useCallback(async () => {
    setLoading(true);
    try {
      let postsQuery = supabase.
      from("posts").
      select(`id, user_id, image_url, caption, created_at`).
      order("created_at", { ascending: false }).
      limit(20);

      if (activeTab === "following" && user) {
        const { data: following } = await supabase.
        from("user_follows").
        select("following_id").
        eq("follower_id", user.id);

        const followingIds = following?.map((f) => f.following_id) || [];
        if (followingIds.length > 0) {
          postsQuery = postsQuery.in("user_id", followingIds);
        }
      }

      const { data: postsData, error } = await postsQuery;
      if (error) throw error;

      if (postsData && postsData.length > 0) {
        const userIds = [...new Set(postsData.map((p) => p.user_id))];
        const { data: profiles } = await supabase.
        from("profiles").
        select("id, full_name, avatar_url").
        in("id", userIds);

        let likedPostIds: string[] = [];
        let savedPostIds: string[] = [];
        let followingIds: string[] = [];

        if (user) {
          const [likesRes, savesRes, followsRes] = await Promise.all([
          supabase.from("post_likes").select("post_id").eq("user_id", user.id),
          supabase.from("saved_posts").select("post_id").eq("user_id", user.id),
          supabase.from("user_follows").select("following_id").eq("follower_id", user.id)]
          );

          likedPostIds = likesRes.data?.map((l) => l.post_id) || [];
          savedPostIds = savesRes.data?.map((s) => s.post_id) || [];
          followingIds = followsRes.data?.map((f) => f.following_id) || [];
        }

        // Count likes and comments for each post
        const postIds = postsData.map((p) => p.id);
        const [likesCount, commentsCount] = await Promise.all([
        supabase.from("post_likes").select("post_id").in("post_id", postIds),
        supabase.from("post_comments").select("post_id").in("post_id", postIds)]
        );

        const likesMap: Record<string, number> = {};
        const commentsMap: Record<string, number> = {};
        likesCount.data?.forEach((l) => {likesMap[l.post_id] = (likesMap[l.post_id] || 0) + 1;});
        commentsCount.data?.forEach((c) => {commentsMap[c.post_id] = (commentsMap[c.post_id] || 0) + 1;});

        const enrichedPosts: FeedPost[] = postsData.map((post) => {
          // Determine media type
          const hasVideo = !!(post as any).video_url;
          const mediaUrls = (post as any).media_urls as string[] | null;
          const hasMultipleImages = mediaUrls && mediaUrls.length > 1;

          let mediaType: 'image' | 'gallery' | 'video' = 'image';
          if (hasVideo) mediaType = 'video';else
          if (hasMultipleImages) mediaType = 'gallery';

          return {
            id: post.id,
            user_id: post.user_id,
            image_url: post.image_url,
            media_urls: mediaUrls,
            video_url: (post as any).video_url,
            caption: post.caption,
            created_at: post.created_at,
            likes_count: likesMap[post.id] || 0,
            comments_count: commentsMap[post.id] || 0,
            user_profile: profiles?.find((p) => p.id === post.user_id) || undefined,
            is_liked: likedPostIds.includes(post.id),
            is_saved: savedPostIds.includes(post.id),
            is_following: followingIds.includes(post.user_id),
            recommendation_reason: activeTab === "discover" ? "בשבילך" : undefined,
            media_type: mediaType
          };
        });

        // Add promotional demo posts
        const promoProductPost: FeedPost = {
          id: 'promo-product-1',
          user_id: 'petid-shop',
          image_url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800',
          caption: '🐕 מזון פרימיום לכלבים - 20% הנחה! מזון איכותי עשיר בחלבון לבריאות מיטבית של הכלב שלכם.',
          created_at: new Date().toISOString(),
          likes_count: 156,
          comments_count: 23,
          user_profile: {
            full_name: 'PetID Shop',
            avatar_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=100',
            is_verified: true
          },
          is_liked: false,
          is_saved: false,
          is_following: false,
          media_type: 'image',
          post_type: 'product',
          product_id: 'prod-dog-food-1',
          product_name: 'מזון פרימיום לכלבים',
          product_price: 89.90,
          product_weight: '15 ק״ג',
          product_colors: ['חום', 'בז׳'],
          product_sizes: ['S', 'M', 'L']
        };

        const promoChallengePost: FeedPost = {
          id: 'promo-challenge-1',
          user_id: 'petid-community',
          image_url: 'https://images.unsplash.com/photo-1587559045816-8b0a54d1f2b7?w=800',
          caption: '🏆 אתגר #PetidCutePhoto - שתפו את התמונה הכי חמודה של חיית המחמד שלכם וזכו ב-500 נקודות!',
          created_at: new Date().toISOString(),
          likes_count: 342,
          comments_count: 89,
          user_profile: {
            full_name: 'PetID Community',
            avatar_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=100',
            is_verified: true
          },
          is_liked: false,
          is_saved: false,
          is_following: false,
          media_type: 'image',
          post_type: 'challenge',
          challenge_id: 'challenge-cute-photo',
          challenge_title: 'הצטרף לאתגר!'
        };

        const promoCtaPost: FeedPost = {
          id: 'promo-cta-1',
          user_id: 'petid-adoption',
          image_url: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800',
          caption: '🐾 אימוץ במקום קנייה! מאות כלבים וחתולים מחכים לבית חם. בואו לפגוש את החבר החדש שלכם.',
          created_at: new Date().toISOString(),
          likes_count: 278,
          comments_count: 45,
          user_profile: {
            full_name: 'PetID Adoption',
            avatar_url: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=100',
            is_verified: true
          },
          is_liked: false,
          is_saved: false,
          is_following: false,
          media_type: 'image',
          post_type: 'cta',
          cta_link: '/adopt',
          cta_text: 'לאימוץ'
        };

        const promoGalleryPost: FeedPost = {
          id: 'promo-gallery-1',
          user_id: 'petid-featured',
          image_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800',
          media_urls: [
          'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800',
          'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800',
          'https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?w=800',
          'https://images.unsplash.com/photo-1588943211346-0908a1fb0b01?w=800'],

          caption: '📸 הרגעים הכי יפים של השבוע! גלריית חיות מחמד מהקהילה שלנו 🐾',
          created_at: new Date().toISOString(),
          likes_count: 523,
          comments_count: 67,
          user_profile: {
            full_name: 'PetID Featured',
            avatar_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=100',
            is_verified: true
          },
          is_liked: false,
          is_saved: false,
          is_following: false,
          media_type: 'gallery',
          post_type: 'regular'
        };

        // Insert promo posts into the feed at different positions
        const allPosts = [...enrichedPosts];
        if (allPosts.length > 2) {
          allPosts.splice(2, 0, promoProductPost);
        } else {
          allPosts.push(promoProductPost);
        }
        if (allPosts.length > 5) {
          allPosts.splice(5, 0, promoChallengePost);
        } else {
          allPosts.push(promoChallengePost);
        }
        if (allPosts.length > 8) {
          allPosts.splice(8, 0, promoCtaPost);
        } else {
          allPosts.push(promoCtaPost);
        }
        if (allPosts.length > 4) {
          allPosts.splice(4, 0, promoGalleryPost);
        } else {
          allPosts.push(promoGalleryPost);
        }

        setPosts(allPosts);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, user]);

  const fetchPosts = fetchPostsInner;

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Realtime listener for new posts
  useEffect(() => {
    const channel = supabase
      .channel("feed-new-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => {
        setNewPostCount((c) => c + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleNewPostTap = () => {
    setNewPostCount(0);
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    fetchPosts();
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const isLiked = post.is_liked;

    // Optimistic update
    setPosts((prev) => prev.map((p) =>
    p.id === postId ?
    { ...p, is_liked: !isLiked, likes_count: p.likes_count + (isLiked ? -1 : 1) } :
    p
    ));

    try {
      if (isLiked) {
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
      }
    } catch (error) {
      // Revert on error
      setPosts((prev) => prev.map((p) =>
      p.id === postId ?
      { ...p, is_liked: isLiked, likes_count: p.likes_count + (isLiked ? 1 : -1) } :
      p
      ));
    }
  };

  const handleSave = async (postId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const isSaved = post.is_saved;

    setPosts((prev) => prev.map((p) =>
    p.id === postId ? { ...p, is_saved: !isSaved } : p
    ));

    try {
      if (isSaved) {
        await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("saved_posts").insert({ post_id: postId, user_id: user.id });
      }
      toast.success(isSaved ? "הוסר מהשמורים" : "נשמר!");
    } catch (error) {
      setPosts((prev) => prev.map((p) =>
      p.id === postId ? { ...p, is_saved: isSaved } : p
      ));
    }
  };

  const handleFollow = async (userId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const isFollowing = posts.find((p) => p.user_id === userId)?.is_following;

    setPosts((prev) => prev.map((p) =>
    p.user_id === userId ? { ...p, is_following: !isFollowing } : p
    ));

    try {
      if (isFollowing) {
        await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", userId);
      } else {
        await supabase.from("user_follows").insert({ follower_id: user.id, following_id: userId });
      }
    } catch (error) {
      setPosts((prev) => prev.map((p) =>
      p.user_id === userId ? { ...p, is_following: isFollowing } : p
      ));
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const cardHeight = window.innerHeight - 56 - 70; // header + bottom nav
    const newIndex = Math.round(scrollTop / cardHeight);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>);

  }

  return (
    <div className="h-screen bg-background overflow-hidden" dir="rtl">
      {/* Header with Tabs - at top */}
      <motion.header
        className="absolute top-0 left-0 right-0 z-50 pointer-events-none pt-2"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}>

        <div className="flex items-center justify-center h-10 relative pointer-events-auto">
          







          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "discover" | "following")}>
            <TabsList className="bg-transparent gap-8">
              <TabsTrigger
                value="following"
                className={cn(
                  "bg-transparent border-0 shadow-none text-base font-semibold px-0 py-1.5",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  activeTab === "following" ?
                  "text-white drop-shadow-md border-b-2 border-white rounded-none" :
                  "text-white/60"
                )}>

                עוקבים
              </TabsTrigger>
              <TabsTrigger
                value="discover"
                className={cn(
                  "bg-transparent border-0 shadow-none text-base font-semibold px-0 py-1.5",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  activeTab === "discover" ?
                  "text-white drop-shadow-md border-b-2 border-white rounded-none" :
                  "text-white/60"
                )}>

                גלה
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </motion.header>

      {/* Feed Cards - with gaps to show next post peek */}
      <div
        ref={containerRef}
        className="h-full pb-[70px] overflow-y-auto snap-y snap-mandatory scroll-smooth"
        onScroll={handleScroll}
        style={{ scrollSnapType: 'y mandatory', scrollPaddingTop: '8px' }}>

        {posts.length === 0 ?
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <p className="text-lg">אין פוסטים להצגה</p>
            <p className="text-sm mt-2">
              {activeTab === "following" ? "עקוב אחרי משתמשים כדי לראות את הפוסטים שלהם" : "בקרוב יופיעו כאן פוסטים"}
            </p>
          </div> :

        posts.map((post, index) =>
        <PostCard
          key={post.id}
          post={post}
          index={index}
          currentIndex={currentIndex}
          muted={muted}
          setMuted={setMuted}
          onLike={handleLike}
          onSave={handleSave}
          onFollow={handleFollow}
          userId={user?.id} />

        )
        }
      </div>

      <BottomNav />
    </div>);

};

// Separate PostCard component for cleaner code
interface PostCardProps {
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

const PostCard = ({ post, index, currentIndex, muted, setMuted, onLike, onSave, onFollow, userId }: PostCardProps) => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const { addToCart } = useCart();
  const { triggerFly } = useFlyingCart();
  const productImageRef = useRef<HTMLImageElement>(null);

  // Get all images for gallery
  const allImages = post.media_urls && post.media_urls.length > 0 ?
  post.media_urls :
  post.image_url ?
  [post.image_url] :
  [];

  const hasMultipleImages = allImages.length > 1;
  const isVideo = post.media_type === 'video';
  const isProductPost = post.post_type === 'product';
  const isChallengePost = post.post_type === 'challenge';
  const isCtaPost = post.post_type === 'cta';
  const hasPromotion = isProductPost || isChallengePost || isCtaPost;

  const handleAddToCart = () => {
    if (!post.product_id || addedToCart) return;

    // Trigger flying animation
    if (productImageRef.current) {
      const rect = productImageRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      triggerFly(allImages[0] || '', centerX, centerY);
    }

    addToCart({
      id: post.product_id,
      name: post.product_name || 'מוצר',
      price: post.product_price || 0,
      image: allImages[0] || '',
      quantity: 1
    });

    // Play sound
    playAddToCartSound();

    // Confetti effect
    confetti({
      particleCount: 60,
      spread: 55,
      origin: { y: 0.8 },
      colors: ['#FBD66A', '#F4C542', '#FFD748', '#37B679']
    });

    setAddedToCart(true);
    toast.success("נוסף לעגלה! 🛒");

    // Reset after 2 seconds
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleCtaClick = () => {
    if (isChallengePost && post.challenge_id) {
      navigate(`/challenges/${post.challenge_id}`);
    } else if (isCtaPost && post.cta_link) {
      window.open(post.cta_link, '_blank');
    } else if (isProductPost && post.product_id) {
      navigate(`/shop/product/${post.product_id}`);
    }
  };

  const nextImage = () => {
    if (currentImageIndex < allImages.length - 1) {
      setCurrentImageIndex((prev) => prev + 1);
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex((prev) => prev - 1);
    }
  };

  // Format count shorthand
  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  // Double-tap like handler
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const lastTapRef = useRef(0);
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!post.is_liked) onLike(post.id);
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 800);
    }
    lastTapRef.current = now;
  };

  // Share handler
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: post.caption || 'PetID', url: window.location.href });
      } catch {}
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("הקישור הועתק!");
    }
  };

  // CTA label
  const ctaLabel = isProductPost ?
  post.product_price ? `₪${post.product_price}` : 'קנה עכשיו' :
  isChallengePost ? 'הצטרף' :
  isCtaPost ? post.cta_text || 'לאימוץ' :
  '';

  return (
    <motion.div
      className="h-[calc(100vh-56px-70px)] w-full snap-start relative overflow-hidden"
      style={{ aspectRatio: '9/16' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      onClick={handleDoubleTap}>

      {/* Full-bleed media - z-0 */}
      <div className="absolute inset-0 z-0 bg-black">
        {allImages.length > 0 ?
        <div
          className="relative w-full h-full overflow-x-auto snap-x snap-mandatory scroll-smooth flex"
          style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
          onScroll={(e) => {
            const container = e.currentTarget;
            const newIdx = Math.round(container.scrollLeft / container.offsetWidth);
            if (newIdx !== currentImageIndex && newIdx >= 0 && newIdx < allImages.length) {
              setCurrentImageIndex(newIdx);
            }
          }}>

            {allImages.map((img, imgIndex) =>
          <img
            key={imgIndex}
            ref={imgIndex === 0 ? productImageRef : undefined}
            src={img}
            alt=""
            className="w-full h-full object-cover flex-shrink-0 snap-center" />

          )}
          </div> :

        <div className="w-full h-full flex items-center justify-center">
            <p className="text-lg text-white/70 px-8 text-center">{post.caption || "פוסט ללא תמונה"}</p>
          </div>
        }
      </div>

      {/* Bottom gradient for text readability - z-10 */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
        style={{ height: '45%', background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' }} />

      {/* Top gradient - z-10 */}
      <div
        className="absolute inset-x-0 top-0 z-10 pointer-events-none"
        style={{ height: '80px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)' }} />


      {/* Double-tap heart burst */}
      <AnimatePresence>
        {showHeartBurst &&
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 1.2, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}>

            <Heart className="w-24 h-24 text-red-500 fill-red-500 drop-shadow-2xl" />
          </motion.div>
        }
      </AnimatePresence>

      {/* ===== RIGHT SIDEBAR (Action Column) ===== */}
      <motion.div
        className="absolute bottom-[120px] right-4 z-50 flex flex-col items-center gap-6"
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2, staggerChildren: 0.05 }}>

        {/* Profile Avatar with (+) badge */}
        <div className="relative mb-2">
          <Avatar
            className="w-12 h-12 cursor-pointer border-2 border-white"
            onClick={(e) => {e.stopPropagation();navigate(`/user/${post.user_id}`);}}>

            <AvatarImage src={post.user_profile?.avatar_url || ""} className="object-cover" />
            <AvatarFallback className="bg-white/20">
              <User className="w-6 h-6 text-white" />
            </AvatarFallback>
          </Avatar>
          {!post.is_following && post.user_id !== userId &&
          <motion.button
            onClick={(e) => {e.stopPropagation();onFollow(post.user_id);}}
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#FF8C42' }}
            whileTap={{ scale: 0.85 }}>

              <Plus className="w-3 h-3 text-white" strokeWidth={3} />
            </motion.button>
          }
        </div>

        {/* Like */}
        <motion.button
          onClick={(e) => {e.stopPropagation();onLike(post.id);}}
          whileTap={{ scale: 0.85 }}
          className="flex flex-col items-center gap-1">

          <Heart
            className={cn("w-8 h-8 drop-shadow-lg", post.is_liked ? "fill-red-500 text-red-500" : "text-white")}
            strokeWidth={1.5} />

          <span className="text-white text-sm font-medium drop-shadow-lg">{formatCount(post.likes_count)}</span>
        </motion.button>

        {/* Comments */}
        <motion.button
          onClick={(e) => {e.stopPropagation();setShowComments(true);}}
          whileTap={{ scale: 0.85 }}
          className="flex flex-col items-center gap-1">

          <MessageCircle className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white text-sm font-medium drop-shadow-lg">{formatCount(post.comments_count)}</span>
        </motion.button>

        {/* Bookmark */}
        <motion.button
          onClick={(e) => {e.stopPropagation();onSave(post.id);}}
          whileTap={{ scale: 0.85 }}
          className="flex flex-col items-center gap-1">

          <Bookmark
            className={cn("w-8 h-8 drop-shadow-lg", post.is_saved ? "fill-yellow-400 text-yellow-400" : "text-white")}
            strokeWidth={1.5} />

        </motion.button>

        {/* Share */}
        <motion.button
          onClick={(e) => {e.stopPropagation();handleShare();}}
          whileTap={{ scale: 0.85 }}
          className="flex flex-col items-center gap-1">

          <Share2 className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={1.5} />
        </motion.button>

        {/* Main CTA Button (Pulsing) */}
        {hasPromotion &&
        <motion.button
          onClick={(e) => {e.stopPropagation();isProductPost ? handleAddToCart() : handleCtaClick();}}
          whileTap={{ scale: 0.9 }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-lg"
          style={{
            width: '64px', height: '44px',
            backgroundColor: '#FF8C42'
          }}>

            {isProductPost ? <ShoppingCart className="w-5 h-5" /> : <span>{isChallengePost ? '🏆' : '🐾'}</span>}
          </motion.button>
        }
      </motion.div>

      {/* ===== BOTTOM-LEFT Information Overlay ===== */}
      <div className="absolute bottom-[120px] left-4 z-50 max-w-[75%] flex flex-col gap-1">
        {/* Status Badge (glassmorphism) */}
        {(isProductPost || isCtaPost || isChallengePost) &&
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-2 text-white text-sm font-medium"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(12px)' }}>

            {isProductPost && post.product_price && <span>₪{post.product_price}</span>}
            {isChallengePost && <span>🏆 אתגר</span>}
            {isCtaPost && <span>🐾 {post.cta_text || 'אימוץ'}</span>}
          </div>
        }

        {/* Product variant pills */}
        {isProductPost && (post.product_weight || post.product_sizes) &&
        <div className="flex flex-wrap gap-1.5 mb-2">
            {post.product_weight &&
          <span className="px-2 py-0.5 rounded-full text-white text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                {post.product_weight}
              </span>
          }
            {post.product_sizes?.map((s) =>
          <span key={s} className="px-2 py-0.5 rounded-full text-white text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                {s}
              </span>
          )}
          </div>
        }

        {/* Username */}
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className="text-white font-semibold cursor-pointer drop-shadow-lg"
            style={{ fontSize: '18px' }}
            onClick={(e) => {e.stopPropagation();navigate(`/user/${post.user_id}`);}}>

            @{post.user_profile?.full_name || "משתמש"}
          </span>
          {post.user_profile?.is_verified &&
          <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" />
            </span>
          }
        </div>

        {/* Caption - max 2 lines */}
        {post.caption &&
        <p
          className="text-white drop-shadow-lg line-clamp-2"
          style={{ fontSize: '16px' }}>

            {post.caption}
          </p>
        }
      </div>

      {/* Gallery indicator dots */}
      {hasMultipleImages &&
      <div className="absolute bottom-[130px] left-1/2 -translate-x-1/2 z-50 flex gap-1.5">
          {allImages.map((_, i) =>
        <div
          key={i}
          className={cn(
            "h-1 rounded-full transition-all duration-300",
            i === currentImageIndex ? "w-5 bg-white" : "w-1.5 bg-white/50"
          )} />

        )}
        </div>
      }

      {/* Video mute toggle */}
      {isVideo && index === currentIndex &&
      <button
        onClick={(e) => {e.stopPropagation();setMuted(!muted);}}
        className="absolute top-16 left-4 z-50 p-2 rounded-full bg-black/30 backdrop-blur-sm">

          {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
        </button>
      }

      {/* Comments Sheet */}
      <CommentsSheet
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        postId={post.id}
        postAuthor={{
          name: post.user_profile?.full_name || "משתמש",
          avatar_url: post.user_profile?.avatar_url || ""
        }}
        commentsCount={post.comments_count}
        reactionsCount={post.likes_count} />

    </motion.div>);

};

export default SoundtrackFeed;