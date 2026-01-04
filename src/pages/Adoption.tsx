import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Search, Calendar, Ruler, Syringe, Scissors, Info, X, Share2, Copy, Check, MessageCircle, Bookmark, MoreHorizontal, Send, MapPin, Phone, Mail, Globe, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import catDogSilhouette from "@/assets/adoption/cat-dog-silhouette.png";

interface AdoptionPet {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  age_years: number | null;
  age_months: number | null;
  gender: string | null;
  size: string;
  description: string | null;
  special_needs: string | null;
  is_vaccinated: boolean;
  is_neutered: boolean;
  image_url: string | null;
  status: string;
  organization_name: string | null;
  organization_phone: string | null;
  organization_email: string | null;
  organization_address: string | null;
  organization_city: string | null;
  organization_logo_url: string | null;
  organization_website: string | null;
}

const Adoption = () => {
  const [pets, setPets] = useState<AdoptionPet[]>([]);
  const [filteredPets, setFilteredPets] = useState<AdoptionPet[]>([]);
  const [selectedPet, setSelectedPet] = useState<AdoptionPet | null>(null);
  const [showPetDetails, setShowPetDetails] = useState(false);
  const [showAdoptionForm, setShowAdoptionForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [copied, setCopied] = useState(false);
  const [likedPets, setLikedPets] = useState<Set<string>>(new Set());
  const [savedPets, setSavedPets] = useState<Set<string>>(new Set());
  const [showHeartAnimation, setShowHeartAnimation] = useState<string | null>(null);
  const lastTapRef = useRef<{ [key: string]: number }>({});
  const { toast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    hasExperience: false,
    experienceDetails: "",
    hasOtherPets: false,
    otherPetsDetails: "",
    reason: "",
  });

  useEffect(() => {
    fetchPets();
  }, []);

  useEffect(() => {
    filterPets();
  }, [pets, searchQuery, typeFilter, sizeFilter]);

  const fetchPets = async () => {
    try {
      const { data, error } = await supabase
        .from("adoption_pets")
        .select("*")
        .eq("status", "available")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPets(data || []);
    } catch (error) {
      console.error("Error fetching pets:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את רשימת החיות",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterPets = () => {
    let filtered = pets;

    if (searchQuery) {
      filtered = filtered.filter(
        (pet) =>
          pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pet.breed?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((pet) => pet.type === typeFilter);
    }

    if (sizeFilter !== "all") {
      filtered = filtered.filter((pet) => pet.size === sizeFilter);
    }

    setFilteredPets(filtered);
  };

  const handleDoubleTap = (petId: string) => {
    const now = Date.now();
    const lastTap = lastTapRef.current[petId] || 0;
    
    if (now - lastTap < 300) {
      // Double tap detected
      handleLike(petId);
      setShowHeartAnimation(petId);
      setTimeout(() => setShowHeartAnimation(null), 1000);
    }
    
    lastTapRef.current[petId] = now;
  };

  const handleLike = (petId: string) => {
    setLikedPets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(petId)) {
        newSet.delete(petId);
      } else {
        newSet.add(petId);
      }
      return newSet;
    });
  };

  const handleSave = (petId: string) => {
    setSavedPets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(petId)) {
        newSet.delete(petId);
        toast({ title: "הוסר מהשמורים" });
      } else {
        newSet.add(petId);
        toast({ title: "נשמר בהצלחה! 🐾" });
      }
      return newSet;
    });
  };

  const handlePetClick = (pet: AdoptionPet) => {
    setSelectedPet(pet);
    setShowPetDetails(true);
  };

  const handleProceedToAdopt = () => {
    if (!user) {
      toast({
        title: "נדרש התחברות",
        description: "עליך להתחבר כדי לאמץ חיית מחמד",
        variant: "destructive",
      });
      return;
    }
    setShowPetDetails(false);
    setShowAdoptionForm(true);
  };

  const handleSharePet = async (pet: AdoptionPet) => {
    const shareUrl = `${window.location.origin}/adoption?pet=${pet.id}`;
    const shareText = `מכירים מישהו שמחפש חבר חדש? ${pet.name} מחכה לבית חם! 🐾`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${pet.name} מחפש בית`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or error - fall through to copy
      }
    }
    
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      toast({
        title: "הקישור הועתק!",
        description: "עכשיו אפשר לשתף עם חברים",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "שגיאה",
        description: "לא ניתן להעתיק את הקישור",
        variant: "destructive",
      });
    }
  };

  const handleSubmitAdoption = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPet || !user) return;

    try {
      const { error } = await supabase.from("adoption_requests").insert({
        user_id: user.id,
        pet_id: selectedPet.id,
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        has_experience: formData.hasExperience,
        experience_details: formData.experienceDetails || null,
        has_other_pets: formData.hasOtherPets,
        other_pets_details: formData.otherPetsDetails || null,
        reason: formData.reason,
      });

      if (error) throw error;

      toast({
        title: "✅ בקשה נשלחה בהצלחה!",
        description: "נחזור אליך בהקדם עם עדכון על בקשת האימוץ",
      });

      setShowAdoptionForm(false);
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        address: "",
        hasExperience: false,
        experienceDetails: "",
        hasOtherPets: false,
        otherPetsDetails: "",
        reason: "",
      });
    } catch (error) {
      console.error("Error submitting adoption:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשלוח את הבקשה. נסה שוב מאוחר יותר.",
        variant: "destructive",
      });
    }
  };

  const getAgeString = (years: number | null, months: number | null) => {
    if (!years && !months) return "לא ידוע";
    const parts = [];
    if (years) parts.push(`${years} שנ${years === 1 ? "ה" : "ים"}`);
    if (months) parts.push(`${months} חודש${months === 1 ? "" : "ים"}`);
    return parts.join(" ו");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-24 pt-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-jakarta">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppHeader 
        title="אימוץ" 
        showBackButton={true}
        showMenuButton={false}
      />
      
      <div className="min-h-screen bg-background pb-28">
        <div className="max-w-lg mx-auto">
          {/* Pet Type Filter - Dog & Cat Image */}
          <div className="px-4 py-6 border-b border-border/50">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative flex justify-center"
            >
              <div className="relative">
                {/* Floating Hearts Animation */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                  <motion.span
                    animate={{ 
                      y: [0, -8, 0],
                      rotate: [-5, 5, -5]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="text-lg"
                  >
                    💛
                  </motion.span>
                  <motion.span
                    animate={{ 
                      y: [0, -10, 0],
                      rotate: [5, -5, 5]
                    }}
                    transition={{ 
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.3
                    }}
                    className="text-xl"
                  >
                    💛
                  </motion.span>
                  <motion.span
                    animate={{ 
                      y: [0, -6, 0],
                      rotate: [-3, 3, -3]
                    }}
                    transition={{ 
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.6
                    }}
                    className="text-base"
                  >
                    💛
                  </motion.span>
                </div>

                <img 
                  src={catDogSilhouette} 
                  alt="בחר כלב או חתול" 
                  className="h-24 object-contain [&_*]:fill-transparent"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                />
                
                {/* Clickable areas for dog and cat */}
                <button
                  onClick={() => {
                    if (typeFilter === "כלב") {
                      setTypeFilter("all");
                    } else {
                      setTypeFilter("כלב");
                      setSizeFilter("all");
                    }
                  }}
                  className={`absolute left-0 top-0 w-1/2 h-full rounded-l-2xl transition-all ${
                    typeFilter === "כלב" 
                      ? "bg-primary/20 ring-2 ring-primary ring-offset-2" 
                      : "hover:bg-primary/10"
                  }`}
                  aria-label="סנן לכלבים"
                />
                <button
                  onClick={() => {
                    if (typeFilter === "חתול") {
                      setTypeFilter("all");
                    } else {
                      setTypeFilter("חתול");
                      setSizeFilter("all");
                    }
                  }}
                  className={`absolute right-0 top-0 w-1/2 h-full rounded-r-2xl transition-all ${
                    typeFilter === "חתול" 
                      ? "bg-accent/20 ring-2 ring-accent ring-offset-2" 
                      : "hover:bg-accent/10"
                  }`}
                  aria-label="סנן לחתולים"
                />
              </div>
            </motion.div>
            
            {/* Filter Labels */}
            <div className="flex justify-center gap-8 mt-3">
              <span className={`text-sm font-medium transition-colors ${
                typeFilter === "כלב" ? "text-primary" : "text-muted-foreground"
              }`}>
                כלבים 🐕
              </span>
              <span className={`text-sm font-medium transition-colors ${
                typeFilter === "חתול" ? "text-accent" : "text-muted-foreground"
              }`}>
                חתולים 🐱
              </span>
            </div>
            
            {/* Active Filter Indicator */}
            {typeFilter !== "all" && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex justify-center mt-3"
              >
                <button
                  onClick={() => setTypeFilter("all")}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary"
                >
                  מציג: {typeFilter === "כלב" ? "כלבים" : "חתולים"} • לחץ להצגת הכל
                </button>
              </motion.div>
            )}
          </div>

          {/* Search Bar - Instagram Style */}
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חיפוש..."
                className="h-9 pr-10 border-0 bg-muted rounded-lg text-sm placeholder:text-muted-foreground"
                dir="rtl"
              />
            </div>
          </div>

          {/* Instagram-style Feed */}
          <div className="divide-y divide-border/50">
            <AnimatePresence>
              {filteredPets.map((pet, index) => (
                <motion.article
                  key={pet.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-card"
                >
                  {/* Post Header - with organization info */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-br from-primary via-accent to-secondary">
                        <div className="w-full h-full rounded-full bg-card p-[1px]">
                          <img
                            src={pet.organization_logo_url || pet.image_url || "/placeholder.svg"}
                            alt={pet.organization_name || pet.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{pet.organization_name || "עמותת אימוץ"}</p>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <p className="text-[11px] text-muted-foreground">{pet.organization_city || "ישראל"}</p>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handlePetClick(pet)}
                      className="p-2 hover:bg-muted/50 rounded-full transition-colors"
                    >
                      <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Post Image with Double Tap */}
                  <div 
                    className="relative aspect-square bg-muted cursor-pointer"
                    onClick={() => handleDoubleTap(pet.id)}
                  >
                    <img
                      src={pet.image_url || "/placeholder.svg"}
                      alt={pet.name}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Double Tap Heart Animation */}
                    <AnimatePresence>
                      {showHeartAnimation === pet.id && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        >
                          <Heart className="w-24 h-24 text-white fill-white drop-shadow-lg" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Status Badges */}
                    <div className="absolute top-3 right-3 flex flex-col gap-1">
                      {pet.is_vaccinated && (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm text-green-600 font-medium shadow-sm">
                          מחוסן ✓
                        </span>
                      )}
                      {pet.is_neutered && (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm text-blue-600 font-medium shadow-sm">
                          מסורס ✓
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Instagram Action Bar */}
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-4">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleLike(pet.id)}
                          className="p-0"
                        >
                          <Heart 
                          className={`w-6 h-6 transition-colors ${
                            likedPets.has(pet.id) 
                              ? "text-error fill-error" 
                              : "text-foreground"
                          }`}
                          />
                        </motion.button>
                        <button onClick={() => handlePetClick(pet)}>
                          <MessageCircle className="w-6 h-6 text-foreground" />
                        </button>
                        <button onClick={() => handleSharePet(pet)}>
                          <Send className="w-6 h-6 text-foreground -rotate-45" />
                        </button>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleSave(pet.id)}
                      >
                        <Bookmark 
                          className={`w-6 h-6 transition-colors ${
                            savedPets.has(pet.id) 
                              ? "text-foreground fill-foreground" 
                              : "text-foreground"
                          }`} 
                        />
                      </motion.button>
                    </div>

                    {/* Likes Count */}
                    {likedPets.has(pet.id) && (
                      <p className="text-sm font-semibold text-foreground mb-1">אהבת את זה</p>
                    )}

                    {/* Pet Name & Info Card */}
                    <div className="bg-gradient-to-l from-primary/5 to-accent/5 rounded-xl p-3 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{pet.type === 'כלב' ? '🐕' : '🐱'}</span>
                          <span className="text-base font-bold text-foreground">{pet.name}</span>
                          {pet.breed && (
                            <span className="text-xs text-muted-foreground">• {pet.breed}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                          {getAgeString(pet.age_years, pet.age_months)}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                          {pet.size}
                        </span>
                        {pet.gender && (
                          <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                            {pet.gender}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Caption */}
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {pet.description || `מחפש בית חם ואוהב! 🏠💕`}
                    </p>

                    {/* Organization Contact Quick Info */}
                    {pet.organization_phone && (
                      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        <span>{pet.organization_phone}</span>
                      </div>
                    )}

                    {/* View Details Link */}
                    <button 
                      onClick={() => handlePetClick(pet)}
                      className="text-sm text-primary font-medium mb-3"
                    >
                      לצפייה בפרטים מלאים ←
                    </button>

                    {/* Adopt Button */}
                    <Button
                      onClick={() => handlePetClick(pet)}
                      className="w-full h-11 text-white rounded-xl text-sm font-bold shadow-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                    >
                      <Heart className="w-4 h-4 ml-2" fill="white" />
                      רוצה לאמץ את {pet.name}
                    </Button>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>

          {/* Empty State */}
          {filteredPets.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 px-6"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-12 h-12 text-primary/40" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">לא נמצאו חיות מחמד</h3>
              <p className="text-muted-foreground text-sm mb-6">נסה לשנות את הפילטרים או לחפש משהו אחר</p>
              <Button
                onClick={() => { setTypeFilter("all"); setSizeFilter("all"); setSearchQuery(""); }}
                variant="outline"
                className="rounded-xl"
              >
                נקה חיפוש
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Pet Details Dialog - Instagram Style */}
      <Dialog open={showPetDetails} onOpenChange={setShowPetDetails}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 border-0 rounded-2xl bg-card">
          {selectedPet && (
            <>
              {/* Pet Image */}
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={selectedPet.image_url || "/placeholder.svg"}
                  alt={selectedPet.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Close Button */}
                <button
                  onClick={() => setShowPetDetails(false)}
                  className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                
                {/* Pet Name Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{selectedPet.type === 'כלב' ? '🐕' : '🐱'}</span>
                    <h2 className="text-xl font-bold text-white">{selectedPet.name}</h2>
                  </div>
                  <p className="text-white/80 text-sm">{selectedPet.breed || selectedPet.type}</p>
                </div>
              </div>

              {/* Pet Info */}
              <div className="p-4 space-y-4" dir="rtl">
                {/* Quick Info Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-secondary rounded-xl p-3 text-center">
                    <Calendar className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <p className="text-[10px] text-muted-foreground">גיל</p>
                    <p className="text-xs font-semibold text-foreground">{getAgeString(selectedPet.age_years, selectedPet.age_months)}</p>
                  </div>
                  <div className="bg-secondary rounded-xl p-3 text-center">
                    <Ruler className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <p className="text-[10px] text-muted-foreground">גודל</p>
                    <p className="text-xs font-semibold text-foreground">{selectedPet.size}</p>
                  </div>
                  <div className="bg-secondary rounded-xl p-3 text-center">
                    <Heart className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <p className="text-[10px] text-muted-foreground">מין</p>
                    <p className="text-xs font-semibold text-foreground">{selectedPet.gender || "לא ידוע"}</p>
                  </div>
                </div>

                {/* Health Status */}
                <div className="flex gap-2">
                  <div className={`flex-1 flex items-center gap-2 p-3 rounded-xl ${selectedPet.is_vaccinated ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <Syringe className={`w-4 h-4 ${selectedPet.is_vaccinated ? 'text-green-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-xs font-medium text-gray-800">חיסונים</p>
                      <p className={`text-[10px] ${selectedPet.is_vaccinated ? 'text-green-600' : 'text-gray-500'}`}>
                        {selectedPet.is_vaccinated ? 'מחוסן ✓' : 'לא מחוסן'}
                      </p>
                    </div>
                  </div>
                  <div className={`flex-1 flex items-center gap-2 p-3 rounded-xl ${selectedPet.is_neutered ? 'bg-blue-50' : 'bg-gray-50'}`}>
                    <Scissors className={`w-4 h-4 ${selectedPet.is_neutered ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-xs font-medium text-gray-800">עיקור/סירוס</p>
                      <p className={`text-[10px] ${selectedPet.is_neutered ? 'text-blue-600' : 'text-gray-500'}`}>
                        {selectedPet.is_neutered ? 'מסורס ✓' : 'לא מסורס'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedPet.description && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <h3 className="text-xs font-semibold text-gray-700 mb-2">קצת עליי</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{selectedPet.description}</p>
                  </div>
                )}

                {/* Special Needs */}
                {selectedPet.special_needs && (
                  <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                    <h3 className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      צרכים מיוחדים
                    </h3>
                    <p className="text-sm text-amber-700">{selectedPet.special_needs}</p>
                  </div>
                )}

                {/* Organization Info Card */}
                {selectedPet.organization_name && (
                  <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-4 border border-primary/10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        {selectedPet.organization_logo_url ? (
                          <img 
                            src={selectedPet.organization_logo_url} 
                            alt={selectedPet.organization_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <Building2 className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{selectedPet.organization_name}</h3>
                        {selectedPet.organization_city && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {selectedPet.organization_city}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {selectedPet.organization_phone && (
                        <a 
                          href={`tel:${selectedPet.organization_phone}`}
                          className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                        >
                          <Phone className="w-4 h-4 text-primary" />
                          <span>{selectedPet.organization_phone}</span>
                        </a>
                      )}
                      {selectedPet.organization_email && (
                        <a 
                          href={`mailto:${selectedPet.organization_email}`}
                          className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                        >
                          <Mail className="w-4 h-4 text-primary" />
                          <span>{selectedPet.organization_email}</span>
                        </a>
                      )}
                      {selectedPet.organization_address && (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span>{selectedPet.organization_address}</span>
                        </p>
                      )}
                      {selectedPet.organization_website && (
                        <a 
                          href={selectedPet.organization_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <Globe className="w-4 h-4" />
                          <span>אתר העמותה</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleProceedToAdopt}
                    className="flex-1 h-12 text-white rounded-xl text-sm font-bold shadow-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                  >
                    <Heart className="w-4 h-4 ml-2" fill="white" />
                    אמץ את {selectedPet.name}
                  </Button>
                  {selectedPet.organization_phone && (
                    <a
                      href={`tel:${selectedPet.organization_phone}`}
                      className="h-12 w-12 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 flex items-center justify-center flex-shrink-0 transition-colors"
                    >
                      <Phone className="w-5 h-5 text-primary" />
                    </a>
                  )}
                  <Button
                    onClick={() => handleSharePet(selectedPet)}
                    variant="outline"
                    className="h-12 w-12 rounded-xl border-border hover:bg-secondary flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Share2 className="w-5 h-5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Adoption Form Dialog */}
      <Dialog open={showAdoptionForm} onOpenChange={setShowAdoptionForm}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-0 border-0 rounded-2xl bg-white">
          {/* Header */}
          <div className="p-4 sticky top-0 z-10" style={{ background: 'linear-gradient(135deg, #1E5799, #4ECDC4)' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" fill="currentColor" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base">בקשת אימוץ</h2>
                <p className="text-white/80 text-xs">{selectedPet?.name}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitAdoption} className="p-4 space-y-4" dir="rtl">
            {/* Personal Info */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">פרטים אישיים</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600 mb-1.5 block">שם מלא *</Label>
                  <Input
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="h-10 text-sm border-gray-200 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 mb-1.5 block">טלפון *</Label>
                  <Input
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-10 text-sm border-gray-200 rounded-lg bg-gray-50"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1.5 block">אימייל *</Label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-10 text-sm border-gray-200 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1.5 block">כתובת *</Label>
                <Input
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="h-10 text-sm border-gray-200 rounded-lg bg-gray-50"
                />
              </div>
            </div>

            {/* Experience */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">ניסיון</h3>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Checkbox
                  id="hasExperience"
                  checked={formData.hasExperience}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasExperience: checked as boolean })}
                  className="border-gray-300 data-[state=checked]:bg-[#DD2A7B] data-[state=checked]:border-[#DD2A7B]"
                />
                <Label htmlFor="hasExperience" className="text-sm text-gray-700 cursor-pointer">
                  יש לי ניסיון בגידול חיות מחמד
                </Label>
              </div>
              {formData.hasExperience && (
                <Textarea
                  placeholder="פרט על הניסיון שלך..."
                  value={formData.experienceDetails}
                  onChange={(e) => setFormData({ ...formData, experienceDetails: e.target.value })}
                  className="text-sm border-gray-200 rounded-lg bg-gray-50 min-h-[60px] resize-none"
                />
              )}
              
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Checkbox
                  id="hasOtherPets"
                  checked={formData.hasOtherPets}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasOtherPets: checked as boolean })}
                  className="border-gray-300 data-[state=checked]:bg-[#DD2A7B] data-[state=checked]:border-[#DD2A7B]"
                />
                <Label htmlFor="hasOtherPets" className="text-sm text-gray-700 cursor-pointer">
                  יש לי חיות מחמד נוספות
                </Label>
              </div>
              {formData.hasOtherPets && (
                <Textarea
                  placeholder="פרט על חיות המחמד שלך..."
                  value={formData.otherPetsDetails}
                  onChange={(e) => setFormData({ ...formData, otherPetsDetails: e.target.value })}
                  className="text-sm border-gray-200 rounded-lg bg-gray-50 min-h-[60px] resize-none"
                />
              )}
            </div>

            {/* Reason */}
            <div className="space-y-2 pt-2">
              <Label className="text-xs text-gray-600">למה אתה רוצה לאמץ את {selectedPet?.name}? *</Label>
              <Textarea
                required
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="text-sm border-gray-200 rounded-lg bg-gray-50 min-h-[80px] resize-none"
                placeholder="ספר לנו..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 sticky bottom-0 bg-card pb-1">
              <Button
                type="submit"
                className="flex-1 h-10 text-white rounded-xl text-sm font-bold shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1E5799, #4ECDC4)' }}
              >
                שלח בקשה
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdoptionForm(false)}
                className="flex-1 h-10 border-border text-muted-foreground hover:bg-secondary rounded-lg text-sm"
              >
                ביטול
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </>
  );
};

export default Adoption;
