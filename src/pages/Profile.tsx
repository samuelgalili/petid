import { useState, useEffect, useCallback } from "react";
import { PageTransition } from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import { 
  ChevronRight,
  Plus,
  Settings,
  Edit3
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
import { PetRecommendationsInline } from "@/components/profile/PetRecommendationsInline";

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

  // Handle pet selection
  const handlePetSelect = (petId: string) => {
    setSelectedPetId(petId);
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
        <div className="flex-1 overflow-y-auto pb-[70px]">
          {/* Clean Header */}
          <motion.div 
            className="flex items-center justify-between px-4 h-14 bg-background"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -mr-2"
            >
              <ChevronRight className="w-6 h-6 text-foreground" />
            </button>
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

          {/* Centered Profile Section */}
          <motion.div 
            className="flex flex-col items-center px-5 pt-2 pb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Profile Picture with Ring */}
            <motion.div 
              className="relative mb-4"
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsImageEditorOpen(true)}
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
            <h1 className="text-xl font-bold text-foreground mb-1">
              {profile?.full_name || "משתמש"}
            </h1>
            {profile?.bio && (
              <p className="text-sm text-muted-foreground text-center max-w-[250px]">
                {profile.bio}
              </p>
            )}
          </motion.div>

          {/* Pet Selection - Clean Carousel */}
          <motion.div 
            className="px-5 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-muted/30 rounded-2xl p-4">
              <div className="flex justify-center gap-5 overflow-x-auto scrollbar-hide">
                {/* Pet Items */}
                {pets.map((pet, index) => {
                  const isSelected = selectedPetId === pet.id;
                  return (
                    <motion.button 
                      key={pet.id}
                      className="flex flex-col items-center gap-2 min-w-[70px]"
                      onClick={() => handlePetSelect(pet.id)}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className={`w-16 h-16 rounded-full p-[2.5px] transition-all ${
                        isSelected 
                          ? 'bg-gradient-to-br from-primary via-primary/80 to-primary/60' 
                          : 'bg-muted'
                      }`}>
                        <div className="w-full h-full rounded-full bg-background p-[1.5px]">
                          <div className="w-full h-full rounded-full overflow-hidden bg-muted">
                            {pet.avatar_url ? (
                              <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                {pet.type === 'dog' ? (
                                  <img src={dogIcon} alt="dog" className="w-8 h-8" />
                                ) : (
                                  <img src={catIcon} alt="cat" className="w-8 h-8" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <span className={`text-xs font-medium block ${
                          isSelected ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {pet.name}
                        </span>
                        {pet.age_years !== undefined && (
                          <span className="text-[10px] text-muted-foreground">
                            {pet.age_years} yrs
                          </span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}

                {/* Add New Pet */}
                <motion.button 
                  className="flex flex-col items-center gap-2 min-w-[70px]"
                  onClick={() => navigate('/add-pet')}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/20">
                    <Plus className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">+ Add Pet</span>
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Pet Recommendations - Inline Section */}
          {selectedPet && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <PetRecommendationsInline 
                selectedPet={selectedPet} 
                points={profile?.points || 70}
              />
            </motion.div>
          )}
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

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Profile;
