/**
 * VetHistoryPDF - Export pet medical history to printable PDF
 * Generates a clean document for vet visits
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VetHistoryPDFProps {
  petId: string;
  petName: string;
  petBreed?: string;
  petType: string;
}

export const VetHistoryPDF = ({ petId, petName, petBreed, petType }: VetHistoryPDFProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Fetch all vet visits
      const { data: visits } = await supabase
        .from("pet_vet_visits")
        .select("*")
        .eq("pet_id", petId)
        .order("visit_date", { ascending: false });

      // Fetch pet data
      const { data: pet } = await supabase
        .from("pets")
        .select("name, type, breed, birth_date, weight, medical_conditions, is_neutered, current_food")
        .eq("id", petId)
        .maybeSingle();

      if (!visits || visits.length === 0) {
        toast({ title: "אין היסטוריה רפואית לייצוא", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Generate printable HTML
      const typeHe = petType === "dog" ? "כלב" : "חתול";
      const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>היסטוריה רפואית — ${petName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Heebo', sans-serif; padding: 40px; color: #1a1a2e; background: #fff; }
    .header { border-bottom: 3px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { font-size: 24px; color: #6366f1; }
    .header p { font-size: 13px; color: #666; margin-top: 4px; }
    .pet-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 24px; background: #f8f9fa; padding: 16px; border-radius: 8px; }
    .pet-info .item { font-size: 13px; }
    .pet-info .label { font-weight: 600; color: #333; }
    .pet-info .value { color: #666; }
    .visit { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .visit-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .visit-date { font-weight: 700; color: #6366f1; font-size: 14px; }
    .visit-type { background: #ede9fe; color: #6366f1; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .visit-detail { font-size: 12px; margin-top: 4px; color: #444; }
    .visit-detail strong { color: #222; }
    .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 10px; color: #999; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>🐾 PetID — היסטוריה רפואית</h1>
    <p>${petName} · ${petBreed || typeHe} · תאריך הפקה: ${new Date().toLocaleDateString("he-IL")}</p>
  </div>

  <div class="pet-info">
    <div class="item"><span class="label">שם: </span><span class="value">${pet?.name || petName}</span></div>
    <div class="item"><span class="label">סוג: </span><span class="value">${typeHe}</span></div>
    <div class="item"><span class="label">גזע: </span><span class="value">${pet?.breed || "לא ידוע"}</span></div>
    <div class="item"><span class="label">משקל: </span><span class="value">${pet?.weight ? pet.weight + " ק״ג" : "לא נמדד"}</span></div>
    <div class="item"><span class="label">שבב: </span><span class="value">לא ידוע</span></div>
    <div class="item"><span class="label">מעוקר/ת: </span><span class="value">${pet?.is_neutered ? "כן" : "לא"}</span></div>
    <div class="item"><span class="label">מצבים רפואיים: </span><span class="value">${(pet?.medical_conditions || []).join(", ") || "ללא"}</span></div>
    <div class="item"><span class="label">מזון נוכחי: </span><span class="value">${pet?.current_food || "לא צוין"}</span></div>
  </div>

  <h2 style="font-size:16px; margin-bottom:12px;">ביקורי וטרינר (${visits.length})</h2>

  ${visits.map((v: any) => {
    const typeLabels: Record<string, string> = {
      vaccination: "חיסון", surgery: "ניתוח", treatment: "טיפול", checkup: "בדיקה",
    };
    return `
    <div class="visit">
      <div class="visit-header">
        <span class="visit-date">${new Date(v.visit_date).toLocaleDateString("he-IL")}</span>
        <span class="visit-type">${typeLabels[v.visit_type] || v.visit_type || "ביקור"}</span>
      </div>
      ${v.clinic_name ? `<div class="visit-detail"><strong>מרפאה:</strong> ${v.clinic_name}</div>` : ""}
      ${v.vet_name ? `<div class="visit-detail"><strong>וטרינר:</strong> ${v.vet_name}</div>` : ""}
      ${v.diagnosis ? `<div class="visit-detail"><strong>אבחנה:</strong> ${v.diagnosis}</div>` : ""}
      ${v.treatment ? `<div class="visit-detail"><strong>טיפול:</strong> ${v.treatment}</div>` : ""}
      ${v.vaccines && (v.vaccines as string[]).length > 0 ? `<div class="visit-detail"><strong>חיסונים:</strong> ${(v.vaccines as string[]).join(", ")}</div>` : ""}
      ${v.notes ? `<div class="visit-detail"><strong>הערות:</strong> ${v.notes}</div>` : ""}
      ${v.cost ? `<div class="visit-detail"><strong>עלות:</strong> ₪${v.cost}</div>` : ""}
      ${v.next_visit_date ? `<div class="visit-detail"><strong>ביקור הבא:</strong> ${new Date(v.next_visit_date).toLocaleDateString("he-IL")}</div>` : ""}
    </div>`;
  }).join("")}

  <div class="footer">
    מסמך זה הופק אוטומטית על ידי PetID · אין לראות במידע זה תחליף לייעוץ וטרינרי מקצועי
  </div>
</body>
</html>`;

      // Open print dialog
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
      }

      toast({ title: "הדוח מוכן להדפסה 📄" });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({ title: "שגיאה בהפקת הדוח", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-4 mb-4"
    >
      <Button
        variant="outline"
        onClick={handleExport}
        disabled={loading}
        className="w-full h-10 text-sm gap-2 border-border/30"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" strokeWidth={1.5} />
        )}
        ייצוא היסטוריה רפואית ל-PDF
      </Button>
    </motion.div>
  );
};
