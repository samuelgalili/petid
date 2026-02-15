/**
 * AdminOCRVerification — Split-screen view for verifying OCR-extracted medical document data.
 * Left: uploaded medical image. Right: editable form with extracted fields.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  FileSearch, Check, ChevronLeft, ChevronRight, Save,
  Syringe, Stethoscope, Calendar, User, FileText, DollarSign,
  AlertTriangle, CheckCircle2, Eye,
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface ExtractedRecord {
  id: string;
  pet_id: string;
  document_id: string;
  vaccination_type: string | null;
  vaccination_date: string | null;
  vaccination_expiry: string | null;
  vet_name: string | null;
  vet_clinic: string | null;
  diagnosis: string | null;
  treatment_type: string | null;
  treatment_date: string | null;
  chip_number: string | null;
  medications: string[] | null;
  provider_name: string | null;
  provider_phone: string | null;
  total_cost: number | null;
  currency: string | null;
  invoice_number: string | null;
  extraction_confidence: number | null;
  created_at: string;
}

const AdminOCRVerification = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editedFields, setEditedFields] = useState<Partial<ExtractedRecord>>({});
  const [filter, setFilter] = useState<"all" | "low_confidence" | "unverified">("all");

  // Fetch extracted documents with their source document info
  const { data: records, isLoading } = useQuery({
    queryKey: ["ocr-verification", filter],
    queryFn: async () => {
      let query = supabase
        .from("pet_document_extracted_data")
        .select(`
          *,
          pet_service_documents!pet_document_extracted_data_document_id_fkey (
            file_url,
            file_name,
            file_type
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (filter === "low_confidence") {
        query = query.lt("extraction_confidence", 0.7);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<ExtractedRecord> & { id: string }) => {
      const { id, ...fields } = updates;
      const { error } = await supabase
        .from("pet_document_extracted_data")
        .update(fields as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "נשמר בהצלחה", description: "הנתונים עודכנו" });
      queryClient.invalidateQueries({ queryKey: ["ocr-verification"] });
      setEditedFields({});
    },
    onError: () => {
      toast({ title: "שגיאה", description: "לא ניתן לשמור", variant: "destructive" });
    },
  });

  const current = records?.[selectedIndex];
  const docInfo = current?.pet_service_documents;
  const confidence = current?.extraction_confidence || 0;

  const handleFieldChange = (field: string, value: string | number | null) => {
    setEditedFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!current) return;
    updateMutation.mutate({ id: current.id, ...editedFields });
  };

  const getFieldValue = (field: keyof ExtractedRecord) => {
    if (field in editedFields) return editedFields[field as keyof typeof editedFields];
    return current?.[field] ?? "";
  };

  const confidenceColor = confidence >= 0.8 ? "text-green-600" : confidence >= 0.5 ? "text-amber-600" : "text-destructive";

  if (isLoading) {
    return (
      <AdminLayout title="אימות OCR" icon={FileSearch}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-140px)]">
          <Skeleton className="w-full h-full rounded-xl" />
          <Skeleton className="w-full h-full rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="אימות OCR" icon={FileSearch}>
      <div className="space-y-4">
        {/* Header toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Select value={filter} onValueChange={(v) => { setFilter(v as any); setSelectedIndex(0); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="סינון" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל המסמכים</SelectItem>
                <SelectItem value="low_confidence">ביטחון נמוך</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-xs">
              {records?.length || 0} מסמכים
            </Badge>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={selectedIndex === 0}
              onClick={() => { setSelectedIndex(i => i - 1); setEditedFields({}); }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[60px] text-center">
              {selectedIndex + 1} / {records?.length || 0}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={!records || selectedIndex >= records.length - 1}
              onClick={() => { setSelectedIndex(i => i + 1); setEditedFields({}); }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Split screen */}
        {current ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-220px)]">
            {/* LEFT — Document Image */}
            <Card className="border-none bg-card overflow-hidden flex flex-col">
              <CardHeader className="pb-2 shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    תמונת מסמך
                  </CardTitle>
                  <Badge variant="secondary" className="text-[10px]">
                    {docInfo?.file_name || "מסמך"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-4 pt-0">
                <div className="w-full h-full rounded-xl bg-muted/30 border border-border/30 overflow-hidden flex items-center justify-center">
                  {docInfo?.file_url ? (
                    <img
                      src={docInfo.file_url}
                      alt="Medical document"
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground p-8">
                      <FileText className="w-16 h-16 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">אין תצוגה מקדימה זמינה</p>
                      <p className="text-xs mt-1">ייתכן שהמסמך בפורמט PDF</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* RIGHT — Editable Form */}
            <Card className="border-none bg-card overflow-hidden flex flex-col">
              <CardHeader className="pb-2 shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    נתונים שחולצו
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${confidenceColor} bg-transparent border`}>
                      {confidence >= 0.8 ? (
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 mr-1" />
                      )}
                      ביטחון: {Math.round(confidence * 100)}%
                    </Badge>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={Object.keys(editedFields).length === 0 || updateMutation.isPending}
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      שמור
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-4 pt-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-5 pr-2"
                  >
                    {/* Vaccination Section */}
                    <FieldSection title="חיסונים" icon={Syringe}>
                      <FieldRow label="סוג חיסון" field="vaccination_type" value={getFieldValue("vaccination_type")} onChange={handleFieldChange} />
                      <FieldRow label="תאריך חיסון" field="vaccination_date" value={getFieldValue("vaccination_date")} onChange={handleFieldChange} type="date" />
                      <FieldRow label="תוקף חיסון" field="vaccination_expiry" value={getFieldValue("vaccination_expiry")} onChange={handleFieldChange} type="date" />
                    </FieldSection>

                    {/* Medical Section */}
                    <FieldSection title="טיפול רפואי" icon={Stethoscope}>
                      <FieldRow label="סוג טיפול" field="treatment_type" value={getFieldValue("treatment_type")} onChange={handleFieldChange} />
                      <FieldRow label="תאריך טיפול" field="treatment_date" value={getFieldValue("treatment_date")} onChange={handleFieldChange} type="date" />
                      <FieldRow label="אבחנה" field="diagnosis" value={getFieldValue("diagnosis")} onChange={handleFieldChange} />
                      <FieldRow label="מספר שבב" field="chip_number" value={getFieldValue("chip_number")} onChange={handleFieldChange} />
                    </FieldSection>

                    {/* Vet Section */}
                    <FieldSection title="וטרינר" icon={User}>
                      <FieldRow label="שם הווטרינר" field="vet_name" value={getFieldValue("vet_name")} onChange={handleFieldChange} />
                      <FieldRow label="מרפאה" field="vet_clinic" value={getFieldValue("vet_clinic")} onChange={handleFieldChange} />
                      <FieldRow label="שם ספק" field="provider_name" value={getFieldValue("provider_name")} onChange={handleFieldChange} />
                      <FieldRow label="טלפון ספק" field="provider_phone" value={getFieldValue("provider_phone")} onChange={handleFieldChange} />
                    </FieldSection>

                    {/* Financial Section */}
                    <FieldSection title="כספי" icon={DollarSign}>
                      <FieldRow label="עלות כוללת" field="total_cost" value={getFieldValue("total_cost")} onChange={handleFieldChange} type="number" />
                      <FieldRow label="מטבע" field="currency" value={getFieldValue("currency")} onChange={handleFieldChange} />
                      <FieldRow label="מספר חשבונית" field="invoice_number" value={getFieldValue("invoice_number")} onChange={handleFieldChange} />
                    </FieldSection>

                    {/* Metadata */}
                    <div className="pt-2 border-t border-border/20">
                      <p className="text-[10px] text-muted-foreground">
                        נוצר: {current.created_at ? format(new Date(current.created_at), "dd/MM/yyyy HH:mm", { locale: he }) : "—"}
                      </p>
                    </div>
                  </motion.div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <FileSearch className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">אין מסמכים לאימות</h3>
            <p className="text-sm text-muted-foreground mt-1">כל המסמכים עברו עיבוד מוצלח</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

// --- Sub-components ---

const FieldSection = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
  <div className="space-y-2.5">
    <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 pb-1 border-b border-border/20">
      <Icon className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
      {title}
    </h3>
    <div className="space-y-2">{children}</div>
  </div>
);

const FieldRow = ({
  label,
  field,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  field: string;
  value: any;
  onChange: (field: string, value: string | number | null) => void;
  type?: "text" | "date" | "number";
}) => (
  <div className="grid grid-cols-[110px_1fr] items-center gap-2">
    <Label className="text-[11px] text-muted-foreground truncate">{label}</Label>
    <Input
      value={value ?? ""}
      onChange={(e) => {
        const v = type === "number" ? (e.target.value ? parseFloat(e.target.value) : null) : e.target.value || null;
        onChange(field, v);
      }}
      type={type}
      className="h-8 text-xs bg-muted/20 border-border/30"
      placeholder="—"
    />
  </div>
);

export default AdminOCRVerification;
