/**
 * Radar — Interactive Neighborhood Map
 * Filter chips, custom markers, walk tracking, scientist insights
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, MapPin, Store, PawPrint, Navigation, Clock, Star,
  Truck, Shield, Locate, TreePine, Stethoscope, ShoppingBag, Users,
  Play, Square, Footprints, Sparkles, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOverlayNav } from "@/contexts/OverlayNavContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b8b9e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2a40" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1a1a2e" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a3a55" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e0e1a" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#22223a" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1a2e1a" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#22223a" }] },
];

const DEFAULT_CENTER = { lat: 32.0853, lng: 34.7818 };

type FilterType = "all" | "parks" | "vets" | "shops" | "friends";

const FILTERS: { id: FilterType; label: string; labelHe: string; icon: typeof MapPin }[] = [
  { id: "all", label: "All", labelHe: "הכל", icon: MapPin },
  { id: "parks", label: "Parks", labelHe: "פארקים", icon: TreePine },
  { id: "vets", label: "Vets", labelHe: "וטרינרים", icon: Stethoscope },
  { id: "shops", label: "Shops", labelHe: "חנויות", icon: ShoppingBag },
  { id: "friends", label: "Friends", labelHe: "חברים", icon: Users },
];

interface BusinessPin {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  logo_url: string | null;
  rating: number | null;
  city: string | null;
  pinType: "vet" | "shop";
}

interface ParkPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  friendsCount: number;
}

interface FriendPin {
  id: string;
  name: string;
  petName: string;
  avatar_url: string | null;
  lat: number;
  lng: number;
}

const Radar = () => {
  const navigate = useNavigate();
  const { direction } = useLanguage();
  const isRtl = direction === "rtl";
  const { openPublicPet } = useOverlayNav();
  const { toast } = useToast();

  const [userLocation, setUserLocation] = useState(DEFAULT_CENTER);
  const [locationLoaded, setLocationLoaded] = useState(false);
  const [businesses, setBusinesses] = useState<BusinessPin[]>([]);
  const [parks, setParks] = useState<ParkPin[]>([]);
  const [friends, setFriends] = useState<FriendPin[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedBiz, setSelectedBiz] = useState<BusinessPin | null>(null);
  const [selectedPark, setSelectedPark] = useState<ParkPin | null>(null);
  const [isWalking, setIsWalking] = useState(false);
  const [walkDuration, setWalkDuration] = useState(0);
  const [walkDistance, setWalkDistance] = useState(0);
  const walkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const walkSessionIdRef = useRef<string | null>(null);
  const [activePetName, setActivePetName] = useState<string>("חיית המחמד");

  // Get user location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationLoaded(true);
        },
        () => setLocationLoaded(true),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setLocationLoaded(true);
    }
  }, []);

  // Get active pet name
  useEffect(() => {
    const loadPet = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("pets" as any)
        .select("name")
        .eq("owner_id", user.id)
        .eq("archived", false)
        .limit(1)
        .single();
      if (data) setActivePetName((data as any).name);
    };
    loadPet();
  }, []);

  // Fetch businesses (vets + shops)
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("business_profiles")
        .select("id, business_name, business_type, city, logo_url, rating")
        .eq("is_verified", true)
        .limit(30);

      if (data) {
        const pins: BusinessPin[] = (data as any[]).map((b) => ({
          id: b.id,
          name: b.business_name,
          type: b.business_type,
          lat: userLocation.lat + (Math.random() - 0.5) * 0.04,
          lng: userLocation.lng + (Math.random() - 0.5) * 0.04,
          logo_url: b.logo_url,
          rating: b.rating,
          city: b.city,
          pinType: ["vet", "veterinarian", "clinic"].some(v => b.business_type?.toLowerCase().includes(v)) ? "vet" as const : "shop" as const,
        }));
        setBusinesses(pins);
      }
    };
    load();
  }, [userLocation]);

  // Simulated parks near user
  useEffect(() => {
    const parkNames = isRtl
      ? ["פארק הירקון", "גן מאיר", "פארק הכלבים", "גינת לוינסקי", "פארק צ׳ארלס קלור"]
      : ["Yarkon Park", "Meir Garden", "Dog Park", "Levinsky Garden", "Charles Clore Park"];
    const simParks: ParkPin[] = parkNames.map((name, i) => ({
      id: `park-${i}`,
      name,
      lat: userLocation.lat + (Math.random() - 0.5) * 0.03,
      lng: userLocation.lng + (Math.random() - 0.5) * 0.03,
      friendsCount: Math.floor(Math.random() * 5),
    }));
    setParks(simParks);
  }, [userLocation, isRtl]);

  // Fetch friends on active walks
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("walk_sessions" as any)
        .select("id, user_id, lat, lng, pet_id")
        .eq("is_active", true)
        .neq("user_id", user.id);

      if (data && (data as any[]).length > 0) {
        const friendPins: FriendPin[] = (data as any[]).map((w, i) => ({
          id: w.id,
          name: `Friend ${i + 1}`,
          petName: `Pet`,
          avatar_url: null,
          lat: w.lat || userLocation.lat + (Math.random() - 0.5) * 0.02,
          lng: w.lng || userLocation.lng + (Math.random() - 0.5) * 0.02,
        }));
        setFriends(friendPins);
      } else {
        // Simulated friends for demo
        setFriends([
          { id: "f1", name: isRtl ? "דנה" : "Dana", petName: isRtl ? "לולו" : "Lulu", avatar_url: null, lat: userLocation.lat + 0.005, lng: userLocation.lng + 0.003 },
          { id: "f2", name: isRtl ? "יוסי" : "Yossi", petName: isRtl ? "רקס" : "Rex", avatar_url: null, lat: userLocation.lat - 0.004, lng: userLocation.lng + 0.006 },
        ]);
      }
    };
    load();
  }, [userLocation, isRtl]);

  // Walk tracking
  const startWalk = useCallback(async () => {
    haptic("medium");
    setIsWalking(true);
    setWalkDuration(0);
    setWalkDistance(0);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("walk_sessions" as any)
        .insert({
          user_id: user.id,
          lat: userLocation.lat,
          lng: userLocation.lng,
          is_active: true,
        } as any)
        .select()
        .single();
      if (data) walkSessionIdRef.current = (data as any).id;
    }

    walkIntervalRef.current = setInterval(() => {
      setWalkDuration(d => d + 1);
      setWalkDistance(d => d + Math.random() * 5);
    }, 1000);

    toast({
      title: isRtl ? `🐾 ${activePetName} יצא לטיול!` : `🐾 ${activePetName} is on a walk!`,
      description: isRtl ? "החברים שלך יכולים לראות אותך במפה" : "Your friends can see you on the map",
    });
  }, [userLocation, activePetName, isRtl, toast]);

  const stopWalk = useCallback(async () => {
    haptic("medium");
    setIsWalking(false);
    if (walkIntervalRef.current) clearInterval(walkIntervalRef.current);

    const pointsEarned = Math.floor(walkDistance / 10);

    if (walkSessionIdRef.current) {
      await supabase
        .from("walk_sessions" as any)
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          distance_meters: Math.round(walkDistance),
          points_earned: pointsEarned,
        } as any)
        .eq("id", walkSessionIdRef.current);
      walkSessionIdRef.current = null;
    }

    toast({
      title: isRtl ? "🏆 הטיול הסתיים!" : "🏆 Walk complete!",
      description: isRtl
        ? `${Math.round(walkDistance)}מ׳ · ${pointsEarned} נקודות!`
        : `${Math.round(walkDistance)}m · ${pointsEarned} points earned!`,
    });
  }, [walkDistance, isRtl, toast]);

  useEffect(() => {
    return () => { if (walkIntervalRef.current) clearInterval(walkIntervalRef.current); };
  }, []);

  const recenter = useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
    haptic("light");
  }, []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // Visibility
  const showParks = activeFilter === "all" || activeFilter === "parks";
  const showVets = activeFilter === "all" || activeFilter === "vets";
  const showShops = activeFilter === "all" || activeFilter === "shops";
  const showFriends = activeFilter === "all" || activeFilter === "friends";

  if (!GOOGLE_MAPS_KEY) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-8 text-center bg-background">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)}
          className="absolute top-4 w-9 h-9 rounded-full flex items-center justify-center bg-muted/60"
          style={{ [isRtl ? "right" : "left"]: "16px", top: "calc(12px + env(safe-area-inset-top))" }}
        >
          <ChevronLeft className={`w-5 h-5 text-foreground ${isRtl ? "rotate-180" : ""}`} />
        </motion.button>
        <Navigation className="w-16 h-16 text-primary mb-4" />
        <h2 className="text-lg font-bold text-foreground mb-2">{isRtl ? "מפת השכונה" : "Neighborhood Map"}</h2>
        <p className="text-sm text-muted-foreground max-w-[260px]">
          {isRtl ? "המפה תהיה זמינה בקרוב." : "Map coming soon."}
        </p>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/explore")}
          className="mt-6 px-6 py-2.5 rounded-xl text-sm font-bold text-primary-foreground bg-primary"
        >
          {isRtl ? "גלה עכשיו" : "Explore Now"}
        </motion.button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-20 px-4 pt-[calc(12px+env(safe-area-inset-top))] pb-2"
        style={{ background: "linear-gradient(to bottom, hsla(var(--background) / 0.95) 0%, transparent 100%)" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/60 backdrop-blur-xl border border-border/30"
          >
            <ChevronLeft className={`w-5 h-5 text-foreground ${isRtl ? "rotate-180" : ""}`} />
          </motion.button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground flex items-center gap-2">
              <Navigation className="w-4 h-4 text-primary" />
              {isRtl ? "מפת השכונה" : "Neighborhood Map"}
            </h1>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={recenter}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/60 backdrop-blur-xl border border-border/30"
          >
            <Locate className="w-4 h-4 text-foreground" />
          </motion.button>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" dir={direction}>
          {FILTERS.map((f) => {
            const Icon = f.icon;
            const isActive = activeFilter === f.id;
            return (
              <motion.button
                key={f.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => { haptic("light"); setActiveFilter(f.id); }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                    : "bg-card/80 text-muted-foreground border-border/30 backdrop-blur-sm"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {isRtl ? f.labelHe : f.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <APIProvider apiKey={GOOGLE_MAPS_KEY}>
        <Map
          defaultCenter={userLocation}
          defaultZoom={14}
          gestureHandling="greedy"
          disableDefaultUI
          mapId="radar-dark-map"
          className="w-full h-full"
          styles={DARK_MAP_STYLE}
        >
          {/* User Location */}
          <AdvancedMarker position={userLocation}>
            <div className="relative">
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ width: 80, height: 80, background: "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)", border: "1px solid hsl(var(--primary) / 0.2)" }}
                animate={{ scale: [0.3, 1.8], opacity: [0.8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
              />
              <div className={`w-5 h-5 rounded-full bg-primary border-[3px] border-primary-foreground shadow-lg relative z-10 ${isWalking ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`} />
            </div>
          </AdvancedMarker>

          {/* Parks */}
          {showParks && parks.map((park) => (
            <AdvancedMarker key={park.id} position={{ lat: park.lat, lng: park.lng }}>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { haptic("light"); setSelectedPark(park); setSelectedBiz(null); }}
                className="flex flex-col items-center"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-emerald-500 border-2 border-emerald-300/50">
                  <TreePine className="w-5 h-5 text-white" strokeWidth={1.5} />
                </div>
                <div className="mt-1 px-2 py-0.5 rounded-full text-[9px] font-semibold text-foreground bg-card/90 backdrop-blur-sm max-w-[80px] truncate border border-border/20">
                  {park.name}
                </div>
              </motion.button>
            </AdvancedMarker>
          ))}

          {/* Vets */}
          {showVets && businesses.filter(b => b.pinType === "vet").map((biz) => (
            <AdvancedMarker key={biz.id} position={{ lat: biz.lat, lng: biz.lng }}>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { haptic("light"); setSelectedBiz(biz); setSelectedPark(null); }}
                className="flex flex-col items-center"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border-2 border-blue-300/50"
                  style={{ background: "linear-gradient(135deg, hsl(210 80% 55%), hsl(210 80% 40%))" }}
                >
                  {biz.logo_url ? (
                    <img src={biz.logo_url} alt="" className="w-6 h-6 rounded object-cover" />
                  ) : (
                    <Stethoscope className="w-5 h-5 text-white" strokeWidth={1.5} />
                  )}
                </div>
                {biz.rating != null && biz.rating > 0 && (
                  <div className="mt-0.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/90 text-[8px] font-bold text-white">
                    <Star className="w-2.5 h-2.5 fill-white" /> {biz.rating.toFixed(1)}
                  </div>
                )}
                <div className="mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-semibold text-foreground bg-card/90 backdrop-blur-sm max-w-[80px] truncate border border-border/20">
                  {biz.name}
                </div>
              </motion.button>
            </AdvancedMarker>
          ))}

          {/* Shops */}
          {showShops && businesses.filter(b => b.pinType === "shop").map((biz) => (
            <AdvancedMarker key={biz.id} position={{ lat: biz.lat, lng: biz.lng }}>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { haptic("light"); setSelectedBiz(biz); setSelectedPark(null); }}
                className="flex flex-col items-center"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border-2 border-primary/30"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" }}
                >
                  {biz.logo_url ? (
                    <img src={biz.logo_url} alt="" className="w-6 h-6 rounded object-cover" />
                  ) : (
                    <ShoppingBag className="w-5 h-5 text-white" strokeWidth={1.5} />
                  )}
                </div>
                {biz.rating != null && biz.rating > 0 && (
                  <div className="mt-0.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/90 text-[8px] font-bold text-white">
                    <Star className="w-2.5 h-2.5 fill-white" /> {biz.rating.toFixed(1)}
                  </div>
                )}
                <div className="mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-semibold text-foreground bg-card/90 backdrop-blur-sm max-w-[80px] truncate border border-border/20">
                  {biz.name}
                </div>
              </motion.button>
            </AdvancedMarker>
          ))}

          {/* Friends on walks */}
          {showFriends && friends.map((f) => (
            <AdvancedMarker key={f.id} position={{ lat: f.lat, lng: f.lng }}>
              <motion.button
                whileTap={{ scale: 0.85 }}
                className="relative"
              >
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-primary/40"
                  style={{ width: 44, height: 44, top: -4, left: -4 }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.2, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <Avatar className="w-9 h-9 border-2 border-primary shadow-lg shadow-primary/30">
                  {f.avatar_url ? <AvatarImage src={f.avatar_url} className="object-cover" /> : null}
                  <AvatarFallback className="bg-card text-foreground text-[10px] font-bold">
                    {f.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-card/90 backdrop-blur-sm text-[8px] font-semibold text-foreground border border-border/20 whitespace-nowrap flex items-center gap-1">
                  <Footprints className="w-2.5 h-2.5 text-primary" />
                  {f.petName}
                </div>
              </motion.button>
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>

      {/* Business Detail Card */}
      <AnimatePresence>
        {selectedBiz && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute bottom-28 inset-x-4 z-30 rounded-2xl overflow-hidden bg-card/95 backdrop-blur-xl border border-border/30"
          >
            <div className="p-4 flex items-start gap-3" dir={direction}>
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 border border-primary/20">
                {selectedBiz.logo_url ? (
                  <img src={selectedBiz.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                ) : selectedBiz.pinType === "vet" ? (
                  <Stethoscope className="w-7 h-7 text-primary" />
                ) : (
                  <Store className="w-7 h-7 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground truncate">{selectedBiz.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{selectedBiz.type}</p>
                <div className="flex items-center gap-3 mt-2">
                  {selectedBiz.rating != null && selectedBiz.rating > 0 && (
                    <span className="flex items-center gap-1 text-xs text-amber-500">
                      <Star className="w-3 h-3 fill-amber-500" /> {selectedBiz.rating.toFixed(1)}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" /> {isRtl ? "15-25 דקות" : "15-25 min"}
                  </span>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { haptic("light"); navigate(`/business/${selectedBiz.id}`); }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-primary-foreground bg-primary shrink-0"
              >
                {isRtl ? "צפה" : "View"}
              </motion.button>
            </div>
            <button onClick={() => setSelectedBiz(null)} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-muted/60 flex items-center justify-center">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Park Scientist Insight Card */}
      <AnimatePresence>
        {selectedPark && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute bottom-28 inset-x-4 z-30 rounded-2xl overflow-hidden bg-card/95 backdrop-blur-xl border border-border/30"
          >
            <div className="p-4" dir={direction}>
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/15 border border-emerald-500/20">
                  <TreePine className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground">{selectedPark.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" /> {selectedPark.friendsCount} {isRtl ? "חברים" : "friends"}
                    </span>
                  </div>
                </div>
              </div>
              {/* Scientist Insight */}
              <motion.div
                className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-2.5"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-primary mb-0.5">{isRtl ? "תובנת המדען" : "Scientist Insight"}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isRtl
                      ? `${selectedPark.friendsCount > 0 ? `${selectedPark.friendsCount} מחברי ${activePetName} כאן עכשיו!` : `אף אחד מחברי ${activePetName} לא כאן כרגע. תהיה הראשון!`}`
                      : `${selectedPark.friendsCount > 0 ? `${selectedPark.friendsCount} of ${activePetName}'s friends are here right now!` : `None of ${activePetName}'s friends are here yet. Be the first!`}`
                    }
                  </p>
                </div>
              </motion.div>
            </div>
            <button onClick={() => setSelectedPark(null)} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-muted/60 flex items-center justify-center">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Walk Status Banner */}
      <AnimatePresence>
        {isWalking && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="absolute top-[calc(110px+env(safe-area-inset-top))] inset-x-4 z-20 rounded-2xl bg-primary/90 backdrop-blur-xl p-3 flex items-center gap-3"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Footprints className="w-5 h-5 text-primary-foreground" />
            </motion.div>
            <div className="flex-1">
              <p className="text-xs font-bold text-primary-foreground">{isRtl ? "בטיול עם" : "Walking with"} {activePetName}</p>
              <p className="text-[10px] text-primary-foreground/70">
                {formatDuration(walkDuration)} · {Math.round(walkDistance)}{isRtl ? "מ׳" : "m"}
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={stopWalk}
              className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center"
            >
              <Square className="w-4 h-4 text-primary-foreground" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start Walk FAB */}
      {!isWalking && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={startWalk}
          className="absolute bottom-24 right-4 z-20 flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 font-bold text-sm"
        >
          <Play className="w-4 h-4" />
          {isRtl ? "התחל טיול" : "Start Walk"}
        </motion.button>
      )}

      {/* Legend */}
      <div className="absolute bottom-[72px] inset-x-0 z-20 flex items-center justify-center gap-4 py-2 px-4"
        style={{ background: "linear-gradient(to top, hsl(var(--background) / 0.95) 0%, transparent 100%)" }}
      >
        <LegendItem icon={<TreePine className="w-3 h-3" />} label={isRtl ? "פארקים" : "Parks"} color="text-emerald-500" />
        <LegendItem icon={<Stethoscope className="w-3 h-3" />} label={isRtl ? "וטרינרים" : "Vets"} color="text-blue-500" />
        <LegendItem icon={<ShoppingBag className="w-3 h-3" />} label={isRtl ? "חנויות" : "Shops"} color="text-primary" />
        <LegendItem icon={<PawPrint className="w-3 h-3" />} label={isRtl ? "חברים" : "Friends"} color="text-primary" />
      </div>
    </div>
  );
};

function LegendItem({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <span className={color}>{icon}</span>
      {label}
    </div>
  );
}

export default Radar;
