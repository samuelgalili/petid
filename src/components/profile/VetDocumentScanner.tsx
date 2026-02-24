/**
 * VetDocumentScanner - OCR upload for vet reports/invoices
 * AI scans image to identify clinic, date, vaccines, diagnoses, owner & pet identity
 * V2: Smart Sync — compares detected data with existing DB values before saving
 */

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Upload, Loader2, CheckCircle2, X, Save,
  Building2, Calendar, Syringe, Pill, Stethoscope,
  Weight, Bug, CreditCard, User, MapPin, Phone, IdCard,
  Dog, Palette, Heart, CalendarPlus, Cpu, Scissors, Shield, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SmartSyncReviewModal, FieldComparison } from "./SmartSyncReviewModal";

interface VetDocumentScannerProps {
  petId: string;
  petName: string;
  onScanComplete?: () => void;
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
  ownerName: string | null;
  ownerAddress: string | null;
  ownerCity: string | null;
  ownerPhone: string | null;
  ownerIdNumber: string | null;
  petName: string | null;
  petBreed: string | null;
  petColor: string | null;
  petGender: string | null;
  petAge: number | null;
  petBirthDate: string | null;
  microchipNumber: string | null;
  isNeutered: boolean | null;
  isDangerousBreed: boolean;
  isDangerousDog: boolean | null;
  licenseNumber: string | null;
  licenseExpiryDate: string | null;
  licenseRenewalDate: string | null;
  licenseConditions: string | null;
  documentCategory: string | null;
  nextTreatmentDate: string | null;
  nextTreatmentDescription: string | null;
}

// Section component for grouped display
const Section = ({ title, icon: Icon, color, children }: {
  title: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
}) => (
  <div className={`p-2.5 rounded-xl border border-${color}/20 bg-${color}/5 space-y-1.5`}>
    <div className="flex items-center gap-1.5">
      <Icon className={`w-3.5 h-3.5 text-${color}`} strokeWidth={1.5} />
      <span className={`text-[11px] font-semibold text-${color}`}>{title}</span>
    </div>
    {children}
  </div>
);

