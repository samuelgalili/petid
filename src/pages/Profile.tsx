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
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";
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

  // Fetch cashback from orders
  const { data: cashbackData, refetch: refetchCashback } = useQuery({
    queryKey: ['user-cashback', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      const { data } = await supabase
        .from('orders')
        .select('total')
        .eq('user_id', profile.id);
      
      const totalSpent = data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
      return totalSpent * 0.05;
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
        refetchPosts(),
        refetchCashback()
      ]);
      toast({ description: "הפרופיל עודכן" });
      setIsRefreshing(false);
    }
    setPullDistance(0);
    setStartY(0);
  }, [pullDistance, refetchStats, refetchPosts, refetchCashback, toast]);

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
        className="min-h-screen bg-background pb-20" 
        dir="rtl"
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

        {/* Instagram-style Header */}
        <div className="sticky top-0 z-20 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">
                {profile?.full_name?.split(' ')[0] || 'משתמש'}
              </h1>
              <RoleBadge size="sm" />
              {profile?.points > 100 && (
                <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {Math.floor((profile?.points || 0) / 100)}+
                </span>
              )}
            </div>
            <button onClick={() => setIsMenuOpen(true)}>
              <Menu className="w-6 h-6 text-foreground" />
            </button>
          </div>
        </div>

        {/* Profile Header Section */}
        <motion.div 
          className="px-4 pt-4"
          style={{ transform: `translateY(${pullDistance * 0.3}px)` }}
        >
          {/* Avatar and Stats Row */}
          <div className="flex items-center gap-6 mb-4">
            {/* Profile Picture */}
            <div className="relative">
              <motion.div 
                className="w-20 h-20 rounded-full overflow-hidden ring-[3px] ring-gradient-to-br from-primary to-accent p-[2px] bg-gradient-to-br from-primary to-accent"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-background">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={profile?.avatar_url} className="object-cover" />
                    <AvatarFallback className="bg-muted text-foreground font-semibold text-2xl">
                      {profile?.full_name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </motion.div>
              <motion.button
                onClick={() => setIsImageEditorOpen(true)}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center ring-2 ring-background shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Plus className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
              </motion.button>
            </div>

            {/* Stats with Animation */}
            <div className="flex-1 flex justify-around">
              <button className="text-center" onClick={() => setActiveTab("posts")}>
                <p className="text-lg font-bold text-foreground">
                  <AnimatedCounter value={stats?.posts || 0} />
                </p>
                <p className="text-xs text-muted-foreground">פוסטים</p>
              </button>
              <button className="text-center">
                <p className="text-lg font-bold text-foreground">
                  <AnimatedCounter value={stats?.followers || 0} />
                </p>
                <p className="text-xs text-muted-foreground">עוקבים</p>
              </button>
              <button className="text-center">
                <p className="text-lg font-bold text-foreground">
                  <AnimatedCounter value={stats?.following || 0} />
                </p>
                <p className="text-xs text-muted-foreground">עוקב</p>
              </button>
            </div>
          </div>

          {/* Bio Section */}
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-foreground text-sm">{profile?.full_name || "משתמש"}</h2>
              <ActivityStatus userId={profile?.id} size="sm" />
            </div>
            {pets.length > 0 && (
              <p className="text-muted-foreground text-sm">בעל/ת {pets.length} חיות מחמד 🐾</p>
            )}
            {profile?.bio && (
              <p className="text-foreground text-sm mt-1">{profile.bio}</p>
            )}
            
            {/* Points & Cashback Display */}
            <div className="flex items-center gap-3 mt-2">
              {profile?.points > 0 && (
                <motion.div 
                  className="flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-full"
                  whileHover={{ scale: 1.05 }}
                >
                  <span className="text-sm">⭐</span>
                  <span className="text-xs font-semibold text-primary">{profile.points} נקודות</span>
                </motion.div>
              )}
              {(cashbackData || 0) > 0 && (
                <motion.div 
                  className="flex items-center gap-1.5 bg-green-500/10 px-2.5 py-1 rounded-full"
                  whileHover={{ scale: 1.05 }}
                >
                  <span className="text-sm">💰</span>
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400">₪{(cashbackData || 0).toFixed(2)} קאשבק</span>
                </motion.div>
              )}
            </div>

            {/* Mutual Followers */}
            <div className="mt-2">
              <MutualFollowers userId={profile?.id} currentUserId={profile?.id} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-4 relative z-10">
            <Button 
              type="button"
              variant="secondary"
              className="flex-1 h-9 font-semibold text-sm border border-border"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/edit-profile');
              }}
            >
              עריכת פרופיל
            </Button>
            <Button 
              type="button"
              variant="secondary"
              className="flex-1 h-9 font-semibold text-sm border border-border bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (profile?.whatsapp_number) {
                  window.open(`https://wa.me/${profile.whatsapp_number.replace(/[^0-9]/g, '')}`, '_blank');
                } else {
                  navigate('/edit-profile?tab=whatsapp');
                }
              }}
            >
              <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {profile?.whatsapp_number ? 'וואטסאפ' : 'חבר וואטסאפ'}
            </Button>
            <Button 
              type="button"
              variant="secondary"
              className="h-9 px-4 font-semibold text-sm border border-border"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/messages');
              }}
            >
              <Mail className="w-4 h-4" />
            </Button>
            <Button 
              type="button"
              variant="secondary"
              className="h-9 px-4 font-semibold text-sm border border-border"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowQRCode(true);
              }}
            >
              <QrCode className="w-4 h-4" />
            </Button>
            <Button 
              type="button"
              variant="secondary"
              className="h-9 px-4 font-semibold text-sm border border-border"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowCloseFriends(true);
              }}
            >
              <Star className="w-4 h-4" />
            </Button>
          </div>

          {/* Pet Highlights */}
          <div className="mb-4">
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {/* Add New Pet */}
              <motion.button 
                className="flex flex-col items-center gap-1.5 min-w-[64px]"
                onClick={() => navigate('/add-pet')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </div>
                <span className="text-[10px] text-muted-foreground">חדש</span>
              </motion.button>

              {/* Pet Highlights */}
              {pets.map((pet, index) => (
                <motion.button 
                  key={pet.id}
                  className="flex flex-col items-center gap-1.5 min-w-[64px]"
                  onClick={() => navigate(`/pet/${pet.id}`)}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-br from-primary/50 to-accent/50">
                    <div className="w-full h-full rounded-full overflow-hidden bg-background">
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
                  <span className="text-[10px] text-foreground truncate max-w-[64px]">{pet.name}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full h-12 rounded-none border-t border-border bg-transparent p-0">
            <TabsTrigger 
              value="posts" 
              className="flex-1 h-full rounded-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:shadow-none bg-transparent"
            >
              <Grid3X3 className="w-5 h-5" />
            </TabsTrigger>
            <TabsTrigger 
              value="reels" 
              className="flex-1 h-full rounded-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:shadow-none bg-transparent"
            >
              <Film className="w-5 h-5" />
            </TabsTrigger>
            <TabsTrigger 
              value="tagged" 
              className="flex-1 h-full rounded-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:shadow-none bg-transparent"
            >
              <UserSquare className="w-5 h-5" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-0">
            {posts && posts.length > 0 ? (
              <PostGrid posts={posts} />
            ) : (
              <motion.div 
                className="flex flex-col items-center justify-center py-16 px-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="w-20 h-20 rounded-full border-2 border-foreground flex items-center justify-center mb-4">
                  <Camera className="w-10 h-10 text-foreground" strokeWidth={1} />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">שתף תמונות</h3>
                <p className="text-muted-foreground text-center text-sm">
                  כשתשתף תמונות, הן יופיעו בפרופיל שלך.
                </p>
                <Button 
                  variant="link" 
                  className="text-primary mt-2"
                  onClick={() => navigate('/')}
                >
                  שתף את התמונה הראשונה שלך
                </Button>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="reels" className="mt-0">
            <motion.div 
              className="flex flex-col items-center justify-center py-16 px-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-20 h-20 rounded-full border-2 border-foreground flex items-center justify-center mb-4">
                <Film className="w-10 h-10 text-foreground" strokeWidth={1} />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">סרטונים קצרים</h3>
              <p className="text-muted-foreground text-center text-sm">
                צור וצפה בסרטונים קצרים ומהנים.
              </p>
            </motion.div>
          </TabsContent>

          <TabsContent value="tagged" className="mt-0">
            <motion.div 
              className="flex flex-col items-center justify-center py-16 px-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-20 h-20 rounded-full border-2 border-foreground flex items-center justify-center mb-4">
                <UserSquare className="w-10 h-10 text-foreground" strokeWidth={1} />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">תמונות שתויגת בהן</h3>
              <p className="text-muted-foreground text-center text-sm">
                כשאנשים מתייגים אותך בתמונות, הן יופיעו כאן.
              </p>
            </motion.div>
          </TabsContent>
        </Tabs>

        <BottomNav />
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
    </PageTransition>
  );
};

export default Profile;
