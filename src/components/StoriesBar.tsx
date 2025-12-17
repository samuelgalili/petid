import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CreateStoryDialog } from "./CreateStoryDialog";

interface StoryUser {
  user_id: string;
  full_name: string;
  avatar_url: string;
  story_count: number;
  has_viewed: boolean;
}

export const StoriesBar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ avatar_url: string; full_name: string } | null>(null);

  useEffect(() => {
    fetchStories();
    if (user) fetchCurrentUserProfile();
  }, [user]);

  const fetchCurrentUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, full_name")
      .eq("id", user.id)
      .single();
    if (data) setCurrentUserProfile(data);
  };

  const fetchStories = async () => {
    setLoading(true);

    const { data: storiesData } = await supabase
      .from("stories")
      .select("user_id, id")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (storiesData && storiesData.length > 0) {
      const userStoriesMap = new Map<string, number>();
      storiesData.forEach((story) => {
        userStoriesMap.set(story.user_id, (userStoriesMap.get(story.user_id) || 0) + 1);
      });

      const userIds = Array.from(userStoriesMap.keys());

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      if (profiles) {
        const { data: viewedData } = user
          ? await supabase
              .from("story_views")
              .select("story_id")
              .eq("viewer_id", user.id)
              .in("story_id", storiesData.map(s => s.id))
          : { data: null };

        const viewedStoryIds = new Set(viewedData?.map(v => v.story_id) || []);

        const users: StoryUser[] = profiles.map((profile) => ({
          user_id: profile.id,
          full_name: profile.full_name || "משתמש",
          avatar_url: profile.avatar_url || "",
          story_count: userStoriesMap.get(profile.id) || 0,
          has_viewed: storiesData
            .filter(s => s.user_id === profile.id)
            .every(s => viewedStoryIds.has(s.id)),
        }));

        users.sort((a, b) => {
          if (a.user_id === user?.id) return -1;
          if (b.user_id === user?.id) return 1;
          if (!a.has_viewed && b.has_viewed) return -1;
          if (a.has_viewed && !b.has_viewed) return 1;
          return 0;
        });

        setStoryUsers(users);
      }
    } else {
      setStoryUsers([]);
    }

    setLoading(false);
  };

  // Check if current user has active stories
  const currentUserHasStory = storyUsers.some(u => u.user_id === user?.id);

  if (loading) {
    return (
      <div className="px-3 py-2 bg-white">
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className="w-[62px] h-[62px] rounded-full bg-gray-200 animate-pulse" />
              <div className="w-10 h-2.5 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-2 py-2 bg-white">
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {/* Your Story - Always first */}
          {user && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer w-[76px]"
              onClick={() => currentUserHasStory ? navigate(`/story/${user.id}`) : setCreateDialogOpen(true)}
            >
              <div className="relative">
                <div className={`w-[62px] h-[62px] rounded-full p-[2px] ${
                  currentUserHasStory 
                    ? "bg-gradient-to-tr from-[#FEDA77] via-[#F58529] via-[#DD2A7B] to-[#8134AF]"
                    : ""
                }`}>
                  <div className="w-full h-full rounded-full bg-white p-[2px]">
                    <Avatar className="w-full h-full">
                      <AvatarImage src={currentUserProfile?.avatar_url} />
                      <AvatarFallback className="bg-gray-100 text-gray-600 text-lg">
                        {currentUserProfile?.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                {!currentUserHasStory && (
                  <div className="absolute bottom-0 right-0 w-[22px] h-[22px] bg-[#0095F6] rounded-full flex items-center justify-center border-[2px] border-white">
                    <Plus className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                  </div>
                )}
              </div>
              <span className="text-[11px] text-[#262626] max-w-[64px] truncate text-center">
                הסטורי שלך
              </span>
            </motion.div>
          )}

          {/* Other users' stories */}
          {storyUsers
            .filter(u => u.user_id !== user?.id)
            .map((storyUser, index) => (
              <motion.div
                key={storyUser.user_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer w-[76px]"
                onClick={() => navigate(`/story/${storyUser.user_id}`)}
              >
                <div className={`w-[62px] h-[62px] rounded-full p-[2px] ${
                  storyUser.has_viewed 
                    ? "bg-gray-300" 
                    : "bg-gradient-to-tr from-[#FEDA77] via-[#F58529] via-[#DD2A7B] to-[#8134AF]"
                }`}>
                  <div className="w-full h-full rounded-full bg-white p-[2px]">
                    <Avatar className="w-full h-full">
                      <AvatarImage src={storyUser.avatar_url} />
                      <AvatarFallback className="bg-gray-100 text-gray-600 text-lg">
                        {storyUser.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <span className="text-[11px] text-[#262626] max-w-[64px] truncate text-center">
                  {storyUser.full_name}
                </span>
              </motion.div>
            ))}

          {storyUsers.length === 0 && !user && (
            <div className="text-center py-4 w-full">
              <p className="text-gray-400 text-xs">התחבר כדי לראות סטוריז</p>
            </div>
          )}
        </div>
      </div>

      <CreateStoryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onStoryCreated={fetchStories}
      />
    </>
  );
};
