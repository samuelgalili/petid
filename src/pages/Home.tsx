import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { HomePageSkeleton } from "@/components/LoadingSkeleton";
import BottomNav from "@/components/BottomNav";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { MyPetsSection } from "@/components/home/MyPetsSection";
import { RewardsHeader } from "@/components/home/RewardsHeader";
import { WalletCard } from "@/components/home/WalletCard";
import { QuickActions } from "@/components/home/QuickActions";
import { AchievementDialog } from "@/components/home/AchievementDialog";
import { PetEditSheet } from "@/components/home/PetEditSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";

// Lazy load heavy components
const PromotionalOffers = lazy(() => import("@/components/home/PromotionalOffers").then(m => ({ default: m.PromotionalOffers })));
const ProductCarousel = lazy(() => import("@/components/home/ProductCarousel").then(m => ({ default: m.ProductCarousel })));
import { 
  Store, 
  ImageIcon, 
  FileText, 
  Heart, 
  ShieldCheck, 
  Scissors, 
  GraduationCap, 
  MapPin 
} from "lucide-react";

// Quick action items for the home page
const quickActions = [
  { icon: FileText, title: "מסמכים", path: "/documents", bgColor: "bg-white" },
  { icon: Store, title: "חנות", path: "/shop", bgColor: "bg-white" },
  { icon: Scissors, title: "מספרה", path: "/grooming", bgColor: "bg-white" },
  { icon: GraduationCap, title: "אילוף", path: "/training", bgColor: "bg-white" },
  { icon: MapPin, title: "גינות כלבים", path: "/parks", bgColor: "bg-white" },
  { icon: ImageIcon, title: "אלבום תמונות", path: "/photos", bgColor: "bg-white" },
  { icon: Heart, title: "אימוץ", path: "/adoption", bgColor: "bg-white" },
  { icon: ShieldCheck, title: "ביטוח", path: "/insurance", bgColor: "bg-white" }
];

// Israeli holidays with approximate dates
const getHolidayGreeting = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const holidays: { [key: string]: string } = {
    "4-13": "פסח", "4-14": "פסח", "4-15": "פסח", "4-16": "פסח",
    "4-17": "פסח", "4-18": "פסח", "4-19": "פסח", "4-20": "פסח",
    "5-23": "שבועות",
    "10-3": "ראש השנה", "10-4": "ראש השנה",
    "10-12": "יום כיפור",
    "10-17": "סוכות", "10-24": "שמחת תורה",
    "12-15": "חנוכה", "12-16": "חנוכה", "12-17": "חנוכה", "12-18": "חנוכה",
    "12-19": "חנוכה", "12-20": "חנוכה", "12-21": "חנוכה", "12-22": "חנוכה",
    "3-14": "פורים"
  };

  const petDays: { [key: string]: string } = {
    "8-26": "יום הכלב הבינלאומי",
    "8-8": "יום החתול הבינלאומי"
  };

  const dateKey = `${month}-${day}`;
  if (holidays[dateKey]) return `חג ${holidays[dateKey]} שמח`;
  if (petDays[dateKey]) {
    return petDays[dateKey] === "יום הכלב הבינלאומי" ? "יום כלבים שמח" : "יום חתולים שמח";
  }
  return null;
};

