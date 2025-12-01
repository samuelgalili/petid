import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Heart, MessageCircle, Grid3x3, Settings, PawPrint, Award, TrendingUp, Calendar } from "lucide-react";
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

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  email: string;
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
      {/* Header */}
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
          <h1 className="text-xl font-bold text-gray-900 font-jakarta">
            {profile.full_name}
          </h1>
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
        {/* Profile Header */}
        <div className="flex items-start gap-6 mb-6">
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-gradient-instagram p-[3px] shadow-lg">
            <Avatar className="w-full h-full ring-2 ring-white">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="text-3xl bg-gradient-instagram text-white font-black">
                {profile.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 font-jakarta mb-4 truncate">
              {profile.full_name}
            </h2>
            
            <div className="flex justify-around mb-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900 font-jakarta">
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
                <div className="text-lg font-semibold text-gray-900 font-jakarta">
                  {followStats.followers}
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
                <div className="text-lg font-semibold text-gray-900 font-jakarta">
                  {followStats.following}
                </div>
                <div className="text-sm text-gray-600 font-jakarta">נעקבים</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!isOwnProfile && (
          <div className="flex gap-2 mb-6">
            <Button
              onClick={handleFollowToggle}
              className={`flex-1 font-jakarta font-bold ${
                isFollowing
                  ? "bg-gray-200 text-gray-900 hover:bg-gray-300"
                  : "bg-gradient-instagram text-white hover:opacity-90"
              }`}
            >
              {isFollowing ? "עוקב" : "עקוב"}
            </Button>
            <Button
              onClick={() => navigate(`/chat`)}
              variant="outline"
              className="flex-1 font-jakarta font-bold"
            >
              שלח הודעה
            </Button>
          </div>
        )}
        
        {isOwnProfile && (
          <div className="flex gap-2 mb-6">
            <Button
              onClick={() => navigate('/settings')}
              variant="outline"
              className="flex-1 font-jakarta"
            >
              ערוך פרופיל
            </Button>
          </div>
        )}

        {/* Highlights Section */}
        <HighlightsSection userId={userId!} isOwnProfile={isOwnProfile} />

        {/* Statistics Section */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-gradient-to-br from-instagram-pink/10 to-instagram-purple/10 rounded-2xl p-4 text-center shadow-md">
            <Heart className="w-5 h-5 text-instagram-pink mx-auto mb-2" />
            <p className="text-xl font-black text-gray-900 font-jakarta mb-1">{userStats.totalLikes}</p>
            <p className="text-xs text-gray-600 font-jakarta">לייקים</p>
          </div>
          <div className="bg-gradient-to-br from-instagram-purple/10 to-instagram-pink/10 rounded-2xl p-4 text-center shadow-md">
            <MessageCircle className="w-5 h-5 text-instagram-purple mx-auto mb-2" />
            <p className="text-xl font-black text-gray-900 font-jakarta mb-1">{userStats.totalComments}</p>
            <p className="text-xs text-gray-600 font-jakarta">תגובות</p>
          </div>
          <div className="bg-gradient-to-br from-instagram-orange/10 to-instagram-pink/10 rounded-2xl p-4 text-center shadow-md">
            <PawPrint className="w-5 h-5 text-instagram-orange mx-auto mb-2" />
            <p className="text-xl font-black text-gray-900 font-jakarta mb-1">{userStats.petsCount}</p>
            <p className="text-xs text-gray-600 font-jakarta">חיות</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 text-center shadow-md">
            <Calendar className="w-5 h-5 text-purple-600 mx-auto mb-2" />
            <p className="text-xl font-black text-gray-900 font-jakarta mb-1">
              {userStats.joinedDate ? new Date(userStats.joinedDate).getFullYear() : "---"}
            </p>
            <p className="text-xs text-gray-600 font-jakarta">הצטרף</p>
          </div>
        </div>

        {/* Posts Grid */}
        <Tabs defaultValue="posts" className="mt-2">
          <TabsList className="w-full grid grid-cols-3 font-jakarta border-t border-gray-200 bg-transparent rounded-none h-12">
            <TabsTrigger 
              value="posts" 
              className="gap-2 data-[state=active]:border-t-2 data-[state=active]:border-gray-900 rounded-none"
            >
              <Grid3x3 className="w-5 h-5" />
            </TabsTrigger>
            <TabsTrigger 
              value="pets" 
              className="gap-2 data-[state=active]:border-t-2 data-[state=active]:border-gray-900 rounded-none"
            >
              <PawPrint className="w-5 h-5" />
            </TabsTrigger>
            <TabsTrigger 
              value="saved" 
              className="gap-2 data-[state=active]:border-t-2 data-[state=active]:border-gray-900 rounded-none"
            >
              <Heart className="w-5 h-5" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-4">
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 font-jakarta">אין פוסטים עדיין</p>
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

          <TabsContent value="saved" className="mt-4">
            {isOwnProfile ? (
              savedPosts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 font-jakarta">אין פוסטים שמורים</p>
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
                <p className="text-gray-500 font-jakarta">רק הבעלים יכול לראות פוסטים שמורים</p>
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