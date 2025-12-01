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

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    setLoading(true);

    // Get all active stories (not expired)
    const { data: storiesData } = await supabase
      .from("stories")
      .select("user_id, id")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (storiesData && storiesData.length > 0) {
      // Group stories by user
      const userStoriesMap = new Map<string, number>();
      storiesData.forEach((story) => {
        userStoriesMap.set(story.user_id, (userStoriesMap.get(story.user_id) || 0) + 1);
      });

      // Get unique user IDs
      const userIds = Array.from(userStoriesMap.keys());

      // Fetch user profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      if (profiles) {
        // Check which stories current user has viewed
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
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          story_count: userStoriesMap.get(profile.id) || 0,
          has_viewed: storiesData
            .filter(s => s.user_id === profile.id)
            .every(s => viewedStoryIds.has(s.id)),
        }));

        // Sort: own stories first, then unviewed, then viewed
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

  if (loading) {
    return (
      <div className="px-4 py-3 border-b border-gray-100 bg-white">
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse" />
              <div className="w-12 h-3 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-3 border-b border-gray-100 bg-white">
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {/* Add Story Button */}
          {user && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer"
              onClick={() => setCreateDialogOpen(true)}
            >
              <div className="relative">
                <Avatar className="w-16 h-16 ring-2 ring-gray-300">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-white">
                    {user.user_metadata?.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                  <Plus className="w-3 h-3 text-white" />
                </div>
              </div>
              <span className="text-xs font-jakarta text-gray-700">הסטורי שלך</span>
            </motion.div>
          )}

          {/* Stories from other users */}
          {storyUsers.map((storyUser, index) => (
            <motion.div
              key={storyUser.user_id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer"
              onClick={() => navigate(`/story/${storyUser.user_id}`)}
            >
              <div className={`p-0.5 rounded-full ${
                storyUser.has_viewed 
                  ? 'bg-gray-300' 
                  : 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500'
              }`}>
                <Avatar className="w-16 h-16 ring-2 ring-white">
                  <AvatarImage src={storyUser.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-white">
                    {storyUser.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-xs font-jakarta text-gray-700 max-w-[64px] truncate">
                {storyUser.user_id === user?.id ? "אתה" : storyUser.full_name}
              </span>
            </motion.div>
          ))}

          {storyUsers.length === 0 && !user && (
            <div className="text-center py-4 w-full">
              <p className="text-gray-500 font-jakarta text-sm">אין סטוריז פעילים כרגע</p>
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