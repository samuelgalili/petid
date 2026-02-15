import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  post_type?: "regular" | "product" | "challenge" | "cta";
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

// Health-keyword scoring for OCR-driven ranking
const HEALTH_RANK_KEYWORDS: Record<string, string[]> = {
  "סוכרת": ["סוכרת", "diabetic", "diabetes", "insulin", "סוכר בדם"],
  "כליות": ["כליות", "renal", "kidney", "חלבון מופחת"],
  "אלרגיה": ["אלרגיה", "allergy", "היפואלרגני", "hypoallergenic", "רגישות"],
  "עיכול": ["עיכול", "digestive", "gastro", "פרוביוטיקה"],
  "עור": ["עור", "skin", "derma", "אומגה", "omega", "פרווה"],
  "משקל": ["משקל", "weight", "דיאטה", "diet", "obesity"],
  "מפרקים": ["מפרקים", "joint", "mobility", "glucosamine"],
  "לב": ["לב", "cardiac", "heart", "taurine"],
};

function scorePostForPet(
  caption: string | null,
  petType: string | null,
  breed: string | null,
  ageWeeks: number | null,
  conditions: string[]
): number {
  if (!caption) return 0;
  const lower = caption.toLowerCase();
  let score = 0;

  // Species match
  if (petType === "dog" && (lower.includes("כלב") || lower.includes("dog"))) score += 5;
  if (petType === "cat" && (lower.includes("חתול") || lower.includes("cat"))) score += 5;

  // Breed match
  if (breed && lower.includes(breed.toLowerCase())) score += 15;

  // Age match
  if (ageWeeks !== null) {
    if (ageWeeks < 26 && (lower.includes("גור") || lower.includes("puppy"))) score += 10;
    if (ageWeeks > 364 && (lower.includes("מבוגר") || lower.includes("senior"))) score += 10;
  }

  // Medical condition match (strongest signal)
  for (const cond of conditions) {
    const condLower = cond.toLowerCase();
    for (const [key, keywords] of Object.entries(HEALTH_RANK_KEYWORDS)) {
      if (condLower.includes(key)) {
        for (const kw of keywords) {
          if (lower.includes(kw)) { score += 20; break; }
        }
      }
    }
  }

  return score;
}

