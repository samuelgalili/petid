import { Camera, Loader2, History, Plus, ShoppingCart, Package, Info, HelpCircle, Wallet, ShieldCheck, Heart, Store, ImageIcon, FileText, Gift, Scissors, GraduationCap, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { HomePageSkeleton, PetCardSkeleton } from "@/components/LoadingSkeleton";
import BottomNav from "@/components/BottomNav";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import giftIcon from "@/assets/gift-icon.gif";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useCart } from "@/contexts/CartContext";

// Import product images
import dogFoodImg from "@/assets/products/dog-food.jpg";
import dogTreatsImg from "@/assets/products/dog-treats.jpg";
import petBedImg from "@/assets/products/pet-bed.jpg";
import dogSnacksImg from "@/assets/products/dog-snacks.jpg";
import dogToysImg from "@/assets/products/dog-toys.jpg";
import catFoodImg from "@/assets/products/cat-food.jpg";
import petVitaminsImg from "@/assets/products/pet-vitamins.jpg";
import fleaTreatmentImg from "@/assets/products/flea-treatment.jpg";
import petCollarImg from "@/assets/products/pet-collar.jpg";
import defaultPetAvatar from "@/assets/default-pet-avatar.png";
import petidLogo from "@/assets/petid-logo.png";
import catIconGif from "@/assets/cat-icon.gif";
import dogIconGif from "@/assets/dog-icon.gif";

