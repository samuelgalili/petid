/**
 * PetIdCard - Official digital ID card for the pet
 * Shows microchip, last rabies date, identity fields, and health score
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Cpu, Syringe, Calendar, PawPrint, 
  Weight, Palette, Tag, Shield, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fetch = async () => {
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

      // Find latest rabies vaccine
      if (rabiesRes.data) {
        for (const visit of rabiesRes.data) {
          const vaccines = (visit as any).vaccines as string[] | null;
          if (vaccines?.some((v: string) => /כלבת|rabies/i.test(v))) {
            setLastRabies(visit.visit_date);
            break;
          }
        }
      }
    };
    fetch();
  }, [open, petId]);

  const calcAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const diff = Date.now() - new Date(birthDate).getTime();
    const years = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    const months = Math.floor((diff % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
    if (years > 0) return `${years} שנים${months > 0 ? ` ו-${months} חודשים` : ''}`;
    return `${months} חודשים`;
  };

  if (!open) return null;

  const rows: { icon: React.ElementType; label: string; value: string }[] = [];
  if (identity) {
    if (identity.breed) rows.push({ icon: Tag, label: 'גזע', value: identity.breed });
    if (identity.gender) rows.push({ icon: PawPrint, label: 'מין', value: identity.gender === 'male' ? 'זכר' : 'נקבה' });
    if (identity.color) rows.push({ icon: Palette, label: 'צבע', value: identity.color });
    if (identity.birth_date) rows.push({ icon: Calendar, label: 'גיל', value: calcAge(identity.birth_date) || '' });
    if (identity.weight) rows.push({ icon: Weight, label: 'משקל', value: `${identity.weight} ק"ג` });
    if (identity.is_neutered !== null) rows.push({ icon: Shield, label: 'מעוקר/מסורס', value: identity.is_neutered ? 'כן' : 'לא' });
    if (identity.microchip_number) rows.push({ icon: Cpu, label: 'שבב', value: identity.microchip_number });
    if (lastRabies) rows.push({ icon: Syringe, label: 'כלבת אחרונה', value: new Date(lastRabies).toLocaleDateString("he-IL") });
  }

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
            initial={{ scale: 0.9, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm"
            dir="rtl"
          >
            {/* Card */}
            <div className="bg-card rounded-3xl border border-border/40 shadow-2xl overflow-hidden">
              {/* Header band */}
              <div className="bg-primary/10 px-5 py-4 flex items-center gap-4 border-b border-border/20">
                <div className="w-16 h-16 rounded-2xl bg-muted border-2 border-primary/20 overflow-hidden flex items-center justify-center shrink-0">
                  {(identity?.avatar_url || avatarUrl) ? (
                    <img src={identity?.avatar_url || avatarUrl} alt={petName} className="w-full h-full object-cover" />
                  ) : (
                    <PawPrint className="w-7 h-7 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-foreground truncate">{identity?.name || petName}</p>
                  <p className="text-xs text-muted-foreground">{petType === 'dog' ? 'כלב' : 'חתול'} • {breed || identity?.breed || 'לא ידוע'}</p>
                  {identity?.is_dangerous_breed && (
                    <span className="inline-block mt-1 text-[9px] font-semibold text-red-700 bg-red-500/10 px-2 py-0.5 rounded-full">
                      גזע מוגבל
                    </span>
                  )}
                </div>
                <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted/60">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Identity Rows */}
              <div className="px-5 py-4 space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">תעודת זיהוי רשמית</p>
                {rows.length > 0 ? (
                  <div className="space-y-2.5">
                    {rows.map(({ icon: Icon, label, value }, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-primary/70 shrink-0" strokeWidth={1.5} />
                        <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
                        <span className="text-sm text-foreground font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    אין נתוני זיהוי — סרוק מסמך וטרינר כדי למלא
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-muted/30 border-t border-border/20 flex items-center justify-between">
                <p className="text-[9px] text-muted-foreground">PetID • Digital Guardian</p>
                <p className="text-[9px] text-muted-foreground">{new Date().toLocaleDateString("he-IL")}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
