import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { CreateStoryDialog } from "./CreateStoryDialog";
import defaultPetAvatar from "@/assets/default-pet-avatar.png";

interface StoryUser {
  user_id: string;
  full_name: string;
  avatar_url: string;
  pet_avatar_url: string | null;
  pet_name: string | null;
  story_count: number;
  has_viewed: boolean;
}

// Story ring gradient - Instagram style
const STORY_GRADIENT = "bg-gradient-to-tr from-[#FEDA75] via-[#FA7E1E] via-[#D62976] to-[#962FBF]";
const STORY_GRADIENT_LIVE = "bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCB045]";

export const StoriesBar = () => {
  const { user } = useAuth();
  const { checkAuth, isAuthenticated } = useRequireAuth();
  const navigate = useNavigate();
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ 
    avatar_url: string; 
    full_name: string;
    pet_avatar_url: string | null;
    pet_name: string | null;
  } | null>(null);

  useEffect(() => {
    fetchStories();
    if (user) fetchCurrentUserProfile();
  }, [user]);

  const fetchCurrentUserProfile = async () => {
    if (!user) return;
    
    const { data: profileData } = await supabase
      .from("profiles")
      .select("avatar_url, full_name")
      .eq("id", user.id)
      .single();
    
    const { data: petData } = await supabase
      .from("pets")
      .select("avatar_url, name")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    
    if (profileData) {
      setCurrentUserProfile({
        ...profileData,
        pet_avatar_url: petData?.avatar_url || null,
        pet_name: petData?.name || null,
      });
    }
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

      const { data: petsData } = await supabase
        .from("pets")
        .select("user_id, avatar_url, name")
        .in("user_id", userIds)
        .eq("archived", false);

      if (profiles) {
        const { data: viewedData } = user
          ? await supabase
              .from("story_views")
              .select("story_id")
              .eq("viewer_id", user.id)
              .in("story_id", storiesData.map(s => s.id))
          : { data: null };

        const viewedStoryIds = new Set(viewedData?.map(v => v.story_id) || []);

        const userPetMap = new Map<string, { avatar_url: string | null; name: string | null }>();
        petsData?.forEach(pet => {
          if (!userPetMap.has(pet.user_id)) {
            userPetMap.set(pet.user_id, { avatar_url: pet.avatar_url, name: pet.name });
          }
        });

        const users: StoryUser[] = profiles.map((profile) => {
          const pet = userPetMap.get(profile.id);
          return {
            user_id: profile.id,
            full_name: profile.full_name || "משתמש",
            avatar_url: profile.avatar_url || "",
            pet_avatar_url: pet?.avatar_url || null,
            pet_name: pet?.name || null,
            story_count: userStoriesMap.get(profile.id) || 0,
            has_viewed: storiesData
              .filter(s => s.user_id === profile.id)
              .every(s => viewedStoryIds.has(s.id)),
          };
        });

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

  const currentUserHasStory = storyUsers.some(u => u.user_id === user?.id);

  const handleCreateStory = () => {
    if (!checkAuth("כדי ליצור סטורי, יש להתחבר")) return;
    setCreateDialogOpen(true);
  };

  const getDisplayImage = (petAvatar: string | null | undefined, userAvatar: string | null | undefined) => {
    return petAvatar || userAvatar || defaultPetAvatar;
  };

  // Skeleton loading with smooth animation
  if (loading) {
    return (
      <div className="px-4 py-3 bg-card border-b border-border">
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {[...Array(6)].map((_, i) => (
            <motion.div 
              key={i} 
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <div className="w-[68px] h-[68px] rounded-full bg-muted animate-pulse" />
              <div className="w-14 h-2.5 bg-muted rounded-full animate-pulse" />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-3 bg-card border-b border-border">
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {/* Your Story */}
          <motion.div
            className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group"
            onClick={() => {
              if (currentUserHasStory && user) {
                navigate(`/story/${user.id}`);
              } else {
                handleCreateStory();
              }
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative">
              {/* Animated gradient ring for unseen stories */}
              <div 
                className={`w-[68px] h-[68px] rounded-full p-[2.5px] transition-all duration-300 ${
                  currentUserHasStory 
                    ? STORY_GRADIENT
                    : "bg-gradient-to-br from-muted to-muted-foreground/20"
                }`}
              >
                <div className="w-full h-full rounded-full bg-card p-[2px]">
                  <Avatar className="w-full h-full ring-0 transition-transform duration-300 group-hover:scale-105">
                    <AvatarImage 
                      src={getDisplayImage(currentUserProfile?.pet_avatar_url, currentUserProfile?.avatar_url)} 
                      className="object-cover" 
                    />
                    <AvatarFallback className="bg-muted text-muted-foreground text-lg font-semibold">
                      {currentUserProfile?.pet_name?.charAt(0) || currentUserProfile?.full_name?.charAt(0) || "+"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              
              {/* Plus button with pulse animation */}
              {!currentUserHasStory && (
                <motion.div 
                  className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-[2.5px] border-card shadow-lg"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <Plus className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
                </motion.div>
              )}
            </div>
            <span className="text-[11px] text-foreground font-medium max-w-[68px] truncate text-center">
              הסטורי שלך
            </span>
          </motion.div>

          {/* Other users' stories */}
          <AnimatePresence>
            {storyUsers
              .filter(u => u.user_id !== user?.id)
              .map((storyUser, index) => (
                <motion.div
                  key={storyUser.user_id}
                  className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group"
                  onClick={() => navigate(`/story/${storyUser.user_id}`)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                >
                  <div className="relative">
                    {/* Gradient ring - colored for unseen, gray for seen */}
                    <div 
                      className={`w-[68px] h-[68px] rounded-full p-[2.5px] transition-all duration-300 ${
                        storyUser.has_viewed 
                          ? "bg-muted" 
                          : STORY_GRADIENT
                      }`}
                    >
                      <div className="w-full h-full rounded-full bg-card p-[2px]">
                        <Avatar className="w-full h-full transition-transform duration-300 group-hover:scale-105">
                          <AvatarImage 
                            src={getDisplayImage(storyUser.pet_avatar_url, storyUser.avatar_url)} 
                            className="object-cover" 
                          />
                          <AvatarFallback className="bg-muted text-muted-foreground text-lg font-semibold">
                            {storyUser.pet_name?.charAt(0) || storyUser.full_name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    
                    {/* Story count indicator */}
                    {storyUser.story_count > 1 && !storyUser.has_viewed && (
                      <motion.div 
                        className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-card text-[10px] font-bold text-primary-foreground"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      >
                        {storyUser.story_count}
                      </motion.div>
                    )}
                  </div>
                  <span className={`text-[11px] max-w-[68px] truncate text-center font-medium transition-colors ${
                    storyUser.has_viewed ? 'text-muted-foreground' : 'text-foreground'
                  }`}>
                    {storyUser.pet_name || storyUser.full_name}
                  </span>
                </motion.div>
              ))}
          </AnimatePresence>

          {/* Empty state */}
          {storyUsers.length === 0 && (
            <motion.div 
              className="flex items-center gap-4 py-2 px-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex -space-x-3 rtl:space-x-reverse">
                {[1, 2, 3].map((i) => (
                  <motion.div 
                    key={i} 
                    className="w-12 h-12 rounded-full bg-muted border-[3px] border-card flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1, type: "spring", stiffness: 400 }}
                  >
                    <Sparkles className="w-5 h-5 text-muted-foreground/50" />
                  </motion.div>
                ))}
              </div>
              <div className="text-right" dir="rtl">
                <p className="text-foreground text-xs font-semibold">אין סטוריז עדיין</p>
                <p className="text-muted-foreground text-[11px]">עקוב אחרי חברים או צור את הסטורי הראשון!</p>
              </div>
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
