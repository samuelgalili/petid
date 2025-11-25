import { Menu, Bell, UserX, Camera, Loader2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { HomePageSkeleton } from "@/components/LoadingSkeleton";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pets, setPets] = useState<any[]>([]);
  const [redetectingPetId, setRedetectingPetId] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const { toast } = useToast();

  // Fetch user's pets
  useEffect(() => {
    const fetchPets = async () => {
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
      <div className="min-h-screen pb-20" dir="rtl" style={{ background: 'hsl(48 67% 97%)' }}>
        <div className="bg-[hsl(48_67%_97%)] border-b border-border/30 p-6 pb-6">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex-1 mx-4">
              <div className="h-10 bg-white rounded-full" />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <UserX className="w-5 h-5" />
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
    <div className="min-h-screen pb-20 animate-fade-in" dir="rtl" style={{ background: 'hsl(48 67% 97%)' }}>
      {/* Header */}
      <div className="bg-[hsl(48_67%_97%)] border-b border-border/30 p-6 pb-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/50">
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex-1 mx-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search" 
                className="w-full h-10 px-4 rounded-full bg-white border-0 text-sm text-center shadow-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/50">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/50">
              <UserX className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Membership Banner */}
        <div className="mb-4">
          <div className="bg-primary text-white rounded-2xl px-4 py-3 text-center font-semibold text-sm shadow-md">
            Annual Membership<br />Membership.yub
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <button className="px-4 py-2 rounded-full bg-white text-sm font-medium whitespace-nowrap shadow-sm border border-border/20">
            AUEE ועד
          </button>
          <button className="px-4 py-2 rounded-full bg-white/50 text-sm font-medium whitespace-nowrap">
            לימון LIMOUNT
          </button>
          <button className="px-4 py-2 rounded-full bg-white/50 text-sm font-medium whitespace-nowrap">
            ACCOUION
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-4">
          <button className="px-4 py-2 rounded-full bg-primary text-white text-sm font-medium shadow-md flex items-center gap-2">
            <span>A</span>
            <span>COCAINT</span>
          </button>
          <button className="px-4 py-2 rounded-full bg-white text-sm font-medium">
            חייב יקרים ACCOUN
          </button>
          <button className="px-4 py-2 rounded-full bg-white text-sm font-medium">
            COOUFOINS
          </button>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="px-6 pt-6 pb-6 grid grid-cols-3 gap-3">
        {features.map((feature, index) => {
          if (feature.external) {
            return (
              <a
                key={index}
                href={feature.path}
                target="_blank"
                rel="noopener noreferrer"
                className={`group ${feature.color} rounded-[1.75rem] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all duration-200 min-h-[130px] relative shadow-sm`}
              >
                <div className="absolute top-3 right-3 w-4 h-4 rounded-full" style={{ backgroundColor: feature.dotColor }} />
                <div className="text-4xl mb-1">{feature.icon}</div>
                <div className="text-center">
                  <h3 className="font-bold text-sm mb-0.5 leading-tight">{feature.label}</h3>
                  <p className="text-[9px] text-foreground/50 uppercase tracking-wide font-medium">{feature.description}</p>
                </div>
              </a>
            );
          }
          
          return (
            <div
              key={index}
              onClick={() => navigate(feature.path)}
              className={`group ${feature.color} rounded-[1.75rem] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all duration-200 min-h-[130px] relative shadow-sm`}
            >
              <div className="absolute top-3 right-3 w-4 h-4 rounded-full" style={{ backgroundColor: feature.dotColor }} />
              <div className="text-4xl mb-1">{feature.icon}</div>
              <div className="text-center">
                <h3 className="font-bold text-sm mb-0.5 leading-tight">{feature.label}</h3>
                <p className="text-[9px] text-foreground/50 uppercase tracking-wide font-medium">{feature.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* My Pets Section */}
      {pets.length > 0 && (
        <div className="px-6 pt-8 pb-6">
          <h2 className="text-xl font-bold font-jakarta mb-4">My Pets</h2>
          <div className="grid grid-cols-1 gap-4">
            {pets.map((pet) => (
              <Card key={pet.id} className="p-4 bg-white border-2 border-gray-200 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <Avatar className="w-16 h-16 border-2 border-[#FBD66A]/30">
                      <AvatarImage src={pet.avatar_url || undefined} />
                      <AvatarFallback className="bg-[#FBD66A]/20 text-gray-900 font-bold text-lg font-jakarta">
                        {pet.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="icon"
                      onClick={() => fileInputRefs.current[pet.id]?.click()}
                      disabled={redetectingPetId === pet.id}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900 shadow-md"
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
                          <span className={`text-xs font-semibold font-jakarta px-2 py-0.5 rounded-full ${
                            pet.breed_confidence > 80 ? 'bg-green-100 text-green-700' :
                            pet.breed_confidence > 60 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {pet.breed_confidence}% AI
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
                    className="self-center rounded-xl border-2 border-gray-200 hover:border-[#FBD66A] hover:bg-[#FBD66A]/5 text-gray-700 hover:text-gray-900"
                  >
                    <History className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Home;
