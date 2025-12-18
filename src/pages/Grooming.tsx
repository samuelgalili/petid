import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Star, Phone, Calendar, Scissors, Heart, Sparkles, Clock, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";

interface GroomingSalon {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string | null;
  description: string | null;
  price_range: string | null;
  rating: number;
  total_reviews: number;
  services: string[];
  working_hours: any;
  image_url: string | null;
}

interface Pet {
  id: string;
  name: string;
  type: string;
}

const Grooming = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [salons, setSalons] = useState<GroomingSalon[]>([]);
  const [filteredSalons, setFilteredSalons] = useState<GroomingSalon[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedSalon, setSelectedSalon] = useState<GroomingSalon | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [likedSalons, setLikedSalons] = useState<Set<string>>(new Set());

  // Booking form state
  const [selectedPetId, setSelectedPetId] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchSalons();
    fetchPets();
  }, []);

  useEffect(() => {
    filterSalons();
  }, [searchQuery, selectedCity, salons]);

  const fetchSalons = async () => {
    try {
      const { data, error } = await supabase
        .from("grooming_salons")
        .select("*")
        .eq("is_active", true)
        .order("rating", { ascending: false });

      if (error) throw error;
      setSalons(data || []);
      setFilteredSalons(data || []);
    } catch (error) {
      console.error("Error fetching grooming salons:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את רשימת המספרות",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("pets")
        .select("id, name, type")
        .eq("user_id", user.id)
        .eq("archived", false);

      if (error) throw error;
      setPets(data || []);
    } catch (error) {
      console.error("Error fetching pets:", error);
    }
  };

  const filterSalons = () => {
    let filtered = salons;

    if (selectedCity !== "all") {
      filtered = filtered.filter((salon) => salon.city === selectedCity);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (salon) =>
          salon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          salon.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredSalons(filtered);
  };

  const cities = Array.from(new Set(salons.map((salon) => salon.city)));

  const toggleLike = (salonId: string) => {
    setLikedSalons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(salonId)) {
        newSet.delete(salonId);
      } else {
        newSet.add(salonId);
      }
      return newSet;
    });
  };

  const handleBookAppointment = async () => {
    if (!selectedPetId || !selectedService || !appointmentDate || !appointmentTime) {
      toast({
        title: "שגיאה",
        description: "נא למלא את כל השדות הנדרשים",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "שגיאה",
          description: "עליך להתחבר כדי לקבוע תור",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("grooming_appointments").insert({
        user_id: user.id,
        salon_id: selectedSalon?.id,
        pet_id: selectedPetId,
        service_type: selectedService,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        notes: notes || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "התור נקבע בהצלחה! ✨",
        description: "נשלח אליך אישור בהקדם",
      });

      setSelectedPetId("");
      setSelectedService("");
      setAppointmentDate("");
      setAppointmentTime("");
      setNotes("");
      setIsBookingOpen(false);
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לקבוע את התור",
        variant: "destructive",
      });
    }
  };

  const openBookingDialog = (salon: GroomingSalon) => {
    setSelectedSalon(salon);
    setIsBookingOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-purple-50 flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div 
            className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-orange-400 p-[3px]"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <Scissors className="w-8 h-8 text-purple-500" />
            </div>
          </motion.div>
          <p className="text-gray-600 font-jakarta font-medium">טוען מספרות...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-white to-purple-50/30 pb-24">
      {/* Instagram-style Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-xl font-black bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 bg-clip-text text-transparent font-jakarta">
              מספרות
            </span>
            <Sparkles className="w-5 h-5 text-purple-500" />
          </div>
          
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-orange-400 p-[2px]">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <Scissors className="w-4 h-4 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Stories-style City Filter */}
      <div className="px-4 py-3 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedCity("all")}
            className={`px-4 py-2 rounded-full text-sm font-bold font-jakarta whitespace-nowrap transition-all ${
              selectedCity === "all"
                ? "bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 text-white shadow-lg shadow-purple-200"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            כל הערים ✨
          </motion.button>
          {cities.map((city) => (
            <motion.button
              key={city}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCity(city)}
              className={`px-4 py-2 rounded-full text-sm font-bold font-jakarta whitespace-nowrap transition-all ${
                selectedCity === city
                  ? "bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 text-white shadow-lg shadow-purple-200"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {city}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="חיפוש מספרה..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-12 py-6 bg-gray-50 rounded-2xl border-0 shadow-sm font-jakarta text-base placeholder:text-gray-400 focus:ring-2 focus:ring-purple-200 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Results Count */}
      <div className="px-4 pb-3">
        <p className="text-sm text-gray-500 font-jakarta">
          <span className="font-bold text-gray-800">{filteredSalons.length}</span> מספרות נמצאו
        </p>
      </div>

      {/* Salon Cards - Instagram Grid Style */}
      <div className="px-4">
        <AnimatePresence mode="popLayout">
          <div className="space-y-4">
            {filteredSalons.map((salon, index) => (
              <motion.div
                key={salon.id}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 30 }}
                className="bg-white rounded-3xl overflow-hidden shadow-lg shadow-gray-100/80 border border-gray-100"
              >
                {/* Image with Gradient Overlay */}
                <div className="relative aspect-[4/3] bg-gradient-to-br from-pink-100 to-purple-100 overflow-hidden">
                  {salon.image_url ? (
                    <img
                      src={salon.image_url}
                      alt={salon.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-orange-400 p-[3px]">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                          <Scissors className="w-10 h-10 text-purple-500" />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Like Button */}
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={() => toggleLike(salon.id)}
                    className="absolute top-3 left-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg"
                  >
                    <Heart 
                      className={`w-5 h-5 transition-colors ${
                        likedSalons.has(salon.id) 
                          ? "text-red-500 fill-red-500" 
                          : "text-gray-600"
                      }`} 
                    />
                  </motion.button>

                  {/* Rating Badge */}
                  <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-black text-gray-900 font-jakarta">
                      {salon.rating.toFixed(1)}
                    </span>
                  </div>

                  {/* Price Badge */}
                  {salon.price_range && (
                    <div className="absolute bottom-3 left-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full px-3 py-1.5 text-xs font-bold font-jakarta shadow-lg">
                      {salon.price_range}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 font-jakarta leading-tight">
                        {salon.name}
                      </h3>
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-500 font-jakarta">
                          {salon.city}
                        </span>
                        <span className="text-gray-300 mx-1">•</span>
                        <span className="text-sm text-gray-400 font-jakarta">
                          {salon.total_reviews} ביקורות
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {salon.description && (
                    <p className="text-sm text-gray-600 mb-3 font-jakarta line-clamp-2 leading-relaxed">
                      {salon.description}
                    </p>
                  )}

                  {/* Services Tags */}
                  {salon.services && salon.services.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {salon.services.slice(0, 4).map((service, idx) => (
                        <span
                          key={idx}
                          className="bg-gradient-to-r from-pink-50 to-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-medium font-jakarta border border-purple-100"
                        >
                          {service}
                        </span>
                      ))}
                      {salon.services.length > 4 && (
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium font-jakarta">
                          +{salon.services.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Contact & Book Row */}
                  <div className="flex items-center gap-2">
                    {salon.phone && (
                      <a
                        href={`tel:${salon.phone}`}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 rounded-2xl text-gray-700 font-medium font-jakarta hover:bg-gray-200 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        <span className="text-sm">התקשר</span>
                      </a>
                    )}
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => openBookingDialog(salon)}
                      className="flex-[2] flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 rounded-2xl text-white font-bold font-jakarta shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 transition-all"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>קבע תור</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>

        {/* Empty State */}
        {filteredSalons.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-tr from-pink-100 to-purple-100 flex items-center justify-center">
              <Scissors className="w-10 h-10 text-purple-300" />
            </div>
            <p className="text-gray-500 font-jakarta font-medium">לא נמצאו מספרות</p>
            <p className="text-gray-400 font-jakarta text-sm mt-1">נסה לחפש במילים אחרות</p>
          </motion.div>
        )}
      </div>

      <BottomNav />

      {/* Booking Dialog - Instagram Style */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="bg-white rounded-3xl max-w-md p-0 overflow-hidden">
          {/* Dialog Header with Gradient */}
          <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 p-6 text-white">
            <DialogTitle className="text-2xl font-black text-center font-jakarta">
              קביעת תור ✨
            </DialogTitle>
            <p className="text-center text-white/90 font-jakarta text-sm mt-1">
              {selectedSalon?.name}
            </p>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <Label className="text-right font-bold font-jakarta text-gray-900 text-sm">
                בחר חיית מחמד 🐾
              </Label>
              <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                <SelectTrigger className="mt-2 rounded-2xl font-jakarta h-12 bg-gray-50 border-0">
                  <SelectValue placeholder="בחר חיית מחמד" />
                </SelectTrigger>
                <SelectContent>
                  {pets.map((pet) => (
                    <SelectItem key={pet.id} value={pet.id}>
                      {pet.name} ({pet.type === "dog" ? "🐕" : "🐈"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-right font-bold font-jakarta text-gray-900 text-sm">
                סוג השירות ✂️
              </Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="mt-2 rounded-2xl font-jakarta h-12 bg-gray-50 border-0">
                  <SelectValue placeholder="בחר שירות" />
                </SelectTrigger>
                <SelectContent>
                  {selectedSalon?.services.map((service, idx) => (
                    <SelectItem key={idx} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-right font-bold font-jakarta text-gray-900 text-sm">
                  תאריך 📅
                </Label>
                <Input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="mt-2 rounded-2xl font-jakarta h-12 bg-gray-50 border-0"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <Label className="text-right font-bold font-jakarta text-gray-900 text-sm">
                  שעה 🕐
                </Label>
                <Input
                  type="time"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="mt-2 rounded-2xl font-jakarta h-12 bg-gray-50 border-0"
                />
              </div>
            </div>

            <div>
              <Label className="text-right font-bold font-jakarta text-gray-900 text-sm">
                הערות (אופציונלי) 📝
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הערות נוספות למספרה..."
                className="mt-2 rounded-2xl font-jakarta bg-gray-50 border-0 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsBookingOpen(false)}
                className="flex-1 rounded-2xl font-jakarta h-12 border-gray-200"
              >
                ביטול
              </Button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleBookAppointment}
                className="flex-[2] h-12 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 text-white rounded-2xl font-black font-jakarta shadow-lg shadow-purple-200"
              >
                אישור תור ✨
              </motion.button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Grooming;
