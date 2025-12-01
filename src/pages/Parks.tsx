import { useState, useEffect } from "react";
import { Search, MapPin, Star, Check, Droplets, Trees, Activity, Car, Lightbulb, SlidersHorizontal, ExternalLink, Map as MapIcon, List, Clock, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { APIProvider, Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import { ParkReviewDialog } from "@/components/ParkReviewDialog";
import { ParkReviewsList } from "@/components/ParkReviewsList";
import { AppHeader } from "@/components/AppHeader";

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
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedPark, setSelectedPark] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewsListOpen, setReviewsListOpen] = useState(false);
  const [selectedParkForReview, setSelectedParkForReview] = useState<DogPark | null>(null);
  const { toast } = useToast();

  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  useEffect(() => {
    fetchParks();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [parks, searchQuery, selectedCity, selectedSize, filterFencing, filterWater, filterShade]);

  const fetchParks = async () => {
    try {
      setLoading(true);
      
      // Fetch parks with review statistics
      const { data: parksData, error: parksError } = await supabase
        .from("dog_parks")
        .select("*")
        .eq("status", "active")
        .order("city", { ascending: true })
        .order("name", { ascending: true });

      if (parksError) throw parksError;

      // Fetch review statistics for each park
      const parksWithReviews = await Promise.all(
        (parksData || []).map(async (park) => {
          const { data: reviews, error: reviewsError } = await supabase
            .from("park_reviews")
            .select("rating")
            .eq("park_id", park.id);

          if (reviewsError) {
            console.error("Error fetching reviews:", reviewsError);
            return { ...park, rating: null, total_reviews: 0 };
          }

          const totalReviews = reviews?.length || 0;
          const avgRating = totalReviews > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
            : null;

          return {
            ...park,
            rating: avgRating,
            total_reviews: totalReviews,
          };
        })
      );

      setParks(parksWithReviews);
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

  // Calculate map center based on filtered parks with valid coordinates
  const mapCenter = () => {
    const parksWithCoords = filteredParks.filter(p => p.latitude && p.longitude);
    if (parksWithCoords.length === 0) {
      return { lat: 32.0853, lng: 34.7818 }; // Tel Aviv default
    }
    
    const avgLat = parksWithCoords.reduce((sum, p) => sum + (p.latitude || 0), 0) / parksWithCoords.length;
    const avgLng = parksWithCoords.reduce((sum, p) => sum + (p.longitude || 0), 0) / parksWithCoords.length;
    
    return { lat: avgLat, lng: avgLng };
  };

  const renderParkCard = (park: DogPark) => (
    <Card
      key={park.id}
      className="overflow-hidden bg-white border border-border hover:shadow-sm transition-shadow rounded-lg"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-xl text-gray-900 mb-1 font-jakarta">{park.name}</h3>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{park.city}</span>
            </div>
          </div>
          {park.verified && (
            <Badge className="bg-green-100 text-green-800 border-green-200 rounded-full">
              <Check className="w-3 h-3 ml-1" />
              מאומת
            </Badge>
          )}
        </div>

        {/* Address */}
        <p className="text-sm text-gray-600 mb-3">{park.address}</p>

        {/* Opening Hours */}
        <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
          <Clock className="w-4 h-4" />
          <span>פתוח 24/7</span>
        </div>

        {/* Size and Rating */}
        <div className="flex items-center gap-4 mb-4">
          <Badge variant="outline" className="rounded-full bg-gray-50 border-gray-300 text-gray-900">
            גודל: {getSizeLabel(park.size)}
          </Badge>
          {park.rating && park.rating > 0 ? (
            <div className="flex items-center gap-1 text-sm">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-medium text-gray-900">{park.rating.toFixed(1)}</span>
              <span className="text-gray-500">({park.total_reviews} ביקורות)</span>
            </div>
          ) : (
            <span className="text-sm text-gray-500">אין ביקורות</span>
          )}
        </div>

        {/* Facilities */}
        <div className="flex flex-wrap gap-3 mb-4">
          {park.fencing && (
            <div className="flex items-center gap-1 text-sm text-gray-700 bg-gray-50 px-3 py-1 rounded-full">
              <Check className="w-4 h-4 text-green-600" />
              <span>גדר</span>
            </div>
          )}
          {park.water && (
            <div className="flex items-center gap-1 text-sm text-gray-700 bg-gray-50 px-3 py-1 rounded-full">
              <Droplets className="w-4 h-4 text-blue-600" />
              <span>מים</span>
            </div>
          )}
          {park.shade && (
            <div className="flex items-center gap-1 text-sm text-gray-700 bg-gray-50 px-3 py-1 rounded-full">
              <Trees className="w-4 h-4 text-green-600" />
              <span>צל</span>
            </div>
          )}
          {park.agility && (
            <div className="flex items-center gap-1 text-sm text-gray-700 bg-gray-50 px-3 py-1 rounded-full">
              <Activity className="w-4 h-4 text-purple-600" />
              <span>אג'יליטי</span>
            </div>
          )}
          {park.parking && (
            <div className="flex items-center gap-1 text-sm text-gray-700 bg-gray-50 px-3 py-1 rounded-full">
              <Car className="w-4 h-4 text-gray-600" />
              <span>חניה</span>
            </div>
          )}
          {park.lighting && (
            <div className="flex items-center gap-1 text-sm text-gray-700 bg-gray-50 px-3 py-1 rounded-full">
              <Lightbulb className="w-4 h-4 text-yellow-600" />
              <span>תאורה</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {park.notes && (
          <p className="text-sm text-gray-600 mb-4 italic bg-gray-50 p-3 rounded-lg">{park.notes}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setSelectedParkForReview(park);
              setReviewsListOpen(true);
            }}
            variant="outline"
            className="flex-1 rounded-lg border-border text-foreground hover:bg-muted/50"
          >
            <MessageSquare className="w-4 h-4 ml-2" strokeWidth={1.5} />
            ביקורות
          </Button>
          <Button
            onClick={() => {
              setSelectedParkForReview(park);
              setReviewDialogOpen(true);
            }}
            className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-lg font-jakarta"
          >
            <Star className="w-4 h-4 ml-2" strokeWidth={1.5} />
            דרג
          </Button>
        </div>
        <Button
          onClick={() => openInMaps(park)}
          className="w-full mt-2 bg-foreground hover:bg-foreground/90 text-background rounded-lg font-jakarta"
        >
          <ExternalLink className="w-4 h-4 ml-2" strokeWidth={1.5} />
          פתח בגוגל מפות
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-white pb-20" dir="rtl">
      <AppHeader 
        title="גינות כלבים" 
        showBackButton={true}
        showMenuButton={false}
      />
      
      <div className="px-4 pt-4">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="חיפוש גינה, עיר או כתובת..."
            className="pr-10 rounded-full bg-card border-border text-foreground placeholder:text-muted-foreground focus:bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className={`rounded-full ${viewMode === "list" ? "bg-gray-900 text-white" : "bg-white text-gray-900 border-gray-300"}`}
          >
            <List className="w-4 h-4 ml-1" />
            רשימה
          </Button>
          <Button
            variant={viewMode === "map" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("map")}
            className={`rounded-full ${viewMode === "map" ? "bg-gray-900 text-white" : "bg-white text-gray-900 border-gray-300"}`}
          >
            <MapIcon className="w-4 h-4 ml-1" />
            מפה
          </Button>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-gray-900 hover:bg-gray-100 rounded-full flex-shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4 ml-2" />
            סינון
          </Button>

          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-32 rounded-full bg-gray-100 border-gray-200 text-gray-900 flex-shrink-0">
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
            <SelectTrigger className="w-32 rounded-full bg-gray-100 border-gray-200 text-gray-900 flex-shrink-0">
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
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-gray-100 text-gray-900 border-gray-200 hover:bg-gray-200"
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
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-gray-100 text-gray-900 border-gray-200 hover:bg-gray-200"
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
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-gray-100 text-gray-900 border-gray-200 hover:bg-gray-200"
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
        <p className="text-sm text-muted-foreground mt-3 font-jakarta">
          נמצאו {filteredParks.length} {filteredParks.length === 1 ? "גינה" : "גינות"}
        </p>
      </div>

      {/* Content Area */}
      <div className="relative">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="text-gray-600 mt-2 font-jakarta">טוען גינות...</p>
          </div>
        ) : filteredParks.length === 0 ? (
          <div className="text-center py-12 px-6">
            <p className="text-gray-600 font-jakarta">לא נמצאו גינות התואמות את החיפוש</p>
          </div>
        ) : viewMode === "list" ? (
          <div className="px-6 py-4 space-y-4">
            {filteredParks.map(renderParkCard)}
          </div>
        ) : (
          <div className="h-[calc(100vh-280px)] w-full">
            {GOOGLE_MAPS_API_KEY ? (
              <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                <Map
                  defaultCenter={mapCenter()}
                  defaultZoom={11}
                  mapId="dog-parks-map"
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  className="w-full h-full"
                >
                  {filteredParks
                    .filter(park => park.latitude && park.longitude)
                    .map((park) => (
                      <AdvancedMarker
                        key={park.id}
                        position={{ lat: park.latitude!, lng: park.longitude! }}
                        onClick={() => setSelectedPark(park.id)}
                      >
                        <div className="bg-gray-900 text-white p-2 rounded-full shadow-lg">
                          <MapPin className="w-5 h-5" />
                        </div>
                      </AdvancedMarker>
                    ))}

                  {selectedPark && (
                    <InfoWindow
                      position={{
                        lat: filteredParks.find(p => p.id === selectedPark)?.latitude!,
                        lng: filteredParks.find(p => p.id === selectedPark)?.longitude!
                      }}
                      onCloseClick={() => setSelectedPark(null)}
                    >
                      <div className="p-2 max-w-xs" dir="rtl">
                        {renderParkCard(filteredParks.find(p => p.id === selectedPark)!)}
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </APIProvider>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100 p-6">
                <div className="text-center">
                  <MapIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-jakarta mb-2">תצוגת המפה לא זמינה</p>
                  <p className="text-sm text-gray-500">נא להגדיר מפתח API של Google Maps</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />

      {/* Review Dialog */}
      {selectedParkForReview && (
        <ParkReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          parkId={selectedParkForReview.id}
          parkName={selectedParkForReview.name}
          onReviewSubmitted={() => {
            fetchParks(); // Refresh parks to update ratings
            setReviewDialogOpen(false);
          }}
        />
      )}

      {/* Reviews List Dialog */}
      {selectedParkForReview && (
        <ParkReviewsList
          open={reviewsListOpen}
          onOpenChange={setReviewsListOpen}
          parkId={selectedParkForReview.id}
          parkName={selectedParkForReview.name}
        />
      )}
    </div>
  );
};

export default Parks;
