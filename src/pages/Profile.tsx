import { useState, useEffect } from "react";
import { PageTransition } from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
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
        <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center pb-20">
          <div className="w-12 h-12 border-3 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F5F5F5] pb-20" dir="rtl">
        {/* Yellow Header */}
        <div className="bg-[#FFD700] px-4 pt-4 pb-4 flex items-center justify-between sticky top-0 z-10">
          <button onClick={() => navigate(-1)} className="p-2">
            <ChevronRight className="w-6 h-6 text-gray-900" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 font-jakarta">האזור האישי שלך</h1>
          <div className="w-10" />
        </div>

        {/* Content Container */}
        <div className="px-4 py-6 space-y-5">
          
          {/* User Header Section - Enhanced */}
          <div className="bg-gradient-to-br from-[#FFD700] via-[#FFED4E] to-[#FFC107] rounded-3xl p-6 mb-6 shadow-xl relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-3xl font-black text-gray-900 font-jakarta">
                      {profile?.full_name || "משתמש"}
                    </h2>
                    <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-1 rounded-full flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-white" />
                      <span className="text-xs font-black text-white">VIP</span>
                    </div>
                  </div>
                  <p className="text-gray-700 font-jakarta text-sm mb-1">
                    {profile?.email || "user@example.com"}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="bg-white/30 px-3 py-1 rounded-full flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-gray-900" />
                      <span className="text-xs font-bold text-gray-900">{profile?.points || 0} נקודות</span>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full opacity-75 blur animate-pulse" />
                  <Avatar className="relative w-20 h-20 border-4 border-white shadow-2xl">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-gray-900 to-gray-700 text-white font-black text-2xl">
                      {profile?.full_name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => setIsImageEditorOpen(true)}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-xl hover:bg-blue-700 transition-all hover:scale-110 active:scale-95 ring-2 ring-white"
                  >
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
              <button 
                onClick={() => navigate('/settings')}
                className="w-full bg-white text-gray-900 rounded-2xl py-3 font-bold font-jakarta hover:bg-gray-50 transition-all shadow-md hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                עריכת פרופיל
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95">
              <PawPrint className="w-6 h-6 text-white mx-auto mb-2" />
              <p className="text-2xl font-black text-white mb-1">{pets.length}</p>
              <p className="text-xs text-blue-100 font-semibold">חיות מחמד</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95">
              <Package className="w-6 h-6 text-white mx-auto mb-2" />
              <p className="text-2xl font-black text-white mb-1">{totalOrders}</p>
              <p className="text-xs text-purple-100 font-semibold">הזמנות</p>
            </div>
            
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95">
              <Star className="w-6 h-6 text-white mx-auto mb-2" />
              <p className="text-2xl font-black text-white mb-1">{profile?.points || 0}</p>
              <p className="text-xs text-amber-100 font-semibold">נקודות</p>
            </div>
          </div>

          {/* Pets Section - Enhanced */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 font-black font-jakarta text-xl">חיות המחמד שלי</h3>
              <button 
                onClick={() => navigate('/add-pet')}
                className="bg-blue-600 text-white px-4 py-2 rounded-full font-bold font-jakarta text-sm hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                הוסף חיית מחמד
              </button>
            </div>
            {pets.length > 0 ? (
              <div className="space-y-3">
                {pets.map((pet, index) => (
                  <motion.div 
                    key={pet.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => navigate(`/pet/${pet.id}`)}
                    className="bg-white rounded-3xl p-5 flex items-center gap-4 cursor-pointer hover:shadow-xl transition-all shadow-md group hover:scale-[1.02] active:scale-[0.98] border-2 border-transparent hover:border-blue-200"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 flex-shrink-0 ring-2 ring-blue-200 group-hover:ring-4 group-hover:ring-blue-300 transition-all">
                      {pet.avatar_url ? (
                        <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {pet.type === 'dog' ? (
                            <img src={dogIcon} alt="dog" className="w-10 h-10" />
                          ) : (
                            <img src={catIcon} alt="cat" className="w-10 h-10" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-gray-900 font-jakarta text-lg mb-1">{pet.name}</p>
                      <p className="text-gray-600 font-jakarta text-sm">{pet.breed || 'גזע לא ידוע'}</p>
                      {pet.birth_date && (
                        <p className="text-gray-400 font-jakarta text-xs mt-1">
                          {Math.floor((new Date().getTime() - new Date(pet.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365))} שנים
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl p-8 shadow-md text-center border-2 border-dashed border-gray-200"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PawPrint className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-500 text-base font-jakarta mb-4">אין חיות מחמד רשומות</p>
                <button
                  onClick={() => navigate('/add-pet')}
                  className="bg-gradient-to-r from-[#FFD700] to-[#FFC107] text-gray-900 px-6 py-3 rounded-full font-bold font-jakarta hover:shadow-lg transition-all hover:scale-105 active:scale-95"
                >
                  הוסף חיית מחמד ראשונה
                </button>
              </motion.div>
            )}
          </div>

          {/* Quick Actions Grid */}
          <div>
            <h3 className="text-gray-900 font-black font-jakarta text-xl mb-4">פעולות מהירות</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => navigate('/cart')}
                className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-3xl p-5 shadow-md hover:shadow-xl transition-all group hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-green-200/30 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform">
                    <ShoppingCart className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-gray-900 font-black font-jakarta text-center">עגלת קניות</p>
                </div>
              </button>

              <button 
                onClick={() => navigate('/order-history')}
                className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-3xl p-5 shadow-md hover:shadow-xl transition-all group hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200/30 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform">
                    <Package className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-gray-900 font-black font-jakarta text-center">ההזמנות שלי</p>
                </div>
              </button>

              <button 
                onClick={() => navigate('/rewards')}
                className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-200 rounded-3xl p-5 shadow-md hover:shadow-xl transition-all group hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-amber-200/30 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform">
                    <Award className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-gray-900 font-black font-jakarta text-center">תגמולים</p>
                </div>
              </button>

              <button 
                onClick={() => navigate('/tasks')}
                className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-3xl p-5 shadow-md hover:shadow-xl transition-all group hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-red-200/30 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform">
                    <Target className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-gray-900 font-black font-jakarta text-center">משימות</p>
                </div>
              </button>

              <button 
                onClick={() => navigate('/insurance')}
                className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-3xl p-5 shadow-md hover:shadow-xl transition-all group hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/30 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform">
                    <Shield className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-gray-900 font-black font-jakarta text-center">ביטוח</p>
                </div>
              </button>

              <button 
                onClick={() => navigate('/adoption')}
                className="bg-gradient-to-br from-pink-50 to-pink-100 border-2 border-pink-200 rounded-3xl p-5 shadow-md hover:shadow-xl transition-all group hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-pink-200/30 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform">
                    <Heart className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-gray-900 font-black font-jakarta text-center">אימוץ</p>
                </div>
              </button>
            </div>
          </div>

          {/* Premium Features Banner */}
          {activeCoupons.length > 0 && (
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-6 h-6 text-yellow-300 animate-pulse" />
                    <h3 className="text-xl font-black text-white font-jakarta">יש לך קופונים פעילים!</h3>
                  </div>
                  <p className="text-white/90 text-sm font-jakarta mb-3">
                    {activeCoupons.length} קופונים זמינים לשימוש
                  </p>
                  <button
                    onClick={() => navigate('/rewards')}
                    className="bg-white text-purple-600 px-4 py-2 rounded-full font-bold text-sm hover:bg-gray-100 transition-colors shadow-lg"
                  >
                    הצג קופונים
                  </button>
                </div>
                <Award className="w-20 h-20 text-white/20" />
              </div>
            </div>
          )}

          {/* Account Settings */}
          <div>
            <h3 className="text-gray-900 font-black font-jakarta text-xl mb-4">הגדרות</h3>
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/settings')}
                className="w-full bg-white rounded-3xl p-5 shadow-md hover:shadow-xl transition-all flex items-center justify-between group hover:scale-[1.02] active:scale-[0.98] border-2 border-transparent hover:border-blue-200"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl flex items-center justify-center shadow-md">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-gray-900 font-bold font-jakarta">הגדרות כלליות</p>
                    <p className="text-xs text-gray-500 font-jakarta">ניהול העדפות ופרטיות</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => navigate('/notifications')}
                className="w-full bg-white rounded-3xl p-5 shadow-md hover:shadow-xl transition-all flex items-center justify-between group hover:scale-[1.02] active:scale-[0.98] border-2 border-transparent hover:border-orange-200"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-md relative">
                    <Bell className="w-6 h-6 text-white" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-gray-900 font-bold font-jakarta">התראות</p>
                    <p className="text-xs text-gray-500 font-jakarta">עדכונים והתראות חשובות</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => navigate('/support')}
                className="w-full bg-white rounded-3xl p-5 shadow-md hover:shadow-xl transition-all flex items-center justify-between group hover:scale-[1.02] active:scale-[0.98] border-2 border-transparent hover:border-teal-200"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-md">
                    <HelpCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-gray-900 font-bold font-jakarta">תמיכה ועזרה</p>
                    <p className="text-xs text-gray-500 font-jakarta">שירות לקוחות 24/7</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Logout Button */}
          <div className="pt-4 pb-2">
            <button
              onClick={handleLogout}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-jakarta font-bold text-center py-5 rounded-3xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              התנתק מהחשבון
            </button>
          </div>

          {/* Version */}
          <div className="text-center pb-6 pt-4">
            <p className="text-sm text-gray-400 font-jakarta">Petid v1.0.0 • כל הזכויות שמורות</p>
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