import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { toast } from "sonner";
import { PROMO_POSTS } from "@/data/promoPostsConfig";
import { useActivePet } from "@/hooks/useActivePet";

export interface FeedPost {
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
  media_type?: "image" | "gallery" | "video";
  post_type?: "regular" | "product" | "challenge" | "cta" | "lost_pet";
  is_pinned?: boolean;
  product_id?: string;
  product_name?: string;
  product_price?: number;
  challenge_id?: string;
  challenge_title?: string;
  cta_link?: string;
  cta_text?: string;
  product_weight?: string;
  product_sizes?: string[];
  product_colors?: string[];
  music_url?: string | null;
  music_title?: string | null;
  music_artist?: string | null;
}

export function useSoundtrackFeed() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pet: activePet } = useActivePet();
  const [activeTab, setActiveTab] = useState<"discover" | "following">("discover");
  const [discoverPosts, setDiscoverPosts] = useState<FeedPost[]>([]);
  const [followingPosts, setFollowingPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [newPostCount, setNewPostCount] = useState(0);

  // Separate scroll positions per feed
  const scrollPositions = useRef<{ discover: number; following: number }>({
    discover: 0,
    following: 0,
  });

  // Save scroll position before switching tabs
  const handleSetActiveTab = useCallback((tab: "discover" | "following") => {
    if (containerRef.current) {
      scrollPositions.current[activeTab] = containerRef.current.scrollTop;
    }
    setActiveTab(tab);
  }, [activeTab]);

  // Restore scroll position after tab switch
  useEffect(() => {
    if (containerRef.current) {
      requestAnimationFrame(() => {
        containerRef.current?.scrollTo({
          top: scrollPositions.current[activeTab],
          behavior: "instant" as ScrollBehavior,
        });
      });
    }
  }, [activeTab]);

  const posts = activeTab === "discover" ? discoverPosts : followingPosts;

  const fetchPostsInner = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const petReason = activePet?.name ? `מתאים ל${activePet.name}` : "בשבילך";
      const promoPosts: FeedPost[] = PROMO_POSTS.map((promo, index) => ({
        ...promo,
        created_at: now,
        is_liked: false,
        is_saved: false,
        is_following: false,
        recommendation_reason: index === 0 ? petReason : "מומלץ",
      }));

      setDiscoverPosts(promoPosts);
      setFollowingPosts([]);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError("שגיאה בטעינת הפיד. נסו שוב.");
    } finally {
      setLoading(false);
    }
  }, [activePet]);

  // Pull-to-refresh
  const {
    pullDistance,
    isRefreshing,
    progress,
    shouldTrigger,
    handlers: pullHandlers,
  } = usePullToRefresh({ onRefresh: fetchPostsInner });

  useEffect(() => {
    fetchPostsInner();
  }, [fetchPostsInner]);

  const handleNewPostTap = () => {
    setNewPostCount(0);
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    fetchPostsInner();
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const wasLiked = post.is_liked;

    const updater = (prev: FeedPost[]) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, is_liked: !wasLiked, likes_count: p.likes_count + (wasLiked ? -1 : 1) }
          : p
      );

    setDiscoverPosts(updater);
    setFollowingPosts(updater);

    toast.success(wasLiked ? "הוסר הלייק" : "אהבת!");
  };



  const handleSave = async (postId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const wasSaved = post.is_saved;

    const updater = (prev: FeedPost[]) =>
      prev.map((p) => (p.id === postId ? { ...p, is_saved: !wasSaved } : p));
    setDiscoverPosts(updater);
    setFollowingPosts(updater);

    toast.success(wasSaved ? "הוסר מהשמורים" : "נשמר!");
  };

  const handleFollow = async (targetUserId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const isFollowing = posts.find((p) => p.user_id === targetUserId)?.is_following;

    const updater = (prev: FeedPost[]) =>
      prev.map((p) => (p.user_id === targetUserId ? { ...p, is_following: !isFollowing } : p));
    setDiscoverPosts(updater);
    setFollowingPosts(updater);

    toast.success(isFollowing ? "הוסרה העקיבה" : "נוספה עקיבה");
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const cardHeight = window.innerHeight - 56 - 70;
    const newIndex = Math.round(scrollTop / cardHeight);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  return {
    posts,
    loading,
    error,
    activeTab,
    setActiveTab: handleSetActiveTab,
    currentIndex,
    muted,
    setMuted,
    containerRef,
    newPostCount,
    pullDistance,
    isRefreshing,
    progress,
    shouldTrigger,
    pullHandlers,
    handleNewPostTap,
    handleLike,
    handleSave,
    handleFollow,
    handleScroll,
    fetchPosts: fetchPostsInner,
    userId: user?.id,
  };
}
