import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Heart, MessageCircle, Grid3x3, Plus, MoreHorizontal, 
  Bookmark, Video, UserSquare2, PawPrint, Award, Sparkles, 
  Share2, ShieldCheck, Crown, Star, ChevronDown
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNav from "@/components/BottomNav";
import { FollowersDialog } from "@/components/FollowersDialog";
import { HighlightsSection } from "@/components/HighlightsSection";
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  email: string;
  bio: string | null;
  points: number;
}

interface Post {
  id: string;
  image_url: string;
  media_urls: string[];
  caption: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

interface FollowStats {
  followers: number;
  following: number;
}

interface Pet {
  id: string;
  name: string;
  type: string;
  breed: string;
  avatar_url: string;
  birth_date: string;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [followStats, setFollowStats] = useState<FollowStats>({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false);
  const [followersDialogTab, setFollowersDialogTab] = useState<"followers" | "following">("followers");
  const [activeTab, setActiveTab] = useState<"posts" | "pets" | "saved" | "tagged">("posts");

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (!userId) return;
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    setLoading(true);
    
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (postsData) {
      const mappedPosts = await Promise.all(postsData.map(async (post: any) => {
        const { count: likesCount } = await supabase
          .from("post_likes")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);

        const { count: commentsCount } = await supabase
          .from("post_comments")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);
        
        return {
          id: post.id,
          image_url: post.image_url,
          media_urls: post.media_urls || [],
          caption: post.caption,
          created_at: post.created_at,
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
        };
      }));
      setPosts(mappedPosts);
    }

    if (isOwnProfile && user) {
      const { data: savedPostsData } = await supabase
        .from("saved_posts")
        .select("post_id")
        .eq("user_id", user.id);

      if (savedPostsData && savedPostsData.length > 0) {
        const postIds = savedPostsData.map((sp) => sp.post_id);
        const { data: savedPostsFullData } = await supabase
          .from("posts")
          .select("*")
          .in("id", postIds)
          .order("created_at", { ascending: false });

        if (savedPostsFullData) {
          const savedPostsWithCounts = await Promise.all(
            savedPostsFullData.map(async (post) => {
              const { count: likesCount } = await supabase
                .from("post_likes")
                .select("*", { count: "exact", head: true })
                .eq("post_id", post.id);

              const { count: commentsCount } = await supabase
                .from("post_comments")
                .select("*", { count: "exact", head: true })
                .eq("post_id", post.id);

              return {
                id: post.id,
                image_url: post.image_url,
                media_urls: post.media_urls || [],
                caption: post.caption,
                created_at: post.created_at,
                likes_count: likesCount || 0,
                comments_count: commentsCount || 0,
              };
            })
          );
          setSavedPosts(savedPostsWithCounts);
        }
      }
    }

    const { data: petsData } = await supabase
      .from("pets")
      .select("*")
      .eq("user_id", userId)
      .eq("archived", false)
      .order("created_at", { ascending: false });

    if (petsData) {
      setPets(petsData);
    }

