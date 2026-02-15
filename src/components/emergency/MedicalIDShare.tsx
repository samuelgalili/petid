/**
 * MedicalIDShare - Generate & share one-time medical ID for emergency vets
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Share2, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MedicalIDShareProps {
  petId: string;
  petName: string;
  petBreed?: string | null;
  petType: string;
}

export const MedicalIDShare = ({ petId, petName, petBreed, petType }: MedicalIDShareProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [shared, setShared] = useState(false);

  const generateMedicalID = async () => {
    setLoading(true);
    try {
      // Fetch pet data
      const [petResult, visitsResult] = await Promise.all([
        supabase
          .from("pets")
          .select("name, type, breed, birth_date, weight, weight_unit, medical_conditions, is_neutered, current_food, health_notes, microchip_number, vet_name, vet_clinic")
          .eq("id", petId)
          .maybeSingle(),
        supabase
          .from("pet_vet_visits")
          .select("visit_date, visit_type, clinic_name, diagnosis, treatment, vaccines, medications")
          .eq("pet_id", petId)
          .order("visit_date", { ascending: false })
          .limit(10),
      ]);

      const pet = petResult.data;
      const visits = visitsResult.data || [];
      const typeHe = petType === "dog" ? "כלב" : "חתול";

      // Calculate age
      let ageDisplay = "לא ידוע";
      if (pet?.birth_date) {
        const birth = new Date(pet.birth_date);
        const now = new Date();
        const months = Math.floor((now.getTime() - birth.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
        ageDisplay = months >= 12 ? `${Math.floor(months / 12)} שנים` : `${months} חודשים`;
      }

      // All vaccines from visits
      const allVaccines = visits
        .filter((v: any) => v.vaccines?.length)
        .flatMap((v: any) => (v.vaccines as string[]).map((vac: string) => `${vac} (${new Date(v.visit_date).toLocaleDateString("he-IL")})`));

      const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Medical ID — ${petName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;600;700;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Heebo', sans-serif; padding: 20px; color: #1a1a2e; background: #fff; max-width: 600px; margin: 0 auto; }
    .emergency-header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: #fff; padding: 20px; border-radius: 16px; margin-bottom: 20px; text-align: center; }
    .emergency-header h1 { font-size: 22px; font-weight: 900; }
    .emergency-header p { font-size: 12px; opacity: 0.9; margin-top: 4px; }
    .section { background: #f8f9fa; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
    .section h3 { font-size: 14px; font-weight: 700; color: #6366f1; margin-bottom: 8px; border-bottom: 2px solid #6366f1; padding-bottom: 4px; }
    .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
    .row .label { font-weight: 600; color: #333; }
    .row .value { color: #555; }
    .alert { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 10px; margin-bottom: 12px; }
    .alert p { font-size: 12px; color: #991b1b; font-weight: 600; }
    .vaccine-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .vaccine-tag { background: #dcfce7; color: #166534; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .visit { border-bottom: 1px solid #e5e7eb; padding: 8px 0; font-size: 12px; }
    .visit:last-child { border: none; }
    .footer { text-align: center; font-size: 10px; color: #999; margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <div class="emergency-header">
    <h1>🚨 Medical ID — ${petName}</h1>
    <p>מסמך חירום · ${new Date().toLocaleDateString("he-IL")} · ${new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</p>
  </div>

  <div class="section">
    <h3>🐾 פרטי זיהוי</h3>
    <div class="row"><span class="label">שם</span><span class="value">${petName}</span></div>
    <div class="row"><span class="label">סוג</span><span class="value">${typeHe}</span></div>
    <div class="row"><span class="label">גזע</span><span class="value">${pet?.breed || petBreed || "לא ידוע"}</span></div>
    <div class="row"><span class="label">גיל</span><span class="value">${ageDisplay}</span></div>
    <div class="row"><span class="label">משקל</span><span class="value">${pet?.weight ? `${pet.weight} ${pet.weight_unit || "ק״ג"}` : "לא נמדד"}</span></div>
    <div class="row"><span class="label">מעוקר/ת</span><span class="value">${pet?.is_neutered ? "כן" : "לא"}</span></div>
    <div class="row"><span class="label">שבב</span><span class="value">${pet?.microchip_number || "לא צוין"}</span></div>
  </div>

  ${(pet?.medical_conditions?.length || pet?.health_notes) ? `
  <div class="alert">
    <p>⚠️ מצבים רפואיים: ${(pet?.medical_conditions || []).join(", ") || "ללא"}</p>
    ${pet?.health_notes ? `<p style="margin-top:4px; font-weight:400;">הערות: ${pet.health_notes}</p>` : ""}
  </div>` : ""}

  <div class="section">
    <h3>💉 חיסונים</h3>
    ${allVaccines.length ? `<div class="vaccine-list">${allVaccines.map((v: string) => `<span class="vaccine-tag">${v}</span>`).join("")}</div>` : '<p style="font-size:12px;color:#999;">אין חיסונים רשומים</p>'}
  </div>

  <div class="section">
    <h3>🏥 ביקורים אחרונים</h3>
    ${visits.length ? visits.slice(0, 5).map((v: any) => `
    <div class="visit">
      <strong>${new Date(v.visit_date).toLocaleDateString("he-IL")}</strong> — ${v.diagnosis || v.treatment || v.visit_type || "ביקור"}
      ${v.clinic_name ? ` | ${v.clinic_name}` : ""}
      ${v.medications?.length ? ` | תרופות: ${(v.medications as string[]).join(", ")}` : ""}
    </div>`).join("") : '<p style="font-size:12px;color:#999;">אין ביקורים רשומים</p>'}
  </div>

  <div class="section">
    <h3>🍽️ תזונה</h3>
    <div class="row"><span class="label">מזון נוכחי</span><span class="value">${pet?.current_food || "לא צוין"}</span></div>
  </div>

  ${pet?.vet_name || pet?.vet_clinic ? `
  <div class="section">
    <h3>👨‍⚕️ וטרינר מטפל</h3>
    ${pet?.vet_name ? `<div class="row"><span class="label">שם</span><span class="value">ד"ר ${pet.vet_name}</span></div>` : ""}
    ${pet?.vet_clinic ? `<div class="row"><span class="label">קליניקה</span><span class="value">${pet.vet_clinic}</span></div>` : ""}
  </div>` : ""}

  <div class="footer">
    🐾 PetID Medical ID · מסמך חירום שהופק אוטומטית · ${new Date().toLocaleDateString("he-IL")}
  </div>
</body>
</html>`;

      // Try Web Share API first, fallback to print
      const blob = new Blob([html], { type: "text/html" });

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `medical-id-${petName}.html`, { type: "text/html" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Medical ID — ${petName}`,
            files: [file],
          });
          setShared(true);
          toast({ title: "Medical ID שותף בהצלחה 📋" });
          return;
        }
      }

      // Fallback: open in new window for print
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
      }

      setShared(true);
      toast({ title: "Medical ID מוכן 📋" });
    } catch (err) {
      console.error("Medical ID error:", err);
      toast({ title: "שגיאה ביצירת Medical ID", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={generateMedicalID}
      disabled={loading || shared}
      variant="outline"
      className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : shared ? (
        <Check className="w-4 h-4" />
      ) : (
        <Share2 className="w-4 h-4" strokeWidth={1.5} />
      )}
      {shared ? "Medical ID שותף ✅" : "שתף Medical ID עם הווטרינר"}
    </Button>
  );
};
