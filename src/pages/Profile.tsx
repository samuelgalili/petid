import { useState, useEffect } from "react";
import { PageTransition } from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import { AppHeader } from "@/components/AppHeader";
import { 
  ChevronRight,
  ShoppingCart,
  Plus,
  Check,
  User,
  Settings,
  HelpCircle,
  Package,
  Star,
  PawPrint,
  Camera,
  TrendingUp,
  Award,
  Calendar,
  Heart,
  Shield,
  Bell,
  Crown,
  Zap,
  Target
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";
import { ProfileImageEditor } from "@/components/ProfileImageEditor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Profile = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [activeCoupons, setActiveCoupons] = useState<any[]>([]);
  const [nearbyParks, setNearbyParks] = useState<any[]>([]);
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);

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

      setProfile(profileData);

      // Fetch pets
      const { data: petsData } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      setPets(petsData || []);

      // Fetch orders data
      const { data: ordersData, count: ordersCount } = await supabase
        .from('orders')
        .select('*, order_items(*)', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersData && ordersData.length > 0) {
        setLastOrder(ordersData[0]);
        setTotalOrders(ordersCount || 0);
      }

      // Fetch active redemptions (coupons)
      const { data: redemptionsData } = await supabase
        .from('redemptions')
        .select('*, rewards(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('expires_at', { ascending: true });

      setActiveCoupons(redemptionsData || []);

      // Fetch nearby parks (just get first 3)
      const { data: parksData } = await supabase
        .from('dog_parks')
        .select('*')
        .eq('status', 'active')
        .limit(3);

      setNearbyParks(parksData || []);

    } catch (error: any) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/auth');
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background flex items-center justify-center pb-20">
          <div className="w-12 h-12 border-3 border-border border-t-foreground rounded-full animate-spin"></div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-20" dir="rtl">
        <AppHeader title="פרופיל" showBackButton={true} />

        {/* Content Container */}
        <div className="px-4 py-4 space-y-4">
          
          {/* User Header Section */}
          <div className="flex items-center gap-5 mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-border">
                <Avatar className="w-full h-full">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-muted text-foreground font-semibold text-xl">
                    {profile?.full_name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <button
                onClick={() => setIsImageEditorOpen(true)}
                className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center ring-2 ring-background"
              >
                <Camera className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2} />
              </button>
            </div>
            
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground font-jakarta">
                {profile?.full_name || "משתמש"}
              </h2>
              <p className="text-sm text-muted-foreground font-jakarta">
                {profile?.email || "user@example.com"}
              </p>
            </div>
          </div>

          {/* Statistics Row */}
          <div className="flex justify-around py-3 border-t border-b border-border">
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">{pets.length}</p>
              <p className="text-xs text-muted-foreground">חיות מחמד</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">{totalOrders}</p>
              <p className="text-xs text-muted-foreground">הזמנות</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">{profile?.points || 0}</p>
              <p className="text-xs text-muted-foreground">נקודות</p>
            </div>
          </div>

          {/* Edit Profile Button */}
          <button 
            onClick={() => navigate('/settings')}
            className="w-full bg-secondary border border-border text-foreground rounded-lg py-2 font-semibold text-sm font-jakarta hover:bg-secondary/80 transition-colors"
          >
            עריכת פרופיל
          </button>

          {/* Pets Section */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-foreground font-semibold font-jakarta text-base">חיות המחמד שלי</h3>
              <button 
                onClick={() => navigate('/add-pet')}
                className="text-primary font-semibold text-sm font-jakarta"
              >
                + הוסף
              </button>
            </div>
            {pets.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                {pets.map((pet) => (
                  <div 
                    key={pet.id}
                    onClick={() => navigate(`/pet/${pet.id}`)}
                    className="flex-shrink-0 w-20 text-center cursor-pointer"
                  >
                    <div className="w-16 h-16 mx-auto rounded-full overflow-hidden ring-2 ring-border mb-1">
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
                    <p className="text-xs text-foreground font-jakarta truncate">{pet.name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-muted rounded-lg">
                <PawPrint className="w-10 h-10 text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-muted-foreground text-sm font-jakarta mb-3">אין חיות מחמד</p>
                <button
                  onClick={() => navigate('/add-pet')}
                  className="text-primary font-semibold text-sm font-jakarta"
                >
                  הוסף חיית מחמד ראשונה
                </button>
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="mt-6 space-y-1">
            <button 
              onClick={() => navigate('/cart')}
              className="w-full flex items-center justify-between p-4 bg-card border-b border-border active:bg-muted"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                <span className="text-foreground font-jakarta text-sm">עגלת קניות</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </button>

            <button 
              onClick={() => navigate('/order-history')}
              className="w-full flex items-center justify-between p-4 bg-card border-b border-border active:bg-muted"
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                <span className="text-foreground font-jakarta text-sm">ההזמנות שלי</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </button>

            <button 
              onClick={() => navigate('/rewards')}
              className="w-full flex items-center justify-between p-4 bg-card border-b border-border active:bg-muted"
            >
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                <span className="text-foreground font-jakarta text-sm">תגמולים ונקודות</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </button>

            <button 
              onClick={() => navigate('/tasks')}
              className="w-full flex items-center justify-between p-4 bg-card border-b border-border active:bg-muted"
            >
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                <span className="text-foreground font-jakarta text-sm">משימות יומיות</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </button>

            <button 
              onClick={() => navigate('/favorites')}
              className="w-full flex items-center justify-between p-4 bg-card border-b border-border active:bg-muted"
            >
              <div className="flex items-center gap-3">
                <Heart className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                <span className="text-foreground font-jakarta text-sm">מועדפים</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </button>

            <button 
              onClick={() => navigate('/notifications')}
              className="w-full flex items-center justify-between p-4 bg-card border-b border-border active:bg-muted"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                <span className="text-foreground font-jakarta text-sm">התראות</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </button>

            <button 
              onClick={() => navigate('/settings')}
              className="w-full flex items-center justify-between p-4 bg-card border-b border-border active:bg-muted"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                <span className="text-foreground font-jakarta text-sm">הגדרות</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </button>
          </div>

          {/* Logout Button */}
          <div className="mt-6 pt-4 border-t border-border">
            <button
              onClick={handleLogout}
              className="w-full text-destructive font-semibold text-sm font-jakarta py-3"
            >
              התנתק
            </button>
          </div>

          {/* Version */}
          <div className="text-center pb-6">
            <p className="text-xs text-muted-foreground font-jakarta">Petid v1.0.0</p>
          </div>
        </div>

        <BottomNav />
      </div>

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