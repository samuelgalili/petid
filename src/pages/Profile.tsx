import { useState, useEffect, useCallback } from "react";
import { PageTransition } from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Menu,
  Plus,
  Camera,
  Grid3X3,
  Film,
  UserSquare,
  RefreshCw,
  Settings,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";
import petidIcon from "@/assets/petid-icon.png";
import { ProfileImageEditor } from "@/components/ProfileImageEditor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { RoleBadge } from "@/components/RoleBadge";
import { QRCodeProfile } from "@/components/QRCodeProfile";
import { CloseFriendsManager } from "@/components/CloseFriendsManager";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";
import { PostGrid } from "@/components/profile/PostGrid";
import { AnimatedCounter } from "@/components/profile/AnimatedCounter";
import { MutualFollowers } from "@/components/profile/MutualFollowers";
import { ActivityStatus } from "@/components/profile/ActivityStatus";
import { BusinessInsightsBar } from "@/components/profile/BusinessInsightsBar";
import { PetRecommendations } from "@/components/profile/PetRecommendations";

interface Pet {
  id: string;
  name: string;
  type: 'dog' | 'cat';
  breed?: string;
  age_years?: number;
  age_months?: number;
  size?: string;
  avatar_url?: string;
}

const Profile = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [showQRCode, setShowQRCode] = useState(false);
  const [showCloseFriends, setShowCloseFriends] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);

  // Get selected pet object
  const selectedPet = pets.find(p => p.id === selectedPetId) || null;

  // Fetch user stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['profile-stats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return { posts: 0, followers: 0, following: 0 };
      
      const [postsRes, followersRes, followingRes] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact' }).eq('user_id', profile.id),
        supabase.from('user_follows').select('id', { count: 'exact' }).eq('following_id', profile.id),
        supabase.from('user_follows').select('id', { count: 'exact' }).eq('follower_id', profile.id)
      ]);
      
      return {
        posts: postsRes.count || 0,
        followers: followersRes.count || 0,
        following: followingRes.count || 0
      };
    },
    enabled: !!profile?.id
  });

  // Fetch user posts with likes/comments counts
  const { data: posts, refetch: refetchPosts } = useQuery({
    queryKey: ['user-posts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      
      if (!postsData) return [];

      const postIds = postsData.map(p => p.id);
      const [likesRes, commentsRes] = await Promise.all([
        supabase.from('post_likes').select('post_id').in('post_id', postIds),
        supabase.from('post_comments').select('post_id').in('post_id', postIds)
      ]);

      const likesCount: Record<string, number> = {};
      const commentsCount: Record<string, number> = {};
      
      likesRes.data?.forEach(l => {
        likesCount[l.post_id] = (likesCount[l.post_id] || 0) + 1;
      });
      commentsRes.data?.forEach(c => {
        commentsCount[c.post_id] = (commentsCount[c.post_id] || 0) + 1;
      });

      return postsData.map(post => ({
        ...post,
        likes_count: likesCount[post.id] || 0,
        comments_count: commentsCount[post.id] || 0
      }));
    },
    enabled: !!profile?.id
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  // Update last seen on mount
  useEffect(() => {
    const updateLastSeen = async () => {
      if (profile?.id) {
        await supabase
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString(), is_online: true } as any)
          .eq('id', profile.id);
      }
    };
    updateLastSeen();

    return () => {
      if (profile?.id) {
        supabase
          .from('profiles')
          .update({ is_online: false } as any)
          .eq('id', profile.id);
      }
    };
  }, [profile?.id]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      setProfile({ ...profileData, id: user.id });

      const { data: petsData } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      const fetchedPets = (petsData || []) as Pet[];
      setPets(fetchedPets);
      
      // Auto-select first pet if available
      if (fetchedPets.length > 0 && !selectedPetId) {
        setSelectedPetId(fetchedPets[0].id);
      }

    } catch (error: any) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Pull to refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY > 0 && window.scrollY === 0) {
      const distance = e.touches[0].clientY - startY;
      if (distance > 0) {
        setPullDistance(Math.min(distance * 0.5, 100));
      }
    }
  }, [startY]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 60) {
      setIsRefreshing(true);
      await Promise.all([
        fetchAllData(),
        refetchStats(),
        refetchPosts()
      ]);
      toast({ description: "הפרופיל עודכן" });
      setIsRefreshing(false);
    }
    setPullDistance(0);
    setStartY(0);
  }, [pullDistance, refetchStats, refetchPosts, toast]);

  // Handle pet selection
  const handlePetSelect = (petId: string) => {
    setSelectedPetId(petId);
  };

  if (loading) {
    return (
      <PageTransition>
        <ProfileSkeleton />
        <BottomNav />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div 
        className="h-screen bg-background overflow-hidden flex flex-col" 
        dir="rtl"
      >
        <div 
          className="flex-1 overflow-y-auto pb-[70px]"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Pull to Refresh Indicator */}
          <AnimatePresence>
            {pullDistance > 0 && (
              <motion.div 
                className="absolute top-0 left-0 right-0 flex justify-center z-50 bg-background"
                initial={{ height: 0, opacity: 0 }}
                animate={{ 
                  height: pullDistance, 
                  opacity: pullDistance > 30 ? 1 : pullDistance / 30 
                }}
                exit={{ height: 0, opacity: 0 }}
              >
                <motion.div
                  animate={{ 
                    rotate: isRefreshing ? 360 : pullDistance * 3.6,
                    scale: pullDistance > 60 ? 1.2 : 1 
                  }}
                  transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
                  className="flex items-center justify-center"
                >
                  <RefreshCw className={`w-6 h-6 ${pullDistance > 60 ? 'text-primary' : 'text-muted-foreground'}`} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Clean Header */}
          <motion.div 
            className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/10"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div className="flex items-center justify-between px-4 h-12">
              <div className="flex items-center gap-2.5">
                <motion.img 
                  src={petidIcon} 
                  alt="PetID" 
                  className="w-6 h-6 object-contain"
                  whileHover={{ rotate: 10 }}
                />
                <motion.h1 
                  className="text-lg font-bold text-foreground"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {profile?.full_name?.split(' ')[0] || 'משתמש'}
                </motion.h1>
                <RoleBadge size="sm" />
              </div>
              <motion.button 
                onClick={() => setIsMenuOpen(true)}
                className="p-2 rounded-xl hover:bg-muted/60 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Menu className="w-5 h-5 text-foreground" />
              </motion.button>
            </div>
          </motion.div>

          {/* Profile Header Section */}
          <motion.div 
            className="px-5 pt-5"
            style={{ transform: `translateY(${pullDistance * 0.3}px)` }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Avatar and Stats Row */}
            <div className="flex items-start gap-6 mb-4">
              {/* Profile Picture with Premium Ring */}
              <div className="relative flex-shrink-0">
                <motion.div 
                  className="relative"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Gradient ring */}
                  <div className="w-[88px] h-[88px] rounded-full p-[3px] bg-gradient-to-br from-primary via-accent to-primary-light">
                    <div className="w-full h-full rounded-full bg-background p-[2px]">
                      <Avatar className="w-full h-full">
                        <AvatarImage src={profile?.avatar_url} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-muted to-muted/60 text-foreground/80 font-bold text-2xl">
                          {profile?.full_name?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                </motion.div>
                <motion.button
                  onClick={() => setIsImageEditorOpen(true)}
                  className="absolute -bottom-0.5 -right-0.5 w-7 h-7 bg-primary rounded-full flex items-center justify-center ring-2 ring-background shadow-md"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Plus className="w-4 h-4 text-primary-foreground" />
                </motion.button>
              </div>

              {/* Stats Grid */}
              <div className="flex-1 grid grid-cols-3 gap-1 pt-2">
                {[
                  { value: stats?.posts || 0, label: 'פוסטים', onClick: () => setActiveTab("posts") },
                  { value: stats?.followers || 0, label: 'עוקבים', onClick: () => {} },
                  { value: stats?.following || 0, label: 'עוקב', onClick: () => {} }
                ].map((stat, index) => (
                  <motion.button 
                    key={stat.label}
                    className="text-center py-1.5 rounded-xl hover:bg-muted/40 transition-colors"
                    onClick={stat.onClick}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + index * 0.05 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <p className="text-lg font-bold text-foreground tabular-nums">
                      <AnimatedCounter value={stat.value} />
                    </p>
                    <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                  </motion.button>
                ))}
              </div>
            </div>
            
            {/* Bio Section */}
            <motion.div 
              className="mb-4 space-y-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-foreground text-[15px]">{profile?.full_name || "משתמש"}</h2>
                <ActivityStatus userId={profile?.id} size="sm" />
              </div>
              {profile?.bio && (
                <p className="text-foreground/85 text-sm leading-relaxed">{profile.bio}</p>
              )}
              {pets.length > 0 && (
                <p className="text-muted-foreground text-[13px] flex items-center gap-1.5">
                  <span className="text-base">🐾</span>
                  בעל/ת {pets.length} חיות מחמד
                </p>
              )}
              
              {/* Points & Rank - Inline */}
              <div className="flex items-center gap-3 pt-1">
                <span className="text-[12px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                  🏆 {profile?.rank || 'גור'}
                </span>
                <span className="text-[12px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                  ⭐ {profile?.points || 0} נקודות
                </span>
              </div>
              
              {/* Mutual Followers */}
              <div className="pt-0.5">
                <MutualFollowers userId={profile?.id} currentUserId={profile?.id} />
              </div>
            </motion.div>

            {/* Business Insights - Instagram style */}
            <BusinessInsightsBar />

            {/* Action Buttons Row */}
            <motion.div 
              className="flex gap-2 mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button 
                variant="secondary"
                className="flex-1 h-9 rounded-lg text-[13px] font-semibold bg-muted hover:bg-muted/80"
                onClick={() => navigate('/edit-profile')}
              >
                עריכת פרופיל
              </Button>
              <Button 
                variant="secondary"
                className="flex-1 h-9 rounded-lg text-[13px] font-semibold bg-muted hover:bg-muted/80"
                onClick={() => setShowQRCode(true)}
              >
                שיתוף פרופיל
              </Button>
              <Button 
                variant="secondary"
                className="h-9 w-9 rounded-lg bg-muted hover:bg-muted/80 p-0"
                onClick={() => navigate('/settings')}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </motion.div>

            {/* Pet Selection - Story Style with Selection State */}
            <motion.div 
              className="mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-foreground">החיות שלי</span>
                {selectedPet && (
                  <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {selectedPet.name}
                  </span>
                )}
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {/* Add New Pet */}
                <motion.button 
                  className="flex flex-col items-center gap-1.5 min-w-[66px]"
                  onClick={() => navigate('/add-pet')}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="w-[64px] h-[64px] rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/20">
                    <Plus className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">חדש</span>
                </motion.button>

                {/* Pet Selection Items */}
                {pets.map((pet, index) => {
                  const isSelected = selectedPetId === pet.id;
                  return (
                    <motion.button 
                      key={pet.id}
                      className="flex flex-col items-center gap-1.5 min-w-[66px] relative"
                      onClick={() => handlePetSelect(pet.id)}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.35 + index * 0.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className={`w-[64px] h-[64px] rounded-full p-[2px] transition-all ${
                        isSelected 
                          ? 'bg-gradient-to-br from-primary via-accent to-primary-light ring-2 ring-primary/30 ring-offset-2 ring-offset-background' 
                          : 'bg-gradient-to-br from-muted to-muted/60'
                      }`}>
                        <div className={`w-full h-full rounded-full p-[1.5px] ${isSelected ? 'bg-background' : 'bg-background'}`}>
                          <div className="w-full h-full rounded-full overflow-hidden bg-muted">
                            {pet.avatar_url ? (
                              <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {pet.type === 'dog' ? (
                                  <img src={dogIcon} alt="dog" className="w-7 h-7" />
                                ) : (
                                  <img src={catIcon} alt="cat" className="w-7 h-7" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Selection Indicator */}
                      {isSelected && (
                        <motion.div 
                          className="absolute -bottom-0.5 right-4 w-5 h-5 bg-primary rounded-full flex items-center justify-center ring-2 ring-background"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        >
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </motion.div>
                      )}
                      <span className={`text-[11px] truncate max-w-[66px] transition-colors ${
                        isSelected ? 'text-primary font-medium' : 'text-foreground'
                      }`}>
                        {pet.name}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>

          {/* Pet Recommendations Section */}
          {pets.length > 0 && (
            <motion.div
              className="border-t border-border/30 bg-muted/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <PetRecommendations selectedPet={selectedPet} />
            </motion.div>
          )}

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-12 rounded-none border-y border-border/30 bg-background p-0 gap-0">
              <TabsTrigger 
                value="posts" 
                className="flex-1 h-full rounded-none border-b-[1.5px] border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground/60 bg-transparent transition-colors"
              >
                <Grid3X3 className="w-[22px] h-[22px]" />
              </TabsTrigger>
              <TabsTrigger 
                value="reels" 
                className="flex-1 h-full rounded-none border-b-[1.5px] border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground/60 bg-transparent transition-colors"
              >
                <Film className="w-[22px] h-[22px]" />
              </TabsTrigger>
              <TabsTrigger 
                value="tagged" 
                className="flex-1 h-full rounded-none border-b-[1.5px] border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground/60 bg-transparent transition-colors"
              >
                <UserSquare className="w-[22px] h-[22px]" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="mt-0">
              {posts && posts.length > 0 ? (
                <PostGrid posts={posts} />
              ) : (
                <motion.div 
                  className="flex flex-col items-center justify-center py-20 px-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <motion.div 
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-5"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Camera className="w-12 h-12 text-muted-foreground" strokeWidth={1.5} />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">שתף תמונות</h3>
                  <p className="text-muted-foreground text-center text-sm max-w-[240px] mb-4">
                    כשתשתף תמונות, הן יופיעו בפרופיל שלך.
                  </p>
                  <Button 
                    className="bg-primary text-primary-foreground rounded-full px-6 hover:bg-primary-hover"
                    onClick={() => navigate('/')}
                  >
                    <Plus className="w-4 h-4 ml-1" />
                    שתף תמונה ראשונה
                  </Button>
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="reels" className="mt-0">
              <motion.div 
                className="flex flex-col items-center justify-center py-20 px-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <motion.div 
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-5"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Film className="w-12 h-12 text-muted-foreground" strokeWidth={1.5} />
                </motion.div>
                <h3 className="text-2xl font-bold text-foreground mb-2">סרטונים קצרים</h3>
                <p className="text-muted-foreground text-center text-sm max-w-[240px]">
                  צור וצפה בסרטונים קצרים ומהנים.
                </p>
              </motion.div>
            </TabsContent>

            <TabsContent value="tagged" className="mt-0">
              <motion.div 
                className="flex flex-col items-center justify-center py-20 px-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <motion.div 
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-5"
                >
                  <UserSquare className="w-12 h-12 text-muted-foreground" strokeWidth={1.5} />
                </motion.div>
                <h3 className="text-2xl font-bold text-foreground mb-2">תמונות שתויגת בהן</h3>
                <p className="text-muted-foreground text-center text-sm max-w-[240px]">
                  כשאנשים מתייגים אותך בתמונות, הן יופיעו כאן.
                </p>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Hamburger Menu */}
        <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        {/* Profile Image Editor */}
        <ProfileImageEditor
          isOpen={isImageEditorOpen}
          onClose={() => setIsImageEditorOpen(false)}
          currentImageUrl={profile?.avatar_url}
          onImageUpdated={(url) => {
            setProfile((prev: any) => ({ ...prev, avatar_url: url }));
          }}
        />

        {/* QR Code Dialog */}
        <QRCodeProfile
          open={showQRCode}
          onOpenChange={setShowQRCode}
          profile={profile}
        />

        {/* Close Friends Manager */}
        <CloseFriendsManager
          open={showCloseFriends}
          onOpenChange={setShowCloseFriends}
        />

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Profile;
