import { Heart, MessageCircle, Share2, Bookmark, Camera, Plus, TrendingUp, Loader2, ShoppingCart, Gift, ChevronLeft, Store, Stethoscope, Scissors, GraduationCap, Image, Video, Search, Settings2 } from "lucide-react";
import petidIcon from "@/assets/petid-icon.png";
import { FloatingActionButton } from "@/components/FloatingActionButton";

import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useEffect, useState, useCallback, useMemo, useRef, memo } from "react";
import { Virtuoso } from "react-virtuoso";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { StoriesBar } from "@/components/StoriesBar";
import { toast } from "sonner";
import { PostCard } from "@/components/PostCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCardErrorBoundary } from "@/components/PostCardErrorBoundary";
import { PetidAnimations } from "@/animations/petid";
import { MyPetsSection } from "@/components/home/MyPetsSection";
import { PetEditSheet } from "@/components/home/PetEditSheet";
import { playPetAddedSound } from "@/lib/sounds";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MyPetsSheet } from "@/components/MyPetsSheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdoptionPostCard } from "@/components/AdoptionPostCard";
import { ProductPostCard } from "@/components/ProductPostCard";
import { AdPostCard } from "@/components/AdPostCard";
import { SuggestedPostCard } from "@/components/SuggestedPostCard";
import { ParallaxScroll } from "@/components/ParallaxScroll";
import { useCart } from "@/contexts/CartContext";
import { useFlyingCart } from "@/components/FlyingCartAnimation";
import { ChallengePostCard } from "@/components/ChallengePostCard";
import { BusinessFeedBanner } from "@/components/business/BusinessFeedBanner";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { useOnboarding } from "@/hooks/useOnboarding";
import { SkeletonFeed } from "@/components/ui/enhanced-skeleton";
import { FeedTabs, FeedViewSwitcher, FeedGridView, FeedVideoView, FeedMasonryView, BackToTopButton, FeedSettings, QuickShareSheet, type FeedTab, type FeedViewMode, type FeedTextSize, type FeedDensity } from "@/components/feed";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/PullToRefresh";
import { useFeedPersonalization } from "@/hooks/useFeedPersonalization";
import { useLocation } from "@/hooks/useLocation";
import { useEngagement } from "@/hooks/useEngagement";
import { filterSafeContent, sortBySafetyScore } from "@/lib/contentSafety";
import { useNotificationsBadge } from "@/hooks/useNotificationsBadge";
import { SEO } from "@/components/SEO";

// Shop products for feed
const SHOP_PRODUCTS: FeedProduct[] = [{
  id: "prod-1",
  title: "מזון יבש פרימיום",
  price: "₪189",
  originalPrice: "₪249",
  image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=500&h=500&fit=crop",
  description: "מזון איכותי לכלבים בוגרים, עשיר בחלבון ובויטמינים חיוניים",
  hasSale: true,
  rating: 4.8,
  reviews: 324
}, {
  id: "prod-2",
  title: "חטיפי עוף מיובשים",
  price: "₪45",
  image: "https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=500&h=500&fit=crop",
  description: "חטיפים טבעיים 100% מעוף איכותי, ללא תוספים",
  hasSale: false,
  rating: 4.5,
  reviews: 156
}, {
  id: "prod-3",
  title: "מיטה אורתופדית",
  price: "₪299",
  originalPrice: "₪399",
  image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&h=500&fit=crop",
  description: "מיטה נוחה עם קצף זיכרון לתמיכה מושלמת בגוף",
  hasSale: true,
  rating: 4.9,
  reviews: 487
}, {
  id: "prod-4",
  title: "צעצוע אינטראקטיבי",
  price: "₪129",
  image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=500&h=500&fit=crop",
  description: "צעצוע חכם שמפעיל את הכלב ומעסיק אותו לשעות",
  hasSale: false,
  rating: 4.3,
  reviews: 89
}, {
  id: "prod-5",
  title: "שמפו טיפולי",
  price: "₪59",
  originalPrice: "₪79",
  image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&h=500&fit=crop",
  description: "שמפו עדין לעור רגיש, מפנק את הפרווה",
  hasSale: true,
  rating: 4.6,
  reviews: 203
}, {
  id: "prod-6",
  title: "קערה אוטומטית",
  price: "₪169",
  image: "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=500&h=500&fit=crop",
  description: "קערת מים ואוכל חכמה עם חיישן מילוי אוטומטי",
  hasSale: false,
  rating: 4.7,
  reviews: 312
}];

