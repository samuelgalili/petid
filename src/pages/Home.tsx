import { Camera, Loader2, History, Plus, ShoppingCart, Package, Info, HelpCircle, Wallet, ShieldCheck, Heart, Store, ImageIcon, FileText } from "lucide-react";
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
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const previousPetIdsRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();
  const { addToCart } = useCart();

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

  // Quick action items for the home page
  const quickActions = [
    {
      icon: ShieldCheck,
      title: "Insurance",
      description: "Protect your pet",
      path: "/insurance",
      gradient: "from-blue-400 to-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: Heart,
      title: "Adoption",
      description: "Find a new friend",
      path: "/adoption",
      gradient: "from-pink-400 to-pink-600",
      bgColor: "bg-pink-50",
    },
    {
      icon: Store,
      title: "Shop",
      description: "Pet supplies",
      path: "/shop",
      gradient: "from-green-400 to-green-600",
      bgColor: "bg-green-50",
    },
    {
      icon: ImageIcon,
      title: "Photo Album",
      description: "Pet memories",
      path: "/photos",
      gradient: "from-purple-400 to-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      icon: FileText,
      title: "Documents",
      description: "Medical records",
      path: "/documents",
      gradient: "from-orange-400 to-orange-600",
      bgColor: "bg-orange-50",
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

  // Fetch user's pets
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
      <div className="min-h-screen pb-20 bg-white">
        <HomePageSkeleton />
        <BottomNav />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className="min-h-screen pb-20 animate-fade-in bg-white dark:bg-gray-900 transition-colors" dir="rtl">
      {/* Content Container */}
      <div className="bg-white px-4 py-4">

        {/* My Pets Section - Enhanced with gradient background */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 pt-2 px-4 py-5 bg-gradient-to-br from-[#F8FCFB] via-white to-[#FFF9F5] rounded-3xl shadow-[0_2px_20px_rgba(125,211,192,0.08)] border border-gray-100/50"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-lg overflow-hidden border border-gray-100">
                <img src={defaultPetAvatar} alt="My Pets" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 font-jakarta bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text leading-none">My Pets</h2>
                <p className="text-xs text-gray-500 mt-0.5">Long press to edit</p>
              </div>
            </div>
            {pets.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/archived-pets')}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 font-jakarta text-xs h-9 px-4 rounded-full focus-visible-ring"
                    aria-label="View archived pets"
                  >
                    Archived
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="font-semibold">View Archived Pets</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Empty State - Enhanced with modern design */}
          {pets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <button
                onClick={() => navigate('/add-pet')}
                className="relative mb-5 cursor-pointer group"
                aria-label="Add your first pet"
              >
                <div className="w-28 h-28 rounded-full bg-white flex items-center justify-center shadow-[0_8px_32px_rgba(125,211,192,0.3)] border-4 border-white overflow-hidden group-hover:shadow-[0_12px_40px_rgba(125,211,192,0.4)] transition-all">
                  <img src={defaultPetAvatar} alt="Add your first pet" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -top-1 -right-1 w-10 h-10 bg-gradient-to-br from-[#FBD66A] to-[#F4C542] rounded-full shadow-lg animate-pulse flex items-center justify-center pointer-events-none">
                  <Plus className="w-5 h-5 text-white pointer-events-none" />
                </div>
              </button>
               <h3 className="text-2xl font-extrabold text-gray-900 font-jakarta mb-2.5 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text tracking-tight">
                 No Pets Yet
               </h3>
               <p className="text-sm text-gray-600 font-jakarta mb-7 max-w-xs leading-relaxed">
                 Add your first furry friend to get started! 🐕 🐈<br/>
                 <span className="text-xs text-gray-500">Make sure you're logged in to save profiles</span>
               </p>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button
                     onClick={() => navigate('/add-pet')}
                     className="bg-gradient-to-r from-[#7DD3C0] via-[#6BC4AD] to-[#5BB89C] hover:from-[#6BC4AD] hover:via-[#5BB89C] hover:to-[#4AA68A] text-white rounded-full font-jakarta font-extrabold px-12 py-7 text-base shadow-[0_8px_24px_rgba(125,211,192,0.4)] hover:shadow-[0_12px_32px_rgba(125,211,192,0.5)] transition-all hover:scale-105 border border-white/20 focus-visible-ring"
                     aria-label="Add your first pet"
                   >
                     <Plus className="w-5 h-5 mr-2" />
                     Add Your First Pet
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent side="bottom">
                   <p className="font-semibold">Create a pet profile</p>
                 </TooltipContent>
               </Tooltip>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {pets.map((pet, index) => {
                const isNewPet = newlyAddedPetIds.has(pet.id);
                
                return (
                <motion.div
                  key={pet.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ 
                    opacity: 1, 
                    scale: isNewPet ? [1, 1.15, 1] : 1,
                  }}
                  transition={{ 
                    delay: 0.05 + index * 0.03,
                    scale: isNewPet ? {
                      duration: 0.6,
                      repeat: 3,
                      repeatType: "reverse",
                      ease: "easeInOut"
                    } : {}
                  }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onTouchStart={() => handlePetLongPressStart(pet)}
                  onTouchEnd={handlePetLongPressEnd}
                  onMouseDown={() => handlePetLongPressStart(pet)}
                  onMouseUp={handlePetLongPressEnd}
                  onMouseLeave={handlePetLongPressEnd}
                  onClick={() => navigate(`/pet/${pet.id}`)}
                  className={`flex-shrink-0 cursor-pointer ${isNewPet ? 'relative' : ''}`}
                >
                  {isNewPet && (
                    <motion.div
                      className="absolute -inset-2 bg-gradient-to-r from-[#7DD3C0] via-[#FBD66A] to-[#7DD3C0] rounded-full blur-xl opacity-60 z-0"
                      animate={{
                        opacity: [0.6, 0.8, 0.6],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}
                  <div className="flex flex-col items-center relative z-10">
                    {/* Enhanced Circular Avatar with conditional glow */}
                    <div className="relative">
                      {isNewPet && (
                        <motion.div 
                          className="absolute -inset-1 bg-gradient-to-br from-[#7DD3C0] to-[#FBD66A] rounded-full blur-lg opacity-70"
                          animate={{
                            opacity: [0.7, 1, 0.7],
                            scale: [1, 1.2, 1],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-br from-[#7DD3C0] to-[#FBD66A] rounded-full blur-md opacity-30 animate-pulse"></div>
                      <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br from-[#FFE8D6] via-[#FFE5F0] to-[#E8F5E8] shadow-[0_6px_20px_rgba(125,211,192,0.25)] overflow-hidden border-[3px] ${isNewPet ? 'border-[#FBD66A]' : 'border-white'} ring-2 ${isNewPet ? 'ring-[#FBD66A]/50' : 'ring-[#7DD3C0]/20'}`}>
                        {pet.avatar_url ? (
                          <img
                            src={pet.avatar_url}
                            alt={pet.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-[#B8E3D5] via-[#7DD3C0] to-[#6BC4AD]">
                            {pet.type === 'dog' ? '🐕' : '🐈'}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Pet Name with gradient */}
                    <p className="mt-2.5 text-xs font-bold text-gray-800 font-jakarta truncate max-w-[80px] text-center">
                      {pet.name}
                    </p>
                  </div>
                </motion.div>
                );
              })}
              
               {/* Enhanced Add Pet Button with tooltip and glow */}
               <Tooltip>
                 <TooltipTrigger asChild>
                   <motion.div
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: 0.05 + pets.length * 0.03 }}
                     whileHover={{ scale: 1.08 }}
                     whileTap={{ scale: 0.92 }}
                     onClick={() => navigate('/add-pet')}
                     className="flex-shrink-0 cursor-pointer"
                     role="button"
                     tabIndex={0}
                     onKeyDown={(e) => e.key === 'Enter' && navigate('/add-pet')}
                     aria-label="Add new pet"
                   >
                     <div className="flex flex-col items-center">
                       <div className="relative">
                         <div className="absolute inset-0 bg-gradient-to-br from-[#7DD3C0] to-[#FBD66A] rounded-full blur-md opacity-30 animate-pulse"></div>
                         <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#F5E6D3] via-[#FFE8D6] to-[#FFF0E5] border-[3px] border-dashed border-[#7DD3C0]/50 shadow-[0_6px_20px_rgba(125,211,192,0.25)] flex items-center justify-center hover:border-[#7DD3C0] hover:shadow-[0_8px_24px_rgba(125,211,192,0.35)] transition-all">
                           <Plus className="w-8 h-8 text-[#7DD3C0]" />
                         </div>
                       </div>
                       <p className="mt-2.5 text-xs font-bold text-[#7DD3C0] font-jakarta">
                         Add Pet
                       </p>
                     </div>
                   </motion.div>
                 </TooltipTrigger>
                 <TooltipContent side="bottom">
                   <p className="font-semibold">Add New Pet Profile</p>
                   <p className="text-xs opacity-80">Click to create</p>
                 </TooltipContent>
               </Tooltip>
            </div>
          )}
        </motion.div>

        {/* Wallet Banner - Shows 5% cashback from purchases */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div 
              className="mb-6 cursor-pointer"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/order-history')}
              role="button"
              tabIndex={0}
              aria-label="View wallet balance"
            >
              <div className="bg-gradient-to-br from-[#FBD66A] via-[#F4C542] to-[#EAA831] text-gray-900 rounded-3xl px-7 py-6 shadow-[0_8px_32px_rgba(251,214,106,0.45)] font-jakarta relative overflow-hidden border border-[#FFF5DC]/40">
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-white/10"></div>
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent"></div>
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="w-6 h-6 text-gray-900" />
                      <span className="text-sm font-bold opacity-90">My Wallet</span>
                    </div>
                    <div className="text-3xl font-extrabold mb-1 drop-shadow-sm">
                      ₪{walletBalance.toFixed(2)}
                    </div>
                    <div className="text-xs font-semibold opacity-80">5% Cashback Balance</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                    <div className="text-2xl font-extrabold text-gray-900">5%</div>
                    <div className="text-xs font-bold opacity-80 whitespace-nowrap">Cashback</div>
                  </div>
                </div>
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
          <h2 className="text-lg font-extrabold text-gray-900 font-jakarta mb-4 px-1">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.path}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 + index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(action.path)}
                className={`${action.bgColor} rounded-2xl p-5 cursor-pointer shadow-sm hover:shadow-md transition-all border border-gray-100`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3 shadow-md`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-gray-900 font-jakarta mb-1">{action.title}</h3>
                <p className="text-xs text-gray-600 font-jakarta">{action.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Featured Products Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-extrabold text-gray-900 font-jakarta">Featured Products</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/shop')}
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
              {products.slice(0, 6).map((product, index) => (
                <CarouselItem key={index} className="pl-2 md:pl-4 basis-[70%] md:basis-1/2 lg:basis-1/3">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.65 + index * 0.05 }}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all"
                  >
                    <div 
                      className={`${product.color} p-6 cursor-pointer`}
                      onClick={() => navigate(product.path)}
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-40 object-cover rounded-xl shadow-md"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-bold text-gray-900 font-jakarta mb-1 truncate">{product.name}</h3>
                      <p className="text-lg font-extrabold text-primary mb-3">{product.price}</p>
                      <Button
                        onClick={() => handleQuickAddToCart(product)}
                        className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white rounded-full font-jakarta font-bold text-sm py-2 shadow-sm hover:shadow-md transition-all"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Quick Add
                      </Button>
                    </div>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
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
