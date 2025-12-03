import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Heart, MessageCircle, Grid3x3, Settings, PawPrint, Award, TrendingUp, Calendar, Plus, MoreVertical, Share2, Send, Sparkles, Play, Video, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface UserStats {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  joinedDate: string;
  petsCount: number;
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
  const [userStats, setUserStats] = useState<UserStats>({
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    joinedDate: "",
    petsCount: 0,
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false);
  const [followersDialogTab, setFollowersDialogTab] = useState<"followers" | "following">("followers");

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (!userId) return;
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    setLoading(true);
    
    // Fetch user profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // Fetch user posts with counts
    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    let totalLikes = 0;
    let totalComments = 0;

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

        totalLikes += likesCount || 0;
        totalComments += commentsCount || 0;
        
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

    // Fetch saved posts if viewing own profile
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

    // Fetch user's pets
    const { data: petsData } = await supabase
      .from("pets")
      .select("*")
      .eq("user_id", userId)
      .eq("archived", false)
      .order("created_at", { ascending: false });

    if (petsData) {
      setPets(petsData);
    }

    // Fetch follow stats
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

    // Set user statistics
    setUserStats({
      totalPosts: postsData?.length || 0,
      totalLikes,
      totalComments,
      joinedDate: profileData?.created_at || "",
      petsCount: petsData?.length || 0,
    });

    // Check if current user is following this profile
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

  const handleFollowToggle = async () => {
    if (!user || isOwnProfile) return;

    if (isFollowing) {
      // Unfollow
      await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", userId);
      
      setIsFollowing(false);
      setFollowStats(prev => ({ ...prev, followers: prev.followers - 1 }));
    } else {
      // Follow
      await supabase
        .from("user_follows")
        .insert({ follower_id: user.id, following_id: userId });
      
      setIsFollowing(true);
      setFollowStats(prev => ({ ...prev, followers: prev.followers + 1 }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-24" dir="rtl">
        <div className="p-4 space-y-4">
          <Skeleton className="h-24 w-24 rounded-full mx-auto" />
          <Skeleton className="h-6 w-40 mx-auto" />
          <div className="flex justify-center gap-8">
            <Skeleton className="h-12 w-20" />
            <Skeleton className="h-12 w-20" />
            <Skeleton className="h-12 w-20" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir="rtl">
        <p className="text-gray-500 font-jakarta">משתמש לא נמצא</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24" dir="rtl">
      {/* Petish Profile Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowRight className="w-6 h-6" />
          </Button>
          <div className="text-center">
            <span className="text-xs text-gray-500 font-medium">Petish Profile</span>
            <h1 className="text-xl font-bold text-gray-900 font-jakarta">
              {profile.full_name}
            </h1>
          </div>
          {isOwnProfile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
              className="rounded-full"
            >
              <Settings className="w-6 h-6" />
            </Button>
          )}
          {!isOwnProfile && <div className="w-10" />}
        </div>
      </div>

      {/* Profile Info */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile Header with Avatar and Stats */}
        <div className="flex items-start gap-6 mb-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden ring-1 ring-gray-200">
                <Avatar className="w-full h-full">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="text-2xl bg-gray-200 text-gray-600 font-black">
                    {profile.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
              {isOwnProfile && (
                <button className="absolute bottom-0 right-0 w-6 h-6 bg-[#0095F6] rounded-full flex items-center justify-center shadow-md border-2 border-white">
                  <Plus className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-900 font-jakarta truncate">
                {profile.full_name}
              </h2>
              {isOwnProfile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/settings")}
                  className="rounded-full w-8 h-8"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              )}
            </div>
            
            <div className="flex justify-start gap-8 mb-4">
              <div className="text-center">
                <div className="text-base font-semibold text-gray-900 font-jakarta">
                  {posts.length}
                </div>
                <div className="text-sm text-gray-600 font-jakarta">פוסטים</div>
              </div>
              <div 
                className="text-center cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => {
                  setFollowersDialogTab("followers");
                  setFollowersDialogOpen(true);
                }}
              >
                <div className="text-base font-semibold text-gray-900 font-jakarta">
                  {followStats.followers.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 font-jakarta">עוקבים</div>
              </div>
              <div 
                className="text-center cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => {
                  setFollowersDialogTab("following");
                  setFollowersDialogOpen(true);
                }}
              >
                <div className="text-base font-semibold text-gray-900 font-jakarta">
                  {followStats.following.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 font-jakarta">נעקבים</div>
              </div>
            </div>
          </div>
        </div>

        {/* Biography */}
        {profile.bio && (
          <div className="mb-4">
            <p className="text-sm text-gray-900 font-jakarta whitespace-pre-wrap">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Professional Dashboard - Only for own profile */}
        {isOwnProfile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 font-jakarta">לוח מקצועי</p>
                  <p className="text-xs text-gray-600 font-jakarta">כלים חדשים זמינים כעת.</p>
                </div>
              </div>
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        {!isOwnProfile && (
          <div className="flex gap-2 mb-4">
            <Button
              onClick={handleFollowToggle}
              className={`flex-1 font-jakarta font-bold rounded-lg h-9 ${
                isFollowing
                  ? "bg-gray-200 text-gray-900 hover:bg-gray-300"
                  : "bg-[#0095F6] text-white hover:bg-[#0082d9]"
              }`}
            >
              {isFollowing ? "עוקב" : "עקוב"}
            </Button>
            <Button
              onClick={() => navigate(`/messages/${userId}`)}
              variant="outline"
              className="flex-1 font-jakarta font-bold rounded-lg h-9"
            >
              הודעה
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-lg h-9 w-9"
              onClick={() => toast.info("שיתוף פרופיל בקרוב")}
              aria-label="שתף פרופיל"
            >
              <Send className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-lg h-9 w-9"
              aria-label="אפשרויות נוספות"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        {isOwnProfile && (
          <div className="flex gap-2 mb-4">
            <Button
              onClick={() => navigate('/edit-profile')}
              variant="outline"
              className="flex-1 font-jakarta font-bold rounded-lg h-9"
            >
              ערוך פרופיל
            </Button>
            <Button
              variant="outline"
              className="flex-1 font-jakarta font-bold rounded-lg h-9"
              onClick={() => toast.info("שיתוף פרופיל בקרוב")}
            >
              שתף פרופיל
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-lg h-9 w-9"
              aria-label="הוסף חשבון"
            >
              <User className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Highlights Section */}
        <HighlightsSection userId={userId!} isOwnProfile={isOwnProfile} />

        {/* Content Tabs - Instagram Style */}
        <Tabs defaultValue="posts" className="mt-4">
          <TabsList className="w-full grid grid-cols-4 font-jakarta border-t border-gray-200 bg-transparent rounded-none h-12">
            <TabsTrigger 
              value="posts" 
              className="gap-1 data-[state=active]:border-t-[1.5px] data-[state=active]:border-gray-900 rounded-none"
            >
              <Grid3x3 className="w-6 h-6" strokeWidth={1.5} />
            </TabsTrigger>
            <TabsTrigger 
              value="reels" 
              className="gap-1 data-[state=active]:border-t-[1.5px] data-[state=active]:border-gray-900 rounded-none"
            >
              <Video className="w-6 h-6" strokeWidth={1.5} />
            </TabsTrigger>
            <TabsTrigger 
              value="pets" 
              className="gap-1 data-[state=active]:border-t-[1.5px] data-[state=active]:border-gray-900 rounded-none"
            >
              <PawPrint className="w-6 h-6" strokeWidth={1.5} />
            </TabsTrigger>
            <TabsTrigger 
              value="tagged" 
              className="gap-1 data-[state=active]:border-t-[1.5px] data-[state=active]:border-gray-900 rounded-none"
            >
              <User className="w-6 h-6" strokeWidth={1.5} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-4">
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 font-jakarta">אין Petish Posts עדיין</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {posts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="aspect-square bg-gray-100 relative cursor-pointer group"
                    onClick={() => navigate(`/post/${post.id}`)}
                  >
                      <img
                        src={post.media_urls?.[0] || post.image_url}
                        alt={post.caption || ""}
                        className="w-full h-full object-cover"
                      />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex items-center gap-4 text-white">
                        <div className="flex items-center gap-1">
                          <Heart className="w-5 h-5 fill-white" />
                          <span className="font-semibold font-jakarta">{post.likes_count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-5 h-5 fill-white" />
                          <span className="font-semibold font-jakarta">{post.comments_count}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pets" className="mt-4">
            {pets.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PawPrint className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-500 font-jakarta">אין חיות מחמד רשומות</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pets.map((pet, index) => (
                  <motion.div
                    key={pet.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => navigate(`/pet/${pet.id}`)}
                    className="bg-white rounded-3xl p-5 flex items-center gap-4 cursor-pointer hover:shadow-xl transition-all shadow-md border border-gray-100"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 flex-shrink-0 ring-2 ring-gray-200">
                      {pet.avatar_url ? (
                        <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {pet.type === "dog" ? (
                            <img src={dogIcon} alt="dog" className="w-10 h-10" />
                          ) : (
                            <img src={catIcon} alt="cat" className="w-10 h-10" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-gray-900 font-jakarta text-lg mb-1">{pet.name}</p>
                      <p className="text-gray-600 font-jakarta text-sm">{pet.breed || "גזע לא ידוע"}</p>
                      {pet.birth_date && (
                        <p className="text-gray-400 font-jakarta text-xs mt-1">
                          {Math.floor(
                            (new Date().getTime() - new Date(pet.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365)
                          )}{" "}
                          שנים
                        </p>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <ArrowRight className="w-5 h-5 text-gray-600" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reels" className="mt-4">
            <div className="text-center py-12">
              <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-jakarta text-lg font-semibold mb-2">Share your Petish moments</p>
              <p className="text-gray-400 font-jakarta text-sm">Petish Reels you share will appear here</p>
            </div>
          </TabsContent>

          <TabsContent value="tagged" className="mt-4">
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-jakarta text-lg font-semibold mb-2">Photos and videos of you</p>
              <p className="text-gray-400 font-jakarta text-sm">When people tag you in Petish posts, they'll appear here</p>
            </div>
          </TabsContent>

          <TabsContent value="saved" className="mt-4">
            {isOwnProfile ? (
              savedPosts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 font-jakarta">אין Petish Posts שמורים</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {savedPosts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="aspect-square bg-gray-100 relative cursor-pointer group"
                      onClick={() => navigate(`/post/${post.id}`)}
                    >
                      <img
                        src={post.media_urls?.[0] || post.image_url}
                        alt={post.caption || ""}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex items-center gap-4 text-white">
                          <div className="flex items-center gap-1">
                            <Heart className="w-5 h-5 fill-white" />
                            <span className="font-semibold font-jakarta">{post.likes_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-5 h-5 fill-white" />
                            <span className="font-semibold font-jakarta">{post.comments_count}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 font-jakarta">רק הבעלים יכול לראות Petish Posts שמורים</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <FollowersDialog
        open={followersDialogOpen}
        onOpenChange={setFollowersDialogOpen}
        userId={userId!}
        defaultTab={followersDialogTab}
      />

      <BottomNav />
    </div>
  );
};

export default UserProfile;