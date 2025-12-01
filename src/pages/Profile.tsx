import { useState, useEffect } from "react";
import { PageTransition } from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { 
  ChevronLeft,
  CreditCard,
  Lock,
  ShoppingBag,
  Gift,
  MapPin,
  Receipt,
  Plus,
  ChevronRight,
  Check
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
        <div className="min-h-screen bg-white flex items-center justify-center pb-20">
          <div className="w-12 h-12 border-3 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-white pb-20" dir="rtl">
        {/* Header */}
        <div className="bg-white px-4 pt-4 pb-4 flex items-center justify-between sticky top-0 z-10 border-b border-gray-100">
          <button onClick={() => navigate(-1)} className="p-2">
            <ChevronRight className="w-6 h-6 text-gray-900" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 font-jakarta">האזור האישי שלך</h1>
          <div className="w-10" />
        </div>

        {/* Content Container */}
        <div className="px-4 py-4 space-y-4">
          
          {/* User Header Section */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 font-jakarta mb-1">
              {profile?.full_name || "אורח"}
            </h2>
            <button 
              onClick={() => navigate('/settings')}
              className="text-sm text-blue-600 font-jakarta hover:underline"
            >
              ערוך פרטים &lt;
            </button>
          </div>

          {/* Pets Section */}
          <div>
            <h3 className="text-gray-900 font-bold font-jakarta mb-3">הרכבים שלי</h3>
            <div className="bg-[#F7F7F7] rounded-2xl p-4 shadow-sm space-y-3">
              {pets.length > 0 ? (
                pets.map((pet) => (
                  <div 
                    key={pet.id}
                    onClick={() => navigate(`/pet/${pet.id}`)}
                    className="bg-white rounded-xl p-3 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                        {pet.avatar_url ? (
                          <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                        ) : (
                          <img 
                            src={pet.type === 'dog' ? dogIcon : catIcon} 
                            alt={pet.type} 
                            className="w-6 h-6"
                          />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 font-jakarta text-sm">{pet.name}</p>
                        <p className="text-xs text-gray-500 font-jakarta">{pet.breed || pet.type}</p>
                      </div>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-gray-400" />
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm font-jakarta text-center py-2">אין חיות מחמד</p>
              )}
              <button
                onClick={() => navigate('/add-pet')}
                className="w-full bg-white rounded-xl p-3 flex items-center justify-center gap-2 text-blue-600 font-jakarta font-semibold hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-5 h-5" />
                הוסף רכב
              </button>
            </div>
          </div>

          {/* Payments & Security Section */}
          <div>
            <h3 className="text-gray-900 font-bold font-jakarta mb-3">תשלום ואבטחה</h3>
            <div className="bg-[#F7F7F7] rounded-2xl p-4 shadow-sm space-y-3">
              <button className="w-full bg-white rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                  <span className="font-jakarta text-gray-900">ניהול אמצעי תשלום</span>
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
              <button className="w-full bg-white rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                  <span className="font-jakarta text-gray-900">הוספת אמצעי הגנה</span>
                </div>
                <Plus className="w-5 h-5 text-blue-600" />
              </button>
            </div>
          </div>

          {/* Orders Section */}
          {lastOrder && (
            <div>
              <h3 className="text-gray-900 font-bold font-jakarta mb-3">הספר שלי</h3>
              <div 
                onClick={() => navigate('/order-history')}
                className="bg-[#F7F7F7] rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="bg-white rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-5 h-5 text-red-600" strokeWidth={1.5} />
                    <div>
                      <p className="font-bold text-gray-900 font-jakarta text-sm">טיפ טוב</p>
                      <p className="text-xs text-gray-500 font-jakarta">
                        {new Date(lastOrder.order_date).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
          )}

          {/* Membership Section */}
          {activeCoupons.length > 0 && (
            <div>
              <h3 className="text-gray-900 font-bold font-jakarta mb-3">מנוי הקפה שלי</h3>
              <div className="bg-[#F7F7F7] rounded-2xl p-4 shadow-sm">
                <p className="text-sm text-gray-700 font-jakarta mb-2">
                  ניתן לחסוך עד שלושה רכבים
                </p>
                <button
                  onClick={() => navigate('/rewards')}
                  className="w-full bg-white rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <Gift className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                    <span className="font-jakarta text-gray-900">
                      אפשר להחסין אותר לקפה?
                    </span>
                  </div>
                  <Plus className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
          )}

          {/* Dog Parks Section */}
          {nearbyParks.length > 0 && (
            <div>
              <h3 className="text-gray-900 font-bold font-jakarta mb-3">גינות כלבים קרובות</h3>
              <div className="bg-[#F7F7F7] rounded-2xl p-4 shadow-sm">
                {nearbyParks.slice(0, 2).map((park) => (
                  <div key={park.id} className="bg-white rounded-xl p-3 mb-2 last:mb-0">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-700" strokeWidth={1.5} />
                      <p className="font-jakarta text-gray-900 text-sm">{park.name}</p>
                    </div>
                    <p className="text-xs text-gray-500 font-jakarta mr-6">{park.city}</p>
                  </div>
                ))}
                <button
                  onClick={() => navigate('/parks')}
                  className="w-full text-blue-600 font-jakarta text-sm mt-3 hover:underline"
                >
                  צפייה בכל הגינות &lt;
                </button>
              </div>
            </div>
          )}

          {/* Purchase History Section */}
          <div>
            <h3 className="text-gray-900 font-bold font-jakarta mb-3">היסטוריית רכישות</h3>
            <div className="bg-[#F7F7F7] rounded-2xl p-4 shadow-sm">
              <button 
                onClick={() => navigate('/order-history')}
                className="w-full bg-white rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow mb-3"
              >
                <div className="flex items-center gap-3">
                  <Receipt className="w-5 h-5 text-green-600" strokeWidth={1.5} />
                  <span className="font-jakarta text-gray-900">חשבונית דיגיטלית</span>
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
              <label className="flex items-center gap-2 pr-4">
                <div className="w-5 h-5 rounded border-2 border-blue-600 flex items-center justify-center">
                  <Check className="w-4 h-4 text-blue-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700 font-jakarta">
                  אני רוצה לקבל חשבוניות לאזור האישי
                </span>
              </label>
            </div>
          </div>

          {/* Logout Button */}
          <div className="pt-4">
            <button
              onClick={handleLogout}
              className="text-blue-600 font-jakarta font-semibold text-center w-full py-2 hover:underline"
            >
              התנתקות
            </button>
          </div>

          {/* Version */}
          <div className="text-center pb-4">
            <p className="text-xs text-gray-400 font-jakarta">גרסה: 1.0.0</p>
          </div>
        </div>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Profile;