import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Sparkles, MapPin, ShoppingBag, Heart, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { CreateStoryDialog } from "./CreateStoryDialog";
import defaultPetAvatar from "@/assets/default-pet-avatar.png";
import type { FeedTab } from "@/components/feed";

interface StoryUser {
  user_id: string;
  full_name: string;
  avatar_url: string;
  pet_avatar_url: string | null;
  pet_name: string | null;
  story_count: number;
  has_viewed: boolean;
  city?: string | null;
  is_business?: boolean;
}

interface StoriesBarProps {
  activeTab?: FeedTab;
  userCity?: string | null;
  followingIds?: string[];
}

// Story ring gradient - Instagram style
const STORY_GRADIENT = "bg-gradient-to-tr from-[#FEDA75] via-[#FA7E1E] via-[#D62976] to-[#962FBF]";
const STORY_GRADIENT_LIVE = "bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCB045]";
const STORY_GRADIENT_NEARBY = "bg-gradient-to-tr from-[#00C9FF] to-[#92FE9D]";
const STORY_GRADIENT_SHOP = "bg-gradient-to-tr from-[#f093fb] to-[#f5576c]";

// Tab-specific labels
const TAB_LABELS: Record<FeedTab, string> = {
  foryou: "סטוריז",
  following: "עוקבים",
  dogparks: "גינות כלבים",
  explore: "גלה",
  nearby: "בסביבה",
  marketplace: "חנויות",
  adopt: "אימוץ"
};

