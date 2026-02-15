/**
 * VetDocumentScanner - OCR upload for vet reports/invoices
 * AI scans image to identify clinic, date, vaccines, and diagnoses
 */

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Loader2, CheckCircle2, FileText, Syringe, Building2, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VetDocumentScannerProps {
  petId: string;
  petName: string;
  onScanComplete?: () => void;
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
}

export const VetDocumentScanner = ({ petId, petName, onScanComplete }: VetDocumentScannerProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
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
        body: {
          petId,
          userId: user.id,
          imageBase64: base64Content,
          fileName,
        },
      });

      if (error) throw error;

      setScanResult(data.scanResult);

      const msgs: string[] = [];
      if (data.scanResult.vaccines?.length > 0) msgs.push(`💉 ${data.scanResult.vaccines.length} חיסונים`);
      if (data.scanResult.diagnoses?.length > 0) msgs.push(`🔍 ${data.scanResult.diagnoses.length} אבחנות`);
      if (data.scanResult.weight) msgs.push(`⚖️ ${data.scanResult.weight} ק"ג`);
      if (data.scanResult.deworming) msgs.push(`💊 תילוע זוהה`);

      toast({
        title: `מסמך וטרינר נסרק בהצלחה ✅`,
        description: msgs.join(" | ") || "הנתונים נשמרו",
      });

      onScanComplete?.();
    } catch (error) {
      console.error("Scan error:", error);
      toast({
        title: "שגיאה בסריקת המסמך",
        description: "נסה שוב או הזן את הנתונים ידנית",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const handleReset = () => {
    setScanResult(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4"
    >
      <div className="p-4 bg-card rounded-2xl border border-border/30">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Camera className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
          </div>
          <span className="font-semibold text-foreground text-sm">סריקת מסמך וטרינר</span>
        </div>

        <p className="text-[10px] text-muted-foreground mb-3">
          צלם או העלה קבלה/דו"ח מהווטרינר — AI יזהה חיסונים, אבחנות ומשקל
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />

        {!scanResult && !scanning && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="w-3.5 h-3.5 ml-1.5" />
              צלם מסמך
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute("capture");
                  fileInputRef.current.click();
                  fileInputRef.current.setAttribute("capture", "environment");
                }
              }}
            >
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
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2 p-3 bg-muted/30 rounded-xl border border-border/20"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-primary">🤖 זוהה מהמסמך:</p>
                <button onClick={handleReset} className="p-1">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              {scanResult.clinicName && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                  <span className="text-[10px] text-foreground">{scanResult.clinicName}</span>
                </div>
              )}

              {scanResult.visitDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                  <span className="text-[10px] text-foreground">
                    {new Date(scanResult.visitDate).toLocaleDateString("he-IL")}
                  </span>
                </div>
              )}

              {scanResult.vaccines.length > 0 && (
                <div className="flex items-start gap-2">
                  <Syringe className="w-3.5 h-3.5 text-green-500 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="text-[10px] font-medium text-green-600">חיסונים</p>
                    <p className="text-[10px] text-muted-foreground">{scanResult.vaccines.join(", ")}</p>
                  </div>
                </div>
              )}

              {scanResult.weight && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px]">⚖️</span>
                  <span className="text-[10px] text-foreground">משקל: {scanResult.weight} ק"ג</span>
                </div>
              )}

              {scanResult.deworming && (
                <div className="flex items-center gap-2 p-1.5 bg-green-500/10 rounded-lg">
                  <span className="text-[10px] font-medium text-green-600">✅ תילוע בוצע — תזכורת ב-6 חודשים</span>
                </div>
              )}

              <div className="flex justify-center pt-1">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
