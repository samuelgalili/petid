import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

/**
 * PrivacyConsentPopup — Mandatory AI consent during onboarding.
 * Shows once for users who haven't consented yet.
 */
export const PrivacyConsentPopup = () => {
  const { user, isAuthenticated } = useAuth();
  const [visible, setVisible] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const checkConsent = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("ai_consent_given")
        .eq("id", user.id)
        .maybeSingle();

      if (data && !data.ai_consent_given) {
        // Small delay so it doesn't flash on load
        setTimeout(() => setVisible(true), 1500);
      }
    };

    checkConsent();
  }, [isAuthenticated, user?.id]);

  const handleAccept = async () => {
    if (!user?.id) return;
    setAccepting(true);

    try {
      await supabase
        .from("profiles")
        .update({
          ai_consent_given: true,
          ai_consent_date: new Date().toISOString(),
        })
        .eq("id", user.id);

      setVisible(false);
    } catch {
      // Retry silently
    } finally {
      setAccepting(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          dir="rtl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25 }}
            className="w-full max-w-[340px] rounded-2xl bg-background border border-border/40 shadow-2xl"
          >
            <div className="p-5 space-y-3">
              <div className="w-11 h-11 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" strokeWidth={1.5} />
              </div>

              <div className="text-center space-y-1">
                <h2 className="text-base font-bold text-foreground">הסכמת פרטיות</h2>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  PetID משתמשת בבינה מלאכותית כדי לנתח מסמכים רפואיים וליצור המלצות מותאמות אישית עבור חיית המחמד שלך.
                </p>
              </div>

              <div className="bg-muted/30 rounded-2xl p-3.5 space-y-2">
                <p className="text-[11px] font-medium text-foreground">אנחנו מבקשים את הסכמתך ל:</p>
                {[
                  "ניתוח AI של מסמכים רפואיים שתעלה",
                  "יצירת המלצות תזונה מותאמות על בסיס התקן המדעי של PetID",
                  "שמירת לוג גישה שקוף לביקורת פרטיות",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" strokeWidth={2} />
                    <p className="text-[11px] text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>

              <p className="text-[9px] text-muted-foreground/60 text-center leading-relaxed">
                תוכל לבטל הסכמה ולמחוק את כל הנתונים בכל עת דרך ההגדרות.
                המידע שלך לא ישותף עם צדדים שלישיים.
              </p>

              <button
                onClick={handleAccept}
                disabled={accepting}
                className={cn(
                  "w-full py-3 rounded-2xl text-sm font-semibold",
                  "bg-primary text-primary-foreground",
                  "hover:opacity-90 disabled:opacity-50 transition-opacity",
                )}
              >
                {accepting ? "מאשר..." : "מאשר/ת — אני מסכים/ה"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