// Promotional ads for feed
interface FeedAd {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  cta: string;
  link: string;
  gradient: string;
  badge?: string;
}
const FEED_ADS: FeedAd[] = [{
  id: "ad-1",
  title: "ביטוח חיות מחמד",
  subtitle: "הגן על חבר הפרווה שלך עם כיסוי מלא",
  image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=400&fit=crop",
  cta: "קבל הצעה",
  link: "/chat",
  gradient: "from-blue-500 to-cyan-400",
  badge: "פופולרי"
}, {
  id: "ad-2",
  title: "אילוף מקצועי",
  subtitle: "הפוך את הכלב שלך לחבר מושלם",
  image: "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=600&h=400&fit=crop",
  cta: "התחל עכשיו",
  link: "/chat",
  gradient: "from-purple-500 to-pink-400",
  badge: "חדש"
}, {
  id: "ad-3",
  title: "מועדון הטבות Petid",
  subtitle: "הנחות בלעדיות לחברי המועדון",
  image: "https://images.unsplash.com/photo-1544568100-847a948585b9?w=600&h=400&fit=crop",
  cta: "הצטרף חינם",
  link: "/shop",
  gradient: "from-amber-500 to-orange-400",
  badge: "20% הנחה"
}];
interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_saved: boolean;
}
interface AdoptionPet {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  age_years: number | null;
  age_months: number | null;
  gender: string | null;
  size: string;
  description: string | null;
  special_needs: string | null;
  is_vaccinated: boolean;
  is_neutered: boolean;
  image_url: string | null;
  status: string;
  created_at: string | null;
}
interface FeedProduct {
  id: string;
  title: string;
  price: string;
  originalPrice?: string;
  image: string;
  description?: string;
  hasSale?: boolean;
  rating?: number;
  reviews?: number;
}
interface SuggestedPost {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  likes_count: number;
  comments_count: number;
}
interface FeedChallenge {
  id: string;
  title: string;
  title_he: string;
  description: string | null;
  description_he: string | null;
  hashtag: string;
  cover_image_url: string | null;
  participant_count: number;
  is_active: boolean;
  ends_at: string | null;
  is_joined?: boolean;
  created_at: string;
}
type FeedItem = {
  type: 'post';
  data: Post;
  created_at: string;
} | {
  type: 'adoption';
  data: AdoptionPet;
  created_at: string;
} | {
  type: 'product';
  data: FeedProduct;
  created_at: string;
} | {
  type: 'ad';
  data: FeedAd;
  created_at: string;
} | {
  type: 'suggested';
  data: SuggestedPost;
  created_at: string;
} | {
  type: 'challenge';
  data: FeedChallenge;
  created_at: string;
};
const Feed = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    checkAuth,
    isAuthenticated
  } = useRequireAuth();
  const {
    getTotalItems,
    cartShake
  } = useCart();
  const {
    setCartIconPosition
  } = useFlyingCart();
  const { unreadCount: notificationCount } = useNotificationsBadge();
  const cartIconRef = useRef<HTMLButtonElement>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [adoptionPets, setAdoptionPets] = useState<AdoptionPet[]>([]);
  const [suggestedPosts, setSuggestedPosts] = useState<SuggestedPost[]>([]);
  const [challenges, setChallenges] = useState<FeedChallenge[]>([]);
  const [shopProducts, setShopProducts] = useState<FeedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const [doubleTapLike, setDoubleTapLike] = useState<string | null>(null);
  const [feedFilter, setFeedFilter] = useState<"all" | "following">("all");
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);

  // New contextual feed state
  const [activeTab, setActiveTab] = useState<FeedTab>("foryou");
  const [viewMode, setViewMode] = useState<FeedViewMode>("feed");
  const {
    config,
    features,
    sortByPriority,
    applyFeedRules,
    defaultTab,
    isBusiness,
    isOrg
  } = useFeedPersonalization();
  const {
    requestLocation,
    city,
    hasLocation,
    isNearby
  } = useLocation();
  const {
    trackLike,
    trackSave,
    trackClick,
    startViewTimer,
    endViewTimer
  } = useEngagement();
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [pets, setPets] = useState<any[]>([]);
  const [newlyAddedPetIds, setNewlyAddedPetIds] = useState<Set<string>>(new Set());
  const [editingPet, setEditingPet] = useState<any | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    breed: ""
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [isPetsSheetOpen, setIsPetsSheetOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [feedTextSize, setFeedTextSize] = useState<FeedTextSize>("normal");
  const [feedDensity, setFeedDensity] = useState<FeedDensity>("normal");
  const [showFeedSettings, setShowFeedSettings] = useState(false);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [shareCaption, setShareCaption] = useState<string>("");
  const observerTarget = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const POSTS_PER_PAGE = 10;

  // Scroll position memory
  useScrollPosition("main-feed");

  // Pull to refresh - defined after fetch functions are available
  // (moved to after fetch declarations below)

  // Fetch shop products from database
  const fetchShopProducts = useCallback(async () => {
    try {
      // First try business_products
      let {
        data: products,
        error
      } = await supabase.from("business_products").select("id, name, price, sale_price, original_price, image_url, description, average_rating, review_count, is_featured").eq("in_stock", true).order("is_featured", {
        ascending: false
      }).order("created_at", {
        ascending: false
      }).limit(6);

      // If no business products, try scraped_products
      if ((!products || products.length === 0) && !error) {
        const {
          data: scrapedProducts
        } = await supabase.from("scraped_products").select("id, product_name, final_price, regular_price, main_image_url, short_description, rating, review_count, created_at").order("created_at", {
          ascending: false
        }).limit(6);
        if (scrapedProducts && scrapedProducts.length > 0) {
          const formattedProducts: FeedProduct[] = scrapedProducts.map((p: any) => ({
            id: p.id,
            title: p.product_name || "מוצר",
            price: `₪${p.final_price || 0}`,
            originalPrice: p.regular_price ? `₪${p.regular_price}` : undefined,
            image: p.main_image_url || "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=500&h=500&fit=crop",
            description: p.short_description || "",
            hasSale: p.regular_price && p.final_price < p.regular_price,
            rating: p.rating || 4.5,
            reviews: p.review_count || Math.floor(Math.random() * 200) + 50
          }));
          setShopProducts(formattedProducts);
          return;
        }
      }
      if (error) throw error;
      if (products && products.length > 0) {
        const formattedProducts: FeedProduct[] = products.map((p: any) => ({
          id: p.id,
          title: p.name,
          price: `₪${p.sale_price || p.price}`,
          originalPrice: p.original_price ? `₪${p.original_price}` : undefined,
          image: p.image_url || "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=500&h=500&fit=crop",
          description: p.description || "",
          hasSale: !!(p.sale_price && p.sale_price < p.price),
          rating: p.average_rating || 4.5,
          reviews: p.review_count || 0
        }));
        setShopProducts(formattedProducts);
      } else {
        // Fallback to demo products if no DB products available
        setShopProducts(SHOP_PRODUCTS);
      }
    } catch (error) {
      console.error("Error fetching shop products:", error);
      setShopProducts(SHOP_PRODUCTS);
    }
  }, []);

  // Fetch adoption pets
  const fetchAdoptionPets = useCallback(async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("adoption_pets").select("*").eq("status", "available").order("created_at", {
        ascending: false
      }).limit(5);
      if (error) throw error;
      setAdoptionPets(data || []);
    } catch (error) {
      console.error("Error fetching adoption pets:", error);
    }
  }, []);

  // Fetch challenges
  const fetchChallenges = useCallback(async () => {
    try {
      const {
        data: challengesData
      } = await supabase.from("challenges").select("*").eq("is_active", true).order("participant_count", {
        ascending: false
      }).limit(5);
      if (!challengesData) {
        setChallenges([]);
        return;
      }

      // Check if user joined any challenges
      if (user) {
        const {
          data: participations
        } = await supabase.from("challenge_participants").select("challenge_id").eq("user_id", user.id);
        const joinedIds = new Set(participations?.map(p => p.challenge_id) || []);
        setChallenges(challengesData.map(c => ({
          ...c,
          is_joined: joinedIds.has(c.id),
          created_at: c.created_at || new Date().toISOString()
        })));
      } else {
        setChallenges(challengesData.map(c => ({
          ...c,
          created_at: c.created_at || new Date().toISOString()
        })));
      }
    } catch (error) {
      console.error("Error fetching challenges:", error);
    }
  }, [user]);
  const fetchSuggestedPosts = useCallback(async () => {
    try {
      // Get users that the current user follows
      let followedUserIds: string[] = [];
      if (user) {
        const {
          data: followingData
        } = await supabase.from("user_follows").select("following_id").eq("follower_id", user.id);
        followedUserIds = followingData?.map(f => f.following_id) || [];
        followedUserIds.push(user.id); // Exclude own posts
      }

      // Fetch posts from users not in the following list, ordered by engagement
      let query = supabase.from("posts").select(`
          *,
          profiles!posts_user_id_fkey_profiles (
            id,
            full_name,
            avatar_url
          )
        `).order("created_at", {
        ascending: false
      }).limit(5);

      // If user is logged in, exclude posts from followed users
      if (followedUserIds.length > 0) {
        query = query.not("user_id", "in", `(${followedUserIds.join(",")})`);
      }
      const {
        data: postsData,
        error
      } = await query;
      if (error) throw error;
      if (postsData && postsData.length > 0) {
        const postIds = postsData.map(p => p.id);

        // Get likes count for these posts
        const {
          data: likesData
        } = await supabase.from("post_likes").select("post_id").in("post_id", postIds);

        // Get comments count
        const {
          data: commentsData
        } = await supabase.from("post_comments").select("post_id").in("post_id", postIds);
        const likesCount = likesData?.reduce((acc: Record<string, number>, like: any) => {
          acc[like.post_id] = (acc[like.post_id] || 0) + 1;
          return acc;
        }, {}) || {};
        const commentsCount = commentsData?.reduce((acc: Record<string, number>, comment: any) => {
          acc[comment.post_id] = (acc[comment.post_id] || 0) + 1;
          return acc;
        }, {}) || {};

        // Format and sort by engagement (likes + comments)
        const formattedPosts: SuggestedPost[] = postsData.map((post: any) => {
          const profile = post.profiles;
          return {
            id: post.id,
            user_id: post.user_id,
            image_url: post.image_url,
            caption: post.caption,
            created_at: post.created_at,
            user: {
              id: profile?.id || post.user_id,
              full_name: profile?.full_name || "משתמש",
              avatar_url: profile?.avatar_url || ""
            },
            likes_count: likesCount[post.id] || 0,
            comments_count: commentsCount[post.id] || 0
          };
        }).sort((a, b) => b.likes_count + b.comments_count - (a.likes_count + a.comments_count));
        setSuggestedPosts(formattedPosts);
      }
    } catch (error) {
      console.error("Error fetching suggested posts:", error);
    }
  }, [user]);

  const handleCreatePost = () => {
    if (!checkAuth("כדי לפרסם פוסט, יש להתחבר")) return;
    setCreatePostOpen(true);
  };
  const handleNavigateToNotifications = () => {
    if (!checkAuth("כדי לצפות בהתראות, יש להתחבר")) return;
    navigate('/notifications');
  };
  const handleNavigateToMessages = () => {
    if (!checkAuth("כדי לשלוח הודעות, יש להתחבר")) return;
    navigate('/messages');
  };
  const handleFollowingFilter = () => {
    if (!checkAuth("כדי לצפות בפוסטים של העוקבים שלך, יש להתחבר")) return;
    setActiveTab("following");
  };

  // Handle tab changes
  const handleTabChange = (tab: FeedTab) => {
    setActiveTab(tab);
    // Request location for nearby tab
    if (tab === "nearby" && !hasLocation) {
      requestLocation();
    }
  };
  const fetchPosts = useCallback(async (pageNum: number, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setPage(0);
      setHasMore(true);
    }
    try {
      // Fetch following IDs if user is authenticated
      if (user && !append) {
        const {
          data: followingData
        } = await supabase.from("user_follows").select("following_id").eq("follower_id", user.id);
        const ids = followingData?.map(f => f.following_id) || [];
        setFollowingIds(ids);
      }

      // Fetch posts with user profiles - specify exact relationship
      const {
        data: postsData,
        error: postsError
      } = await supabase.from("posts").select(`
          *,
          profiles!posts_user_id_fkey_profiles (
            id,
            full_name,
            avatar_url
          )
        `).order("created_at", {
        ascending: false
      }).range(pageNum * POSTS_PER_PAGE, (pageNum + 1) * POSTS_PER_PAGE - 1);
      if (postsError) throw postsError;

      // Check if we have more posts
      if (!postsData || postsData.length < POSTS_PER_PAGE) {
        setHasMore(false);
      }
      if (postsData && postsData.length > 0) {
        const postIds = postsData.map(p => p.id);

        // Batch fetch likes
        const {
          data: likesData
        } = await supabase.from("post_likes").select("post_id").in("post_id", postIds);

        // Batch fetch comments
        const {
          data: commentsData
        } = await supabase.from("post_comments").select("post_id").in("post_id", postIds);

        // Fetch user's likes and saves if authenticated
        let userLikes: string[] = [];
        let userSaves: string[] = [];
        if (user) {
          const {
            data: userLikesData
          } = await supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds);
          userLikes = userLikesData?.map(l => l.post_id) || [];
          const {
            data: userSavesData
          } = await supabase.from("saved_posts").select("post_id").eq("user_id", user.id).in("post_id", postIds);
          userSaves = userSavesData?.map(s => s.post_id) || [];
        }

        // Count likes and comments
        const likesCount = likesData?.reduce((acc: any, like: any) => {
          acc[like.post_id] = (acc[like.post_id] || 0) + 1;
          return acc;
        }, {}) || {};
        const commentsCount = commentsData?.reduce((acc: any, comment: any) => {
          acc[comment.post_id] = (acc[comment.post_id] || 0) + 1;
          return acc;
        }, {}) || {};

        // Format posts - ensure profiles data is properly mapped
        const formattedPosts = postsData.map((post: any) => {
          const profile = post.profiles;
          return {
            id: post.id,
            user_id: post.user_id,
            image_url: post.image_url,
            caption: post.caption,
            created_at: post.created_at,
            user: {
              id: profile?.id || post.user_id,
              full_name: profile?.full_name || "משתמש",
              avatar_url: profile?.avatar_url || ""
            },
            likes_count: likesCount[post.id] || 0,
            comments_count: commentsCount[post.id] || 0,
            is_liked: userLikes.includes(post.id),
            is_saved: userSaves.includes(post.id)
          };
        });
        if (append) {
          setPosts(prev => [...prev, ...formattedPosts]);
        } else {
          setPosts(formattedPosts);
        }
      } else if (!append) {
        setPosts([]);
      }
    } catch (error: any) {
      console.error("Error fetching posts:", error);
      toast.error("שגיאה בטעינת הפיד");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, POSTS_PER_PAGE]);

  // Pull to refresh - must be after all fetch function declarations
  const handleRefresh = useCallback(async () => {
    setPage(0);
    setHasMore(true);
    await Promise.all([
      fetchPosts(0, false),
      fetchAdoptionPets(),
      fetchSuggestedPosts(),
      fetchChallenges(),
      fetchShopProducts(),
    ]);
  }, [fetchPosts, fetchAdoptionPets, fetchSuggestedPosts, fetchChallenges, fetchShopProducts]);

  const { pullDistance, isRefreshing, progress, shouldTrigger, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: handleRefresh,
  });


  // Fetch user avatar and pets
  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        // Fetch avatar
        const {
          data: profileData
        } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
        if (profileData?.avatar_url) {
          setUserAvatar(profileData.avatar_url);
        }

        // Fetch pets
        const {
          data: petsData,
          error: petsError
        } = await supabase.from("pets").select("*").eq("user_id", user.id).eq("archived", false).order("created_at", {
          ascending: false
        });
        if (!petsError && petsData) {
          setPets(petsData);
        }
      }
    };
    fetchUserData();
  }, [user]);

  // Play sound when new pet is added
  useEffect(() => {
    if (newlyAddedPetIds.size > 0) {
      playPetAddedSound();
    }
  }, [newlyAddedPetIds]);
  const handlePetLongPressStart = (pet: any) => {
    setEditingPet(pet);
    setEditFormData({
      name: pet.name || "",
      breed: pet.breed || ""
    });
    setIsEditSheetOpen(true);
  };
  const handlePetLongPressEnd = () => {
    // Long press ended without action
  };
  const handleCloseEditSheet = () => {
    setIsEditSheetOpen(false);
    setEditingPet(null);
    setShowDeleteConfirm(false);
  };
  const handleSavePetEdit = async () => {
    if (!editingPet) return;
    try {
      const {
        error
      } = await supabase.from("pets").update({
        name: editFormData.name,
        breed: editFormData.breed
      }).eq("id", editingPet.id);
      if (error) throw error;
      setPets(prev => prev.map(p => p.id === editingPet.id ? {
        ...p,
        name: editFormData.name,
        breed: editFormData.breed
      } : p));
      toast.success("פרטי חיית המחמד עודכנו בהצלחה");
      handleCloseEditSheet();
    } catch (error) {
      console.error("Error updating pet:", error);
      toast.error("שגיאה בעדכון פרטי חיית המחמד");
    }
  };
  const handlePetAvatarUpdate = (petId: string, newAvatarUrl: string) => {
    setPets(prev => prev.map(p => p.id === petId ? {
      ...p,
      avatar_url: newAvatarUrl
    } : p));
  };
  const handleArchivePet = async () => {
    if (!editingPet) return;
    try {
      const {
        error
      } = await supabase.from("pets").update({
        archived: true,
        archived_at: new Date().toISOString()
      }).eq("id", editingPet.id);
      if (error) throw error;
      setPets(prev => prev.filter(p => p.id !== editingPet.id));
      toast.success("חיית המחמד הועברה לארכיון");
      handleCloseEditSheet();
    } catch (error) {
      console.error("Error archiving pet:", error);
      toast.error("שגיאה בהעברת חיית המחמד לארכיון");
    }
  };
  // Scroll detection for hiding stories and back-to-top
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setIsScrolled(y > 100);
      setShowBackToTop(y > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  useEffect(() => {
    fetchPosts(0, false);
    fetchAdoptionPets();
    fetchSuggestedPosts();
    fetchChallenges();
    fetchShopProducts();

    // Setup realtime subscription for new posts
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    const channel = supabase.channel('posts-changes').on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'posts'
    }, () => {
      setNewPostsAvailable(true);
      fetchSuggestedPosts();
    }).on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'adoption_pets'
    }, () => {
      fetchAdoptionPets();
      setNewPostsAvailable(true);
    }).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'challenges'
    }, () => {
      fetchChallenges();
    }).subscribe();
    channelRef.current = channel;
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchPosts, fetchAdoptionPets, fetchSuggestedPosts, fetchChallenges, fetchShopProducts]);

  // Listen for refresh-feed event from bottom nav
  useEffect(() => {
    const handleRefreshFeed = () => {
      setPage(0);
      setHasMore(true);
      fetchPosts(0, false);
      fetchAdoptionPets();
      fetchSuggestedPosts();
      fetchChallenges();
      fetchShopProducts();
    };
    window.addEventListener('refresh-feed', handleRefreshFeed);
    return () => window.removeEventListener('refresh-feed', handleRefreshFeed);
  }, [fetchPosts, fetchAdoptionPets, fetchChallenges, fetchShopProducts]);

  // Load more posts function for Virtuoso
  const loadMorePosts = useCallback(() => {
    if (loadingMore || !hasMore || posts.length === 0) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  }, [loadingMore, hasMore, posts.length, page, fetchPosts]);
  const handleLike = useCallback(async (postId: string) => {
    if (!user) {
      toast.error("יש להתחבר כדי לאהוב פוסטים");
      return;
    }
    let previousState: {
      is_liked: boolean;
      likes_count: number;
    } | null = null;

    // Optimistic update using functional setState
    setPosts(prevPosts => {
      const post = prevPosts.find(p => p.id === postId);
      if (!post) return prevPosts;

      // Store previous state for potential revert
      previousState = {
        is_liked: post.is_liked,
        likes_count: post.likes_count
      };
      return prevPosts.map(p => p.id === postId ? {
        ...p,
        is_liked: !p.is_liked,
        likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1
      } : p);
    });
    try {
      if (previousState?.is_liked) {
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: user.id
        });
      }
    } catch (error: any) {
      // Revert on error using functional setState
      if (previousState) {
        setPosts(prevPosts => prevPosts.map(p => p.id === postId ? {
          ...p,
          is_liked: previousState!.is_liked,
          likes_count: previousState!.likes_count
        } : p));
      }
      toast.error("שגיאה בעדכון הלייק");
    }
  }, [user]);
  const handleSave = useCallback(async (postId: string) => {
    if (!user) {
      toast.error("יש להתחבר כדי לשמור פוסטים");
      return;
    }
    let previousIsSaved: boolean | null = null;

    // Optimistic update using functional setState
    setPosts(prevPosts => {
      const post = prevPosts.find(p => p.id === postId);
      if (!post) return prevPosts;

      // Store previous state for potential revert
      previousIsSaved = post.is_saved;
      return prevPosts.map(p => p.id === postId ? {
        ...p,
        is_saved: !p.is_saved
      } : p);
    });
    try {
      if (previousIsSaved) {
        await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", user.id);
        toast.success("הפוסט הוסר מהשמורים");
      } else {
        await supabase.from("saved_posts").insert({
          post_id: postId,
          user_id: user.id
        });
        toast.success("הפוסט נשמר בהצלחה");
      }
    } catch (error: any) {
      // Revert on error using functional setState
      if (previousIsSaved !== null) {
        setPosts(prevPosts => prevPosts.map(p => p.id === postId ? {
          ...p,
          is_saved: previousIsSaved!
        } : p));
      }
      toast.error("שגיאה בשמירת הפוסט");
    }
  }, [user]);
  const handleDoubleTap = useCallback((postId: string) => {
    // Check if already liked
    const post = posts.find(p => p.id === postId);
    if (!post || post.is_liked) return;

    // Show animation
    setDoubleTapLike(postId);
    setTimeout(() => setDoubleTapLike(null), 1000);

    // Trigger like
    handleLike(postId);
  }, [handleLike, posts]);
  const handleComment = useCallback(async (postId: string, comment: string) => {
    if (!user) {
      toast.error("יש להתחבר כדי להגיב");
      return;
    }
    try {
      await supabase.from("post_comments").insert({
        post_id: postId,
        user_id: user.id,
        comment_text: comment
      });

      // Update comment count optimistically
      setPosts(prevPosts => prevPosts.map(p => p.id === postId ? {
        ...p,
        comments_count: p.comments_count + 1
      } : p));
      toast.success("התגובה פורסמה");
    } catch (error: any) {
      toast.error("שגיאה בפרסום התגובה");
    }
  }, [user]);
  const handleLoadNewPosts = () => {
    setNewPostsAvailable(false);
    setPage(0);
    setHasMore(true);
    fetchPosts(0, false);
  };
  const getTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "עכשיו";
    if (seconds < 3600) return `לפני ${Math.floor(seconds / 60)} דקות`;
    if (seconds < 86400) return `לפני ${Math.floor(seconds / 3600)} שעות`;
    if (seconds < 604800) return `לפני ${Math.floor(seconds / 86400)} ימים`;
    return date.toLocaleDateString("he-IL");
  }, []);

  // Create mixed feed with posts, adoption pets, products, ads, and suggested posts
  // Now enhanced with tab-based filtering and role-based personalization
  const mixedFeed = useMemo((): FeedItem[] => {
    // Convert posts to FeedItems
    const postItems: FeedItem[] = posts.map(post => ({
      type: 'post' as const,
      data: post,
      created_at: post.created_at
    }));

    // Convert adoption pets to FeedItems
    const adoptionItems: FeedItem[] = adoptionPets.map(pet => ({
      type: 'adoption' as const,
      data: pet,
      created_at: pet.created_at || new Date().toISOString()
    }));

    // Convert products to FeedItems - use shopProducts from DB, fallback to SHOP_PRODUCTS
    const productsToUse = shopProducts.length > 0 ? shopProducts : SHOP_PRODUCTS;
    const productItems: FeedItem[] = productsToUse.map((product, index) => ({
      type: 'product' as const,
      data: product,
      created_at: new Date(Date.now() - (index + 2) * 3600000).toISOString()
    }));

    // Convert ads to FeedItems
    const adItems: FeedItem[] = FEED_ADS.map((ad, index) => ({
      type: 'ad' as const,
      data: ad,
      created_at: new Date(Date.now() - (index + 4) * 7200000).toISOString()
    }));

    // Convert suggested posts to FeedItems
    const suggestedItems: FeedItem[] = suggestedPosts.map((post, index) => ({
      type: 'suggested' as const,
      data: post,
      created_at: new Date(Date.now() - (index + 3) * 5400000).toISOString()
    }));

    // Convert challenges to FeedItems
    const challengeItems: FeedItem[] = challenges.map((challenge, index) => ({
      type: 'challenge' as const,
      data: challenge,
      created_at: new Date(Date.now() - (index + 1) * 4800000).toISOString()
    }));

    // Tab-based filtering
    switch (activeTab) {
      case "following":
        // Only show posts from followed users
        return postItems.filter(item => followingIds.includes((item.data as Post).user_id));
      case "marketplace":
        // Prioritize products, include some posts
        const marketItems = [...productItems, ...postItems.slice(0, 3)];
        return marketItems.sort((a, b) => {
          if (a.type === 'product' && b.type !== 'product') return -1;
          if (a.type !== 'product' && b.type === 'product') return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      case "adopt":
        // Only adoption content with some emotional posts
        const adoptItems = [...adoptionItems, ...postItems.filter(p => {
          const post = p.data as Post;
          return post.caption?.includes('אימוץ') || post.caption?.includes('adopt') || post.caption?.includes('הצלה');
        })];
        return adoptItems.sort((a, b) => {
          if (a.type === 'adoption' && b.type !== 'adoption') return -1;
          if (a.type !== 'adoption' && b.type === 'adoption') return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      case "dogparks":
        // Show posts related to dog parks and outdoor activities
        const dogparkItems = postItems.filter(p => {
          const post = p.data as Post;
          return post.caption?.includes('גינה') || 
                 post.caption?.includes('גינות') || 
                 post.caption?.includes('פארק') || 
                 post.caption?.includes('park') || 
                 post.caption?.includes('כלבים') ||
                 post.caption?.includes('טיול') ||
                 post.caption?.includes('חוץ');
        });
        // If no matching posts, show all posts as fallback
        if (dogparkItems.length === 0) {
          return postItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        return dogparkItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "explore":
        // Show diverse content for exploration
        const exploreItems = [...postItems, ...challengeItems, ...adoptionItems];
        return exploreItems.sort(() => Math.random() - 0.5).slice(0, 20);
      case "nearby":
        // Filter by user city if location is available
        if (hasLocation && city) {
          // Filter posts and content from users in the same city
          const nearbyItems = [...postItems, ...adoptionItems, ...challengeItems].filter(item => {
            // For posts, we'd need location data on posts - for now show all
            return true;
          });
          return nearbyItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        // Show all if no location
        return [...postItems, ...adoptionItems, ...challengeItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "foryou":
      default:
        // Start with posts sorted by date
        const sortedPosts = [...postItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Distribute non-organic content (challenges, products, ads, adoption, suggested) evenly
        const nonOrganicItems = [...challengeItems, ...adoptionItems, ...productItems.slice(0, 3),
        // Limit products
        ...adItems.slice(0, 2),
        // Limit ads
        ...suggestedItems.slice(0, 2) // Limit suggested
        ];

        // Shuffle non-organic items for variety
        const shuffledNonOrganic = nonOrganicItems.sort(() => Math.random() - 0.5);

        // Insert one non-organic item every 4-6 posts
        const result: FeedItem[] = [];
        let nonOrganicIndex = 0;
        const insertInterval = 5; // Insert after every 5 posts

        sortedPosts.forEach((post, index) => {
          result.push(post);

          // After every N posts, insert a non-organic item if available
          if ((index + 1) % insertInterval === 0 && nonOrganicIndex < shuffledNonOrganic.length) {
            result.push(shuffledNonOrganic[nonOrganicIndex]);
            nonOrganicIndex++;
          }
        });

        // Add remaining non-organic items at the end (spaced out)
        while (nonOrganicIndex < shuffledNonOrganic.length) {
          result.push(shuffledNonOrganic[nonOrganicIndex]);
          nonOrganicIndex++;
        }
        return applyFeedRules ? applyFeedRules(result) : result;
    }
  }, [posts, adoptionPets, suggestedPosts, challenges, shopProducts, activeTab, followingIds, sortByPriority, applyFeedRules]);

  // Handle following a suggested user - remove from suggested posts
  const handleSuggestedFollow = useCallback((userId: string) => {
    setSuggestedPosts(prev => prev.filter(post => post.user_id !== userId));
  }, []);
  const {
    showOnboarding,
    completeOnboarding
  } = useOnboarding();

  // Show onboarding for new users
  if (showOnboarding) {
    return <OnboardingFlow onComplete={completeOnboarding} />;
  }
  // Time-of-day gradient for header
  const getTimeGradient = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "from-amber-50/80 to-sky-50/80 dark:from-amber-950/30 dark:to-sky-950/30"; // Morning
    if (hour >= 12 && hour < 17) return "from-sky-50/80 to-blue-50/80 dark:from-sky-950/30 dark:to-blue-950/30"; // Afternoon
    if (hour >= 17 && hour < 21) return "from-orange-50/80 to-rose-50/80 dark:from-orange-950/30 dark:to-rose-950/30"; // Evening
    return "from-indigo-50/80 to-slate-50/80 dark:from-indigo-950/30 dark:to-slate-950/30"; // Night
  };

  return <div className="h-screen bg-gradient-to-b from-background to-muted/20 overflow-hidden overscroll-x-none" dir="rtl" style={{ touchAction: 'pan-y' }} {...pullHandlers}>
    <SEO title="פיד" description="גלו תוכן מעניין מקהילת בעלי חיות המחמד בישראל" url="/feed" />
    {/* Pull to refresh indicator */}
    <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} progress={progress} shouldTrigger={shouldTrigger} />
    <div className="h-full overflow-y-auto overflow-x-hidden pb-[70px] overscroll-x-none" style={{ transform: `translateY(${pullDistance}px)`, transition: isRefreshing ? 'none' : pullDistance === 0 ? 'transform 0.3s ease' : 'none' }}>
      {/* PetID-style Header - Modern, Clean */}
      <motion.div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? `bg-card/95 backdrop-blur-2xl border-b border-border/30 shadow-md bg-gradient-to-r ${getTimeGradient()}` : "bg-transparent"}`} initial={{
      y: -20,
      opacity: 0
    }} animate={{
      y: 0,
      opacity: 1
    }} transition={{
      duration: 0.3
    }}>
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          {/* Right side (in RTL) - Logo with Paw */}
          <motion.div className="flex items-center gap-1 shrink-0" whileHover={{
          scale: 1.02
        }} whileTap={{
          scale: 0.98
        }}>
            <img src={petidIcon} alt="Petid" className="w-7 h-7 object-contain" />
            <h1 className="text-[22px] font-black cursor-pointer text-foreground italic" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }} onClick={() => {
            setPage(0);
            setHasMore(true);
            fetchPosts(0, false);
            window.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
          }}>
              PetID
            </h1>
            <ChevronLeft className="w-4 h-4 text-foreground -rotate-90" strokeWidth={2} />
          </motion.div>
          
          {/* Center - Search Bar (Instagram style) */}
          <div 
            className="flex-1 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={() => navigate('/explore')}
          >
            <Search className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
            <span className="text-sm text-muted-foreground">Search</span>
          </div>

          {/* Left side (in RTL) - Heart + Settings */}
          <div className="flex items-center gap-2 shrink-0">
            <motion.button 
              type="button"
              onClick={() => setShowFeedSettings(true)} 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
            >
              <Settings2 className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </motion.button>
            <motion.button 
              type="button"
              onClick={handleNavigateToNotifications} 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
            >
              <Heart className="w-6 h-6 text-foreground" strokeWidth={1.5} />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Spacer for fixed header */}
      <div className="h-14" />

      {/* New Posts Banner */}
      <AnimatePresence>
        {newPostsAvailable && <motion.div initial={{
        y: -50,
        opacity: 0
      }} animate={{
        y: 0,
        opacity: 1
      }} exit={{
        y: -50,
        opacity: 0
      }} className="fixed top-[56px] left-0 right-0 z-40 bg-gradient-to-r from-primary to-primary-light text-primary-foreground text-center cursor-pointer py-2.5 shadow-md rounded-b-2xl mx-4" onClick={handleLoadNewPosts}>
            <span className="text-sm font-medium flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              🐾 פוסטים חדשים
            </span>
          </motion.div>}
      </AnimatePresence>

      {/* My Pets Section - Above Stories */}
      {isAuthenticated && <motion.div initial={{
      opacity: 0,
      y: 10
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: 0.1,
      duration: 0.4
    }}>


        {/* Business Directory Quick Access */}
        
      </motion.div>}

      {/* Stories Bar - Context-aware, smooth transition */}
      <AnimatePresence>
        {!isScrolled && <motion.div initial={{
        opacity: 0,
        height: 0
      }} animate={{
        opacity: 1,
        height: "auto"
      }} exit={{
        opacity: 0,
        height: 0
      }} transition={{
        duration: 0.25,
        ease: "easeInOut"
      }} className="bg-card/50 backdrop-blur-sm border-b border-border/20 overflow-hidden">
            <StoriesBar activeTab={activeTab} userCity={city} followingIds={followingIds} />
          </motion.div>}
      </AnimatePresence>

      {/* Feed */}
      <div className={`max-w-lg mx-auto ${feedTextSize === 'small' ? 'text-xs' : feedTextSize === 'large' ? 'text-base' : 'text-sm'} ${feedDensity === 'compact' ? 'space-y-0' : feedDensity === 'comfortable' ? 'space-y-4' : 'space-y-1'}`}>
        {loading ? <SkeletonFeed /> : mixedFeed.length === 0 ?
      // Enhanced Empty state - Beautiful and inviting
      <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.5,
        ease: "easeOut"
      }} className="text-center py-16 px-6">
        <motion.div initial={{
          scale: 0,
          rotate: -10
        }} animate={{
          scale: 1,
          rotate: 0
        }} transition={{
          delay: 0.15,
          type: "spring",
          stiffness: 200
        }} className="relative w-28 h-28 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl flex items-center justify-center mx-auto mb-6">
          <motion.div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-3xl" animate={{
            scale: [1, 1.1, 1]
          }} transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }} />
          <Camera className="w-12 h-12 text-primary/60" strokeWidth={1.5} />
        </motion.div>
        <motion.h3 initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          delay: 0.3
        }} className="text-xl font-bold text-foreground mb-2">
          {activeTab === "following" ? "אין עדיין פוסטים" : "שתפו רגעים"}
        </motion.h3>
        <motion.p initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          delay: 0.4
        }} className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto leading-relaxed">
          {activeTab === "following" ? "עקבו אחרי חברים כדי לראות את הפוסטים שלהם" : "שתפו תמונות של חיית המחמד שלכם והצטרפו לקהילה"}
        </motion.p>
        <motion.button initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.5
        }} whileHover={{
          scale: 1.03
        }} whileTap={{
          scale: 0.97
        }} onClick={handleCreatePost} className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold text-sm px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all">
          <Camera className="w-4 h-4" />
          שתף את התמונה הראשונה
        </motion.button>
      </motion.div> : <Virtuoso
          data={mixedFeed}
          useWindowScroll
          overscan={500}
          endReached={() => {
            if (hasMore && !loadingMore) {
              loadMorePosts();
            }
          }}
          itemContent={(index, item) => {
            if (item.type === 'post') {
              return (
                <div key={`post-${item.data.id}`}>
                  <PostCardErrorBoundary>
                    <PostCard 
                      post={item.data} 
                      currentUserId={user?.id} 
                      currentUserAvatar={userAvatar} 
                      onLike={handleLike} 
                      onSave={handleSave} 
                      onDoubleTap={handleDoubleTap} 
                      onComment={handleComment} 
                      showDoubleTapAnimation={doubleTapLike === item.data.id} 
                      getTimeAgo={getTimeAgo} 
                    />
                  </PostCardErrorBoundary>
                </div>
              );
            } else if (item.type === 'adoption') {
              return (
                <div key={`adoption-${item.data.id}`}>
                  <AdoptionPostCard pet={item.data} getTimeAgo={getTimeAgo} />
                </div>
              );
            } else if (item.type === 'product') {
              return (
                <div key={`product-${item.data.id}`}>
                  <ProductPostCard product={item.data} />
                </div>
              );
            } else if (item.type === 'ad') {
              return (
                <div key={`ad-${item.data.id}`}>
                  <AdPostCard ad={item.data} />
                </div>
              );
            } else if (item.type === 'suggested') {
              return (
                <div key={`suggested-${item.data.id}`}>
                  <SuggestedPostCard post={item.data} onFollow={handleSuggestedFollow} />
                </div>
              );
            } else if (item.type === 'challenge') {
              return (
                <div key={`challenge-${item.data.id}`}>
                  <ChallengePostCard challenge={item.data} gradientIndex={index} onJoinChange={fetchChallenges} />
                </div>
              );
            }
            return null;
          }}
          components={{
            Footer: () => loadingMore ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex items-center justify-center gap-2 py-6"
              >
                <Loader2 className="w-5 h-5 animate-spin text-[#8E8E8E]" />
                <span className="text-[13px] text-[#8E8E8E]">טוען עוד...</span>
              </motion.div>
            ) : null
          }}
        />}
      </div>

      {/* End of Feed - Refined design */}
      {!loading && !hasMore && mixedFeed.length > 0 && <motion.div initial={{
      opacity: 0,
      y: 10
    }} animate={{
      opacity: 1,
      y: 0
    }} className="text-center py-10 px-6">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-px bg-gradient-to-r from-transparent to-border" />
              <img src={petidIcon} alt="Petid" className="w-5 h-5 object-contain opacity-50" />
              <div className="w-12 h-px bg-gradient-to-l from-transparent to-border" />
            </div>
            <p className="text-sm text-muted-foreground">סיימת לראות הכל 🐾</p>
            <button onClick={() => {
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
          setPage(0);
          setHasMore(true);
          fetchPosts(0, false);
        }} className="text-xs text-primary font-medium hover:underline">
              חזור למעלה
            </button>
          </div>
        </motion.div>}

      <CreatePostDialog open={createPostOpen} onOpenChange={setCreatePostOpen} onPostCreated={() => {
      setPage(0);
      setHasMore(true);
      fetchPosts(0, false);
    }} />

      {/* Pet Edit Sheet */}
      <PetEditSheet pet={editingPet} isOpen={isEditSheetOpen} onClose={handleCloseEditSheet} editFormData={editFormData} onFormDataChange={setEditFormData} onSave={handleSavePetEdit} onDelete={handleArchivePet} showDeleteConfirm={showDeleteConfirm} onDeleteConfirmChange={setShowDeleteConfirm} onAvatarUpdate={handlePetAvatarUpdate} />


      {/* Floating Action Button for Create */}
      <FloatingActionButton icon={Plus} label="צור תוכן חדש" position="bottom-left" variant="primary" actions={[{
      icon: Camera,
      label: "פוסט חדש",
      onClick: handleCreatePost
    }, {
      icon: Image,
      label: "סטורי",
      onClick: () => {
        if (checkAuth("כדי ליצור סטורי, יש להתחבר")) {
          navigate('/story/create');
        }
      }
    }, {
      icon: Video,
      label: "ריל",
      onClick: () => {
        if (checkAuth("כדי ליצור ריל, יש להתחבר")) {
          navigate('/reels');
        }
      }
    }]} />

      {/* My Pets Sheet */}
      <MyPetsSheet open={isPetsSheetOpen} onOpenChange={setIsPetsSheetOpen} pets={pets} newlyAddedPetIds={newlyAddedPetIds} onPetLongPressStart={handlePetLongPressStart} onPetLongPressEnd={handlePetLongPressEnd} />

      {/* Back to top button */}
      <BackToTopButton visible={showBackToTop} />

      {/* Feed Settings */}
      <FeedSettings 
        open={showFeedSettings}
        onClose={() => setShowFeedSettings(false)}
        textSize={feedTextSize}
        onTextSizeChange={setFeedTextSize}
        density={feedDensity}
        onDensityChange={setFeedDensity}
      />

      {/* Quick Share Sheet */}
      <QuickShareSheet 
        open={!!sharePostId}
        onClose={() => setSharePostId(null)}
        postId={sharePostId || ""}
        caption={shareCaption}
      />
      </div>
      <BottomNav />
    </div>;
};
export default Feed;