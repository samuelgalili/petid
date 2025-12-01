import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Heart, MessageCircle, Grid3x3, Settings, UserPlus, UserMinus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNav from "@/components/BottomNav";

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  email: string;
}

interface Post {
  id: string;
  image_url: string;
  caption: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

interface FollowStats {
  followers: number;
  following: number;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followStats, setFollowStats] = useState<FollowStats>({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

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
      .select(`
        id,
        image_url,
        caption,
        created_at,
        post_likes(count),
        post_comments(count)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (postsData) {
      setPosts(
        postsData.map((post: any) => ({
          id: post.id,
          image_url: post.image_url,
          caption: post.caption,
          created_at: post.created_at,
          likes_count: post.post_likes?.[0]?.count || 0,
          comments_count: post.post_comments?.[0]?.count || 0,
        }))
      );
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
        <div className="flex items-center gap-6 mb-6">
          <Avatar className="w-24 h-24">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="text-2xl bg-gradient-to-br from-pink-400 to-purple-400 text-white">
              {profile.full_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 font-jakarta mb-2">
              {profile.full_name}
            </h2>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900 font-jakarta">
                  {posts.length}
                </div>
                <div className="text-sm text-gray-500 font-jakarta">פוסטים</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900 font-jakarta">
                  {followStats.followers}
                </div>
                <div className="text-sm text-gray-500 font-jakarta">עוקבים</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900 font-jakarta">
                  {followStats.following}
                </div>
                <div className="text-sm text-gray-500 font-jakarta">נעקבים</div>
              </div>
            </div>
          </div>
        </div>

        {!isOwnProfile && (
          <Button
            onClick={handleFollowToggle}
            className={`w-full mb-4 font-jakarta ${
              isFollowing
                ? "bg-gray-200 text-gray-900 hover:bg-gray-300"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {isFollowing ? (
              <>
                <UserMinus className="w-4 h-4 ml-2" />
                הסר עוקב
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 ml-2" />
                עקוב
              </>
            )}
          </Button>
        )}

        {/* Posts Grid */}
        <Tabs defaultValue="posts" className="mt-6">
          <TabsList className="w-full grid grid-cols-2 font-jakarta">
            <TabsTrigger value="posts" className="gap-2">
              <Grid3x3 className="w-4 h-4" />
              פוסטים
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <Heart className="w-4 h-4" />
              שמורים
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
                      src={post.image_url}
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

          <TabsContent value="saved" className="mt-4">
            <div className="text-center py-12">
              <p className="text-gray-500 font-jakarta">אין פוסטים שמורים</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default UserProfile;