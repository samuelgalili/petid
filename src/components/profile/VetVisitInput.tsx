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
import { supabase } from "@/integrations/supabase/client";

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
}

export const VetVisitInput = ({ petId, petName, onVisitLogged }: VetVisitInputProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split("T")[0]);
  const [clinicName, setClinicName] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);

  const handleSubmit = async () => {
    if (!summary.trim()) {
      toast({ title: "נא להזין סיכום ביקור", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-vet-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          petId,
          userId: user.id,
          summary: summary.trim(),
          visitDate,
          clinicName: clinicName.trim() || null,
        }),
      });

      if (!resp.ok) throw new Error("Failed to process");

      const data = await resp.json();
      setExtracted(data.extracted);

      const messages: string[] = [];
      if (data.extracted.vaccines?.length > 0) messages.push(`💉 חיסונים: ${data.extracted.vaccines.join(", ")}`);
      if (data.extracted.diagnoses?.length > 0) messages.push(`🔍 אבחנות: ${data.extracted.diagnoses.length}`);
      if (data.extracted.medications?.length > 0) messages.push(`💊 תרופות: ${data.extracted.medications.length}`);
      if (data.extracted.isRecoveryMode) messages.push(`🏥 מצב החלמה הופעל ל-14 ימים`);

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
                      מנתח סיכום...
                    </>
                  ) : (
                    "שמור ונתח ביקור"
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