// Product data - moved outside component for performance
const products = [{
  name: "Piedhu Premium",
  price: "₪207.84",
  image: dogFoodImg,
  path: "/shop",
  color: "bg-[#B8E3D5]",
  category: "intop-ribet" // Food & Treats
}, {
  name: "Premium Treats",
  price: "₪307.00",
  image: dogTreatsImg,
  path: "/shop",
  color: "bg-[#F5E6D3]",
  category: "intop-ribet" // Food & Treats
}, {
  name: "Pet Bed Deluxe",
  price: "₪208.12",
  image: petBedImg,
  path: "/shop",
  color: "bg-[#E8F5E8]",
  category: "account-cater" // Accessories
}, {
  name: "Reagor Snacks",
  price: "₪101.72",
  image: dogSnacksImg,
  path: "/shop",
  color: "bg-[#FFE5E5]",
  category: "intop-ribet" // Food & Treats
}, {
  name: "Dog Toys Set",
  price: "₪156.00",
  image: dogToysImg,
  path: "/shop",
  color: "bg-[#E8E5FF]",
  category: "account-cater" // Accessories
}, {
  name: "Cat Food Pro",
  price: "₪189.50",
  image: catFoodImg,
  path: "/shop",
  color: "bg-[#FFE8D6]",
  category: "intop-ribet" // Food & Treats
}, {
  name: "Pet Vitamins",
  price: "₪145.00",
  image: petVitaminsImg,
  path: "/shop",
  color: "bg-[#FFE5F0]",
  category: "deterrtn" // Healthcare
}, {
  name: "Flea Treatment",
  price: "₪225.00",
  image: fleaTreatmentImg,
  path: "/shop",
  color: "bg-[#E5F5FF]",
  category: "deterrtn" // Healthcare
}, {
  name: "Pet Collar",
  price: "₪89.99",
  image: petCollarImg,
  path: "/shop",
  color: "bg-[#FFF0E5]",
  category: "account-cater" // Accessories
}];
const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [petsLoading, setPetsLoading] = useState(true);
  const [pets, setPets] = useState<any[]>([]);
  const [redetectingPetId, setRedetectingPetId] = useState<string | null>(null);
  const [selectedPetForEdit, setSelectedPetForEdit] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    breed: ""
  });
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newlyAddedPetIds, setNewlyAddedPetIds] = useState<Set<string>>(new Set());
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [userName, setUserName] = useState<string>("חבר");
  const [promotionalOffers, setPromotionalOffers] = useState<any[]>([]);
  const [showAchievement, setShowAchievement] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fileInputRefs = useRef<{
    [key: string]: HTMLInputElement | null;
  }>({});
  const previousPetIdsRef = useRef<Set<string>>(new Set());
  const {
    toast
  } = useToast();
  const {
    addToCart
  } = useCart();

  // Israeli holidays with approximate dates (Hebrew calendar varies)
  const getHolidayGreeting = () => {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const day = now.getDate();

    // Check for Israeli holidays (approximate Gregorian dates for 2025)
    const holidays: {
      [key: string]: string;
    } = {
      // Format: "M-D": "Holiday Name"
      "4-13": "פסח",
      "4-14": "פסח",
      "4-15": "פסח",
      "4-16": "פסח",
      "4-17": "פסח",
      "4-18": "פסח",
      "4-19": "פסח",
      "4-20": "פסח",
      "5-23": "שבועות",
      "10-3": "ראש השנה",
      "10-4": "ראש השנה",
      "10-12": "יום כיפור",
      "10-17": "סוכות",
      "10-24": "שמחת תורה",
      "12-15": "חנוכה",
      "12-16": "חנוכה",
      "12-17": "חנוכה",
      "12-18": "חנוכה",
      "12-19": "חנוכה",
      "12-20": "חנוכה",
      "12-21": "חנוכה",
      "12-22": "חנוכה",
      "3-14": "פורים"
    };

    // Check for special pet days
    const petDays: {
      [key: string]: string;
    } = {
      "8-26": "יום הכלב הבינלאומי",
      "8-8": "יום החתול הבינלאומי"
    };
    const dateKey = `${month}-${day}`;
    if (holidays[dateKey]) {
      return `חג ${holidays[dateKey]} שמח`;
    }
    if (petDays[dateKey]) {
      return petDays[dateKey] === "יום הכלב הבינלאומי" ? "יום כלבים שמח" : "יום חתולים שמח";
    }
    return null;
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    // Check for holidays first
    const holidayGreeting = getHolidayGreeting();
    if (holidayGreeting) return holidayGreeting;
    const hour = new Date().getHours();

    // 21:00-5:59 - לילה טוב
    if (hour >= 21 || hour < 6) return "לילה טוב";

    // 6:00-11:59 - בוקר טוב
    if (hour >= 6 && hour < 12) return "בוקר טוב";

    // 12:00-16:59 - צהריים טובים
    if (hour >= 12 && hour < 17) return "צהריים טובים";

    // 17:00-21:00 - ערב טוב
    return "ערב טוב";
  };

  // Confetti effects - memoized
  const triggerConfetti = useCallback(() => {
    const count = 200;
    const defaults = {
      origin: {
        y: 0.7
      },
      zIndex: 9999
    };
    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }
    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ['#7DD3C0', '#FBD66A', '#FFE8D6', '#E8F5E8']
    });
    fire(0.2, {
      spread: 60,
      colors: ['#6BC4AD', '#F4C542', '#FFE5F0', '#B8E3D5']
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
      colors: ['#7DD3C0', '#FBD66A', '#FFE8D6']
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
      colors: ['#6BC4AD', '#F4C542']
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
      colors: ['#7DD3C0', '#E8F5E8']
    });
  }, []);

  // Wallet Achievements System
  const walletAchievements = [
    { 
      id: 1, 
      name: "מתחיל חסכן", 
      threshold: 10, 
      icon: "🌱", 
      color: "from-green-400 to-emerald-500",
      description: "צברת ₪10 בחיסכון"
    },
    { 
      id: 2, 
      name: "חוסך מתמיד", 
      threshold: 50, 
      icon: "💚", 
      color: "from-green-500 to-teal-500",
      description: "צברת ₪50 בחיסכון"
    },
    { 
      id: 3, 
      name: "חוסך מקצועי", 
      threshold: 100, 
      icon: "⭐", 
      color: "from-yellow-400 to-orange-500",
      description: "צברת ₪100 בחיסכון"
    },
    { 
      id: 4, 
      name: "מומחה חיסכון", 
      threshold: 250, 
      icon: "🏆", 
      color: "from-orange-500 to-red-500",
      description: "צברת ₪250 בחיסכון"
    },
    { 
      id: 5, 
      name: "אלוף החיסכון", 
      threshold: 500, 
      icon: "👑", 
      color: "from-purple-500 to-pink-500",
      description: "צברת ₪500 בחיסכון"
    },
    { 
      id: 6, 
      name: "אגדת החיסכון", 
      threshold: 1000, 
      icon: "💎", 
      color: "from-blue-500 to-purple-600",
      description: "צברת ₪1000 בחיסכון"
    }
  ];

  // Calculate current and next achievement
  const getCurrentAchievement = useCallback(() => {
    const achieved = walletAchievements.filter(a => walletBalance >= a.threshold);
    const current = achieved.length > 0 ? achieved[achieved.length - 1] : null;
    const next = walletAchievements.find(a => walletBalance < a.threshold);
    const progress = next ? (walletBalance / next.threshold) * 100 : 100;
    
    return { current, next, progress, totalAchieved: achieved.length };
  }, [walletBalance]);

  const achievementData = useMemo(() => getCurrentAchievement(), [getCurrentAchievement]);

  // Show achievement animation when reaching a new milestone
  useEffect(() => {
    const checkNewAchievement = () => {
      const achieved = walletAchievements.filter(a => walletBalance >= a.threshold);
      if (achieved.length > 0) {
        const latest = achieved[achieved.length - 1];
        const prevBalance = walletBalance - 1;
        const wasAchieved = walletAchievements.filter(a => prevBalance >= a.threshold);
        
        if (achieved.length > wasAchieved.length) {
          setCurrentAchievement(latest);
          setShowAchievement(true);
          triggerConfetti();
          
          setTimeout(() => {
            setShowAchievement(false);
          }, 4000);
        }
      }
    };
    
    if (walletBalance > 0) {
      checkNewAchievement();
    }
  }, [walletBalance, triggerConfetti]);

  // Quick action items for the home page - Hebrew labels matching Yellow design
  const quickActions = [{
    icon: FileText,
    title: "מסמכים",
    path: "/documents",
    bgColor: "bg-white"
  }, {
    icon: Store,
    title: "חנות",
    path: "/shop",
    bgColor: "bg-white"
  }, {
    icon: Scissors,
    title: "מספרה",
    path: "/grooming",
    bgColor: "bg-white"
  }, {
    icon: GraduationCap,
    title: "אילוף",
    path: "/training",
    bgColor: "bg-white"
  }, {
    icon: MapPin,
    title: "גינות כלבים",
    path: "/parks",
    bgColor: "bg-white"
  }, {
    icon: ImageIcon,
    title: "אלבום תמונות",
    path: "/photos",
    bgColor: "bg-white"
  }, {
    icon: Heart,
    title: "אימוץ",
    path: "/adoption",
    bgColor: "bg-white"
  }, {
    icon: ShieldCheck,
    title: "ביטוח",
    path: "/insurance",
    bgColor: "bg-white"
  }];

  // Quick add to cart handler
  const handleQuickAddToCart = useCallback((product: typeof products[0]) => {
    addToCart({
      id: product.name,
      name: product.name,
      price: parseFloat(product.price.replace('₪', '')),
      image: product.image,
      quantity: 1
    });
    toast({
      title: "✅ נוסף לעגלה",
      description: `${product.name} נוסף לעגלה שלך`
    });

    // Trigger confetti
    triggerConfetti();
  }, [addToCart, toast, triggerConfetti]);

  // Fetch user's pets and profile
  useEffect(() => {
    const fetchPets = async () => {
      setPetsLoading(true);

      // Check authentication status
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        console.log("No authenticated user found");
        setPetsLoading(false);
        setLoading(false);
        return;
      }

      // Fetch user profile name
      const {
        data: profile
      } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      if (profile?.full_name) {
        const firstName = profile.full_name.split(' ')[0];
        setUserName(firstName);
      }
      console.log("Fetching pets for user:", user.id);
      const {
        data,
        error
      } = await supabase.from('pets').select('*').eq('user_id', user.id).eq('archived', false) // Only fetch non-archived pets
      .order('created_at', {
        ascending: false
      });
      if (error) {
        console.error("Error fetching pets:", error);
        toast({
          title: "Error loading pets",
          description: error.message,
          variant: "destructive"
        });
      } else {
        console.log("Pets fetched:", data);
        if (data) {
          // Detect newly added pets
          const currentPetIds = new Set(data.map(p => p.id));
          const previousPetIds = previousPetIdsRef.current;
          const newPetIds = new Set([...currentPetIds].filter(id => !previousPetIds.has(id)));
          if (newPetIds.size > 0 && previousPetIds.size > 0) {
            // New pets were added (not initial load)
            setNewlyAddedPetIds(newPetIds);
            triggerConfetti();

            // Remove the "new" status after 3 seconds
            setTimeout(() => {
              setNewlyAddedPetIds(new Set());
            }, 3000);
          }
          previousPetIdsRef.current = currentPetIds;
          setPets(data);
        }
      }
      setLoading(false);
      setPetsLoading(false);
    };
    fetchPets();
  }, [toast]);

  // Fetch wallet balance (5% of total purchases)
  useEffect(() => {
    const fetchWalletBalance = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all completed orders
      const {
        data: orders,
        error
      } = await supabase.from('orders').select('total').eq('user_id', user.id).in('status', ['delivered', 'shipped', 'processing']);
      if (!error && orders) {
        const totalPurchases = orders.reduce((sum, order) => sum + order.total, 0);
        const cashback = totalPurchases * 0.05; // 5% cashback
        setWalletBalance(cashback);
      }
    };
    fetchWalletBalance();
  }, []);

  // Fetch promotional offers
  useEffect(() => {
    const fetchPromotionalOffers = async () => {
      const {
        data,
        error
      } = await supabase.from('promotional_offers').select('*').eq('is_active', true).order('display_order', {
        ascending: true
      });
      if (error) {
        console.error("Error fetching promotional offers:", error);
      } else if (data) {
        setPromotionalOffers(data);
      }
    };
    fetchPromotionalOffers();
  }, []);
  const handleRedetectBreed = async (petId: string, petType: string, imageFile: File) => {
    setRedetectingPetId(petId);
    try {
      // Convert image to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>(resolve => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(imageFile);
      });
      const base64Image = await base64Promise;

      // Call breed detection
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/detect-pet-breed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          imageBase64: base64Image,
          petType: petType
        })
      });
      const data = await response.json();

      // Upload new image
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${user.id}-${petId}-${Date.now()}.${fileExt}`;
      const {
        error: uploadError
      } = await supabase.storage.from("pet-avatars").upload(fileName, imageFile);
      if (uploadError) throw uploadError;
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from("pet-avatars").getPublicUrl(fileName);

      // Update pet record
      const {
        error: updateError
      } = await supabase.from('pets').update({
        breed: data.breed || null,
        breed_confidence: data.confidence || null,
        avatar_url: publicUrl
      }).eq('id', petId);
      if (updateError) throw updateError;

      // Save to breed detection history
      await supabase.from('breed_detection_history').insert({
        pet_id: petId,
        breed: data.breed || null,
        confidence: data.confidence || null,
        avatar_url: publicUrl
      });

      // Refresh pets list
      const {
        data: updatedPets
      } = await supabase.from('pets').select('*').eq('user_id', user.id).eq('archived', false);
      if (updatedPets) {
        setPets(updatedPets);
      }
      toast({
        title: "Breed re-detected!",
        description: `Updated breed: ${data.breed} (${data.confidence}% confidence)`
      });

      // Trigger confetti for successful breed detection
      triggerConfetti();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setRedetectingPetId(null);
    }
  };
  const handlePetLongPressStart = (pet: any) => {
    const timer = setTimeout(() => {
      setSelectedPetForEdit(pet);
      setEditFormData({
        name: pet.name || "",
        breed: pet.breed || ""
      });
      toast({
        title: "Edit Mode",
        description: `Long press detected - editing ${pet.name}`
      });
    }, 500); // 500ms long press
    setLongPressTimer(timer);
  };
  const handlePetLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };
  const handleSavePetEdit = async () => {
    if (!selectedPetForEdit) return;
    try {
      const {
        error
      } = await supabase.from('pets').update({
        name: editFormData.name,
        breed: editFormData.breed
      }).eq('id', selectedPetForEdit.id);
      if (error) throw error;

      // Refresh pets list
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        const {
          data
        } = await supabase.from('pets').select('*').eq('user_id', user.id).eq('archived', false);
        if (data) {
          setPets(data);
        }
      }
      toast({
        title: "Pet Updated!",
        description: `${editFormData.name}'s details have been saved`
      });

      // Trigger confetti for successful pet update
      triggerConfetti();
      setSelectedPetForEdit(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleDeletePet = async () => {
    if (!selectedPetForEdit) return;
    try {
      // Archive the pet instead of deleting it
      const {
        error
      } = await supabase.from('pets').update({
        archived: true,
        archived_at: new Date().toISOString()
      }).eq('id', selectedPetForEdit.id);
      if (error) throw error;

      // Refresh pets list (will automatically exclude archived pets)
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        const {
          data
        } = await supabase.from('pets').select('*').eq('user_id', user.id).eq('archived', false);
        if (data) {
          setPets(data);
        }
      }
      toast({
        title: "Pet Archived",
        description: `${selectedPetForEdit.name} has been moved to archives. You can restore it anytime.`
      });
      setShowDeleteConfirm(false);
      setSelectedPetForEdit(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  if (loading) {
    return <div className="min-h-screen pb-20 bg-white">
        <HomePageSkeleton />
        <BottomNav />
      </div>;
  }
  return <TooltipProvider delayDuration={200}>
    {/* Hamburger Menu */}
    <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    
    <div className="min-h-screen pb-20 animate-fade-in bg-white transition-colors">
      {/* Content Container */}
      <div className="pt-0 pb-6">
        
        {/* Mobile-Only Rewards Header - RTL Pixel Perfect - Updated */}
        <motion.div initial={{
          opacity: 0,
          y: -10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.05
        }} className="px-4 py-[18px] mb-3 mx-4 max-w-full overflow-visible" dir="rtl">
          {/* Main Content: Icon (Right) + Text Column (Left) */}
          <div className="flex flex-row-reverse items-center gap-[14px]">
            {/* Gift Icon - Right Side - Clean & Aesthetic */}
            <button onClick={() => navigate('/rewards')} className="flex-shrink-0 w-20 h-20 rounded-full bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center shadow-lg border-2 border-gray-100 hover:scale-105 hover:shadow-xl active:scale-95 transition-all duration-200 ease-out" aria-label="עבור למתנות ותגמולים">
              <img src={giftIcon} alt="מתנה" className="w-14 h-14 object-contain drop-shadow-sm" />
            </button>

            {/* Text Column - Left Side */}
            <div className="flex-1 text-right space-y-1 overflow-visible min-w-0">
              {/* Greeting Line - Top - Slightly Larger */}
              <div className="text-[15px] leading-tight font-normal text-[#1A1A1A] mb-1 whitespace-nowrap overflow-visible">
                {getGreeting()},{" "}
                <button onClick={() => setIsMenuOpen(true)} className="hover:opacity-70 transition-opacity font-normal underline decoration-1 underline-offset-2">
                  {userName}
                </button>
              </div>
              
              {/* Main Headline - Marketing Message */}
              <h1 className="text-[0.95rem] leading-tight font-black text-[#1A1A1A] mb-1 whitespace-nowrap">
                קונים, צוברים, נהנים — בכל רכישה מחדש!
              </h1>
              
              {/* Small Info Line - 11px */}
              <p className="text-[0.6875rem] leading-tight font-normal text-[#6E6E6E] mb-2">צוברים 5% מכל קנייה ב Petid  ונהנים</p>
             </div>
          </div>

          {/* Link Button - Bottom Left Corner */}
          <div className="mt-3 text-left">
            <button onClick={() => navigate('/rewards')} className="text-[13px] leading-none font-medium text-[#2271CF] hover:opacity-80 transition-opacity inline-flex items-center gap-1 min-h-[32px]">
              צבירה ומימוש
              <span className="text-sm">‹</span>
            </button>
          </div>
        </motion.div>

        {/* My Pets Section - Enhanced & Beautiful */}
        <motion.div initial={{
          opacity: 0,
          y: -10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.1
        }} className="mb-6 px-4">
          {/* Section Header with Gradient */}
          

          {/* Empty State - Beautiful & Inviting */}
          {pets.length === 0 ? <motion.div initial={{
            opacity: 0,
            scale: 0.95
          }} animate={{
            opacity: 1,
            scale: 1
          }} transition={{
            delay: 0.2
          }} className="relative overflow-hidden">
              <div className="flex flex-col items-center justify-center py-10 text-center bg-gradient-to-br from-[#FFE8D6]/30 via-white to-[#E8F5E8]/30 rounded-3xl border-2 border-dashed border-gray-200 backdrop-blur-sm">
                {/* Decorative Elements */}
                <div className="absolute top-4 left-4 w-8 h-8 bg-[#7DD3C0]/10 rounded-full blur-xl" />
                <div className="absolute bottom-6 right-6 w-12 h-12 bg-[#FBD66A]/10 rounded-full blur-xl" />
                
                <motion.button onClick={() => navigate('/add-pet')} className="relative mb-4 cursor-pointer" aria-label="Add your first pet" whileHover={{
                scale: 1.1,
                rotate: 5
              }} whileTap={{
                scale: 0.9
              }}>
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#7DD3C0] to-[#6BC4AD] flex items-center justify-center shadow-xl border-4 border-white relative z-10">
                    <Plus className="w-9 h-9 text-white" strokeWidth={3} />
                  </div>
                  <motion.div className="absolute inset-0 bg-gradient-to-r from-[#7DD3C0] to-[#FBD66A] rounded-full blur-lg opacity-40" animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.4, 0.6, 0.4]
                }} transition={{
                  duration: 2,
                  repeat: Infinity
                }} />
                </motion.button>
                
                <h3 className="text-lg font-extrabold text-gray-900 font-jakarta mb-2">
                  בואו נתחיל! 🐾
                </h3>
                <p className="text-sm text-gray-600 font-jakarta mb-6 max-w-[240px] leading-relaxed">
                  הוסיפו את חיית המחמד הראשונה שלכם ותתחילו ליהנות מכל התכונות
                </p>
                <Button onClick={() => navigate('/add-pet')} className="bg-gradient-to-r from-[#7DD3C0] via-[#6BC4AD] to-[#5AB99C] hover:opacity-90 text-white rounded-full font-jakarta font-bold px-8 py-3 text-sm h-11 shadow-lg hover:shadow-xl transition-all">
                  <Plus className="w-5 h-5 ml-2" strokeWidth={2.5} />
                  הוסף חיית מחמד
                </Button>
              </div>
            </motion.div> : (/* Pet Cards Grid - Modern & Feature-Rich */
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide" style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}>
              {pets.map((pet, index) => {
              const isNewPet = newlyAddedPetIds.has(pet.id);
              const petAge = pet.birth_date ? Math.floor((new Date().getTime() - new Date(pet.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null;
              return <motion.div key={pet.id} initial={{
                opacity: 0,
                scale: 0.9,
                y: 20
              }} animate={{
                opacity: 1,
                scale: isNewPet ? [1, 1.05, 1] : 1,
                y: 0
              }} transition={{
                delay: 0.05 + index * 0.05,
                scale: isNewPet ? {
                  duration: 0.6,
                  repeat: 3,
                  repeatType: "reverse"
                } : {},
                type: "spring",
                stiffness: 260,
                damping: 20
              }} whileHover={{
                scale: 1.03,
                y: -4
              }} whileTap={{
                scale: 0.97
              }} onTouchStart={() => handlePetLongPressStart(pet)} onTouchEnd={handlePetLongPressEnd} onMouseDown={() => handlePetLongPressStart(pet)} onMouseUp={handlePetLongPressEnd} onMouseLeave={handlePetLongPressEnd} onClick={() => navigate(`/pet/${pet.id}`)} className="flex-shrink-0 cursor-pointer relative">
                    {/* New Pet Glow Effect */}
                    {isNewPet && <motion.div className="absolute -inset-2 bg-gradient-to-r from-[#7DD3C0] via-[#FBD66A] to-[#7DD3C0] rounded-3xl blur-xl opacity-30 z-0" animate={{
                  opacity: [0.3, 0.5, 0.3],
                  scale: [1, 1.05, 1]
                }} transition={{
                  duration: 1.5,
                  repeat: Infinity
                }} />}
                    
                    {/* Pet Card */}
                    <div className={`relative bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all min-w-[140px] z-10 ${isNewPet ? 'ring-2 ring-[#FBD66A] ring-offset-2' : ''}`}>
                      {/* Pet Avatar with Status Badge */}
                      <div className="relative mb-3 flex justify-center">
                        <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br from-[#FFE8D6] via-[#FFE5F0] to-[#E8F5E8] shadow-md overflow-hidden border-3 ${isNewPet ? 'border-[#FBD66A]' : 'border-white'} transition-all`}>
                          {pet.avatar_url ? <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-[#B8E3D5] via-[#7DD3C0] to-[#6BC4AD]">
                              {pet.type === 'dog' ? '🐕' : '🐈'}
                            </div>}
                        </div>
                        
                        {/* Type Badge */}
                        <div className="absolute -top-1 -right-1 w-7 h-7 bg-white rounded-full shadow-md flex items-center justify-center border-2 border-gray-100">
                          <span className="text-sm">{pet.type === 'dog' ? '🐕' : '🐈'}</span>
                        </div>
                        
                        {/* New Badge */}
                        {isNewPet && <motion.div className="absolute -top-2 -left-2 bg-gradient-to-r from-[#FBD66A] to-[#F4C542] text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-md" animate={{
                      scale: [1, 1.1, 1]
                    }} transition={{
                      duration: 0.8,
                      repeat: Infinity
                    }}>
                            ✨ חדש
                          </motion.div>}
                      </div>
                      
                      {/* Pet Info */}
                      <div className="text-center space-y-1">
                        <h3 className="text-sm font-extrabold text-gray-900 font-jakarta truncate">
                          {pet.name}
                        </h3>
                        
                        {/* Breed */}
                        {pet.breed && <p className="text-[10px] font-semibold text-gray-500 truncate">
                            {pet.breed}
                          </p>}
                        
                        {/* Age Badge */}
                        {petAge !== null && <div className="inline-flex items-center gap-1 bg-gradient-to-r from-[#E8F5E8] to-[#FFE8D6] px-2 py-1 rounded-full">
                            <span className="text-[10px] font-bold text-gray-700">
                              {petAge} {petAge === 1 ? 'שנה' : 'שנים'}
                            </span>
                          </div>}
                      </div>
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#7DD3C0]/10 to-transparent opacity-0 hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
                    </div>
                  </motion.div>;
            })}
              
              {/* Add Pet Button - Enhanced */}
              <motion.div initial={{
              opacity: 0,
              scale: 0.9
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              delay: 0.05 + pets.length * 0.05
            }} whileHover={{
              scale: 1.05
            }} whileTap={{
              scale: 0.95
            }} onClick={() => navigate('/add-pet')} className="flex-shrink-0 cursor-pointer">
                <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-2xl p-4 shadow-md hover:shadow-lg transition-all min-w-[140px] border-2 border-dashed border-[#7DD3C0]/40 hover:border-[#7DD3C0] flex flex-col items-center justify-center h-full">
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#7DD3C0]/10 to-[#6BC4AD]/10 flex items-center justify-center mb-3 hover:scale-110 transition-transform">
                    <Plus className="w-8 h-8 text-[#7DD3C0]" strokeWidth={2.5} />
                  </div>
                  <p className="text-xs font-extrabold text-[#7DD3C0] font-jakarta">
                    הוסף חיית מחמד
                  </p>
                </div>
              </motion.div>
            </div>)}
        </motion.div>

        {/* Original Loyalty Club Card - Yellow with Smiley Icon + Hover Details */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div 
              className="mb-6 cursor-pointer px-4 relative" 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover="hover"
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/order-history')} 
              role="button" 
              tabIndex={0} 
              aria-label="View loyalty card"
            >
              {/* Card Container with Shadow */}
              <motion.div 
                className="relative"
                variants={{
                  hover: { 
                    scale: 1.05, 
                    y: -8,
                    transition: { duration: 0.3, ease: "easeOut" }
                  }
                }}
              >
                {/* Yellow Loyalty Card */}
                <motion.div 
                  className="relative bg-gradient-to-br from-[#FFD700] via-[#FFC700] to-[#FFB700] rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.4)] p-6 pt-10 overflow-hidden"
                  variants={{
                    hover: {
                      boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                      transition: { duration: 0.3 }
                    }
                  }}
                >
                  {/* Decorative Rainbow Arcs in Corners */}
                  <div className="absolute top-4 left-4 w-12 h-12 opacity-20">
                    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 44 Q4 4 44 4" stroke="url(#grad1)" strokeWidth="8" strokeLinecap="round" fill="none"/>
                      <defs>
                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FF6B6B"/>
                          <stop offset="50%" stopColor="#FFA500"/>
                          <stop offset="100%" stopColor="#FFD700"/>
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  
                  <div className="absolute bottom-4 right-4 w-12 h-12 opacity-20 rotate-180">
                    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 44 Q4 4 44 4" stroke="url(#grad2)" strokeWidth="8" strokeLinecap="round" fill="none"/>
                      <defs>
                        <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FF6B6B"/>
                          <stop offset="50%" stopColor="#FFA500"/>
                          <stop offset="100%" stopColor="#FFD700"/>
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>


                  {/* Direct Layout - Balance Right, Cat Icon Left, No Box */}
                  <div className="relative flex items-center justify-between px-4">
                    {/* Right Side: Balance Display on Yellow Background */}
                    <motion.div 
                      className="text-left"
                      key={walletBalance}
                      initial={{ scale: 1.1, opacity: 0, x: -20 }}
                      animate={{ scale: 1, opacity: 1, x: 0 }}
                      transition={{ type: "spring", stiffness: 200 }}
                    >
                      <div className="text-4xl font-black text-white leading-none mb-2 drop-shadow-lg">
                        ₪{walletBalance.toFixed(2)}
                      </div>
                      <div className="text-sm font-bold text-white/90 font-jakarta drop-shadow">
                        יתרת חיסכון
                      </div>
                    </motion.div>

                    {/* Left Side: Cat Icon Only */}
                    <motion.div 
                      className="w-20 h-20"
                      animate={{ 
                        y: [0, -4, 0],
                        rotate: [0, 3, 0]
                      }}
                      transition={{ 
                        duration: 2.5, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <img src={catIconGif} alt="Cat" className="w-full h-full object-contain drop-shadow-xl" />
                    </motion.div>
                  </div>

                  {/* Hover-Only Achievement Details - Enhanced Design */}
                  <motion.div
                    className="mt-4"
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    variants={{
                      hover: {
                        opacity: 1,
                        height: "auto",
                        y: 0,
                        transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
                      }
                    }}
                  >
                    <div className="bg-gradient-to-br from-white via-white to-gray-50 backdrop-blur-md rounded-3xl p-5 shadow-2xl border border-white/50">
                      {/* Header */}
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-full flex items-center justify-center shadow-md">
                          <span className="text-white text-lg">🏆</span>
                        </div>
                        <h3 className="text-base font-black text-gray-800 font-jakarta">
                          ההישגים שלך
                        </h3>
                      </div>
                      
                      {/* Achievement Progress Bar */}
                      {achievementData.next && (
                        <div className="mb-4 bg-white/80 rounded-2xl p-3 shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-700 font-jakarta">
                              עד הישג הבא
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FFA500]">
                                ₪{(achievementData.next.threshold - walletBalance).toFixed(0)}
                              </span>
                              <span className="text-[10px] font-semibold text-gray-500">נותרו</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                            <motion.div 
                              className="h-full bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFA500] rounded-full shadow-lg relative overflow-hidden"
                              initial={{ width: 0 }}
                              animate={{ width: `${achievementData.progress}%` }}
                              transition={{ duration: 1.2, ease: "easeOut" }}
                            >
                              {/* Shimmer effect */}
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                animate={{ x: ['-100%', '200%'] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                              />
                            </motion.div>
                          </div>
                          <div className="text-center mt-1">
                            <span className="text-[10px] font-bold text-gray-500">
                              {achievementData.progress.toFixed(0)}% הושלם
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Achievement Badges Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {walletAchievements.slice(0, 4).map((achievement, index) => {
                          const isAchieved = walletBalance >= achievement.threshold;
                          return (
                            <motion.div
                              key={achievement.name}
                              className={`relative overflow-hidden rounded-2xl p-3 transition-all ${
                                isAchieved 
                                  ? 'bg-gradient-to-br ' + achievement.color + ' shadow-lg' 
                                  : 'bg-gradient-to-br from-gray-100 to-gray-200'
                              }`}
                              initial={{ opacity: 0, scale: 0.8, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{ delay: 0.1 + index * 0.05 }}
                              whileHover={{ scale: 1.05, y: -2 }}
                            >
                              {/* Shine effect for achieved badges */}
                              {isAchieved && (
                                <motion.div
                                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                  animate={{ x: ['-100%', '200%'] }}
                                  transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: index * 0.3 }}
                                />
                              )}
                              
                              <div className="relative flex items-center gap-2">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                  isAchieved ? 'bg-white/30' : 'bg-white/50'
                                } shadow-sm ${isAchieved ? '' : 'grayscale opacity-50'}`}>
                                  <span className="text-xl">
                                    {achievement.icon}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[10px] font-extrabold leading-tight mb-0.5 ${
                                    isAchieved ? 'text-white' : 'text-gray-500'
                                  } font-jakarta`}>
                                    {achievement.name}
                                  </p>
                                  <p className={`text-[9px] font-bold ${
                                    isAchieved ? 'text-white/90' : 'text-gray-400'
                                  }`}>
                                    ₪{achievement.threshold}
                                  </p>
                                </div>
                                {isAchieved && (
                                  <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", stiffness: 200, delay: 0.2 + index * 0.05 }}
                                    className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md"
                                  >
                                    <span className="text-green-600 text-xs font-bold">✓</span>
                                  </motion.div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Total Achievements Summary */}
                      <div className="bg-gradient-to-r from-[#FFD700]/10 via-[#FFC700]/10 to-[#FFB700]/10 rounded-2xl p-3 text-center border border-[#FFD700]/20">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FFA500]">
                            {achievementData.totalAchieved}
                          </span>
                          <span className="text-gray-400 text-sm font-bold">/</span>
                          <span className="text-lg font-bold text-gray-500">
                            {walletAchievements.length}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-600 mt-1 font-jakarta">
                          הישגים שהשגת
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-700">
            <p className="font-bold text-sm">כרטיס מועדון</p>
            <p className="text-xs opacity-90">לחץ לצפייה בהיסטוריית הזמנות וחיסכון</p>
          </TooltipContent>
        </Tooltip>

        {/* Quick Actions Grid */}
        <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.3
        }} className="mb-6">
          <div className="flex gap-4 overflow-x-auto pb-2 px-4 scrollbar-hide" style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}>
            {quickActions.map((action, index) => <motion.div key={action.path} initial={{
              opacity: 0,
              scale: 0.9
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              delay: 0.35 + index * 0.05
            }} whileHover={{
              scale: 1.05,
              y: -2
            }} whileTap={{
              scale: 0.95
            }} onClick={() => navigate(action.path)} className="flex-shrink-0 cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-[72px] h-[72px] rounded-full bg-white shadow-lg flex items-center justify-center hover:shadow-xl transition-all border border-gray-100">
                    <action.icon className="w-8 h-8 text-gray-800" strokeWidth={1.5} />
                  </div>
                  <p className="text-[11px] font-bold text-gray-900 font-jakarta text-center max-w-[80px] leading-tight">
                    {action.title}
                  </p>
                </div>
              </motion.div>)}
          </div>
        </motion.div>

        {/* Rewards Carousel Section */}
        <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.5
        }} className="mb-6 px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-gray-900 font-jakarta">מבצעים בלעדיים</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/rewards')} className="text-primary hover:text-primary/80 font-jakarta text-sm font-bold">
              צפה בהכל ←
            </Button>
          </div>
          
          <Carousel opts={{
            align: "start",
            loop: true
          }} className="w-full">
            <CarouselContent className="-ml-2 md:-ml-4">
              {promotionalOffers.length > 0 ? promotionalOffers.map((offer, index) => <CarouselItem key={offer.id} className="pl-2 md:pl-4 basis-[85%] md:basis-1/2 lg:basis-1/3">
                    <motion.div initial={{
                  opacity: 0,
                  scale: 0.95
                }} animate={{
                  opacity: 1,
                  scale: 1
                }} transition={{
                  delay: 0.55 + index * 0.05
                }} className={`bg-gradient-to-br rounded-2xl p-5 shadow-lg h-44 flex flex-col justify-between`} style={{
                  backgroundImage: `linear-gradient(to bottom right, ${offer.gradient_from}, ${offer.gradient_to})`
                }}>
                      <div>
                        <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
                          {offer.badge_text}
                        </span>
                        <h3 className="text-2xl font-extrabold text-white mb-1 font-jakarta">{offer.title}</h3>
                        <p className="text-sm text-white/90 font-jakarta">{offer.subtitle}</p>
                      </div>
                      <Button onClick={() => navigate(offer.button_link)} className={`bg-white text-${offer.button_color} text-sm font-bold py-2 px-4 rounded-xl hover:bg-opacity-90 transition-colors font-jakarta shadow-md`} style={{
                    color: `var(--${offer.button_color})`
                  }}>
                        {offer.button_text}
                      </Button>
                    </motion.div>
                  </CarouselItem>) :
              // Fallback loading state or empty state
              <CarouselItem className="pl-2 md:pl-4 basis-[85%]">
                  <div className="bg-gray-100 rounded-2xl p-5 h-44 flex items-center justify-center">
                    <p className="text-gray-500 font-jakarta">Loading offers...</p>
                  </div>
                </CarouselItem>}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-4" />
            <CarouselNext className="hidden md:flex -right-4" />
          </Carousel>
        </motion.div>

        {/* Yellow-Style Product Grid */}
        <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.6
        }} className="mb-6 px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-gray-900 font-jakarta">מוצרים מומלצים</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/shop')} className="text-[#FFD700] hover:text-[#F4C542] font-jakarta text-sm font-bold">
              צפה בהכל ←
            </Button>
          </div>
          
          {/* 3-Column Grid with Mixed Product and Promo Cards */}
          <div className="grid grid-cols-3 gap-2">
            {/* Row 1 - Yellow Products */}
            {/* Product 1 */}
            <motion.div initial={{
              opacity: 0,
              scale: 0.95
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              delay: 0.65
            }} className="rounded-2xl overflow-hidden shadow-md">
              <div className="bg-[#FFC107] p-3 flex items-center justify-center h-28">
                <img src={dogFoodImg} alt="Premium Food" className="w-full h-full object-cover rounded-lg" />
              </div>
              <div className="bg-white p-2">
                <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">Premium Food</h3>
                <p className="text-lg font-extrabold text-[#F44336]">₪27.90</p>
              </div>
            </motion.div>

            {/* Product 2 */}
            <motion.div initial={{
              opacity: 0,
              scale: 0.95
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              delay: 0.7
            }} className="rounded-2xl overflow-hidden shadow-md">
              <div className="bg-[#FFC107] p-3 flex items-center justify-center h-28">
                <img src={dogTreatsImg} alt="Premium Treats" className="w-full h-full object-cover rounded-lg" />
              </div>
              <div className="bg-white p-2">
                <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">Pet Treats</h3>
                <p className="text-lg font-extrabold text-[#F44336]">₪10</p>
              </div>
            </motion.div>

            {/* Promo Card 1 - Tall Yellow */}
            <motion.div initial={{
              opacity: 0,
              scale: 0.95
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              delay: 0.75
            }} className="rounded-2xl overflow-hidden shadow-lg row-span-2 bg-[#FFD700] p-4 flex flex-col items-center justify-center relative cursor-pointer" onClick={() => navigate('/rewards')}>
              <div className="absolute top-2 right-2 text-white opacity-50">
                <div className="w-2 h-2 bg-white rounded-full mb-1"></div>
                <div className="w-1 h-1 bg-white rotate-45"></div>
              </div>
              <div className="absolute top-3 right-6">
                <div className="w-1.5 h-1.5 bg-pink-500 rotate-45"></div>
              </div>
              <img src={petBedImg} alt="Summer Sale" className="w-20 h-20 object-contain mb-2" />
              <h3 className="text-sm font-extrabold text-gray-900 font-jakarta text-center">Refreshing Sale</h3>
              <p className="text-xs text-gray-700 font-jakarta mt-1">Special offers</p>
              <div className="absolute bottom-3 left-3">
                <div className="text-[#E53935] font-extrabold text-xs">petid</div>
              </div>
            </motion.div>

            {/* Row 2 - Red Products */}
            {/* Product 3 */}
            <motion.div initial={{
              opacity: 0,
              scale: 0.95
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              delay: 0.8
            }} className="rounded-2xl overflow-hidden shadow-md">
              <div className="bg-[#F44336] p-3 flex items-center justify-center h-28 relative">
                <div className="absolute top-2 left-2 bg-white text-[#F44336] text-[8px] font-bold px-2 py-0.5 rounded-full">
                  SALE
                </div>
                <img src={dogToysImg} alt="Toys" className="w-full h-full object-cover rounded-lg" />
              </div>
              <div className="bg-white p-2">
                <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">Pet Toys</h3>
                <p className="text-lg font-extrabold text-[#F44336]">₪4.90</p>
              </div>
            </motion.div>

            {/* Product 4 */}
            <motion.div initial={{
              opacity: 0,
              scale: 0.95
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              delay: 0.85
            }} className="rounded-2xl overflow-hidden shadow-md">
              <div className="bg-[#F44336] p-3 flex items-center justify-center h-28 relative">
                <div className="absolute top-2 left-2 bg-white text-[#F44336] text-[8px] font-bold px-2 py-0.5 rounded-full">
                  SALE
                </div>
                <img src={catFoodImg} alt="Cat Food" className="w-full h-full object-cover rounded-lg" />
              </div>
              <div className="bg-white p-2">
                <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">Cat Food</h3>
                <p className="text-lg font-extrabold text-[#F44336]">₪1.90</p>
              </div>
            </motion.div>

            {/* Row 3 - More Yellow Products */}
            {/* Product 5 */}
            <motion.div initial={{
              opacity: 0,
              scale: 0.95
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              delay: 0.9
            }} className="rounded-2xl overflow-hidden shadow-md">
              <div className="bg-[#FFC107] p-3 flex items-center justify-center h-28">
                <img src={petVitaminsImg} alt="Vitamins" className="w-full h-full object-cover rounded-lg" />
              </div>
              <div className="bg-white p-2">
                <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">Pet Vitamins</h3>
                <p className="text-lg font-extrabold text-[#F44336]">₪145</p>
              </div>
            </motion.div>

            {/* Product 6 */}
            <motion.div initial={{
              opacity: 0,
              scale: 0.95
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              delay: 0.95
            }} className="rounded-2xl overflow-hidden shadow-md">
              <div className="bg-[#FFC107] p-3 flex items-center justify-center h-28">
                <img src={fleaTreatmentImg} alt="Flea Treatment" className="w-full h-full object-cover rounded-lg" />
              </div>
              <div className="bg-white p-2">
                <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">Healthcare</h3>
                <p className="text-lg font-extrabold text-[#F44336]">₪89</p>
              </div>
            </motion.div>

            {/* Promo Card 2 - Tall Red */}
            <motion.div initial={{
              opacity: 0,
              scale: 0.95
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              delay: 1.0
            }} className="rounded-2xl overflow-hidden shadow-lg row-span-2 bg-[#F44336] p-4 flex flex-col items-center justify-center relative cursor-pointer" onClick={() => navigate('/shop')}>
              <div className="absolute top-2 right-2 text-white opacity-50">
                <div className="w-1 h-1 bg-white rotate-45 mb-1"></div>
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <img src={petCollarImg} alt="Special Deal" className="w-20 h-20 object-contain mb-2" />
              <h3 className="text-sm font-extrabold text-white font-jakarta text-center">Special Deals</h3>
              <p className="text-xs text-white/90 font-jakarta mt-1">Limited time</p>
              <div className="absolute bottom-3 right-3">
                <div className="text-white font-extrabold text-xs underline decoration-2">SALE</div>
              </div>
            </motion.div>

            {/* Row 4 - More Products */}
            {/* Product 7 */}
            <motion.div initial={{
              opacity: 0,
              scale: 0.95
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              delay: 1.05
            }} className="rounded-2xl overflow-hidden shadow-md">
              <div className="bg-[#FFC107] p-3 flex items-center justify-center h-28">
                <img src={dogSnacksImg} alt="Snacks" className="w-full h-full object-cover rounded-lg" />
              </div>
              <div className="bg-white p-2">
                <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">Pet Snacks</h3>
                <p className="text-lg font-extrabold text-[#F44336]">₪101</p>
              </div>
            </motion.div>

            {/* Product 8 */}
            <motion.div initial={{
              opacity: 0,
              scale: 0.95
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              delay: 1.1
            }} className="rounded-2xl overflow-hidden shadow-md">
              <div className="bg-[#FFC107] p-3 flex items-center justify-center h-28">
                <img src={petBedImg} alt="Pet Bed" className="w-full h-full object-cover rounded-lg" />
              </div>
              <div className="bg-white p-2">
                <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">Pet Bed</h3>
                <p className="text-lg font-extrabold text-[#F44336]">₪208</p>
              </div>
            </motion.div>
          </div>

          {/* View More Button */}
          <Button onClick={() => navigate('/shop')} className="w-full mt-4 bg-[#FFD700] hover:bg-[#F4C542] text-gray-900 font-jakarta font-bold py-3 rounded-2xl shadow-md">
            צפה בכל המוצרים
          </Button>
        </motion.div>

        {/* Accumulation & Redemption Section */}
        <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 1.3
        }} className="px-4 mt-8 mb-32">
          <h2 className="text-2xl font-extrabold text-gray-900 font-jakarta mb-4">
            צבירה ומימוש
          </h2>
          
          {/* Scrollable Cards Row */}
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
            {/* Card 1 */}
            <div className="min-w-[280px] bg-white rounded-2xl shadow-md p-5 flex-shrink-0">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">🏪</span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 font-jakarta text-center mb-2">
                החזר של 10%
              </h3>
              <p className="text-sm text-gray-600 font-jakarta text-center">
                צברו עד 10 נקודות זכות בכל ליטר
              </p>
            </div>

            {/* Card 2 */}
            <div className="min-w-[280px] bg-white rounded-2xl shadow-md p-5 flex-shrink-0">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">🌳</span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 font-jakarta text-center mb-2">
                צבירה של 10%
              </h3>
              <p className="text-sm text-gray-600 font-jakarta text-center">
                על רכישות שבוצעו אצל השותפים שלנו
              </p>
            </div>

            {/* Card 3 */}
            <div className="min-w-[280px] bg-white rounded-2xl shadow-md p-5 flex-shrink-0">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">🏦</span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 font-jakarta text-center mb-2">
                צבירה של 10%
              </h3>
              <p className="text-sm text-gray-600 font-jakarta text-center">
                מספקי ביטוח מקומיים
              </p>
            </div>
          </div>
        </motion.div>

      </div>

      {/* Edit Pet Sheet */}
      <Sheet open={!!selectedPetForEdit} onOpenChange={open => !open && setSelectedPetForEdit(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="font-jakarta text-xl font-bold text-gray-900">
              Edit Pet Details
            </SheetTitle>
            <SheetDescription className="font-jakarta text-sm text-gray-600">
              Long press detected - Update your pet's information
            </SheetDescription>
          </SheetHeader>
          
          {selectedPetForEdit && <div className="mt-6 space-y-6">
              {/* Pet Avatar Display */}
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#E8F5E8] to-[#B8E3D5] shadow-lg overflow-hidden border-4 border-white">
                  {selectedPetForEdit.avatar_url ? <img src={selectedPetForEdit.avatar_url} alt={selectedPetForEdit.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl">
                      {selectedPetForEdit.pet_type === 'dog' ? '🐕' : '🐈'}
                    </div>}
                </div>
              </div>

              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="pet-name" className="font-jakarta font-semibold text-gray-900">
                  Pet Name
                </Label>
                <Input id="pet-name" value={editFormData.name} onChange={e => setEditFormData({
                ...editFormData,
                name: e.target.value
              })} placeholder="Enter pet name" className="font-jakarta h-12 rounded-xl border-2 focus:border-[#7DD3C0] focus:ring-[#7DD3C0]" />
              </div>

              {/* Breed Field */}
              <div className="space-y-2">
                <Label htmlFor="pet-breed" className="font-jakarta font-semibold text-gray-900">
                  Breed
                </Label>
                <Input id="pet-breed" value={editFormData.breed} onChange={e => setEditFormData({
                ...editFormData,
                breed: e.target.value
              })} placeholder="Enter breed" className="font-jakarta h-12 rounded-xl border-2 focus:border-[#7DD3C0] focus:ring-[#7DD3C0]" />
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setSelectedPetForEdit(null)} className="flex-1 h-12 rounded-xl font-jakarta font-bold border-2">
                    Cancel
                  </Button>
                  <Button onClick={handleSavePetEdit} className="flex-1 h-12 rounded-xl font-jakarta font-bold bg-[#7DD3C0] hover:bg-[#6BC4AD] text-gray-900 shadow-md">
                    Save Changes
                  </Button>
                </div>
                
                {/* Delete Button */}
                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="w-full h-12 rounded-xl font-jakarta font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-md">
                  Archive Pet
                </Button>
              </div>
            </div>}
        </SheetContent>
      </Sheet>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-3xl max-w-[90vw] w-full mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-jakarta text-xl font-bold text-gray-900">
              Archive {selectedPetForEdit?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-jakarta text-gray-600 text-base">
              {selectedPetForEdit?.name} will be moved to the archived section. You can restore your pet anytime from the Archived Pets page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="font-jakarta font-bold rounded-xl h-12 w-full sm:w-auto border-2">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePet} className="font-jakarta font-bold rounded-xl h-12 w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white">
              Archive Pet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Achievement Celebration Modal */}
      {showAchievement && currentAchievement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => setShowAchievement(false)}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={`bg-gradient-to-br ${currentAchievement.color} p-8 rounded-3xl shadow-2xl max-w-sm w-full border-4 border-white relative overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated Background Pattern */}
            <motion.div 
              className="absolute inset-0 opacity-20"
              animate={{ 
                rotate: [0, 360],
              }}
              transition={{ 
                duration: 20, 
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, white 2px, transparent 2px)',
                backgroundSize: '30px 30px'
              }}
            />

            {/* Content */}
            <div className="relative z-10 text-center text-white">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="text-8xl mb-4"
              >
                {currentAchievement.icon}
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-black mb-2 font-jakarta drop-shadow-lg"
              >
                הישג חדש! 🎉
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl font-bold mb-1 font-jakarta"
              >
                {currentAchievement.name}
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-sm opacity-90 mb-6 font-jakarta"
              >
                {currentAchievement.description}
              </motion.p>

              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAchievement(false)}
                className="bg-white text-gray-900 px-8 py-3 rounded-full font-bold text-sm shadow-xl hover:shadow-2xl transition-all font-jakarta"
              >
                מעולה! 🚀
              </motion.button>
            </div>

            {/* Floating Particles */}
            <motion.div
              className="absolute top-1/4 left-1/4 w-4 h-4 bg-white rounded-full"
              animate={{
                y: [-20, -40, -20],
                opacity: [0.5, 1, 0.5],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute top-1/3 right-1/4 w-3 h-3 bg-white rounded-full"
              animate={{
                y: [-15, -35, -15],
                opacity: [0.6, 1, 0.6],
                scale: [0.9, 1.1, 0.9]
              }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
            />
            <motion.div
              className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-white rounded-full"
              animate={{
                y: [-10, -30, -10],
                opacity: [0.7, 1, 0.7],
                scale: [1, 1.3, 1]
              }}
              transition={{ duration: 3, repeat: Infinity, delay: 1 }}
            />
          </motion.div>
        </motion.div>
      )}

      <BottomNav />
    </div>
    </TooltipProvider>;
};
export default Home;