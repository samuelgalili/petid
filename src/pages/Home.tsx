import { Camera, Loader2, History, Plus, ShoppingCart, Package, Info, HelpCircle, Wallet, ShieldCheck, Heart, Store, ImageIcon, FileText, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { HomePageSkeleton, PetCardSkeleton } from "@/components/LoadingSkeleton";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
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
const products = [
  {
    name: "Piedhu Premium",
    price: "₪207.84",
    image: dogFoodImg,
    path: "/shop",
    color: "bg-[#B8E3D5]",
    category: "intop-ribet", // Food & Treats
  },
  {
    name: "Premium Treats",
    price: "₪307.00",
    image: dogTreatsImg,
    path: "/shop",
    color: "bg-[#F5E6D3]",
    category: "intop-ribet", // Food & Treats
  },
  {
    name: "Pet Bed Deluxe",
    price: "₪208.12",
    image: petBedImg,
    path: "/shop",
    color: "bg-[#E8F5E8]",
    category: "account-cater", // Accessories
  },
  {
    name: "Reagor Snacks",
    price: "₪101.72",
    image: dogSnacksImg,
    path: "/shop",
    color: "bg-[#FFE5E5]",
    category: "intop-ribet", // Food & Treats
  },
  {
    name: "Dog Toys Set",
    price: "₪156.00",
    image: dogToysImg,
    path: "/shop",
    color: "bg-[#E8E5FF]",
    category: "account-cater", // Accessories
  },
  {
    name: "Cat Food Pro",
    price: "₪189.50",
    image: catFoodImg,
    path: "/shop",
    color: "bg-[#FFE8D6]",
    category: "intop-ribet", // Food & Treats
  },
  {
    name: "Pet Vitamins",
    price: "₪145.00",
    image: petVitaminsImg,
    path: "/shop",
    color: "bg-[#FFE5F0]",
    category: "deterrtn", // Healthcare
  },
  {
    name: "Flea Treatment",
    price: "₪225.00",
    image: fleaTreatmentImg,
    path: "/shop",
    color: "bg-[#E5F5FF]",
    category: "deterrtn", // Healthcare
  },
  {
    name: "Pet Collar",
    price: "₪89.99",
    image: petCollarImg,
    path: "/shop",
    color: "bg-[#FFF0E5]",
    category: "account-cater", // Accessories
  },
];

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
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const previousPetIdsRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();
  const { addToCart } = useCart();

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "בוקר טוב";
    if (hour < 18) return "אחר הצהריים טובים";
    return "ערב טוב";
  };

  // Confetti effects - memoized
  const triggerConfetti = useCallback(() => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999
    };

    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
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

  // Quick action items for the home page - Yellow style
  const quickActions = [
    {
      icon: ShieldCheck,
      title: "Insurance",
      description: "Protect your pet",
      path: "/insurance",
      bgColor: "bg-white",
    },
    {
      icon: Heart,
      title: "Adoption",
      description: "Find a new friend",
      path: "/adoption",
      bgColor: "bg-white",
    },
    {
      icon: Store,
      title: "Shop",
      description: "Pet supplies",
      path: "/shop",
      bgColor: "bg-white",
    },
    {
      icon: ImageIcon,
      title: "Photo Album",
      description: "Pet memories",
      path: "/photos",
      bgColor: "bg-white",
    },
    {
      icon: FileText,
      title: "Documents",
      description: "Medical records",
      path: "/documents",
      bgColor: "bg-white",
    },
  ];

  // Quick add to cart handler
  const handleQuickAddToCart = useCallback((product: typeof products[0]) => {
    addToCart({
      id: product.name,
      name: product.name,
      price: parseFloat(product.price.replace('₪', '')),
      image: product.image,
      quantity: 1,
    });
    
    toast({
      title: "Added to cart!",
      description: `${product.name} has been added to your cart`,
    });

    // Trigger confetti
    triggerConfetti();
  }, [addToCart, toast, triggerConfetti]);

  // Fetch user's pets and profile
  useEffect(() => {
    const fetchPets = async () => {
      setPetsLoading(true);
      
      // Check authentication status
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log("No authenticated user found");
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
      
      console.log("Fetching pets for user:", user.id);
      
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)
        .eq('archived', false) // Only fetch non-archived pets
        .order('created_at', { ascending: false });
      
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
          
          const newPetIds = new Set(
            [...currentPetIds].filter(id => !previousPetIds.has(id))
          );

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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Fetch all completed orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('total')
        .eq('user_id', user.id)
        .in('status', ['delivered', 'shipped', 'processing']);

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
      const { data, error } = await supabase
        .from('promotional_offers')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

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
      const base64Promise = new Promise<string>((resolve) => {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${user.id}-${petId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("pet-avatars")
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("pet-avatars")
        .getPublicUrl(fileName);

      // Update pet record
      const { error: updateError } = await supabase
        .from('pets')
        .update({
          breed: data.breed || null,
          breed_confidence: data.confidence || null,
          avatar_url: publicUrl
        })
        .eq('id', petId);

      if (updateError) throw updateError;

      // Save to breed detection history
      await supabase.from('breed_detection_history').insert({
        pet_id: petId,
        breed: data.breed || null,
        confidence: data.confidence || null,
        avatar_url: publicUrl
      });

      // Refresh pets list
      const { data: updatedPets } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)
        .eq('archived', false);

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
        breed: pet.breed || "",
      });
      toast({
        title: "Edit Mode",
        description: `Long press detected - editing ${pet.name}`,
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
      const { error } = await supabase
        .from('pets')
        .update({
          name: editFormData.name,
          breed: editFormData.breed,
        })
        .eq('id', selectedPetForEdit.id);

      if (error) throw error;

      // Refresh pets list
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('pets')
          .select('*')
          .eq('user_id', user.id)
          .eq('archived', false);
        if (data) {
          setPets(data);
        }
      }

      toast({
        title: "Pet Updated!",
        description: `${editFormData.name}'s details have been saved`,
      });

      // Trigger confetti for successful pet update
      triggerConfetti();

      setSelectedPetForEdit(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePet = async () => {
    if (!selectedPetForEdit) return;

    try {
      // Archive the pet instead of deleting it
      const { error } = await supabase
        .from('pets')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
        })
        .eq('id', selectedPetForEdit.id);

      if (error) throw error;

      // Refresh pets list (will automatically exclude archived pets)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('pets')
          .select('*')
          .eq('user_id', user.id)
          .eq('archived', false);
        if (data) {
          setPets(data);
        }
      }

      toast({
        title: "Pet Archived",
        description: `${selectedPetForEdit.name} has been moved to archives. You can restore it anytime.`,
      });

      setShowDeleteConfirm(false);
      setSelectedPetForEdit(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20 bg-gray-50">
        <HomePageSkeleton />
        <BottomNav />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className="min-h-screen pb-20 animate-fade-in bg-gray-50 transition-colors">
      {/* Content Container */}
      <div className="pt-4 pb-6">
        
        {/* Yellow-Style Header Banner - Exact 1:1 Match */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white px-4 py-6 mb-6"
          dir="rtl"
        >
          <div className="flex items-start gap-5">
            {/* Gift Icon - Left Side (Exact Match) */}
            <button
              onClick={() => navigate('/rewards')}
              className="flex-shrink-0 w-28 h-28 rounded-full bg-gradient-to-br from-gray-200 to-gray-100 shadow-lg flex items-center justify-center hover:shadow-xl transition-all"
              aria-label="מתנה"
            >
              <Gift className="w-12 h-12 text-gray-600" strokeWidth={1.5} />
            </button>

            {/* Text Content - Right Side */}
            <div className="flex-1 pt-1">
              {/* Small greeting - underlined */}
              <p className="text-lg text-gray-900 font-jakarta mb-2 underline decoration-2 decoration-gray-900">
                {getGreeting()} {userName}!
              </p>
              
              {/* Main headline - Bold and Large */}
              <h1 className="text-3xl font-extrabold text-gray-900 font-jakarta mb-3 leading-tight">
                רבעון חדש, צבירה חדשה!
              </h1>
              
              {/* Details text - Gray */}
              <p className="text-base text-gray-600 font-jakarta leading-relaxed">
                צוברים 50₪ עד ה-31.12.25 ב-רפ, yellow ובסופרמרקטים
              </p>
            </div>
          </div>

          {/* Bottom Link - Blue */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <button
              onClick={() => navigate('/rewards')}
              className="text-blue-600 font-jakarta font-bold text-base hover:underline inline-flex items-center gap-1"
            >
              צבירה ומימוש
              <span className="text-xl transform rotate-180 inline-block">›</span>
            </button>
          </div>
        </motion.div>

        {/* My Pets Section - Compact & Improved */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-5 px-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 font-jakarta">My Pets</h2>
            {pets.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/archived-pets')}
                className="text-gray-400 hover:text-gray-600 h-7 px-3 text-xs font-jakarta"
              >
                Archived
              </Button>
            )}
          </div>

          {/* Empty State - Compact */}
          {pets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100">
              <button
                onClick={() => navigate('/add-pet')}
                className="relative mb-3 cursor-pointer group"
                aria-label="Add your first pet"
              >
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-md border-2 border-gray-100 group-hover:shadow-lg transition-all">
                  <Plus className="w-7 h-7 text-[#7DD3C0]" />
                </div>
              </button>
              <h3 className="text-base font-bold text-gray-900 font-jakarta mb-1">
                No Pets Yet
              </h3>
              <p className="text-xs text-gray-500 font-jakarta mb-4 max-w-[200px]">
                Add your first pet to get started
              </p>
              <Button
                onClick={() => navigate('/add-pet')}
                className="bg-gradient-to-r from-[#7DD3C0] to-[#6BC4AD] hover:opacity-90 text-white rounded-full font-jakarta font-bold px-6 py-2 text-sm h-9"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Pet
              </Button>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {pets.map((pet, index) => {
                const isNewPet = newlyAddedPetIds.has(pet.id);
                
                return (
                <motion.div
                  key={pet.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ 
                    opacity: 1, 
                    scale: isNewPet ? [1, 1.1, 1] : 1,
                  }}
                  transition={{ 
                    delay: 0.05 + index * 0.03,
                    scale: isNewPet ? {
                      duration: 0.5,
                      repeat: 2,
                      repeatType: "reverse",
                    } : {}
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onTouchStart={() => handlePetLongPressStart(pet)}
                  onTouchEnd={handlePetLongPressEnd}
                  onMouseDown={() => handlePetLongPressStart(pet)}
                  onMouseUp={handlePetLongPressEnd}
                  onMouseLeave={handlePetLongPressEnd}
                  onClick={() => navigate(`/pet/${pet.id}`)}
                  className="flex-shrink-0 cursor-pointer"
                >
                  {isNewPet && (
                    <motion.div
                      className="absolute -inset-1 bg-gradient-to-r from-[#7DD3C0] to-[#FBD66A] rounded-full blur-md opacity-50 z-0"
                      animate={{
                        opacity: [0.5, 0.7, 0.5],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                      }}
                    />
                  )}
                  <div className="flex flex-col items-center relative z-10">
                    <div className="relative">
                      <div className={`relative w-14 h-14 rounded-full bg-gradient-to-br from-[#FFE8D6] via-[#FFE5F0] to-[#E8F5E8] shadow-md overflow-hidden border-2 ${isNewPet ? 'border-[#FBD66A]' : 'border-white'}`}>
                        {pet.avatar_url ? (
                          <img
                            src={pet.avatar_url}
                            alt={pet.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-[#B8E3D5] via-[#7DD3C0] to-[#6BC4AD]">
                            {pet.type === 'dog' ? '🐕' : '🐈'}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="mt-1.5 text-[10px] font-bold text-gray-700 font-jakarta truncate max-w-[56px] text-center">
                      {pet.name}
                    </p>
                  </div>
                </motion.div>
                );
              })}
              
              {/* Compact Add Pet Button */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 + pets.length * 0.03 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/add-pet')}
                className="flex-shrink-0 cursor-pointer"
              >
                <div className="flex flex-col items-center">
                  <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-gray-50 to-white border-2 border-dashed border-[#7DD3C0]/60 shadow-sm flex items-center justify-center hover:border-[#7DD3C0] hover:shadow-md transition-all">
                    <Plus className="w-6 h-6 text-[#7DD3C0]" />
                  </div>
                  <p className="mt-1.5 text-[10px] font-bold text-[#7DD3C0] font-jakarta">
                    Add
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>

        {/* Loyalty Card - Yellow Style with Petid Branding */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div 
              className="mb-6 cursor-pointer px-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/order-history')}
              role="button"
              tabIndex={0}
              aria-label="View loyalty balance"
            >
              <div className="relative bg-gradient-to-br from-[#FFD700] via-[#FFED4E] to-[#FFC107] rounded-[24px] p-6 shadow-lg overflow-hidden min-h-[200px]">
                {/* Top decorative shapes - small triangles and circles */}
                <div className="absolute top-4 right-8 w-3 h-3 bg-pink-500 rotate-45 opacity-70"></div>
                <div className="absolute top-8 right-16 w-2 h-2 bg-blue-500 rounded-full opacity-70"></div>
                <div className="absolute top-6 right-24 w-2.5 h-2.5 bg-orange-500 rotate-12 opacity-70"></div>
                
                {/* White code field at top */}
                <div className="relative z-10 bg-white rounded-xl px-4 py-3 mb-4 shadow-sm">
                  <div className="text-center text-sm text-gray-600 font-jakarta">
                    Your personal code for checkout
                  </div>
                  <div className="text-center font-mono font-bold text-gray-900 text-xs mt-1">
                    PETID-{Math.random().toString(36).substring(2, 8).toUpperCase()}
                  </div>
                </div>

                {/* Dog illustration - bottom left */}
                <div className="absolute left-4 bottom-4 w-24 h-24 z-10">
                  <img src={dogIconGif} alt="Dog" className="w-full h-full object-contain drop-shadow-lg" />
                </div>

                {/* Cat illustration - bottom left, slightly offset */}
                <div className="absolute left-20 bottom-6 w-20 h-20 z-10">
                  <img src={catIconGif} alt="Cat" className="w-full h-full object-contain drop-shadow-lg" />
                </div>

                {/* Balance - Right Side */}
                <div className="relative z-10 text-right mt-2">
                  <div className="text-gray-900 text-5xl font-extrabold leading-none mb-1">
                    ₪{walletBalance.toFixed(2)}
                  </div>
                  <div className="text-gray-800 text-sm font-bold font-jakarta">
                    Savings on purchases
                  </div>
                </div>

                {/* Decorative circle bottom right */}
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white rounded-full opacity-20"></div>
              </div>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-semibold">View Order History</p>
            <p className="text-xs opacity-80">Earn 5% back on every purchase</p>
          </TooltipContent>
        </Tooltip>

        {/* Quick Actions Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <div className="flex justify-center gap-4 overflow-x-auto pb-2 px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {quickActions.map((action, index) => (
              <motion.div
                key={action.path}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 + index * 0.05 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(action.path)}
                className="flex-shrink-0 cursor-pointer"
              >
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center mb-2 hover:shadow-lg transition-all">
                    <action.icon className="w-7 h-7 text-gray-700" />
                  </div>
                  <p className="text-[10px] font-bold text-gray-900 font-jakarta text-center max-w-[64px] leading-tight">
                    {action.title}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Rewards Carousel Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-6 px-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-gray-900 font-jakarta">Exclusive Offers</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/rewards')}
              className="text-primary hover:text-primary/80 font-jakarta text-sm font-bold"
            >
              View All →
            </Button>
          </div>
          
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {promotionalOffers.length > 0 ? (
                promotionalOffers.map((offer, index) => (
                  <CarouselItem key={offer.id} className="pl-2 md:pl-4 basis-[85%] md:basis-1/2 lg:basis-1/3">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.55 + index * 0.05 }}
                      className={`bg-gradient-to-br rounded-2xl p-5 shadow-lg h-44 flex flex-col justify-between`}
                      style={{
                        backgroundImage: `linear-gradient(to bottom right, ${offer.gradient_from}, ${offer.gradient_to})`
                      }}
                    >
                      <div>
                        <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
                          {offer.badge_text}
                        </span>
                        <h3 className="text-2xl font-extrabold text-white mb-1 font-jakarta">{offer.title}</h3>
                        <p className="text-sm text-white/90 font-jakarta">{offer.subtitle}</p>
                      </div>
                      <Button
                        onClick={() => navigate(offer.button_link)}
                        className={`bg-white text-${offer.button_color} text-sm font-bold py-2 px-4 rounded-xl hover:bg-opacity-90 transition-colors font-jakarta shadow-md`}
                        style={{ color: `var(--${offer.button_color})` }}
                      >
                        {offer.button_text}
                      </Button>
                    </motion.div>
                  </CarouselItem>
                ))
              ) : (
                // Fallback loading state or empty state
                <CarouselItem className="pl-2 md:pl-4 basis-[85%]">
                  <div className="bg-gray-100 rounded-2xl p-5 h-44 flex items-center justify-center">
                    <p className="text-gray-500 font-jakarta">Loading offers...</p>
                  </div>
                </CarouselItem>
              )}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-4" />
            <CarouselNext className="hidden md:flex -right-4" />
          </Carousel>
        </motion.div>

        {/* Yellow-Style Product Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-6 px-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-gray-900 font-jakarta">Featured Products</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/shop')}
              className="text-[#FFD700] hover:text-[#F4C542] font-jakarta text-sm font-bold"
            >
              View All →
            </Button>
          </div>
          
          {/* 3-Column Grid with Mixed Product and Promo Cards */}
          <div className="grid grid-cols-3 gap-2">
            {/* Row 1 - Yellow Products */}
            {/* Product 1 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.65 }}
              className="rounded-2xl overflow-hidden shadow-md"
            >
              <div className="bg-[#FFC107] p-3 flex items-center justify-center h-28">
                <img src={dogFoodImg} alt="Premium Food" className="w-full h-full object-cover rounded-lg" />
              </div>
              <div className="bg-white p-2">
                <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">Premium Food</h3>
                <p className="text-lg font-extrabold text-[#F44336]">₪27.90</p>
              </div>
            </motion.div>

            {/* Product 2 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="rounded-2xl overflow-hidden shadow-md"
            >
              <div className="bg-[#FFC107] p-3 flex items-center justify-center h-28">
                <img src={dogTreatsImg} alt="Premium Treats" className="w-full h-full object-cover rounded-lg" />
              </div>
              <div className="bg-white p-2">
                <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">Pet Treats</h3>
                <p className="text-lg font-extrabold text-[#F44336]">₪10</p>
              </div>
            </motion.div>

            {/* Promo Card 1 - Tall Yellow */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.75 }}
              className="rounded-2xl overflow-hidden shadow-lg row-span-2 bg-[#FFD700] p-4 flex flex-col items-center justify-center relative cursor-pointer"
              onClick={() => navigate('/rewards')}
            >
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
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className="rounded-2xl overflow-hidden shadow-md"
            >
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
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.85 }}
              className="rounded-2xl overflow-hidden shadow-md"
            >
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
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9 }}
              className="rounded-2xl overflow-hidden shadow-md"
            >
              <div className="bg-[#FFC107] p-3 flex items-center justify-center h-28">
                <img src={petVitaminsImg} alt="Vitamins" className="w-full h-full object-cover rounded-lg" />
              </div>
              <div className="bg-white p-2">
                <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">Pet Vitamins</h3>
                <p className="text-lg font-extrabold text-[#F44336]">₪145</p>
              </div>
            </motion.div>

            {/* Product 6 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.95 }}
              className="rounded-2xl overflow-hidden shadow-md"
            >
              <div className="bg-[#FFC107] p-3 flex items-center justify-center h-28">
                <img src={fleaTreatmentImg} alt="Flea Treatment" className="w-full h-full object-cover rounded-lg" />
              </div>
              <div className="bg-white p-2">
                <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">Healthcare</h3>
                <p className="text-lg font-extrabold text-[#F44336]">₪89</p>
              </div>
            </motion.div>

            {/* Promo Card 2 - Tall Red */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.0 }}
              className="rounded-2xl overflow-hidden shadow-lg row-span-2 bg-[#F44336] p-4 flex flex-col items-center justify-center relative cursor-pointer"
              onClick={() => navigate('/shop')}
            >
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
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.05 }}
              className="rounded-2xl overflow-hidden shadow-md"
            >
              <div className="bg-[#FFC107] p-3 flex items-center justify-center h-28">
                <img src={dogSnacksImg} alt="Snacks" className="w-full h-full object-cover rounded-lg" />
              </div>
              <div className="bg-white p-2">
                <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">Pet Snacks</h3>
                <p className="text-lg font-extrabold text-[#F44336]">₪101</p>
              </div>
            </motion.div>

            {/* Product 8 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.1 }}
              className="rounded-2xl overflow-hidden shadow-md"
            >
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
          <Button
            onClick={() => navigate('/shop')}
            className="w-full mt-4 bg-[#FFD700] hover:bg-[#F4C542] text-gray-900 font-jakarta font-bold py-3 rounded-2xl shadow-md"
          >
            View All Products
          </Button>
        </motion.div>

        {/* Accumulation & Redemption Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="px-4 mt-8 mb-32"
        >
          <h2 className="text-2xl font-extrabold text-gray-900 font-jakarta mb-4">
            Accumulation & Redemption
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
                10% Back
              </h3>
              <p className="text-sm text-gray-600 font-jakarta text-center">
                Accumulate up to 10 credits for every liter
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
                10% Accumulation
              </h3>
              <p className="text-sm text-gray-600 font-jakarta text-center">
                For purchases made from our partners
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
                10% Accumulation
              </h3>
              <p className="text-sm text-gray-600 font-jakarta text-center">
                From local insurance providers
              </p>
            </div>
          </div>
        </motion.div>

      </div>

      {/* Edit Pet Sheet */}
      <Sheet open={!!selectedPetForEdit} onOpenChange={(open) => !open && setSelectedPetForEdit(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="font-jakarta text-xl font-bold text-gray-900">
              Edit Pet Details
            </SheetTitle>
            <SheetDescription className="font-jakarta text-sm text-gray-600">
              Long press detected - Update your pet's information
            </SheetDescription>
          </SheetHeader>
          
          {selectedPetForEdit && (
            <div className="mt-6 space-y-6">
              {/* Pet Avatar Display */}
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#E8F5E8] to-[#B8E3D5] shadow-lg overflow-hidden border-4 border-white">
                  {selectedPetForEdit.avatar_url ? (
                    <img
                      src={selectedPetForEdit.avatar_url}
                      alt={selectedPetForEdit.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      {selectedPetForEdit.pet_type === 'dog' ? '🐕' : '🐈'}
                    </div>
                  )}
                </div>
              </div>

              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="pet-name" className="font-jakarta font-semibold text-gray-900">
                  Pet Name
                </Label>
                <Input
                  id="pet-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="Enter pet name"
                  className="font-jakarta h-12 rounded-xl border-2 focus:border-[#7DD3C0] focus:ring-[#7DD3C0]"
                />
              </div>

              {/* Breed Field */}
              <div className="space-y-2">
                <Label htmlFor="pet-breed" className="font-jakarta font-semibold text-gray-900">
                  Breed
                </Label>
                <Input
                  id="pet-breed"
                  value={editFormData.breed}
                  onChange={(e) => setEditFormData({ ...editFormData, breed: e.target.value })}
                  placeholder="Enter breed"
                  className="font-jakarta h-12 rounded-xl border-2 focus:border-[#7DD3C0] focus:ring-[#7DD3C0]"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedPetForEdit(null)}
                    className="flex-1 h-12 rounded-xl font-jakarta font-bold border-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSavePetEdit}
                    className="flex-1 h-12 rounded-xl font-jakarta font-bold bg-[#7DD3C0] hover:bg-[#6BC4AD] text-gray-900 shadow-md"
                  >
                    Save Changes
                  </Button>
                </div>
                
                {/* Delete Button */}
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full h-12 rounded-xl font-jakarta font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-md"
                >
                  Archive Pet
                </Button>
              </div>
            </div>
          )}
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
            <AlertDialogAction
              onClick={handleDeletePet}
              className="font-jakarta font-bold rounded-xl h-12 w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white"
            >
              Archive Pet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
    </TooltipProvider>
  );
};

export default Home;
