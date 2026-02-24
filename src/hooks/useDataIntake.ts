/**
 * useDataIntake — V72 Data Intake Specialist
 * File triage, OCR pipeline, visual analysis, location emergency detection,
 * and privacy-first vault confirmations.
 */

import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/* ─── Types ─── */

export type IntakeType = "scan" | "camera" | "gallery" | "location";

export interface IntakeResult {
  type: IntakeType;
  /** Message to inject into the chat as the user's attachment context */
  userMessage: string;
  /** Follow-up prompt the AI should process */
  aiPrompt: string;
  /** File URL in storage (if applicable) */
  fileUrl?: string;
  /** GPS coords (if location) */
  coords?: { lat: number; lng: number };
}

interface UseDataIntakeOptions {
  petId: string | null;
  petName: string;
  isSOSActive?: boolean;
}

/* ─── Helpers ─── */

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function uploadToStorage(file: File, petId: string): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${petId}/${generateId()}.${ext}`;
  const bucket = "pet-documents";

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    console.error("Storage upload error:", error);
    return null;
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return urlData?.publicUrl ?? null;
}

/** Classify file by MIME type */
function triageFile(file: File): "document" | "photo" | "video" {
  if (file.type.startsWith("image/")) return "photo";
  if (file.type.startsWith("video/")) return "video";
  // PDFs, word docs, etc.
  return "document";
}

/* ─── Hook ─── */

export function useDataIntake({ petId, petName, isSOSActive = false }: UseDataIntakeOptions) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const resolveRef = useRef<((result: IntakeResult | null) => void) | null>(null);

  /**
   * Handle document scan — triggers OCR pipeline prompt
   */
  const handleScan = useCallback(async (file: File): Promise<IntakeResult> => {
    if (!petId) {
      toast({ title: "נא לבחור חיית מחמד קודם", variant: "destructive" });
      return { type: "scan", userMessage: "", aiPrompt: "" };
    }

    toast({ title: "🔍 סורק מסמך...", description: `מעבד את הקובץ עבור ${petName}` });

    const fileUrl = await uploadToStorage(file, petId);
    if (!fileUrl) {
      toast({ title: "שגיאה בהעלאה", description: "נסה שוב", variant: "destructive" });
      return { type: "scan", userMessage: "", aiPrompt: "" };
    }

    // Auto-save to documents
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { autoSaveToDocuments } = await import("@/lib/autoSaveUpload");
      await autoSaveToDocuments({
        userId: user.id,
        petId,
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        documentType: "vet_report",
        title: `סריקת מסמך - ${file.name}`,
      });
    }

    toast({
      title: "🔒 המסמך נשמר בצורה מאובטחת",
      description: `נשמר בכספת של ${petName}`,
    });

    return {
      type: "scan",
      fileUrl,
      userMessage: `📄 סרקתי מסמך רפואי חדש עבור ${petName}`,
      aiPrompt: `[DOCUMENT_UPLOADED: url=${fileUrl}, pet=${petName}, petId=${petId}]\nהמשתמש העלה מסמך רפואי חדש. הפעל את מנוע ה-OCR, נתח את המסמך, ושאל: "זיהיתי רשומה רפואית חדשה. האם לעדכן את ציון הבריאות של ${petName}?"`,
    };
  }, [petId, petName, toast]);

  /**
   * Handle photo/video — triggers visual analysis
   */
  const handleVisual = useCallback(async (file: File, source: "camera" | "gallery"): Promise<IntakeResult> => {
    if (!petId) {
      toast({ title: "נא לבחור חיית מחמד קודם", variant: "destructive" });
      return { type: source, userMessage: "", aiPrompt: "" };
    }

    const fileType = triageFile(file);

    toast({ title: fileType === "document" ? "🔍 סורק מסמך..." : "📸 מעלה תמונה...", description: `מעבד עבור ${petName}` });

    const fileUrl = await uploadToStorage(file, petId);
    if (!fileUrl) {
      toast({ title: "שגיאה בהעלאה", description: "נסה שוב", variant: "destructive" });
      return { type: source, userMessage: "", aiPrompt: "" };
    }

    toast({
      title: "🔒 הקובץ נשמר בצורה מאובטחת",
      description: `נשמר בכספת של ${petName}`,
    });

    // If the user uploaded a document via gallery, redirect to OCR
    if (fileType === "document") {
      return {
        type: source,
        fileUrl,
        userMessage: `📄 העליתי מסמך עבור ${petName}`,
        aiPrompt: `[DOCUMENT_UPLOADED: url=${fileUrl}, pet=${petName}, petId=${petId}]\nהמשתמש העלה מסמך דרך הגלריה. הפעל OCR ושאל אם לעדכן את ציון הבריאות.`,
      };
    }

    // Photo/video → visual analysis
    const isVideo = fileType === "video";
    return {
      type: source,
      fileUrl,
      userMessage: isVideo
        ? `🎥 שלחתי וידאו של ${petName} לבדיקה`
        : `📸 שלחתי תמונה של ${petName} לבדיקה`,
      aiPrompt: `[VISUAL_UPLOADED: url=${fileUrl}, pet=${petName}, petId=${petId}, type=${fileType}]\nהמשתמש העלה ${isVideo ? "וידאו" : "תמונה"}. נתח ויזואלית וחפש תסמינים (אדמומיות, צליעה, פצעים). תמיד הוסף הסתייגות: "⚕️ אני AI, לא וטרינר. למצבי חירום, השתמש בכפתור SOS."`,
    };
  }, [petId, petName, toast]);

  /**
   * Handle location sharing — emergency detection
   */
  const handleLocation = useCallback((): Promise<IntakeResult> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        toast({ title: "GPS לא זמין", description: "הדפדפן לא תומך בשיתוף מיקום", variant: "destructive" });
        resolve({ type: "location", userMessage: "", aiPrompt: "" });
        return;
      }

      toast({ title: "📍 מאתר מיקום...", description: "ממתין ל-GPS" });

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          if (isSOSActive) {
            // Emergency priority
            toast({
              title: "🚨 מיקום חירום נשלח",
              description: "מחפש וטרינר פתוח בקרבת מקום",
              variant: "destructive",
            });

            resolve({
              type: "location",
              coords: { lat: latitude, lng: longitude },
              userMessage: `🚨 מיקום חירום: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
              aiPrompt: `[EMERGENCY_LOCATION: lat=${latitude}, lng=${longitude}, pet=${petName}, petId=${petId}]\nהמשתמש שיתף מיקום במצב SOS חירום! תעדוף מיקום זה מעל כל נתון אחר. מצא את הווטרינר הפתוח הקרוב ביותר והצג מספר טלפון ומסלול הגעה.`,
            });
          } else {
            toast({
              title: "📍 מיקום נשלח",
              description: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            });

            resolve({
              type: "location",
              coords: { lat: latitude, lng: longitude },
              userMessage: `📍 המיקום שלי: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
              aiPrompt: `[LOCATION_SHARED: lat=${latitude}, lng=${longitude}, pet=${petName}]\nהמשתמש שיתף מיקום. ענה בהתאם להקשר השיחה — אם מדובר בווטרינר, הצג קרובים. אם גינת כלבים, הצע גינות בקרבת מקום.`,
            });
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast({ title: "שגיאת מיקום", description: "לא ניתן לאתר. בדוק הרשאות GPS.", variant: "destructive" });
          resolve({ type: "location", userMessage: "", aiPrompt: "" });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, [petId, petName, isSOSActive, toast]);

  /**
   * Main entry — called from attachment sheet
   */
  const processIntake = useCallback(async (
    type: IntakeType,
    file?: File
  ): Promise<IntakeResult | null> => {
    switch (type) {
      case "scan":
        if (!file) return null;
        return handleScan(file);

      case "camera":
      case "gallery":
        if (!file) return null;
        return handleVisual(file, type);

      case "location":
        return handleLocation();

      default:
        return null;
    }
  }, [handleScan, handleVisual, handleLocation]);

  /**
   * Trigger file picker for a specific intake type
   */
  const triggerFilePicker = useCallback((type: IntakeType): Promise<IntakeResult | null> => {
    return new Promise((resolve) => {
      if (type === "location") {
        handleLocation().then(resolve);
        return;
      }

      // Create a temporary input element
      const input = document.createElement("input");
      input.type = "file";
      input.style.display = "none";

      if (type === "scan") {
        input.accept = "image/*,application/pdf";
        input.setAttribute("capture", "environment");
      } else if (type === "camera") {
        input.accept = "image/*,video/*";
        input.setAttribute("capture", "environment");
      } else {
        // gallery
        input.accept = "image/*,video/*,application/pdf";
      }

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(null);
          document.body.removeChild(input);
          return;
        }

        const result = await processIntake(type, file);
        resolve(result);
        document.body.removeChild(input);
      };

      input.oncancel = () => {
        resolve(null);
        document.body.removeChild(input);
      };

      document.body.appendChild(input);
      input.click();
    });
  }, [processIntake, handleLocation]);

  return {
    triggerFilePicker,
    processIntake,
  };
}
