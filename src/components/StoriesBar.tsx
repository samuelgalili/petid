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
      <div className="px-4 py-4 bg-white">
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 animate-pulse" />
              <div className="w-12 h-3 bg-gray-100 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-4 bg-white">
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
          {/* Add Story Button */}
          {user && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer"
              onClick={() => setCreateDialogOpen(true)}
            >
              <div className="relative">
                <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-[3px]">
                  <Avatar className="w-full h-full ring-2 ring-white">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white font-black text-lg">
                      {user.user_metadata?.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <motion.div 
                  className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-gradient-to-r from-[#FF6B9D] to-[#C44FE2] rounded-full flex items-center justify-center shadow-md border-2 border-white"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                >
                  <Plus className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                </motion.div>
              </div>
              <span className="text-[11px] font-jakarta font-semibold text-gray-600">הסטורי שלי</span>
            </motion.div>
          )}

          {/* Stories from other users */}
          {storyUsers.map((storyUser, index) => (
            <motion.div
              key={storyUser.user_id}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 20 }}
              className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer"
              onClick={() => navigate(`/story/${storyUser.user_id}`)}
            >
              <div className="relative">
                <div 
                  className={`w-[72px] h-[72px] rounded-full p-[3px] ${
                    storyUser.has_viewed 
                      ? 'bg-gray-200' 
                      : 'bg-gradient-to-tr from-[#FF6B9D] via-[#C44FE2] to-[#7B68EE]'
                  }`}
                >
                  <Avatar className="w-full h-full ring-[3px] ring-white">
                    <AvatarImage src={storyUser.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white font-black text-lg">
                      {storyUser.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
                {!storyUser.has_viewed && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF6B9D] rounded-full border-2 border-white"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
              </div>
              <span className="text-[11px] font-jakarta font-semibold text-gray-600 max-w-[72px] truncate text-center">
                {storyUser.user_id === user?.id ? "אתה" : storyUser.full_name}
              </span>
            </motion.div>
          ))}

          {storyUsers.length === 0 && !user && (
            <div className="text-center py-4 w-full">
              <p className="text-gray-400 font-jakarta text-sm">אין סטוריז פעילים 📸</p>
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
