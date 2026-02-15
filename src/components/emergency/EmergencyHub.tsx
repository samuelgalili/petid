/**
 * EmergencyHub - Full emergency sheet with vet contacts, 
 * first-aid categories, and medical ID sharing
 */

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, MapPin, Loader2, Stethoscope, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmergencyCategory } from "./EmergencyCategory";
import { MedicalIDShare } from "./MedicalIDShare";

interface EmergencyHubProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ActivePet {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  vet_name: string | null;
  vet_clinic: string | null;
}

const EMERGENCY_CATEGORIES = [
  {
    emoji: "🤢",
    title: "הרעלה",
    subtitle: "אכל משהו רעיל (שוקולד, ענבים, רעל)",
    prompt: "הכלב/החתול שלי אכל משהו רעיל. מה עושים עכשיו?",
  },
  {
    emoji: "🩸",
    title: "פציעה / דימום",
    subtitle: "מדמם או נפצע",
    prompt: "הכלב/החתול שלי מדמם/נפצע. מה עושים עכשיו?",
  },
  {
    emoji: "🐱",
    title: "חסימת שתן",
    subtitle: "מנסה להשתין ולא מצליח",
    prompt: "החתול/הכלב שלי מנסה להשתין ולא מצליח. מה עושים?",
  },
  {
    emoji: "☀️",
    title: "מכת חום",
    subtitle: "מתנשף בכבדות, חום גוף גבוה",
    prompt: "הכלב/החתול שלי סובל ממכת חום. מתנשף בכבדות. מה עושים?",
  },
  {
    emoji: "🦷",
    title: "חנק",
    subtitle: "נחנק מעצם או צעצוע",
    prompt: "הכלב/החתול שלי נחנק מעצם/צעצוע. מה עושים?",
  },
  {
    emoji: "⚡",
    title: "פרכוס / התקף",
    subtitle: "מפרכס, לא מגיב",
    prompt: "הכלב/החתול שלי מפרכס. מה עושים בזמן ההתקף?",
  },
];

export const EmergencyHub = ({ open, onOpenChange }: EmergencyHubProps) => {
  const [activePet, setActivePet] = useState<ActivePet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    const fetchActivePet = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: pets } = await (supabase as any)
        .from("pets")
        .select("id, name, type, breed, vet_name, vet_clinic")
        .eq("owner_id", user.id)
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (pets?.length) {
        setActivePet(pets[0] as ActivePet);
      }
      setLoading(false);
    };
    fetchActivePet();
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] rounded-t-3xl p-0 bg-background border-t-2 border-destructive/30"
      >
        <SheetTitle className="sr-only">מרכז חירום</SheetTitle>

        {/* Emergency Header */}
        <div className="bg-gradient-to-b from-destructive/10 to-background px-5 pt-5 pb-3" dir="rtl">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">מרכז חירום</h2>
              <p className="text-xs text-muted-foreground">
                {activePet ? `${activePet.name} · פעולה מיידית` : "טוען..."}
              </p>
            </div>
          </div>
        </div>

        <ScrollArea className="h-[calc(92vh-80px)]">
          <div className="px-5 pb-32 space-y-4" dir="rtl">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Primary: Emergency Call */}
                <Button
                  size="lg"
                  variant="destructive"
                  className="w-full h-14 text-base font-bold gap-3 rounded-2xl shadow-lg shadow-destructive/30"
                  onClick={() => (window.location.href = "tel:*3939")}
                >
                  <Phone className="w-5 h-5" strokeWidth={2.5} />
                  חירום ארצי — *3939
                </Button>

                {/* Active Vet Quick-Dial */}
                {activePet?.vet_clinic && (
                  <div className="bg-card border border-border/30 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Stethoscope className="w-5 h-5 text-primary" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          הווטרינר של {activePet.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {activePet.vet_clinic}
                          {activePet.vet_name ? ` · ד"ר ${activePet.vet_name}` : ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-primary/30 text-primary flex-shrink-0"
                        onClick={() => {
                          // Try to call — in production this would use the stored phone
                          window.location.href = "tel:*3939";
                        }}
                      >
                        <Phone className="w-3.5 h-3.5" />
                        התקשר
                      </Button>
                    </div>
                  </div>
                )}

                {/* First Aid Categories */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2.5">
                    ⚡ עזרה ראשונה — בחר מצב:
                  </h3>
                  <div className="space-y-2">
                    {EMERGENCY_CATEGORIES.map((cat) => (
                      <EmergencyCategory
                        key={cat.title}
                        emoji={cat.emoji}
                        title={cat.title}
                        subtitle={cat.subtitle}
                        prompt={cat.prompt}
                        petName={activePet?.name || "החיה"}
                        petBreed={activePet?.breed}
                        petType={activePet?.type}
                      />
                    ))}
                  </div>
                </div>

                {/* Medical ID Share */}
                {activePet && (
                  <div className="pt-2">
                    <h3 className="text-sm font-semibold text-foreground mb-2.5">
                      📋 שיתוף מידע רפואי
                    </h3>
                    <MedicalIDShare
                      petId={activePet.id}
                      petName={activePet.name}
                      petBreed={activePet.breed}
                      petType={activePet.type}
                    />
                    <p className="text-[10px] text-muted-foreground text-center mt-2">
                      יוצר מסמך Medical ID עם היסטוריה רפואית, חיסונים ואלרגיות להצגה בווטרינר
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