// Get greeting based on time of day
const getGreeting = () => {
  const holidayGreeting = getHolidayGreeting();
  if (holidayGreeting) return holidayGreeting;
  
  const hour = new Date().getHours();
  if (hour >= 21 || hour < 6) return "לילה טוב";
  if (hour >= 6 && hour < 12) return "בוקר טוב";
  if (hour >= 12 && hour < 17) return "צהריים טובים";
  return "ערב טוב";
};

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [petsLoading, setPetsLoading] = useState(true);
  const [pets, setPets] = useState<any[]>([]);
  const [redetectingPetId, setRedetectingPetId] = useState<string | null>(null);
  const [selectedPetForEdit, setSelectedPetForEdit] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", breed: "" });
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newlyAddedPetIds, setNewlyAddedPetIds] = useState<Set<string>>(new Set());
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [userName, setUserName] = useState<string>("חבר");
  const [promotionalOffers, setPromotionalOffers] = useState<any[]>([]);
  const [showAchievement, setShowAchievement] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const previousPetIdsRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();

  // Wallet Achievements System
  const walletAchievements = [
    { id: 1, name: "מתחיל חסכן", threshold: 10, icon: "🌱", color: "from-success to-success-dark", description: "צברת ₪10 בחיסכון" },
    { id: 2, name: "חוסך מתמיד", threshold: 50, icon: "💚", color: "from-success-dark to-primary", description: "צברת ₪50 בחיסכון" },
    { id: 3, name: "חוסך מקצועי", threshold: 100, icon: "⭐", color: "from-warning to-accent", description: "צברת ₪100 בחיסכון" },
    { id: 4, name: "מומחה חיסכון", threshold: 250, icon: "🏆", color: "from-accent to-error", description: "צברת ₪250 בחיסכון" },
    { id: 5, name: "אלוף החיסכון", threshold: 500, icon: "👑", color: "from-secondary to-secondary-light", description: "צברת ₪500 בחיסכון" },
    { id: 6, name: "אגדת החיסכון", threshold: 1000, icon: "💎", color: "from-primary to-secondary", description: "צברת ₪1000 בחיסכון" }
  ];

  // Confetti effects
  const triggerConfetti = useCallback(() => {
    const count = 200;
    const defaults = { origin: { y: 0.7 }, zIndex: 9999 };
    
    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }
    
    fire(0.25, { spread: 26, startVelocity: 55, colors: ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))'] });
    fire(0.2, { spread: 60, colors: ['hsl(var(--primary-dark))', 'hsl(var(--accent-hover))', 'hsl(var(--secondary-light))', 'hsl(var(--success-light))'] });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors: ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))'] });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, colors: ['hsl(var(--primary-dark))', 'hsl(var(--accent-hover))'] });
    fire(0.1, { spread: 120, startVelocity: 45, colors: ['hsl(var(--primary))', 'hsl(var(--success))'] });
  }, []);

  // Fetch user's pets and profile
  useEffect(() => {
    const fetchPets = async () => {
      setPetsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPetsLoading(false);
        setLoading(false);
        return;
      }

      // Fetch user profile name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (profile?.full_name) {
        const firstName = profile.full_name.split(' ')[0];
        setUserName(firstName);
      }

      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching pets:", error);
        toast({
          title: "שגיאה בטעינת חיות המחמד",
          description: error.message,
          variant: "destructive"
        });
      } else if (data) {
        // Detect newly added pets
        const currentPetIds = new Set(data.map(p => p.id));
        const previousPetIds = previousPetIdsRef.current;
        const newPets = data.filter(p => !previousPetIds.has(p.id));
        
        if (newPets.length > 0) {
          const newIds = new Set(newPets.map(p => p.id));
          setNewlyAddedPetIds(newIds);
          triggerConfetti();
          
          setTimeout(() => {
            setNewlyAddedPetIds(new Set());
          }, 5000);
        }
        
        previousPetIdsRef.current = currentPetIds;
        setPets(data);
      }
      
      setPetsLoading(false);
      setLoading(false);
    };

    fetchPets();
  }, [toast, triggerConfetti]);

  // Fetch promotional offers
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const { data, error } = await supabase
          .from('promotional_offers')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        if (data) setPromotionalOffers(data);
      } catch (error: any) {
        console.error("Error fetching offers:", error);
      }
    };

    fetchOffers();
  }, []);

  // Simulate wallet balance (in production, fetch from database)
  useEffect(() => {
    setWalletBalance(127.50);
  }, []);

  // Pet long press handlers
  const handlePetLongPressStart = useCallback((pet: any) => {
    const timer = setTimeout(() => {
      setSelectedPetForEdit(pet);
      setEditFormData({ name: pet.name, breed: pet.breed || "" });
    }, 500);
    setLongPressTimer(timer);
  }, []);

  const handlePetLongPressEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  // Save pet edits
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

  // Archive pet
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <HomePageSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]" dir="rtl">
      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Main Content */}
      <main className="pb-20">
        {/* Rewards Header */}
        <RewardsHeader 
          userName={userName}
          greeting={getGreeting()}
          onMenuOpen={() => setIsMenuOpen(true)}
        />

        {/* My Pets Section */}
        <MyPetsSection
          pets={pets}
          newlyAddedPetIds={newlyAddedPetIds}
          onPetLongPressStart={handlePetLongPressStart}
          onPetLongPressEnd={handlePetLongPressEnd}
        />

        {/* Wallet Card */}
        <WalletCard 
          walletBalance={walletBalance}
          achievements={walletAchievements}
          onNavigate={() => navigate('/rewards')}
        />

        {/* Quick Actions */}
        <QuickActions actions={quickActions} />

        {/* Promotional Offers */}
        {promotionalOffers.length > 0 && (
          <Suspense fallback={
            <div className="px-4 py-6">
              <Skeleton className="h-8 w-48 mb-4" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          }>
            <PromotionalOffers offers={promotionalOffers} />
          </Suspense>
        )}

        {/* Product Carousel */}
        <Suspense fallback={
          <div className="px-4 py-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="flex gap-4 overflow-hidden">
              <Skeleton className="h-64 w-48 rounded-2xl flex-shrink-0" />
              <Skeleton className="h-64 w-48 rounded-2xl flex-shrink-0" />
              <Skeleton className="h-64 w-48 rounded-2xl flex-shrink-0" />
            </div>
          </div>
        }>
          <ProductCarousel />
        </Suspense>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Achievement Dialog */}
      <AchievementDialog
        isOpen={showAchievement}
        achievement={currentAchievement}
        onClose={() => setShowAchievement(false)}
      />

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
