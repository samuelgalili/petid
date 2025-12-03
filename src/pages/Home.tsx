import {
  Loader2,
  Plus,
  Camera,
  Heart,
  MapPin,
  Store,
  ImageIcon,
  FileText,
  ShieldCheck,
  Scissors,
  GraduationCap,
  Trophy,
  Menu,
  ChevronRight,
  Check,
  Star,
  Navigation
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { PetEditSheet } from "@/components/home/PetEditSheet";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import { useGame } from "@/contexts/GameContext";
import { usePoints } from "@/contexts/PointsContext";
import BottomNav from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { WalletCard } from "@/components/home/WalletCard";
import { ProductCarousel } from "@/components/home/ProductCarousel";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 21 || hour < 6) return "לילה טוב";
  if (hour >= 6 && hour < 12) return "בוקר טוב";
  if (hour >= 12 && hour < 17) return "צהריים טובים";
  return "ערב טוב";
};

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPetForEdit, setSelectedPetForEdit] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", breed: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userName, setUserName] = useState<string>("חבר");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(127.50);
  const [dailyTasks, setDailyTasks] = useState([
    { id: 1, title: "הליכה של 20 דקות", icon: "🚶", completed: false },
    { id: 2, title: "שתיית מים טריים", icon: "💧", completed: false },
    { id: 3, title: "ארוחת בוקר", icon: "🍽️", completed: false }
  ]);
  const [nearbyParks, setNearbyParks] = useState<any[]>([]);

  const { toast } = useToast();
  const { streak, updateStreak } = useGame();
  const { totalPoints } = usePoints();

  // Wallet achievements
  const walletAchievements = [
    { id: 1, name: "מתחיל", threshold: 50, icon: "🌱", color: "from-green-400 to-green-500", description: "חסכת ₪50" },
    { id: 2, name: "חוסך", threshold: 100, icon: "💰", color: "from-blue-400 to-blue-500", description: "חסכת ₪100" },
    { id: 3, name: "מומחה", threshold: 200, icon: "⭐", color: "from-purple-400 to-purple-500", description: "חסכת ₪200" },
    { id: 4, name: "אלוף", threshold: 500, icon: "👑", color: "from-yellow-400 to-orange-500", description: "חסכת ₪500" },
  ];

  // Quick Actions - Updated with consistent icon set
  const quickActions = [
    { icon: FileText, title: "מסמכים", path: "/documents" },
    { icon: Store, title: "חנות", path: "/shop" },
    { icon: MapPin, title: "גינות", path: "/parks" },
    { icon: GraduationCap, title: "אילוף", path: "/training" },
    { icon: Scissors, title: "מספרה", path: "/grooming" }
  ];

  // Recommendations
  const recommendations = [
    { id: 1, title: "גן הכלבים בפארק", subtitle: "2.3 ק״מ ממך", image: "🏞️" },
    { id: 2, title: "מזון פרימיום", subtitle: "20% הנחה", image: "🍖" },
    { id: 3, title: "טיפ אילוף", subtitle: "בסיסי למתחילים", image: "🎓" }
  ];

  // Fetch user data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (profile?.full_name) {
        setUserName(profile.full_name.split(' ')[0]);
      }

      // Fetch pets
      const { data: petsData } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (petsData) setPets(petsData);

      // Fetch nearby parks
      const { data: parksData } = await supabase
        .from('dog_parks')
        .select('*')
        .eq('status', 'active')
        .limit(3);

      if (parksData) setNearbyParks(parksData);

      setLoading(false);
    };

    fetchData();
    updateStreak();
  }, [updateStreak]);

  const handleTaskToggle = (taskId: number) => {
    setDailyTasks(tasks =>
      tasks.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleSavePetEdit = useCallback(async () => {
    if (!selectedPetForEdit) return;

    try {
      const { error } = await supabase
        .from('pets')
        .update({
          name: editFormData.name,
          breed: editFormData.breed,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPetForEdit.id);

      if (error) throw error;

      setPets(pets.map(p =>
        p.id === selectedPetForEdit.id
          ? { ...p, name: editFormData.name, breed: editFormData.breed }
          : p
      ));

      toast({
        title: "✅ עודכן בהצלחה",
        description: "פרטי חיית המחמד עודכנו"
      });

      setSelectedPetForEdit(null);
    } catch (error: any) {
      toast({
        title: "שגיאה בעדכון",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [selectedPetForEdit, editFormData, pets, toast]);

  const handleArchivePet = useCallback(async () => {
    if (!selectedPetForEdit) return;

    try {
      const { error } = await supabase
        .from('pets')
        .update({
          archived: true,
          archived_at: new Date().toISOString()
        })
        .eq('id', selectedPetForEdit.id);

      if (error) throw error;

      setPets(pets.filter(p => p.id !== selectedPetForEdit.id));

      toast({
        title: "✅ הועבר לארכיון",
        description: `${selectedPetForEdit.name} הועבר לארכיון`
      });

      setSelectedPetForEdit(null);
      setShowDeleteConfirm(false);
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [selectedPetForEdit, pets, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" strokeWidth={1.5} />
      </div>
    );
  }

  const primaryPet = pets[0];

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Main Content */}
      <main className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Header - Minimalist Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              {getGreeting()}, {userName}
            </h1>
            {primaryPet && (
              <p className="text-sm text-muted-foreground">
                עם {primaryPet.name} {primaryPet.type === 'dog' ? '🐕' : '🐈'}
              </p>
            )}
          </div>
          
          <button
            onClick={() => setIsMenuOpen(true)}
            className="w-10 h-10 rounded-lg hover:bg-muted transition-colors flex items-center justify-center"
            aria-label="תפריט"
          >
            <Menu className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </button>
        </motion.div>

        {/* Wallet Card - Sales Focus */}
        <WalletCard 
          walletBalance={walletBalance}
          achievements={walletAchievements}
          onNavigate={() => navigate('/rewards')}
        />

        {/* Quick Actions - Minimal Icons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex justify-between items-center gap-3">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2 flex-1 group"
              >
                <div className="w-14 h-14 rounded-full border border-border bg-white flex items-center justify-center hover:border-primary/20 hover:shadow-md transition-all">
                  <action.icon 
                    className="w-5 h-5 text-[#2D2D2D] group-hover:text-[#00A870] transition-colors duration-200" 
                    strokeWidth={1.5} 
                  />
                </div>
                <span className="text-[10px] font-medium text-foreground text-center leading-tight">
                  {action.title}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tasks Widget - Clean */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="p-5 rounded-xl border border-border bg-surface shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">המשימות שלי</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/tasks')}
                className="text-xs text-primary hover:text-primary/80 h-auto p-0"
              >
                ראה הכל
              </Button>
            </div>

            {dailyTasks.length > 0 ? (
              <div className="space-y-3">
                {dailyTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => handleTaskToggle(task.id)}
                      className="w-5 h-5"
                    />
                    <span className="text-xl">{task.icon}</span>
                    <span className={`text-sm flex-1 ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {task.title}
                    </span>
                    {task.completed && (
                      <Check className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <span className="text-3xl mb-2 block">😊</span>
                <p className="text-sm">אין משימות פתוחות להיום!</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Recommendations - Clean Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="mb-3">
            <h2 className="text-base font-semibold text-foreground">המלצות</h2>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {recommendations.map(rec => (
              <div
                key={rec.id}
                className="flex-shrink-0 w-[140px] border border-border bg-surface rounded-xl p-4 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="text-3xl mb-2">{rec.image}</div>
                <h3 className="text-sm font-medium text-foreground leading-tight mb-1">
                  {rec.title}
                </h3>
                <p className="text-xs text-muted-foreground">{rec.subtitle}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Nearby Park - Minimal */}
        {nearbyParks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="p-4 rounded-xl border border-border bg-surface shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    <h3 className="text-sm font-semibold text-foreground">{nearbyParks[0].name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{nearbyParks[0].city}</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-3 h-3 ${star <= (nearbyParks[0].rating || 0) ? 'fill-primary text-primary' : 'text-border'}`}
                        strokeWidth={1.5}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground mr-1">
                      ({nearbyParks[0].rating || 0})
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate('/parks')}
                  className="bg-foreground hover:bg-foreground/90 text-background rounded-lg h-8 px-3 text-xs"
                >
                  נווט
                  <Navigation className="w-3 h-3 mr-1" strokeWidth={1.5} />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Product Carousel - Sales Focus */}
        <ProductCarousel />

        {/* Statistics - Minimal Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-4 gap-3"
        >
          <Card className="p-4 rounded-xl border border-border bg-surface shadow-sm text-center">
            <div className="text-2xl font-semibold text-foreground">{streak?.current_streak || 0}</div>
            <div className="text-[10px] text-muted-foreground mt-1">ימים ברצף</div>
          </Card>
          <Card className="p-4 rounded-xl border border-border bg-surface shadow-sm text-center">
            <div className="text-2xl font-semibold text-foreground">{pets.length}</div>
            <div className="text-[10px] text-muted-foreground mt-1">חיות מחמד</div>
          </Card>
          <Card className="p-4 rounded-xl border border-border bg-surface shadow-sm text-center">
            <div className="text-2xl font-semibold text-foreground">{totalPoints}</div>
            <div className="text-[10px] text-muted-foreground mt-1">נקודות</div>
          </Card>
          <Card className="p-4 rounded-xl border border-border bg-surface shadow-sm text-center">
            <div className="text-2xl font-semibold text-foreground">3</div>
            <div className="text-[10px] text-muted-foreground mt-1">גינות</div>
          </Card>
        </motion.div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Pet Edit Sheet */}
      <PetEditSheet
        pet={selectedPetForEdit}
        isOpen={!!selectedPetForEdit}
        onClose={() => setSelectedPetForEdit(null)}
        editFormData={editFormData}
        onFormDataChange={setEditFormData}
        onSave={handleSavePetEdit}
        onDelete={handleArchivePet}
        showDeleteConfirm={showDeleteConfirm}
        onDeleteConfirmChange={setShowDeleteConfirm}
      />

      {/* Push Notification Prompt */}
      <PushNotificationPrompt />

      {/* Floating Action Button */}
      <FloatingActionButton
        actions={[
          {
            icon: Plus,
            label: "הוסף חיית מחמד",
            onClick: () => navigate("/add-pet")
          },
          {
            icon: Camera,
            label: "העלה תמונה",
            onClick: () => navigate("/photos")
          },
          {
            icon: Store,
            label: "חנות",
            onClick: () => navigate("/shop")
          },
          {
            icon: MapPin,
            label: "מצא גינת כלבים",
            onClick: () => navigate("/parks")
          },
          {
            icon: Heart,
            label: "אימוץ",
            onClick: () => navigate("/adoption")
          }
        ]}
        position="bottom-right"
      />
    </div>
  );
};

export default Home;
