import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Heart, Search, Filter, Check, X } from "lucide-react";
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
  const [showAdoptionForm, setShowAdoptionForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");
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

  const handleAdoptClick = (pet: AdoptionPet) => {
    if (!user) {
      toast({
        title: "נדרש התחברות",
        description: "עליך להתחבר כדי לאמץ חיית מחמד",
        variant: "destructive",
      });
      return;
    }
    setSelectedPet(pet);
    setShowAdoptionForm(true);
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
      
      <div className="min-h-screen bg-[#FAFAFA] pb-24 px-4 dir-rtl">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section with Instagram gradient */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6 mt-2 py-4 rounded-2xl bg-gradient-to-r from-[#F58529]/10 via-[#DD2A7B]/10 to-[#8134AF]/10"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Heart className="w-5 h-5 text-[#ED4956]" strokeWidth={1.5} fill="#ED4956" />
              <h2 className="text-lg font-bold bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] bg-clip-text text-transparent">
                תן בית חם לחבר חדש
              </h2>
              <Heart className="w-5 h-5 text-[#ED4956]" strokeWidth={1.5} fill="#ED4956" />
            </div>
            <p className="text-[#8E8E8E] text-sm font-jakarta">
              חיות מחמד מחכות למשפחה אוהבת
            </p>
          </motion.div>

        {/* Search and Filters - Instagram style */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#8E8E8E] w-5 h-5" strokeWidth={1.5} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חיפוש לפי שם או גזע..."
                  className="pr-10 border-0 bg-[#EFEFEF] rounded-xl text-[#262626] placeholder:text-[#8E8E8E] focus-visible:ring-2 focus-visible:ring-[#0095F6]"
                  dir="rtl"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="border-0 rounded-xl bg-[#EFEFEF] text-[#262626]">
                <SelectValue placeholder="סוג חיה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסוגים</SelectItem>
                <SelectItem value="כלב">🐕 כלבים</SelectItem>
                <SelectItem value="חתול">🐱 חתולים</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sizeFilter} onValueChange={setSizeFilter}>
              <SelectTrigger className="border-0 rounded-xl bg-[#EFEFEF] text-[#262626]">
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

        {/* Pets Grid - Instagram style cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          <AnimatePresence>
            {filteredPets.map((pet) => (
              <motion.div
                key={pet.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  {/* Image with gradient overlay */}
                  <div className="aspect-square overflow-hidden bg-[#FAFAFA] relative">
                    <img
                      src={pet.image_url || "/placeholder.svg"}
                      alt={pet.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent h-16" />
                    {/* Heart icon */}
                    <div className="absolute top-2 right-2">
                      <div className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-sm">
                        <Heart className="w-4 h-4 text-[#ED4956]" strokeWidth={1.5} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-sm font-bold text-[#262626] font-jakarta">{pet.name}</h3>
                        <p className="text-xs text-[#8E8E8E]">{pet.breed || pet.type}</p>
                      </div>
                    </div>

                    <div className="space-y-1 mb-3 text-xs">
                      <div className="flex items-center gap-1 text-[#8E8E8E]">
                        <span>{getAgeString(pet.age_years, pet.age_months)}</span>
                        <span>•</span>
                        <span>{pet.size}</span>
                      </div>
                    </div>

                    <div className="flex gap-1 mb-3 flex-wrap">
                      {pet.is_vaccinated && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00C853]/10 text-[#00C853] font-medium">
                          ✓ מחוסן
                        </span>
                      )}
                      {pet.is_neutered && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00C853]/10 text-[#00C853] font-medium">
                          ✓ מסורס
                        </span>
                      )}
                    </div>

                    {/* Instagram gradient button */}
                    <Button
                      onClick={() => handleAdoptClick(pet)}
                      className="w-full bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-90 text-white rounded-xl text-xs py-2 h-9 font-semibold shadow-md"
                    >
                      <Heart className="w-3.5 h-3.5 ml-1" strokeWidth={1.5} />
                      אמץ אותי
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredPets.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-[#8E8E8E] text-sm font-jakarta">לא נמצאו חיות מחמד התואמות לחיפוש</p>
          </motion.div>
        )}
        </div>
      </div>

      {/* Adoption Form Dialog */}
      <Dialog open={showAdoptionForm} onOpenChange={setShowAdoptionForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dir-rtl bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#262626] font-jakarta">
              בקשת אימוץ - {selectedPet?.name}
            </DialogTitle>
            <DialogDescription className="text-[#8E8E8E]">
              מלא את הפרטים הבאים כדי להגיש בקשה לאימוץ
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAdoption} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName" className="text-[#262626] text-sm">
                  שם מלא *
                </Label>
                <Input
                  id="fullName"
                  required
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="border-gray-200 focus:border-[#0095F6] bg-[#FAFAFA]"
                  dir="rtl"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-[#262626] text-sm">
                  אימייל *
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="border-gray-200 focus:border-[#0095F6] bg-[#FAFAFA]"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone" className="text-[#262626] text-sm">
                  טלפון *
                </Label>
                <Input
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="border-gray-200 focus:border-[#0095F6] bg-[#FAFAFA]"
                  dir="rtl"
                />
              </div>
              <div>
                <Label htmlFor="address" className="text-[#262626] text-sm">
                  כתובת *
                </Label>
                <Input
                  id="address"
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="border-gray-200 focus:border-[#0095F6] bg-[#FAFAFA]"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasExperience"
                  checked={formData.hasExperience}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, hasExperience: checked as boolean })
                  }
                  className="border-gray-300 data-[state=checked]:bg-[#0095F6] data-[state=checked]:border-[#0095F6]"
                />
                <Label htmlFor="hasExperience" className="text-[#262626] text-sm cursor-pointer">
                  יש לי ניסיון קודם בגידול חיות מחמד
                </Label>
              </div>

              {formData.hasExperience && (
                <div>
                  <Label htmlFor="experienceDetails" className="text-[#262626] text-sm">
                    פרט על הניסיון שלך
                  </Label>
                  <Textarea
                    id="experienceDetails"
                    value={formData.experienceDetails}
                    onChange={(e) =>
                      setFormData({ ...formData, experienceDetails: e.target.value })
                    }
                    className="border-gray-200 focus:border-[#0095F6] bg-[#FAFAFA]"
                    dir="rtl"
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasOtherPets"
                  checked={formData.hasOtherPets}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, hasOtherPets: checked as boolean })
                  }
                  className="border-gray-300 data-[state=checked]:bg-[#0095F6] data-[state=checked]:border-[#0095F6]"
                />
                <Label htmlFor="hasOtherPets" className="text-[#262626] text-sm cursor-pointer">
                  יש לי חיות מחמד נוספות בבית
                </Label>
              </div>

              {formData.hasOtherPets && (
                <div>
                  <Label htmlFor="otherPetsDetails" className="text-[#262626] text-sm">
                    פרט על חיות המחמד הקיימות
                  </Label>
                  <Textarea
                    id="otherPetsDetails"
                    value={formData.otherPetsDetails}
                    onChange={(e) =>
                      setFormData({ ...formData, otherPetsDetails: e.target.value })
                    }
                    className="border-gray-200 focus:border-[#0095F6] bg-[#FAFAFA]"
                    dir="rtl"
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="reason" className="text-[#262626] text-sm">
                למה אתה רוצה לאמץ את {selectedPet?.name}? *
              </Label>
              <Textarea
                id="reason"
                required
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                className="border-gray-200 focus:border-[#0095F6] bg-[#FAFAFA] min-h-[100px]"
                dir="rtl"
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                className="flex-1 bg-[#0095F6] hover:bg-[#0095F6]/90 text-white rounded-lg"
              >
                שלח בקשה
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdoptionForm(false)}
                className="flex-1 border-gray-200 text-[#262626] hover:bg-gray-50 rounded-lg"
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
