/**
 * MedicalDocumentFAB - Floating Action Button for adding vet visits/vaccines
 * 3 entry modes: Scan Document (camera), Upload PDF, Manual Entry
 * Shows scanning animation over pet profile and post-scan approval view
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Camera, FileUp, PenLine, X, Loader2,
  Syringe, Building2, Calendar, CheckCircle2, AlertTriangle,
  CalendarPlus, Weight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AILoader from "@/components/ui/ai-loader";

interface MedicalDocumentFABProps {
  petId: string;
  petName: string;
  petBirthDate?: string;
  onComplete?: () => void;
}

interface ScanResult {
  clinicName: string | null;
  visitDate: string | null;
  vaccines: string[];
  diagnoses: string[];
  medications: string[];
  weight: number | null;
  deworming: boolean;
  cost: number | null;
  nextDueDate?: string | null;
}

type ModalStep = 'closed' | 'choose' | 'scanning' | 'review' | 'manual';

export const MedicalDocumentFAB = ({ petId, petName, petBirthDate, onComplete }: MedicalDocumentFABProps) => {
  const { toast } = useToast();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ModalStep>('closed');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Manual entry state
  const [manualSummary, setManualSummary] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualClinic, setManualClinic] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Calculate next due date based on puppy series
  const calculateNextDue = useCallback((vaccines: string[], visitDate: string): string | null => {
    if (!petBirthDate || vaccines.length === 0) return null;
    const birth = new Date(petBirthDate);
    const now = new Date();
    const ageWeeks = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 7));

    if (ageWeeks > 26) {
      // Adult — next vaccine in 1 year
      const next = new Date(visitDate);
      next.setFullYear(next.getFullYear() + 1);
      return next.toISOString().split('T')[0];
    }

    // Puppy series: 6, 9, 12, 16 weeks
    const milestones = [6, 9, 12, 16];
    for (const w of milestones) {
      const d = new Date(birth);
      d.setDate(d.getDate() + w * 7);
      if (d > now) return d.toISOString().split('T')[0];
    }
    return null;
  }, [petBirthDate]);

  const processFile = async (base64: string, fileName: string) => {
    setStep('scanning');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("scan-vet-document", {
        body: { petId, userId: user.id, imageBase64: base64, fileName },
      });
      if (error) throw error;

      const result: ScanResult = data.scanResult;
      // Add puppy series next-due calculation
      if (result.vaccines?.length > 0 && result.visitDate) {
        result.nextDueDate = calculateNextDue(result.vaccines, result.visitDate);
      }
      setScanResult(result);
      setStep('review');
    } catch (err) {
      console.error("Scan error:", err);
      toast({ title: "שגיאה בסריקה", description: "נסה שוב או הזן ידנית", variant: "destructive" });
      setStep('choose');
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      processFile(base64, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      processFile(base64, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = async () => {
    if (!scanResult) return;
    setConfirming(true);
    try {
      // Data was already saved by the edge function during scan
      // Just trigger the refresh
      toast({ title: "הנתונים אושרו ✅", description: "ציון הבריאות ולוח החיסונים עודכנו" });
      onComplete?.();
      handleClose();
    } catch {
      toast({ title: "שגיאה בשמירה", variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualSummary.trim()) return;
    setManualSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("extract-vet-summary", {
        body: {
          petId,
          userId: user.id,
          summary: manualSummary,
          visitDate: manualDate,
          clinicName: manualClinic || null,
        },
      });
      if (error) throw error;

      const extracted = data.extracted;
      setScanResult({
        clinicName: manualClinic || null,
        visitDate: manualDate,
        vaccines: extracted.vaccines || [],
        diagnoses: extracted.diagnoses || [],
        medications: extracted.medications || [],
        weight: null,
        deworming: false,
        cost: null,
        nextDueDate: extracted.nextVisitDate,
      });
      setStep('review');
    } catch (err) {
      console.error("Manual submit error:", err);
      toast({ title: "שגיאה בשמירה", variant: "destructive" });
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('closed');
    setScanResult(null);
    setManualSummary('');
    setManualDate(new Date().toISOString().split('T')[0]);
    setManualClinic('');
  };

  const addToCalendar = (title: string, date: string) => {
    const d = new Date(date);
    const end = new Date(d);
    end.setHours(end.getHours() + 1);
    const fmt = (dt: Date) => dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(d)}/${fmt(end)}`;
    window.open(url, '_blank');
  };

  return (
    <>
      {/* Hidden inputs */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />
      <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />

      {/* FAB */}
      <AnimatePresence>
        {step === 'closed' && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setStep('choose')}
            className="fixed bottom-24 left-5 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
            style={{ boxShadow: '0 4px 20px hsl(var(--primary) / 0.4)' }}
          >
            <Plus className="w-6 h-6" strokeWidth={2} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Modal overlay */}
      <AnimatePresence>
        {step !== 'closed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end justify-center"
            onClick={(e) => { if (e.target === e.currentTarget && step !== 'scanning') handleClose(); }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-card rounded-t-3xl border-t border-border/40 p-6 pb-10 max-h-[85vh] overflow-y-auto"
              dir="rtl"
            >
              {/* Header */}
              {step !== 'scanning' && (
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-foreground">
                    {step === 'choose' && 'הוסף ביקור / חיסון'}
                    {step === 'review' && 'אישור נתונים'}
                    {step === 'manual' && 'הזנה ידנית'}
                  </h3>
                  <button onClick={handleClose} className="p-2 rounded-full hover:bg-muted transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              )}

              {/* Step: Choose */}
              {step === 'choose' && (
                <div className="space-y-3">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/50 border border-border/30 hover:bg-muted transition-colors text-right"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Camera className="w-6 h-6 text-blue-500" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">סרוק מסמך</p>
                      <p className="text-[11px] text-muted-foreground">צלם דו"ח או קבלה מהווטרינר</p>
                    </div>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/50 border border-border/30 hover:bg-muted transition-colors text-right"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center shrink-0">
                      <FileUp className="w-6 h-6 text-purple-500" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">העלה קובץ</p>
                      <p className="text-[11px] text-muted-foreground">בחר תמונה או PDF מהמכשיר</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setStep('manual')}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/50 border border-border/30 hover:bg-muted transition-colors text-right"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
                      <PenLine className="w-6 h-6 text-amber-500" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">הזנה ידנית</p>
                      <p className="text-[11px] text-muted-foreground">הקלד את פרטי הביקור</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Step: Scanning */}
              {step === 'scanning' && (
                <div className="flex flex-col items-center justify-center py-12 gap-6">
                  <AILoader text="סורק" />
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      {petName} מנתחת את המסמך...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      עוד רגע הציון יתעדכן
                    </p>
                  </div>
                  {/* Pulsing ring around pet name */}
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.2, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-20 h-20 rounded-full border-2 border-primary/30"
                  />
                </div>
              )}

              {/* Step: Review (Post-Scan Approval) */}
              {step === 'review' && scanResult && (
                <div className="space-y-4">
                  {/* Detected items */}
                  <div className="space-y-3 p-4 bg-muted/30 rounded-2xl border border-border/20">
                    <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      זוהה מהמסמך
                    </p>

                    {scanResult.clinicName && (
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                        <span className="text-sm text-foreground">{scanResult.clinicName}</span>
                      </div>
                    )}

                    {scanResult.visitDate && (
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                        <div>
                          <span className="text-sm text-foreground">
                            תאריך ביקור: {new Date(scanResult.visitDate).toLocaleDateString("he-IL")}
                          </span>
                        </div>
                      </div>
                    )}

                    {scanResult.vaccines.length > 0 && (
                      <div className="p-3 bg-green-500/5 rounded-xl border border-green-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Syringe className="w-4 h-4 text-green-600" strokeWidth={1.5} />
                          <span className="text-sm font-semibold text-green-700">חיסונים שזוהו</span>
                        </div>
                        <p className="text-sm text-foreground mr-6">{scanResult.vaccines.join(", ")}</p>
                      </div>
                    )}

                    {scanResult.nextDueDate && (
                      <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CalendarPlus className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
                            <div>
                              <span className="text-xs font-medium text-blue-700">חיסון הבא</span>
                              <p className="text-sm font-semibold text-foreground">
                                {new Date(scanResult.nextDueDate).toLocaleDateString("he-IL")}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs border-blue-500/30 text-blue-600"
                            onClick={() => addToCalendar(`חיסון ${petName}`, scanResult.nextDueDate!)}
                          >
                            <CalendarPlus className="w-3.5 h-3.5 ml-1" />
                            ליומן
                          </Button>
                        </div>
                      </div>
                    )}

                    {scanResult.weight && (
                      <div className="flex items-center gap-3">
                        <Weight className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                        <span className="text-sm text-foreground">משקל: {scanResult.weight} ק"ג</span>
                      </div>
                    )}

                    {scanResult.deworming && (
                      <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-medium text-green-700">תילוע בוצע — תזכורת ב-6 חודשים</span>
                      </div>
                    )}

                    {scanResult.diagnoses.length > 0 && (
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" strokeWidth={1.5} />
                        <div>
                          <p className="text-xs font-medium text-amber-600">אבחנות</p>
                          <p className="text-xs text-muted-foreground">{scanResult.diagnoses.join(", ")}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm / Edit buttons */}
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 h-12 rounded-2xl font-semibold"
                      onClick={handleConfirm}
                      disabled={confirming}
                    >
                      {confirming ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 ml-2" />
                          אישור ועדכון
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12 rounded-2xl px-5"
                      onClick={() => { setScanResult(null); setStep('choose'); }}
                    >
                      סרוק שוב
                    </Button>
                  </div>
                </div>
              )}

              {/* Step: Manual Entry */}
              {step === 'manual' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">תאריך ביקור</label>
                    <Input
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">שם מרפאה (אופציונלי)</label>
                    <Input
                      value={manualClinic}
                      onChange={(e) => setManualClinic(e.target.value)}
                      placeholder="לדוגמה: מרפאת הכלבלב"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">סיכום הביקור</label>
                    <Textarea
                      value={manualSummary}
                      onChange={(e) => setManualSummary(e.target.value)}
                      placeholder="תארו את הביקור — חיסונים, אבחנות, תרופות..."
                      className="min-h-[100px] rounded-xl resize-none"
                    />
                  </div>
                  <Button
                    className="w-full h-12 rounded-2xl font-semibold"
                    onClick={handleManualSubmit}
                    disabled={manualSubmitting || !manualSummary.trim()}
                  >
                    {manualSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 ml-2" />
                        שמור ביקור
                      </>
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