export const StoriesBar = ({ activeTab = "foryou", userCity, followingIds = [] }: StoriesBarProps) => {
  const { user } = useAuth();
  const { checkAuth, isAuthenticated } = useRequireAuth();
  const navigate = useNavigate();
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shouldHide, setShouldHide] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ 
    avatar_url: string; 
    full_name: string;
    pet_avatar_url: string | null;
    pet_name: string | null;
  } | null>(null);

  // Hide stories bar after 1 second if no stories exist
  useEffect(() => {
    if (!loading && storyUsers.length === 0) {
      const timer = setTimeout(() => {
        setShouldHide(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShouldHide(false);
    }
  }, [loading, storyUsers.length]);

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
        .select("id, full_name, avatar_url, city")
        .in("id", userIds);

      const { data: petsData } = await supabase
        .from("pets")
        .select("user_id, avatar_url, name")
        .in("user_id", userIds)
        .eq("archived", false);

      // Check for business profiles
      const { data: businessProfiles } = await supabase
        .from("business_profiles")
        .select("user_id")
        .in("user_id", userIds);

      if (profiles) {
        const { data: viewedData } = user
          ? await supabase
              .from("story_views")
              .select("story_id")
              .eq("viewer_id", user.id)
              .in("story_id", storiesData.map(s => s.id))
          : { data: null };

        const viewedStoryIds = new Set(viewedData?.map(v => v.story_id) || []);
        const businessUserIds = new Set(businessProfiles?.map(bp => bp.user_id) || []);

        const userPetMap = new Map<string, { avatar_url: string | null; name: string | null }>();
        petsData?.forEach(pet => {
          if (!userPetMap.has(pet.user_id)) {
            userPetMap.set(pet.user_id, { avatar_url: pet.avatar_url, name: pet.name });
          }
        });

        const users: StoryUser[] = profiles.map((profile: any) => {
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
            city: profile.city || null,
            is_business: businessUserIds.has(profile.id),
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

  // Filter stories based on active tab
  const filteredStoryUsers = storyUsers.filter(storyUser => {
    // Always include current user's story
    if (storyUser.user_id === user?.id) return true;
    
    switch (activeTab) {
      case "following":
        return followingIds.includes(storyUser.user_id);
      case "nearby":
        // Filter by same city if user has location
        if (!userCity) return true; // Show all if no location
        return storyUser.city?.toLowerCase() === userCity.toLowerCase();
      case "marketplace":
        // Only show business profiles
        return storyUser.is_business;
      case "adopt":
        // Show all for now - could filter by adoption-related content
        return true;
      case "foryou":
      default:
        return true;
    }
  });

  // Get gradient based on tab
  const getStoryGradient = (storyUser: StoryUser) => {
    if (storyUser.has_viewed) return "bg-muted";
    if (activeTab === "nearby") return STORY_GRADIENT_NEARBY;
    if (activeTab === "marketplace" && storyUser.is_business) return STORY_GRADIENT_SHOP;
    return STORY_GRADIENT;
  };

  // Get tab icon for empty state
  const getTabIcon = () => {
    switch (activeTab) {
      case "following": return <Users className="w-5 h-5 text-muted-foreground/50" />;
      case "nearby": return <MapPin className="w-5 h-5 text-muted-foreground/50" />;
      case "marketplace": return <ShoppingBag className="w-5 h-5 text-muted-foreground/50" />;
      case "adopt": return <Heart className="w-5 h-5 text-muted-foreground/50" />;
      default: return <Sparkles className="w-5 h-5 text-muted-foreground/50" />;
    }
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

  // Hide the entire component if no stories after delay
  if (shouldHide) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
      <motion.div 
        className="px-4 py-3 bg-card border-b border-border"
        initial={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
      >
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
              {/* Gradient border - Rounded Square */}
              <div 
                className={`w-[68px] h-[68px] rounded-2xl p-[2.5px] transition-all duration-300 ${
                  currentUserHasStory 
                    ? "bg-gradient-to-br from-primary via-accent to-secondary"
                    : "bg-muted"
                }`}
              >
                <div className="w-full h-full rounded-xl bg-card overflow-hidden">
                  <Avatar className="w-full h-full rounded-xl transition-transform duration-300 group-hover:scale-105">
                    <AvatarImage 
                      src={getDisplayImage(currentUserProfile?.pet_avatar_url, currentUserProfile?.avatar_url)} 
                      className="object-cover rounded-xl" 
                    />
                    <AvatarFallback className="bg-muted text-muted-foreground text-lg font-semibold rounded-xl">
                      {currentUserProfile?.pet_name?.charAt(0) || currentUserProfile?.full_name?.charAt(0) || "+"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              
              {/* Plus button */}
              {!currentUserHasStory && (
                <motion.div 
                  className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-primary rounded-lg flex items-center justify-center border-[2.5px] border-card shadow-lg"
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

          {/* Other users' stories - filtered by tab */}
          <AnimatePresence>
            {filteredStoryUsers
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
                    {/* Gradient ring - Rounded Square */}
                    <div 
                      className={`w-[68px] h-[68px] rounded-2xl p-[2.5px] transition-all duration-300 ${
                        storyUser.has_viewed 
                          ? "bg-muted" 
                          : "bg-gradient-to-br from-primary via-accent to-secondary"
                      }`}
                    >
                      <div className="w-full h-full rounded-xl bg-card overflow-hidden">
                        <Avatar className="w-full h-full rounded-xl transition-transform duration-300 group-hover:scale-105">
                          <AvatarImage 
                            src={getDisplayImage(storyUser.pet_avatar_url, storyUser.avatar_url)} 
                            className="object-cover rounded-xl" 
                          />
                          <AvatarFallback className="bg-muted text-muted-foreground text-lg font-semibold rounded-xl">
                            {storyUser.pet_name?.charAt(0) || storyUser.full_name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    
                    {/* Story count indicator - always show when more than 1 story */}
                    {storyUser.story_count > 1 && (
                      <motion.div 
                        className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-card text-[10px] font-bold ${
                          storyUser.has_viewed 
                            ? "bg-muted text-muted-foreground" 
                            : "bg-primary text-primary-foreground"
                        }`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      >
                        {storyUser.story_count}
                      </motion.div>
                    )}

                    {/* Location badge for nearby tab */}
                    {activeTab === "nearby" && storyUser.city && (
                      <motion.div 
                        className="absolute -bottom-0.5 -left-0.5 px-1.5 py-0.5 bg-card rounded-full flex items-center gap-0.5 border border-border text-[8px] text-muted-foreground"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0.1 }}
                      >
                        <MapPin className="w-2.5 h-2.5" />
                      </motion.div>
                    )}

                    {/* Business badge for marketplace tab */}
                    {activeTab === "marketplace" && storyUser.is_business && (
                      <motion.div 
                        className="absolute -bottom-0.5 -left-0.5 px-1.5 py-0.5 bg-primary rounded-full flex items-center gap-0.5 border-2 border-card text-[8px] text-primary-foreground"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0.1 }}
                      >
                        <ShoppingBag className="w-2.5 h-2.5" />
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

          {/* Empty state - context aware */}
          {filteredStoryUsers.filter(u => u.user_id !== user?.id).length === 0 && (
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
                    {getTabIcon()}
                  </motion.div>
                ))}
              </div>
              <div className="text-right" dir="rtl">
                <p className="text-foreground text-xs font-semibold">
                  {activeTab === "following" && "אין סטוריז מעוקבים"}
                  {activeTab === "nearby" && "אין סטוריז בסביבה"}
                  {activeTab === "marketplace" && "אין סטוריז מחנויות"}
                  {activeTab === "adopt" && "אין סטוריז אימוץ"}
                  {activeTab === "foryou" && "אין סטוריז עדיין"}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  {activeTab === "following" && "עקוב אחרי חברים כדי לראות סטוריז"}
                  {activeTab === "nearby" && userCity ? `אין סטוריז ב${userCity}` : "אפשר גישה למיקום כדי לראות סטוריז קרובים"}
                  {activeTab === "marketplace" && "עקוב אחרי חנויות כדי לראות מבצעים"}
                  {activeTab === "adopt" && "עקוב אחרי עמותות אימוץ"}
                  {activeTab === "foryou" && "עקוב אחרי חברים או צור את הסטורי הראשון!"}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
      </AnimatePresence>

      <CreateStoryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onStoryCreated={fetchStories}
      />
    </>
  );
};
