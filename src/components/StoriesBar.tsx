import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRequireAuth } from "@/hooks/useRequireAuth";
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
  const { checkAuth, isAuthenticated } = useRequireAuth();
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
      <div className="px-3 py-3 bg-gradient-to-r from-white via-amber-50/30 to-white">
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className="w-[66px] h-[66px] rounded-full bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
              <div className="w-12 h-2.5 bg-gray-200 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleCreateStory = () => {
    if (!checkAuth("כדי ליצור סטורי, יש להתחבר")) return;
    setCreateDialogOpen(true);
  };

  return (
    <>
      <div className="px-2 py-3 bg-gradient-to-r from-white via-amber-50/20 to-white">
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {/* Your Story / Add Story - Always first */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer w-[80px]"
            onClick={() => {
              if (currentUserHasStory && user) {
                navigate(`/story/${user.id}`);
              } else {
                handleCreateStory();
              }
            }}
          >
            <div className="relative">
              <motion.div 
                className={`w-[68px] h-[68px] rounded-full p-[2.5px] ${
                  currentUserHasStory 
                    ? "bg-gradient-to-tr from-petid-gold via-petid-blue to-petid-gold-dark"
                    : "bg-gradient-to-br from-gray-200 to-gray-300"
                }`}
                animate={currentUserHasStory ? {
                  boxShadow: ['0 0 0 0 rgba(247, 191, 0, 0)', '0 0 12px 2px rgba(247, 191, 0, 0.4)', '0 0 0 0 rgba(247, 191, 0, 0)']
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="w-full h-full rounded-full bg-white p-[2px]">
                  <Avatar className="w-full h-full ring-2 ring-white">
                    <AvatarImage src={currentUserProfile?.avatar_url} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-petid-gold/20 to-petid-blue/20 text-petid-blue-dark text-lg font-semibold">
                      {currentUserProfile?.full_name?.charAt(0) || isAuthenticated ? "U" : "+"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </motion.div>
              {!currentUserHasStory && (
                <motion.div 
                  className="absolute bottom-0 right-0 w-[24px] h-[24px] bg-gradient-to-br from-petid-blue to-petid-blue-dark rounded-full flex items-center justify-center border-[2.5px] border-white shadow-md"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Plus className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                </motion.div>
              )}
            </div>
            <span className="text-[11px] font-medium text-foreground max-w-[70px] truncate text-center">
              {isAuthenticated ? "הסטורי שלך" : "הוסף סטורי"}
            </span>
          </motion.div>

          {/* Other users' stories */}
          {storyUsers
            .filter(u => u.user_id !== user?.id)
            .map((storyUser, index) => (
              <motion.div
                key={storyUser.user_id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer w-[80px]"
                onClick={() => navigate(`/story/${storyUser.user_id}`)}
              >
                <motion.div 
                  className={`w-[68px] h-[68px] rounded-full p-[2.5px] ${
                    storyUser.has_viewed 
                      ? "bg-gradient-to-br from-gray-300 to-gray-400" 
                      : "bg-gradient-to-tr from-petid-gold via-petid-blue to-petid-gold-dark"
                  }`}
                  animate={!storyUser.has_viewed ? {
                    boxShadow: ['0 0 0 0 rgba(247, 191, 0, 0)', '0 0 10px 2px rgba(247, 191, 0, 0.3)', '0 0 0 0 rgba(247, 191, 0, 0)']
                  } : {}}
                  transition={{ duration: 2.5, repeat: Infinity, delay: index * 0.2 }}
                >
                  <div className="w-full h-full rounded-full bg-white p-[2px]">
                    <Avatar className="w-full h-full ring-2 ring-white">
                      <AvatarImage src={storyUser.avatar_url} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-petid-gold/20 to-petid-blue/20 text-petid-blue-dark text-lg font-semibold">
                        {storyUser.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </motion.div>
                <span className={`text-[11px] max-w-[70px] truncate text-center ${
                  storyUser.has_viewed ? 'text-muted-foreground' : 'text-foreground font-medium'
                }`}>
                  {storyUser.full_name}
                </span>
              </motion.div>
            ))}

          {storyUsers.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 py-2 px-4"
            >
              <div className="flex -space-x-2 rtl:space-x-reverse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-white" />
                ))}
              </div>
              <p className="text-muted-foreground text-xs">עקוב אחרי חברים לצפות בסטוריז שלהם</p>
            </motion.div>
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
