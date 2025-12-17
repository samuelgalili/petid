import { useState, useEffect } from "react";
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
import { Heart, Search, Calendar, Ruler, Syringe, Scissors, Info, X, Share2, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";

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
    
    // Try Web Share API first (mobile)
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
    
    // Fallback to clipboard
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
      
      <div className="min-h-screen bg-[#F6F6F6] pb-28 px-4">
        <div className="max-w-lg mx-auto pt-3">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-4 py-5 px-4 rounded-2xl bg-gradient-to-br from-pink-50 via-purple-50 to-orange-50 shadow-sm"
          >
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-[2px] shadow-lg shadow-pink-200/50">
              <div className="w-full h-full rounded-[12px] bg-white flex items-center justify-center">
                <Heart className="w-6 h-6 text-[#DD2A7B]" fill="#DD2A7B" />
              </div>
            </div>
            <h2 className="text-base font-bold text-gray-800 mb-1">
              תן בית חם לחבר חדש
            </h2>
            <p className="text-gray-500 text-xs">
              חיות מחמד מחכות למשפחה אוהבת
            </p>
          </motion.div>

          {/* Search & Filters - Compact */}
          <div className="mb-4 space-y-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חיפוש לפי שם או גזע..."
                className="h-10 pr-10 border-0 bg-white rounded-xl text-sm shadow-sm placeholder:text-gray-400"
                dir="rtl"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 flex-1 border-0 rounded-lg bg-white text-xs shadow-sm">
                  <SelectValue placeholder="סוג" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסוגים</SelectItem>
                  <SelectItem value="כלב">🐕 כלבים</SelectItem>
                  <SelectItem value="חתול">🐱 חתולים</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sizeFilter} onValueChange={setSizeFilter}>
                <SelectTrigger className="h-9 flex-1 border-0 rounded-lg bg-white text-xs shadow-sm">
                  <SelectValue placeholder="גודל" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הגדלים</SelectItem>
                  <SelectItem value="קטן">קטן</SelectItem>
                  <SelectItem value="בינוני">בינוני</SelectItem>
                  <SelectItem value="גדול">גדול</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results Count */}
          {filteredPets.length > 0 && (
            <div className="flex items-center justify-between px-1 mb-3">
              <span className="text-xs font-medium text-gray-600">{filteredPets.length} חיות מחכות לאימוץ</span>
            </div>
          )}

          {/* Pets Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <AnimatePresence>
              {filteredPets.map((pet, index) => (
                <motion.div
                  key={pet.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                    {/* Image */}
                    <div className="aspect-square overflow-hidden bg-gray-100 relative">
                      <img
                        src={pet.image_url || "/placeholder.svg"}
                        alt={pet.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      
                      {/* Type Badge */}
                      <div className="absolute top-2 right-2">
                        <span className="text-lg">{pet.type === 'כלב' ? '🐕' : '🐱'}</span>
                      </div>
                      
                      {/* Name overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-2.5">
                        <h3 className="text-sm font-bold text-white drop-shadow-md">{pet.name}</h3>
                        <p className="text-[10px] text-white/90 drop-shadow-md">{pet.breed || pet.type}</p>
                      </div>
                    </div>
                    
                    <div className="p-2.5">
                      {/* Info */}
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-2">
                        <span>{getAgeString(pet.age_years, pet.age_months)}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span>{pet.size}</span>
                        {pet.gender && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            <span>{pet.gender}</span>
                          </>
                        )}
                      </div>

                      {/* Status Badges */}
                      <div className="flex gap-1 mb-2.5 flex-wrap">
                        {pet.is_vaccinated && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">
                            מחוסן ✓
                          </span>
                        )}
                        {pet.is_neutered && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                            מסורס ✓
                          </span>
                        )}
                      </div>

                      {/* Details Button */}
                      <Button
                        onClick={() => handlePetClick(pet)}
                        className="w-full h-8 bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-90 text-white rounded-lg text-xs font-semibold shadow-sm"
                      >
                        <Info className="w-3 h-3 ml-1" />
                        לפרטים נוספים
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Empty State */}
          {filteredPets.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 px-4"
            >
              <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mx-auto mb-3">
                <Heart className="w-7 h-7 text-gray-300" />
              </div>
              <h3 className="text-base font-bold text-gray-800 mb-1">לא נמצאו חיות מחמד</h3>
              <p className="text-gray-500 text-xs">נסה לשנות את הפילטרים</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Pet Details Dialog */}
      <Dialog open={showPetDetails} onOpenChange={setShowPetDetails}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 border-0 rounded-2xl bg-white">
          {selectedPet && (
            <>
              {/* Pet Image */}
              <div className="relative aspect-[4/3] overflow-hidden">
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
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <Calendar className="w-4 h-4 mx-auto mb-1 text-[#DD2A7B]" />
                    <p className="text-[10px] text-gray-500">גיל</p>
                    <p className="text-xs font-semibold text-gray-800">{getAgeString(selectedPet.age_years, selectedPet.age_months)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <Ruler className="w-4 h-4 mx-auto mb-1 text-[#8134AF]" />
                    <p className="text-[10px] text-gray-500">גודל</p>
                    <p className="text-xs font-semibold text-gray-800">{selectedPet.size}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <Heart className="w-4 h-4 mx-auto mb-1 text-[#F58529]" />
                    <p className="text-[10px] text-gray-500">מין</p>
                    <p className="text-xs font-semibold text-gray-800">{selectedPet.gender || 'לא ידוע'}</p>
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

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleProceedToAdopt}
                    className="flex-1 h-11 bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-90 text-white rounded-xl text-sm font-bold shadow-lg"
                  >
                    <Heart className="w-4 h-4 ml-2" fill="white" />
                    אמץ את {selectedPet.name}
                  </Button>
                  <Button
                    onClick={() => handleSharePet(selectedPet)}
                    variant="outline"
                    className="h-11 w-11 rounded-xl border-gray-200 hover:bg-gray-50 flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Share2 className="w-5 h-5 text-gray-600" />
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
          <div className="bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-4 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" fill="white" />
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
            <div className="flex gap-2 pt-2 sticky bottom-0 bg-white pb-1">
              <Button
                type="submit"
                className="flex-1 h-10 bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-90 text-white rounded-lg text-sm font-semibold"
              >
                שלח בקשה
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdoptionForm(false)}
                className="flex-1 h-10 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-sm"
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
