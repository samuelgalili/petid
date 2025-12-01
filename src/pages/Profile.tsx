import { useState, useEffect } from "react";
import { PageTransition } from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
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
  PawPrint
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";

const Profile = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [activeCoupons, setActiveCoupons] = useState<any[]>([]);
  const [nearbyParks, setNearbyParks] = useState<any[]>([]);

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

      // Fetch last order
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (ordersData && ordersData.length > 0) {
        setLastOrder(ordersData[0]);
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
          <div className="bg-gradient-to-br from-[#FFD700] via-[#FFED4E] to-[#FFC107] rounded-3xl p-6 mb-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-3xl font-black text-gray-900 font-jakarta mb-2">
                  {profile?.full_name || "משתמש"}
                </h2>
                <p className="text-gray-700 font-jakarta text-sm">
                  {profile?.email || "user@example.com"}
                </p>
              </div>
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                <User className="w-8 h-8 text-gray-900" />
              </div>
            </div>
            <button 
              onClick={() => navigate('/settings')}
              className="w-full bg-white text-gray-900 rounded-2xl py-3 font-bold font-jakarta hover:bg-gray-50 transition-all shadow-md hover:shadow-xl active:scale-[0.98]"
            >
              עריכת פרופיל
            </button>
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
                {pets.map((pet) => (
                  <div 
                    key={pet.id}
                    onClick={() => navigate(`/pet/${pet.id}`)}
                    className="bg-white rounded-3xl p-5 flex items-center gap-4 cursor-pointer hover:shadow-xl transition-all shadow-md group hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 ring-2 ring-gray-200">
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
                      <p className="text-gray-600 font-jakarta text-base">{pet.breed || 'גזע לא ידוע'}</p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 shadow-md text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PawPrint className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-500 text-base font-jakarta mb-4">אין חיות מחמד רשומות</p>
                <button
                  onClick={() => navigate('/add-pet')}
                  className="bg-[#FFD700] text-gray-900 px-6 py-3 rounded-full font-bold font-jakarta hover:bg-[#FFC107] transition-colors"
                >
                  הוסף חיית מחמד ראשונה
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => navigate('/cart')}
              className="bg-white rounded-3xl p-5 shadow-md hover:shadow-xl transition-all group hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <p className="text-gray-900 font-bold font-jakarta text-center text-sm">עגלת קניות</p>
            </button>

            <button 
              onClick={() => navigate('/order-history')}
              className="bg-white rounded-3xl p-5 shadow-md hover:shadow-xl transition-all group hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Package className="w-6 h-6 text-white" />
              </div>
              <p className="text-gray-900 font-bold font-jakarta text-center text-sm">ההזמנות שלי</p>
            </button>

            <button 
              onClick={() => navigate('/rewards')}
              className="bg-white rounded-3xl p-5 shadow-md hover:shadow-xl transition-all group hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="w-6 h-6 text-white" />
              </div>
              <p className="text-gray-900 font-bold font-jakarta text-center text-sm">תגמולים</p>
            </button>

            <button 
              onClick={() => navigate('/tasks')}
              className="bg-white rounded-3xl p-5 shadow-md hover:shadow-xl transition-all group hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-white" />
              </div>
              <p className="text-gray-900 font-bold font-jakarta text-center text-sm">משימות</p>
            </button>
          </div>

          {/* Account Settings */}
          <div>
            <h3 className="text-gray-900 font-black font-jakarta text-xl mb-4">הגדרות חשבון</h3>
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/settings')}
                className="w-full bg-white rounded-3xl p-5 shadow-md hover:shadow-xl transition-all flex items-center justify-between group hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-gray-900 font-bold font-jakarta">הגדרות</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => navigate('/support')}
                className="w-full bg-white rounded-3xl p-5 shadow-md hover:shadow-xl transition-all flex items-center justify-between group hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-gray-900 font-bold font-jakarta">תמיכה ועזרה</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Logout Button */}
          <div className="pt-4 pb-2">
            <button
              onClick={handleLogout}
              className="w-full bg-white text-red-600 font-jakarta font-bold text-center py-5 rounded-3xl shadow-md hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
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
    </PageTransition>
  );
};

export default Profile;