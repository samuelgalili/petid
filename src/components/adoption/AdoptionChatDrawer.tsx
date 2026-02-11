import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Send, CheckCircle2, PawPrint, Phone, User, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

type Stage = "welcome" | "qualification" | "contact" | "success";

interface AdoptionPetInfo {
  id: string;
  name: string;
  breed: string | null;
  image_url: string | null;
  organization_name: string | null;
  organization_phone: string | null;
}

interface AdoptionChatDrawerProps {
  pet: AdoptionPetInfo;
  isOpen: boolean;
  onClose: () => void;
}

interface QualificationAnswers {
  hasExperience: boolean | null;
  hasOtherPets: boolean | null;
}

interface ContactInfo {
  fullName: string;
  phone: string;
  address: string;
  reason: string;
}

const PHONE_REGEX = /^0[2-9]\d{7,8}$/;

const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/[-\s]/g, "");
  return PHONE_REGEX.test(cleaned);
};

export const AdoptionChatDrawer = ({ pet, isOpen, onClose }: AdoptionChatDrawerProps) => {
  const [stage, setStage] = useState<Stage>("welcome");
  const [qualification, setQualification] = useState<QualificationAnswers>({
    hasExperience: null,
    hasOtherPets: null,
  });
  const [contact, setContact] = useState<ContactInfo>({
    fullName: "",
    phone: "",
    address: "",
    reason: "",
  });
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const resetState = useCallback(() => {
    setStage("welcome");
    setQualification({ hasExperience: null, hasOtherPets: null });
    setContact({ fullName: "", phone: "", address: "", reason: "" });
    setPhoneError(null);
    setIsSubmitting(false);
  }, []);

  const handleClose = () => {
    onClose();
    setTimeout(resetState, 300);
  };

  const handleStartFlow = () => {
    if (!user) {
      toast({ title: "נדרש התחברות", description: "עליך להתחבר כדי לשלוח בקשת אימוץ", variant: "destructive" });
      return;
    }
    setStage("qualification");
  };

  const handleQualificationAnswer = (field: keyof QualificationAnswers, value: boolean) => {
    const updated = { ...qualification, [field]: value };
    setQualification(updated);

    // Auto-advance when both answered
    if (field === "hasExperience" && updated.hasOtherPets !== null) {
      setTimeout(() => setStage("contact"), 400);
    } else if (field === "hasOtherPets" && updated.hasExperience !== null) {
      setTimeout(() => setStage("contact"), 400);
    }
  };

  const handleSubmit = async () => {
    if (!user || !pet) return;

    // Validate
    if (!contact.fullName.trim()) {
      toast({ title: "נא למלא שם מלא", variant: "destructive" });
      return;
    }

    const cleanedPhone = contact.phone.replace(/[-\s]/g, "");
    if (!validatePhone(cleanedPhone)) {
      setPhoneError("מספר טלפון לא תקין (לדוגמה: 0501234567)");
      return;
    }
    setPhoneError(null);

    if (!contact.reason.trim()) {
      toast({ title: "נא לכתוב למה אתה רוצה לאמץ", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("adoption_requests").insert({
        user_id: user.id,
        pet_id: pet.id,
        full_name: contact.fullName.trim(),
        email: user.email || "",
        phone: cleanedPhone,
        address: contact.address.trim(),
        has_experience: qualification.hasExperience ?? false,
        has_other_pets: qualification.hasOtherPets ?? false,
        reason: contact.reason.trim(),
      });

      if (error) throw error;

      // 🎉 Success!
      setStage("success");
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#FF8C42", "#FFB347", "#FF6B6B", "#4ECDC4", "#45B7D1"],
      });
    } catch (error) {
      console.error("Adoption submit error:", error);
      toast({ title: "שגיאה", description: "לא ניתן לשלוח את הבקשה, נסה שוב", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const ownerDisplay = pet.organization_name || "בעל החיה";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={handleClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl max-h-[85vh] overflow-y-auto shadow-xl"
            dir="rtl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-muted-foreground/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-muted border-2 border-primary/20">
                  {pet.image_url ? (
                    <img src={pet.image_url} alt={pet.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PawPrint className="w-6 h-6 text-primary" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{pet.name}</h3>
                  {pet.breed && <p className="text-xs text-muted-foreground">{pet.breed}</p>}
                </div>
              </div>
              <button onClick={handleClose} className="p-2 rounded-full hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="px-5 pb-8">
              <AnimatePresence mode="wait">
                {/* ─── STAGE: Welcome ─── */}
                {stage === "welcome" && (
                  <motion.div
                    key="welcome"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-5"
                  >
                    {/* Chat bubble */}
                    <div className="bg-muted/50 rounded-2xl rounded-tr-md p-4">
                      <p className="text-sm leading-relaxed text-foreground">
                        היי! 🐾 כיף שאתה מתעניין ב<strong>{pet.name}</strong>!
                        {pet.breed && <> ({pet.breed})</>}
                        <br /><br />
                        אני אעזור לך לשלוח בקשת אימוץ. זה ייקח רק דקה!
                      </p>
                    </div>

                    <Button
                      onClick={handleStartFlow}
                      className="w-full h-12 rounded-2xl text-base font-bold gap-2"
                      style={{ backgroundColor: "#FF8C42" }}
                    >
                      <Heart className="w-5 h-5" />
                      בואו נתחיל!
                    </Button>
                  </motion.div>
                )}

                {/* ─── STAGE: Qualification ─── */}
                {stage === "qualification" && (
                  <motion.div
                    key="qualification"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-5"
                  >
                    {/* Q1: Experience */}
                    <div className="bg-muted/50 rounded-2xl rounded-tr-md p-4">
                      <p className="text-sm text-foreground mb-3">
                        שאלה 1 מתוך 2: יש לך ניסיון קודם עם חיות מחמד? 🏡
                      </p>
                      <div className="flex gap-3">
                        <Button
                          variant={qualification.hasExperience === true ? "default" : "outline"}
                          className="flex-1 rounded-xl"
                          onClick={() => handleQualificationAnswer("hasExperience", true)}
                        >
                          כן ✅
                        </Button>
                        <Button
                          variant={qualification.hasExperience === false ? "default" : "outline"}
                          className="flex-1 rounded-xl"
                          onClick={() => handleQualificationAnswer("hasExperience", false)}
                        >
                          לא, זו הפעם הראשונה
                        </Button>
                      </div>
                    </div>

                    {/* Q2: Other pets - show after Q1 answered */}
                    {qualification.hasExperience !== null && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-muted/50 rounded-2xl rounded-tr-md p-4"
                      >
                        <p className="text-sm text-foreground mb-3">
                          שאלה 2 מתוך 2: יש לך חיות מחמד נוספות בבית? 🐕
                        </p>
                        <div className="flex gap-3">
                          <Button
                            variant={qualification.hasOtherPets === true ? "default" : "outline"}
                            className="flex-1 rounded-xl"
                            onClick={() => handleQualificationAnswer("hasOtherPets", true)}
                          >
                            כן
                          </Button>
                          <Button
                            variant={qualification.hasOtherPets === false ? "default" : "outline"}
                            className="flex-1 rounded-xl"
                            onClick={() => handleQualificationAnswer("hasOtherPets", false)}
                          >
                            לא
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* ─── STAGE: Contact Capture ─── */}
                {stage === "contact" && (
                  <motion.div
                    key="contact"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    <div className="bg-muted/50 rounded-2xl rounded-tr-md p-4">
                      <p className="text-sm text-foreground">
                        מעולה! עכשיו רק צריך כמה פרטים כדי שנוכל ליצור קשר 📞
                      </p>
                    </div>

                    <div className="space-y-3">
                      {/* Full Name */}
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={contact.fullName}
                          onChange={(e) => setContact((p) => ({ ...p, fullName: e.target.value }))}
                          placeholder="שם מלא"
                          className="h-12 pr-10 rounded-xl border-border/50"
                          maxLength={100}
                          dir="rtl"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <div className="relative">
                          <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            value={contact.phone}
                            onChange={(e) => {
                              setContact((p) => ({ ...p, phone: e.target.value }));
                              setPhoneError(null);
                            }}
                            placeholder="טלפון (לדוגמה: 0501234567)"
                            className={`h-12 pr-10 rounded-xl ${phoneError ? "border-destructive" : "border-border/50"}`}
                            type="tel"
                            maxLength={11}
                            dir="ltr"
                          />
                        </div>
                        {phoneError && (
                          <p className="text-xs text-destructive mt-1 pr-1">{phoneError}</p>
                        )}
                      </div>

                      {/* Address */}
                      <div className="relative">
                        <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={contact.address}
                          onChange={(e) => setContact((p) => ({ ...p, address: e.target.value }))}
                          placeholder="עיר מגורים"
                          className="h-12 pr-10 rounded-xl border-border/50"
                          maxLength={200}
                          dir="rtl"
                        />
                      </div>

                      {/* Reason */}
                      <div className="relative">
                        <MessageCircle className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Textarea
                          value={contact.reason}
                          onChange={(e) => setContact((p) => ({ ...p, reason: e.target.value }))}
                          placeholder="למה אתה רוצה לאמץ את הבעל חיים הזה?"
                          className="min-h-[80px] pr-10 rounded-xl border-border/50 resize-none"
                          maxLength={1000}
                          dir="rtl"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !contact.fullName.trim() || !contact.phone.trim() || !contact.reason.trim()}
                      className="w-full h-12 rounded-2xl text-base font-bold gap-2"
                      style={{ backgroundColor: "#FF8C42" }}
                    >
                      {isSubmitting ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          שלח בקשת אימוץ
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}

                {/* ─── STAGE: Success ─── */}
                {stage === "success" && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center text-center py-6 space-y-4"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                      className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <h3 className="text-xl font-bold text-foreground mb-1">הבקשה נשלחה! 🎉</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        הבקשה שלך נשלחה ל<strong>{ownerDisplay}</strong>!
                        <br />
                        הם יחזרו אליך בהקדם.
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                      className="text-4xl"
                    >
                      🐶💛
                    </motion.div>

                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="rounded-2xl mt-2"
                    >
                      סגור
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
