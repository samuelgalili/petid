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
  const [dailyTasks, setDailyTasks] = useState([
    { id: 1, title: "הליכה של 20 דקות", icon: "🚶", completed: false },
    { id: 2, title: "שתיית מים טריים", icon: "💧", completed: false },
    { id: 3, title: "ארוחת בוקר", icon: "🍽️", completed: false }
  ]);
  const [nearbyParks, setNearbyParks] = useState<any[]>([]);

  const { toast } = useToast();
  const { streak, updateStreak } = useGame();
  const { totalPoints } = usePoints();

  // Quick Actions
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
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const primaryPet = pets[0];

  return (
    <div className="min-h-screen bg-[#F5F5F3] pb-20" dir="rtl">
      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Main Content */}
      <main className="px-4 py-5 space-y-5">
        {/* Header Card - Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full h-[140px] rounded-2xl overflow-hidden bg-gradient-to-br from-[#F4C542] to-[#FF9A76] shadow-sm"
        >
          {/* Menu Button */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors z-10"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center h-full px-6">
            {/* Pet Avatar */}
            {primaryPet && (
              <div className="flex-shrink-0 w-16 h-16 rounded-full border-4 border-white/30 overflow-hidden bg-white shadow-lg">
                {primaryPet.avatar_url ? (
                  <img
                    src={primaryPet.avatar_url}
                    alt={primaryPet.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    {primaryPet.type === 'dog' ? '🐕' : '🐈'}
                  </div>
                )}
              </div>
            )}

            {/* Greeting Text */}
            <div className="mr-4 flex-1">
              <h1 className="text-white text-xl font-bold leading-tight">
                {getGreeting()}, {userName}
                {primaryPet && ` ו-${primaryPet.name}`} 🐾
              </h1>
              
              {/* Points Indicator */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-lg">⭐</span>
                  <span className="text-white text-sm font-semibold">{totalPoints}</span>
                  <span className="text-white/80 text-xs">נקודות</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-between items-center gap-2"
        >
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 flex-1 min-w-0"
            >
              <div className="w-14 h-14 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:shadow-md hover:scale-105 transition-all">
                <action.icon className="w-6 h-6 text-gray-800" strokeWidth={1.5} />
              </div>
              <span className="text-xs text-gray-700 font-medium text-center leading-tight truncate w-full">
                {action.title}
              </span>
            </button>
          ))}
        </motion.div>

        {/* Tasks Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-5 rounded-2xl shadow-sm border-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">המשימות שלי</h2>
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
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => handleTaskToggle(task.id)}
                      className="w-5 h-5"
                    />
                    <span className="text-2xl">{task.icon}</span>
                    <span className={`text-sm flex-1 ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {task.title}
                    </span>
                    {task.completed && (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl mb-2 block">😊</span>
                <p className="text-sm">אין משימות פתוחות להיום!</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-5 rounded-2xl shadow-sm border-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">המלצות בשבילך</h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary hover:text-primary/80 h-auto p-0"
              >
                עוד הצעות
              </Button>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
              {recommendations.map(rec => (
                <div
                  key={rec.id}
                  className="flex-shrink-0 w-[140px] bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-3 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="text-4xl mb-2">{rec.image}</div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight mb-1">
                    {rec.title}
                  </h3>
                  <p className="text-xs text-gray-600">{rec.subtitle}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Nearby Park */}
        {nearbyParks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-5 rounded-2xl shadow-sm border-0 bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-primary" />
                    <h3 className="text-base font-bold text-gray-900">{nearbyParks[0].name}</h3>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{nearbyParks[0].city}</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-3 h-3 ${star <= (nearbyParks[0].rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                      />
                    ))}
                    <span className="text-xs text-gray-600 mr-1">
                      ({nearbyParks[0].rating || 0})
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate('/parks')}
                  className="bg-primary hover:bg-primary/90 text-white rounded-full h-8 px-4"
                >
                  <Navigation className="w-3 h-3 ml-1" />
                  נווט
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-4 gap-3"
        >
          <Card className="p-3 rounded-xl shadow-sm border-0 text-center">
            <div className="text-2xl font-bold text-primary">{streak?.current_streak || 0}</div>
            <div className="text-xs text-gray-600 mt-1">ימים ברצף</div>
          </Card>
          <Card className="p-3 rounded-xl shadow-sm border-0 text-center">
            <div className="text-2xl font-bold text-primary">{pets.length}</div>
            <div className="text-xs text-gray-600 mt-1">חיות מחמד</div>
          </Card>
          <Card className="p-3 rounded-xl shadow-sm border-0 text-center">
            <div className="text-2xl font-bold text-primary">{totalPoints}</div>
            <div className="text-xs text-gray-600 mt-1">נקודות</div>
          </Card>
          <Card className="p-3 rounded-xl shadow-sm border-0 text-center">
            <div className="text-2xl font-bold text-primary">3</div>
            <div className="text-xs text-gray-600 mt-1">גינות</div>
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
    </div>
  );
};

export default Home;
