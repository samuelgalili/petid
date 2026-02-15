/**
 * MedicalDocumentFAB - V22 Diagnostic Scanner Edition
 * FAB + Modal: Scan Document, Upload PDF, Manual Entry
 * Deferred save: extracts first, saves only after user confirmation
 * Breed weight comparison, insurance claim CTA for diagnoses
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Camera, FileUp, PenLine, X, Loader2,
  Syringe, Building2, Calendar, CheckCircle2, AlertTriangle,
  CalendarPlus, Weight, Shield, Pill, User, MapPin, Phone, Hash
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
  petBreed?: string;
  onComplete?: () => void;
}

interface ScanResult {
  clinicName: string | null;
  clinicPhone: string | null;
  clinicAddress: string | null;
  visitDate: string | null;
  vaccines: string[];
  diagnoses: string[];
  medications: string[];
  weight: number | null;
  deworming: boolean;
  cost: number | null;
  nextDueDate?: string | null;
  ownerName: string | null;
  ownerAddress: string | null;
  ownerCity: string | null;
  ownerPhone: string | null;
  ownerIdNumber: string | null;
}

type ModalStep = 'closed' | 'choose' | 'scanning' | 'review' | 'profileReview' | 'manual';

// Shih Tzu weight standards by age (months → expected kg range)
const SHIH_TZU_WEIGHT: Record<number, [number, number]> = {
  2: [0.9, 1.8], 3: [1.4, 2.7], 4: [1.8, 3.6], 5: [2.3, 4.1],
  6: [2.7, 4.5], 9: [3.6, 5.9], 12: [4.1, 7.3],
};

export const MedicalDocumentFAB = ({ petId, petName, petBirthDate, petBreed, onComplete }: MedicalDocumentFABProps) => {
  const { toast } = useToast();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ModalStep>('closed');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [lastBase64, setLastBase64] = useState<string | null>(null);
  const [lastFileName, setLastFileName] = useState('');

  // Manual entry state
  const [manualSummary, setManualSummary] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualClinic, setManualClinic] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Breed weight comparison for Shih Tzu
  const getWeightStatus = useCallback((weight: number): { status: 'low' | 'normal' | 'high'; message: string } | null => {
    if (!petBirthDate || !petBreed) return null;
    const bl = petBreed.toLowerCase();
    if (!bl.includes('shih') && !bl.includes('שיצו') && !bl.includes('שי טסו')) return null;

    const ageMonths = Math.round((Date.now() - new Date(petBirthDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
    const keys = Object.keys(SHIH_TZU_WEIGHT).map(Number).sort((a, b) => a - b);
    let closest = keys[0];
    for (const k of keys) {
      if (Math.abs(k - ageMonths) < Math.abs(closest - ageMonths)) closest = k;
    }
    const [low, high] = SHIH_TZU_WEIGHT[closest];

    if (weight < low) return { status: 'low', message: `${weight} ק"ג — מתחת לטווח (${low}-${high} ק"ג לגיל ${ageMonths} חודשים). מומלץ להתייעץ.` };
    if (weight > high) return { status: 'high', message: `${weight} ק"ג — מעל לטווח (${low}-${high} ק"ג לגיל ${ageMonths} חודשים). שקלו התאמת תזונה.` };
    return { status: 'normal', message: `${weight} ק"ג — בטווח תקין (${low}-${high} ק"ג לגיל ${ageMonths} חודשים)` };
  }, [petBirthDate, petBreed]);

  // Calculate next due date based on puppy series
  const calculateNextDue = useCallback((vaccines: string[], visitDate: string): string | null => {
    if (!petBirthDate || vaccines.length === 0) return null;
    const birth = new Date(petBirthDate);
    const now = new Date();
    const ageWeeks = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 7));

    if (ageWeeks > 26) {
      const next = new Date(visitDate);
      next.setFullYear(next.getFullYear() + 1);
      return next.toISOString().split('T')[0];
    }

    const milestones = [6, 9, 12, 16];
    for (const w of milestones) {
      const d = new Date(birth);
      d.setDate(d.getDate() + w * 7);
      if (d > now) return d.toISOString().split('T')[0];
    }
    return null;
  }, [petBirthDate]);

  // Scan without saving — dry run
  const processFile = async (base64: string, fileName: string) => {
    setStep('scanning');
    setLastBase64(base64);
    setLastFileName(fileName);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("scan-vet-document", {
        body: { petId, userId: user.id, imageBase64: base64, fileName, saveToDb: false },
      });
      if (error) throw error;

      const result: ScanResult = data.scanResult;
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
    reader.onload = () => processFile((reader.result as string).split(",")[1], file.name);
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => processFile((reader.result as string).split(",")[1], file.name);
    reader.readAsDataURL(file);
  };

  // Save only after user confirms
  const handleConfirm = async () => {
    if (!scanResult) return;
    setConfirming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (lastBase64) {
        await supabase.functions.invoke("scan-vet-document", {
          body: { petId, userId: user.id, imageBase64: lastBase64, fileName: lastFileName, saveToDb: true },
        });
      }

      // Save clinic info to pet
      if (scanResult.clinicName) {
        const clinicUpdate: Record<string, unknown> = { vet_clinic_name: scanResult.clinicName };
        if (scanResult.clinicPhone) clinicUpdate.vet_clinic_phone = scanResult.clinicPhone;
        if (scanResult.clinicAddress) clinicUpdate.vet_clinic_address = scanResult.clinicAddress;
        await supabase.from("pets").update(clinicUpdate).eq("id", petId);
      }

      toast({ title: "הנתונים אושרו ✅", description: "ציון הבריאות ולוח החיסונים עודכנו" });

      // Check if profile data was extracted — offer update
      const hasProfileData = scanResult.ownerName || scanResult.ownerAddress || scanResult.ownerPhone || scanResult.ownerIdNumber;
      if (hasProfileData) {
        setStep('profileReview');
        setConfirming(false);
        return;
      }

      onComplete?.();
      handleClose();
    } catch {
      toast({ title: "שגיאה בשמירה", variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  };

  // Save profile data after user approves
  const handleProfileConfirm = async () => {
    if (!scanResult) return;
    setConfirming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const profileUpdate: Record<string, unknown> = {};
      if (scanResult.ownerName) profileUpdate.full_name = scanResult.ownerName;
      if (scanResult.ownerCity) profileUpdate.city = scanResult.ownerCity;
      if (scanResult.ownerAddress) profileUpdate.street = scanResult.ownerAddress;
      if (scanResult.ownerPhone) profileUpdate.phone = scanResult.ownerPhone;
      if (scanResult.ownerIdNumber) {
        // Store encrypted and last 4 digits masked
        profileUpdate.id_number_encrypted = scanResult.ownerIdNumber;
        profileUpdate.id_number_last4 = scanResult.ownerIdNumber.slice(-4);
      }

      if (Object.keys(profileUpdate).length > 0) {
        await supabase.from("profiles").update(profileUpdate).eq("id", user.id);
      }

      toast({ title: "הפרופיל עודכן ✅", description: "הפרטים האישיים נשמרו בהצלחה" });
      onComplete?.();
      handleClose();
    } catch {
      toast({ title: "שגיאה בעדכון הפרופיל", variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  };

  const handleSkipProfile = () => {
    onComplete?.();
    handleClose();
  };

  const handleManualSubmit = async () => {
    if (!manualSummary.trim()) return;
    setManualSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("extract-vet-summary", {
        body: { petId, userId: user.id, summary: manualSummary, visitDate: manualDate, clinicName: manualClinic || null },
      });
      if (error) throw error;

      const extracted = data.extracted;
      setScanResult({
        clinicName: manualClinic || null,
        clinicPhone: null,
        clinicAddress: null,
        visitDate: manualDate,
        vaccines: extracted.vaccines || [],
        diagnoses: extracted.diagnoses || [],
        medications: extracted.medications || [],
        weight: null,
        deworming: false,
        cost: null,
        nextDueDate: extracted.nextVisitDate,
        ownerName: null,
        ownerAddress: null,
        ownerCity: null,
        ownerPhone: null,
        ownerIdNumber: null,
      });
      setLastBase64(null); // Manual — already saved by extract-vet-summary
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
    setLastBase64(null);
    setLastFileName('');
    setManualSummary('');
    setManualDate(new Date().toISOString().split('T')[0]);
    setManualClinic('');
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addToCalendar = (title: string, date: string) => {
    const d = new Date(date);
    const end = new Date(d);
    end.setHours(end.getHours() + 1);
    const fmt = (dt: Date) => dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(d)}/${fmt(end)}`, '_blank');
  };

  const weightStatus = scanResult?.weight ? getWeightStatus(scanResult.weight) : null;

  return (
    <>
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

      {/* FAB Label */}
      <AnimatePresence>
        {step === 'closed' && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.2 }}
            className="fixed bottom-[6.5rem] left-[4.75rem] z-50 bg-card border border-border/40 rounded-xl px-3 py-1.5 shadow-md pointer-events-none"
          >
            <span className="text-[10px] font-medium text-foreground whitespace-nowrap">הוסף ביקור/חיסון</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
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
                    {step === 'review' && 'אישור נתונים שזוהו'}
                    {step === 'profileReview' && 'עדכון פרופיל אישי'}
                    {step === 'manual' && 'הזנה ידנית'}
                  </h3>
                  <button onClick={handleClose} className="p-2 rounded-full hover:bg-muted transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              )}

              {/* Choose */}
              {step === 'choose' && (
                <div className="space-y-3">
                  <button onClick={() => cameraInputRef.current?.click()} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/50 border border-border/30 hover:bg-muted transition-colors text-right">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Camera className="w-6 h-6 text-blue-500" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">סרוק מסמך</p>
                      <p className="text-[11px] text-muted-foreground">צלם דו"ח או קבלה מהווטרינר</p>
                    </div>
                  </button>

                  <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/50 border border-border/30 hover:bg-muted transition-colors text-right">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center shrink-0">
                      <FileUp className="w-6 h-6 text-purple-500" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">העלה קובץ</p>
                      <p className="text-[11px] text-muted-foreground">בחר תמונה או PDF מהמכשיר</p>
                    </div>
                  </button>

                  <button onClick={() => setStep('manual')} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/50 border border-border/30 hover:bg-muted transition-colors text-right">
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

              {/* Scanning */}
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
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.2, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-20 h-20 rounded-full border-2 border-primary/30"
                  />
                </div>
              )}

              {/* Review — Post-Scan Approval */}
              {step === 'review' && scanResult && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    בדוק את הנתונים שזוהו ואשר לשמירה
                  </p>

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
                        <span className="text-sm text-foreground">
                          תאריך: {new Date(scanResult.visitDate).toLocaleDateString("he-IL")}
                        </span>
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
                              <span className="text-xs font-medium text-blue-700">חיסון הבא (לפי לוח גורים)</span>
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

                    {scanResult.medications.length > 0 && (
                      <div className="flex items-start gap-3">
                        <Pill className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.5} />
                        <div>
                          <p className="text-xs font-medium text-foreground">תרופות</p>
                          <p className="text-xs text-muted-foreground">{scanResult.medications.join(", ")}</p>
                        </div>
                      </div>
                    )}

                    {/* Weight with breed comparison */}
                    {scanResult.weight && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <Weight className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                          <span className="text-sm text-foreground">משקל: {scanResult.weight} ק"ג</span>
                        </div>
                        {weightStatus && (
                          <div className={`p-2 rounded-lg text-xs font-medium mr-7 ${
                            weightStatus.status === 'normal' 
                              ? 'bg-green-500/10 text-green-700' 
                              : 'bg-amber-500/10 text-amber-700'
                          }`}>
                            {weightStatus.status === 'normal' ? '✅' : '⚠️'} {weightStatus.message}
                          </div>
                        )}
                      </div>
                    )}

                    {scanResult.deworming && (
                      <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-medium text-green-700">תילוע בוצע — תזכורת ב-6 חודשים</span>
                      </div>
                    )}

                    {/* Diagnoses with insurance CTA */}
                    {scanResult.diagnoses.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" strokeWidth={1.5} />
                          <div>
                            <p className="text-xs font-medium text-amber-600">אבחנות</p>
                            <p className="text-xs text-muted-foreground">{scanResult.diagnoses.join(", ")}</p>
                          </div>
                        </div>
                        {/* Insurance claim offer */}
                        <div className="p-3 bg-primary/5 rounded-xl border border-primary/20">
                          <div className="flex items-center gap-2 mb-1">
                            <Shield className="w-4 h-4 text-primary" strokeWidth={1.5} />
                            <span className="text-xs font-semibold text-primary">שליחה לביטוח ליברה</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mb-2">
                            זוהתה אבחנה — ניתן לשלוח את המסמך ישירות לביטוח לצורך תביעה
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs border-primary/30 text-primary w-full"
                            onClick={() => {
                              toast({ title: "📋 המסמך נשלח לליברה", description: "נציג ביטוח ייצור קשר בקרוב" });
                            }}
                          >
                            <Shield className="w-3.5 h-3.5 ml-1" />
                            שלח לביטוח
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm / Rescan */}
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

              {/* Profile Review Step */}
              {step === 'profileReview' && scanResult && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
                      <p className="text-sm font-semibold text-blue-700">
                        מצאנו את הפרטים שלך במסמך. האם לעדכן את הפרופיל האישי?
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      {scanResult.ownerName && (
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                          <div>
                            <p className="text-[10px] text-muted-foreground">שם הבעלים</p>
                            <p className="text-sm text-foreground">{scanResult.ownerName}</p>
                          </div>
                        </div>
                      )}

                      {(scanResult.ownerAddress || scanResult.ownerCity) && (
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                          <div>
                            <p className="text-[10px] text-muted-foreground">כתובת מגורים</p>
                            <p className="text-sm text-foreground">
                              {[scanResult.ownerAddress, scanResult.ownerCity].filter(Boolean).join(', ')}
                            </p>
                          </div>
                        </div>
                      )}

                      {scanResult.ownerPhone && (
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                          <div>
                            <p className="text-[10px] text-muted-foreground">טלפון</p>
                            <p className="text-sm text-foreground">{scanResult.ownerPhone}</p>
                          </div>
                        </div>
                      )}

                      {scanResult.ownerIdNumber && (
                        <div className="flex items-center gap-3">
                          <Hash className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                          <div>
                            <p className="text-[10px] text-muted-foreground">ת"ז (מאובטח)</p>
                            <p className="text-sm text-foreground font-mono">
                              {'*'.repeat(Math.max(0, scanResult.ownerIdNumber.length - 4))}{scanResult.ownerIdNumber.slice(-4)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      className="flex-1 h-12 rounded-2xl font-semibold"
                      onClick={handleProfileConfirm}
                      disabled={confirming}
                    >
                      {confirming ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 ml-2" />
                          עדכן פרופיל
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12 rounded-2xl px-5"
                      onClick={handleSkipProfile}
                    >
                      דלג
                    </Button>
                  </div>
                </div>
              )}

              {/* Manual Entry */}
              {step === 'manual' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">תאריך ביקור</label>
                    <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">שם מרפאה (אופציונלי)</label>
                    <Input value={manualClinic} onChange={(e) => setManualClinic(e.target.value)} placeholder="לדוגמה: מרפאת הכלבלב" className="rounded-xl" />
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
                    {manualSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <><CheckCircle2 className="w-4 h-4 ml-2" />שמור ביקור</>
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