    const { count: followersCount } = await supabase
      .from("user_follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId);

    const { count: followingCount } = await supabase
      .from("user_follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId);

    setFollowStats({
      followers: followersCount || 0,
      following: followingCount || 0,
    });

    if (user && !isOwnProfile) {
      const { data: followData } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", userId)
        .single();

      setIsFollowing(!!followData);
    }

    setLoading(false);
  };

  const [showFollowOptions, setShowFollowOptions] = useState(false);
  const [isCloseFriend, setIsCloseFriend] = useState(false);

  // Check close friends status
  useEffect(() => {
    const checkCloseFriendStatus = async () => {
      if (!user || !userId) return;
      const { data } = await supabase
        .from("close_friends")
        .select("id")
        .eq("user_id", user.id)
        .eq("friend_id", userId)
        .maybeSingle();
      setIsCloseFriend(!!data);
    };
    checkCloseFriendStatus();
  }, [user, userId]);

  const handleFollowToggle = async () => {
    if (!user || isOwnProfile) return;

    if (isFollowing) {
      await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", userId);
      
      setIsFollowing(false);
      setFollowStats(prev => ({ ...prev, followers: prev.followers - 1 }));
      toast.success("הפסקת לעקוב");
    } else {
      await supabase
        .from("user_follows")
        .insert({ follower_id: user.id, following_id: userId });
      
      setIsFollowing(true);
      setFollowStats(prev => ({ ...prev, followers: prev.followers + 1 }));
      toast.success("התחלת לעקוב! 🎉");
      setShowFollowOptions(true); // Show options after following
    }
  };

  const handleToggleCloseFriend = async () => {
    if (!user || !userId) return;

    try {
      if (isCloseFriend) {
        await supabase
          .from("close_friends")
          .delete()
          .eq("user_id", user.id)
          .eq("friend_id", userId);
        setIsCloseFriend(false);
        toast.success("הוסר מחברים קרובים");
      } else {
        await supabase
          .from("close_friends")
          .insert({ user_id: user.id, friend_id: userId });
        setIsCloseFriend(true);
        toast.success("נוסף לחברים קרובים ⭐");
      }
    } catch (error) {
      console.error("Error toggling close friend:", error);
    }
    setShowFollowOptions(false);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `${profile?.full_name} | Petid`,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("הקישור הועתק!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-14" dir="rtl">
        <div className="h-[56px] bg-gradient-to-r from-primary/10 to-accent/10" />
        <div className="px-4 pt-4 space-y-4">
          <div className="flex items-start gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-32" />
              <div className="flex gap-8">
                <Skeleton className="h-12 w-16" />
                <Skeleton className="h-12 w-16" />
                <Skeleton className="h-12 w-16" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4" dir="rtl">
        <PawPrint className="w-16 h-16 text-muted-foreground" />
        <p className="text-muted-foreground text-lg font-medium">משתמש לא נמצא</p>
      </div>
    );
  }

  const renderPostGrid = (postsToRender: Post[]) => (
    <div className="grid grid-cols-3 gap-[2px]">
      {postsToRender.map((post, index) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className="aspect-square bg-muted relative cursor-pointer group overflow-hidden"
          onClick={() => navigate(`/post/${post.id}`)}
        >
          <img
            src={post.media_urls?.[0] || post.image_url}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-6">
            <div className="flex items-center gap-1.5 text-white">
              <Heart className="w-5 h-5 fill-white" />
              <span className="font-bold text-sm">{post.likes_count}</span>
            </div>
            <div className="flex items-center gap-1.5 text-white">
              <MessageCircle className="w-5 h-5 fill-white" />
              <span className="font-bold text-sm">{post.comments_count}</span>
            </div>
          </div>
          {/* Multiple images indicator */}
          {post.media_urls && post.media_urls.length > 1 && (
            <div className="absolute top-2 right-2">
              <svg className="w-5 h-5 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 6V4h16v16h-2V6H4z"/>
                <rect x="2" y="6" width="16" height="16" rx="1"/>
              </svg>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );

  const renderPetsGrid = () => (
    <div className="grid grid-cols-2 gap-3 p-4">
      {pets.map((pet, index) => (
        <motion.div
          key={pet.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => navigate(`/pet/${pet.id}`)}
          className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-4 cursor-pointer hover:shadow-lg transition-all duration-300 border border-border/50"
        >
          <div className="w-20 h-20 mx-auto rounded-full overflow-hidden ring-4 ring-primary/20 mb-3">
            {pet.avatar_url ? (
              <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <img 
                  src={pet.type === 'dog' ? dogIcon : catIcon} 
                  alt={pet.type} 
                  className="w-10 h-10" 
                />
              </div>
            )}
          </div>
          <div className="text-center">
            <h3 className="font-bold text-foreground">{pet.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{pet.breed || (pet.type === 'dog' ? 'כלב' : 'חתול')}</p>
          </div>
        </motion.div>
      ))}
      {isOwnProfile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: pets.length * 0.1 }}
          onClick={() => navigate('/add-pet')}
          className="bg-muted/50 rounded-2xl p-4 cursor-pointer hover:bg-muted transition-colors border-2 border-dashed border-border flex flex-col items-center justify-center min-h-[160px]"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">הוסף חיית מחמד</span>
        </motion.div>
      )}
    </div>
  );

  return (
    <div className="h-screen bg-white overflow-hidden" dir="rtl">
      <div className="h-full overflow-y-auto pb-[70px]">
      {/* Header with gradient */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto h-[56px] flex items-center justify-between px-4">
          <button onClick={() => navigate(-1)} className="p-2 -mr-2 hover:bg-muted rounded-full transition-colors">
            <ArrowRight className="w-5 h-5 text-foreground" />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">{profile.full_name}</span>
            {(profile.points || 0) >= 1000 && (
              <ShieldCheck className="w-5 h-5 text-primary fill-primary/20" />
            )}
          </div>
          
          <button onClick={isOwnProfile ? () => navigate("/settings") : handleShare} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
            {isOwnProfile ? <MoreHorizontal className="w-5 h-5 text-foreground" /> : <Share2 className="w-5 h-5 text-foreground" />}
          </button>
        </div>
      </div>

      {/* Spacer */}
      <div className="h-[56px]" />

      {/* Profile Content */}
      <div className="max-w-lg mx-auto">
        {/* Profile Info Section */}
        <div className="px-4 pt-6">
          {/* Avatar and Stats Row */}
          <div className="flex items-start gap-6 mb-5">
            {/* Avatar with gradient ring */}
            <div className="relative flex-shrink-0">
              <div className="w-[96px] h-[96px] rounded-full p-[3px] bg-gradient-to-tr from-primary via-accent to-primary">
                <div className="w-full h-full rounded-full overflow-hidden bg-white p-[2px]">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={profile.avatar_url} className="object-cover" />
                    <AvatarFallback className="text-3xl bg-muted text-foreground font-bold">
                      {profile.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              {isOwnProfile && (
                <button 
                  onClick={() => navigate('/edit-profile')}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-3 border-white shadow-lg"
                >
                  <Plus className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="flex-1 flex justify-around pt-2">
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">{posts.length}</div>
                <div className="text-xs text-muted-foreground">פוסטים</div>
              </div>
              <button 
                className="text-center hover:opacity-70 transition-opacity"
                onClick={() => {
                  setFollowersDialogTab("followers");
                  setFollowersDialogOpen(true);
                }}
              >
                <div className="text-xl font-bold text-foreground">{followStats.followers}</div>
                <div className="text-xs text-muted-foreground">עוקבים</div>
              </button>
              <button 
                className="text-center hover:opacity-70 transition-opacity"
                onClick={() => {
                  setFollowersDialogTab("following");
                  setFollowersDialogOpen(true);
                }}
              >
                <div className="text-xl font-bold text-foreground">{followStats.following}</div>
                <div className="text-xs text-muted-foreground">נעקבים</div>
              </button>
            </div>
          </div>

          {/* Name, Bio and Badges */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-foreground">{profile.full_name}</h2>
              {pets.length > 0 && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full flex items-center gap-1">
                  <PawPrint className="w-3 h-3" />
                  {pets.length}
                </span>
              )}
            </div>
            
            {profile.bio && (
              <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
            )}
            
            {/* Pet badges */}
            {pets.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {pets.slice(0, 3).map((pet) => (
                  <span 
                    key={pet.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-full text-xs font-medium text-foreground"
                  >
                    <img 
                      src={pet.type === 'dog' ? dogIcon : catIcon} 
                      alt="" 
                      className="w-3.5 h-3.5" 
                    />
                    {pet.name}
                  </span>
                ))}
                {pets.length > 3 && (
                  <span className="px-2.5 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground">
                    +{pets.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Points badge for own profile */}
            {isOwnProfile && (profile.points || 0) > 0 && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full">
                <Crown className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{profile.points} נקודות</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {isOwnProfile ? (
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => navigate('/edit-profile')}
                className="flex-1 h-9 bg-muted hover:bg-muted/80 rounded-xl text-sm font-semibold text-foreground transition-colors"
              >
                ערוך פרופיל
              </button>
              <button 
                onClick={handleShare}
                className="flex-1 h-9 bg-muted hover:bg-muted/80 rounded-xl text-sm font-semibold text-foreground transition-colors"
              >
                שתף פרופיל
              </button>
            </div>
          ) : (
            <div className="flex gap-2 mb-4">
              {isFollowing ? (
                <Popover open={showFollowOptions} onOpenChange={setShowFollowOptions}>
                  <PopoverTrigger asChild>
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 h-9 rounded-xl text-sm font-bold transition-all bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center gap-1"
                    >
                      <span>עוקב ✓</span>
                      <ChevronDown className="w-4 h-4" />
                    </motion.button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-1" align="start">
                    <button
                      onClick={handleToggleCloseFriend}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                    >
                      <Star className={`w-4 h-4 ${isCloseFriend ? "text-yellow-500 fill-yellow-500" : ""}`} />
                      <span>{isCloseFriend ? "הסר מחברים קרובים" : "הוסף לחברים קרובים"}</span>
                    </button>
                    <button
                      onClick={handleFollowToggle}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted text-destructive transition-colors"
                    >
                      הפסק לעקוב
                    </button>
                  </PopoverContent>
                </Popover>
              ) : (
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={handleFollowToggle}
                  className="flex-1 h-9 rounded-xl text-sm font-bold transition-all bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30"
                >
                  עקוב
                </motion.button>
              )}
              <button 
                onClick={() => navigate(`/messages/${userId}`)}
                className="flex-1 h-9 bg-muted hover:bg-muted/80 rounded-xl text-sm font-semibold text-foreground transition-colors"
              >
                הודעה
              </button>
            </div>
          )}
        </div>

        {/* Pets horizontal scroll */}
        {pets.length > 0 && (
          <div className="px-4 mb-4">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {pets.map((pet) => (
                <motion.div
                  key={pet.id}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => navigate(`/pet/${pet.id}`)}
                  className="flex-shrink-0 text-center cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-primary to-accent">
                    <div className="w-full h-full rounded-full overflow-hidden bg-white">
                      {pet.avatar_url ? (
                        <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <img src={pet.type === 'dog' ? dogIcon : catIcon} alt="" className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs font-medium text-foreground mt-1.5 max-w-[64px] truncate">{pet.name}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Story Highlights */}
        <div className="px-4 mb-2">
          <HighlightsSection userId={userId!} isOwnProfile={isOwnProfile} />
        </div>

        {/* Content Tabs */}
        <div className="border-t border-border/50 sticky top-[56px] bg-white z-40">
          <div className="flex">
            <button 
              onClick={() => setActiveTab("posts")}
              className={`flex-1 h-12 flex items-center justify-center border-b-2 transition-colors ${
                activeTab === "posts" ? "border-foreground" : "border-transparent"
              }`}
            >
              <Grid3x3 className={`w-6 h-6 ${activeTab === "posts" ? "text-foreground" : "text-muted-foreground"}`} strokeWidth={1.5} />
            </button>
            <button 
              onClick={() => setActiveTab("pets")}
              className={`flex-1 h-12 flex items-center justify-center border-b-2 transition-colors ${
                activeTab === "pets" ? "border-foreground" : "border-transparent"
              }`}
            >
              <PawPrint className={`w-6 h-6 ${activeTab === "pets" ? "text-foreground" : "text-muted-foreground"}`} strokeWidth={1.5} />
            </button>
            {isOwnProfile && (
              <button 
                onClick={() => setActiveTab("saved")}
                className={`flex-1 h-12 flex items-center justify-center border-b-2 transition-colors ${
                  activeTab === "saved" ? "border-foreground" : "border-transparent"
                }`}
              >
                <Bookmark className={`w-6 h-6 ${activeTab === "saved" ? "text-foreground" : "text-muted-foreground"}`} strokeWidth={1.5} />
              </button>
            )}
            <button 
              onClick={() => setActiveTab("tagged")}
              className={`flex-1 h-12 flex items-center justify-center border-b-2 transition-colors ${
                activeTab === "tagged" ? "border-foreground" : "border-transparent"
              }`}
            >
              <UserSquare2 className={`w-6 h-6 ${activeTab === "tagged" ? "text-foreground" : "text-muted-foreground"}`} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          <AnimatePresence mode="wait">
            {activeTab === "posts" && (
              <motion.div
                key="posts"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {posts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-8">
                    <div className="w-20 h-20 border-2 border-foreground/20 rounded-full flex items-center justify-center mb-4">
                      <Grid3x3 className="w-10 h-10 text-foreground/40" strokeWidth={1} />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">שתף רגעים</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-[240px]">
                      כשתשתף תמונות וסרטונים של חיות המחמד שלך, הם יופיעו כאן.
                    </p>
                  </div>
                ) : (
                  renderPostGrid(posts)
                )}
              </motion.div>
            )}

            {activeTab === "pets" && (
              <motion.div
                key="pets"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {pets.length === 0 && !isOwnProfile ? (
                  <div className="flex flex-col items-center justify-center py-20 px-8">
                    <div className="w-20 h-20 border-2 border-foreground/20 rounded-full flex items-center justify-center mb-4">
                      <PawPrint className="w-10 h-10 text-foreground/40" strokeWidth={1} />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">אין חיות מחמד</h3>
                    <p className="text-sm text-muted-foreground text-center">
                      המשתמש עוד לא הוסיף חיות מחמד.
                    </p>
                  </div>
                ) : (
                  renderPetsGrid()
                )}
              </motion.div>
            )}

            {activeTab === "saved" && isOwnProfile && (
              <motion.div
                key="saved"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {savedPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-8">
                    <div className="w-20 h-20 border-2 border-foreground/20 rounded-full flex items-center justify-center mb-4">
                      <Bookmark className="w-10 h-10 text-foreground/40" strokeWidth={1} />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">שמור לאחר כך</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-[240px]">
                      שמור תמונות וסרטונים שאהבת לצפייה מאוחרת.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="px-4 py-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">רק את/ה יכול/ה לראות את הפריטים השמורים</span>
                    </div>
                    {renderPostGrid(savedPosts)}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "tagged" && (
              <motion.div
                key="tagged"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex flex-col items-center justify-center py-20 px-8">
                  <div className="w-20 h-20 border-2 border-foreground/20 rounded-full flex items-center justify-center mb-4">
                    <UserSquare2 className="w-10 h-10 text-foreground/40" strokeWidth={1} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">תיוגים</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-[240px]">
                    כשאנשים יתייגו אותך בתמונות, הן יופיעו כאן.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <FollowersDialog
        open={followersDialogOpen}
        onOpenChange={setFollowersDialogOpen}
        userId={userId!}
        defaultTab={followersDialogTab}
      />
      </div>

      <BottomNav />
    </div>
  );
};

export default UserProfile;
