/**
 * Public "I Found a Pet" Page — accessed via QR scan
 * No authentication required. Shows critical pet info + safe contact options.
 */

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Phone, MessageCircle, MapPin, Stethoscope, Heart, AlertTriangle,
  Shield, Gift, Navigation, PawPrint, Cpu, ChevronDown, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

interface PetData {
  id: string;
  name: string;
  type: string;
  breed?: string;
  avatar_url?: string;
  microchip_number?: string;
  medical_conditions?: string[];
  health_notes?: string;
  color?: string;
  gender?: string;
  weight?: number;
  lost_temperament?: string;
  lost_medication_note?: string;
  lost_allergy_note?: string;
  lost_reward_text?: string;
  lost_show_phone?: boolean;
  lost_contact_phone?: string;
  lost_since?: string;
  is_lost?: boolean;
  user_id: string;
}

interface OwnerData {
  full_name?: string;
  phone?: string;
  city?: string;
}

const FoundPet = () => {
  const { petId } = useParams<{ petId: string }>();
  const [pet, setPet] = useState<PetData | null>(null);
  const [owner, setOwner] = useState<OwnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showMedical, setShowMedical] = useState(false);

  useEffect(() => {
    const fetchPet = async () => {
      if (!petId) { setNotFound(true); setLoading(false); return; }

      const { data: petData, error } = await supabase
        .from("pets")
        .select("*")
        .eq("id", petId)
        .maybeSingle();

      if (error || !petData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPet(petData as unknown as PetData);

      // Fetch owner basic info (only name + city for display, phone if allowed)
      const { data: ownerData } = await supabase
        .from("profiles")
        .select("full_name, phone, city")
        .eq("id", petData.user_id)
        .maybeSingle();

      if (ownerData) setOwner(ownerData);
      setLoading(false);
    };

    fetchPet();
  }, [petId]);

  const handleCall = () => {
    const phone = pet?.lost_contact_phone || (pet?.lost_show_phone !== false ? owner?.phone : null);
    if (phone) {
      window.open(`tel:${phone}`, "_self");
    }
  };

  const handleWhatsApp = () => {
    const phone = pet?.lost_contact_phone || (pet?.lost_show_phone !== false ? owner?.phone : null);
    if (!phone) return;

    // Try getting finder's location to send via WhatsApp
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const mapLink = `https://maps.google.com/maps?q=${latitude},${longitude}`;
          const cleanPhone = phone.replace(/[^0-9+]/g, "").replace(/^0/, "972");
          const msg = encodeURIComponent(
            `שלום! מצאתי את ${pet?.name || "חיית המחמד שלך"}. אני כאן: ${mapLink}`
          );
          window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
        },
        () => {
          // Fallback without location
          const cleanPhone = phone.replace(/[^0-9+]/g, "").replace(/^0/, "972");
          const msg = encodeURIComponent(`שלום! מצאתי את ${pet?.name || "חיית המחמד שלך"}.`);
          window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
        }
      );
    }
  };

  const handleNavigateVet = () => {
    window.open("https://www.google.com/maps/search/veterinary+clinic+near+me", "_blank");
  };

  const contactPhone = pet?.lost_contact_phone || (pet?.lost_show_phone !== false ? owner?.phone : null);
  const hasMedicalInfo = pet?.lost_temperament || pet?.lost_medication_note || pet?.lost_allergy_note || (pet?.medical_conditions && pet.medical_conditions.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6" dir="rtl">
        <SEO title="חיית מחמד לא נמצאה" description="לא נמצא מידע עבור חיית מחמד זו" url={`/found-pet/${petId}`} />
        <PawPrint className="w-16 h-16 text-muted-foreground/30 mb-4" strokeWidth={1} />
        <h1 className="text-xl font-bold text-foreground mb-2">לא נמצא מידע</h1>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          חיית המחמד הזו לא נמצאה במערכת. ייתכן שקוד ה-QR אינו תקין.
        </p>
        <Button className="mt-6" onClick={handleNavigateVet}>
          <Navigation className="w-4 h-4 ml-2" />
          נווט לווטרינר הקרוב
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SEO
        title={`מצאתי את ${pet?.name || "חיית מחמד"}`}
        description={`${pet?.name} — עזור/י להחזיר אותי הביתה`}
        url={`/found-pet/${petId}`}
      />

      {/* Hero Section */}
      <div className="relative">
        {/* Pet Photo */}
        <div className="w-full aspect-square max-h-[50vh] bg-muted relative overflow-hidden">
          {pet?.avatar_url ? (
            <img
              src={pet.avatar_url}
              alt={pet.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              <PawPrint className="w-24 h-24 text-primary/20" strokeWidth={1} />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />

          {/* Lost badge */}
          {pet?.is_lost && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-4 right-4"
            >
              <Badge className="bg-destructive text-destructive-foreground text-xs px-3 py-1.5 shadow-lg">
                <AlertTriangle className="w-3.5 h-3.5 ml-1" />
                הלכתי לאיבוד!
              </Badge>
            </motion.div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 -mt-8 relative z-10 pb-10">
        {/* Main Message Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 rounded-2xl border border-border/30 bg-card shadow-xl mb-4">
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold text-foreground mb-1">
                שלום! אני {pet?.name} 🐾
              </h1>
              <p className="text-sm text-muted-foreground">
                {pet?.is_lost
                  ? "ואולי הלכתי לאיבוד... בבקשה עזור/י לי לחזור הביתה!"
                  : "תודה שסרקת את התג שלי!"}
              </p>
            </div>

            {/* Pet Details Row */}
            <div className="flex items-center justify-center gap-3 flex-wrap mb-4">
              {pet?.breed && (
                <Badge variant="outline" className="text-[11px] gap-1">
                  <PawPrint className="w-3 h-3" strokeWidth={1.5} />
                  {pet.breed}
                </Badge>
              )}
              {pet?.color && (
                <Badge variant="outline" className="text-[11px]">
                  {pet.color}
                </Badge>
              )}
              {pet?.gender && (
                <Badge variant="outline" className="text-[11px]">
                  {pet.gender === "male" ? "זכר" : pet.gender === "female" ? "נקבה" : pet.gender}
                </Badge>
              )}
            </div>

            {/* Microchip */}
            {pet?.microchip_number && (
              <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-muted/50 border border-border/20 mb-4">
                <Cpu className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <span className="text-xs text-muted-foreground">מספר שבב:</span>
                <span className="text-xs font-mono font-bold text-foreground" dir="ltr">
                  {pet.microchip_number}
                </span>
              </div>
            )}

            {/* Lost Since */}
            {pet?.is_lost && pet?.lost_since && (
              <p className="text-[11px] text-muted-foreground text-center">
                נעדר/ת מאז: {new Date(pet.lost_since).toLocaleDateString("he-IL")}
              </p>
            )}
          </Card>
        </motion.div>

        {/* ═══ Contact Buttons ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-3 mb-4"
        >
          {contactPhone ? (
            <>
              <Button
                size="lg"
                className="w-full rounded-xl h-14 text-base font-bold gap-2 shadow-lg"
                onClick={handleCall}
              >
                <Phone className="w-5 h-5" strokeWidth={1.5} />
                התקשר/י לבעלים
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full rounded-xl h-14 text-base font-bold gap-2 border-2 border-[hsl(142,71%,45%)]/40 text-[hsl(142,71%,35%)] hover:bg-[hsl(142,71%,45%)]/10"
                onClick={handleWhatsApp}
              >
                <MessageCircle className="w-5 h-5" strokeWidth={1.5} />
                שלח/י מיקום בוואטסאפ
              </Button>
            </>
          ) : (
            <Card className="p-4 rounded-xl bg-muted/30 border border-border/20 text-center">
              <Shield className="w-6 h-6 text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-xs text-muted-foreground">
                הבעלים בחרו לשמור על פרטיות מספר הטלפון.
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                ניתן לפנות לווטרינר עם מספר השבב לאיתור הבעלים.
              </p>
            </Card>
          )}
        </motion.div>

        {/* ═══ Vital Medical Info ═══ */}
        {hasMedicalInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="rounded-2xl border border-border/30 bg-card overflow-hidden mb-4">
              <button
                onClick={() => setShowMedical(!showMedical)}
                className="w-full p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                    <Stethoscope className="w-4 h-4 text-destructive" strokeWidth={1.5} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">מידע חיוני לבטיחות</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform ${showMedical ? "rotate-180" : ""}`}
                />
              </button>

              {showMedical && (
                <div className="px-4 pb-4 space-y-2.5">
                  {pet?.lost_temperament && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/30">
                      <Heart className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                      <div>
                        <span className="text-[10px] text-muted-foreground block">מזג</span>
                        <span className="text-xs font-medium text-foreground">{pet.lost_temperament}</span>
                      </div>
                    </div>
                  )}
                  {pet?.lost_medication_note && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-warning/5 border border-warning/15">
                      <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                      <div>
                        <span className="text-[10px] text-muted-foreground block">צריך/ה תרופות</span>
                        <span className="text-xs font-medium text-foreground">{pet.lost_medication_note}</span>
                      </div>
                    </div>
                  )}
                  {pet?.lost_allergy_note && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/5 border border-destructive/15">
                      <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                      <div>
                        <span className="text-[10px] text-muted-foreground block">אלרגי/ה ל:</span>
                        <span className="text-xs font-medium text-foreground">{pet.lost_allergy_note}</span>
                      </div>
                    </div>
                  )}
                  {pet?.medical_conditions && pet.medical_conditions.length > 0 && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/30">
                      <Stethoscope className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                      <div>
                        <span className="text-[10px] text-muted-foreground block">מצבים רפואיים</span>
                        <span className="text-xs font-medium text-foreground">
                          {pet.medical_conditions.join(", ")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* ═══ Reward ═══ */}
        {pet?.lost_reward_text && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="p-4 rounded-2xl border-2 border-primary/20 bg-primary/5 mb-4 text-center">
              <Gift className="w-6 h-6 text-primary mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm font-bold text-foreground mb-1">
                הבעלים שלי מציעים פרס למוצא הישר! 🎁
              </p>
              <p className="text-xs text-muted-foreground">{pet.lost_reward_text}</p>
            </Card>
          </motion.div>
        )}

        {/* ═══ Navigate to Vet ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            variant="outline"
            size="lg"
            className="w-full rounded-xl h-12 text-sm font-semibold gap-2"
            onClick={handleNavigateVet}
          >
            <Navigation className="w-4 h-4" strokeWidth={1.5} />
            נווט/י לווטרינר הקרוב ביותר
          </Button>
        </motion.div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
            <PawPrint className="w-3 h-3" strokeWidth={1.5} />
            <span>PetID — שומרים על חיות המחמד שלנו</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoundPet;
