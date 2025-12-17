import { Heart, MessageCircle, Share2, Bookmark, Camera, Plus, TrendingUp, Loader2, Send, PawPrint, ChevronDown, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

const Feed = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { checkAuth, isAuthenticated } = useRequireAuth();
  const [posts, setPosts] = useState<Post[]>([]);
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
  const [editFormData, setEditFormData] = useState({ name: "", breed: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  const POSTS_PER_PAGE = 10;

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
        const { data: followingData } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", user.id);
        
        const ids = followingData?.map(f => f.following_id) || [];
        setFollowingIds(ids);
      }

      // Fetch posts with user profiles - specify exact relationship
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!posts_user_id_fkey_profiles (
            id,
            full_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false })
        .range(pageNum * POSTS_PER_PAGE, (pageNum + 1) * POSTS_PER_PAGE - 1);

      if (postsError) throw postsError;

      // Check if we have more posts
      if (!postsData || postsData.length < POSTS_PER_PAGE) {
        setHasMore(false);
      }

      if (postsData && postsData.length > 0) {
        const postIds = postsData.map(p => p.id);

        // Batch fetch likes
        const { data: likesData } = await supabase
          .from("post_likes")
          .select("post_id")
          .in("post_id", postIds);

        // Batch fetch comments
        const { data: commentsData } = await supabase
          .from("post_comments")
          .select("post_id")
          .in("post_id", postIds);

        // Fetch user's likes and saves if authenticated
        let userLikes: string[] = [];
        let userSaves: string[] = [];
        
        if (user) {
          const { data: userLikesData } = await supabase
            .from("post_likes")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", postIds);
          
          userLikes = userLikesData?.map(l => l.post_id) || [];
          
          const { data: userSavesData } = await supabase
            .from("saved_posts")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", postIds);
          
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
              avatar_url: profile?.avatar_url || "",
            },
            likes_count: likesCount[post.id] || 0,
            comments_count: commentsCount[post.id] || 0,
            is_liked: userLikes.includes(post.id),
            is_saved: userSaves.includes(post.id),
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
        const { data: profileData } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .single();
        if (profileData?.avatar_url) {
          setUserAvatar(profileData.avatar_url);
        }

        // Fetch pets
        const { data: petsData, error: petsError } = await supabase
          .from("pets")
          .select("*")
          .eq("user_id", user.id)
          .eq("archived", false)
          .order("created_at", { ascending: false });

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
    setEditFormData({ name: pet.name || "", breed: pet.breed || "" });
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
      const { error } = await supabase
        .from("pets")
        .update({
          name: editFormData.name,
          breed: editFormData.breed,
        })
        .eq("id", editingPet.id);

      if (error) throw error;

      setPets(prev => prev.map(p => p.id === editingPet.id ? { ...p, name: editFormData.name, breed: editFormData.breed } : p));
      toast.success("פרטי חיית המחמד עודכנו בהצלחה");
      handleCloseEditSheet();
    } catch (error) {
      console.error("Error updating pet:", error);
      toast.error("שגיאה בעדכון פרטי חיית המחמד");
    }
  };

  const handleArchivePet = async () => {
    if (!editingPet) return;
    try {
      const { error } = await supabase
        .from("pets")
        .update({ archived: true, archived_at: new Date().toISOString() })
        .eq("id", editingPet.id);

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

    // Setup realtime subscription for new posts
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    
    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        () => {
          setNewPostsAvailable(true);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchPosts]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore && posts.length > 0) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchPosts(nextPage, true);
        }
      },
      { threshold: 0.5 }
    );

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

    let previousState: { is_liked: boolean; likes_count: number } | null = null;

    // Optimistic update using functional setState
    setPosts(prevPosts => {
      const post = prevPosts.find(p => p.id === postId);
      if (!post) return prevPosts;
      
      // Store previous state for potential revert
      previousState = {
        is_liked: post.is_liked,
        likes_count: post.likes_count,
      };

      return prevPosts.map(p =>
        p.id === postId
          ? { 
              ...p, 
              is_liked: !p.is_liked, 
              likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 
            }
          : p
      );
    });

    try {
      if (previousState?.is_liked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("post_likes")
          .insert({ post_id: postId, user_id: user.id });
      }
    } catch (error: any) {
      // Revert on error using functional setState
      if (previousState) {
        setPosts(prevPosts =>
          prevPosts.map(p =>
            p.id === postId
              ? { ...p, is_liked: previousState!.is_liked, likes_count: previousState!.likes_count }
              : p
          )
        );
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

      return prevPosts.map(p =>
        p.id === postId ? { ...p, is_saved: !p.is_saved } : p
      );
    });

    try {
      if (previousIsSaved) {
        await supabase
          .from("saved_posts")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        toast.success("הפוסט הוסר מהשמורים");
      } else {
        await supabase
          .from("saved_posts")
          .insert({ post_id: postId, user_id: user.id });
        toast.success("הפוסט נשמר בהצלחה");
      }
    } catch (error: any) {
      // Revert on error using functional setState
      if (previousIsSaved !== null) {
        setPosts(prevPosts =>
          prevPosts.map(p =>
            p.id === postId ? { ...p, is_saved: previousIsSaved! } : p
          )
        );
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
      await supabase
        .from("post_comments")
        .insert({ post_id: postId, user_id: user.id, comment_text: comment });
      
      // Update comment count optimistically
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
        )
      );
      
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

  // Filter posts based on feed filter
  const filteredPosts = useMemo(() => {
    if (feedFilter === "following") {
      return posts.filter(post => followingIds.includes(post.user_id));
    }
    return posts;
  }, [posts, feedFilter, followingIds]);

  return (
    <div className="min-h-screen bg-white pb-14" dir="rtl">
      {/* Instagram-style Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-[44px] flex items-center justify-between">
          {/* Left side - Hamburger menu */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="active:opacity-50 transition-opacity"
              aria-label="פתח תפריט"
            >
              <Menu className="w-6 h-6 text-[#262626] hover:text-[#8E8E8E] transition-colors" strokeWidth={1.5} />
            </button>
            {/* Logo with Instagram gradient */}
            <h1 
              className="text-[24px] font-semibold cursor-pointer bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] bg-clip-text text-transparent"
              style={{ fontFamily: "'Billabong', cursive, -apple-system, BlinkMacSystemFont, sans-serif" }}
              onClick={() => {
                setPage(0);
                setHasMore(true);
                fetchPosts(0, false);
              }}
            >
              Petish
            </h1>
          </div>
          
          {/* Right icons with Instagram colors */}
          <div className="flex items-center gap-5">
            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`active:opacity-50 transition-opacity relative flex items-center gap-0.5 ${newlyAddedPetIds.size > 0 ? 'animate-pulse' : ''}`}
                  >
                    <PawPrint 
                      className={`w-6 h-6 transition-colors ${newlyAddedPetIds.size > 0 ? 'text-[#F58529]' : 'text-[#262626] hover:text-[#F58529]'}`} 
                      strokeWidth={1.5} 
                    />
                    {pets.length > 0 && (
                      <span className={`absolute -top-1 -right-1 w-4 h-4 bg-[#F58529] text-white text-[10px] font-bold rounded-full flex items-center justify-center ${newlyAddedPetIds.size > 0 ? 'animate-bounce' : ''}`}>
                        {pets.length}
                      </span>
                    )}
                    <ChevronDown className="w-3 h-3 text-[#8E8E8E]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white z-50">
                  <div className="px-3 py-2 text-[13px] font-semibold text-[#262626]">
                    חיות המחמד שלי
                  </div>
                  <DropdownMenuSeparator />
                  {pets.length === 0 ? (
                    <div className="px-3 py-4 text-center text-[13px] text-[#8E8E8E]">
                      אין חיות מחמד עדיין
                    </div>
                  ) : (
                    pets.map((pet) => (
                      <DropdownMenuItem 
                        key={pet.id} 
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                        onClick={() => navigate(`/pet/${pet.id}`)}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={pet.avatar_url} alt={pet.name} />
                          <AvatarFallback className="bg-[#FAFAFA] text-[11px]">
                            {pet.name?.charAt(0) || '🐾'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-[14px] font-medium text-[#262626]">{pet.name}</p>
                          <p className="text-[11px] text-[#8E8E8E]">{pet.breed || pet.type}</p>
                        </div>
                        {newlyAddedPetIds.has(pet.id) && (
                          <span className="w-2 h-2 bg-[#F58529] rounded-full animate-pulse" />
                        )}
                      </DropdownMenuItem>
                    ))
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer text-[#0095F6]"
                    onClick={() => navigate('/add-pet')}
                  >
                    <div className="w-8 h-8 bg-[#FAFAFA] rounded-full flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </div>
                    <span className="text-[14px] font-medium">הוסף חיית מחמד</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <button
              onClick={handleNavigateToNotifications}
              className="active:opacity-50 transition-opacity relative"
            >
              <Heart className="w-6 h-6 text-[#262626] hover:text-[#ED4956] transition-colors" strokeWidth={1.5} />
            </button>
            <button
              onClick={handleNavigateToMessages}
              className="active:opacity-50 transition-opacity"
            >
              <Send className="w-6 h-6 text-[#262626] hover:text-[#0095F6] transition-colors" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-[44px]" />

      {/* New Posts Banner */}
      <AnimatePresence>
        {newPostsAvailable && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-11 left-0 right-0 z-40 bg-[#0095F6] text-white text-center cursor-pointer py-2"
            onClick={handleLoadNewPosts}
          >
            <span className="text-[13px] font-medium">פוסטים חדשים</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stories Bar */}
      <div className="border-b border-gray-200">
        <StoriesBar />
      </div>

      {/* My Pets Section */}
      {isAuthenticated && (
        <div data-pets-section className="py-4 border-b border-gray-200">
          <div className="max-w-lg mx-auto">
            <h2 className="text-[14px] font-semibold text-[#262626] px-4 mb-3">חיות המחמד שלי</h2>
            <MyPetsSection
              pets={pets}
              newlyAddedPetIds={newlyAddedPetIds}
              onPetLongPressStart={handlePetLongPressStart}
              onPetLongPressEnd={handlePetLongPressEnd}
            />
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-11 z-30">
        <div className="max-w-lg mx-auto flex">
          <button
            onClick={() => setFeedFilter("all")}
            className={`flex-1 py-3 text-[13px] font-semibold border-b-2 transition-colors ${
              feedFilter === "all"
                ? "border-[#262626] text-[#262626]"
                : "border-transparent text-[#8E8E8E]"
            }`}
          >
            הכל
          </button>
          <button
            onClick={handleFollowingFilter}
            className={`flex-1 py-3 text-[13px] font-semibold border-b-2 transition-colors ${
              feedFilter === "following"
                ? "border-[#262626] text-[#262626]"
                : "border-transparent text-[#8E8E8E]"
            }`}
          >
            עוקבים
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-lg mx-auto">
        {loading ? (
          // Instagram-style Loading skeleton
          <div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border-b border-gray-200">
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="w-full aspect-square" />
                <div className="px-3 py-2 space-y-2">
                  <div className="flex gap-4">
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-6 w-6 rounded" />
                  </div>
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          // Empty state
          <div className="text-center py-16 px-6">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-10 h-10 text-gray-400" strokeWidth={1.5} />
            </div>
            <h3 className="text-[22px] font-semibold text-[#262626] mb-1">
              {feedFilter === "following" ? "אין פוסטים" : "שתף תמונות"}
            </h3>
            <p className="text-[#8E8E8E] text-[14px] mb-5">
              {feedFilter === "following" 
                ? "עקוב אחרי אנשים כדי לראות תמונות"
                : "כשתשתף תמונות, הן יופיעו בפרופיל שלך"}
            </p>
            <button
              onClick={handleCreatePost}
              className="text-[#0095F6] font-semibold text-[14px]"
            >
              שתף את התמונה הראשונה שלך
            </button>
          </div>
        ) : (
          <div>
            {filteredPosts.map((post) => (
              <PostCardErrorBoundary key={post.id}>
                <PostCard
                  post={post}
                  currentUserId={user?.id}
                  currentUserAvatar={userAvatar}
                  onLike={handleLike}
                  onSave={handleSave}
                  onDoubleTap={handleDoubleTap}
                  onComment={handleComment}
                  showDoubleTapAnimation={doubleTapLike === post.id}
                  getTimeAgo={getTimeAgo}
                />
              </PostCardErrorBoundary>
            ))}
            
            {/* Infinite Scroll Observer Target */}
            {hasMore && (
              <div ref={observerTarget} className="py-4 text-center">
                {loadingMore && (
                  <Loader2 className="w-5 h-5 animate-spin text-[#8E8E8E] mx-auto" />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* End of Feed */}
      {!loading && !hasMore && filteredPosts.length > 0 && (
        <div className="text-center py-6 border-t border-gray-200">
          <p className="text-[#8E8E8E] text-[13px]">סיימת לראות הכל</p>
        </div>
      )}

      <CreatePostDialog
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        onPostCreated={() => {
          setPage(0);
          setHasMore(true);
          fetchPosts(0, false);
        }}
      />

      {/* Pet Edit Sheet */}
      <PetEditSheet
        pet={editingPet}
        isOpen={isEditSheetOpen}
        onClose={handleCloseEditSheet}
        editFormData={editFormData}
        onFormDataChange={setEditFormData}
        onSave={handleSavePetEdit}
        onDelete={handleArchivePet}
        showDeleteConfirm={showDeleteConfirm}
        onDeleteConfirmChange={setShowDeleteConfirm}
      />

      {/* Hamburger Menu */}
      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <BottomNav />
    </div>
  );
};

export default Feed;
