/**
 * VetVisitInput - Log vet visits with AI extraction
 * Extracts diagnoses, medications, and vaccines from free-text summary
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope, Plus, Loader2, CheckCircle2, Syringe, Pill, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createMyVaccination, createMyVetVisit } from "@/lib/mipoApi";
import { formatLocalDate, parseLocalDate } from "@/lib/dateOnly";

interface VetVisitInputProps {
  petId: string;
  petName: string;
  onVisitLogged?: () => void;
}

interface ExtractedData {
  diagnoses: string[];
  medications: string[];
  vaccines: string[];
  isRecoveryMode: boolean;
  recoveryReason: string | null;
  nextVisitDate: string | null;
  breedManagementGuide: string | null;
  affectedDashboardCircles: string[];
}

export const VetVisitInput = ({ petId, petName, onVisitLogged }: VetVisitInputProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [visitDate, setVisitDate] = useState(() => formatLocalDate(new Date()));
  const [clinicName, setClinicName] = useState("");
	  const [loading, setLoading] = useState(false);
	  const [extracted, setExtracted] = useState<ExtractedData | null>(null);

	  const extractLocalSummary = (value: string): ExtractedData => {
	    const normalized = value.toLowerCase();
	    const vaccineKeywords = ["כלבת", "משושה", "מרובעת", "תילוע", "fvrcp", "felv", "rabies"];
	    const vaccines = vaccineKeywords.filter((keyword) => normalized.includes(keyword.toLowerCase()));
	    const isRecoveryMode = ["ניתוח", "החלמה", "זיהום", "פציעה", "infection", "surgery"].some((keyword) => normalized.includes(keyword));
		    const annualDue = parseLocalDate(visitDate);
		    annualDue.setFullYear(annualDue.getFullYear() + 1);
		    const nextVisitDate = vaccines.length > 0 ? formatLocalDate(annualDue) : null;

	    return {
	      diagnoses: isRecoveryMode ? ["מעקב החלמה"] : [],
	      medications: normalized.includes("אנטיביוט") || normalized.includes("antibiotic") ? ["אנטיביוטיקה"] : [],
	      vaccines,
	      isRecoveryMode,
	      recoveryReason: isRecoveryMode ? "זוהה צורך במעקב החלמה מהסיכום" : null,
	      nextVisitDate,
	      breedManagementGuide: null,
	      affectedDashboardCircles: isRecoveryMode ? ["health"] : [],
	    };
	  };

	  const handleSubmit = async () => {
    if (!summary.trim()) {
      toast({ title: "נא להזין סיכום ביקור", variant: "destructive" });
      return;
    }

	    setLoading(true);
	    try {
	      const localExtraction = extractLocalSummary(summary.trim());
	      setExtracted(localExtraction);
		      const recoveryDate = new Date();
		      recoveryDate.setDate(recoveryDate.getDate() + 14);
		      const recoveryUntil = localExtraction.isRecoveryMode ? formatLocalDate(recoveryDate) : null;

	      await createMyVetVisit(petId, {
	        visit_type: localExtraction.vaccines.length > 0 ? "vaccination" : "checkup",
	        visit_date: visitDate,
	        next_visit_date: localExtraction.nextVisitDate,
	        clinic_name: clinicName.trim() || null,
	        reason: "manual_summary",
	        diagnosis: localExtraction.diagnoses.join(", ") || null,
	        treatment: localExtraction.medications.join(", ") || null,
	        notes: summary.trim(),
	        raw_summary: summary.trim(),
	        vaccines: localExtraction.vaccines,
	        is_recovery_mode: localExtraction.isRecoveryMode,
	        recovery_until: recoveryUntil,
	      });

	      await Promise.all(localExtraction.vaccines.map((vaccineName) => createMyVaccination(petId, {
	        vaccine_name: vaccineName,
	        administered_at: visitDate,
	        expires_at: localExtraction.nextVisitDate,
	        veterinarian: clinicName.trim() || null,
	        notes: summary.trim(),
	      })));

	      const messages: string[] = [];
	      if (localExtraction.vaccines.length > 0) messages.push(`💉 חיסונים: ${localExtraction.vaccines.join(", ")}`);
	      if (localExtraction.diagnoses.length > 0) messages.push(`🔍 אבחנות: ${localExtraction.diagnoses.length}`);
	      if (localExtraction.medications.length > 0) messages.push(`💊 תרופות: ${localExtraction.medications.length}`);
	      if (localExtraction.isRecoveryMode) messages.push(`🏥 מצב החלמה הופעל ל-14 ימים`);

      toast({
        title: `ביקור וטרינר נרשם עבור ${petName} ✅`,
        description: messages.join(" | ") || "הביקור נשמר בהצלחה",
      });

      // Reset after short delay to show extraction
      setTimeout(() => {
        setSummary("");
        setClinicName("");
        setExtracted(null);
        setIsOpen(false);
        onVisitLogged?.();
      }, 3000);
    } catch (error) {
      console.error("Error logging vet visit:", error);
      toast({ title: "שגיאה בשמירת הביקור", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4"
    >
      <div className="p-4 bg-card rounded-2xl border border-border/30">
        {/* Header / Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 w-full text-right"
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-primary" strokeWidth={1.5} />
          </div>
          <span className="font-semibold text-foreground text-sm flex-1">סיכום ביקור וטרינר</span>
          <Plus className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-45" : ""}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-3">
                {/* Date and Clinic */}
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="flex-1 text-sm h-9"
                  />
                  <Input
                    placeholder="שם מרפאה"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    className="flex-1 text-sm h-9"
                    dir="rtl"
                  />
                </div>

                {/* Summary textarea */}
                <Textarea
                  placeholder={`מה קרה בביקור של ${petName}? לדוגמה: חיסון כלבת, אבחנה של דלקת אוזניים, טיפול באנטיביוטיקה...`}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="min-h-[80px] text-sm resize-none"
                  dir="rtl"
                />

                {/* Submit button */}
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !summary.trim()}
                  className="w-full h-9 text-sm"
                >
	                  {loading ? (
	                    <>
	                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
	                      שומר סיכום...
	                    </>
	                  ) : (
	                    "שמור ביקור"
	                  )}
                </Button>

                {/* Extraction Results */}
                <AnimatePresence>
                  {extracted && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2 p-3 bg-muted/30 rounded-xl border border-border/20"
                    >
                      <p className="text-[11px] font-semibold text-primary">🤖 זוהה אוטומטית:</p>

                      {extracted.vaccines.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Syringe className="w-3.5 h-3.5 text-green-500 mt-0.5" strokeWidth={1.5} />
                          <div>
                            <p className="text-[10px] font-medium text-green-600">חיסונים</p>
                            <p className="text-[10px] text-muted-foreground">{extracted.vaccines.join(", ")}</p>
                          </div>
                        </div>
                      )}

                      {extracted.diagnoses.length > 0 && (
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5" strokeWidth={1.5} />
                          <div>
                            <p className="text-[10px] font-medium text-amber-600">אבחנות</p>
                            {extracted.diagnoses.map((d, i) => (
                              <p key={i} className="text-[10px] text-muted-foreground">{d}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      {extracted.medications.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Pill className="w-3.5 h-3.5 text-blue-500 mt-0.5" strokeWidth={1.5} />
                          <div>
                            <p className="text-[10px] font-medium text-blue-600">תרופות</p>
                            {extracted.medications.map((m, i) => (
                              <p key={i} className="text-[10px] text-muted-foreground">{m}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      {extracted.isRecoveryMode && (
                        <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg">
                          <span className="text-[10px] font-medium text-red-600">
                            🏥 מצב החלמה הופעל — {petName} במעקב ל-14 ימים
                          </span>
                        </div>
                      )}

                      {extracted.nextVisitDate && (
                        <p className="text-[10px] text-primary">
                          📅 תזכורת חיסון הבא: {new Date(extracted.nextVisitDate).toLocaleDateString("he-IL")}
                        </p>
                      )}

                      {extracted.breedManagementGuide && (
                        <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/10 mt-1">
                          <p className="text-[10px] font-semibold text-primary mb-1">📋 מדריך ניהול גזעי:</p>
                          {extracted.breedManagementGuide.split('\n').map((line, i) => (
                            <p key={i} className="text-[10px] text-foreground leading-relaxed">{line}</p>
                          ))}
                        </div>
                      )}

                      {extracted.affectedDashboardCircles && extracted.affectedDashboardCircles.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] text-muted-foreground">עיגולים מושפעים:</span>
                          {extracted.affectedDashboardCircles.map((circle, i) => {
                            const circleLabels: Record<string, string> = {
                              coat: 'פרווה', energy: 'אנרגיה', health: 'בריאות',
                              mobility: 'ניידות', digestion: 'עיכול', feeding: 'האכלה',
                            };
                            return (
                              <span key={i} className="text-[9px] px-1.5 py-0.5 bg-amber-500/15 text-amber-600 rounded-full font-medium">
                                {circleLabels[circle] || circle}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
