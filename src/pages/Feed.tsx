import { Heart, MessageCircle, Share2, Bookmark, Camera, Plus, TrendingUp, Loader2, Send, PawPrint, Menu, ShoppingCart, Coins, Gift, ChevronLeft, Store, Stethoscope, Scissors, GraduationCap } from "lucide-react";
import { usePoints } from "@/contexts/PointsContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { StoriesBar } from "@/components/StoriesBar";
import { toast } from "sonner";
import { PostCard } from "@/components/PostCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCardErrorBoundary } from "@/components/PostCardErrorBoundary";
import { PetishAnimations } from "@/animations/petish";
import { MyPetsSection } from "@/components/home/MyPetsSection";
import { PetEditSheet } from "@/components/home/PetEditSheet";
import { playPetAddedSound } from "@/lib/sounds";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdoptionPostCard } from "@/components/AdoptionPostCard";
import { ProductPostCard } from "@/components/ProductPostCard";
import { AdPostCard } from "@/components/AdPostCard";
import { SuggestedPostCard } from "@/components/SuggestedPostCard";
import { ParallaxScroll } from "@/components/ParallaxScroll";
import { useCart } from "@/contexts/CartContext";
import { useFlyingCart } from "@/components/FlyingCartAnimation";

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
  link: "/insurance",
  gradient: "from-blue-500 to-cyan-400",
  badge: "פופולרי"
}, {
  id: "ad-2",
  title: "אילוף מקצועי",
  subtitle: "הפוך את הכלב שלך לחבר מושלם",
  image: "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=600&h=400&fit=crop",
  cta: "התחל עכשיו",
  link: "/training",
  gradient: "from-purple-500 to-pink-400",
  badge: "חדש"
}, {
  id: "ad-3",
  title: "מועדון הטבות Petid",
  subtitle: "הנחות בלעדיות לחברי המועדון",
  image: "https://images.unsplash.com/photo-1544568100-847a948585b9?w=600&h=400&fit=crop",
  cta: "הצטרף חינם",
  link: "/rewards",
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
  const {
    totalPoints
  } = usePoints();
  const cartIconRef = useRef<HTMLButtonElement>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [adoptionPets, setAdoptionPets] = useState<AdoptionPet[]>([]);
  const [suggestedPosts, setSuggestedPosts] = useState<SuggestedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const [doubleTapLike, setDoubleTapLike] = useState<string | null>(null);
  const [feedFilter, setFeedFilter] = useState<"all" | "following">("all");
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const POSTS_PER_PAGE = 10;

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

  // Fetch suggested posts from users you don't follow
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
    setFeedFilter("following");
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
      toast.error("שגיאה בטעינת ה-Petish Feed");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, POSTS_PER_PAGE]);

  // Fetch user avatar and pets
  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        // Fetch avatar
        const {
          data: profileData
        } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).single();
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
  useEffect(() => {
    fetchPosts(0, false);
    fetchAdoptionPets();
    fetchSuggestedPosts();

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
    }).subscribe();
    channelRef.current = channel;
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchPosts, fetchAdoptionPets, fetchSuggestedPosts]);

  // Listen for refresh-feed event from bottom nav
  useEffect(() => {
    const handleRefreshFeed = () => {
      setPage(0);
      setHasMore(true);
      fetchPosts(0, false);
      fetchAdoptionPets();
      fetchSuggestedPosts();
    };
    window.addEventListener('refresh-feed', handleRefreshFeed);
    return () => window.removeEventListener('refresh-feed', handleRefreshFeed);
  }, [fetchPosts, fetchAdoptionPets]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingMore && hasMore && posts.length > 0) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchPosts(nextPage, true);
      }
    }, {
      threshold: 0.5
    });
    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }
    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
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
    setPosts(prevPosts => {
      const post = prevPosts.find(p => p.id === postId);
      if (!post || post.is_liked) return prevPosts;

      // Show animation
      setDoubleTapLike(postId);
      setTimeout(() => setDoubleTapLike(null), 1000);

      // Trigger like
      handleLike(postId);
      return prevPosts;
    });
  }, [handleLike]);
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
  const mixedFeed = useMemo((): FeedItem[] => {
    // Convert posts to FeedItems
    const postItems: FeedItem[] = posts.map(post => ({
      type: 'post' as const,
      data: post,
      created_at: post.created_at
    }));

    // Convert adoption pets to FeedItems (only show in "all" feed)
    const adoptionItems: FeedItem[] = feedFilter === "all" ? adoptionPets.map(pet => ({
      type: 'adoption' as const,
      data: pet,
      created_at: pet.created_at || new Date().toISOString()
    })) : [];

    // Convert products to FeedItems (only show in "all" feed)
    const productItems: FeedItem[] = feedFilter === "all" ? SHOP_PRODUCTS.map((product, index) => ({
      type: 'product' as const,
      data: product,
      // Spread products throughout the feed
      created_at: new Date(Date.now() - (index + 2) * 3600000).toISOString()
    })) : [];

    // Convert ads to FeedItems (only show in "all" feed)
    const adItems: FeedItem[] = feedFilter === "all" ? FEED_ADS.map((ad, index) => ({
      type: 'ad' as const,
      data: ad,
      created_at: new Date(Date.now() - (index + 4) * 7200000).toISOString()
    })) : [];

    // Convert suggested posts to FeedItems (only show in "all" feed)
    const suggestedItems: FeedItem[] = feedFilter === "all" ? suggestedPosts.map((post, index) => ({
      type: 'suggested' as const,
      data: post,
      // Spread suggested posts throughout the feed
      created_at: new Date(Date.now() - (index + 3) * 5400000).toISOString()
    })) : [];

    // Merge and sort by date
    const merged = [...postItems, ...adoptionItems, ...productItems, ...adItems, ...suggestedItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // If following filter, only show posts from followed users
    if (feedFilter === "following") {
      return merged.filter(item => item.type === 'post' && followingIds.includes(item.data.user_id));
    }
    return merged;
  }, [posts, adoptionPets, suggestedPosts, feedFilter, followingIds]);

  // Handle following a suggested user - remove from suggested posts
  const handleSuggestedFollow = useCallback((userId: string) => {
    setSuggestedPosts(prev => prev.filter(post => post.user_id !== userId));
  }, []);
  return <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/80 pb-14" dir="rtl">
      {/* Instagram-style Header with blur effect */}
      <motion.div initial={{
      y: -20,
      opacity: 0
    }} animate={{
      y: 0,
      opacity: 1
    }} transition={{
      duration: 0.4,
      ease: "easeOut"
    }} className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100/50 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-[56px] flex items-center justify-between">
          {/* Left side - Hamburger menu */}
          <div className="flex items-center gap-3">
            <motion.button whileHover={{
            scale: 1.1
          }} whileTap={{
            scale: 0.9
          }} onClick={() => setIsMenuOpen(true)} className="active:opacity-50 transition-opacity p-1" aria-label="פתח תפריט">
              <Menu className="w-6 h-6 text-[#262626] hover:text-[#8E8E8E] transition-colors" strokeWidth={1.5} />
            </motion.button>
            {/* Logo with PetID gradient and animation */}
            <motion.div className="relative cursor-pointer" whileHover={{
            scale: 1.05
          }} whileTap={{
            scale: 0.97
          }} onClick={() => {
            setPage(0);
            setHasMore(true);
            fetchPosts(0, false);
          }}>
              {/* Animated glow effect behind logo */}
              <motion.div className="absolute -inset-2 bg-gradient-to-r from-[#1E5799]/20 via-[#4ECDC4]/30 to-[#7DB9E8]/20 blur-xl rounded-full" animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [0.95, 1.1, 0.95]
            }} transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }} />
              <h1 className="relative text-[30px] font-black cursor-pointer bg-gradient-to-r from-[#1E5799] via-[#4ECDC4] via-55% to-[#7DB9E8] bg-clip-text text-transparent font-jakarta tracking-tight">
                Petid
              </h1>
            </motion.div>
          </div>
          
          {/* Right icons with Instagram colors */}
          <div className="flex items-center gap-1.5">
            {isAuthenticated && <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button whileHover={{
                scale: 1.1
              }} whileTap={{
                scale: 0.9
              }} className={`active:opacity-50 transition-opacity relative flex items-center gap-0.5 p-1 ${newlyAddedPetIds.size > 0 ? 'animate-pulse' : ''}`}>
                    <PawPrint className={`w-6 h-6 transition-colors ${newlyAddedPetIds.size > 0 ? 'text-[#4ECDC4]' : 'text-[#262626] hover:text-[#4ECDC4]'}`} strokeWidth={1.5} />
                    {pets.length > 0 && <motion.span initial={{
                  scale: 0
                }} animate={{
                  scale: 1
                }} className={`absolute -top-0.5 -right-0.5 w-4 h-4 bg-gradient-to-r from-[#1E5799] to-[#4ECDC4] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm ${newlyAddedPetIds.size > 0 ? 'animate-bounce' : ''}`}>
                        {pets.length}
                      </motion.span>}
                    
                  </motion.button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white/95 backdrop-blur-lg z-50 shadow-xl border-gray-100 rounded-xl">
                  <div className="px-3 py-2 text-[13px] font-semibold text-[#262626]">
                    חיות המחמד שלי
                  </div>
                  <DropdownMenuSeparator />
                  {pets.length === 0 ? <div className="px-3 py-4 text-center text-[13px] text-[#8E8E8E]">
                      אין חיות מחמד עדיין
                    </div> : pets.map(pet => <DropdownMenuItem key={pet.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 rounded-lg mx-1" onClick={() => navigate(`/pet/${pet.id}`)}>
                        <Avatar className="w-9 h-9 ring-2 ring-gray-100">
                          <AvatarImage src={pet.avatar_url} alt={pet.name} />
                          <AvatarFallback className="bg-gradient-to-br from-[#1E5799]/20 to-[#4ECDC4]/20 text-[11px]">
                            {pet.name?.charAt(0) || '🐾'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-[14px] font-medium text-[#262626]">{pet.name}</p>
                          <p className="text-[11px] text-[#8E8E8E]">{pet.breed || pet.type}</p>
                        </div>
                        {newlyAddedPetIds.has(pet.id) && <span className="w-2 h-2 bg-[#4ECDC4] rounded-full animate-pulse" />}
                      </DropdownMenuItem>)}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 cursor-pointer text-[#1E5799] hover:bg-[#7DB9E8]/10 rounded-lg mx-1 mb-1" onClick={() => navigate('/add-pet')}>
                    <div className="w-9 h-9 bg-gradient-to-br from-[#1E5799]/10 to-[#4ECDC4]/20 rounded-full flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </div>
                    <span className="text-[14px] font-medium">הוסף חיית מחמד</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>}
            <motion.button whileHover={{
            scale: 1.1
          }} whileTap={{
            scale: 0.9
          }} onClick={handleNavigateToNotifications} className="active:opacity-50 transition-opacity relative p-1">
              <Heart className="w-6 h-6 text-[#262626] hover:text-[#4ECDC4] transition-colors" strokeWidth={1.5} />
            </motion.button>
            <motion.button whileHover={{
            scale: 1.1
          }} whileTap={{
            scale: 0.9
          }} onClick={handleNavigateToMessages} className="active:opacity-50 transition-opacity p-1">
              <Send className="w-6 h-6 text-[#262626] hover:text-[#1E5799] transition-colors" strokeWidth={1.5} />
            </motion.button>
            
            {/* Cart Icon - appears when items added */}
            <AnimatePresence>
              {getTotalItems() > 0 && <motion.button ref={cartIconRef} initial={{
              scale: 0,
              opacity: 0
            }} animate={{
              scale: 1,
              opacity: 1
            }} exit={{
              scale: 0,
              opacity: 0
            }} transition={{
              type: "spring",
              stiffness: 400,
              damping: 15
            }} whileHover={{
              scale: 1.1
            }} whileTap={{
              scale: 0.9
            }} onClick={() => navigate('/cart')} className={`active:opacity-50 transition-opacity p-1 relative ${cartShake ? 'animate-[wiggle_0.3s_ease-in-out]' : ''}`} onAnimationComplete={() => {
              if (cartIconRef.current) {
                const rect = cartIconRef.current.getBoundingClientRect();
                setCartIconPosition(rect.left + rect.width / 2, rect.top + rect.height / 2);
              }
            }}>
                  <ShoppingCart className="w-6 h-6 text-[#1E5799]" strokeWidth={1.5} />
                  <motion.span className="absolute -top-1 -right-1 bg-gradient-to-r from-[#1E5799] to-[#4ECDC4] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center" initial={{
                scale: 0
              }} animate={{
                scale: 1
              }} transition={{
                type: "spring",
                stiffness: 500
              }}>
                    {getTotalItems()}
                  </motion.span>
                </motion.button>}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Spacer for fixed header */}
      <div className="h-[56px]" />

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
      }} className="fixed top-[52px] left-0 right-0 z-40 bg-gradient-to-r from-[#1E5799] to-[#4ECDC4] text-white text-center cursor-pointer py-2.5 shadow-md" onClick={handleLoadNewPosts}>
            <span className="text-[13px] font-medium flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              פוסטים חדשים
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
        {/* Rewards Bar */}
        <motion.div initial={{
        opacity: 0,
        y: -10
      }} animate={{
        opacity: 1,
        y: 0
      }} className="mx-4 py-4 mb-2 cursor-pointer" onClick={() => navigate('/rewards')}>
          {/* Amount */}
          <div className="flex justify-end mb-3">
            <div className="text-right">
              
              
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center gap-3 mb-2" dir="rtl">
            <span className="text-gray-400 text-sm">קאשבק 5%</span>
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full" style={{
              backgroundColor: '#FBBF24'
            }} initial={{
              width: 0
            }} animate={{
              width: `${Math.min(totalPoints * 0.01 / 50 * 100, 100)}%`
            }} transition={{
              duration: 0.8,
              ease: "easeOut"
            }} />
            </div>
            <span className="text-foreground text-sm font-semibold">₪50</span>
          </div>
          
          {/* Points Progress Bar */}
          <div className="flex items-center gap-3 mb-2" dir="rtl">
            <span className="text-gray-400 text-sm">נקודות פעילות</span>
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full" style={{
              backgroundColor: '#4ECDC4'
            }} initial={{
              width: 0
            }} animate={{
              width: `${Math.min(totalPoints / 1000 * 100, 100)}%`
            }} transition={{
              duration: 0.8,
              ease: "easeOut"
            }} />
            </div>
            <span className="text-foreground text-sm font-semibold">1000</span>
          </div>
          
          {/* Bottom Text */}
          
        </motion.div>

        <div data-pets-section className="py-5 bg-gradient-to-br from-white via-[#4ECDC4]/5 to-[#1E5799]/5 border-b border-[#4ECDC4]/10">
          <div className="max-w-lg mx-auto">
            <h2 className="text-[15px] font-bold text-slate-800 px-4 mb-4 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#4ECDC4] to-[#1E5799] flex items-center justify-center shadow-md">
                <PawPrint className="w-4 h-4 text-white" />
              </div>
              חיות המחמד שלי
            </h2>
            <MyPetsSection pets={pets} newlyAddedPetIds={newlyAddedPetIds} onPetLongPressStart={handlePetLongPressStart} onPetLongPressEnd={handlePetLongPressEnd} />
          </div>
        </div>

        {/* Business Directory Quick Access */}
        
      </motion.div>}

      {/* Stories Bar */}
      <motion.div initial={{
      opacity: 0,
      y: 10
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: 0.2,
      duration: 0.4
    }} className="bg-white">
        <StoriesBar />
      </motion.div>


      {/* Feed */}
      <div className="max-w-lg mx-auto">
        {loading ?
      // Enhanced Instagram-style Loading skeleton
      <div className="space-y-0">
            {[...Array(3)].map((_, i) => <motion.div key={i} initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: i * 0.1,
          duration: 0.3
        }} className="bg-white border-b border-gray-100">
                <div className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2 w-16" />
                  </div>
                </div>
                <Skeleton className="w-full aspect-square" />
                <div className="px-4 py-3 space-y-3">
                  <div className="flex gap-4">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <Skeleton className="h-7 w-7 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </motion.div>)}
          </div> : mixedFeed.length === 0 ?
      // Enhanced Empty state
      <motion.div initial={{
        opacity: 0,
        scale: 0.95
      }} animate={{
        opacity: 1,
        scale: 1
      }} transition={{
        duration: 0.4
      }} className="text-center py-20 px-6">
            <motion.div initial={{
          scale: 0
        }} animate={{
          scale: 1
        }} transition={{
          delay: 0.2,
          type: "spring",
          stiffness: 200
        }} className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Camera className="w-12 h-12 text-gray-300" strokeWidth={1.5} />
            </motion.div>
            <h3 className="text-[24px] font-bold text-[#262626] mb-2">
              {feedFilter === "following" ? "אין פוסטים" : "שתף תמונות"}
            </h3>
            <p className="text-[#8E8E8E] text-[15px] mb-6 max-w-xs mx-auto">
              {feedFilter === "following" ? "עקוב אחרי אנשים כדי לראות תמונות" : "כשתשתף תמונות, הן יופיעו בפרופיל שלך"}
            </p>
            <motion.button whileHover={{
          scale: 1.05
        }} whileTap={{
          scale: 0.95
        }} onClick={handleCreatePost} className="text-[#0095F6] font-semibold text-[15px] px-6 py-2.5 rounded-full bg-[#0095F6]/10 hover:bg-[#0095F6]/20 transition-colors">
              שתף את התמונה הראשונה שלך
            </motion.button>
          </motion.div> : <div className="space-y-0">
            {mixedFeed.map((item, index) => {
          if (item.type === 'post') {
            return <motion.div key={`post-${item.data.id}`} initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: Math.min(index * 0.05, 0.3),
              duration: 0.3
            }}>
                    <PostCardErrorBoundary>
                      <PostCard post={item.data} currentUserId={user?.id} currentUserAvatar={userAvatar} onLike={handleLike} onSave={handleSave} onDoubleTap={handleDoubleTap} onComment={handleComment} showDoubleTapAnimation={doubleTapLike === item.data.id} getTimeAgo={getTimeAgo} />
                    </PostCardErrorBoundary>
                  </motion.div>;
          } else if (item.type === 'adoption') {
            return <motion.div key={`adoption-${item.data.id}`} initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: Math.min(index * 0.05, 0.3),
              duration: 0.3
            }}>
                    <AdoptionPostCard pet={item.data} getTimeAgo={getTimeAgo} />
                  </motion.div>;
          } else if (item.type === 'product') {
            return <motion.div key={`product-${item.data.id}`} initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: Math.min(index * 0.05, 0.3),
              duration: 0.3
            }}>
                    <ProductPostCard product={item.data} />
                  </motion.div>;
          } else if (item.type === 'ad') {
            return <motion.div key={`ad-${item.data.id}`} initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: Math.min(index * 0.05, 0.3),
              duration: 0.3
            }}>
                    <AdPostCard ad={item.data} />
                  </motion.div>;
          } else if (item.type === 'suggested') {
            return <motion.div key={`suggested-${item.data.id}`} initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: Math.min(index * 0.05, 0.3),
              duration: 0.3
            }}>
                    <SuggestedPostCard post={item.data} onFollow={handleSuggestedFollow} />
                  </motion.div>;
          }
          return null;
        })}
            
            {/* Infinite Scroll Observer Target */}
            {hasMore && <div ref={observerTarget} className="py-6 text-center">
                {loadingMore && <motion.div initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-[#8E8E8E]" />
                    <span className="text-[13px] text-[#8E8E8E]">טוען עוד...</span>
                  </motion.div>}
              </div>}
          </div>}
      </div>

      {/* End of Feed */}
      {!loading && !hasMore && mixedFeed.length > 0 && <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} className="text-center py-8 border-t border-gray-100 bg-gradient-to-b from-transparent to-gray-50/50">
          <div className="flex items-center justify-center gap-2 text-[#8E8E8E]">
            <div className="w-8 h-px bg-gray-200" />
            <span className="text-[13px]">סיימת לראות הכל</span>
            <div className="w-8 h-px bg-gray-200" />
          </div>
        </motion.div>}

      <CreatePostDialog open={createPostOpen} onOpenChange={setCreatePostOpen} onPostCreated={() => {
      setPage(0);
      setHasMore(true);
      fetchPosts(0, false);
    }} />

      {/* Pet Edit Sheet */}
      <PetEditSheet pet={editingPet} isOpen={isEditSheetOpen} onClose={handleCloseEditSheet} editFormData={editFormData} onFormDataChange={setEditFormData} onSave={handleSavePetEdit} onDelete={handleArchivePet} showDeleteConfirm={showDeleteConfirm} onDeleteConfirmChange={setShowDeleteConfirm} onAvatarUpdate={handlePetAvatarUpdate} />

      {/* Hamburger Menu */}
      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <BottomNav />
    </div>;
};
export default Feed;