import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, Star, Clock, Phone, Calendar, Scissors } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppHeader } from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";

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
  const [salons, setSalons] = useState<GroomingSalon[]>([]);
  const [filteredSalons, setFilteredSalons] = useState<GroomingSalon[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedSalon, setSelectedSalon] = useState<GroomingSalon | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

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
        title: "התור נקבע בהצלחה!",
        description: "נשלח אליך אישור בהקדם",
      });

      // Reset form
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Scissors className="w-12 h-12 text-[#FFD700] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-jakarta">טוען מספרות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader 
        title="מספרות לחיות מחמד" 
        showBackButton={true}
        showMenuButton={false}
        extraAction={{
          icon: Scissors,
          onClick: () => {}
        }}
      />

      <div className="px-4 pt-4">
        {/* Search and Filter */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="חיפוש מספרה..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 bg-card rounded-2xl border-border shadow-md font-jakarta"
            />
          </div>

          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="bg-card rounded-2xl border-border shadow-md font-jakarta">
              <SelectValue placeholder="כל הערים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הערים</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      <div className="px-4 pb-4">
        <p className="text-sm text-muted-foreground mb-4 font-jakarta">
          נמצאו {filteredSalons.length} מספרות
        </p>

        <div className="space-y-4">
          {filteredSalons.map((salon, index) => (
            <motion.div
              key={salon.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-md overflow-hidden"
            >
              {salon.image_url && (
                <div className="w-full h-48 bg-gray-100 overflow-hidden">
                  <img
                    src={salon.image_url}
                    alt={salon.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-gray-900 mb-1 font-jakarta">
                      {salon.name}
                    </h3>
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-bold text-gray-900 font-jakarta">
                        {salon.rating.toFixed(1)}
                      </span>
                      <span className="text-sm text-gray-600 font-jakarta">
                        ({salon.total_reviews} ביקורות)
                      </span>
                    </div>
                  </div>
                  {salon.price_range && (
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold font-jakarta">
                      {salon.price_range}
                    </div>
                  )}
                </div>

                {salon.description && (
                  <p className="text-sm text-gray-600 mb-3 font-jakarta line-clamp-2">
                    {salon.description}
                  </p>
                )}

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span className="font-jakarta">{salon.city} - {salon.address}</span>
                  </div>
                  {salon.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${salon.phone}`} className="font-jakarta hover:text-blue-600">
                        {salon.phone}
                      </a>
                    </div>
                  )}
                </div>

                {salon.services && salon.services.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2 font-jakarta font-semibold">שירותים:</p>
                    <div className="flex flex-wrap gap-2">
                      {salon.services.slice(0, 3).map((service, idx) => (
                        <span
                          key={idx}
                          className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-jakarta"
                        >
                          {service}
                        </span>
                      ))}
                      {salon.services.length > 3 && (
                        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-jakarta">
                          +{salon.services.length - 3} נוספים
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => openBookingDialog(salon)}
                  className="w-full bg-[#FFD700] hover:bg-[#FFC107] text-gray-900 rounded-2xl font-bold py-5 transition-all font-jakarta"
                >
                  <Calendar className="w-5 h-5 ml-2" />
                  קבע תור
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredSalons.length === 0 && (
          <div className="text-center py-12">
            <Scissors className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-jakarta">לא נמצאו מספרות התואמות את החיפוש</p>
          </div>
        )}
      </div>

      <BottomNav />

      {/* Booking Dialog */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="bg-white rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gray-900 text-right font-jakarta">
              קביעת תור - {selectedSalon?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="pet" className="text-right font-bold font-jakarta text-gray-900">
                בחר חיית מחמד
              </Label>
              <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                <SelectTrigger id="pet" className="mt-2 rounded-xl font-jakarta">
                  <SelectValue placeholder="בחר חיית מחמד" />
                </SelectTrigger>
                <SelectContent>
                  {pets.map((pet) => (
                    <SelectItem key={pet.id} value={pet.id}>
                      {pet.name} ({pet.type === "dog" ? "כלב" : "חתול"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="service" className="text-right font-bold font-jakarta text-gray-900">
                סוג השירות
              </Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger id="service" className="mt-2 rounded-xl font-jakarta">
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

            <div>
              <Label htmlFor="date" className="text-right font-bold font-jakarta text-gray-900">
                תאריך
              </Label>
              <Input
                id="date"
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="mt-2 rounded-xl font-jakarta"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div>
              <Label htmlFor="time" className="text-right font-bold font-jakarta text-gray-900">
                שעה
              </Label>
              <Input
                id="time"
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className="mt-2 rounded-xl font-jakarta"
              />
            </div>

            <div>
              <Label htmlFor="notes" className="text-right font-bold font-jakarta text-gray-900">
                הערות (אופציונלי)
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הערות נוספות למספרה..."
                className="mt-2 rounded-xl font-jakarta"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsBookingOpen(false)}
                className="flex-1 rounded-xl font-jakarta"
              >
                ביטול
              </Button>
              <Button
                onClick={handleBookAppointment}
                className="flex-1 bg-[#FFD700] hover:bg-[#FFC107] text-gray-900 rounded-xl font-bold font-jakarta"
              >
                אישור תור
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Grooming;
