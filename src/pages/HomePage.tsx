/**
 * HomePage - Primary home page showing user profile summary
 * New structure: Home = User Profile (similar to Index but profile-focused)
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Settings, 
  ShoppingBag, 
  Heart, 
  FileText, 
  Camera, 
  Shield, 
  PawPrint,
  ChevronLeft,
  Bell,
  Scissors,
  GraduationCap,
  MapPin,
  User,
  Plus
} from "lucide-react";
import { useLoyalty } from "@/hooks/useLoyalty";
import catIconGif from "@/assets/cat-icon.gif";

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface Pet {
  id: string;
  name: string;
  avatar_url: string | null;
  pet_type: string;
}

const HomePage = () => {
  useRequireAuth();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { stats } = useLoyalty();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchPets();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, bio")
      .eq("id", user.id)
      .maybeSingle();
    if (data) setProfile(data);
  };

  const fetchPets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pets")
      .select("id, name, avatar_url, type")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at", { ascending: false });
    if (data) {
      setPets(data.map(p => ({ ...p, pet_type: p.type })));
    }
  };

  const quickActions = [
    { icon: FileText, label: "מסמכים", path: "/documents", color: "bg-blue-50 text-blue-600" },
    { icon: ShoppingBag, label: "חנות", path: "/shop", color: "bg-green-50 text-green-600" },
    { icon: MapPin, label: "גינות", path: "/parks", color: "bg-purple-50 text-purple-600" },
    { icon: GraduationCap, label: "אילוף", path: "/training", color: "bg-orange-50 text-orange-600" },
    { icon: Scissors, label: "מספרה", path: "/grooming", color: "bg-pink-50 text-pink-600" },
  ];

  const menuItems = [
    { icon: Heart, label: "המועדפים שלי", path: "/favorites" },
    { icon: Shield, label: "ביטוח", path: "/insurance" },
    { icon: PawPrint, label: "אימוץ", path: "/adoption" },
    { icon: Camera, label: "אלבום תמונות", path: "/photos" },
    { icon: FileText, label: "מסמכים", path: "/documents" },
    { icon: ShoppingBag, label: "היסטוריית הזמנות", path: "/order-history" },
  ];

  const walletBalance = stats?.totalPoints || 0;

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      {/* Header */}
      <motion.header 
        className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-xl font-bold">
            {profile?.full_name ? `שלום, ${profile.full_name.split(' ')[0]}` : 'שלום'}
          </h1>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/notifications')}
              className="relative"
            >
              <Bell className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/settings')}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </motion.header>

      <div className="px-4 py-4 space-y-6">
        {/* Wallet/Points Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate('/rewards')}
          className="cursor-pointer"
        >
          <motion.div
            className="relative rounded-[22px] shadow-lg p-6 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, hsl(42, 100%, 50%) 0%, hsl(38, 92%, 55%) 100%)'
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/30 rounded-full blur-2xl" />
            </div>

            <div className="relative flex items-center justify-between">
              <motion.div className="text-left">
                <div className="text-4xl font-black text-foreground leading-none mb-2">
                  ₪{walletBalance.toFixed(2)}
                </div>
                <div className="text-sm font-bold text-foreground/80">
                  יתרת חיסכון
                </div>
              </motion.div>

              <motion.div
                className="w-20 h-20"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <img src={catIconGif} alt="Cat" className="w-full h-full object-contain" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-around gap-2"
        >
          {quickActions.map((action, index) => (
            <motion.button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${action.color} shadow-sm`}>
                <action.icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{action.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* My Pets Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">החיות שלי</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/add-pet')}>
              <Plus className="w-4 h-4 ml-1" />
              הוסף
            </Button>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-2">
            {pets.map((pet) => (
              <motion.button
                key={pet.id}
                onClick={() => navigate(`/pet/${pet.id}`)}
                className="flex flex-col items-center gap-2 shrink-0"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Avatar className="w-16 h-16 ring-2 ring-primary/20">
                  <AvatarImage src={pet.avatar_url || ""} />
                  <AvatarFallback className="bg-muted">
                    <PawPrint className="w-6 h-6 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-foreground truncate max-w-[70px]">
                  {pet.name}
                </span>
              </motion.button>
            ))}
            
            {pets.length === 0 && (
              <motion.button
                onClick={() => navigate('/add-pet')}
                className="flex flex-col items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">הוסף חיית מחמד</span>
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Menu Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="divide-y divide-border overflow-hidden">
            {menuItems.map((item) => (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{item.label}</span>
                </div>
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            ))}
          </Card>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default HomePage;
