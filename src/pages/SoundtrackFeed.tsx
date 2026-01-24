/**
 * SoundtrackFeed - Soundtrack-style vertical feed
 * Full-screen cards with overlayed actions
 * White theme with Discover/Following tabs
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { playAddToCartSound } from "@/lib/sounds";
import { useCart } from "@/contexts/CartContext";
import { useFlyingCart } from "@/components/FlyingCartAnimation";

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

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      let postsQuery = supabase
        .from("posts")
        .select(`id, user_id, image_url, caption, created_at`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (activeTab === "following" && user) {
        const { data: following } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", user.id);
        
        const followingIds = following?.map(f => f.following_id) || [];
        if (followingIds.length > 0) {
          postsQuery = postsQuery.in("user_id", followingIds);
        }
      }

      const { data: postsData, error } = await postsQuery;
      if (error) throw error;

      if (postsData && postsData.length > 0) {
        const userIds = [...new Set(postsData.map(p => p.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        let likedPostIds: string[] = [];
        let savedPostIds: string[] = [];
        let followingIds: string[] = [];

        if (user) {
          const [likesRes, savesRes, followsRes] = await Promise.all([
            supabase.from("post_likes").select("post_id").eq("user_id", user.id),
            supabase.from("saved_posts").select("post_id").eq("user_id", user.id),
            supabase.from("user_follows").select("following_id").eq("follower_id", user.id)
          ]);
          
          likedPostIds = likesRes.data?.map(l => l.post_id) || [];
          savedPostIds = savesRes.data?.map(s => s.post_id) || [];
          followingIds = followsRes.data?.map(f => f.following_id) || [];
        }

        // Count likes and comments for each post
        const postIds = postsData.map(p => p.id);
        const [likesCount, commentsCount] = await Promise.all([
          supabase.from("post_likes").select("post_id").in("post_id", postIds),
          supabase.from("post_comments").select("post_id").in("post_id", postIds)
        ]);

        const likesMap: Record<string, number> = {};
        const commentsMap: Record<string, number> = {};
        likesCount.data?.forEach(l => { likesMap[l.post_id] = (likesMap[l.post_id] || 0) + 1; });
        commentsCount.data?.forEach(c => { commentsMap[c.post_id] = (commentsMap[c.post_id] || 0) + 1; });

        const enrichedPosts: FeedPost[] = postsData.map(post => {
          // Determine media type
          const hasVideo = !!(post as any).video_url;
          const mediaUrls = (post as any).media_urls as string[] | null;
          const hasMultipleImages = mediaUrls && mediaUrls.length > 1;
          
          let mediaType: 'image' | 'gallery' | 'video' = 'image';
          if (hasVideo) mediaType = 'video';
          else if (hasMultipleImages) mediaType = 'gallery';
          
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
            user_profile: profiles?.find(p => p.id === post.user_id) || undefined,
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
            'https://images.unsplash.com/photo-1588943211346-0908a1fb0b01?w=800'
          ],
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

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleLike = async (postId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isLiked = post.is_liked;

    // Optimistic update
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, is_liked: !isLiked, likes_count: p.likes_count + (isLiked ? -1 : 1) }
        : p
    ));

    try {
      if (isLiked) {
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
      }
    } catch (error) {
      // Revert on error
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, is_liked: isLiked, likes_count: p.likes_count + (isLiked ? 1 : -1) }
          : p
      ));
    }
  };

  const handleSave = async (postId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isSaved = post.is_saved;

    setPosts(prev => prev.map(p => 
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
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, is_saved: isSaved } : p
      ));
    }
  };

  const handleFollow = async (userId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const isFollowing = posts.find(p => p.user_id === userId)?.is_following;

    setPosts(prev => prev.map(p => 
      p.user_id === userId ? { ...p, is_following: !isFollowing } : p
    ));

    try {
      if (isFollowing) {
        await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", userId);
      } else {
        await supabase.from("user_follows").insert({ follower_id: user.id, following_id: userId });
      }
    } catch (error) {
      setPosts(prev => prev.map(p => 
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
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden" dir="rtl">
      {/* Header with Tabs - at top */}
      <motion.header 
        className="absolute top-0 left-0 right-0 z-50 pointer-events-none pt-2"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center justify-center h-10 relative pointer-events-auto">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white"
          >
            <MoreHorizontal className="w-5 h-5 drop-shadow-md" />
          </Button>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "discover" | "following")}>
            <TabsList className="bg-transparent gap-8">
              <TabsTrigger 
                value="following" 
                className={cn(
                  "bg-transparent border-0 shadow-none text-base font-semibold px-0 py-1.5",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  activeTab === "following" 
                    ? "text-white drop-shadow-md border-b-2 border-white rounded-none" 
                    : "text-white/60"
                )}
              >
                עוקבים
              </TabsTrigger>
              <TabsTrigger 
                value="discover" 
                className={cn(
                  "bg-transparent border-0 shadow-none text-base font-semibold px-0 py-1.5",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  activeTab === "discover" 
                    ? "text-white drop-shadow-md border-b-2 border-white rounded-none" 
                    : "text-white/60"
                )}
              >
                גלה
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </motion.header>

      {/* Feed Cards */}
      <div 
        ref={containerRef}
        className="h-full pb-[70px] overflow-y-auto snap-y snap-mandatory"
        onScroll={handleScroll}
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {posts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <p className="text-lg">אין פוסטים להצגה</p>
            <p className="text-sm mt-2">
              {activeTab === "following" ? "עקוב אחרי משתמשים כדי לראות את הפוסטים שלהם" : "בקרוב יופיעו כאן פוסטים"}
            </p>
          </div>
        ) : (
          posts.map((post, index) => (
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
              userId={user?.id}
            />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
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
  const { addToCart } = useCart();
  const { triggerFly } = useFlyingCart();
  const productImageRef = useRef<HTMLImageElement>(null);
  
  // Get all images for gallery
  const allImages = post.media_urls && post.media_urls.length > 0 
    ? post.media_urls 
    : post.image_url 
      ? [post.image_url] 
      : [];
  
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
      quantity: 1,
    });
    
    // Play sound
    playAddToCartSound();
    
    // Confetti effect
    confetti({
      particleCount: 60,
      spread: 55,
      origin: { y: 0.8 },
      colors: ['#FBD66A', '#F4C542', '#FFD748', '#37B679'],
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
      setCurrentImageIndex(prev => prev + 1);
    }
  };
  
  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  };

  return (
    <motion.div
      className="h-[calc(100vh-56px-70px)] w-full snap-start relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.1 }}
    >

      {/* Post Image/Video with swipe support */}
      <div className="absolute inset-0">
        {allImages.length > 0 ? (
          <div className="relative w-full h-full">
            <AnimatePresence mode="wait">
              <motion.img 
                ref={currentImageIndex === 0 ? productImageRef : undefined}
                key={currentImageIndex}
                src={allImages[currentImageIndex]} 
                alt="" 
                className="w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                drag={hasMultipleImages ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -50) nextImage();
                  if (info.offset.x > 50) prevImage();
                }}
              />
            </AnimatePresence>
            
            {/* Navigation arrows for gallery */}
            {hasMultipleImages && (
              <>
                {currentImageIndex > 0 && (
                  <button
                    onClick={prevImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 backdrop-blur-sm"
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                )}
                {currentImageIndex < allImages.length - 1 && (
                  <button
                    onClick={nextImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 backdrop-blur-sm"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <p className="text-lg text-foreground/70 px-8 text-center">
              {post.caption || "פוסט ללא תמונה"}
            </p>
          </div>
        )}
      </div>

      {/* Second row - User info on right, media icon + variants on left */}
      <div className="absolute top-14 left-4 right-4 z-20 flex items-start justify-between">
        {/* Media type icon + Product variants - left side vertical stack */}
        <div className="flex flex-col gap-2">
          {isVideo ? (
            <div className="p-2 rounded-lg bg-black/20 backdrop-blur-sm border border-white/20">
              <Video className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
          ) : hasMultipleImages ? (
            <div className="p-2 rounded-lg bg-black/20 backdrop-blur-sm border border-white/20">
              <Images className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
          ) : allImages.length === 1 && (
            <div className="p-2 rounded-lg bg-black/20 backdrop-blur-sm border border-white/20">
              <Image className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
          )}
          
          {/* Product variant icons */}
          {isProductPost && (
            <>
              {post.product_weight && (
                <div className="p-2 rounded-lg bg-black/20 backdrop-blur-sm border border-white/20 flex items-center gap-1.5">
                  <Weight className="w-4 h-4 text-white" strokeWidth={1.5} />
                  <span className="text-white text-xs">{post.product_weight}</span>
                </div>
              )}
              {post.product_sizes && post.product_sizes.length > 0 && (
                <div className="p-2 rounded-lg bg-black/20 backdrop-blur-sm border border-white/20 flex items-center gap-1.5">
                  <Ruler className="w-4 h-4 text-white" strokeWidth={1.5} />
                  <span className="text-white text-xs">{post.product_sizes.join(', ')}</span>
                </div>
              )}
              {post.product_colors && post.product_colors.length > 0 && (
                <div className="p-2 rounded-lg bg-black/20 backdrop-blur-sm border border-white/20 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-white" strokeWidth={1.5} />
                  <span className="text-white text-xs">{post.product_colors.length} צבעים</span>
                </div>
              )}
              {post.product_id && (
                <motion.button
                  onClick={() => navigate(`/product/${post.product_id}`)}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-lg bg-black/20 backdrop-blur-sm border border-white/20"
                >
                  <Info className="w-4 h-4 text-white" strokeWidth={1.5} />
                </motion.button>
              )}
            </>
          )}
        </div>

        {/* User info - right side */}
        <div className="flex items-center gap-2 flex-row-reverse">
          <Avatar 
            className="w-10 h-10 cursor-pointer border-2 border-white/50"
            onClick={() => navigate(`/user/${post.user_id}`)}
          >
            <AvatarImage src={post.user_profile?.avatar_url || ""} className="object-cover" />
            <AvatarFallback className="bg-white/20">
              <User className="w-5 h-5 text-white" />
            </AvatarFallback>
          </Avatar>
          <span 
            className="font-semibold text-white text-sm cursor-pointer drop-shadow-lg"
            onClick={() => navigate(`/user/${post.user_id}`)}
          >
            {post.user_profile?.full_name || "משתמש"}
          </span>
          {post.user_profile?.is_verified && (
            <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" />
            </span>
          )}
        </div>
      </div>

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 pointer-events-none" />

      {/* Sound toggle for videos */}
      {isVideo && index === currentIndex && (
        <div className="absolute top-14 right-4 z-20">
          <button 
            onClick={() => setMuted(!muted)}
            className="p-2 rounded-full bg-black/30 backdrop-blur-sm"
          >
            {muted ? (
              <VolumeX className="w-5 h-5 text-white" />
            ) : (
              <Volume2 className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      )}

      {/* Gallery progress indicator */}
      {hasMultipleImages && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {allImages.map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                i === currentImageIndex 
                  ? "w-6 bg-white" 
                  : "w-1.5 bg-white/50"
              )}
            />
          ))}
        </div>
      )}

      {/* Bottom section - centered action bar */}
      <div className="absolute bottom-1 left-0 right-0 z-20 flex justify-center pb-2">
        <div className="flex items-center gap-5 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2">
          {/* Core interaction icons - minimalist aligned */}
          <motion.button
            onClick={() => onLike(post.id)}
            whileTap={{ scale: 0.9 }}
            className="flex items-center gap-1.5"
          >
            <Heart 
              className={cn(
                "w-5 h-5",
                post.is_liked 
                  ? "fill-red-500 text-red-500" 
                  : "text-white"
              )} 
              strokeWidth={1.5}
            />
            {post.likes_count > 0 && (
              <span className="text-white text-xs font-medium">{post.likes_count}</span>
            )}
          </motion.button>

          <motion.button
            onClick={() => navigate(`/post/${post.id}`)}
            whileTap={{ scale: 0.9 }}
            className="flex items-center gap-1.5"
          >
            <MessageCircle className="w-5 h-5 text-white" strokeWidth={1.5} />
            {post.comments_count > 0 && (
              <span className="text-white text-xs font-medium">{post.comments_count}</span>
            )}
          </motion.button>

          <motion.button
            onClick={() => onSave(post.id)}
            whileTap={{ scale: 0.9 }}
          >
            <Bookmark 
              className={cn(
                "w-5 h-5",
                post.is_saved 
                  ? "fill-yellow-400 text-yellow-400" 
                  : "text-white"
              )} 
              strokeWidth={1.5}
            />
          </motion.button>

          <motion.button whileTap={{ scale: 0.9 }}>
            <Share2 className="w-5 h-5 text-white" strokeWidth={1.5} />
          </motion.button>

          {/* CTA Button at the end */}
          {hasPromotion && !isProductPost && (
            <motion.button
              onClick={handleCtaClick}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
                isChallengePost && "bg-purple-500 text-white",
                isCtaPost && "bg-blue-500 text-white"
              )}
            >
              <span>
                {isChallengePost && 'הצטרף'}
                {isCtaPost && (post.cta_text || 'לפרטים')}
              </span>
              <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} />
            </motion.button>
          )}

          {/* Add to cart button for products */}
          {isProductPost && (
            <motion.button
              onClick={handleAddToCart}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#FBD66A] text-gray-800"
            >
              <span>{post.product_price ? `₪${post.product_price}` : 'הוסף'}</span>
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SoundtrackFeed;
