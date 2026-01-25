import { useState, useEffect, useRef } from "react";
import { PageTransition } from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight,
  Plus,
  Settings,
  Edit3,
  ChevronDown,
  Shield,
  Utensils,
  Cookie,
  Building2,
  Sparkles,
  Scissors,
  Heart,
  Stethoscope,
  Info,
  Gamepad2,
  GraduationCap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";
import { ProfileImageEditor } from "@/components/ProfileImageEditor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQueryClient } from "@tanstack/react-query";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";
import {
  InsuranceSheet,
  TrainingSheet,
  GroomingSheet,
  BoardingSheet,
  BreedInfoSheet,
  FoodSheet,
  ToysSheet
} from "@/components/pet-services";


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
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProfileCollapsed, setIsProfileCollapsed] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const collapseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-collapse profile section after 30 seconds
  useEffect(() => {
    if (!loading && !isProfileCollapsed) {
      collapseTimerRef.current = setTimeout(() => {
        setIsProfileCollapsed(true);
      }, 3000); // 3 seconds
    }

    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }
    };
  }, [loading, isProfileCollapsed]);

  // Reset timer when user expands profile
  const handleExpandProfile = () => {
    setIsProfileCollapsed(false);
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
    }
    collapseTimerRef.current = setTimeout(() => {
      setIsProfileCollapsed(true);
    }, 3000); // 3 seconds
  };

  // Get selected pet object
  const selectedPet = pets.find(p => p.id === selectedPetId) || null;

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

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      // Get avatar from auth provider metadata if not set in profile
      const authAvatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
      const avatarUrl = profileData?.avatar_url || authAvatarUrl;

      setProfile({ ...profileData, id: user.id, avatar_url: avatarUrl });

      const { data: petsData } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      const fetchedPets = (petsData || []) as Pet[];
      setPets(fetchedPets);
      
      // Auto-select first pet if available
      if (fetchedPets.length > 0 && !selectedPetId) {
        setSelectedPetId(fetchedPets[0].id);
      }

    } catch (error: any) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle pet click
  const handlePetClick = (petId: string) => {
    setSelectedPetId(petId);
    setSelectedCategory(null); // Reset category when selecting new pet
    setIsExpanded(true);
  };

  // Handle category click - opens bottom sheet
  const handleCategoryClick = (categoryId: string) => {
    setActiveSheet(categoryId);
  };

  // Close sheet
  const handleCloseSheet = () => {
    setActiveSheet(null);
  };

  // Categories for pet services - each opens a bottom sheet
  const categories = [
    { id: 'insurance', label: 'ביטוח', icon: Shield, color: 'from-blue-500 to-cyan-400' },
    { id: 'training', label: 'אילוף', icon: GraduationCap, color: 'from-green-500 to-emerald-400' },
    { id: 'grooming', label: 'טיפוח', icon: Scissors, color: 'from-purple-500 to-violet-400' },
    { id: 'food', label: 'מזון', icon: Utensils, color: 'from-orange-500 to-amber-400' },
    { id: 'toys', label: 'צעצועים', icon: Gamepad2, color: 'from-pink-500 to-rose-400' },
    { id: 'breed_info', label: 'על הגזע', icon: Info, color: 'from-teal-500 to-cyan-400' },
    { id: 'boarding', label: 'פנסיון', icon: Building2, color: 'from-indigo-500 to-blue-400' },
  ];

  // Handle scroll to collapse
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop < 50 && isExpanded) {
      setIsExpanded(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <ProfileSkeleton />
        <BottomNav />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div 
        className="h-screen bg-background overflow-hidden flex flex-col" 
        dir="rtl"
      >
        {/* Header with Collapsible Profile */}
        <motion.div 
          className="flex items-center justify-between px-4 h-14 bg-background z-20"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -mr-2"
            >
              <ChevronRight className="w-6 h-6 text-foreground" />
            </button>
            
            {/* Collapsed Profile Avatar - shows after 30 seconds */}
            <AnimatePresence>
              {isProfileCollapsed && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.5, x: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.5, x: -20 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  onClick={handleExpandProfile}
                  className="w-9 h-9 rounded-full p-[2px] bg-gradient-to-br from-primary via-primary/80 to-primary/60"
                >
                  <div className="w-full h-full rounded-full bg-background p-[1px]">
                    <Avatar className="w-full h-full">
                      <AvatarImage src={profile?.avatar_url} className="object-cover" />
                      <AvatarFallback className="bg-muted text-foreground font-bold text-xs">
                        {profile?.full_name?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/edit-profile')}
              className="p-2"
            >
              <Edit3 className="w-5 h-5 text-foreground" />
            </button>
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2 -ml-2"
            >
              <Settings className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </motion.div>

        {/* Main Content */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto pb-[70px]"
          onScroll={handleScroll}
        >
          {/* Expanded Profile Section - hides after 30 seconds */}
          <AnimatePresence>
            {!isProfileCollapsed && (
              <motion.div 
                className="flex flex-col items-center px-5 pt-2 pb-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Profile Picture with Ring */}
                <motion.div 
                  className="relative mb-3 shrink-0"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsImageEditorOpen(true)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <div className="w-24 h-24 rounded-full p-[3px] bg-gradient-to-br from-primary via-primary/80 to-primary/60">
                    <div className="w-full h-full rounded-full bg-background p-[2px]">
                      <Avatar className="w-full h-full">
                        <AvatarImage src={profile?.avatar_url} className="object-cover" />
                        <AvatarFallback className="bg-muted text-foreground font-bold text-2xl">
                          {profile?.full_name?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                </motion.div>

                {/* Name & Bio */}
                <h1 className="text-xl font-bold text-foreground mb-1 shrink-0">
                  {profile?.full_name || "משתמש"}
                </h1>
                {profile?.bio && (
                  <p className="text-sm text-muted-foreground text-center max-w-[250px] mb-2 shrink-0">
                    {profile.bio}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pet Selection Section */}
          <AnimatePresence mode="wait">
            {!isExpanded ? (
              <motion.div 
                key="pets-grid"
                className="flex flex-col items-center px-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                {pets.length > 0 ? (
                  <>
                    {/* Floating Pet Bubbles */}
                    <div className="flex flex-wrap justify-center gap-4 py-6">
                      {pets.map((pet, index) => (
                        <motion.button
                          key={pet.id}
                          onClick={() => handlePetClick(pet.id)}
                          className="flex flex-col items-center gap-2"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ 
                            opacity: 1, 
                            y: 0,
                          }}
                          transition={{ 
                            delay: index * 0.1,
                            duration: 0.4
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {/* Pet Avatar with Gradient Ring */}
                          <motion.div 
                            className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-br from-primary via-primary/80 to-primary/60 shadow-lg"
                            animate={{ 
                              y: [0, -6, 0],
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              delay: index * 0.5,
                              ease: "easeInOut"
                            }}
                          >
                            <div className="w-full h-full rounded-full bg-background p-[2px]">
                              <div className="w-full h-full rounded-full overflow-hidden bg-muted">
                                {pet.avatar_url ? (
                                  <img 
                                    src={pet.avatar_url} 
                                    alt={pet.name} 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-muted">
                                    <img 
                                      src={pet.type === 'dog' ? dogIcon : catIcon} 
                                      alt={pet.type} 
                                      className="w-10 h-10" 
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                          
                          {/* Pet Name */}
                          <span className="text-sm font-medium text-foreground">
                            {pet.name}
                          </span>
                        </motion.button>
                      ))}
                      
                      {/* Add Pet Button */}
                      <motion.button
                        onClick={() => navigate('/add-pet')}
                        className="flex flex-col items-center gap-2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: pets.length * 0.1, duration: 0.4 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center bg-muted/30">
                          <Plus className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <span className="text-sm text-muted-foreground">הוסף</span>
                      </motion.button>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      לחץ על חיית מחמד לצפייה בהתאמות
                    </p>
                  </>
                ) : (
                  <motion.button 
                    className="flex flex-col items-center gap-3 py-8"
                    onClick={() => navigate('/add-pet')}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/20">
                      <Plus className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <span className="text-sm text-muted-foreground">הוסף חיית מחמד ראשונה</span>
                  </motion.button>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="expanded"
                className="flex-1 px-4"
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                {/* Collapse Handle */}
                <div 
                  className="flex justify-center py-3 cursor-pointer"
                  onClick={() => {
                    if (selectedCategory) {
                      setSelectedCategory(null);
                    } else {
                      setIsExpanded(false);
                    }
                  }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {selectedCategory ? 'חזור לקטגוריות' : 'חזור לחיות מחמד'}
                    </span>
                  </div>
                </div>

                {/* Selected Pet Header */}
                {selectedPet && (
                  <div className="flex items-center justify-center gap-3 pb-4">
                    <motion.div 
                      className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-br from-primary via-primary/80 to-primary/60"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <div className="w-full h-full rounded-full bg-background p-[1px]">
                        <div className="w-full h-full rounded-full overflow-hidden bg-muted">
                          {selectedPet.avatar_url ? (
                            <img src={selectedPet.avatar_url} alt={selectedPet.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <img 
                                src={selectedPet.type === 'dog' ? dogIcon : catIcon} 
                                alt={selectedPet.type} 
                                className="w-7 h-7" 
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                    <div className="text-center">
                      <h3 className="font-bold text-foreground text-lg">{selectedPet.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {selectedPet.breed || (selectedPet.type === 'dog' ? 'כלב' : 'חתול')}
                        {selectedPet.age_years ? ` • ${selectedPet.age_years} שנים` : ''}
                      </p>
                    </div>
                  </div>
                )}

                {/* Category Spheres - each opens a bottom sheet */}
                <motion.div
                  className="flex flex-wrap justify-center gap-4 py-4"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  {categories.map((category, index) => {
                    const Icon = category.icon;
                    return (
                      <motion.button
                        key={category.id}
                        onClick={() => handleCategoryClick(category.id)}
                        className="flex flex-col items-center gap-2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <motion.div 
                          className={`w-16 h-16 rounded-full bg-gradient-to-br ${category.color} shadow-lg flex items-center justify-center`}
                          animate={{ y: [0, -5, 0] }}
                          transition={{ 
                            duration: 2.5, 
                            repeat: Infinity, 
                            delay: index * 0.2,
                            ease: "easeInOut" 
                          }}
                        >
                          <Icon className="w-7 h-7 text-white" />
                        </motion.div>
                        <span className="text-xs font-medium text-foreground">
                          {category.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hamburger Menu */}
        <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        {/* Profile Image Editor */}
        <ProfileImageEditor
          isOpen={isImageEditorOpen}
          onClose={() => setIsImageEditorOpen(false)}
          currentImageUrl={profile?.avatar_url}
          onImageUpdated={(url) => {
            setProfile((prev: any) => ({ ...prev, avatar_url: url }));
          }}
        />

        {/* Service Bottom Sheets */}
        <InsuranceSheet 
          isOpen={activeSheet === 'insurance'} 
          onClose={handleCloseSheet} 
          pet={selectedPet} 
        />
        <TrainingSheet 
          isOpen={activeSheet === 'training'} 
          onClose={handleCloseSheet} 
          pet={selectedPet} 
        />
        <GroomingSheet 
          isOpen={activeSheet === 'grooming'} 
          onClose={handleCloseSheet} 
          pet={selectedPet} 
        />
        <FoodSheet 
          isOpen={activeSheet === 'food'} 
          onClose={handleCloseSheet} 
          pet={selectedPet} 
        />
        <ToysSheet 
          isOpen={activeSheet === 'toys'} 
          onClose={handleCloseSheet} 
          pet={selectedPet} 
        />
        <BreedInfoSheet 
          isOpen={activeSheet === 'breed_info'} 
          onClose={handleCloseSheet} 
          pet={selectedPet} 
        />
        <BoardingSheet 
          isOpen={activeSheet === 'boarding'} 
          onClose={handleCloseSheet} 
          pet={selectedPet} 
        />

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Profile;
