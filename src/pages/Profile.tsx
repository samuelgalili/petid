import React, { useState, useEffect, useRef } from "react";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { EmergencyHub } from "@/components/emergency/EmergencyHub";
import { SEO } from "@/components/SEO";
import { PageTransition } from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Plus, Edit3, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";
import { ProfileImageEditor } from "@/components/ProfileImageEditor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQueryClient } from "@tanstack/react-query";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";
import { PetShopView } from "@/components/profile/PetShopView";
import { PetWeatherAlert } from "@/components/profile/PetWeatherAlert";
import { InsuranceSheet, TrainingSheet, GroomingSheet, BoardingSheet, BreedInfoSheet, FoodSheet, ToysSheet, DogWalkerSheet, ProductsSheet, EnergySheet, GroomingProductsSheet, FeedingSheet, MemorialSheet, ComingSoonSheet } from "@/components/pet-services";
import { PetVaultDrawer } from "@/components/pet-services/PetVaultDrawer";
import { SmartRecommendationSheet } from "@/components/pet-services/SmartRecommendationSheet";
import { HealthScoreBreakdown } from "@/components/profile/HealthScoreBreakdown";
import { PetDashboardTabs } from "@/components/profile/PetDashboardTabs";
import { HeartRain } from "@/components/profile/HeartRain";
import { haptic } from "@/lib/haptics";

interface Pet {
  id: string;
  name: string;
  type: 'dog' | 'cat';
  breed?: string;
  age_years?: number;
  age_months?: number;
  size?: string;
  avatar_url?: string;
}

