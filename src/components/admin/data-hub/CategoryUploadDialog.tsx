import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  FileText,
  Loader2,
  Sparkles,
  Link2,
  Globe,
  Eye,
  CheckCircle2,
  X,
  Edit3,
} from "lucide-react";
import { DataSourceType } from "@/types/admin-data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CategoryUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: DataSourceType;
  categoryLabel: string;
  categoryIcon: string;
  onSuccess: () => void;
}

type Step = "input" | "preview" | "saving";

export const CategoryUploadDialog = ({
  open,
  onOpenChange,
  category,
  categoryLabel,
  categoryIcon,
  onSuccess,
}: CategoryUploadDialogProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("input");
  const [uploadMode, setUploadMode] = useState<"url" | "file" | "manual">("url");
  const [urlInput, setUrlInput] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, any> | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);

  const resetForm = () => {
    setStep("input");
    setUrlInput("");
    setTitle("");
    setDescription("");
    setManualContent("");
    setFile(null);
    setPreviewData(null);
    setSourceId(null);
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const allowed = [
      "application/pdf", "text/csv", "application/json",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel", "text/plain",
    ];
    if (!allowed.includes(f.type)) {
      toast({ title: "סוג קובץ לא נתמך", description: "PDF, CSV, JSON, Excel, TXT", variant: "destructive" });
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      toast({ title: "קובץ גדול מדי", description: "עד 50MB", variant: "destructive" });
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ""));
  };

  const handleProcess = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      if (uploadMode === "url") {
        if (!urlInput.trim()) {
          toast({ title: "יש להזין קישור", variant: "destructive" });
          return;
        }
        // Create source record
        const { data: src, error: srcErr } = await supabase
          .from("admin_data_sources" as any)
          .insert({
            data_type: category,
            title: title.trim() || urlInput.trim(),
            description: description.trim() || `נמשך מ: ${urlInput.trim()}`,
            file_url: urlInput.trim(),
            file_type: "url",
            created_by: userData.user?.id,
            is_processed: false,
            is_active: false, // Not active until approved
          })
          .select()
          .single();
        if (srcErr) throw srcErr;
        const sid = (src as any).id;
        setSourceId(sid);

        // Scrape
        const { data: scrapeData, error: scrapeErr } = await supabase.functions.invoke("scrape-research-url", {
          body: { url: urlInput.trim(), dataType: category, sourceId: sid },
        });
        if (scrapeErr) throw scrapeErr;

        // Fetch the processed data for preview
        const { data: updated } = await supabase
          .from("admin_data_sources" as any)
          .select("*")
          .eq("id", sid)
          .single();

        setPreviewData((updated as any)?.extracted_data || { raw: "לא נמצאו נתונים מובנים" });
        setTitle((updated as any)?.title || title || urlInput);
        setStep("preview");
      } else if (uploadMode === "file") {
        if (!file) {
          toast({ title: "יש לבחור קובץ", variant: "destructive" });
          return;
        }
        // Upload file
        const ext = file.name.split(".").pop();
        const path = `${category}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("admin-data").upload(path, file);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("admin-data").getPublicUrl(path);

        const { data: src, error: srcErr } = await supabase
          .from("admin_data_sources" as any)
          .insert({
            data_type: category,
            title: title.trim() || file.name,
            description: description.trim() || null,
            file_url: urlData.publicUrl,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            created_by: userData.user?.id,
            is_processed: false,
            is_active: false,
          })
          .select()
          .single();
        if (srcErr) throw srcErr;
        const sid = (src as any).id;
        setSourceId(sid);

        // Process
        await supabase.functions.invoke("process-admin-data", {
          body: { sourceId: sid, dataType: category, fileName: file.name, fileUrl: urlData.publicUrl },
        });

        const { data: updated } = await supabase
          .from("admin_data_sources" as any)
          .select("*")
          .eq("id", sid)
          .single();

        setPreviewData((updated as any)?.extracted_data || { raw: "לא נמצאו נתונים מובנים" });
        setTitle((updated as any)?.title || title);
        setStep("preview");
      } else {
        // Manual content
        if (!manualContent.trim()) {
          toast({ title: "יש להזין תוכן", variant: "destructive" });
          return;
        }
        const { data: src, error: srcErr } = await supabase
          .from("admin_data_sources" as any)
          .insert({
            data_type: category,
            title: title.trim() || "תוכן ידני",
            description: description.trim() || null,
            file_type: "manual",
            extracted_data: { full_content: manualContent.trim(), category, source_type: "manual" },
            created_by: userData.user?.id,
            is_processed: true,
            is_active: false,
          })
          .select()
          .single();
        if (srcErr) throw srcErr;
        setSourceId((src as any).id);
        setPreviewData({ full_content: manualContent.trim(), category });
        setStep("preview");
      }
    } catch (err: any) {
      console.error("Process error:", err);
      toast({ title: "שגיאה בעיבוד", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!sourceId) return;
    setLoading(true);
    try {
      // Activate the source
      await supabase
        .from("admin_data_sources" as any)
        .update({ is_active: true })
        .eq("id", sourceId);

      // Trigger sync
      await supabase.functions.invoke("sync-data-sources", {
        body: { sourceId },
      });

      toast({ title: "אושר ונשמר! ✅", description: "הנתונים נוספו למערכת בהצלחה" });
      resetForm();
      onSuccess();
    } catch (err: any) {
      toast({ title: "שגיאה באישור", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (sourceId) {
      await supabase.from("admin_data_sources" as any).delete().eq("id", sourceId);
    }
    toast({ title: "נדחה", description: "הנתונים לא נשמרו" });
    resetForm();
  };

  const renderPreviewValue = (key: string, value: any): React.ReactNode => {
    if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.slice(0, 10).map((item, i) => (
            <Badge key={i} variant="secondary" className="text-[10px]">
              {typeof item === "object" ? JSON.stringify(item).substring(0, 40) : String(item)}
            </Badge>
          ))}
          {value.length > 10 && <Badge variant="outline" className="text-[10px]">+{value.length - 10}</Badge>}
        </div>
      );
    }
    if (typeof value === "object") {
      return (
        <pre className="text-[10px] bg-muted p-2 rounded max-h-20 overflow-auto whitespace-pre-wrap" dir="ltr">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    const str = String(value);
    if (str.length > 200) {
      return <p className="text-xs text-muted-foreground line-clamp-3">{str}</p>;
    }
    return <span className="text-xs">{str}</span>;
  };

  const keyLabels: Record<string, string> = {
    title: "כותרת",
    title_he: "כותרת בעברית",
    summary: "סיכום",
    summary_he: "סיכום בעברית",
    authors: "מחברים",
    key_findings: "ממצאים",
    key_findings_he: "ממצאים בעברית",
    full_content: "תוכן מלא",
    source_url: "קישור מקור",
    breeds: "גזעים",
    parks: "גינות",
    providers: "ספקים",
    category: "קטגוריה",
    relevance_to_pets: "רלוונטיות",
    source_name: "שם המקור",
    publication_date: "תאריך פרסום",
    topics: "נושאים",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{categoryIcon}</span>
            {step === "preview" ? "תצוגה מקדימה" : `הוסף ל${categoryLabel}`}
          </DialogTitle>
          <DialogDescription>
            {step === "preview"
              ? "בדוק את הנתונים שנמשכו ואשר להוספה למערכת"
              : "הזן קישור, העלה קובץ או הקלד תוכן"}
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-3">
              <TabsTrigger value="url" className="gap-1.5 text-xs">
                <Globe className="w-3.5 h-3.5" />
                קישור
              </TabsTrigger>
              <TabsTrigger value="file" className="gap-1.5 text-xs">
                <Upload className="w-3.5 h-3.5" />
                קובץ
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-1.5 text-xs">
                <Edit3 className="w-3.5 h-3.5" />
                תוכן
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">קישור</Label>
                <div className="relative">
                  <Link2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://..." className="pr-10" dir="ltr" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">כותרת (אופציונלי)</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="זיהוי אוטומטי" />
              </div>
            </TabsContent>

            <TabsContent value="file" className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">כותרת</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="שם המקור" />
              </div>
              <div className="border-2 border-dashed rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
                <input type="file" id={`file-cat-${category}`} className="hidden" accept=".pdf,.csv,.json,.xlsx,.xls,.txt" onChange={handleFileChange} />
                <label htmlFor={`file-cat-${category}`} className="cursor-pointer flex flex-col items-center gap-1.5">
                  {file ? (
                    <>
                      <FileText className="w-8 h-8 text-primary" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">PDF, CSV, JSON, Excel, TXT (עד 50MB)</span>
                    </>
                  )}
                </label>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">כותרת</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="שם התוכן" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">תוכן</Label>
                <Textarea value={manualContent} onChange={(e) => setManualContent(e.target.value)} placeholder="הקלד או הדבק תוכן כאן..." rows={6} />
              </div>
            </TabsContent>

            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 mt-3">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground">המערכת תעבד את התוכן, תציג תצוגה מקדימה ותבקש אישור לפני שמירה</p>
            </div>

            <div className="flex gap-2 mt-3">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">ביטול</Button>
              <Button
                onClick={handleProcess}
                disabled={loading || (uploadMode === "url" && !urlInput.trim()) || (uploadMode === "file" && !file) || (uploadMode === "manual" && !manualContent.trim())}
                className="flex-1 gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />מעבד...</>
                ) : (
                  <><Eye className="w-4 h-4" />עבד והצג תצוגה מקדימה</>
                )}
              </Button>
            </div>
          </Tabs>
        )}

        {step === "preview" && previewData && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <Badge variant="outline" className="gap-1">
                <Eye className="w-3 h-3" />
                תצוגה מקדימה
              </Badge>
              {title && <span className="text-sm font-medium truncate">{title}</span>}
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2 pe-3">
                {Object.entries(previewData)
                  .filter(([key]) => !["scraped_at", "page_metadata", "raw_content_length", "raw_content", "ai_error"].includes(key))
                  .map(([key, value]) => (
                    <Card key={key} className="overflow-hidden">
                      <CardContent className="p-2.5">
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1">
                          {keyLabels[key] || key}
                        </p>
                        {renderPreviewValue(key, value)}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2 mt-4 pt-3 border-t">
              <Button variant="outline" onClick={handleReject} disabled={loading} className="flex-1 gap-2 text-destructive hover:text-destructive">
                <X className="w-4 h-4" />
                דחה ומחק
              </Button>
              <Button onClick={handleApprove} disabled={loading} className="flex-1 gap-2">
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />שומר...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" />אשר ושמור</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
