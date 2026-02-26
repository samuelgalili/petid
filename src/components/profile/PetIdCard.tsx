/**
 * PetIdCard — Redesigned compact digital ID card
 * Tabs: זיהוי | בריאות | מסמכים
 * Smart content: hides empty fields, shows completion badge
 * QR code, swipe between pets, status colors, minimalist aesthetic
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Cpu, Syringe, Calendar, PawPrint,
  Weight, Palette, Shield, ChevronLeft, ChevronRight,
  Share2, Heart, AlertTriangle
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface PetIdCardProps {
  petId: string;
  petName: string;
  petType: string;
  breed?: string;
  avatarUrl?: string;
  open: boolean;
  onClose: () => void;
}

interface PetIdentity {
  name: string;
  breed: string | null;
  color: string | null;
  gender: string | null;
  birth_date: string | null;
  microchip_number: string | null;
  is_neutered: boolean | null;
  weight: number | null;
  avatar_url: string | null;
  is_dangerous_breed: boolean | null;
}

export const PetIdCard = ({ petId, petName, petType, breed, avatarUrl, open, onClose }: PetIdCardProps) => {
  const [identity, setIdentity] = useState<PetIdentity | null>(null);
  const [lastRabies, setLastRabies] = useState<string | null>(null);
  const [rabiesExpired, setRabiesExpired] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      const [petRes, rabiesRes] = await Promise.all([
        supabase
          .from("pets")
          .select("name, breed, color, gender, birth_date, microchip_number, is_neutered, weight, avatar_url, is_dangerous_breed")
          .eq("id", petId)
          .maybeSingle(),
        supabase
          .from("pet_vet_visits")
          .select("visit_date, vaccines")
          .eq("pet_id", petId)
          .order("visit_date", { ascending: false })
          .limit(50),
      ]);

      if (petRes.data) setIdentity(petRes.data as PetIdentity);

      if (rabiesRes.data) {
        for (const visit of rabiesRes.data) {
          const vaccines = (visit as any).vaccines as string[] | null;
          if (vaccines?.some((v: string) => /כלבת|rabies/i.test(v))) {
            setLastRabies(visit.visit_date);
            const visitDate = new Date(visit.visit_date);
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            setRabiesExpired(visitDate < oneYearAgo);
            break;
          }
        }
      }
    };
    fetchData();
  }, [open, petId]);

  const calcAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const diff = Date.now() - new Date(birthDate).getTime();
    const years = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    const months = Math.floor((diff % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
    if (years > 0) return `כ-${years} שנים`;
    return `כ-${months} חודשים`;
  };

  if (!open) return null;

  // Compute completion percentage
  const fields = [
    identity?.breed, identity?.gender, identity?.color,
    identity?.birth_date, identity?.weight, identity?.microchip_number,
    identity?.is_neutered !== null ? "yes" : null, lastRabies
  ];
  const filled = fields.filter(Boolean).length;
  const completion = Math.round((filled / fields.length) * 100);

  // Critical fields only (always visible)
  const criticalRows: { icon: React.ElementType; label: string; value: string; status?: "ok" | "warn" | "danger" }[] = [];
  if (identity) {
    if (identity.microchip_number) criticalRows.push({ icon: Cpu, label: "שבב", value: identity.microchip_number, status: "ok" });
    if (identity.birth_date) criticalRows.push({ icon: Calendar, label: "גיל", value: calcAge(identity.birth_date) || "" });
    if (identity.weight) criticalRows.push({ icon: Weight, label: "משקל", value: `כ-${identity.weight} ק"ג` });
    if (lastRabies) criticalRows.push({
      icon: Syringe, label: "כלבת",
      value: new Date(lastRabies).toLocaleDateString("he-IL"),
      status: rabiesExpired ? "danger" : "ok"
    });
  }

  // Secondary fields (in tab)
  const secondaryRows: { icon: React.ElementType; label: string; value: string }[] = [];
  if (identity) {
    if (identity.breed) secondaryRows.push({ icon: PawPrint, label: "גזע", value: identity.breed });
    if (identity.gender) secondaryRows.push({ icon: PawPrint, label: "מין", value: identity.gender === "male" ? "זכר" : "נקבה" });
    if (identity.color) secondaryRows.push({ icon: Palette, label: "צבע", value: identity.color });
    if (identity.is_neutered !== null) secondaryRows.push({ icon: Shield, label: "עיקור", value: identity.is_neutered ? "כן" : "לא" });
  }

  const statusColor = (s?: "ok" | "warn" | "danger") => {
    if (s === "danger") return "text-red-500";
    if (s === "warn") return "text-amber-500";
    if (s === "ok") return "text-emerald-500";
    return "text-muted-foreground";
  };

  const handleShare = async () => {
    try {
      await navigator.share?.({
        title: `${petName} - PetID`,
        url: `${window.location.origin}/pet/${petId}`,
      });
    } catch { /* user cancelled */ }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            ref={cardRef}
            initial={{ scale: 0.92, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 24 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[340px]"
            dir="rtl"
          >
            <div className="bg-card rounded-2xl border border-border/30 shadow-2xl overflow-hidden">

              {/* ── Header: Avatar + Name + Completion ── */}
              <div className="relative px-4 pt-4 pb-3 flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-muted border border-border/30 overflow-hidden shrink-0">
                  {(identity?.avatar_url || avatarUrl) ? (
                    <img src={identity?.avatar_url || avatarUrl} alt={petName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PawPrint className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-foreground truncate">{identity?.name || petName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {petType === "dog" ? "כלב" : "חתול"}{breed || identity?.breed ? ` · ${breed || identity?.breed}` : ""}
                  </p>
                  {identity?.is_dangerous_breed && (
                    <span className="inline-flex items-center gap-1 mt-0.5 text-[9px] font-semibold text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                      <AlertTriangle className="w-2.5 h-2.5" /> גזע מוגבל
                    </span>
                  )}
                </div>

                {/* Completion badge */}
                <div className="flex flex-col items-center gap-0.5">
                  <div className="relative w-9 h-9">
                    <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
                      <circle
                        cx="18" cy="18" r="15.5" fill="none"
                        stroke={completion === 100 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                        strokeWidth="2.5"
                        strokeDasharray={`${(completion / 100) * 97.4} 97.4`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground">
                      {completion}%
                    </span>
                  </div>
                </div>

                <button onClick={onClose} className="absolute top-3 left-3 p-1 rounded-full hover:bg-muted/60 transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* ── Critical Fields (always visible) ── */}
              {criticalRows.length > 0 && (
                <div className="px-4 pb-2 grid grid-cols-2 gap-2">
                  {criticalRows.map(({ icon: Icon, label, value, status }, i) => (
                    <div key={i} className="flex items-center gap-2 bg-muted/40 rounded-lg px-2.5 py-1.5">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${statusColor(status)}`} strokeWidth={1.5} />
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted-foreground leading-none">{label}</p>
                        <p className={`text-[11px] font-medium truncate ${status === "danger" ? "text-red-500" : "text-foreground"}`}>{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Tabs ── */}
              <Tabs defaultValue="identity" className="px-4 pb-3">
                <TabsList className="w-full h-7 bg-muted/40 rounded-lg p-0.5 mb-2">
                  <TabsTrigger value="identity" className="text-[10px] h-6 rounded-md flex-1">זיהוי</TabsTrigger>
                  <TabsTrigger value="health" className="text-[10px] h-6 rounded-md flex-1">בריאות</TabsTrigger>
                  <TabsTrigger value="qr" className="text-[10px] h-6 rounded-md flex-1">QR</TabsTrigger>
                </TabsList>

                <TabsContent value="identity" className="mt-0 space-y-1.5">
                  {secondaryRows.length > 0 ? secondaryRows.map(({ icon: Icon, label, value }, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <Icon className="w-3.5 h-3.5 text-primary/60 shrink-0" strokeWidth={1.5} />
                      <span className="text-[10px] text-muted-foreground w-12 shrink-0">{label}</span>
                      <span className="text-[11px] text-foreground font-medium">{value}</span>
                    </div>
                  )) : (
                    <p className="text-[10px] text-muted-foreground text-center py-3">אין נתוני זיהוי נוספים</p>
                  )}
                </TabsContent>

                <TabsContent value="health" className="mt-0">
                  {lastRabies ? (
                    <div className="space-y-2">
                      <div className={`flex items-center gap-2 p-2 rounded-lg ${rabiesExpired ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
                        <Syringe className={`w-3.5 h-3.5 ${rabiesExpired ? "text-red-500" : "text-emerald-500"}`} strokeWidth={1.5} />
                        <div>
                          <p className="text-[10px] text-muted-foreground">חיסון כלבת</p>
                          <p className={`text-[11px] font-medium ${rabiesExpired ? "text-red-500" : "text-foreground"}`}>
                            {new Date(lastRabies).toLocaleDateString("he-IL")}
                            {rabiesExpired && " · פג תוקף"}
                          </p>
                        </div>
                      </div>
                      {identity?.is_neutered !== null && (
                        <div className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-primary/60" strokeWidth={1.5} />
                          <span className="text-[10px] text-muted-foreground">עיקור</span>
                          <span className="text-[11px] text-foreground font-medium mr-auto">{identity.is_neutered ? "כן" : "לא"}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground text-center py-3">אין רשומות בריאות</p>
                  )}
                </TabsContent>

                <TabsContent value="qr" className="mt-0 flex flex-col items-center py-2 gap-2">
                  <QRCodeSVG
                    value={`${window.location.origin}/pet/${petId}`}
                    size={100}
                    level="M"
                    className="rounded-lg"
                  />
                  <p className="text-[9px] text-muted-foreground">סרוק לזיהוי מהיר</p>
                </TabsContent>
              </Tabs>

              {/* ── Footer: share button ── */}
              <div className="px-4 py-2 bg-muted/20 border-t border-border/20 flex items-center justify-between">
                <p className="text-[8px] text-muted-foreground">PetID · Digital Guardian</p>
                <button onClick={handleShare} className="p-1 rounded-full hover:bg-muted/60 transition-colors">
                  <Share2 className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