const Profile = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role, isAdmin } = useUserRole();
  const { switchPet: contextSwitchPet, activePet: globalActivePet } = usePetPreference();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [showPetShop, setShowPetShop] = useState(false);
  const [smartRecCategory, setSmartRecCategory] = useState<'coat' | 'energy' | 'health' | 'feeding' | 'mobility' | 'digestion' | null>(null);
  const [healthRefreshKey, setHealthRefreshKey] = useState(0);
  const [healthBreakdownOpen, setHealthBreakdownOpen] = useState(false);
  const [showEmergencyHub, setShowEmergencyHub] = useState(false);
  const [heartRainActive, setHeartRainActive] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const triggerHealthRefresh = () => {
    setHealthRefreshKey((k) => k + 1);
    fetchAllData();
  };

  const triggerHeartRain = () => {
    haptic("success");
    setHeartRainActive(true);
    setTimeout(() => setHeartRainActive(false), 2500);
  };

  const selectedPet = pets.find((p) => p.id === selectedPetId) || null;

  // Sync with global active pet
  useEffect(() => {
    if (globalActivePet?.id && pets.length > 0) {
      setSelectedPetId(globalActivePet.id);
      setIsExpanded(true);
    }
  }, [globalActivePet?.id, pets.length]);

  useEffect(() => {
    fetchAllData();
  }, []);

  // Listen for sheet requests from child components
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.sheet) handleCategoryClick(detail.sheet);
    };
    window.addEventListener("open-pet-sheet", handler);
    return () => window.removeEventListener("open-pet-sheet", handler);
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      const authAvatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
      setProfile({ ...profileData, id: user.id, avatar_url: profileData?.avatar_url || authAvatarUrl });

      const { data: petsData } = await supabase.from('pets').select('*').eq('user_id', user.id).eq('archived', false).order('created_at', { ascending: false });
      const fetchedPets = (petsData || []) as Pet[];
      setPets(fetchedPets);

      if (fetchedPets.length > 0 && !selectedPetId) {
        const initialPetId = globalActivePet?.id && fetchedPets.some((p) => p.id === globalActivePet.id)
          ? globalActivePet.id : fetchedPets[0].id;
        setSelectedPetId(initialPetId);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePetClick = (petId: string) => {
    contextSwitchPet(petId);
    setSelectedPetId(petId);
    setIsExpanded(true);
  };

  const handleCategoryClick = (categoryId: string) => {
    const navigationMap: Record<string, string> = {
      stories: '/reels', videos: '/reels', chat: '/chat', delivery: '/shop',
    };
    if (navigationMap[categoryId]) { navigate(navigationMap[categoryId]); return; }
    if (categoryId === 'health') { setHealthBreakdownOpen(true); return; }
    if (categoryId === 'photo') { setIsImageEditorOpen(true); return; }
    setActiveSheet(categoryId);
  };

  const handleCloseSheet = () => setActiveSheet(null);

  if (loading) {
    return <PageTransition><ProfileSkeleton /><BottomNav /></PageTransition>;
  }

  return (
    <PageTransition>
      <HeartRain active={heartRainActive} />
      <EmergencyHub open={showEmergencyHub} onOpenChange={setShowEmergencyHub} />

      <SEO title="הפרופיל שלי" description="נהלו את חיית המחמד שלכם" url="/profile" type="profile" />

      <div className="h-screen bg-background overflow-hidden flex flex-col" dir="rtl">
        {/* ── Minimal Header ── */}
        <motion.div
          className="flex items-center justify-between px-4 h-12 bg-background/95 backdrop-blur-sm z-20 border-b border-border/10"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <button
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
            className="p-2 -mr-2"
            aria-label="חזרה"
          >
            <ChevronRight className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </button>

          {/* Pet name in header when scrolled */}
          {isExpanded && selectedPet && (
            <motion.span
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm font-semibold text-foreground"
            >
              {selectedPet.name}
            </motion.span>
          )}

          <button
            onClick={() => navigate('/messages')}
            className="p-2 relative"
            aria-label="הודעות"
          >
            <MessageCircle className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </button>
        </motion.div>

        {/* ── Main Content ── */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-[70px]">
          <AnimatePresence mode="wait">
            {!isExpanded ? (
              /* ── Pet Selection Grid ── */
              <motion.div
                key="pets-grid"
                className="flex flex-col items-center px-4 pt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Owner Profile Mini */}
                <motion.div
                  className="flex flex-col items-center mb-6"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="relative mb-3"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setIsImageEditorOpen(true)}
                  >
                    <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-br from-primary/60 to-primary/30">
                      <div className="w-full h-full rounded-full bg-background p-[1.5px]">
                        <Avatar className="w-full h-full">
                          <AvatarImage src={profile?.avatar_url} className="object-cover" />
                          <AvatarFallback className="bg-muted text-foreground font-bold text-xl">
                            {profile?.full_name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                      <Edit3 className="w-3 h-3 text-primary-foreground" />
                    </div>
                  </motion.div>
                  <h1 className="text-lg font-bold text-foreground">
                    {profile?.full_name || "משתמש"}
                  </h1>
                  {profile?.bio && (
                    <p className="text-xs text-muted-foreground text-center max-w-[220px] mt-1">
                      {profile.bio}
                    </p>
                  )}
                </motion.div>

                {/* Pet Cards */}
                {pets.length > 0 ? (
                  <div className="flex flex-wrap justify-center gap-5">
                    {pets.map((pet, index) => (
                      <motion.button
                        key={pet.id}
                        onClick={() => handlePetClick(pet.id)}
                        className="flex flex-col items-center gap-2 group"
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: index * 0.08, type: "spring", damping: 15, stiffness: 200 }}
                        whileHover={{ scale: 1.06, y: -3 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className={`w-[72px] h-[72px] rounded-full p-[2.5px] ${
                          pet.type === 'dog'
                            ? 'bg-gradient-to-br from-primary via-primary/60 to-[hsl(210,80%,60%)]'
                            : 'bg-gradient-to-br from-[hsl(270,60%,60%)] via-primary/60 to-primary'
                        } group-hover:shadow-lg group-hover:shadow-primary/20 transition-shadow`}>
                          <div className="w-full h-full rounded-full overflow-hidden bg-card p-[1px]">
                            <div className="w-full h-full rounded-full overflow-hidden bg-muted">
                              {pet.avatar_url ? (
                                <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted">
                                  <img src={pet.type === 'dog' ? dogIcon : catIcon} alt={pet.type} className="w-8 h-8 opacity-60" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                          {pet.name}
                        </span>
                      </motion.button>
                    ))}

                    {/* Add Pet */}
                    <motion.button
                      onClick={() => navigate('/add-pet')}
                      className="flex flex-col items-center gap-2 group"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: pets.length * 0.05 }}
                    >
                      <div className="w-[72px] h-[72px] rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                        <Plus className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-xs text-muted-foreground/60">הוסף</span>
                    </motion.button>
                  </div>
                ) : (
                  <motion.button className="flex flex-col items-center gap-2 py-6" onClick={() => navigate('/add-pet')}>
                    <div className="w-16 h-16 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground">הוסף חיית מחמד ראשונה</span>
                  </motion.button>
                )}

                <p className="text-[10px] text-muted-foreground/50 mt-4">
                  בחר חיית מחמד לצפייה
                </p>
              </motion.div>
            ) : (
              /* ── Expanded Pet Dashboard ── */
              <motion.div
                key="expanded"
                className="flex-1 px-4"
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 60 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                {/* ── Premium Pet Header ── */}
                {selectedPet && (
                  <motion.div
                    className="flex items-center gap-3.5 py-4 mb-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.35 }}
                  >
                    {/* Pet Avatar — Large, clean */}
                    <motion.div
                      className="relative shrink-0"
                      whileTap={{ scale: 0.93 }}
                      onClick={triggerHeartRain}
                    >
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-muted shadow-sm">
                        {selectedPet.avatar_url ? (
                          <img src={selectedPet.avatar_url} alt={selectedPet.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <img src={selectedPet.type === 'dog' ? dogIcon : catIcon} alt={selectedPet.type} className="w-7 h-7 opacity-50" />
                          </div>
                        )}
                      </div>
                    </motion.div>

                    {/* Pet Info */}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-foreground tracking-tight truncate">
                        {selectedPet.name}
                      </h2>
                      <p className="text-[13px] text-muted-foreground/60 truncate mt-0.5">
                        {selectedPet.breed || (selectedPet.type === 'dog' ? 'כלב' : 'חתול')}
                        {selectedPet.age_years ? ` · ${selectedPet.age_years} שנים` : ''}
                      </p>
                    </div>

                    {/* Weather + Edit */}
                    <div className="flex items-center gap-1">
                      <PetWeatherAlert petType={selectedPet.type} petName={selectedPet.name} />
                      <button
                        onClick={() => navigate(`/edit-pet/${selectedPet.id}`)}
                        className="p-2.5 rounded-xl hover:bg-muted/50 transition-colors"
                        aria-label="ערוך"
                      >
                        <Edit3 className="w-4 h-4 text-muted-foreground/50" strokeWidth={1.5} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Dashboard Tabs */}
                {selectedPet && (
                  <PetDashboardTabs
                    selectedPet={selectedPet}
                    healthRefreshKey={healthRefreshKey}
                    onViewHealthDetails={() => setHealthBreakdownOpen(true)}
                    triggerHealthRefresh={triggerHealthRefresh}
                    onOpenSmartRec={(cat) => setSmartRecCategory(cat)}
                    onOpenInsurance={() => setActiveSheet('insurance')}
                    onOpenPetShop={() => setShowPetShop(true)}
                    onOpenSheet={(id) => handleCategoryClick(id)}
                    onOpenEmergency={() => setShowEmergencyHub(true)}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Menus & Editors */}
        <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <ProfileImageEditor
          isOpen={isImageEditorOpen}
          onClose={() => setIsImageEditorOpen(false)}
          currentImageUrl={profile?.avatar_url}
          onImageUpdated={(url) => setProfile((prev: any) => ({ ...prev, avatar_url: url }))}
        />

        {/* Service Bottom Sheets */}
        <InsuranceSheet isOpen={activeSheet === 'insurance'} onClose={handleCloseSheet} pet={selectedPet} />
        <TrainingSheet isOpen={activeSheet === 'training'} onClose={handleCloseSheet} pet={selectedPet} />
        <GroomingSheet isOpen={activeSheet === 'grooming'} onClose={handleCloseSheet} pet={selectedPet} />
        <FoodSheet isOpen={activeSheet === 'food'} onClose={handleCloseSheet} pet={selectedPet} />
        <ToysSheet isOpen={activeSheet === 'toys'} onClose={handleCloseSheet} pet={selectedPet} />
        <BreedInfoSheet isOpen={activeSheet === 'breed_info'} onClose={handleCloseSheet} pet={selectedPet} />
        <BoardingSheet isOpen={activeSheet === 'boarding'} onClose={handleCloseSheet} pet={selectedPet} />
        <PetVaultDrawer isOpen={activeSheet === 'documents'} onClose={handleCloseSheet} pet={selectedPet} />
        <DogWalkerSheet isOpen={activeSheet === 'dog_walker'} onClose={handleCloseSheet} pet={selectedPet} />
        <ProductsSheet isOpen={activeSheet === 'products'} onClose={handleCloseSheet} pet={selectedPet} />
        <MemorialSheet isOpen={activeSheet === 'memorial'} onClose={handleCloseSheet} pet={selectedPet} />
        <ComingSoonSheet isOpen={activeSheet === 'calendar'} onClose={handleCloseSheet} title="יומן" />
        <ComingSoonSheet isOpen={activeSheet === 'adoption'} onClose={handleCloseSheet} title="למסירה" />
        <ComingSoonSheet isOpen={activeSheet === 'life_story'} onClose={handleCloseSheet} title="סיפור חיים" />

        {/* Trait Sheets */}
        <EnergySheet isOpen={activeSheet === 'energy'} onClose={handleCloseSheet} pet={selectedPet} />
        <GroomingProductsSheet isOpen={activeSheet === 'grooming_products'} onClose={handleCloseSheet} pet={selectedPet} />
        <FeedingSheet isOpen={activeSheet === 'feeding'} onClose={handleCloseSheet} pet={selectedPet} />

        {/* Smart Recommendation */}
        {smartRecCategory && (
          <SmartRecommendationSheet
            isOpen={!!smartRecCategory}
            onClose={() => setSmartRecCategory(null)}
            petId={selectedPet!.id}
            petName={selectedPet!.name}
            category={smartRecCategory}
            title=""
          />
        )}

        {/* Health Score Breakdown */}
        <HealthScoreBreakdown
          pet={selectedPet}
          isOpen={healthBreakdownOpen}
          onClose={() => setHealthBreakdownOpen(false)}
        />

        <AnimatePresence>
          {showPetShop && selectedPet && <PetShopView pet={selectedPet} onBack={() => setShowPetShop(false)} />}
        </AnimatePresence>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Profile;