export function useSoundtrackFeed() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { pet: activePet } = useActivePet();
  const [activeTab, setActiveTab] = useState<"discover" | "following">("discover");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [newPostCount, setNewPostCount] = useState(0);

  const fetchPostsInner = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let postsQuery = supabase
        .from("posts")
        .select("id, user_id, image_url, media_urls, video_url, caption, created_at, music_url, music_title, music_artist")
        .order("created_at", { ascending: false })
        .limit(20);

      if (activeTab === "following" && user) {
        const { data: following } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", user.id);

        const followingIds = following?.map((f) => f.following_id) || [];
        if (followingIds.length > 0) {
          postsQuery = postsQuery.in("user_id", followingIds);
        }
      }

      const { data: postsData, error: fetchError } = await postsQuery;
      if (fetchError) throw fetchError;

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }

      const userIds = [...new Set(postsData.map((p) => p.user_id))];
      const postIds = postsData.map((p) => p.id);

      // Parallel fetches
      const [profilesRes, likesCountRes, commentsCountRes, ...userDataRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds),
        supabase.from("post_likes").select("post_id").in("post_id", postIds),
        supabase.from("post_comments").select("post_id").in("post_id", postIds),
        ...(user
          ? [
              supabase.from("post_likes").select("post_id").eq("user_id", user.id),
              supabase.from("saved_posts").select("post_id").eq("user_id", user.id),
              supabase.from("user_follows").select("following_id").eq("follower_id", user.id),
            ]
          : []),
      ]);

      const profiles = profilesRes.data || [];

      const likesMap: Record<string, number> = {};
      likesCountRes.data?.forEach((l) => {
        likesMap[l.post_id] = (likesMap[l.post_id] || 0) + 1;
      });
      const commentsMap: Record<string, number> = {};
      commentsCountRes.data?.forEach((c) => {
        commentsMap[c.post_id] = (commentsMap[c.post_id] || 0) + 1;
      });

      const likedPostIds = user ? userDataRes[0]?.data?.map((l: any) => l.post_id) || [] : [];
      const savedPostIds = user ? userDataRes[1]?.data?.map((s: any) => s.post_id) || [] : [];
      const followingIds = user ? userDataRes[2]?.data?.map((f: any) => f.following_id) || [] : [];

      const enrichedPosts: FeedPost[] = postsData.map((post) => {
        const mediaUrls = post.media_urls as string[] | null;
        const hasVideo = !!post.video_url;
        const hasMultipleImages = mediaUrls && mediaUrls.length > 1;

        let mediaType: "image" | "gallery" | "video" = "image";
        if (hasVideo) mediaType = "video";
        else if (hasMultipleImages) mediaType = "gallery";

        return {
          id: post.id,
          user_id: post.user_id,
          image_url: post.image_url,
          media_urls: mediaUrls,
          video_url: post.video_url,
          caption: post.caption,
          created_at: post.created_at,
          likes_count: likesMap[post.id] || 0,
          comments_count: commentsMap[post.id] || 0,
          user_profile: profiles.find((p) => p.id === post.user_id) || undefined,
          is_liked: likedPostIds.includes(post.id),
          is_saved: savedPostIds.includes(post.id),
          is_following: followingIds.includes(post.user_id),
          recommendation_reason: activeTab === "discover" ? "בשבילך" : undefined,
          media_type: mediaType,
        };
      });

      // OCR-driven health-aware ranking: boost posts matching pet's conditions
      const petConditions = [...(activePet?.medical_conditions || [])];
      if (activeTab === "discover" && petConditions.length > 0) {
        enrichedPosts.sort((a, b) => {
          const scoreA = scorePostForPet(a.caption, activePet?.pet_type || null, activePet?.breed || null, activePet?.ageWeeks ?? null, petConditions);
          const scoreB = scorePostForPet(b.caption, activePet?.pet_type || null, activePet?.breed || null, activePet?.ageWeeks ?? null, petConditions);
          if (scoreA !== scoreB) return scoreB - scoreA;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      }

      // Insert promo posts at configured positions
      const allPosts = [...enrichedPosts];
      const sortedPromos = [...PROMO_POSTS].sort((a, b) => a.insertAt - b.insertAt);
      for (const promo of sortedPromos) {
        const promoPost: FeedPost = {
          ...promo,
          created_at: new Date().toISOString(),
          is_liked: false,
          is_saved: false,
          is_following: false,
        };
        if (allPosts.length > promo.insertAt) {
          allPosts.splice(promo.insertAt, 0, promoPost);
        } else {
          allPosts.push(promoPost);
        }
      }

      setPosts(allPosts);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError("שגיאה בטעינת הפיד. נסו שוב.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, user]);

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

  // Realtime listener for new posts
  useEffect(() => {
    const channel = supabase
      .channel("feed-new-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => {
        setNewPostCount((c) => c + 1);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, is_liked: !wasLiked, likes_count: p.likes_count + (wasLiked ? -1 : 1) }
          : p
      )
    );

    try {
      if (wasLiked) {
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
      }
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, is_liked: wasLiked, likes_count: p.likes_count + (wasLiked ? 1 : -1) }
            : p
        )
      );
    }
  };

  const handleSave = async (postId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const wasSaved = post.is_saved;

    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, is_saved: !wasSaved } : p)));

    try {
      if (wasSaved) {
        await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("saved_posts").insert({ post_id: postId, user_id: user.id });
      }
      toast.success(wasSaved ? "הוסר מהשמורים" : "נשמר!");
    } catch {
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, is_saved: wasSaved } : p)));
    }
  };

  const handleFollow = async (userId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const isFollowing = posts.find((p) => p.user_id === userId)?.is_following;

    setPosts((prev) =>
      prev.map((p) => (p.user_id === userId ? { ...p, is_following: !isFollowing } : p))
    );

    try {
      if (isFollowing) {
        await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", userId);
      } else {
        await supabase
          .from("user_follows")
          .insert({ follower_id: user.id, following_id: userId });
      }
    } catch {
      setPosts((prev) =>
        prev.map((p) => (p.user_id === userId ? { ...p, is_following: isFollowing } : p))
      );
    }
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
    setActiveTab,
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