const DataRow = ({ icon: Icon, label, value }: {
  icon?: React.ElementType;
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-2">
    {Icon && <Icon className="w-3 h-3 text-muted-foreground shrink-0" strokeWidth={1.5} />}
    <span className="text-[10px] text-muted-foreground">{label}:</span>
    <span className="text-[10px] text-foreground font-medium">{value}</span>
  </div>
);

export const VetDocumentScanner = ({ petId, petName, onScanComplete }: VetDocumentScannerProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [comparisonFields, setComparisonFields] = useState<FieldComparison[]>([]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      setImageBase64(base64);
      await scanDocument(base64, file.name);
    };
    reader.readAsDataURL(file);
  };

  const scanDocument = async (base64Content: string, fileName: string) => {
    setScanning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("scan-vet-document", {
        body: { petId, userId: user.id, imageBase64: base64Content, fileName },
      });
      if (error) throw error;
      setScanResult(data.scanResult);
      toast({ title: "מסמך נסרק בהצלחה ✅", description: "בדוק את הנתונים ואשר לשמירה" });
    } catch (error) {
      console.error("Scan error:", error);
      toast({ title: "שגיאה בסריקת המסמך", description: "נסה שוב או הזן ידנית", variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  /** Build comparison fields by fetching current DB values */
  const openSmartSyncModal = async () => {
    if (!scanResult) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch current profile and pet data in parallel
      const [profileRes, petRes] = await Promise.all([
        supabase.from("profiles").select("first_name, last_name, phone, street, city").eq("id", user.id).single(),
        supabase.from("pets").select("name, breed, birth_date, microchip_number, age, weight, color, gender, is_neutered").eq("id", petId).single(),
      ]);

      const profile = profileRes.data;
      const pet = petRes.data;

      const currentFullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || null;
      const currentAddress = [profile?.street, profile?.city].filter(Boolean).join(", ") || null;

      const formatGender = (g: string | null) => {
        if (!g) return null;
        return g === "male" ? "זכר" : g === "female" ? "נקבה" : g;
      };

      const fields: FieldComparison[] = [
        // Profile fields
        { key: "ownerName", label: "שם בעלים", icon: User, currentValue: currentFullName, detectedValue: scanResult.ownerName, table: "profiles", dbField: "full_name" },
        { key: "ownerPhone", label: "טלפון", icon: Phone, currentValue: profile?.phone || null, detectedValue: scanResult.ownerPhone, table: "profiles", dbField: "phone" },
        { key: "ownerAddress", label: "כתובת", icon: MapPin, currentValue: currentAddress, detectedValue: [scanResult.ownerAddress, scanResult.ownerCity].filter(Boolean).join(", ") || null, table: "profiles", dbField: "address" },
        // Pet fields
        { key: "petName", label: "שם חיית מחמד", icon: Dog, currentValue: pet?.name || null, detectedValue: scanResult.petName, table: "pets", dbField: "name" },
        { key: "petBreed", label: "גזע", icon: Dog, currentValue: pet?.breed || null, detectedValue: scanResult.petBreed, table: "pets", dbField: "breed" },
        { key: "petBirthDate", label: "תאריך לידה", icon: Calendar, currentValue: pet?.birth_date || null, detectedValue: scanResult.petBirthDate, table: "pets", dbField: "birth_date" },
        { key: "microchipNumber", label: "מספר שבב", icon: Cpu, currentValue: pet?.microchip_number || null, detectedValue: scanResult.microchipNumber, table: "pets", dbField: "microchip_number" },
        { key: "petWeight", label: "משקל", icon: Weight, currentValue: pet?.weight ? `${pet.weight}` : null, detectedValue: scanResult.weight ? `${scanResult.weight}` : null, table: "pets", dbField: "weight" },
        { key: "petColor", label: "צבע", icon: Palette, currentValue: pet?.color || null, detectedValue: scanResult.petColor, table: "pets", dbField: "color" },
        { key: "petGender", label: "מין", icon: Heart, currentValue: formatGender(pet?.gender), detectedValue: formatGender(scanResult.petGender), table: "pets", dbField: "gender" },
      ];

      setComparisonFields(fields);
      setShowSyncModal(true);
    } catch (err) {
      console.error("Failed to build comparison:", err);
      // Fallback to direct save
      handleConfirmSave();
    }
  };

  const handleSmartSyncConfirm = async (selectedFields: FieldComparison[]) => {
    if (!scanResult) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke("scan-vet-document", {
        body: {
          petId,
          userId: user.id,
          imageBase64: "",
          fileName: "smart-sync-save",
          saveToDb: true,
          cachedResult: scanResult,
          imageBase64ForSave: imageBase64,
          selectedFields: selectedFields.map(f => ({
            key: f.key,
            table: f.table,
            dbField: f.dbField,
            detectedValue: f.detectedValue,
          })),
          triggerCarePlans: true,
        },
      });
      if (error) throw error;
      toast({ title: "הנתונים עודכנו בהצלחה ✅", description: "תזכורות טיפול נוצרו אוטומטית" });
      onScanComplete?.();
      handleReset();
    } catch (error) {
      console.error("Smart sync error:", error);
      toast({ title: "שגיאה בעדכון", variant: "destructive" });
    } finally {
      setSaving(false);
      setShowSyncModal(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!scanResult) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke("scan-vet-document", {
        body: { petId, userId: user.id, imageBase64: "", fileName: "confirm-save", saveToDb: true, cachedResult: scanResult, imageBase64ForSave: imageBase64 },
      });
      if (error) throw error;
      toast({ title: "הנתונים נשמרו בהצלחה ✅" });
      onScanComplete?.();
      handleReset();
    } catch (error) {
      console.error("Save error:", error);
      toast({ title: "שגיאה בשמירה", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setScanResult(null);
    setPreviewUrl(null);
    setImageBase64(null);
    setShowSyncModal(false);
    setComparisonFields([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("he-IL") : null;

  const hasClinicData = scanResult && (scanResult.clinicName || scanResult.clinicPhone || scanResult.clinicAddress);
  const hasMedicalData = scanResult && (scanResult.vaccines.length > 0 || scanResult.diagnoses.length > 0 || scanResult.medications.length > 0);
  const hasOwnerData = scanResult && (scanResult.ownerName || scanResult.ownerPhone || scanResult.ownerAddress || scanResult.ownerIdNumber);
  const hasPetIdentity = scanResult && (scanResult.petName || scanResult.petBreed || scanResult.petColor || scanResult.petGender || scanResult.petBirthDate || scanResult.microchipNumber || scanResult.isNeutered !== null);

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-4 mb-4">
        <div className="p-4 bg-card rounded-2xl border border-border/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Camera className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
            </div>
            <span className="font-semibold text-foreground text-sm">סריקת מסמך וטרינר</span>
          </div>

          <p className="text-[10px] text-muted-foreground mb-3">
            צלם או העלה קבלה/דו"ח מהווטרינר — AI יזהה חיסונים, אבחנות, פרטי מרפאה ובעלים
          </p>

          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

          {!scanResult && !scanning && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-9 text-xs" onClick={() => fileInputRef.current?.click()}>
                <Camera className="w-3.5 h-3.5 ml-1.5" />
                צלם מסמך
              </Button>
              <Button variant="outline" size="sm" className="flex-1 h-9 text-xs" onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute("capture");
                  fileInputRef.current.click();
                  fileInputRef.current.setAttribute("capture", "environment");
                }
              }}>
                <Upload className="w-3.5 h-3.5 ml-1.5" />
                העלה תמונה
              </Button>
            </div>
          )}

          {scanning && (
            <div className="flex flex-col items-center gap-2 py-4">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">AI מנתח את המסמך...</p>
            </div>
          )}

          <AnimatePresence>
            {scanResult && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">נתונים שזוהו מהמסמך</p>
                  <button onClick={handleReset} className="p-1"><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                <p className="text-[10px] text-muted-foreground">בדוק את הנתונים ולחץ "סנכרון חכם" להשוואה עם הנתונים הקיימים</p>

                {/* Visit Info */}
                <div className="p-2.5 rounded-xl border border-primary/20 bg-primary/5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                    <span className="text-[11px] font-semibold text-primary">זוהה מהמסמך</span>
                  </div>
                  {scanResult.visitDate && <DataRow icon={Calendar} label="תאריך" value={formatDate(scanResult.visitDate)!} />}
                  {scanResult.weight && <DataRow icon={Weight} label="משקל" value={`${scanResult.weight} ק"ג`} />}
                  {scanResult.cost && <DataRow icon={CreditCard} label="עלות" value={`₪${scanResult.cost}`} />}
                </div>

                {/* Clinic */}
                {hasClinicData && (
                  <div className="p-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" strokeWidth={1.5} />
                      <span className="text-[11px] font-semibold text-blue-600">מרפאה</span>
                    </div>
                    {scanResult.clinicName && <DataRow icon={Building2} label="שם" value={scanResult.clinicName} />}
                    {scanResult.clinicPhone && <DataRow icon={Phone} label="טלפון" value={scanResult.clinicPhone} />}
                    {scanResult.clinicAddress && <DataRow icon={MapPin} label="כתובת" value={scanResult.clinicAddress} />}
                  </div>
                )}

                {/* Medical */}
                {hasMedicalData && (
                  <div className="p-2.5 rounded-xl border border-green-500/20 bg-green-500/5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Syringe className="w-3.5 h-3.5 text-green-500" strokeWidth={1.5} />
                      <span className="text-[11px] font-semibold text-green-600">חיסונים שזוהו</span>
                    </div>
                    {scanResult.vaccines.length > 0 && (
                      <div className="space-y-0.5">
                        {scanResult.vaccines.map((v, i) => (
                          <span key={i} className="text-[10px] text-foreground block">💉 {v}</span>
                        ))}
                      </div>
                    )}
                    {scanResult.diagnoses.length > 0 && (
                      <>
                        <div className="flex items-center gap-1.5 pt-1">
                          <Stethoscope className="w-3 h-3 text-orange-500" strokeWidth={1.5} />
                          <span className="text-[10px] font-medium text-orange-600">אבחנות</span>
                        </div>
                        {scanResult.diagnoses.map((d, i) => (
                          <span key={i} className="text-[10px] text-foreground block">🔍 {d}</span>
                        ))}
                      </>
                    )}
                    {scanResult.medications.length > 0 && (
                      <>
                        <div className="flex items-center gap-1.5 pt-1">
                          <Pill className="w-3 h-3 text-purple-500" strokeWidth={1.5} />
                          <span className="text-[10px] font-medium text-purple-600">תרופות</span>
                        </div>
                        {scanResult.medications.map((m, i) => (
                          <span key={i} className="text-[10px] text-foreground block">💊 {m}</span>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* Deworming */}
                {scanResult.deworming && (
                  <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-xl border border-green-500/20">
                    <Bug className="w-3.5 h-3.5 text-green-600" strokeWidth={1.5} />
                    <span className="text-[10px] font-medium text-green-600">✅ תילוע בוצע — תזכורת ב-6 חודשים</span>
                  </div>
                )}

                {/* Pet Identity */}
                {hasPetIdentity && (
                  <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Dog className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.5} />
                      <span className="text-[11px] font-semibold text-amber-700">פרטי חיית המחמד</span>
                    </div>
                    {scanResult.petName && <DataRow icon={Dog} label="שם" value={scanResult.petName} />}
                    {scanResult.petBreed && <DataRow icon={Dog} label="גזע" value={scanResult.petBreed} />}
                    {scanResult.petColor && <DataRow icon={Palette} label="צבע" value={scanResult.petColor} />}
                    {scanResult.petGender && <DataRow icon={Heart} label="מין" value={scanResult.petGender === "male" ? "זכר" : "נקבה"} />}
                    {scanResult.petBirthDate && <DataRow icon={Calendar} label="תאריך לידה" value={formatDate(scanResult.petBirthDate)!} />}
                    {scanResult.microchipNumber && <DataRow icon={Cpu} label="מספר שבב" value={scanResult.microchipNumber} />}
                    {scanResult.isNeutered !== null && (
                      <DataRow icon={Scissors} label="עיקור/סירוס" value={scanResult.isNeutered ? "כן" : "לא"} />
                    )}
                    {scanResult.isDangerousBreed && (
                      <div className="flex items-center gap-1.5 p-1.5 bg-red-500/10 rounded-lg mt-1">
                        <Shield className="w-3 h-3 text-red-500" />
                        <span className="text-[10px] font-medium text-red-600">⚠️ גזע מוגבל — נדרש רישיון</span>
                      </div>
                    )}
                    {scanResult.licenseConditions && <DataRow icon={FileText} label="תנאי רישיון" value={scanResult.licenseConditions} />}
                  </div>
                )}

                {/* Owner */}
                {hasOwnerData && (
                  <div className="p-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-600" strokeWidth={1.5} />
                      <span className="text-[11px] font-semibold text-indigo-700">פרטי בעלים</span>
                    </div>
                    {scanResult.ownerName && <DataRow icon={User} label="שם" value={scanResult.ownerName} />}
                    {scanResult.ownerPhone && <DataRow icon={Phone} label="טלפון" value={scanResult.ownerPhone} />}
                    {scanResult.ownerAddress && <DataRow icon={MapPin} label="כתובת" value={`${scanResult.ownerAddress}${scanResult.ownerCity ? `, ${scanResult.ownerCity}` : ""}`} />}
                    {scanResult.ownerIdNumber && <DataRow icon={IdCard} label="ת.ז." value={scanResult.ownerIdNumber} />}
                  </div>
                )}

                {/* Action Buttons — Smart Sync primary */}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 h-9 text-xs" onClick={handleReset}>
                    סרוק שוב
                  </Button>
                  <Button size="sm" className="flex-1 h-9 text-xs bg-gradient-to-r from-primary to-blue-500 text-white" onClick={openSmartSyncModal} disabled={saving}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" /> : <CheckCircle2 className="w-3.5 h-3.5 ml-1" />}
                    סנכרון חכם
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Smart Sync Review Modal */}
      <SmartSyncReviewModal
        open={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onConfirm={handleSmartSyncConfirm}
        fields={comparisonFields}
        loading={saving}
        vaccinesDetected={scanResult?.vaccines || []}
        treatmentDatesDetected={
          scanResult?.vaccines?.map(v => ({
            name: v,
            date: scanResult.visitDate
              ? new Date(new Date(scanResult.visitDate).setFullYear(new Date(scanResult.visitDate).getFullYear() + 1)).toLocaleDateString("he-IL")
              : "שנה מהיום",
          })) || []
        }
      />
    </>
  );
};
