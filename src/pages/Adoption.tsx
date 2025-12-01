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
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 pb-24 pt-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-yellow-700">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppHeader 
        title="אימוץ חיות מחמד" 
        showBackButton={true}
        showMenuButton={false}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 pb-24 px-4 dir-rtl">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <p className="text-yellow-700 text-lg flex items-center justify-center gap-2">
              <Heart className="w-6 h-6 text-red-500" />
              תן בית חם לחבר חדש
            </p>
          </motion.div>

        {/* Search and Filters */}
        <Card className="bg-white/80 backdrop-blur-sm border-yellow-200 shadow-lg mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-yellow-500 w-5 h-5" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חיפוש לפי שם או גזע..."
                  className="pr-10 border-yellow-300 focus:ring-yellow-500"
                  dir="rtl"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="border-yellow-300">
                <SelectValue placeholder="סוג חיה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסוגים</SelectItem>
                <SelectItem value="כלב">כלבים</SelectItem>
                <SelectItem value="חתול">חתולים</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sizeFilter} onValueChange={setSizeFilter}>
              <SelectTrigger className="border-yellow-300">
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
        </Card>

        {/* Pets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <AnimatePresence>
            {filteredPets.map((pet) => (
              <motion.div
                key={pet.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="bg-white/90 backdrop-blur-sm border-yellow-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={pet.image_url || "/placeholder.svg"}
                      alt={pet.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-2xl font-bold text-yellow-900">{pet.name}</h3>
                        <p className="text-yellow-700">{pet.breed || pet.type}</p>
                      </div>
                      <Badge className="bg-yellow-500 text-white">{pet.size}</Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-yellow-700">
                        <span className="font-semibold">גיל:</span>
                        <span>{getAgeString(pet.age_years, pet.age_months)}</span>
                      </div>
                      {pet.gender && (
                        <div className="flex items-center gap-2 text-yellow-700">
                          <span className="font-semibold">מין:</span>
                          <span>{pet.gender}</span>
                        </div>
                      )}
                    </div>

                    {pet.description && (
                      <p className="text-yellow-700 text-sm mb-4 line-clamp-3">
                        {pet.description}
                      </p>
                    )}

                    <div className="flex gap-2 mb-4">
                      {pet.is_vaccinated && (
                        <Badge variant="outline" className="border-green-500 text-green-700">
                          <Check className="w-3 h-3 mr-1" />
                          מחוסן
                        </Badge>
                      )}
                      {pet.is_neutered && (
                        <Badge variant="outline" className="border-blue-500 text-blue-700">
                          <Check className="w-3 h-3 mr-1" />
                          מסורס
                        </Badge>
                      )}
                    </div>

                    {pet.special_needs && (
                      <p className="text-orange-600 text-sm mb-4 flex items-start gap-2">
                        <span className="font-semibold">צרכים מיוחדים:</span>
                        <span>{pet.special_needs}</span>
                      </p>
                    )}

                    <Button
                      onClick={() => handleAdoptClick(pet)}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                    >
                      <Heart className="w-4 h-4 ml-2" />
                      בקשת אימוץ
                    </Button>
                  </div>
                </Card>
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
            <p className="text-yellow-700 text-lg">לא נמצאו חיות מחמד התואמות לחיפוש</p>
          </motion.div>
        )}
        </div>
      </div>

      {/* Adoption Form Dialog */}
      <Dialog open={showAdoptionForm} onOpenChange={setShowAdoptionForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dir-rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-yellow-900">
              בקשת אימוץ - {selectedPet?.name}
            </DialogTitle>
            <DialogDescription className="text-yellow-700">
              מלא את הפרטים הבאים כדי להגיש בקשה לאימוץ
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAdoption} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName" className="text-yellow-900">
                  שם מלא *
                </Label>
                <Input
                  id="fullName"
                  required
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="border-yellow-300"
                  dir="rtl"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-yellow-900">
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
                  className="border-yellow-300"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone" className="text-yellow-900">
                  טלפון *
                </Label>
                <Input
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="border-yellow-300"
                  dir="rtl"
                />
              </div>
              <div>
                <Label htmlFor="address" className="text-yellow-900">
                  כתובת *
                </Label>
                <Input
                  id="address"
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="border-yellow-300"
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
                />
                <Label htmlFor="hasExperience" className="text-yellow-900 cursor-pointer">
                  יש לי ניסיון קודם בגידול חיות מחמד
                </Label>
              </div>

              {formData.hasExperience && (
                <div>
                  <Label htmlFor="experienceDetails" className="text-yellow-900">
                    פרט על הניסיון שלך
                  </Label>
                  <Textarea
                    id="experienceDetails"
                    value={formData.experienceDetails}
                    onChange={(e) =>
                      setFormData({ ...formData, experienceDetails: e.target.value })
                    }
                    className="border-yellow-300"
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
                />
                <Label htmlFor="hasOtherPets" className="text-yellow-900 cursor-pointer">
                  יש לי חיות מחמד נוספות בבית
                </Label>
              </div>

              {formData.hasOtherPets && (
                <div>
                  <Label htmlFor="otherPetsDetails" className="text-yellow-900">
                    פרט על חיות המחמד הקיימות
                  </Label>
                  <Textarea
                    id="otherPetsDetails"
                    value={formData.otherPetsDetails}
                    onChange={(e) =>
                      setFormData({ ...formData, otherPetsDetails: e.target.value })
                    }
                    className="border-yellow-300"
                    dir="rtl"
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="reason" className="text-yellow-900">
                למה אתה רוצה לאמץ את {selectedPet?.name}? *
              </Label>
              <Textarea
                id="reason"
                required
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                className="border-yellow-300 min-h-[100px]"
                dir="rtl"
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                שלח בקשה
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdoptionForm(false)}
                className="flex-1 border-yellow-300 text-yellow-700"
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
