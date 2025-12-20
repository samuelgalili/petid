import { useState, useEffect } from "react";
import { PageTransition } from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import { 
  Menu,
  Plus,
  Camera,
  Grid3X3,
  Film,
  UserSquare,
  Settings,
  ChevronLeft,
  BadgeCheck,
  Mail,
  Megaphone,
  Heart,
  MessageCircle,
  Bookmark,
  MoreHorizontal
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
import { useQuery } from "@tanstack/react-query";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { HighlightsSection } from "@/components/HighlightsSection";

const Profile = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");

  // Fetch user stats
  const { data: stats } = useQuery({
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
  const { data: cashbackData } = useQuery({
    queryKey: ['user-cashback', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      const { data } = await supabase
        .from('orders')
        .select('total')
        .eq('user_id', profile.id);
      
      // Calculate 5% cashback from all orders
      const totalSpent = data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
      return totalSpent * 0.05;
    },
    enabled: !!profile?.id
  });

  // Fetch user posts
  const { data: posts } = useQuery({
    queryKey: ['user-posts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!profile?.id
  });

  // Fetch mutual followers
  const { data: mutualFollowers } = useQuery({
    queryKey: ['mutual-followers', profile?.id],
    queryFn: async () => {
      // This would need proper logic - for now return empty
      return [];
    },
    enabled: !!profile?.id
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      setProfile({ ...profileData, id: user.id });

      // Fetch pets
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

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background flex items-center justify-center pb-20">
          <div className="w-12 h-12 border-3 border-border border-t-primary rounded-full animate-spin"></div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-20" dir="rtl">
        {/* Instagram-style Header */}
        <div className="sticky top-0 z-20 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">
                {profile?.full_name?.split(' ')[0] || 'משתמש'}
              </h1>
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
        <div className="px-4 pt-4">
          {/* Avatar and Stats Row */}
          <div className="flex items-center gap-6 mb-4">
            {/* Profile Picture */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden ring-[3px] ring-gradient-to-br from-primary to-accent p-[2px] bg-gradient-to-br from-primary to-accent">
                <div className="w-full h-full rounded-full overflow-hidden bg-background">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={profile?.avatar_url} className="object-cover" />
                    <AvatarFallback className="bg-muted text-foreground font-semibold text-2xl">
                      {profile?.full_name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <button
                onClick={() => setIsImageEditorOpen(true)}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center ring-2 ring-background shadow-lg"
              >
                <Plus className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
              </button>
            </div>

            {/* Stats */}
            <div className="flex-1 flex justify-around">
              <button className="text-center" onClick={() => setActiveTab("posts")}>
                <p className="text-lg font-bold text-foreground">{formatNumber(stats?.posts || 0)}</p>
                <p className="text-xs text-muted-foreground">פוסטים</p>
              </button>
              <button className="text-center">
                <p className="text-lg font-bold text-foreground">{formatNumber(stats?.followers || 0)}</p>
                <p className="text-xs text-muted-foreground">עוקבים</p>
              </button>
              <button className="text-center">
                <p className="text-lg font-bold text-foreground">{formatNumber(stats?.following || 0)}</p>
                <p className="text-xs text-muted-foreground">עוקב</p>
              </button>
            </div>
          </div>

          {/* Bio Section */}
          <div className="mb-4">
            <h2 className="font-bold text-foreground text-sm">{profile?.full_name || "משתמש"}</h2>
            {pets.length > 0 && (
              <p className="text-muted-foreground text-sm">בעל/ת {pets.length} חיות מחמד 🐾</p>
            )}
            {profile?.bio && (
              <p className="text-foreground text-sm mt-1">{profile.bio}</p>
            )}
            {/* Points & Cashback Display */}
            <div className="flex items-center gap-3 mt-2">
              {profile?.points > 0 && (
                <div className="flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-full">
                  <span className="text-sm">⭐</span>
                  <span className="text-xs font-semibold text-primary">{profile.points} נקודות</span>
                </div>
              )}
              {(cashbackData || 0) > 0 && (
                <div className="flex items-center gap-1.5 bg-green-500/10 px-2.5 py-1 rounded-full">
                  <span className="text-sm">💰</span>
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400">₪{(cashbackData || 0).toFixed(2)} קאשבק</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-4">
            <Button 
              variant="secondary"
              className="flex-1 h-9 font-semibold text-sm border border-border"
              onClick={() => navigate('/edit-profile')}
            >
              עריכת פרופיל
            </Button>
            <Button 
              variant="secondary"
              className="flex-1 h-9 font-semibold text-sm border border-border"
              onClick={() => navigate('/businesses')}
            >
              <Megaphone className="w-4 h-4 ml-1" />
              קידום
            </Button>
            <Button 
              variant="secondary"
              className="h-9 px-4 font-semibold text-sm border border-border"
              onClick={() => navigate('/messages')}
            >
              <Mail className="w-4 h-4" />
            </Button>
          </div>

          {/* Story Highlights */}
          <div className="mb-4">
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {/* Add New Highlight */}
              <button 
                className="flex flex-col items-center gap-1.5 min-w-[64px]"
                onClick={() => navigate('/add-pet')}
              >
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </div>
                <span className="text-[10px] text-muted-foreground">חדש</span>
              </button>

              {/* Pet Highlights */}
              {pets.map((pet) => (
                <button 
                  key={pet.id}
                  className="flex flex-col items-center gap-1.5 min-w-[64px]"
                  onClick={() => navigate(`/pet/${pet.id}`)}
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
                </button>
              ))}
            </div>
          </div>
        </div>

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

          {/* Posts Grid */}
          <TabsContent value="posts" className="mt-0">
            {posts && posts.length > 0 ? (
              <div className="grid grid-cols-3 gap-0.5">
                {posts.map((post) => (
                  <motion.button
                    key={post.id}
                    className="aspect-square relative overflow-hidden bg-muted"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(`/post/${post.id}`)}
                  >
                    <img 
                      src={post.image_url} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                    {post.media_type === 'video' && (
                      <div className="absolute top-2 left-2">
                        <Film className="w-4 h-4 text-white drop-shadow-lg" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4">
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
              </div>
            )}
          </TabsContent>

          {/* Reels Tab */}
          <TabsContent value="reels" className="mt-0">
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 rounded-full border-2 border-foreground flex items-center justify-center mb-4">
                <Film className="w-10 h-10 text-foreground" strokeWidth={1} />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">סרטונים קצרים</h3>
              <p className="text-muted-foreground text-center text-sm">
                צור וצפה בסרטונים קצרים ומהנים.
              </p>
            </div>
          </TabsContent>

          {/* Tagged Tab */}
          <TabsContent value="tagged" className="mt-0">
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 rounded-full border-2 border-foreground flex items-center justify-center mb-4">
                <UserSquare className="w-10 h-10 text-foreground" strokeWidth={1} />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">תמונות שתויגת בהן</h3>
              <p className="text-muted-foreground text-center text-sm">
                כשאנשים מתייגים אותך בתמונות, הן יופיעו כאן.
              </p>
            </div>
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
    </PageTransition>
  );
};

export default Profile;
