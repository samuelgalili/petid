/**
 * HomePage - Primary home page showing user profile summary
 * Enhanced premium design with improved visual hierarchy
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
  Plus,
  Sparkles
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
    { icon: FileText, label: "מסמכים", path: "/documents", gradient: "from-blue-500 to-blue-600" },
    { icon: ShoppingBag, label: "חנות", path: "/shop", gradient: "from-green-500 to-emerald-600" },
    { icon: MapPin, label: "גינות", path: "/parks", gradient: "from-purple-500 to-violet-600" },
    { icon: GraduationCap, label: "אילוף", path: "/training", gradient: "from-orange-500 to-amber-600" },
    { icon: Scissors, label: "מספרה", path: "/grooming", gradient: "from-pink-500 to-rose-600" },
  ];

  const menuItems = [
    { icon: Heart, label: "המועדפים שלי", path: "/favorites", color: "text-rose-500" },
    { icon: Shield, label: "ביטוח", path: "/insurance", color: "text-blue-500" },
    { icon: PawPrint, label: "אימוץ", path: "/adoption", color: "text-amber-500" },
    { icon: Camera, label: "אלבום תמונות", path: "/photos", color: "text-purple-500" },
    { icon: FileText, label: "מסמכים", path: "/documents", color: "text-cyan-500" },
    { icon: ShoppingBag, label: "היסטוריית הזמנות", path: "/order-history", color: "text-green-500" },
  ];

  const walletBalance = stats?.totalPoints || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-24" dir="rtl">
      {/* Enhanced Header with Profile */}
      <motion.header 
        className="relative overflow-hidden"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background" />
        
        <div className="relative px-4 pt-4 pb-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-6">
            <motion.div 
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Petid
              </span>
            </motion.div>
            <div className="flex items-center gap-2">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate('/notifications')}
                  className="relative w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm shadow-sm"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate('/settings')}
                  className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm shadow-sm"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </motion.div>
            </div>
          </div>

          {/* User Profile Section */}
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/profile')}
            >
              <div className="w-20 h-20 rounded-2xl p-[3px] bg-gradient-to-br from-primary via-accent to-secondary shadow-lg cursor-pointer">
                <Avatar className="w-full h-full rounded-xl">
                  <AvatarImage src={profile?.avatar_url || ""} className="object-cover rounded-xl" />
                  <AvatarFallback className="bg-muted text-2xl font-bold rounded-xl">
                    {profile?.full_name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center ring-2 ring-background">
                <span className="text-white text-[10px]">✓</span>
              </div>
            </motion.div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground mb-1">
                {profile?.full_name ? `שלום, ${profile.full_name.split(' ')[0]}!` : 'שלום!'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {profile?.bio || 'ברוכים הבאים ל-Petid 🐾'}
              </p>
            </div>
          </motion.div>
        </div>
      </motion.header>

      <div className="px-4 py-4 space-y-6">
        {/* Premium Wallet Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => navigate('/rewards')}
          className="cursor-pointer"
        >
          <motion.div
            className="relative rounded-3xl shadow-xl p-6 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, hsl(42, 100%, 55%) 0%, hsl(38, 92%, 50%) 50%, hsl(35, 95%, 45%) 100%)'
            }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Decorative Elements */}
            <div className="absolute inset-0">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/15 rounded-full blur-2xl" />
              <div className="absolute top-1/2 left-1/3 w-20 h-20 bg-white/10 rounded-full blur-xl" />
            </div>

            <div className="relative flex items-center justify-between">
              <motion.div className="text-right">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white leading-none">
                    ₪{walletBalance.toFixed(2)}
                  </span>
                </div>
                <div className="text-sm font-semibold text-white/90 mt-1">
                  יתרת חיסכון
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="px-3 py-1 bg-white/25 rounded-full text-xs font-bold text-white backdrop-blur-sm">
                    🏆 דרגה: גור
                  </span>
                </div>
              </motion.div>

              <motion.div
                className="w-24 h-24"
                animate={{ y: [0, -6, 0], rotate: [0, 3, -3, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <img src={catIconGif} alt="Cat" className="w-full h-full object-contain drop-shadow-lg" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        {/* Quick Actions - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex justify-between gap-2 overflow-x-auto pb-2">
            {quickActions.map((action, index) => (
              <motion.button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2 min-w-[64px]"
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${action.gradient} shadow-lg`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-semibold text-foreground">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* My Pets Section - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <PawPrint className="w-5 h-5 text-primary" />
              החיות שלי
            </h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/add-pet')}
              className="rounded-full border-primary/30 hover:bg-primary/10"
            >
              <Plus className="w-4 h-4 ml-1" />
              הוסף
            </Button>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
            {pets.map((pet, index) => (
              <motion.button
                key={pet.id}
                onClick={() => navigate(`/pet/${pet.id}`)}
                className="flex flex-col items-center gap-2 shrink-0"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <div className="p-[3px] rounded-2xl bg-gradient-to-br from-primary/50 to-accent/50">
                  <Avatar className="w-16 h-16 rounded-xl">
                    <AvatarImage src={pet.avatar_url || ""} className="object-cover" />
                    <AvatarFallback className="bg-muted rounded-xl">
                      <PawPrint className="w-6 h-6 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-xs font-semibold text-foreground truncate max-w-[70px]">
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
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center border-2 border-dashed border-primary/30">
                  <Plus className="w-6 h-6 text-primary/60" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">הוסף חיית מחמד</span>
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Menu Items - Enhanced Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="overflow-hidden shadow-lg border-0 bg-card/80 backdrop-blur-sm">
            {menuItems.map((item, index) => (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-all border-b border-border/50 last:border-0"
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.03 }}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <span className="font-medium text-foreground">{item.label}</span>
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
