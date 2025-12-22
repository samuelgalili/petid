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
      <div className="px-4 py-3 bg-background border-b border-border">
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
              <div className="w-12 h-2.5 bg-muted rounded-full animate-pulse" />
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
      <div className="px-4 py-3 bg-background border-b border-border">
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {/* Your Story - Instagram style */}
          <div
            className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
            onClick={() => {
              if (currentUserHasStory && user) {
                navigate(`/story/${user.id}`);
              } else {
                handleCreateStory();
              }
            }}
          >
            <div className="relative">
              <div 
                className={`w-16 h-16 rounded-full p-[2px] ${
                  currentUserHasStory 
                    ? "bg-gradient-to-tr from-[#FEDA75] via-[#FA7E1E] via-[#D62976] to-[#962FBF]"
                    : "bg-muted"
                }`}
              >
                <div className="w-full h-full rounded-full bg-background p-[2px]">
                  <Avatar className="w-full h-full">
                    <AvatarImage 
                      src={getDisplayImage(currentUserProfile?.pet_avatar_url, currentUserProfile?.avatar_url)} 
                      className="object-cover" 
                    />
                    <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                      {currentUserProfile?.pet_name?.charAt(0) || currentUserProfile?.full_name?.charAt(0) || "+"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              {!currentUserHasStory && (
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                  <Plus className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                </div>
              )}
            </div>
            <span className="text-[11px] text-foreground max-w-16 truncate text-center">
              Your story
            </span>
          </div>

          {/* Other users' stories - Instagram gradient */}
          {storyUsers
            .filter(u => u.user_id !== user?.id)
            .map((storyUser) => (
              <div
                key={storyUser.user_id}
                className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
                onClick={() => navigate(`/story/${storyUser.user_id}`)}
              >
                <div 
                  className={`w-16 h-16 rounded-full p-[2px] ${
                    storyUser.has_viewed 
                      ? "bg-muted" 
                      : "bg-gradient-to-tr from-[#FEDA75] via-[#FA7E1E] via-[#D62976] to-[#962FBF]"
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-background p-[2px]">
                    <Avatar className="w-full h-full">
                      <AvatarImage 
                        src={getDisplayImage(storyUser.pet_avatar_url, storyUser.avatar_url)} 
                        className="object-cover" 
                      />
                      <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                        {storyUser.pet_name?.charAt(0) || storyUser.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <span className={`text-[11px] max-w-16 truncate text-center ${
                  storyUser.has_viewed ? 'text-muted-foreground' : 'text-foreground'
                }`}>
                  {storyUser.pet_name || storyUser.full_name}
                </span>
              </div>
            ))}

          {storyUsers.length === 0 && (
            <div className="flex items-center gap-4 py-2 px-3">
              <div className="flex -space-x-3 rtl:space-x-reverse">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i} 
                    className="w-12 h-12 rounded-full bg-muted border-[3px] border-background" 
                  />
                ))}
              </div>
              <p className="text-muted-foreground text-xs font-medium">עקוב אחרי חברים לצפות<br/>בסטוריז שלהם</p>
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
