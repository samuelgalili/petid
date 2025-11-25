import { Menu, Bell, UserX, Camera, Loader2, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { HomePageSkeleton, PetCardSkeleton } from "@/components/LoadingSkeleton";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

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

  const features = [
    {
      icon: "🦴",
      label: "אתני ושטף",
      description: "AMMI SPN",
      path: "/tracker",
      external: false,
      color: "bg-[#FFE5E5]",
      dotColor: "#FFC4C4",
    },
    {
      icon: "🧸",
      label: "בצלין",
      description: "LIYE SOON",
      path: "/parks",
      external: false,
      color: "bg-[#D4F0ED]",
      dotColor: "#9FE2DD",
    },
    {
      icon: "🦴",
      label: "חשבה",
      description: "OROOUN",
      path: "/experiences",
      external: false,
      color: "bg-[#F5F0E8]",
      dotColor: "#E8DCC8",
    },
    {
      icon: "🦅",
      label: "אודיקה",
      description: "PRETECIOUS",
      path: "/tracker",
      external: false,
      color: "bg-[#E8E5FF]",
      dotColor: "#C5BFFF",
    },
    {
      icon: "🪞",
      label: "מדריכה",
      description: "FOR MIRROR",
      path: "/parks",
      external: false,
      color: "bg-[#FFF9E5]",
      dotColor: "#FFF0B8",
    },
    {
      icon: "🎾",
      label: "דינה",
      description: "FOR PA",
      path: "/experiences",
      external: false,
      color: "bg-[#E5F5E8]",
      dotColor: "#C1E8C9",
    },
    {
      icon: "🐾",
      label: "מידעית",
      description: "PAL MELA",
      path: "/tracker",
      external: false,
      color: "bg-[#FFF5E5]",
      dotColor: "#FFE5B8",
    },
    {
      icon: "🦴",
      label: "שינותב",
      description: "DELALEIDUO",
      path: "/parks",
      external: false,
      color: "bg-[#D4F0ED]",
      dotColor: "#9FE2DD",
    },
    {
      icon: "🎀",
      label: "משטיע",
      description: "MEEMINDES",
      path: "https://petid.co.il/catalog-new/",
      external: true,
      color: "bg-[#FFE5E5]",
      dotColor: "#FFC4C4",
    },
  ];

  return (
    <div className="min-h-screen pb-20 animate-fade-in bg-white" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6 pb-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100">
            <Menu className="w-5 h-5 text-gray-700" />
          </Button>
          <div className="flex-1 mx-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search" 
                className="w-full h-10 px-4 rounded-full bg-gray-50 border-2 border-gray-200 focus:border-[#FBD66A] focus:ring-2 focus:ring-[#FBD66A]/20 text-sm text-center text-gray-900 placeholder:text-gray-500 font-jakarta transition-all shadow-sm focus:shadow-md"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full hover:bg-gray-100 transition-all hover:scale-110 active:scale-95"
              onClick={() => toast({ title: "Notifications", description: "No new notifications" })}
            >
              <Bell className="w-5 h-5 text-gray-700" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full hover:bg-gray-100 transition-all hover:scale-110 active:scale-95"
              onClick={() => navigate('/settings')}
            >
              <UserX className="w-5 h-5 text-gray-700" />
            </Button>
          </div>
        </div>

        {/* Membership Banner */}
        <div className="mb-5">
          <div className="bg-gradient-to-r from-[#FBD66A] to-[#F4C542] text-gray-900 rounded-2xl px-4 py-3 text-center font-semibold text-sm shadow-[0_4px_20px_rgba(251,214,106,0.3)] font-jakarta">
            Membership Club<br />
            <span className="text-xs font-normal opacity-70">Premium Access</span>
          </div>
        </div>

        {/* Primary Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          <button 
            onClick={() => setActiveFilter("int1-out")}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold font-jakarta whitespace-nowrap transition-all shadow-sm ${
              activeFilter === "int1-out" 
                ? "bg-white text-gray-900 border-2 border-gray-200" 
                : "bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100"
            }`}
          >
            New In
          </button>
          <button 
            onClick={() => setActiveFilter("aget")}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold font-jakarta whitespace-nowrap transition-all shadow-sm ${
              activeFilter === "aget" 
                ? "bg-white text-gray-900 border-2 border-gray-200" 
                : "bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100"
            }`}
          >
            Best Sellers
          </button>
          <button 
            onClick={() => setActiveFilter("account")}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold font-jakarta whitespace-nowrap transition-all shadow-md flex items-center gap-2 ${
              activeFilter === "account" 
                ? "bg-gray-900 text-white" 
                : "bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100"
            }`}
          >
            <span>All Products</span>
            {activeFilter === "account" && (
              <span className="text-xs">→</span>
            )}
          </button>
        </div>

        {/* Category Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <button 
            onClick={() => setActiveCategory("intop-ribet")}
            className={`px-5 py-2.5 rounded-full text-sm font-bold font-jakarta whitespace-nowrap transition-all shadow-sm ${
              activeCategory === "intop-ribet" 
                ? "bg-[#7DD3C0] text-gray-900" 
                : "bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-50"
            }`}
          >
            Food & Treats
          </button>
          <button 
            onClick={() => setActiveCategory("account-cater")}
            className={`px-5 py-2.5 rounded-full text-sm font-bold font-jakarta whitespace-nowrap transition-all shadow-sm ${
              activeCategory === "account-cater" 
                ? "bg-[#7DD3C0] text-gray-900" 
                : "bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-50"
            }`}
          >
            Accessories
          </button>
          <button 
            onClick={() => setActiveCategory("deterrtn")}
            className={`px-5 py-2.5 rounded-full text-sm font-bold font-jakarta whitespace-nowrap transition-all shadow-sm ${
              activeCategory === "deterrtn" 
                ? "bg-[#7DD3C0] text-gray-900" 
                : "bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-50"
            }`}
          >
            Healthcare
          </button>
        </div>
      </div>

      {/* Feature Grid with Staggered Animation */}
      <div className="px-6 pt-6 pb-6 grid grid-cols-3 gap-4">
        {features.map((feature, index) => {
          if (feature.external) {
            return (
              <motion.a
                key={index}
                href={feature.path}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                className={`group ${feature.color} rounded-[1.75rem] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 min-h-[130px] relative shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] border-2 border-gray-100`}
              >
                <div className="absolute top-3 right-3 w-4 h-4 rounded-full transition-transform group-hover:scale-110" style={{ backgroundColor: feature.dotColor }} />
                <div className="text-4xl mb-1 transition-transform group-hover:scale-110">{feature.icon}</div>
                <div className="text-center">
                  <h3 className="font-bold text-sm mb-0.5 leading-tight text-gray-900 font-jakarta">{feature.label}</h3>
                  <p className="text-[9px] text-gray-500 uppercase tracking-wide font-semibold font-jakarta">{feature.description}</p>
                </div>
              </motion.a>
            );
          }
          
          return (
            <motion.div
              key={index}
              onClick={() => navigate(feature.path)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
              className={`group ${feature.color} rounded-[1.75rem] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 min-h-[130px] relative shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] border-2 border-gray-100`}
            >
              <div className="absolute top-3 right-3 w-4 h-4 rounded-full transition-transform group-hover:scale-110" style={{ backgroundColor: feature.dotColor }} />
              <div className="text-4xl mb-1 transition-transform group-hover:scale-110">{feature.icon}</div>
              <div className="text-center">
                <h3 className="font-bold text-sm mb-0.5 leading-tight text-gray-900 font-jakarta">{feature.label}</h3>
                <p className="text-[9px] text-gray-500 uppercase tracking-wide font-semibold font-jakarta">{feature.description}</p>
              </div>
            </motion.div>
          );
        })}
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
