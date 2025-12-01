import { useState, useEffect } from "react";
import { Search, MapPin, Star, Check, X, Droplets, Trees, Activity, Car, Lightbulb, SlidersHorizontal, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface DogPark {
  id: string;
  name: string;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  google_maps_link: string | null;
  status: string;
  size: string | null;
  fencing: boolean;
  water: boolean;
  shade: boolean;
  agility: boolean;
  parking: boolean;
  lighting: boolean;
  notes: string | null;
  verified: boolean;
  rating: number | null;
  total_reviews: number;
}

const Parks = () => {
  const [parks, setParks] = useState<DogPark[]>([]);
  const [filteredParks, setFilteredParks] = useState<DogPark[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedSize, setSelectedSize] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [filterFencing, setFilterFencing] = useState(false);
  const [filterWater, setFilterWater] = useState(false);
  const [filterShade, setFilterShade] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchParks();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [parks, searchQuery, selectedCity, selectedSize, filterFencing, filterWater, filterShade]);

  const fetchParks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("dog_parks")
        .select("*")
        .eq("status", "active")
        .order("city", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setParks(data || []);
    } catch (error) {
      console.error("Error fetching parks:", error);
      toast({
        title: "שגיאה בטעינת גינות",
        description: "לא הצלחנו לטעון את רשימת הגינות. נסה שוב מאוחר יותר.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...parks];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (park) =>
          park.name.toLowerCase().includes(query) ||
          park.city.toLowerCase().includes(query) ||
          park.address.toLowerCase().includes(query)
      );
    }

    // City filter
    if (selectedCity !== "all") {
      filtered = filtered.filter((park) => park.city === selectedCity);
    }

    // Size filter
    if (selectedSize !== "all") {
      filtered = filtered.filter((park) => park.size === selectedSize);
    }

    // Facility filters
    if (filterFencing) {
      filtered = filtered.filter((park) => park.fencing);
    }
    if (filterWater) {
      filtered = filtered.filter((park) => park.water);
    }
    if (filterShade) {
      filtered = filtered.filter((park) => park.shade);
    }

    setFilteredParks(filtered);
  };

  const cities = Array.from(new Set(parks.map((park) => park.city))).sort();

  const openInMaps = (park: DogPark) => {
    if (park.google_maps_link) {
      window.open(park.google_maps_link, "_blank");
    } else if (park.latitude && park.longitude) {
      window.open(`https://www.google.com/maps?q=${park.latitude},${park.longitude}`, "_blank");
    } else {
      const query = encodeURIComponent(`${park.name} ${park.address} ${park.city}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
    }
  };

  const getSizeLabel = (size: string | null) => {
    switch (size) {
      case "small": return "קטנה";
      case "medium": return "בינונית";
      case "large": return "גדולה";
      default: return "לא ידוע";
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6 pb-4 sticky top-0 z-10">
        <h1 className="text-3xl font-bold text-black mb-4">גינות כלבים</h1>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="חיפוש גינה, עיר או כתובת..."
            className="pr-10 rounded-full bg-gray-50 border-gray-200 text-black placeholder:text-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-black hover:bg-gray-100"
          >
            <SlidersHorizontal className="w-4 h-4 ml-2" />
            סינון
          </Button>

          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-32 rounded-full bg-gray-50 border-gray-200 text-black">
              <SelectValue placeholder="עיר" />
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

          <Select value={selectedSize} onValueChange={setSelectedSize}>
            <SelectTrigger className="w-32 rounded-full bg-gray-50 border-gray-200 text-black">
              <SelectValue placeholder="גודל" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הגדלים</SelectItem>
              <SelectItem value="small">קטנה</SelectItem>
              <SelectItem value="medium">בינונית</SelectItem>
              <SelectItem value="large">גדולה</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200 mt-3">
                <Badge
                  variant="outline"
                  className={`rounded-full cursor-pointer transition-colors ${
                    filterFencing
                      ? "bg-black text-white border-black"
                      : "bg-gray-50 text-black border-gray-200 hover:bg-gray-100"
                  }`}
                  onClick={() => setFilterFencing(!filterFencing)}
                >
                  {filterFencing && <Check className="w-3 h-3 ml-1" />}
                  גדר
                </Badge>
                <Badge
                  variant="outline"
                  className={`rounded-full cursor-pointer transition-colors ${
                    filterWater
                      ? "bg-black text-white border-black"
                      : "bg-gray-50 text-black border-gray-200 hover:bg-gray-100"
                  }`}
                  onClick={() => setFilterWater(!filterWater)}
                >
                  {filterWater && <Check className="w-3 h-3 ml-1" />}
                  מים
                </Badge>
                <Badge
                  variant="outline"
                  className={`rounded-full cursor-pointer transition-colors ${
                    filterShade
                      ? "bg-black text-white border-black"
                      : "bg-gray-50 text-black border-gray-200 hover:bg-gray-100"
                  }`}
                  onClick={() => setFilterShade(!filterShade)}
                >
                  {filterShade && <Check className="w-3 h-3 ml-1" />}
                  צל
                </Badge>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Count */}
        <p className="text-sm text-gray-500 mt-3">
          נמצאו {filteredParks.length} {filteredParks.length === 1 ? "גינה" : "גינות"}
        </p>
      </div>

      {/* Parks List */}
      <div className="px-6 py-4 space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            <p className="text-gray-500 mt-2">טוען גינות...</p>
          </div>
        ) : filteredParks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">לא נמצאו גינות התואמות את החיפוש</p>
          </div>
        ) : (
          filteredParks.map((park) => (
            <Card
              key={park.id}
              className="overflow-hidden bg-gray-50 border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-xl text-black mb-1">{park.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{park.city}</span>
                    </div>
                  </div>
                  {park.verified && (
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <Check className="w-3 h-3 ml-1" />
                      מאומת
                    </Badge>
                  )}
                </div>

                {/* Address */}
                <p className="text-sm text-gray-600 mb-3">{park.address}</p>

                {/* Size and Rating */}
                <div className="flex items-center gap-4 mb-3">
                  <Badge variant="outline" className="rounded-full bg-white border-gray-300 text-black">
                    גודל: {getSizeLabel(park.size)}
                  </Badge>
                  {park.rating && park.rating > 0 && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-medium text-black">{park.rating.toFixed(1)}</span>
                      <span className="text-gray-500">({park.total_reviews})</span>
                    </div>
                  )}
                </div>

                {/* Facilities */}
                <div className="flex flex-wrap gap-3 mb-4">
                  {park.fencing && (
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>גדר</span>
                    </div>
                  )}
                  {park.water && (
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <Droplets className="w-4 h-4 text-blue-600" />
                      <span>מים</span>
                    </div>
                  )}
                  {park.shade && (
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <Trees className="w-4 h-4 text-green-600" />
                      <span>צל</span>
                    </div>
                  )}
                  {park.agility && (
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <Activity className="w-4 h-4 text-purple-600" />
                      <span>אג'יליטי</span>
                    </div>
                  )}
                  {park.parking && (
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <Car className="w-4 h-4 text-gray-600" />
                      <span>חניה</span>
                    </div>
                  )}
                  {park.lighting && (
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <Lightbulb className="w-4 h-4 text-yellow-600" />
                      <span>תאורה</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {park.notes && (
                  <p className="text-sm text-gray-600 mb-4 italic">{park.notes}</p>
                )}

                {/* Actions */}
                <Button
                  onClick={() => openInMaps(park)}
                  className="w-full bg-black hover:bg-gray-800 text-white rounded-full"
                >
                  <ExternalLink className="w-4 h-4 ml-2" />
                  פתח בגוגל מפות
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Parks;
