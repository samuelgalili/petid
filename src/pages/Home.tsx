import { Menu, Bell, UserX, Camera, Loader2, History, Plus, ShoppingCart, Package } from "lucide-react";
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
          .eq('user_id', user.id);
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
        .eq('user_id', user.id);

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

  if (loading) {
    return (
      <div className="min-h-screen pb-20 bg-white" dir="rtl">
        <div className="bg-white border-b border-gray-200 p-6 pb-6">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100">
              <Menu className="w-5 h-5 text-gray-700" />
            </Button>
            <div className="flex-1 mx-4">
              <div className="h-10 bg-gray-100 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100">
                <Bell className="w-5 h-5 text-gray-700" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100">
                <UserX className="w-5 h-5 text-gray-700" />
              </Button>
            </div>
          </div>
        </div>

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
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6 pb-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          {/* Left Side: User Icon + Notifications */}
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full hover:bg-gray-100 transition-all hover:scale-110 active:scale-95"
              onClick={() => navigate('/settings')}
            >
              <UserX className="w-5 h-5 text-gray-700" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full hover:bg-gray-100 transition-all hover:scale-110 active:scale-95"
              onClick={() => toast({ title: "Notifications", description: "No new notifications" })}
            >
              <Bell className="w-5 h-5 text-gray-700" />
            </Button>
          </div>
          
          {/* Center: Large Rounded Search Bar */}
          <div className="flex-1 mx-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search products..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 px-6 rounded-full bg-gray-50 border-2 border-gray-200 focus:border-[#FBD66A] focus:ring-2 focus:ring-[#FBD66A]/20 text-sm text-gray-900 placeholder:text-gray-400 font-jakarta transition-all shadow-sm focus:shadow-md hover:shadow-md"
              />
            </div>
          </div>
          
          {/* Right Side: Hamburger Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100 transition-all hover:scale-110 active:scale-95">
                <Menu className="w-5 h-5 text-gray-700" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white z-50">
              <DropdownMenuItem onClick={() => navigate("/order-history")}>
                <Package className="w-4 h-4 mr-2" />
                Order History
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/cart")}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Shopping Cart
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <UserX className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Membership Banner - Gold Rounded Rectangle */}
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-gradient-to-br from-[#FBD66A] via-[#F4C542] to-[#FBD66A] text-gray-900 rounded-2xl px-6 py-4 text-center font-bold shadow-[0_6px_25px_rgba(251,214,106,0.4)] font-jakarta relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent"></div>
            <div className="relative z-10">
              <div className="text-base mb-0.5">Membership Club</div>
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
      <div className="px-6 pt-6 pb-6">
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

      {/* My Pets Section */}
      {petsLoading ? (
        <div className="px-6 pt-8 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-7 w-32 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-9 w-24 bg-gray-200 rounded-full animate-pulse" />
          </div>
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => (
              <PetCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : pets.length > 0 ? (
        <motion.div 
          className="px-6 pt-8 pb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold font-jakarta text-gray-900">My Pets</h2>
            <Button
              onClick={() => navigate('/add-pet')}
              size="sm"
              className="bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900 rounded-full font-jakarta font-semibold shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Pet
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {pets.map((pet, index) => (
              <motion.div
                key={pet.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1, duration: 0.3 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className="p-4 bg-white border-2 border-gray-200 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <Avatar className="w-16 h-16 border-2 border-[#FBD66A]/30 ring-2 ring-transparent hover:ring-[#FBD66A]/20 transition-all">
                        <AvatarImage src={pet.avatar_url || undefined} />
                        <AvatarFallback className="bg-[#FBD66A]/20 text-gray-900 font-bold text-lg font-jakarta">
                          {pet.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        size="icon"
                        onClick={() => fileInputRefs.current[pet.id]?.click()}
                        disabled={redetectingPetId === pet.id}
                        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900 shadow-md hover:shadow-lg transition-all hover:scale-110"
                      >
                        {redetectingPetId === pet.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Camera className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Input
                        ref={(el) => (fileInputRefs.current[pet.id] = el)}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleRedetectBreed(pet.id, pet.type, file);
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg font-jakarta text-gray-900">{pet.name}</h3>
                      <p className="text-sm text-gray-600 font-jakarta capitalize">{pet.type}</p>
                      {pet.breed && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm text-gray-700 font-jakarta">{pet.breed}</span>
                          {pet.breed_confidence !== null && (
                            <span className={`text-lg font-semibold ${
                              pet.breed_confidence > 70 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {pet.breed_confidence > 70 ? '✓' : '✗'}
                            </span>
                          )}
                        </div>
                      )}
                      {pet.gender && (
                        <p className="text-xs text-gray-500 font-jakarta mt-1 capitalize">{pet.gender}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/breed-history/${pet.id}`)}
                      className="self-center rounded-xl border-2 border-gray-200 hover:border-[#FBD66A] hover:bg-[#FBD66A]/5 text-gray-700 hover:text-gray-900 transition-all hover:scale-105"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div 
          className="px-6 pt-12 pb-6 flex flex-col items-center justify-center text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <div className="w-32 h-32 bg-gradient-to-br from-[#FBD66A]/20 to-[#F4C542]/20 rounded-full flex items-center justify-center mb-6 shadow-lg">
            <span className="text-6xl">🐾</span>
          </div>
          <h3 className="text-xl font-bold font-jakarta text-gray-900 mb-2">No Pets Yet</h3>
          <p className="text-gray-600 font-jakarta mb-6 max-w-sm">Start your pet journey by adding your first furry friend!</p>
          <Button
            onClick={() => navigate('/add-pet')}
            className="bg-gradient-to-r from-[#FBD66A] to-[#F4C542] hover:from-[#F4C542] hover:to-[#FBD66A] text-gray-900 rounded-full font-jakarta font-semibold px-8 py-6 text-base shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Your First Pet
          </Button>
        </motion.div>
      )}

      <BottomNav />
    </div>
  );
};

export default Home;
