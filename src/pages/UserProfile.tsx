import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Heart, MessageCircle, Grid3x3, Settings, PawPrint, Plus, MoreHorizontal, ChevronDown, Bookmark, Video, UserSquare2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
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
  const [activeTab, setActiveTab] = useState<"posts" | "reels" | "saved" | "tagged">("posts");

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
    } else {
      await supabase
        .from("user_follows")
        .insert({ follower_id: user.id, following_id: userId });
      
      setIsFollowing(true);
      setFollowStats(prev => ({ ...prev, followers: prev.followers + 1 }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-14" dir="rtl">
        <div className="h-[44px] border-b border-gray-100" />
        <div className="px-4 pt-4 space-y-4">
          <div className="flex items-start gap-6">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-6">
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-10 w-16" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir="rtl">
        <p className="text-[#8E8E8E] text-sm">משתמש לא נמצא</p>
      </div>
    );
  }

  const renderPostGrid = (postsToRender: Post[]) => (
    <div className="grid grid-cols-3 gap-[1px]">
      {postsToRender.map((post) => (
        <div
          key={post.id}
          className="aspect-square bg-gray-100 relative cursor-pointer group"
          onClick={() => navigate(`/post/${post.id}`)}
        >
          <img
            src={post.media_urls?.[0] || post.image_url}
            alt=""
            className="w-full h-full object-cover"
          />
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
            <div className="flex items-center gap-1 text-white">
              <Heart className="w-5 h-5 fill-white" />
              <span className="font-semibold text-sm">{post.likes_count}</span>
            </div>
            <div className="flex items-center gap-1 text-white">
              <MessageCircle className="w-5 h-5 fill-white" />
              <span className="font-semibold text-sm">{post.comments_count}</span>
            </div>
          </div>
          {/* Multiple images indicator */}
          {post.media_urls && post.media_urls.length > 1 && (
            <div className="absolute top-2 right-2">
              <svg className="w-5 h-5 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 6V4h16v16h-2V6H4z"/>
                <rect x="2" y="6" width="16" height="16" rx="1"/>
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-14" dir="rtl">
      {/* Instagram-style Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto h-[44px] flex items-center justify-between px-4">
          <button onClick={() => navigate(-1)} className="active:opacity-50">
            <ArrowRight className="w-6 h-6 text-[#262626]" />
          </button>
          
          <button className="flex items-center gap-1 active:opacity-50">
            <span className="text-base font-semibold text-[#262626]">
              {profile.full_name}
            </span>
            <ChevronDown className="w-4 h-4 text-[#262626]" />
          </button>
          
          {isOwnProfile ? (
            <button onClick={() => navigate("/settings")} className="active:opacity-50">
              <MoreHorizontal className="w-6 h-6 text-[#262626]" />
            </button>
          ) : (
            <button className="active:opacity-50">
              <MoreHorizontal className="w-6 h-6 text-[#262626]" />
            </button>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="h-[44px]" />

      {/* Profile Content */}
      <div className="max-w-lg mx-auto">
        {/* Profile Info Section */}
        <div className="px-4 pt-4">
          {/* Avatar and Stats Row */}
          <div className="flex items-center gap-7 mb-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-[86px] h-[86px] rounded-full overflow-hidden ring-[3px] ring-gray-100">
                <Avatar className="w-full h-full">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="text-2xl bg-gray-100 text-[#262626] font-semibold">
                    {profile.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
              {isOwnProfile && (
                <button className="absolute bottom-0 right-0 w-6 h-6 bg-[#0095F6] rounded-full flex items-center justify-center border-2 border-white">
                  <Plus className="w-4 h-4 text-white" strokeWidth={2.5} />
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="flex-1 flex justify-around">
              <div className="text-center">
                <div className="text-lg font-semibold text-[#262626]">{posts.length}</div>
                <div className="text-[13px] text-[#262626]">פוסטים</div>
              </div>
              <button 
                className="text-center active:opacity-50"
                onClick={() => {
                  setFollowersDialogTab("followers");
                  setFollowersDialogOpen(true);
                }}
              >
                <div className="text-lg font-semibold text-[#262626]">{followStats.followers}</div>
                <div className="text-[13px] text-[#262626]">עוקבים</div>
              </button>
              <button 
                className="text-center active:opacity-50"
                onClick={() => {
                  setFollowersDialogTab("following");
                  setFollowersDialogOpen(true);
                }}
              >
                <div className="text-lg font-semibold text-[#262626]">{followStats.following}</div>
                <div className="text-[13px] text-[#262626]">נעקבים</div>
              </button>
            </div>
          </div>

          {/* Name and Bio */}
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-[#262626]">{profile.full_name}</h2>
            {profile.bio && (
              <p className="text-sm text-[#262626] mt-1 whitespace-pre-wrap">{profile.bio}</p>
            )}
            {pets.length > 0 && (
              <p className="text-sm text-[#8E8E8E] mt-1">
                🐾 {pets.length} חיות מחמד
              </p>
            )}
          </div>

          {/* Action Buttons */}
          {isOwnProfile ? (
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => navigate('/edit-profile')}
                className="flex-1 h-[32px] bg-[#EFEFEF] hover:bg-[#DBDBDB] rounded-lg text-sm font-semibold text-[#262626] transition-colors"
              >
                ערוך פרופיל
              </button>
              <button 
                onClick={() => toast.info("שיתוף פרופיל בקרוב")}
                className="flex-1 h-[32px] bg-[#EFEFEF] hover:bg-[#DBDBDB] rounded-lg text-sm font-semibold text-[#262626] transition-colors"
              >
                שתף פרופיל
              </button>
              <button className="w-[32px] h-[32px] bg-[#EFEFEF] hover:bg-[#DBDBDB] rounded-lg flex items-center justify-center transition-colors">
                <Plus className="w-4 h-4 text-[#262626]" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2 mb-4">
              <button 
                onClick={handleFollowToggle}
                className={`flex-1 h-[32px] rounded-lg text-sm font-semibold transition-colors ${
                  isFollowing 
                    ? "bg-[#EFEFEF] hover:bg-[#DBDBDB] text-[#262626]" 
                    : "bg-[#0095F6] hover:bg-[#1877F2] text-white"
                }`}
              >
                {isFollowing ? "עוקב" : "עקוב"}
              </button>
              <button 
                onClick={() => navigate(`/messages/${userId}`)}
                className="flex-1 h-[32px] bg-[#EFEFEF] hover:bg-[#DBDBDB] rounded-lg text-sm font-semibold text-[#262626] transition-colors"
              >
                הודעה
              </button>
              <button className="w-[32px] h-[32px] bg-[#EFEFEF] hover:bg-[#DBDBDB] rounded-lg flex items-center justify-center transition-colors">
                <ChevronDown className="w-4 h-4 text-[#262626]" />
              </button>
            </div>
          )}
        </div>

        {/* Story Highlights */}
        <div className="px-4 mb-2">
          <HighlightsSection userId={userId!} isOwnProfile={isOwnProfile} />
        </div>

        {/* Content Tabs */}
        <div className="border-t border-gray-200">
          <div className="flex">
            <button 
              onClick={() => setActiveTab("posts")}
              className={`flex-1 h-[44px] flex items-center justify-center border-t transition-colors ${
                activeTab === "posts" ? "border-[#262626]" : "border-transparent"
              }`}
            >
              <Grid3x3 className={`w-6 h-6 ${activeTab === "posts" ? "text-[#262626]" : "text-[#8E8E8E]"}`} strokeWidth={1.5} />
            </button>
            <button 
              onClick={() => setActiveTab("reels")}
              className={`flex-1 h-[44px] flex items-center justify-center border-t transition-colors ${
                activeTab === "reels" ? "border-[#262626]" : "border-transparent"
              }`}
            >
              <Video className={`w-6 h-6 ${activeTab === "reels" ? "text-[#262626]" : "text-[#8E8E8E]"}`} strokeWidth={1.5} />
            </button>
            {isOwnProfile && (
              <button 
                onClick={() => setActiveTab("saved")}
                className={`flex-1 h-[44px] flex items-center justify-center border-t transition-colors ${
                  activeTab === "saved" ? "border-[#262626]" : "border-transparent"
                }`}
              >
                <Bookmark className={`w-6 h-6 ${activeTab === "saved" ? "text-[#262626]" : "text-[#8E8E8E]"}`} strokeWidth={1.5} />
              </button>
            )}
            <button 
              onClick={() => setActiveTab("tagged")}
              className={`flex-1 h-[44px] flex items-center justify-center border-t transition-colors ${
                activeTab === "tagged" ? "border-[#262626]" : "border-transparent"
              }`}
            >
              <UserSquare2 className={`w-6 h-6 ${activeTab === "tagged" ? "text-[#262626]" : "text-[#8E8E8E]"}`} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[200px]">
          {activeTab === "posts" && (
            posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-8">
                <div className="w-16 h-16 border-2 border-[#262626] rounded-full flex items-center justify-center mb-4">
                  <Grid3x3 className="w-8 h-8 text-[#262626]" strokeWidth={1} />
                </div>
                <h3 className="text-2xl font-bold text-[#262626] mb-2">שתף תמונות</h3>
                <p className="text-sm text-[#8E8E8E] text-center">
                  כשתשתף תמונות, הן יופיעו בפרופיל שלך.
                </p>
              </div>
            ) : (
              renderPostGrid(posts)
            )
          )}

          {activeTab === "reels" && (
            <div className="flex flex-col items-center justify-center py-16 px-8">
              <div className="w-16 h-16 border-2 border-[#262626] rounded-full flex items-center justify-center mb-4">
                <Video className="w-8 h-8 text-[#262626]" strokeWidth={1} />
              </div>
              <h3 className="text-2xl font-bold text-[#262626] mb-2">שתף סרטונים</h3>
              <p className="text-sm text-[#8E8E8E] text-center">
                סרטונים שתשתף יופיעו כאן.
              </p>
            </div>
          )}

          {activeTab === "saved" && isOwnProfile && (
            savedPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-8">
                <div className="w-16 h-16 border-2 border-[#262626] rounded-full flex items-center justify-center mb-4">
                  <Bookmark className="w-8 h-8 text-[#262626]" strokeWidth={1} />
                </div>
                <h3 className="text-2xl font-bold text-[#262626] mb-2">שמור</h3>
                <p className="text-sm text-[#8E8E8E] text-center">
                  שמור תמונות וסרטונים לצפייה מאוחרת.
                </p>
              </div>
            ) : (
              <div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-[#8E8E8E]">רק את/ה יכול/ה לראות את הפריטים השמורים</span>
                </div>
                {renderPostGrid(savedPosts)}
              </div>
            )
          )}

          {activeTab === "tagged" && (
            <div className="flex flex-col items-center justify-center py-16 px-8">
              <div className="w-16 h-16 border-2 border-[#262626] rounded-full flex items-center justify-center mb-4">
                <UserSquare2 className="w-8 h-8 text-[#262626]" strokeWidth={1} />
              </div>
              <h3 className="text-2xl font-bold text-[#262626] mb-2">תמונות שלך</h3>
              <p className="text-sm text-[#8E8E8E] text-center">
                כשאנשים יתייגו אותך בתמונות, הן יופיעו כאן.
              </p>
            </div>
          )}
        </div>
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
