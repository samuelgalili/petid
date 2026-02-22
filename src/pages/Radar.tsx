/**
 * Radar — Live Map View
 * Premium dark-themed map with business pins, social pet avatars,
 * delivery tracking, and a scanning radar animation.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, MapPin, Store, PawPrint, Navigation, Clock, Star,
  Truck, Shield, Locate,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOverlayNav } from "@/contexts/OverlayNavContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// Premium dark map style
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

// Default center (Tel Aviv)
const DEFAULT_CENTER = { lat: 32.0853, lng: 34.7818 };

interface BusinessPin {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  logo_url: string | null;
  rating: number | null;
  city: string | null;
}

interface SocialPet {
  id: string;
  name: string;
  avatar_url: string | null;
  lat: number;
  lng: number;
  pet_type: string;
}

const Radar = () => {
  const navigate = useNavigate();
  const { direction } = useLanguage();
  const isRtl = direction === "rtl";
  const { openPublicPet } = useOverlayNav();

  const [userLocation, setUserLocation] = useState(DEFAULT_CENTER);
  const [locationLoaded, setLocationLoaded] = useState(false);
  const [businesses, setBusinesses] = useState<BusinessPin[]>([]);
  const [nearbyPets, setNearbyPets] = useState<SocialPet[]>([]);
  const [selectedBiz, setSelectedBiz] = useState<BusinessPin | null>(null);
  const [showRadarPulse, setShowRadarPulse] = useState(true);

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

  // Fetch businesses with locations
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("business_profiles")
        .select("id, business_name, business_type, city, logo_url, rating, address")
        .eq("is_verified", true)
        .limit(30);

      if (data) {
        // Simulate coordinates near user for businesses (in production, use geocoding)
        const pins: BusinessPin[] = (data as any[]).map((b, i) => ({
          id: b.id,
          name: b.business_name,
          type: b.business_type,
          lat: userLocation.lat + (Math.random() - 0.5) * 0.04,
          lng: userLocation.lng + (Math.random() - 0.5) * 0.04,
          logo_url: b.logo_url,
          rating: b.rating,
          city: b.city,
        }));
        setBusinesses(pins);
      }
    };
    load();
  }, [userLocation]);

  // Fetch nearby pets (simulated — using recent active profiles)
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("pets" as any)
        .select("id, name, avatar_url, type")
        .eq("archived", false)
        .limit(8);

      if (data) {
        const pets: SocialPet[] = (data as any[]).map((p) => ({
          id: p.id,
          name: p.name,
          avatar_url: p.avatar_url,
          pet_type: p.type || "dog",
          lat: userLocation.lat + (Math.random() - 0.5) * 0.025,
          lng: userLocation.lng + (Math.random() - 0.5) * 0.025,
        }));
        setNearbyPets(pets);
      }
    };
    load();
  }, [userLocation]);

  const handlePetClick = useCallback((petId: string) => {
    haptic("light");
    openPublicPet(petId);
    navigate("/", { replace: true });
  }, [openPublicPet, navigate]);

  const recenter = useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
    haptic("light");
  }, []);

  if (!GOOGLE_MAPS_KEY) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-8 text-center" style={{ background: "hsl(240,20%,8%)" }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          className="absolute top-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            [isRtl ? "right" : "left"]: "16px",
            background: "rgba(255,255,255,0.08)",
            top: "calc(12px + env(safe-area-inset-top))",
          }}
        >
          <ChevronLeft className={`w-5 h-5 text-white ${isRtl ? "rotate-180" : ""}`} />
        </motion.button>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center"
        >
          <div className="relative mb-6">
            <Navigation className="w-16 h-16 text-primary" />
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ width: 100, height: 100, top: -18, left: -18, border: "2px solid hsl(var(--primary) / 0.3)" }}
              animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">{isRtl ? "רדאר חי" : "Live Radar"}</h2>
          <p className="text-sm text-white/40 max-w-[260px]">
            {isRtl ? "מפת הרדאר תהיה זמינה בקרוב. בינתיים, גלה עסקים ובעלי חיים בעמוד הגילוי." : "Radar map coming soon. Discover businesses and pets on the Explore page."}
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/explore")}
            className="mt-6 px-6 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" }}
          >
            {isRtl ? "גלה עכשיו" : "Explore Now"}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[hsl(240,20%,8%)]">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center gap-3 px-4 pt-[calc(12px+env(safe-area-inset-top))] pb-3"
        style={{
          background: "linear-gradient(to bottom, hsla(240,20%,8%,0.95) 0%, transparent 100%)",
        }}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <ChevronLeft className={`w-5 h-5 text-white ${isRtl ? "rotate-180" : ""}`} />
        </motion.button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary" />
            {isRtl ? "רדאר חי" : "Live Radar"}
          </h1>
          <p className="text-xs text-white/40">
            {isRtl ? `${businesses.length} עסקים · ${nearbyPets.length} חיות קרובות` : `${businesses.length} businesses · ${nearbyPets.length} pets nearby`}
          </p>
        </div>

        {/* Recenter button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={recenter}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Locate className="w-4 h-4 text-white" />
        </motion.button>
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
          {/* ── User Location + Radar Pulse ── */}
          <AdvancedMarker position={userLocation}>
            <div className="relative">
              {/* Radar scanning animation */}
              {showRadarPulse && (
                <>
                  <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      width: 120, height: 120,
                      background: "radial-gradient(circle, hsla(var(--primary), 0.15) 0%, transparent 70%)",
                      border: "1px solid hsla(var(--primary), 0.2)",
                    }}
                    animate={{ scale: [0.3, 1.8], opacity: [0.8, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
                  />
                  <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      width: 80, height: 80,
                      background: "radial-gradient(circle, hsla(var(--primary), 0.2) 0%, transparent 70%)",
                      border: "1px solid hsla(var(--primary), 0.25)",
                    }}
                    animate={{ scale: [0.5, 2], opacity: [0.6, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
                  />
                </>
              )}
              {/* User dot */}
              <div className="w-5 h-5 rounded-full bg-primary border-[3px] border-white shadow-lg shadow-primary/40 relative z-10" />
            </div>
          </AdvancedMarker>

          {/* ── Business Pins ── */}
          {businesses.map((biz) => (
            <AdvancedMarker key={biz.id} position={{ lat: biz.lat, lng: biz.lng }}>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { haptic("light"); setSelectedBiz(biz); }}
                className="flex flex-col items-center"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
                    border: "2px solid rgba(255,255,255,0.3)",
                  }}
                >
                  {biz.logo_url ? (
                    <img src={biz.logo_url} alt="" className="w-6 h-6 rounded object-cover" />
                  ) : (
                    <Store className="w-5 h-5 text-white" strokeWidth={1.5} />
                  )}
                </div>
                <div className="mt-1 px-2 py-0.5 rounded-full text-[9px] font-semibold text-white bg-black/70 backdrop-blur-sm max-w-[80px] truncate">
                  {biz.name}
                </div>
              </motion.button>
            </AdvancedMarker>
          ))}

          {/* ── Social Pet Pins ── */}
          {nearbyPets.map((pet) => (
            <AdvancedMarker key={pet.id} position={{ lat: pet.lat, lng: pet.lng }}>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => handlePetClick(pet.id)}
                className="relative"
              >
                {/* Pulse ring */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    width: 44, height: 44,
                    top: -4, left: -4,
                    border: "2px solid hsl(var(--primary) / 0.4)",
                  }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.2, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <Avatar className="w-9 h-9 border-2 border-primary shadow-lg shadow-primary/30">
                  {pet.avatar_url ? (
                    <AvatarImage src={pet.avatar_url} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-card text-foreground text-[10px] font-bold">
                    <PawPrint className="w-3.5 h-3.5" />
                  </AvatarFallback>
                </Avatar>
              </motion.button>
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>

      {/* ── Business Detail Card ── */}
      <AnimatePresence>
        {selectedBiz && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute bottom-[90px] inset-x-4 z-30 rounded-2xl overflow-hidden"
            style={{
              background: "rgba(30,30,50,0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div className="p-4 flex items-start gap-3" dir={direction}>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.05))",
                  border: "1px solid hsl(var(--primary) / 0.2)",
                }}
              >
                {selectedBiz.logo_url ? (
                  <img src={selectedBiz.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <Store className="w-7 h-7 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{selectedBiz.name}</h3>
                <p className="text-xs text-white/50 mt-0.5 capitalize">{selectedBiz.type}</p>
                <div className="flex items-center gap-3 mt-2">
                  {selectedBiz.rating != null && selectedBiz.rating > 0 && (
                    <span className="flex items-center gap-1 text-xs text-amber-400">
                      <Star className="w-3 h-3 fill-amber-400" /> {selectedBiz.rating.toFixed(1)}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-white/40">
                    <Clock className="w-3 h-3" /> {isRtl ? "15-25 דקות" : "15-25 min"}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                    <Truck className="w-3 h-3" /> {isRtl ? "משלוח זמין" : "Delivery"}
                  </span>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  haptic("light");
                  navigate(`/business/${selectedBiz.id}`);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shrink-0"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
                }}
              >
                {isRtl ? "צפה" : "View"}
              </motion.button>
            </div>
            {/* Close */}
            <button
              onClick={() => setSelectedBiz(null)}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Legend bar ── */}
      <div
        className="absolute bottom-[72px] inset-x-0 z-20 flex items-center justify-center gap-4 py-2 px-4"
        style={{
          background: "linear-gradient(to top, hsla(240,20%,8%,0.95) 0%, transparent 100%)",
        }}
      >
        <LegendItem icon={<Store className="w-3 h-3" />} label={isRtl ? "עסקים" : "Businesses"} color="hsl(var(--primary))" />
        <LegendItem icon={<PawPrint className="w-3 h-3" />} label={isRtl ? "חיות קרובות" : "Nearby Pets"} color="hsl(var(--primary))" />
        <LegendItem icon={<div className="w-2.5 h-2.5 rounded-full bg-primary" />} label={isRtl ? "אתה כאן" : "You"} color="hsl(var(--primary))" />
      </div>
    </div>
  );
};

function LegendItem({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-white/50">
      <span style={{ color }}>{icon}</span>
      {label}
    </div>
  );
}

export default Radar;
