import { Menu, Bell, User, Camera, Loader2, History, Plus, ShoppingCart, Package, Search, Info, HelpCircle } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("account");
  const [activeCategory, setActiveCategory] = useState("intop-ribet");
  const [selectedPetForEdit, setSelectedPetForEdit] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", breed: "" });
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newlyAddedPetIds, setNewlyAddedPetIds] = useState<Set<string>>(new Set());
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const previousPetIdsRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();

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

  // Filter products based on active category - memoized
  const filteredProducts = useMemo(() => 
    products.filter(product => product.category === activeCategory),
    [activeCategory]
  );

  // Calculate product counts per category - memoized
  const categoryCount = useCallback((category: string) => 
    products.filter(p => p.category === category).length,
    []
  );

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
        <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 px-4 py-3 shadow-sm z-40">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-50">
              <Menu className="w-5 h-5 text-gray-700" />
            </Button>
            <div className="flex-1">
              <div className="h-11 bg-gray-100 rounded-xl" />
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-50">
                <Bell className="w-5 h-5 text-gray-700" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-50">
                <User className="w-5 h-5 text-gray-700" />
              </Button>
            </div>
          </div>
        </div>
        <div className="h-16"></div>
        <HomePageSkeleton />
        <BottomNav />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className="min-h-screen pb-20 animate-fade-in bg-white" dir="rtl">
      {/* Header - Fixed at Top */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 px-4 py-3 shadow-sm z-40">
        <div className="flex items-center gap-3">
          {/* Left: Hamburger Menu with Tooltip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-50 transition-all flex-shrink-0 focus-visible-ring">
                    <Menu className="w-5 h-5 text-gray-700" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 bg-white z-[9999] shadow-xl border border-gray-200 rounded-2xl p-2">
                  <DropdownMenuItem onClick={() => navigate("/order-history")} className="rounded-xl p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                    <Package className="w-5 h-5 mr-3 text-[#7DD3C0]" />
                    <div>
                      <div className="font-semibold text-gray-900">Order History</div>
                      <div className="text-xs text-gray-500">View past orders</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/cart")} className="rounded-xl p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                    <ShoppingCart className="w-5 h-5 mr-3 text-[#7DD3C0]" />
                    <div>
                      <div className="font-semibold text-gray-900">Shopping Cart</div>
                      <div className="text-xs text-gray-500">View items</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")} className="rounded-xl p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                    <User className="w-5 h-5 mr-3 text-[#7DD3C0]" />
                    <div>
                      <div className="font-semibold text-gray-900">Settings</div>
                      <div className="text-xs text-gray-500">Manage account</div>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-semibold">Menu</p>
            </TooltipContent>
          </Tooltip>
          
          {/* Center: Search Icon / Expanded Search Bar */}
          {!isSearchOpen ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full hover:bg-gray-50 transition-all focus-visible-ring"
                  onClick={() => setIsSearchOpen(true)}
                  aria-label="Open search"
                >
                  <Search className="w-5 h-5 text-gray-700" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-semibold">Search</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex-1 relative animate-fade-in">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Search products, pets, and more..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => {
                  if (!searchQuery) setIsSearchOpen(false);
                }}
                autoFocus
                aria-label="Search products"
                className="w-full h-12 pl-12 pr-4 rounded-2xl bg-gray-50/80 backdrop-blur-sm border-2 border-gray-200 focus:border-[#7DD3C0] focus:bg-white text-sm text-gray-900 placeholder:text-gray-400 font-jakarta transition-all shadow-sm hover:shadow-md focus:shadow-lg focus-visible-ring"
              />
            </div>
          )}
          
          {/* Right: Notifications + User Profile with Tooltips */}
          <div className="flex gap-2 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full hover:bg-gray-50 transition-all relative focus-visible-ring"
                  onClick={() => toast({ title: "🔔 Notifications", description: "No new notifications" })}
                  aria-label="View notifications"
                >
                  <Bell className="w-5 h-5 text-gray-700" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-[#7DD3C0] rounded-full animate-pulse" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-semibold">Notifications</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full hover:bg-gray-50 transition-all focus-visible-ring"
                  onClick={() => navigate('/settings')}
                  aria-label="User profile"
                >
                  <User className="w-5 h-5 text-gray-700" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-semibold">Profile & Settings</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-16"></div>

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
              <div className="relative mb-5">
                <div className="w-28 h-28 rounded-full bg-white flex items-center justify-center shadow-[0_8px_32px_rgba(125,211,192,0.3)] border-4 border-white overflow-hidden">
                  <img src={defaultPetAvatar} alt="Add your first pet" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -top-1 -right-1 w-10 h-10 bg-gradient-to-br from-[#FBD66A] to-[#F4C542] rounded-full shadow-lg animate-pulse flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
              </div>
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

        {/* Enhanced Membership Banner with tooltip and shine effect */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div 
              className="mb-3 cursor-pointer"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toast({ 
                title: "✨ Premium Membership", 
                description: "Unlock exclusive benefits and special discounts!",
                duration: 3000
              })}
              role="button"
              tabIndex={0}
              aria-label="Learn more about membership"
            >
              <div className="bg-gradient-to-br from-[#FBD66A] via-[#F4C542] to-[#EAA831] text-gray-900 rounded-3xl px-7 py-5 text-center font-bold shadow-[0_8px_32px_rgba(251,214,106,0.45)] font-jakarta relative overflow-hidden border border-[#FFF5DC]/40">
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-white/10"></div>
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent"></div>
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="relative z-10">
                  <div className="text-lg mb-1 font-extrabold tracking-wide drop-shadow-sm">✨ Membership Club</div>
                  <div className="text-sm font-semibold opacity-90">Premium Access & Exclusive Deals</div>
                </div>
              </div>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-semibold">Premium Membership</p>
            <p className="text-xs opacity-80">Click to learn more</p>
          </TooltipContent>
        </Tooltip>

        {/* Enhanced Animated Promo Ticker with glow */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-6 overflow-hidden bg-gradient-to-r from-[#7DD3C0] via-[#6BC4AD] to-[#7DD3C0] py-2.5 rounded-2xl shadow-[0_4px_20px_rgba(125,211,192,0.3)] border border-[#A5E8D8]/30"
        >
          <div className="flex animate-scroll-left whitespace-nowrap">
            {/* First set of messages */}
            <div className="flex gap-8 px-4">
              <span className="text-white text-sm font-bold font-jakarta flex items-center gap-2">
                <span>🎉</span> Free Shipping on Orders Over ₪199
              </span>
              <span className="text-white text-sm font-bold font-jakarta flex items-center gap-2">
                <span>⭐</span> New Member? Get 15% Off Your First Order
              </span>
              <span className="text-white text-sm font-bold font-jakarta flex items-center gap-2">
                <span>🐾</span> Premium Pet Food - Best Prices Guaranteed
              </span>
              <span className="text-white text-sm font-bold font-jakarta flex items-center gap-2">
                <span>❤️</span> Join Our Loyalty Program Today
              </span>
              <span className="text-white text-sm font-bold font-jakarta flex items-center gap-2">
                <span>🎁</span> Special Deals Updated Daily
              </span>
            </div>
            {/* Duplicate set for seamless loop */}
            <div className="flex gap-8 px-4">
              <span className="text-white text-sm font-bold font-jakarta flex items-center gap-2">
                <span>🎉</span> Free Shipping on Orders Over ₪199
              </span>
              <span className="text-white text-sm font-bold font-jakarta flex items-center gap-2">
                <span>⭐</span> New Member? Get 15% Off Your First Order
              </span>
              <span className="text-white text-sm font-bold font-jakarta flex items-center gap-2">
                <span>🐾</span> Premium Pet Food - Best Prices Guaranteed
              </span>
              <span className="text-white text-sm font-bold font-jakarta flex items-center gap-2">
                <span>❤️</span> Join Our Loyalty Program Today
              </span>
              <span className="text-white text-sm font-bold font-jakarta flex items-center gap-2">
                <span>🎁</span> Special Deals Updated Daily
              </span>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Primary Filter Pills with gradients */}
        <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          <motion.button 
            onClick={() => setActiveFilter("account")}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
            className={`px-7 py-3 rounded-full text-sm font-bold font-jakarta whitespace-nowrap transition-all flex items-center gap-2 ${
              activeFilter === "account" 
                ? "bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-[0_6px_24px_rgba(0,0,0,0.3)] border border-gray-700" 
                : "bg-white text-gray-700 border-2 border-gray-200 shadow-[0_3px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.15)] hover:border-gray-300"
            }`}
          >
            <span>All Products</span>
            {activeFilter === "account" && (
              <span className="text-sm animate-pulse">→</span>
            )}
          </motion.button>
          <motion.button 
            onClick={() => setActiveFilter("aget")}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
            className={`px-7 py-3 rounded-full text-sm font-bold font-jakarta whitespace-nowrap transition-all ${
              activeFilter === "aget" 
                ? "bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-[0_6px_24px_rgba(0,0,0,0.3)] border border-gray-700" 
                : "bg-white text-gray-700 border-2 border-gray-200 shadow-[0_3px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.15)] hover:border-gray-300"
            }`}
          >
            Best Sellers
          </motion.button>
          <motion.button 
            onClick={() => setActiveFilter("int1-out")}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
            className={`px-7 py-3 rounded-full text-sm font-bold font-jakarta whitespace-nowrap transition-all ${
              activeFilter === "int1-out" 
                ? "bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-[0_6px_24px_rgba(0,0,0,0.3)] border border-gray-700" 
                : "bg-white text-gray-700 border-2 border-gray-200 shadow-[0_3px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.15)] hover:border-gray-300"
            }`}
          >
            New In
          </motion.button>
        </div>

        {/* Enhanced Category Filters with gradient badges */}
        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
          <motion.button 
            onClick={() => setActiveCategory("account-cater")}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
            className={`px-6 py-3 rounded-full text-sm font-bold font-jakarta whitespace-nowrap transition-all flex items-center gap-2.5 ${
              activeCategory === "account-cater" 
                ? "bg-gradient-to-r from-[#7DD3C0] to-[#6BC4AD] text-white shadow-[0_6px_24px_rgba(125,211,192,0.4)] border border-[#A5E8D8]/40" 
                : "bg-white text-gray-700 border-2 border-gray-200 shadow-[0_3px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.15)] hover:border-gray-300"
            }`}
          >
            <span>Accessories</span>
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold transition-all ${
              activeCategory === "account-cater" 
                ? "bg-white/90 text-[#7DD3C0] shadow-sm" 
                : "bg-gradient-to-br from-gray-100 to-gray-50 text-gray-700"
            }`}>
              {categoryCount("account-cater")}
            </span>
          </motion.button>
          <motion.button 
            onClick={() => setActiveCategory("intop-ribet")}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
            className={`px-6 py-3 rounded-full text-sm font-bold font-jakarta whitespace-nowrap transition-all flex items-center gap-2.5 ${
              activeCategory === "intop-ribet" 
                ? "bg-gradient-to-r from-[#7DD3C0] to-[#6BC4AD] text-white shadow-[0_6px_24px_rgba(125,211,192,0.4)] border border-[#A5E8D8]/40" 
                : "bg-white text-gray-700 border-2 border-gray-200 shadow-[0_3px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.15)] hover:border-gray-300"
            }`}
          >
            <span>Food & Treats</span>
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold transition-all ${
              activeCategory === "intop-ribet" 
                ? "bg-white/90 text-[#7DD3C0] shadow-sm" 
                : "bg-gradient-to-br from-gray-100 to-gray-50 text-gray-700"
            }`}>
              {categoryCount("intop-ribet")}
            </span>
          </motion.button>
          <motion.button 
            onClick={() => setActiveCategory("deterrtn")}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
            className={`px-6 py-3 rounded-full text-sm font-bold font-jakarta whitespace-nowrap transition-all flex items-center gap-2.5 ${
              activeCategory === "deterrtn" 
                ? "bg-gradient-to-r from-[#7DD3C0] to-[#6BC4AD] text-white shadow-[0_6px_24px_rgba(125,211,192,0.4)] border border-[#A5E8D8]/40" 
                : "bg-white text-gray-700 border-2 border-gray-200 shadow-[0_3px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.15)] hover:border-gray-300"
            }`}
          >
            <span>Healthcare</span>
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold transition-all ${
              activeCategory === "deterrtn" 
                ? "bg-white/90 text-[#7DD3C0] shadow-sm" 
                : "bg-gradient-to-br from-gray-100 to-gray-50 text-gray-700"
            }`}>
              {categoryCount("deterrtn")}
            </span>
          </motion.button>
        </div>
      </div>

      {/* 2-Column Product Grid with Smooth Animations */}
      <div className="px-4 pt-4 pb-6">
        <AnimatePresence mode="wait">
          {filteredProducts.length > 0 ? (
            <motion.div 
              key={activeCategory}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="grid grid-cols-2 gap-4"
            >
            {filteredProducts.map((product, index) => (
              <motion.div
                key={`${activeCategory}-${index}`}
                onClick={() => navigate('/product/' + index, { state: { product } })}
                initial={{ opacity: 0, scale: 0.88, y: 25 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88, y: -25 }}
                transition={{ 
                  delay: index * 0.06, 
                  duration: 0.35,
                  ease: [0.34, 1.56, 0.64, 1]
                }}
                whileHover={{ scale: 1.05, y: -10 }}
                whileTap={{ scale: 0.96 }}
                className={`${product.color} rounded-3xl p-5 flex flex-col cursor-pointer transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.2)] border-2 border-white/50 backdrop-blur-sm relative overflow-hidden`}
              >
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                
                {/* Product Image with enhanced backdrop */}
                <div className="relative w-full aspect-square flex items-center justify-center mb-4 bg-white/60 rounded-2xl backdrop-blur-md overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-white/60">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Product Info */}
                <div className="flex-1 flex flex-col relative z-10">
                  <h3 className="font-bold text-base mb-3 text-gray-900 font-jakarta leading-snug line-clamp-2 min-h-[2.5rem]">
                    {product.name}
                  </h3>
                  
                  {/* Price and Enhanced Cart Button */}
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <span className="text-lg font-extrabold text-gray-900 font-jakarta">
                      {product.price}
                    </span>
                    <motion.button 
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerConfetti();
                        toast({ 
                          title: "Added to cart", 
                          description: `${product.name} added successfully` 
                        });
                      }}
                      whileHover={{ scale: 1.15, rotate: 8 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-12 h-12 bg-gradient-to-br from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 rounded-2xl flex items-center justify-center transition-all shadow-[0_6px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.4)] active:shadow-sm border border-gray-700"
                    >
                      <ShoppingCart className="w-5 h-5 text-white" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
            </motion.div>
          ) : (
            <motion.div 
              key="empty-state"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                <Package className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold font-jakarta text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500 font-jakarta text-sm">Try selecting a different category</p>
            </motion.div>
          )}
        </AnimatePresence>
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
