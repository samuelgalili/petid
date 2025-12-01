import { useState, useEffect } from "react";
import { PageTransition } from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { 
  ChevronRight,
  CreditCard,
  Lock,
  ShoppingBag,
  ShoppingCart,
  Gift,
  Receipt,
  Plus,
  Check,
  Car
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
          
          {/* User Header Section */}
          <div className="mb-6">
            <h2 className="text-3xl font-extrabold text-gray-900 font-jakarta mb-2">
              {profile?.full_name || "שמואל גלילי יוסף"}
            </h2>
            <button 
              onClick={() => navigate('/settings')}
              className="text-base text-blue-600 font-jakarta hover:underline font-semibold inline-flex items-center gap-1"
            >
              ערוך פרטים
              <span className="text-lg">&lt;</span>
            </button>
          </div>

          {/* Pets Section */}
          <div>
            <h3 className="text-gray-900 font-extrabold font-jakarta text-xl mb-3">הרכבים שלי</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-700 font-jakarta text-base">ניתן לחסוך עד שלושה רכבים</p>
                <button 
                  onClick={() => navigate('/add-pet')}
                  className="text-blue-600 font-jakarta font-semibold hover:underline text-base"
                >
                  הוספת רכב
                </button>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
              {pets.length > 0 ? (
                pets.map((pet) => (
                  <div 
                    key={pet.id}
                    onClick={() => navigate(`/pet/${pet.id}`)}
                    className="bg-white rounded-2xl p-4 mb-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow border border-gray-100"
                  >
                    <Car className="w-12 h-12 text-red-600" strokeWidth={1.5} />
                    <div className="flex-1">
                      <p className="font-extrabold text-gray-900 font-jakarta text-lg">רכב שלי 1</p>
                      <p className="text-gray-600 font-jakarta text-base">56-733-63</p>
                      <p className="text-gray-500 font-jakarta text-sm">דלק 95</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-2xl p-4 border border-gray-100">
                  <p className="text-gray-500 text-base font-jakarta text-center py-4">אין רכבים</p>
                </div>
              )}
            </div>
            </div>
          </div>

          {/* Payments & Security Section */}
          <div>
            <h3 className="text-gray-900 font-extrabold font-jakarta text-xl mb-3">תשלום ואבטחה</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100">
                <span className="font-jakarta text-gray-900 text-base">ניהול אמצעי תשלום</span>
                <CreditCard className="w-6 h-6 text-[#FFD700]" strokeWidth={1.5} />
              </button>
              <button className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <span className="font-jakarta text-gray-900 text-base">הוספת אמצעי הגנה</span>
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-600" strokeWidth={2} />
                  <Lock className="w-6 h-6 text-gray-500" strokeWidth={1.5} />
                </div>
              </button>
            </div>
          </div>

          {/* Orders Section */}
          <div>
            <h3 className="text-gray-900 font-extrabold font-jakarta text-xl mb-3">הספר שלי</h3>
            <div 
              onClick={() => navigate('/order-history')}
              className="bg-white rounded-2xl p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-extrabold text-gray-900 font-jakarta text-lg mb-1">טיפ טוב</p>
                  <p className="text-gray-600 font-jakarta text-base">
                    {lastOrder ? new Date(lastOrder.order_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) + ', רעננה' : 'שברט 22, רעננה'}
                  </p>
                </div>
                <ShoppingCart className="w-8 h-8 text-red-600" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          {/* Membership Section */}
          <div>
            <h3 className="text-gray-900 font-extrabold font-jakarta text-xl mb-3">מנוי הקפה שלי</h3>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <span className="font-jakarta text-gray-900 text-base">
                  אפשר להזמין אותך לקפה?
                </span>
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-600" strokeWidth={2} />
                  <Gift className="w-7 h-7 text-gray-500" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </div>


          {/* Purchase History Section */}
          <div>
            <h3 className="text-gray-900 font-extrabold font-jakarta text-xl mb-3">היסטוריית רכישות</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button 
                onClick={() => navigate('/order-history')}
                className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100"
              >
                <span className="font-jakarta text-gray-900 text-base">חשבונית דיגיטלית</span>
                <Receipt className="w-6 h-6 text-green-600" strokeWidth={1.5} />
              </button>
              <label className="flex items-center gap-3 p-5 cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="w-6 h-6 rounded border-2 border-blue-600 flex items-center justify-center bg-blue-600">
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                </div>
                <span className="text-base text-gray-700 font-jakarta">
                  אני רוצה לקבל חשבוניות לאזור האישי
                </span>
              </label>
            </div>
          </div>

          {/* Logout Button */}
          <div className="pt-6 pb-2">
            <button
              onClick={handleLogout}
              className="text-blue-600 font-jakarta font-bold text-center w-full py-3 hover:underline text-lg"
            >
              התנתקות
            </button>
          </div>

          {/* Version */}
          <div className="text-center pb-6">
            <p className="text-sm text-gray-500 font-jakarta">גרסה: 8.3.57</p>
          </div>
        </div>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Profile;