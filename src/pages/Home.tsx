import { Menu, Bell, User, Camera, Loader2, History, Plus, ShoppingCart, Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
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

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [petsLoading, setPetsLoading] = useState(true);
  const [pets, setPets] = useState<any[]>([]);
  const [redetectingPetId, setRedetectingPetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("account");
  const [activeCategory, setActiveCategory] = useState("intop-ribet");
  const [selectedPetForEdit, setSelectedPetForEdit] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", breed: "" });
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const { toast } = useToast();

  // Fetch user's pets
  useEffect(() => {
    const fetchPets = async () => {
      setPetsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('pets')
          .select('*')
          .eq('user_id', user.id)
          .eq('archived', false) // Only fetch non-archived pets
          .order('created_at', { ascending: false });
        if (data) {
          setPets(data);
        }
      }
      setLoading(false);
      setPetsLoading(false);
    };

    fetchPets();
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

  // Calculate product counts per category
  const categoryCount = (category: string) => 
    products.filter(p => p.category === category).length;

  // Filter products based on active category
  const filteredProducts = products.filter(
    product => product.category === activeCategory
  );

  return (
    <div className="min-h-screen pb-20 animate-fade-in bg-white" dir="rtl">
      {/* Header - Fixed at Top */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 px-4 py-3 shadow-sm z-40">
        <div className="flex items-center gap-3">
          {/* Left: Hamburger Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-50 transition-all flex-shrink-0">
                <Menu className="w-5 h-5 text-gray-700" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-white z-50">
              <DropdownMenuItem onClick={() => navigate("/order-history")}>
                <Package className="w-4 h-4 mr-2" />
                Order History
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/cart")}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Shopping Cart
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <User className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Center: Large Rounded Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search products" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={() => toast({ title: "Search", description: "Search functionality coming soon" })}
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-gray-300 focus:bg-white text-sm text-gray-900 placeholder:text-gray-400 font-jakarta transition-all shadow-sm"
            />
          </div>
          
          {/* Right: Notifications + User Profile */}
          <div className="flex gap-1 flex-shrink-0">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full hover:bg-gray-50 transition-all"
              onClick={() => toast({ title: "Notifications", description: "No new notifications" })}
            >
              <Bell className="w-5 h-5 text-gray-700" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full hover:bg-gray-50 transition-all"
              onClick={() => navigate('/settings')}
            >
              <User className="w-5 h-5 text-gray-700" />
            </Button>
          </div>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-16"></div>

      {/* Content Container */}
      <div className="bg-white px-4 py-4">

        {/* My Pets Section - Always visible */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 pt-2"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900 font-jakarta">My Pets</h2>
            {pets.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/archived-pets')}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 font-jakarta text-xs h-7 px-2"
              >
                Archived
              </Button>
            )}
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {pets.map((pet, index) => (
              <motion.div
                key={pet.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 + index * 0.03 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onTouchStart={() => handlePetLongPressStart(pet)}
                onTouchEnd={handlePetLongPressEnd}
                onMouseDown={() => handlePetLongPressStart(pet)}
                onMouseUp={handlePetLongPressEnd}
                onMouseLeave={handlePetLongPressEnd}
                onClick={() => navigate('/add-pet')}
                className="flex-shrink-0 cursor-pointer"
              >
                <div className="flex flex-col items-center">
                  {/* Circular Avatar */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFE8D6] via-[#FFE5F0] to-[#E8F5E8] shadow-[0_4px_12px_rgba(0,0,0,0.12)] overflow-hidden border-[3px] border-white ring-2 ring-gray-100">
                      {pet.avatar_url ? (
                        <img
                          src={pet.avatar_url}
                          alt={pet.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-[#B8E3D5] to-[#7DD3C0]">
                          {pet.type === 'dog' ? '🐕' : '🐈'}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Pet Name */}
                  <p className="mt-2 text-xs font-bold text-gray-800 font-jakarta truncate max-w-[80px] text-center">
                    {pet.name}
                  </p>
                </div>
              </motion.div>
            ))}
            
            {/* Add Pet Button - Circular */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 + pets.length * 0.03 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => navigate('/add-pet')}
              className="flex-shrink-0 cursor-pointer"
            >
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#F5E6D3] to-[#FFE8D6] border-[3px] border-dashed border-[#7DD3C0]/40 shadow-[0_4px_12px_rgba(125,211,192,0.15)] flex items-center justify-center hover:border-[#7DD3C0] hover:shadow-[0_6px_16px_rgba(125,211,192,0.25)] transition-all">
                  <Plus className="w-8 h-8 text-[#7DD3C0]" />
                </div>
                <p className="mt-2 text-xs font-bold text-[#7DD3C0] font-jakarta">
                  Add Pet
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Membership Banner - Gold Rounded Rectangle */}
        <motion.div 
          className="mb-5"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-gradient-to-br from-[#FBD66A] via-[#F4C542] to-[#FBD66A] text-gray-900 rounded-2xl px-5 py-3.5 text-center font-bold shadow-[0_4px_20px_rgba(251,214,106,0.35)] font-jakarta relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent"></div>
            <div className="relative z-10">
              <div className="text-sm mb-0.5">Membership Club</div>
              <div className="text-xs font-medium opacity-80">Premium Access</div>
            </div>
          </div>
        </motion.div>

        {/* Primary Filter Pills with Soft Shadows */}
        <div className="flex gap-2.5 overflow-x-auto pb-3 mb-5 scrollbar-hide">
          <motion.button 
            onClick={() => setActiveFilter("account")}
            whileTap={{ scale: 0.95 }}
            className={`px-6 py-2.5 rounded-full text-sm font-bold font-jakarta whitespace-nowrap transition-all flex items-center gap-2 ${
              activeFilter === "account" 
                ? "bg-gray-900 text-white shadow-[0_4px_16px_rgba(0,0,0,0.25)]" 
                : "bg-white text-gray-700 border-2 border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
            }`}
          >
            <span>All Products</span>
            {activeFilter === "account" && (
              <span className="text-sm">→</span>
            )}
          </motion.button>
          <motion.button 
            onClick={() => setActiveFilter("aget")}
            whileTap={{ scale: 0.95 }}
            className={`px-6 py-2.5 rounded-full text-sm font-bold font-jakarta whitespace-nowrap transition-all ${
              activeFilter === "aget" 
                ? "bg-gray-900 text-white shadow-[0_4px_16px_rgba(0,0,0,0.25)]" 
                : "bg-white text-gray-700 border-2 border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
            }`}
          >
            Best Sellers
          </motion.button>
          <motion.button 
            onClick={() => setActiveFilter("int1-out")}
            whileTap={{ scale: 0.95 }}
            className={`px-6 py-2.5 rounded-full text-sm font-bold font-jakarta whitespace-nowrap transition-all ${
              activeFilter === "int1-out" 
                ? "bg-gray-900 text-white shadow-[0_4px_16px_rgba(0,0,0,0.25)]" 
                : "bg-white text-gray-700 border-2 border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
            }`}
          >
            New In
          </motion.button>
        </div>

        {/* Secondary Category Filters with Product Count Badges */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
          <motion.button 
            onClick={() => setActiveCategory("account-cater")}
            whileTap={{ scale: 0.95 }}
            className={`px-5 py-2.5 rounded-full text-sm font-bold font-jakarta whitespace-nowrap transition-all flex items-center gap-2 ${
              activeCategory === "account-cater" 
                ? "bg-[#7DD3C0] text-gray-900 shadow-[0_4px_16px_rgba(125,211,192,0.3)]" 
                : "bg-white text-gray-700 border-2 border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
            }`}
          >
            <span>Accessories</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              activeCategory === "account-cater" 
                ? "bg-white/60 text-gray-900" 
                : "bg-gray-100 text-gray-700"
            }`}>
              {categoryCount("account-cater")}
            </span>
          </motion.button>
          <motion.button 
            onClick={() => setActiveCategory("intop-ribet")}
            whileTap={{ scale: 0.95 }}
            className={`px-5 py-2.5 rounded-full text-sm font-bold font-jakarta whitespace-nowrap transition-all flex items-center gap-2 ${
              activeCategory === "intop-ribet" 
                ? "bg-[#7DD3C0] text-gray-900 shadow-[0_4px_16px_rgba(125,211,192,0.3)]" 
                : "bg-white text-gray-700 border-2 border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
            }`}
          >
            <span>Food & Treats</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              activeCategory === "intop-ribet" 
                ? "bg-white/60 text-gray-900" 
                : "bg-gray-100 text-gray-700"
            }`}>
              {categoryCount("intop-ribet")}
            </span>
          </motion.button>
          <motion.button 
            onClick={() => setActiveCategory("deterrtn")}
            whileTap={{ scale: 0.95 }}
            className={`px-5 py-2.5 rounded-full text-sm font-bold font-jakarta whitespace-nowrap transition-all flex items-center gap-2 ${
              activeCategory === "deterrtn" 
                ? "bg-[#7DD3C0] text-gray-900 shadow-[0_4px_16px_rgba(125,211,192,0.3)]" 
                : "bg-white text-gray-700 border-2 border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
            }`}
          >
            <span>Healthcare</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              activeCategory === "deterrtn" 
                ? "bg-white/60 text-gray-900" 
                : "bg-gray-100 text-gray-700"
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
                whileHover={{ scale: 1.04, y: -8 }}
                whileTap={{ scale: 0.96 }}
                className={`${product.color} rounded-3xl p-5 flex flex-col cursor-pointer transition-all duration-300 shadow-[0_6px_24px_rgba(0,0,0,0.10)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.18)] border border-white/40`}
              >
                {/* Product Image with White Backdrop */}
                <div className="w-full aspect-square flex items-center justify-center mb-4 bg-white/50 rounded-2xl backdrop-blur-sm overflow-hidden shadow-inner">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Product Info */}
                <div className="flex-1 flex flex-col">
                  <h3 className="font-bold text-base mb-2.5 text-gray-900 font-jakarta leading-snug line-clamp-2 min-h-[2.5rem]">
                    {product.name}
                  </h3>
                  
                  {/* Price and Dark Rounded Cart Button */}
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <span className="text-base font-bold text-gray-900 font-jakarta">
                      {product.price}
                    </span>
                    <motion.button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toast({ 
                          title: "Added to cart", 
                          description: `${product.name} added successfully` 
                        });
                      }}
                      whileHover={{ scale: 1.12, rotate: 5 }}
                      whileTap={{ scale: 0.92 }}
                      className="w-11 h-11 bg-gray-900 hover:bg-gray-800 rounded-2xl flex items-center justify-center transition-all shadow-lg active:shadow-sm"
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
  );
};

export default Home;
