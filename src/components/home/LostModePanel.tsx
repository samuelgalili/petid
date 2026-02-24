/**
 * LostModePanel — The Guardian Angel (V50)
 * Red-alert dashboard overlay + poster generator + notification blast UI
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, MapPin, Phone, Share2, Download, Bell,
  MessageCircle, Eye, EyeOff, X, Siren, FileText, Users,
  Navigation, Shield, Gift, ChevronDown, ChevronUp,
  Loader2, Check, ExternalLink, Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Pet {
  id: string;
  name: string;
  type: string;
  breed?: string;
  avatar_url?: string;
  microchip_number?: string;
  medical_conditions?: string[];
  health_notes?: string;
  color?: string;
  weight?: number;
  is_lost?: boolean;
  lost_since?: string;
  lost_reward_text?: string;
  lost_temperament?: string;
  lost_medication_note?: string;
  lost_allergy_note?: string;
  lost_show_phone?: boolean;
  lost_contact_phone?: string;
}

interface LostModePanelProps {
  pet: Pet;
  ownerPhone?: string;
  onUpdate: () => void;
}

export const LostModePanel = ({ pet, ownerPhone, onUpdate }: LostModePanelProps) => {
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingPoster, setGeneratingPoster] = useState(false);

  // Lost mode form fields
  const [temperament, setTemperament] = useState(pet.lost_temperament || "");
  const [medication, setMedication] = useState(pet.lost_medication_note || "");
  const [allergy, setAllergy] = useState(pet.lost_allergy_note || "");
  const [reward, setReward] = useState(pet.lost_reward_text || "");
  const [showPhone, setShowPhone] = useState(pet.lost_show_phone !== false);
  const [contactPhone, setContactPhone] = useState(pet.lost_contact_phone || ownerPhone || "");

  const isLost = pet.is_lost === true;

  const activateLostMode = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("pets")
        .update({
          is_lost: true,
          lost_since: new Date().toISOString(),
          lost_temperament: temperament || null,
          lost_medication_note: medication || null,
          lost_allergy_note: allergy || null,
          lost_reward_text: reward || null,
          lost_show_phone: showPhone,
          lost_contact_phone: contactPhone || null,
        })
        .eq("id", pet.id);

      if (error) throw error;
      toast.success(`מצב חירום הופעל עבור ${pet.name}`);
      setShowActivateDialog(false);
      onUpdate();
    } catch (err) {
      toast.error("שגיאה בהפעלת מצב איבוד");
    } finally {
      setSaving(false);
    }
  };

  const deactivateLostMode = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("found-pet-resolve", {
        body: { pet_id: pet.id },
      });

      if (error) throw error;
      const result = data as any;
      const pushText = result?.push_sent ? ` נשלחו ${result.push_sent} התראות.` : '';
      toast.success(`🎉 ${pet.name} חזר/ה הביתה!${pushText}`);
      setShowDeactivateDialog(false);
      onUpdate();
    } catch (err) {
      console.error("Found pet error:", err);
      toast.error("שגיאה בביטול מצב איבוד");
    } finally {
      setSaving(false);
    }
  };

  const updateLostSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("pets")
        .update({
          lost_temperament: temperament || null,
          lost_medication_note: medication || null,
          lost_allergy_note: allergy || null,
          lost_reward_text: reward || null,
          lost_show_phone: showPhone,
          lost_contact_phone: contactPhone || null,
        })
        .eq("id", pet.id);

      if (error) throw error;
      toast.success("הגדרות עודכנו");
      setShowSettingsSheet(false);
      onUpdate();
    } catch (err) {
      toast.error("שגיאה בעדכון הגדרות");
    } finally {
      setSaving(false);
    }
  };

  const generatePoster = async () => {
    setGeneratingPoster(true);
    try {
      // Build poster content for download
      const posterContent = `
נעדר/ת!
────────────────
שם: ${pet.name}
גזע: ${pet.breed || "לא ידוע"}
צבע: ${pet.color || "לא ידוע"}
${pet.microchip_number ? `שבב: ${pet.microchip_number}` : ""}
${temperament ? `מזג: ${temperament}` : ""}
${medication ? `⚠️ תרופות: ${medication}` : ""}
${allergy ? `⚠️ אלרגיה: ${allergy}` : ""}
${reward ? `🎁 פרס: ${reward}` : ""}
────────────────
נמצא מאז: ${pet.lost_since ? new Date(pet.lost_since).toLocaleDateString("he-IL") : "היום"}
${showPhone && contactPhone ? `טלפון: ${contactPhone}` : ""}

סרקו את קוד ה-QR בתג של ${pet.name} או פנו ישירות לבעלים.
PetID - שומרים על חיות המחמד שלנו
      `.trim();

      const blob = new Blob([posterContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lost-pet-${pet.name}-poster.txt`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("פוסטר הורד בהצלחה");
    } catch {
      toast.error("שגיאה ביצירת פוסטר");
    } finally {
      setGeneratingPoster(false);
    }
  };

  const shareToFacebook = () => {
    const text = encodeURIComponent(
      `🚨 נעדר/ת! ${pet.name} (${pet.breed || pet.type}) הלך/ה לאיבוד. ${pet.color ? `צבע: ${pet.color}.` : ""} ${medication ? `⚠️ צריך/ה תרופות!` : ""} אם ראיתם — בבקשה צרו קשר! #PetID #חיפוש`
    );
    window.open(`https://www.facebook.com/sharer/sharer.php?quote=${text}`, "_blank");
  };

  const shareToFeed = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("lost-pet-alert", {
        body: { pet_id: pet.id },
      });
      if (error) throw error;
      const result = data as any;
      toast.success(`פורסם בפיד ונשלחו ${result?.push_sent || 0} התראות באזור`);
      onUpdate();
    } catch {
      toast.error("שגיאה בפרסום");
    }
  };

  const sendRadiusAlert = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("lost-pet-alert", {
        body: { pet_id: pet.id },
      });
      if (error) throw error;
      const result = data as any;
      toast.success(`🚨 נשלחו ${result?.push_sent || 0} התראות ל-${result?.nearby_users || 0} משתמשים באזור ${result?.city || ''}`);
    } catch {
      toast.error("שגיאה בשליחת התראות");
    }
  };

  // ─── LOST MODE ACTIVE BANNER ───
  if (isLost) {
    return (
      <div dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-4 mb-4"
        >
          <Card className="border-2 border-destructive/40 bg-destructive/5 rounded-2xl overflow-hidden">
            {/* Red Alert Header */}
            <div className="bg-destructive p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Siren className="w-6 h-6 text-destructive-foreground" strokeWidth={2} />
                </motion.div>
                <div>
                  <h3 className="text-sm font-bold text-destructive-foreground">
                    מצב חירום — {pet.name} נעדר/ת!
                  </h3>
                  {pet.lost_since && (
                    <p className="text-[10px] text-destructive-foreground/80">
                      מאז {new Date(pet.lost_since).toLocaleDateString("he-IL")}
                    </p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-[10px] h-7 px-2 bg-destructive-foreground/10 border-destructive-foreground/30 text-destructive-foreground hover:bg-destructive-foreground/20"
                onClick={() => setShowSettingsSheet(true)}
              >
                הגדרות
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="p-4 space-y-2.5">
              {/* Poster Generator */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-16 flex-col gap-1.5 text-[10px] border-border/40 hover:border-destructive/30 hover:bg-destructive/5"
                  onClick={generatePoster}
                  disabled={generatingPoster}
                >
                  {generatingPoster ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 text-destructive" strokeWidth={1.5} />
                  )}
                  הורד פוסטר
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-16 flex-col gap-1.5 text-[10px] border-border/40 hover:border-blue-500/30 hover:bg-blue-500/5"
                  onClick={shareToFacebook}
                >
                  <Share2 className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
                  שתף בפייסבוק
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-16 flex-col gap-1.5 text-[10px] border-border/40 hover:border-primary/30 hover:bg-primary/5"
                  onClick={shareToFeed}
                >
                  <Users className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  פרסם בפיד
                </Button>
              </div>

              {/* Notification Blast */}
              <Button
                className="w-full h-12 rounded-xl text-sm font-bold gap-2 bg-destructive hover:bg-destructive/90"
                onClick={sendRadiusAlert}
              >
                <Bell className="w-4 h-4" strokeWidth={1.5} />
                שלח התראה למשתמשים באזור (5 ק״מ)
              </Button>

              {/* QR Tracking Status */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/50 border border-border/20">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-primary" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-medium text-foreground">מעקב QR פעיל</p>
                  <p className="text-[9px] text-muted-foreground">תקבל/י התראה מיידית כשמישהו סורק את התג</p>
                </div>
                <Badge variant="success" className="text-[9px]">
                  <Check className="w-3 h-3 ml-0.5" />
                  פעיל
                </Badge>
              </div>

              {/* Public page link */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground gap-1"
                onClick={() => {
                  const url = `${window.location.origin}/found-pet/${pet.id}`;
                  navigator.clipboard.writeText(url);
                  toast.success("הקישור הועתק");
                }}
              >
                <ExternalLink className="w-3 h-3" />
                העתק קישור לדף הציבורי
              </Button>

              {/* Deactivate */}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs border-success/30 text-success hover:bg-success/10"
                onClick={() => setShowDeactivateDialog(true)}
              >
                ✅ {pet.name} חזר/ה הביתה — בטל מצב חירום
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Deactivate Confirmation */}
        <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>ביטול מצב חירום</AlertDialogTitle>
              <AlertDialogDescription>
                {pet.name} חזר/ה הביתה? מצוין! מצב החירום יבוטל והדף הציבורי יוסר.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogAction onClick={deactivateLostMode} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                כן, {pet.name} בבית! 🎉
              </AlertDialogAction>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Settings Sheet */}
        <Sheet open={showSettingsSheet} onOpenChange={setShowSettingsSheet}>
          <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
            <SheetHeader className="mb-4">
              <SheetTitle>הגדרות מצב חירום — {pet.name}</SheetTitle>
            </SheetHeader>
            <LostModeForm
              temperament={temperament}
              setTemperament={setTemperament}
              medication={medication}
              setMedication={setMedication}
              allergy={allergy}
              setAllergy={setAllergy}
              reward={reward}
              setReward={setReward}
              showPhone={showPhone}
              setShowPhone={setShowPhone}
              contactPhone={contactPhone}
              setContactPhone={setContactPhone}
            />
            <Button className="w-full mt-4" onClick={updateLostSettings} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              שמור שינויים
            </Button>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // ─── ACTIVATE LOST MODE BUTTON ───
  return (
    <div dir="rtl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-4 mb-3"
      >
        <Button
          variant="outline"
          className="w-full h-12 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/5 hover:border-destructive/40 gap-2 text-sm font-semibold"
          onClick={() => setShowActivateDialog(true)}
        >
          <Siren className="w-4 h-4" strokeWidth={1.5} />
          הפעל מצב איבוד — {pet.name} נעדר/ת
        </Button>
      </motion.div>

      {/* Activation Dialog */}
      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Siren className="w-5 h-5" />
              הפעלת מצב חירום — {pet.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              מצב זה יפעיל דף ציבורי לכל מי שסורק את תג ה-QR של {pet.name}, ויאפשר מעקב סריקות בזמן אמת.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <LostModeForm
            temperament={temperament}
            setTemperament={setTemperament}
            medication={medication}
            setMedication={setMedication}
            allergy={allergy}
            setAllergy={setAllergy}
            reward={reward}
            setReward={setReward}
            showPhone={showPhone}
            setShowPhone={setShowPhone}
            contactPhone={contactPhone}
            setContactPhone={setContactPhone}
          />

          <AlertDialogFooter className="flex-row-reverse gap-2 mt-4">
            <AlertDialogAction
              onClick={activateLostMode}
              disabled={saving}
              className="bg-destructive hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Siren className="w-4 h-4 ml-2" />}
              הפעל מצב חירום
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── Shared Form ─────────────────────────────────
const LostModeForm = ({
  temperament, setTemperament,
  medication, setMedication,
  allergy, setAllergy,
  reward, setReward,
  showPhone, setShowPhone,
  contactPhone, setContactPhone,
}: {
  temperament: string; setTemperament: (v: string) => void;
  medication: string; setMedication: (v: string) => void;
  allergy: string; setAllergy: (v: string) => void;
  reward: string; setReward: (v: string) => void;
  showPhone: boolean; setShowPhone: (v: boolean) => void;
  contactPhone: string; setContactPhone: (v: string) => void;
}) => (
  <div className="space-y-4">
    {/* Contact */}
    <div className="p-3 rounded-xl bg-muted/30 border border-border/20 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
          הצג מספר טלפון בדף הציבורי
        </Label>
        <Switch checked={showPhone} onCheckedChange={setShowPhone} />
      </div>
      {showPhone && (
        <Input
          placeholder="מספר טלפון ליצירת קשר"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          className="text-sm h-9"
          dir="ltr"
        />
      )}
    </div>

    {/* Temperament */}
    <div>
      <Label className="text-xs font-semibold mb-1.5 block">
        מזג (ידידותי / חששני / אגרסיבי)
      </Label>
      <Input
        placeholder="למשל: ידידותי מאוד, אוהב אנשים"
        value={temperament}
        onChange={(e) => setTemperament(e.target.value)}
        className="text-sm h-9"
      />
    </div>

    {/* Medication */}
    <div>
      <Label className="text-xs font-semibold mb-1.5 block flex items-center gap-1">
        <AlertTriangle className="w-3 h-3 text-warning" />
        צריך/ה תרופות?
      </Label>
      <Input
        placeholder="למשל: אינסולין פעמיים ביום"
        value={medication}
        onChange={(e) => setMedication(e.target.value)}
        className="text-sm h-9"
      />
    </div>

    {/* Allergy */}
    <div>
      <Label className="text-xs font-semibold mb-1.5 block flex items-center gap-1">
        <AlertTriangle className="w-3 h-3 text-destructive" />
        אלרגיה
      </Label>
      <Input
        placeholder="למשל: אלרגי לעוף"
        value={allergy}
        onChange={(e) => setAllergy(e.target.value)}
        className="text-sm h-9"
      />
    </div>

    {/* Reward */}
    <div>
      <Label className="text-xs font-semibold mb-1.5 block flex items-center gap-1">
        <Gift className="w-3 h-3 text-primary" />
        פרס למוצא (אופציונלי)
      </Label>
      <Textarea
        placeholder="למשל: פרס של 500₪ למוצא הישר"
        value={reward}
        onChange={(e) => setReward(e.target.value)}
        className="text-sm min-h-[60px]"
        rows={2}
      />
    </div>
  </div>
);
