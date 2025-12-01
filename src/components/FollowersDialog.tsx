import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, UserMinus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  full_name: string;
  avatar_url: string;
  is_following: boolean;
}

interface FollowersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  defaultTab?: "followers" | "following";
}

export const FollowersDialog = ({ open, onOpenChange, userId, defaultTab = "followers" }: FollowersDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchFollowData();
    }
  }, [open, userId]);

  const fetchFollowData = async () => {
    setLoading(true);

    // Fetch followers
    const { data: followersData } = await supabase
      .from("user_follows")
      .select(`
        follower_id,
        profiles!user_follows_follower_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq("following_id", userId);

    // Fetch following
    const { data: followingData } = await supabase
      .from("user_follows")
      .select(`
        following_id,
        profiles!user_follows_following_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq("follower_id", userId);

    // Check which users current user is following
    let currentUserFollowing: string[] = [];
    if (user) {
      const { data: followingIds } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id);
      
      currentUserFollowing = followingIds?.map(f => f.following_id) || [];
    }

    // Format followers
    if (followersData) {
      setFollowers(
        followersData.map((item: any) => ({
          id: item.profiles.id,
          full_name: item.profiles.full_name,
          avatar_url: item.profiles.avatar_url,
          is_following: currentUserFollowing.includes(item.profiles.id),
        }))
      );
    }

    // Format following
    if (followingData) {
      setFollowing(
        followingData.map((item: any) => ({
          id: item.profiles.id,
          full_name: item.profiles.full_name,
          avatar_url: item.profiles.avatar_url,
          is_following: currentUserFollowing.includes(item.profiles.id),
        }))
      );
    }

    setLoading(false);
  };

  const handleFollowToggle = async (targetUserId: string, currentlyFollowing: boolean) => {
    if (!user) return;

    if (currentlyFollowing) {
      // Unfollow
      await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);
    } else {
      // Follow
      await supabase
        .from("user_follows")
        .insert({ follower_id: user.id, following_id: targetUserId });
    }

    // Update local state
    setFollowers(followers.map(f => 
      f.id === targetUserId ? { ...f, is_following: !currentlyFollowing } : f
    ));
    setFollowing(following.map(f => 
      f.id === targetUserId ? { ...f, is_following: !currentlyFollowing } : f
    ));
  };

  const renderUserList = (users: User[]) => {
    if (loading) {
      return [...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
      ));
    }

    if (users.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500 font-jakarta">אין משתמשים להצגה</p>
        </div>
      );
    }

    return users.map((followUser) => (
      <div key={followUser.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
        <div 
          className="flex items-center gap-3 cursor-pointer flex-1"
          onClick={() => {
            navigate(`/user/${followUser.id}`);
            onOpenChange(false);
          }}
        >
          <Avatar className="w-12 h-12">
            <AvatarImage src={followUser.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-white">
              {followUser.full_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-gray-900 font-jakarta">{followUser.full_name}</p>
          </div>
        </div>

        {user && user.id !== followUser.id && (
          <Button
            size="sm"
            onClick={() => handleFollowToggle(followUser.id, followUser.is_following)}
            className={`font-jakarta ${
              followUser.is_following
                ? "bg-gray-200 text-gray-900 hover:bg-gray-300"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {followUser.is_following ? (
              <>
                <UserMinus className="w-4 h-4 ml-1" />
                הסר עוקב
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 ml-1" />
                עקוב
              </>
            )}
          </Button>
        )}
      </div>
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col font-jakarta" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">עוקבים ונעקבים</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full grid grid-cols-2 font-jakarta">
            <TabsTrigger value="followers" className="gap-2">
              עוקבים ({followers.length})
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-2">
              נעקבים ({following.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="followers" className="flex-1 overflow-y-auto mt-4">
            <div className="space-y-1">
              {renderUserList(followers)}
            </div>
          </TabsContent>

          <TabsContent value="following" className="flex-1 overflow-y-auto mt-4">
            <div className="space-y-1">
              {renderUserList(following)}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};