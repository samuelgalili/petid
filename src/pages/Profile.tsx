import React, { useState, useEffect, useRef } from "react";
import { PageTransition } from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight,
  Plus,
  Settings,
  Edit3,
  ChevronDown,
  ChevronLeft,
  Shield,
  Utensils,
  Building2,
  Scissors,
  Heart,
  Stethoscope,
  Info,
  GraduationCap,
  FileText,
  Camera,
  Video,
  MessageCircle,
  Calendar,
  Dog,
  Gift,
  Flame,
  BookOpen,
  ShoppingBag,
  Truck,
  Handshake,
  Footprints,
  Search,
  Star,
  Clock,
  MapPin,
  Bell
} from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { PetHealthScore } from "@/components/profile/PetHealthScore";
import { TopRecommendation } from "@/components/profile/TopRecommendation";
import { PetEssentials } from "@/components/profile/PetEssentials";
import {
  InsuranceSheet,
  TrainingSheet,
  GroomingSheet,
  BoardingSheet,
  BreedInfoSheet,
  FoodSheet,
  ToysSheet,
  DocumentsSheet,
  DogWalkerSheet,
  ProductsSheet,
  EnergySheet,
  GroomingProductsSheet,
  FeedingSheet
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
  const { role, isAdmin } = useUserRole();
  
  // Map role to Hebrew display text
  const getRoleDisplayText = (role: string): string => {
    const roleLabels: Record<string, string> = {
      admin: 'אדמין',
      business: 'חנות',
      org: 'עמותה',
      moderator: 'מנהל תוכן',
      user: 'משתמש'
    };
    return roleLabels[role] || 'משתמש';
  };
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProfileCollapsed, setIsProfileCollapsed] = useState(false);
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [activeHub, setActiveHub] = useState<string | null>(null);
  const [showPetShop, setShowPetShop] = useState(false);
  const [energySheetOpen, setEnergySheetOpen] = useState(false);
  const [groomingSheetOpen, setGroomingSheetOpen] = useState(false);
  const [feedingSheetOpen, setFeedingSheetOpen] = useState(false);
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

  // Handle pet click - opens the services panel
  const handlePetClick = (petId: string) => {
    setSelectedPetId(petId);
    setActiveHub(null);
    setIsExpanded(true); // Show services panel with categories
  };

  // Open pet shop view
  const handleOpenPetShop = () => {
    setShowPetShop(true);
  };

  // Close pet shop view
  const handleClosePetShop = () => {
    setShowPetShop(false);
  };

  // Handle category click - opens bottom sheet or navigates
  const handleCategoryClick = (categoryId: string) => {
    // Special handling for adoption - navigate to adoption page
    if (categoryId === 'adoption') {
      navigate('/adoption');
      return;
    }
    // Special handling for products - open products sheet
    if (categoryId === 'products') {
      setActiveSheet('products');
      return;
    }
    setActiveSheet(categoryId);
  };

  // Close sheet
  const handleCloseSheet = () => {
    setActiveSheet(null);
  };

  // 4 Hubs structure with sub-categories
  const hubs = [
    {
      id: 'care',
      label: 'טיפול',
      color: 'from-blue-500 to-emerald-400',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-600',
      icon: Heart,
      categories: [
        { id: 'insurance', label: 'ביטוח', icon: Shield },
        { id: 'grooming', label: 'טיפוח', icon: Scissors },
        { id: 'training', label: 'אילוף', icon: GraduationCap },
        { id: 'health', label: 'בריאות', icon: Stethoscope },
        { id: 'documents', label: 'מסמכים', icon: FileText },
      ]
    },
    {
      id: 'life',
      label: 'חיים',
      color: 'from-purple-500 to-cyan-400',
      bgColor: 'bg-purple-500/10',
      textColor: 'text-purple-600',
      icon: Camera,
      categories: [
        { id: 'stories', label: 'סטוריז', icon: Camera },
        { id: 'videos', label: 'וידאו', icon: Video },
        { id: 'chat', label: 'צ׳אט', icon: MessageCircle },
        { id: 'calendar', label: 'יומן', icon: Calendar },
      ]
    },
    {
      id: 'services',
      label: 'שירותים',
      color: 'from-orange-500 to-blue-600',
      bgColor: 'bg-orange-500/10',
      textColor: 'text-orange-600',
      icon: ShoppingBag,
      categories: [
        { id: 'boarding', label: 'פנסיון', icon: Building2 },
        { id: 'dog_walker', label: 'דוג ווקר', icon: Footprints },
        { id: 'products', label: 'מוצרים', icon: ShoppingBag },
        { id: 'delivery', label: 'משלוחים', icon: Truck },
      ]
    },
    {
      id: 'identity',
      label: 'זהות',
      color: 'from-gray-700 to-gray-500',
      bgColor: 'bg-gray-500/10',
      textColor: 'text-gray-700',
      icon: Dog,
      categories: [
        { id: 'breed_info', label: 'על הגזע', icon: Info },
        { id: 'adoption', label: 'למסירה', icon: Gift },
        { id: 'memorial', label: 'זיכרון', icon: Flame },
        { id: 'life_story', label: 'סיפור חיים', icon: BookOpen },
      ]
    }
  ];

  const activeHubData = hubs.find(h => h.id === activeHub);

  // Handle scroll - removed collapse logic to allow free scrolling
  const handleScroll = (_e: React.UIEvent<HTMLDivElement>) => {
    // Scrolling is now free - no auto-collapse behavior
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
            
            {/* Collapsed Profile Avatar - shows after 3 seconds */}
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
            
            {/* Selected Pet Avatar - shows next to user avatar when pet is selected */}
            <AnimatePresence>
              {selectedPet && isExpanded && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.5, x: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.5, x: -20 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  onClick={() => setIsExpanded(false)}
                  className="w-9 h-9 rounded-full p-[2px] bg-gradient-to-br from-primary via-primary/80 to-primary/60"
                >
                  <div className="w-full h-full rounded-full bg-background p-[1px]">
                    <div className="w-full h-full rounded-full overflow-hidden bg-muted">
                      {selectedPet.avatar_url ? (
                        <img 
                          src={selectedPet.avatar_url} 
                          alt={selectedPet.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <img 
                            src={selectedPet.type === 'dog' ? dogIcon : catIcon} 
                            alt={selectedPet.type} 
                            className="w-5 h-5" 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <button 
                onClick={() => navigate('/admin/dashboard')}
                className="p-2"
              >
                <Shield className="w-5 h-5 text-primary" />
              </button>
            ) : (
              <button 
                onClick={() => navigate('/edit-profile')}
                className="p-2"
              >
                <Edit3 className="w-5 h-5 text-foreground" />
              </button>
            )}
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

                {/* Name & Role */}
                <h1 className="text-xl font-bold text-foreground mb-0.5 shrink-0">
                  {profile?.full_name || "משתמש"}
                </h1>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-1">
                  {getRoleDisplayText(role)}
                </span>
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {pets.length > 0 ? (
                  <>
                    {/* Pet Cards - Clean minimal style */}
                    <div className="flex flex-wrap justify-center gap-3 py-4">
                      {pets.map((pet, index) => (
                        <motion.button
                          key={pet.id}
                          onClick={() => handlePetClick(pet.id)}
                          className="flex flex-col items-center gap-1.5 group"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          {/* Pet Avatar - Clean border, no animation */}
                          <div className="w-16 h-16 rounded-full border-2 border-border group-hover:border-primary transition-colors">
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
                                    className="w-8 h-8 opacity-60" 
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Pet Name */}
                          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                            {pet.name}
                          </span>
                        </motion.button>
                      ))}
                      
                      {/* Add Pet Button */}
                      <motion.button
                        onClick={() => navigate('/add-pet')}
                        className="flex flex-col items-center gap-1.5 group"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: pets.length * 0.05 }}
                      >
                        <div className="w-16 h-16 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                          <Plus className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                        </div>
                        <span className="text-xs text-muted-foreground/60">הוסף</span>
                      </motion.button>
                    </div>
                    
                    <p className="text-[10px] text-muted-foreground/60">
                      בחר חיית מחמד לצפייה בשירותים
                    </p>
                  </>
                ) : (
                  <motion.button 
                    className="flex flex-col items-center gap-2 py-6"
                    onClick={() => navigate('/add-pet')}
                  >
                    <div className="w-16 h-16 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground">הוסף חיית מחמד ראשונה</span>
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
                    if (activeHub) {
                      setActiveHub(null);
                    } else {
                      setIsExpanded(false);
                    }
                  }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {activeHub ? 'חזור לעולמות' : 'חזור לחיות מחמד'}
                    </span>
                  </div>
                </div>

                {/* Pet name shown below collapse handle - only when profile is not collapsed */}
                <AnimatePresence>
                  {selectedPet && !isProfileCollapsed && (
                    <motion.div 
                      className="text-center pb-4"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h3 className="font-bold text-foreground text-lg">{selectedPet.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {selectedPet.breed || (selectedPet.type === 'dog' ? 'כלב' : 'חתול')}
                        {selectedPet.age_years ? ` • ${selectedPet.age_years} שנים` : ''}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Health Score, Recommendation & Essentials */}
                {selectedPet && !activeHub && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-4"
                  >
                    {/* Health Score */}
                    <PetHealthScore pet={selectedPet} />
                    
                    {/* Top Recommendation */}
                    <TopRecommendation 
                      pet={selectedPet} 
                      onViewPolicy={() => setActiveSheet('insurance')}
                      onEnergyOpen={() => setEnergySheetOpen(true)}
                      onGroomingOpen={() => setGroomingSheetOpen(true)}
                      onFeedingOpen={() => setFeedingSheetOpen(true)}
                    />
                    
                    {/* Essentials */}
                    <PetEssentials 
                      pet={selectedPet} 
                      onOpenShop={handleOpenPetShop} 
                    />
                  </motion.div>
                )}

                {/* Search Bar - Quick Search */}
                <motion.div 
                  className="px-4 pb-3"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="חיפוש שירותים..." 
                      className="pr-10 h-10 bg-muted/30 border-0 rounded-xl text-sm placeholder:text-muted-foreground/60"
                    />
                  </div>
                </motion.div>

                {/* Quick Filter Chips */}
                <motion.div 
                  className="px-4 pb-4 flex gap-2 overflow-x-auto no-scrollbar"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {[
                    { label: 'הכל', active: true },
                    { label: 'קרוב אלי', icon: MapPin },
                    { label: 'מומלצים', icon: Star },
                    { label: 'אחרונים', icon: Clock },
                  ].map((filter, idx) => (
                    <button
                      key={idx}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                        filter.active 
                          ? 'bg-foreground text-background' 
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {filter.icon && <filter.icon className="w-3 h-3" />}
                      {filter.label}
                    </button>
                  ))}
                </motion.div>

                {/* Service Categories - Row Layout */}
                <AnimatePresence mode="wait">
                  {!activeHub ? (
                    /* Services as Rows - Minimal Professional Style */
                    <motion.div
                      key="services"
                      className="px-4 space-y-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {/* Service Rows - Minimalist Design with Icons */}
                      {[
                        { id: 'insurance', label: 'ביטוח', subtitle: 'כיסוי מלא לחיית המחמד', icon: Shield, badge: 2 },
                        { id: 'boarding', label: 'פנסיון', subtitle: 'טיפול מסביב לשעון', icon: Building2 },
                        { id: 'grooming', label: 'טיפוח', subtitle: 'מראה מושלם ובריא', icon: Scissors },
                        { id: 'training', label: 'אילוף', subtitle: 'מאלפים מוסמכים ומנוסים', icon: GraduationCap },
                        { id: 'health', label: 'בריאות', subtitle: 'מעקב וטיפול רפואי', icon: Stethoscope, badge: 1 },
                        { id: 'dog_walker', label: 'דוג ווקר', subtitle: 'טיולים יומיים', icon: Footprints },
                      ].map((service, index) => {
                        const ServiceIcon = service.icon;
                        return (
                          <motion.button
                            key={service.id}
                            onClick={() => handleCategoryClick(service.id)}
                            className="w-full flex items-center gap-3 p-3 bg-card/50 hover:bg-card rounded-xl border border-border/20 hover:border-border/40 transition-all group"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                          >
                            {/* Icon - Clean minimal */}
                            <div className="w-10 h-10 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                              <ServiceIcon className="w-5 h-5 text-foreground/70 group-hover:text-primary transition-colors" />
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 text-right min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-foreground">{service.label}</span>
                                {service.badge && (
                                  <span className="w-4 h-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                                    {service.badge}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground line-clamp-1">
                                {service.subtitle}
                              </span>
                            </div>
                            
                            {/* Arrow - Subtle */}
                            <ChevronLeft className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition-colors flex-shrink-0" />
                          </motion.button>
                        );
                      })}

                      {/* More Services - Minimal */}
                      <motion.button
                        onClick={() => setActiveHub('care')}
                        className="w-full flex items-center justify-center gap-2 py-3 text-muted-foreground hover:text-foreground transition-colors"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-xs font-medium">עוד שירותים</span>
                      </motion.button>
                    </motion.div>
                  ) : (
                    /* Sub-categories for selected hub */
                    <motion.div
                      key="categories"
                      className="py-6 px-4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Hub Header */}
                      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/50">
                        <button 
                          onClick={() => setActiveHub(null)}
                          className="p-1.5 rounded-full hover:bg-muted transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                        </button>
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${activeHubData?.color} flex items-center justify-center`}>
                          {activeHubData && <activeHubData.icon className="w-4 h-4 text-white" />}
                        </div>
                        <span className={`font-semibold ${activeHubData?.textColor}`}>
                          {activeHubData?.label}
                        </span>
                      </div>

                      {/* Categories Grid */}
                      <div className="grid grid-cols-3 gap-3">
                        {activeHubData?.categories.map((category, index) => {
                          const CategoryIcon = category.icon;
                          return (
                            <motion.button
                              key={category.id}
                              onClick={() => handleCategoryClick(category.id)}
                              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03, duration: 0.15 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <CategoryIcon className="w-6 h-6 text-foreground/70" />
                              <span className="text-xs font-medium text-muted-foreground text-center">
                                {category.label}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
        <DocumentsSheet 
          isOpen={activeSheet === 'documents'} 
          onClose={handleCloseSheet} 
          pet={selectedPet} 
        />
        <DogWalkerSheet 
          isOpen={activeSheet === 'dog_walker'} 
          onClose={handleCloseSheet} 
          pet={selectedPet} 
        />
        <ProductsSheet 
          isOpen={activeSheet === 'products'} 
          onClose={handleCloseSheet} 
          pet={selectedPet} 
        />
        
        {/* Breed Trait Sheets */}
        <EnergySheet 
          isOpen={energySheetOpen}
          onClose={() => setEnergySheetOpen(false)}
          pet={selectedPet}
        />
        <GroomingProductsSheet 
          isOpen={groomingSheetOpen}
          onClose={() => setGroomingSheetOpen(false)}
          pet={selectedPet}
        />
        <FeedingSheet 
          isOpen={feedingSheetOpen}
          onClose={() => setFeedingSheetOpen(false)}
          pet={selectedPet}
        />
        <AnimatePresence>
          {showPetShop && selectedPet && (
            <PetShopView 
              pet={selectedPet} 
              onBack={handleClosePetShop} 
            />
          )}
        </AnimatePresence>
        
        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Profile;
