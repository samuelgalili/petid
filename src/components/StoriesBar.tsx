import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
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
    
    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("avatar_url, full_name")
      .eq("id", user.id)
      .single();
    
    // Fetch first pet for avatar
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

      // Fetch pets for all users
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

        // Create a map of user_id to their first pet
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

  // Check if current user has active stories
  const currentUserHasStory = storyUsers.some(u => u.user_id === user?.id);

  if (loading) {
    return (
      <div className="px-4 py-4 bg-gradient-to-r from-[#DD2A7B]/5 via-[#F58529]/5 to-[#8134AF]/5">
        <div className="flex gap-5 overflow-x-auto no-scrollbar">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-[#DD2A7B]/20 to-[#F58529]/20 animate-pulse" />
              <div className="w-14 h-3 bg-muted rounded-full animate-pulse" />
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

  // Get the display image - prefer pet avatar, fallback to user avatar
  const getDisplayImage = (petAvatar: string | null | undefined, userAvatar: string | null | undefined) => {
    return petAvatar || userAvatar || defaultPetAvatar;
  };

  return (
    <>
      <div className="px-4 py-4 bg-gradient-to-r from-[#DD2A7B]/5 via-[#F58529]/5 to-[#8134AF]/5">
        <div className="flex gap-5 overflow-x-auto no-scrollbar">
          {/* Your Story / Add Story - Always first */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer"
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
                className={`w-[72px] h-[72px] rounded-full p-[3px] ${
                  currentUserHasStory 
                    ? "bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]"
                    : "bg-gradient-to-br from-border to-muted-foreground/30"
                }`}
                animate={currentUserHasStory ? {
                  boxShadow: ['0 0 0 0 rgba(221, 42, 123, 0)', '0 0 15px 3px rgba(221, 42, 123, 0.4)', '0 0 0 0 rgba(221, 42, 123, 0)']
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="w-full h-full rounded-full bg-background p-[2px]">
                  <Avatar className="w-full h-full">
                    <AvatarImage 
                      src={getDisplayImage(currentUserProfile?.pet_avatar_url, currentUserProfile?.avatar_url)} 
                      className="object-cover" 
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary text-xl font-bold">
                      {currentUserProfile?.pet_name?.charAt(0) || currentUserProfile?.full_name?.charAt(0) || (isAuthenticated ? "U" : "+")}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </motion.div>
              {!currentUserHasStory && (
                <motion.div 
                  className="absolute -bottom-0.5 -right-0.5 w-[26px] h-[26px] bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center border-[3px] border-background shadow-lg"
                  whileHover={{ scale: 1.15, rotate: 90 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Plus className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
                </motion.div>
              )}
            </div>
            <span className="text-[11px] font-semibold text-foreground max-w-[72px] truncate text-center">
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
                className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer"
                onClick={() => navigate(`/story/${storyUser.user_id}`)}
              >
                <motion.div 
                  className={`w-[72px] h-[72px] rounded-full p-[3px] ${
                    storyUser.has_viewed 
                      ? "bg-gradient-to-br from-muted-foreground/40 to-muted-foreground/20" 
                      : "bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]"
                  }`}
                  animate={!storyUser.has_viewed ? {
                    boxShadow: ['0 0 0 0 rgba(221, 42, 123, 0)', '0 0 12px 2px rgba(221, 42, 123, 0.35)', '0 0 0 0 rgba(221, 42, 123, 0)']
                  } : {}}
                  transition={{ duration: 2.5, repeat: Infinity, delay: index * 0.2 }}
                >
                  <div className="w-full h-full rounded-full bg-background p-[2px]">
                    <Avatar className="w-full h-full">
                      <AvatarImage 
                        src={getDisplayImage(storyUser.pet_avatar_url, storyUser.avatar_url)} 
                        className="object-cover" 
                      />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary text-xl font-bold">
                        {storyUser.pet_name?.charAt(0) || storyUser.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </motion.div>
                <span className={`text-[11px] max-w-[72px] truncate text-center ${
                  storyUser.has_viewed ? 'text-muted-foreground font-medium' : 'text-foreground font-semibold'
                }`}>
                  {storyUser.pet_name || storyUser.full_name}
                </span>
              </motion.div>
            ))}

          {storyUsers.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-4 py-2 px-3"
            >
              <div className="flex -space-x-3 rtl:space-x-reverse">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i} 
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-muted to-muted/60 border-[3px] border-background shadow-sm" 
                  />
                ))}
              </div>
              <p className="text-muted-foreground text-xs font-medium">עקוב אחרי חברים לצפות<br/>בסטוריז שלהם</p>
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
