/**
 * InsuranceClaimForm - Insurance claim submission from OCR-extracted data
 * Auto-fills owner, pet, medical, and financial data from scan results
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckCircle2, Loader2, Shield, User, Cpu,
  Building2, Calendar, FileText, Banknote, AlertTriangle,
  Send, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ClaimData {
  ownerName: string | null;
  ownerIdNumber: string | null;
  petName: string | null;
  microchipNumber: string | null;
  clinicName: string | null;
  visitDate: string | null;
  diagnosis: string | null;
  treatment: string | null;
  totalAmount: number | null;
}

interface LibraClaimFormProps {
  petId: string;
  claimData: ClaimData;
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const CHECKLIST_ITEMS = [
  { key: 'clinic', label: 'האם פרטי המרפאה נכונים?' },
  { key: 'receipt', label: 'האם צילום הקבלה ברור?' },
  { key: 'amount', label: 'האם הסכום תואם את הקבלה?' },
];

export const LibraClaimForm = ({ petId, claimData, open, onClose, onSubmitted }: LibraClaimFormProps) => {
  const { toast } = useToast();
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const allChecked = CHECKLIST_ITEMS.every(item => checks[item.key]);

  const toggleCheck = (key: string) => {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("insurance_claims").insert({
        user_id: user.id,
        pet_id: petId,
        pet_name: claimData.petName,
        pet_microchip: claimData.microchipNumber,
        owner_name: claimData.ownerName,
        owner_id_number: claimData.ownerIdNumber,
        clinic_name: claimData.clinicName,
        visit_date: claimData.visitDate,
        diagnosis: claimData.diagnosis,
        treatment: claimData.treatment,
        total_amount: claimData.totalAmount,
        status: 'pending',
      } as any);

      if (error) throw error;

      setSubmitted(true);

      // Brief animation then close
      setTimeout(() => {
        toast({ title: "הבקשה נשלחה בהצלחה ✅", description: "הסטטוס יתעדכן בכרטיסיית הבריאות" });
        onSubmitted?.();
        onClose();
        setSubmitted(false);
        setChecks({});
      }, 2500);
    } catch (error) {
      console.error("Claim submission error:", error);
      toast({ title: "שגיאה בשליחת הבקשה", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const rows: { icon: React.ElementType; label: string; value: string | null }[] = [
    { icon: User, label: 'בעלים', value: claimData.ownerName },
    { icon: FileText, label: 'ת"ז', value: claimData.ownerIdNumber ? `****${claimData.ownerIdNumber.slice(-4)}` : null },
    { icon: Shield, label: 'חיה', value: claimData.petName },
    { icon: Cpu, label: 'שבב', value: claimData.microchipNumber ? `****${claimData.microchipNumber.slice(-6)}` : null },
    { icon: Building2, label: 'מרפאה', value: claimData.clinicName },
    { icon: Calendar, label: 'תאריך', value: claimData.visitDate ? new Date(claimData.visitDate).toLocaleDateString("he-IL") : null },
    { icon: AlertTriangle, label: 'אבחנה', value: claimData.diagnosis },
    { icon: Banknote, label: 'סכום', value: claimData.totalAmount ? `₪${claimData.totalAmount}` : null },
  ].filter(r => r.value);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-card rounded-t-3xl border-t border-border/40 shadow-2xl max-h-[85vh] overflow-y-auto"
          dir="rtl"
        >
          {/* Submission progress overlay */}
          <AnimatePresence>
            {(submitting || submitted) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 bg-card/95 rounded-t-3xl flex flex-col items-center justify-center gap-4"
              >
                {submitting && !submitted && (
                  <>
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-sm font-semibold text-foreground">שולח את הבקשה...</p>
                    <p className="text-xs text-muted-foreground">הסטטוס יתעדכן בכרטיסיית הבריאות</p>
                  </>
                )}
                {submitted && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <p className="text-sm font-bold text-foreground">הבקשה נשלחה בהצלחה!</p>
                    <p className="text-xs text-muted-foreground">מספר התביעה נשמר במערכת</p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-5 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">בקשת החזר ביטוחי</h3>
                  <p className="text-[10px] text-muted-foreground">הנתונים מולאו אוטומטית מהסריקה</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Claim Summary */}
            <div className="p-4 bg-muted/30 rounded-2xl border border-border/20 space-y-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">סיכום תביעה</p>
              {rows.map(({ icon: Icon, label, value }, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-primary/60 shrink-0" strokeWidth={1.5} />
                  <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
                  <span className="text-sm text-foreground font-medium">{value}</span>
                </div>
              ))}

              {rows.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  לא זוהו נתונים מספיקים — מלא ידנית
                </p>
              )}
            </div>

            {/* Verification Checklist */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-foreground">אימות לפני שליחה:</p>
              {CHECKLIST_ITEMS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleCheck(key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    checks[key]
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-border/30 bg-card'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    checks[key]
                      ? 'border-green-500 bg-green-500'
                      : 'border-muted-foreground/30'
                  }`}>
                    {checks[key] && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-xs text-foreground">{label}</span>
                </button>
              ))}
            </div>

            {/* Submit */}
            <Button
              className="w-full h-12 rounded-2xl font-semibold"
              onClick={handleSubmit}
              disabled={!allChecked || submitting}
            >
              <Send className="w-4 h-4 ml-2" />
              שלח בקשת החזר
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
