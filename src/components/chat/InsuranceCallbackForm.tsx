import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Phone, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useInsurancePartner } from "@/hooks/useInsurancePartner";
import { useEffect } from "react";

interface InsuranceCallbackFormProps {
  petName: string;
  petType: string;
  breed: string | null;
  ageYears: number | null;
  petId?: string | null;
  healthIssue?: string;
}

export const InsuranceCallbackForm = ({
  petName,
  petType,
  breed,
  ageYears,
  petId,
  healthIssue,
}: InsuranceCallbackFormProps) => {
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { partnerName } = useInsurancePartner();

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.phone) setPhone(data.phone);
      });
  }, [user?.id]);

  const PHONE_REGEX = /^0[2-9]\d{7,8}$/;

  const handleSubmit = async () => {
    if (!user) return;

    const cleaned = phone.replace(/[-\s]/g, "");
    if (!PHONE_REGEX.test(cleaned)) {
      setPhoneError("מספר טלפון לא תקין (לדוגמה: 0501234567)");
      return;
    }
    setPhoneError(null);
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("insurance_leads").insert({
        user_id: user.id,
        pet_id: petId || null,
        pet_name: petName,
        pet_type: petType,
        breed,
        age_years: ageYears,
        phone: cleaned,
        health_answer_1: healthIssue || "בעיה רפואית - נדרשת בדיקה",
        selected_plan: "callback_request",
      });

      if (error) throw error;
      setIsSuccess(true);
    } catch (err) {
      console.error("Insurance callback error:", err);
      toast({ title: "שגיאה", description: "לא הצלחנו לשלוח את הפנייה", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center py-5 gap-3"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.1 }}
          className="w-16 h-16 rounded-full flex items-center justify-center bg-primary/15"
        >
          <Check className="w-8 h-8 text-primary" />
        </motion.div>
        <div>
          <p className="text-base font-bold text-foreground">הפרטים נשלחו בהצלחה! 🎉</p>
          <p className="text-sm text-muted-foreground mt-1">
            נציג מקצועי מ-{partnerName} יחזור אליך תוך 24 שעות לבדיקת המקרה
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 mt-2"
    >
      <div className="flex items-center gap-2 px-1">
        <Shield className="w-4 h-4 text-primary" strokeWidth={1.5} />
        <span className="text-xs font-bold text-primary">
          {partnerName}
        </span>
        <span className="text-[10px] text-muted-foreground">• בדיקה אישית ל{petName}</span>
      </div>

      <div className="rounded-2xl border-2 border-border/60 bg-card p-4 space-y-3">
        <p className="text-sm text-foreground font-medium">
          📋 בגלל המצב הרפואי, נציג מקצועי יבדוק את המקרה של {petName} ויחזור אליך עם הצעה מותאמת.
        </p>
        <p className="text-xs text-muted-foreground">
          השאר מספר טלפון ונעביר את כל הפרטים:
        </p>

        <div>
          <div className="relative">
            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setPhoneError(null);
              }}
              placeholder="050-1234567"
              className={`h-11 pr-10 rounded-xl ${phoneError ? "border-destructive" : "border-border/50"}`}
              type="tel"
              maxLength={11}
              dir="ltr"
            />
          </div>
          {phoneError && (
            <p className="text-xs text-destructive mt-1 pr-1">{phoneError}</p>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !phone.trim()}
          className="w-full h-11 rounded-xl font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Shield className="w-4 h-4" />
              שלח פרטים לנציג
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};
