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
  Mail,
  QrCode,
  Star,
  RefreshCw,
  Settings,
  Award,
  Sparkles,
  Heart,
  MessageCircle,
  Archive
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
import { LoyaltyRankCard } from "@/components/loyalty";
import { BusinessInsightsBar } from "@/components/profile/BusinessInsightsBar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const Profile = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [showQRCode, setShowQRCode] = useState(false);
  const [showCloseFriends, setShowCloseFriends] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);

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

  // Removed cashback query - using new loyalty system instead

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

      // Fetch likes and comments counts
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

    // Set offline on unmount
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

      setPets(petsData || []);

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

        {/* Premium Header with Gradient */}
        <motion.div 
          className="sticky top-0 z-20 backdrop-blur-xl border-b border-border/20"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            background: 'linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)',
          }}
        >
          <div className="flex items-center justify-between px-4 h-11">
            <div className="flex items-center gap-3">
              <img src={petidIcon} alt="PetID" className="w-7 h-7 object-contain" />
              <motion.h1 
                className="text-xl font-bold bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {profile?.full_name?.split(' ')[0] || 'משתמש'}
              </motion.h1>
              <RoleBadge size="sm" />
              {profile?.points > 100 && (
                <motion.span 
                  className="bg-gradient-to-r from-primary/20 to-accent/20 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                >
                  <Sparkles className="w-3 h-3" />
                  {Math.floor((profile?.points || 0) / 100)}+
                </motion.span>
              )}
            </div>
            <motion.button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2.5 rounded-xl hover:bg-muted/50 transition-all duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Menu className="w-5 h-5 text-foreground" />
            </motion.button>
          </div>
        </motion.div>

        {/* Profile Header Section */}
        <motion.div 
          className="px-4 pt-6"
          style={{ transform: `translateY(${pullDistance * 0.3}px)` }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Avatar and Stats Row - Enhanced */}
          <div className="flex items-center gap-5 mb-5">
            {/* Profile Picture with Gradient Border - Rounded Square */}
            <div className="relative">
              <motion.div 
                className="relative w-24 h-24"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {/* Gradient border wrapper */}
                <div className="w-full h-full rounded-2xl p-[3px] bg-gradient-to-br from-primary via-accent to-secondary shadow-lg">
                  <div className="w-full h-full rounded-xl bg-background overflow-hidden">
                    <Avatar className="w-full h-full rounded-xl">
                      <AvatarImage src={profile?.avatar_url} className="object-cover rounded-xl" />
                      <AvatarFallback className="bg-muted text-foreground font-bold text-3xl rounded-xl">
                        {profile?.full_name?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </motion.div>
              <motion.button
                onClick={() => setIsImageEditorOpen(true)}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-xl flex items-center justify-center ring-3 ring-background shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Camera className="w-4 h-4 text-primary-foreground" />
              </motion.button>
            </div>

            {/* Stats with Enhanced Animation */}
            <div className="flex-1 grid grid-cols-3 gap-2">
              {[
                { value: stats?.posts || 0, label: 'פוסטים', onClick: () => setActiveTab("posts") },
                { value: stats?.followers || 0, label: 'עוקבים', onClick: () => {} },
                { value: stats?.following || 0, label: 'עוקב', onClick: () => {} }
              ].map((stat, index) => (
                <motion.button 
                  key={stat.label}
                  className="text-center p-2 rounded-2xl hover:bg-muted/50 transition-colors"
                  onClick={stat.onClick}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <p className="text-xl font-bold text-foreground">
                    <AnimatedCounter value={stat.value} />
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium">{stat.label}</p>
                </motion.button>
              ))}
            </div>
            
            {/* User Rank Badge - Inline */}
            <motion.div 
              className="flex items-center gap-2 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full px-3 py-1.5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35 }}
            >
              <span className="text-sm">🏆</span>
              <span className="text-xs font-semibold text-foreground">{profile?.rank || 'גור'}</span>
            </motion.div>
          </div>
          
          {/* Points Progress Bar - Minimalist */}
          <motion.div 
            className="mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground">{profile?.points || 0} נקודות</span>
              <span className="text-[11px] text-muted-foreground">100 לדרגה הבאה</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(((profile?.points || 0) % 100), 100)}%` }}
                transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </motion.div>

          {/* Bio Section - Enhanced */}
          <motion.div 
            className="mb-5 space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-foreground text-base">{profile?.full_name || "משתמש"}</h2>
              <ActivityStatus userId={profile?.id} size="sm" />
            </div>
            {pets.length > 0 && (
              <p className="text-muted-foreground text-sm flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-accent" />
                בעל/ת {pets.length} חיות מחמד
              </p>
            )}
            {profile?.bio && (
              <p className="text-foreground/90 text-sm leading-relaxed">{profile.bio}</p>
            )}
            
            {/* Mutual Followers */}
            <div className="pt-1">
              <MutualFollowers userId={profile?.id} currentUserId={profile?.id} />
            </div>
          </motion.div>

          {/* Business Insights - Instagram style */}
          <BusinessInsightsBar />


          {/* Action Buttons - Enhanced with Tooltips */}
          <motion.div 
            className="flex gap-2 mb-5 relative z-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    type="button"
                    variant="outline"
                    className="h-11 px-4 rounded-2xl border-border/50 bg-card hover:bg-muted/50"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/messages');
                    }}
                  >
                    <MessageCircle className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>הודעות</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    type="button"
                    variant="outline"
                    className="h-11 px-4 rounded-2xl border-border/50 bg-card hover:bg-muted/50"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowQRCode(true);
                    }}
                  >
                    <QrCode className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>קוד QR</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>

          {/* Pet Highlights - Enhanced */}
          <motion.div 
            className="mb-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
              {/* Add New Pet */}
              <motion.button 
                className="flex flex-col items-center gap-2 min-w-[72px]"
                onClick={() => navigate('/add-pet')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-[68px] h-[68px] rounded-2xl border-2 border-dashed border-primary/40 flex items-center justify-center bg-primary/5 hover:bg-primary/10 transition-colors">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">הוסף חיה</span>
              </motion.button>

              {/* Pet Highlights - Rounded Square with Gradient */}
              {pets.map((pet, index) => (
                <motion.button 
                  key={pet.id}
                  className="flex flex-col items-center gap-2 min-w-[72px]"
                  onClick={() => navigate(`/pet/${pet.id}`)}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="w-[68px] h-[68px] rounded-2xl p-[2px] bg-gradient-to-br from-primary via-accent to-secondary shadow-md">
                    <div className="w-full h-full rounded-xl bg-background overflow-hidden">
                      {pet.avatar_url ? (
                        <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          {pet.type === 'dog' ? (
                            <img src={dogIcon} alt="dog" className="w-8 h-8" />
                          ) : (
                            <img src={catIcon} alt="cat" className="w-8 h-8" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-foreground font-medium truncate max-w-[72px]">{pet.name}</span>
                </motion.button>
              ))}
              
              {/* Archived Pets Link */}
              <motion.button 
                className="flex flex-col items-center gap-2 min-w-[72px]"
                onClick={() => navigate('/archived-pets')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-[68px] h-[68px] rounded-2xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors">
                  <Archive className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">ארכיון</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>

        {/* Content Tabs - Enhanced */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full h-14 rounded-none border-t border-border/50 bg-card/50 backdrop-blur-sm p-0 gap-0">
            <TabsTrigger 
              value="posts" 
              className="flex-1 h-full rounded-none data-[state=active]:border-b-[3px] data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none bg-transparent transition-all duration-200"
            >
              <Grid3X3 className="w-5 h-5" />
            </TabsTrigger>
            <TabsTrigger 
              value="reels" 
              className="flex-1 h-full rounded-none data-[state=active]:border-b-[3px] data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none bg-transparent transition-all duration-200"
            >
              <Film className="w-5 h-5" />
            </TabsTrigger>
            <TabsTrigger 
              value="tagged" 
              className="flex-1 h-full rounded-none data-[state=active]:border-b-[3px] data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none bg-transparent transition-all duration-200"
            >
              <UserSquare className="w-5 h-5" />
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
                  className="bg-gradient-to-r from-primary to-primary-dark text-primary-foreground rounded-full px-6"
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
