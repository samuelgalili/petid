import { useState, useEffect, useCallback, useRef } from "react";
import { Search, MapPin, Star, Check, Droplets, Trees, Activity, Car, Lightbulb, SlidersHorizontal, ExternalLink, Map as MapIcon, List, Clock, MessageSquare, Heart, Bookmark, Share2, ChevronLeft, Sparkles, Filter, X, Users, LogIn, LogOut, Camera, Image, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { APIProvider, Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import { ParkReviewDialog } from "@/components/ParkReviewDialog";
import { ParkReviewsList } from "@/components/ParkReviewsList";
import { AppHeader } from "@/components/AppHeader";

// Import park images
import parkImage1 from "@/assets/parks/dog-park-1.jpg";
import parkImage2 from "@/assets/parks/dog-park-2.jpg";
import parkImage3 from "@/assets/parks/dog-park-3.jpg";
import parkImage4 from "@/assets/parks/dog-park-4.jpg";
import parkImage5 from "@/assets/parks/dog-park-5.jpg";
import parkImage6 from "@/assets/parks/dog-park-6.jpg";

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

interface ParkCheckin {
  id: string;
  park_id: string;
  user_id: string;
  pet_id: string | null;
  checked_in_at: string;
  checked_out_at: string | null;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  pet?: {
    name: string;
    avatar_url: string | null;
    type: string;
  };
}

interface ParkPhoto {
  id: string;
  park_id: string;
  user_id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
}

// Park images array
const parkImages = [parkImage1, parkImage2, parkImage3, parkImage4, parkImage5, parkImage6];

// Instagram-style gradient backgrounds for park cards (fallback)
const parkGradients = [
  "from-rose-400 via-fuchsia-500 to-indigo-500",
  "from-amber-400 via-orange-500 to-pink-500",
  "from-emerald-400 via-teal-500 to-cyan-500",
  "from-violet-400 via-purple-500 to-pink-500",
  "from-blue-400 via-indigo-500 to-purple-500",
  "from-green-400 via-emerald-500 to-teal-500",
];

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
  const [likedParks, setLikedParks] = useState<Set<string>>(new Set());
  const [savedParks, setSavedParks] = useState<Set<string>>(new Set());
  
  // Check-in state
  const [parkCheckins, setParkCheckins] = useState<Record<string, ParkCheckin[]>>({});
  const [userCheckin, setUserCheckin] = useState<ParkCheckin | null>(null);
  const [userPets, setUserPets] = useState<{id: string; name: string; avatar_url: string | null; type: string}[]>([]);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [selectedParkForCheckin, setSelectedParkForCheckin] = useState<DogPark | null>(null);
  const [selectedPetForCheckin, setSelectedPetForCheckin] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkinsDialogOpen, setCheckinsDialogOpen] = useState(false);
  const [selectedParkForCheckins, setSelectedParkForCheckins] = useState<DogPark | null>(null);
  
  // Photo upload state
  const [parkPhotos, setParkPhotos] = useState<Record<string, ParkPhoto[]>>({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoGalleryOpen, setPhotoGalleryOpen] = useState(false);
  const [selectedParkForGallery, setSelectedParkForGallery] = useState<DogPark | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();

  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  useEffect(() => {
    fetchParks();
    fetchParkPhotos();
    if (user) {
      fetchUserPets();
      fetchUserCheckin();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [parks, searchQuery, selectedCity, selectedSize, filterFencing, filterWater, filterShade]);

  // Real-time check-in updates
  useEffect(() => {
    const channel = supabase
      .channel('park-checkins')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'park_checkins' },
        () => {
          fetchAllCheckins();
          if (user) fetchUserCheckin();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUserPets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('pets')
      .select('id, name, avatar_url, type')
      .eq('user_id', user.id)
      .eq('archived', false);
    
    if (data) setUserPets(data);
  };

  const fetchUserCheckin = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('park_checkins')
      .select('*')
      .eq('user_id', user.id)
      .is('checked_out_at', null)
      .single();
    
    setUserCheckin(data);
  };

  const fetchAllCheckins = async () => {
    // Fetch checkins with pet data
    const { data: checkinsData } = await supabase
      .from('park_checkins')
      .select(`
        *,
        pet:pets(name, avatar_url, type)
      `)
      .is('checked_out_at', null);
    
    if (checkinsData && checkinsData.length > 0) {
      // Fetch profiles for all users in checkins
      const userIds = [...new Set(checkinsData.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      const profilesMap: Record<string, any> = {};
      profilesData?.forEach(p => { profilesMap[p.id] = p; });
      
      // Merge profile data with checkins
      const checkinsWithProfiles = checkinsData.map(checkin => ({
        ...checkin,
        profile: profilesMap[checkin.user_id] || null
      }));
      
      const grouped: Record<string, ParkCheckin[]> = {};
      checkinsWithProfiles.forEach((checkin: any) => {
        if (!grouped[checkin.park_id]) grouped[checkin.park_id] = [];
        grouped[checkin.park_id].push(checkin);
      });
      setParkCheckins(grouped);
    } else {
      setParkCheckins({});
    }
  };

  // Fetch all photos for parks
  const fetchParkPhotos = async () => {
    const { data, error } = await supabase
      .from('park_photos')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      const grouped: Record<string, ParkPhoto[]> = {};
      data.forEach((photo: ParkPhoto) => {
        if (!grouped[photo.park_id]) grouped[photo.park_id] = [];
        grouped[photo.park_id].push(photo);
      });
      setParkPhotos(grouped);
    }
  };

  // Upload photo to park
  const handlePhotoUpload = async (parkId: string, file: File) => {
    if (!user) {
      toast({
        title: "נדרשת התחברות",
        description: "יש להתחבר כדי להעלות תמונות",
        variant: "destructive",
      });
      return;
    }

    setUploadingPhoto(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${parkId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('park-photos')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('park-photos')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('park_photos')
        .insert({
          park_id: parkId,
          user_id: user.id,
          photo_url: publicUrl,
        });

      if (dbError) throw dbError;

      toast({
        title: "התמונה הועלתה בהצלחה! 📸",
        description: "התמונה נוספה לגלריה",
      });

      fetchParkPhotos();
    } catch (error) {
      console.error('Photo upload error:', error);
      toast({
        title: "שגיאה בהעלאת התמונה",
        description: "נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Delete photo
  const handleDeletePhoto = async (photo: ParkPhoto) => {
    if (!user || user.id !== photo.user_id) return;

    try {
      // Extract file path from URL
      const urlParts = photo.photo_url.split('/park-photos/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('park-photos').remove([filePath]);
      }

      // Delete from database
      await supabase.from('park_photos').delete().eq('id', photo.id);

      toast({ title: "התמונה נמחקה" });
      fetchParkPhotos();
    } catch (error) {
      console.error('Delete photo error:', error);
      toast({
        title: "שגיאה במחיקת התמונה",
        variant: "destructive",
      });
    }
  };

  const handleCheckin = async () => {
    if (!user || !selectedParkForCheckin) return;
    
    setCheckingIn(true);
    try {
      const { error } = await supabase
        .from('park_checkins')
        .insert({
          park_id: selectedParkForCheckin.id,
          user_id: user.id,
          pet_id: selectedPetForCheckin || null
        });

      if (error) throw error;

      toast({
        title: "צ'ק-אין בוצע! 🐾",
        description: `אתה עכשיו ב${selectedParkForCheckin.name}`,
      });
      
      setCheckinDialogOpen(false);
      setSelectedPetForCheckin(null);
      fetchUserCheckin();
      fetchAllCheckins();
    } catch (error) {
      console.error('Check-in error:', error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לבצע צ'ק-אין",
        variant: "destructive",
      });
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckout = async () => {
    if (!userCheckin) return;

    try {
      const { error } = await supabase
        .from('park_checkins')
        .update({ checked_out_at: new Date().toISOString() })
        .eq('id', userCheckin.id);

      if (error) throw error;

      toast({
        title: "צ'ק-אאוט בוצע! 👋",
        description: "להתראות בפעם הבאה!",
      });
      
      setUserCheckin(null);
      fetchAllCheckins();
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לבצע צ'ק-אאוט",
        variant: "destructive",
      });
    }
  };

  const fetchParks = async () => {
    try {
      setLoading(true);
      
      const { data: parksData, error: parksError } = await supabase
        .from("dog_parks")
        .select("*")
        .eq("status", "active")
        .order("city", { ascending: true })
        .order("name", { ascending: true });

      if (parksError) throw parksError;

      const parksWithReviews = await Promise.all(
        (parksData || []).map(async (park) => {
          const { data: reviews, error: reviewsError } = await supabase
            .from("park_reviews")
            .select("rating")
            .eq("park_id", park.id);

          if (reviewsError) {
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
      fetchAllCheckins();
    } catch (error) {
      console.error("Error fetching parks:", error);
      toast({
        title: "שגיאה בטעינת גינות",
        description: "לא הצלחנו לטעון את רשימת הגינות",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...parks];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (park) =>
          park.name.toLowerCase().includes(query) ||
          park.city.toLowerCase().includes(query) ||
          park.address.toLowerCase().includes(query)
      );
    }

    if (selectedCity !== "all") {
      filtered = filtered.filter((park) => park.city === selectedCity);
    }

    if (selectedSize !== "all") {
      filtered = filtered.filter((park) => park.size === selectedSize);
    }

    if (filterFencing) filtered = filtered.filter((park) => park.fencing);
    if (filterWater) filtered = filtered.filter((park) => park.water);
    if (filterShade) filtered = filtered.filter((park) => park.shade);

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

  const toggleLike = (parkId: string) => {
    setLikedParks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parkId)) {
        newSet.delete(parkId);
      } else {
        newSet.add(parkId);
      }
      return newSet;
    });
  };

  const toggleSave = (parkId: string) => {
    setSavedParks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parkId)) {
        newSet.delete(parkId);
        toast({ title: "הוסר מהשמורים" });
      } else {
        newSet.add(parkId);
        toast({ title: "נשמר! 🐾" });
      }
      return newSet;
    });
  };

  const mapCenter = () => {
    const parksWithCoords = filteredParks.filter(p => p.latitude && p.longitude);
    if (parksWithCoords.length === 0) {
      return { lat: 32.0853, lng: 34.7818 };
    }
    
    const avgLat = parksWithCoords.reduce((sum, p) => sum + (p.latitude || 0), 0) / parksWithCoords.length;
    const avgLng = parksWithCoords.reduce((sum, p) => sum + (p.longitude || 0), 0) / parksWithCoords.length;
    
    return { lat: avgLat, lng: avgLng };
  };

  // Featured parks (top rated)
  const featuredParks = parks
    .filter(p => p.rating && p.rating >= 4)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 6);

  const renderInstagramParkCard = (park: DogPark, index: number) => {
    const parkImage = parkImages[index % parkImages.length];
    const gradient = parkGradients[index % parkGradients.length];
    const isLiked = likedParks.has(park.id);
    const isSaved = savedParks.has(park.id);
    const checkins = parkCheckins[park.id] || [];
    const photos = parkPhotos[park.id] || [];

    return (
      <motion.div
        key={park.id}
        className="bg-white border-b border-gray-200"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ backgroundColor: "rgba(0,0,0,0.01)" }}
        transition={{ duration: 0.3, delay: index * 0.03 }}
      >
        {/* Post Header */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-pink-500 ring-offset-2"
            >
              <img src={parkImage} alt={park.name} className="w-full h-full object-cover" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[#262626] text-[13px] leading-tight">{park.name}</p>
                {park.verified && (
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
              <p className="text-gray-500 text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {park.city} • {getSizeLabel(park.size)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {checkins.length > 0 && (
              <motion.button
                onClick={() => {
                  setSelectedParkForCheckins(park);
                  setCheckinsDialogOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 rounded-full"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-emerald-600 text-xs font-semibold">{checkins.length}</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Post Image - Park Visual */}
        <div 
          className="relative cursor-pointer select-none"
          onClick={() => {
            setSelectedParkForReview(park);
            setReviewsListOpen(true);
          }}
        >
          <div className="w-full aspect-square relative overflow-hidden">
            {/* Actual Park Image */}
            <img 
              src={parkImage} 
              alt={park.name}
              className="w-full h-full object-cover"
            />
            
            {/* Dark Gradient Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            
            {/* Park Info Overlay - Bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <h3 className="font-black text-xl drop-shadow-lg mb-1">{park.name}</h3>
                <p className="text-white/90 text-sm flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {park.address}
                </p>
              </motion.div>
            </div>

            {/* Rating Badge - Top Right */}
            {park.rating && park.rating > 0 && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg"
              >
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-gray-900">{park.rating.toFixed(1)}</span>
                <span className="text-gray-500 text-xs">({park.total_reviews})</span>
              </motion.div>
            )}

            {/* Who's Here Avatars on Image */}
            {checkins.length > 0 && (
              <div className="absolute bottom-16 right-4 flex -space-x-2 rtl:space-x-reverse">
                {checkins.slice(0, 4).map((checkin) => (
                  <Avatar key={checkin.id} className="w-9 h-9 border-2 border-white shadow-lg">
                    <AvatarImage src={checkin.pet?.avatar_url || checkin.profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs">
                      {checkin.pet?.name?.[0] || '🐕'}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {checkins.length > 4 && (
                  <div className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-lg">
                    +{checkins.length - 4}
                  </div>
                )}
              </div>
            )}

            {/* Facilities Icons - Top Left */}
            <div className="absolute top-4 left-4 flex gap-1.5">
              {park.fencing && (
                <div className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md">
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
              )}
              {park.water && (
                <div className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md">
                  <Droplets className="w-4 h-4 text-blue-500" />
                </div>
              )}
              {park.shade && (
                <div className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md">
                  <Trees className="w-4 h-4 text-green-600" />
                </div>
              )}
              {park.agility && (
                <div className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md">
                  <Activity className="w-4 h-4 text-purple-600" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Post Actions */}
        <div className="px-3 pt-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <motion.button 
                onClick={() => toggleLike(park.id)}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.8 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="p-1 rounded-full hover:bg-red-50 transition-colors duration-200"
              >
                <Heart 
                  className={`w-6 h-6 transition-colors ${isLiked ? 'fill-[#ED4956] text-[#ED4956]' : 'text-[#262626]'}`}
                />
              </motion.button>
              
              <motion.button 
                className="text-[#262626] p-1 rounded-full hover:bg-blue-50 transition-colors duration-200"
                onClick={() => {
                  setSelectedParkForReview(park);
                  setReviewsListOpen(true);
                }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.8 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <MessageSquare className="w-6 h-6" strokeWidth={1.5} />
              </motion.button>
              
              <motion.button 
                className="text-[#262626] p-1 rounded-full hover:bg-gray-50 transition-colors duration-200"
                onClick={() => openInMaps(park)}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.8 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <ExternalLink className="w-6 h-6" strokeWidth={1.5} />
              </motion.button>
            </div>
            
            <motion.button 
              onClick={() => toggleSave(park.id)}
              className="text-[#262626] p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Bookmark 
                className={`w-6 h-6 ${isSaved ? 'fill-[#262626]' : ''}`}
                strokeWidth={1.5}
              />
            </motion.button>
          </div>

          {/* Likes & Who's Here */}
          <div className="mb-2">
            {checkins.length > 0 && (
              <button
                onClick={() => {
                  setSelectedParkForCheckins(park);
                  setCheckinsDialogOpen(true);
                }}
                className="text-sm mb-1 flex items-center gap-1"
              >
                <span className="font-semibold text-[#262626]">{checkins.length} כלבים</span>
                <span className="text-emerald-600">כאן עכשיו</span>
                <span className="text-2xl">🐾</span>
              </button>
            )}
            {isLiked && (
              <p className="text-sm font-semibold text-[#262626]">אהבת את הגינה הזו ❤️</p>
            )}
          </div>

          {/* User Photos Section */}
          {photos.length > 0 && (
            <div className="mb-3">
              <button
                onClick={() => {
                  setSelectedParkForGallery(park);
                  setPhotoGalleryOpen(true);
                }}
                className="flex items-center gap-2 mb-2"
              >
                <Image className="w-4 h-4 text-[#0095F6]" />
                <span className="text-sm font-semibold text-[#262626]">{photos.length} תמונות מהגינה</span>
              </button>
              <div className="flex gap-1 overflow-x-auto pb-1">
                {photos.slice(0, 4).map((photo, idx) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => {
                      setSelectedParkForGallery(park);
                      setPhotoGalleryOpen(true);
                    }}
                    className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
                  </motion.div>
                ))}
                {photos.length > 4 && (
                  <div 
                    onClick={() => {
                      setSelectedParkForGallery(park);
                      setPhotoGalleryOpen(true);
                    }}
                    className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-gray-300 transition-colors"
                  >
                    <span className="text-sm font-bold text-gray-600">+{photos.length - 4}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upload Photo Button */}
          {user && (
            <motion.button
              onClick={() => {
                setSelectedParkForGallery(park);
                photoInputRef.current?.click();
              }}
              className="flex items-center gap-2 text-[#0095F6] text-sm font-semibold mb-2 hover:text-[#1877F2] transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Camera className="w-4 h-4" />
              הוסף תמונה מהגינה
            </motion.button>
          )}

          {/* Caption - Park Info */}
          <div className="mb-2">
            <p className="text-sm text-[#262626]">
              <span className="font-semibold">{park.city}</span>
              {' '}
              {park.notes || `גינת כלבים ${getSizeLabel(park.size)} ב${park.address}`}
            </p>
          </div>

          {/* Hashtags - Facilities */}
          <div className="flex flex-wrap gap-1 mb-2">
            {park.fencing && <span className="text-sm text-[#00376B]">#גדור</span>}
            {park.water && <span className="text-sm text-[#00376B]">#מים</span>}
            {park.shade && <span className="text-sm text-[#00376B]">#צל</span>}
            {park.agility && <span className="text-sm text-[#00376B]">#אג׳יליטי</span>}
            {park.lighting && <span className="text-sm text-[#00376B]">#תאורה</span>}
            {park.parking && <span className="text-sm text-[#00376B]">#חניה</span>}
          </div>

          {/* Time */}
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-3">
            <Clock className="w-3 h-3 inline ml-1" />
            פתוח 24/7
          </p>

          {/* Action Buttons - Check-in Style */}
          <div className="flex gap-2 pb-3">
            {user && (
              userCheckin?.park_id === park.id ? (
                <Button
                  onClick={handleCheckout}
                  size="sm"
                  className="flex-1 bg-[#ED4956] hover:bg-[#DC2743] text-white rounded-lg font-semibold text-sm"
                >
                  <LogOut className="w-4 h-4 ml-1" />
                  צ'ק-אאוט
                </Button>
              ) : !userCheckin && (
                <Button
                  onClick={() => {
                    setSelectedParkForCheckin(park);
                    setCheckinDialogOpen(true);
                  }}
                  size="sm"
                  className="flex-1 bg-[#0095F6] hover:bg-[#1877F2] text-white rounded-lg font-semibold text-sm"
                >
                  <LogIn className="w-4 h-4 ml-1" />
                  צ'ק-אין
                </Button>
              )
            )}
            <Button
              onClick={() => {
                setSelectedParkForReview(park);
                setReviewDialogOpen(true);
              }}
              size="sm"
              variant="outline"
              className="flex-1 border-gray-300 rounded-lg font-semibold text-sm hover:bg-gray-50"
            >
              <Star className="w-4 h-4 ml-1" />
              דרג
            </Button>
            <Button
              onClick={() => openInMaps(park)}
              size="sm"
              variant="outline"
              className="border-gray-300 rounded-lg font-semibold text-sm hover:bg-gray-50 px-3"
            >
              <MapPin className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  };

  const activeFiltersCount = [filterFencing, filterWater, filterShade].filter(Boolean).length + 
    (selectedCity !== "all" ? 1 : 0) + 
    (selectedSize !== "all" ? 1 : 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24" dir="rtl">
      <AppHeader 
        title="גינות כלבים" 
        showBackButton={true}
        showMenuButton={false}
      />
      
      {/* Stories-style Featured Parks */}
      {featuredParks.length > 0 && !loading && (
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            גינות מומלצות
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {featuredParks.map((park, index) => {
              const parkImage = parkImages[index % parkImages.length];
              return (
                <motion.button
                  key={park.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => {
                    setSelectedParkForReview(park);
                    setReviewsListOpen(true);
                  }}
                  className="flex-shrink-0 text-center group"
                >
                  <div className="w-16 h-16 rounded-full p-0.5 ring-2 ring-offset-2 ring-transparent group-hover:ring-amber-400 transition-all bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500">
                    <div className="w-full h-full rounded-full overflow-hidden">
                      <img src={parkImage} alt={park.name} className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-700 mt-1 font-medium truncate w-16">{park.name.split(' ')[0]}</p>
                  <div className="flex items-center justify-center gap-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-[10px] text-gray-500">{park.rating?.toFixed(1)}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-4 pt-2">
        {/* Search Bar - Instagram Style */}
        <div className="relative mb-4">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="חיפוש גינה, עיר או כתובת..."
            className="pr-12 pl-4 py-6 rounded-2xl bg-gray-100 border-0 text-gray-900 placeholder:text-gray-500 focus:bg-white focus:ring-2 focus:ring-gray-200 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute left-4 top-1/2 -translate-y-1/2"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* View Toggle & Filters */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                viewMode === "list" 
                  ? "bg-gray-900 text-white" 
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              <List className="w-4 h-4 inline-block ml-1" />
              רשימה
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode("map")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                viewMode === "map" 
                  ? "bg-gray-900 text-white" 
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              <MapIcon className="w-4 h-4 inline-block ml-1" />
              מפה
            </motion.button>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${
              showFilters || activeFiltersCount > 0
                ? "bg-gray-900 text-white" 
                : "bg-gray-100 text-gray-700"
            }`}
          >
            <Filter className="w-4 h-4" />
            סינון
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 bg-amber-400 text-gray-900 rounded-full text-xs flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </motion.button>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4"
            >
              <Card className="p-4 border-0 shadow-lg rounded-2xl bg-white">
                <div className="space-y-4">
                  {/* City & Size Selects */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">עיר</label>
                      <Select value={selectedCity} onValueChange={setSelectedCity}>
                        <SelectTrigger className="rounded-xl border-gray-200 bg-gray-50">
                          <SelectValue placeholder="בחר עיר" />
                        </SelectTrigger>
                        <SelectContent className="bg-white z-50">
                          <SelectItem value="all">כל הערים</SelectItem>
                          {cities.map((city) => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">גודל</label>
                      <Select value={selectedSize} onValueChange={setSelectedSize}>
                        <SelectTrigger className="rounded-xl border-gray-200 bg-gray-50">
                          <SelectValue placeholder="בחר גודל" />
                        </SelectTrigger>
                        <SelectContent className="bg-white z-50">
                          <SelectItem value="all">כל הגדלים</SelectItem>
                          <SelectItem value="small">קטנה</SelectItem>
                          <SelectItem value="medium">בינונית</SelectItem>
                          <SelectItem value="large">גדולה</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Facility Toggles */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-2 block">מתקנים</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: 'fencing', label: 'גדר', state: filterFencing, setState: setFilterFencing, icon: Check, color: 'emerald' },
                        { key: 'water', label: 'מים', state: filterWater, setState: setFilterWater, icon: Droplets, color: 'blue' },
                        { key: 'shade', label: 'צל', state: filterShade, setState: setFilterShade, icon: Trees, color: 'green' },
                      ].map((filter) => (
                        <motion.button
                          key={filter.key}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => filter.setState(!filter.state)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
                            filter.state
                              ? `bg-${filter.color}-100 text-${filter.color}-700 ring-2 ring-${filter.color}-200`
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <filter.icon className="w-4 h-4" />
                          {filter.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCity("all");
                        setSelectedSize("all");
                        setFilterFencing(false);
                        setFilterWater(false);
                        setFilterShade(false);
                      }}
                      className="text-gray-500 hover:text-gray-900"
                    >
                      נקה סינון
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Count */}
        <p className="text-sm text-gray-500 mb-4">
          {loading ? "טוען..." : `נמצאו ${filteredParks.length} ${filteredParks.length === 1 ? "גינה" : "גינות"}`}
        </p>
      </div>

      {/* Content Area */}
      <div className="relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full"
            />
            <p className="text-gray-500 mt-4">טוען גינות... 🐾</p>
          </div>
        ) : filteredParks.length === 0 ? (
          <div className="text-center py-20 px-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-6xl mb-4"
            >
              🔍
            </motion.div>
            <p className="text-gray-600 font-medium mb-2">לא נמצאו גינות</p>
            <p className="text-sm text-gray-500">נסה לשנות את הסינון או החיפוש</p>
          </div>
        ) : viewMode === "list" ? (
          <div className="px-4 space-y-4">
            {filteredParks.map((park, index) => renderInstagramParkCard(park, index))}
          </div>
        ) : (
          <div className="h-[calc(100vh-320px)] w-full">
            {GOOGLE_MAPS_API_KEY ? (
              <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                <Map
                  defaultCenter={mapCenter()}
                  defaultZoom={11}
                  mapId="dog-parks-map"
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  className="w-full h-full rounded-t-3xl"
                >
                  {filteredParks
                    .filter(park => park.latitude && park.longitude)
                    .map((park, index) => (
                      <AdvancedMarker
                        key={park.id}
                        position={{ lat: park.latitude!, lng: park.longitude! }}
                        onClick={() => setSelectedPark(park.id)}
                      >
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className={`bg-gradient-to-br ${parkGradients[index % parkGradients.length]} text-white p-3 rounded-full shadow-lg`}
                        >
                          <MapPin className="w-5 h-5" />
                        </motion.div>
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
                        {renderInstagramParkCard(filteredParks.find(p => p.id === selectedPark)!, 0)}
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </APIProvider>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100 p-6 rounded-t-3xl">
                <div className="text-center">
                  <MapIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium mb-2">תצוגת המפה לא זמינה</p>
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
            fetchParks();
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

      {/* Check-in Dialog */}
      <Dialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-black">
              צ'ק-אין ב{selectedParkForCheckin?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-center text-gray-600 mb-4">בחר את חיית המחמד שאיתך (אופציונלי)</p>
            
            <div className="flex flex-wrap gap-3 justify-center mb-6">
              {userPets.map((pet) => (
                <motion.button
                  key={pet.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedPetForCheckin(selectedPetForCheckin === pet.id ? null : pet.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${
                    selectedPetForCheckin === pet.id 
                      ? 'bg-emerald-100 ring-2 ring-emerald-500' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={pet.avatar_url || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-2xl">
                      {pet.type === 'dog' ? '🐕' : '🐈'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{pet.name}</span>
                </motion.button>
              ))}
              
              {userPets.length === 0 && (
                <p className="text-gray-500 text-sm">אין לך חיות מחמד רשומות</p>
              )}
            </div>

            <Button
              onClick={handleCheckin}
              disabled={checkingIn}
              className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl font-bold py-6 text-lg"
            >
              {checkingIn ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <>
                  <LogIn className="w-5 h-5 ml-2" />
                  אישור צ'ק-אין
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Who's Here Dialog */}
      <Dialog open={checkinsDialogOpen} onOpenChange={setCheckinsDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-black flex items-center justify-center gap-2">
              <Users className="w-6 h-6 text-emerald-500" />
              מי בגינה עכשיו?
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-3">
            {selectedParkForCheckins && parkCheckins[selectedParkForCheckins.id]?.map((checkin) => (
              <motion.div
                key={checkin.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl"
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={checkin.pet?.avatar_url || checkin.profile?.avatar_url || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                    {checkin.pet?.type === 'dog' ? '🐕' : checkin.pet?.type === 'cat' ? '🐈' : '👤'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">
                    {checkin.pet?.name || checkin.profile?.full_name || 'משתמש'}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(checkin.checked_in_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-2xl">
                  {checkin.pet?.type === 'dog' ? '🐕' : checkin.pet?.type === 'cat' ? '🐈' : '🐾'}
                </div>
              </motion.div>
            ))}

            {selectedParkForCheckins && (!parkCheckins[selectedParkForCheckins.id] || parkCheckins[selectedParkForCheckins.id].length === 0) && (
              <div className="text-center py-8">
                <span className="text-4xl mb-2 block">🐕</span>
                <p className="text-gray-500">אין אף אחד בגינה כרגע</p>
                <p className="text-sm text-gray-400">היה הראשון לעשות צ'ק-אין!</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Gallery Dialog */}
      <Dialog open={photoGalleryOpen} onOpenChange={setPhotoGalleryOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-black flex items-center justify-center gap-2">
              <Image className="w-6 h-6 text-[#0095F6]" />
              תמונות מ{selectedParkForGallery?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {/* Upload Button */}
            {user && (
              <motion.button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-full mb-4 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-[#0095F6] hover:text-[#0095F6] transition-colors"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {uploadingPhoto ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-[#0095F6] border-t-transparent rounded-full"
                  />
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    העלה תמונה חדשה
                  </>
                )}
              </motion.button>
            )}

            {/* Photo Grid */}
            <div className="grid grid-cols-3 gap-1">
              {selectedParkForGallery && parkPhotos[selectedParkForGallery.id]?.map((photo, idx) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="aspect-square relative group"
                >
                  <img 
                    src={photo.photo_url} 
                    alt="" 
                    className="w-full h-full object-cover rounded-md"
                  />
                  {user && user.id === photo.user_id && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      onClick={() => handleDeletePhoto(photo)}
                      className="absolute top-1 left-1 p-1.5 bg-red-500/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </motion.button>
                  )}
                </motion.div>
              ))}
            </div>

            {selectedParkForGallery && (!parkPhotos[selectedParkForGallery.id] || parkPhotos[selectedParkForGallery.id].length === 0) && (
              <div className="text-center py-12">
                <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">אין תמונות עדיין</p>
                <p className="text-sm text-gray-400">היה הראשון להעלות תמונה מהגינה!</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={photoInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && selectedParkForGallery) {
            handlePhotoUpload(selectedParkForGallery.id, file);
          }
          e.target.value = '';
        }}
      />
    </div>
  );
};

export default Parks;
