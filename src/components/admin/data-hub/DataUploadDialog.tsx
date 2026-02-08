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
 import { Upload, FileText, Loader2, Sparkles, Link2, Globe, CheckCircle2 } from "lucide-react";
 import { DATA_CATEGORIES, DataSourceType } from "@/types/admin-data";
 
 interface DataUploadDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   dataType: DataSourceType;
   onSuccess: () => void;
 }
 
 export const DataUploadDialog = ({
   open,
   onOpenChange,
   dataType,
   onSuccess,
 }: DataUploadDialogProps) => {
   const { toast } = useToast();
   const [title, setTitle] = useState("");
   const [description, setDescription] = useState("");
   const [file, setFile] = useState<File | null>(null);
   const [uploading, setUploading] = useState(false);
   const [processing, setProcessing] = useState(false);
   const [uploadMode, setUploadMode] = useState<"file" | "url">("url");
   const [urlInput, setUrlInput] = useState("");
   const [scrapeResult, setScrapeResult] = useState<{ success: boolean; pageTitle?: string } | null>(null);
 
   const category = DATA_CATEGORIES.find((c) => c.id === dataType);
 
   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const selectedFile = e.target.files?.[0];
     if (selectedFile) {
       const allowedTypes = [
         "application/pdf",
         "text/csv",
         "application/json",
         "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
         "application/vnd.ms-excel",
         "text/plain",
       ];
       
       if (!allowedTypes.includes(selectedFile.type)) {
         toast({
           title: "סוג קובץ לא נתמך",
           description: "אנא העלה קובץ PDF, CSV, JSON, Excel או TXT",
           variant: "destructive",
         });
         return;
       }

       if (selectedFile.size > 10 * 1024 * 1024) {
         toast({
           title: "קובץ גדול מדי",
           description: "גודל הקובץ המקסימלי הוא 10MB",
           variant: "destructive",
         });
         return;
       }

       setFile(selectedFile);
       if (!title) {
         setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
       }
     }
   };

   const handleUrlSubmit = async () => {
     if (!urlInput.trim()) {
       toast({ title: "שגיאה", description: "יש להזין קישור", variant: "destructive" });
       return;
     }

     try {
       setUploading(true);
       setScrapeResult(null);

       const { data: userData } = await supabase.auth.getUser();

       // Create data source record first
        const { data: sourceData, error: sourceError } = await supabase
          .from("admin_data_sources" as any)
          .insert({
            data_type: dataType,
           title: title.trim() || urlInput.trim(),
           description: description.trim() || `נמשך מ: ${urlInput.trim()}`,
           file_url: urlInput.trim(),
           file_name: null,
           file_type: "url",
           file_size: null,
           created_by: userData.user?.id,
           is_processed: false,
           is_active: true,
         })
         .select()
         .single();

       if (sourceError) throw sourceError;

       // Scrape and process URL
       setProcessing(true);
       const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke(
         "scrape-research-url",
         {
            body: {
              url: urlInput.trim(),
              dataType,
              sourceId: (sourceData as any).id,
           },
         }
       );

       if (scrapeError) {
         console.error("Scrape error:", scrapeError);
         toast({
           title: "שגיאה בעיבוד",
           description: "הקישור נשמר אך העיבוד נכשל. ניתן לנסות שוב.",
           variant: "destructive",
         });
       } else {
         setScrapeResult({
           success: scrapeData?.success || false,
           pageTitle: scrapeData?.pageTitle,
         });
         toast({
           title: "נמשך בהצלחה! 🎉",
           description: scrapeData?.pageTitle
             ? `"${scrapeData.pageTitle}" עובד ונשמר במערכת`
             : "התוכן נמשך ועובד בהצלחה",
         });
       }

       // Reset form
       setTitle("");
       setDescription("");
       setUrlInput("");
       setScrapeResult(null);
       onOpenChange(false);
       onSuccess();
     } catch (error: any) {
       console.error("URL scrape error:", error);
       toast({
         title: "שגיאה",
         description: error.message || "אירעה שגיאה בעיבוד הקישור",
         variant: "destructive",
       });
     } finally {
       setUploading(false);
       setProcessing(false);
     }
   };

   const handleFileSubmit = async () => {
     if (!title.trim()) {
       toast({ title: "שגיאה", description: "יש להזין כותרת", variant: "destructive" });
       return;
     }

     try {
       setUploading(true);

       const { data: userData } = await supabase.auth.getUser();
       let fileUrl = null;
       let fileName = null;
       let fileType = null;
       let fileSize = null;

       if (file) {
         const fileExt = file.name.split(".").pop();
         const filePath = `${dataType}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

         const { error: uploadError } = await supabase.storage
           .from("admin-data")
           .upload(filePath, file);

         if (uploadError) throw uploadError;

         const { data: urlData } = supabase.storage
           .from("admin-data")
           .getPublicUrl(filePath);

         fileUrl = urlData.publicUrl;
         fileName = file.name;
         fileType = file.type;
         fileSize = file.size;
       }

       const { data: sourceData, error: sourceError } = await supabase
         .from("admin_data_sources" as any)
         .insert({
           data_type: dataType,
           title: title.trim(),
           description: description.trim() || null,
           file_url: fileUrl,
           file_name: fileName,
           file_type: fileType,
           file_size: fileSize,
           created_by: userData.user?.id,
           is_processed: false,
           is_active: true,
         })
         .select()
         .single();

       if (sourceError) throw sourceError;

       if (file && sourceData) {
         setProcessing(true);
         try {
           await supabase.functions.invoke("process-admin-data", {
             body: {
               sourceId: (sourceData as any).id,
               dataType,
               fileName,
               fileUrl,
             },
           });
         } catch (processError) {
           console.error("Processing error:", processError);
         }
       }

       toast({
         title: "הועלה בהצלחה! 🎉",
         description: file
           ? "הקובץ נשמר ומעובד על ידי המערכת"
           : "הנתונים נשמרו במערכת",
       });

       setTitle("");
       setDescription("");
       setFile(null);
       onOpenChange(false);
       onSuccess();
     } catch (error: any) {
       console.error("Upload error:", error);
       toast({
         title: "שגיאה בהעלאה",
         description: error.message || "אירעה שגיאה בהעלאת הנתונים",
         variant: "destructive",
       });
     } finally {
       setUploading(false);
       setProcessing(false);
     }
   };

   const resetForm = () => {
     setTitle("");
     setDescription("");
     setFile(null);
     setUrlInput("");
     setScrapeResult(null);
   };

   return (
     <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
       <DialogContent className="sm:max-w-md" dir="rtl">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <span className="text-2xl">{category?.icon}</span>
             העלאת נתונים - {category?.labelHe}
           </DialogTitle>
           <DialogDescription>
             העלה קבצים או הדבק קישור והמערכת תמשוך ותעבד אוטומטית
           </DialogDescription>
         </DialogHeader>

         <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as "file" | "url")} className="w-full">
           <TabsList className="grid w-full grid-cols-2 mb-4">
             <TabsTrigger value="url" className="gap-2">
               <Globe className="w-4 h-4" />
               קישור
             </TabsTrigger>
             <TabsTrigger value="file" className="gap-2">
               <Upload className="w-4 h-4" />
               קובץ
             </TabsTrigger>
           </TabsList>

           {/* URL Tab */}
           <TabsContent value="url" className="space-y-4">
             <div className="space-y-2">
               <Label htmlFor="url-input">קישור למחקר / מאמר</Label>
               <div className="relative">
                 <Link2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                 <Input
                   id="url-input"
                   value={urlInput}
                   onChange={(e) => setUrlInput(e.target.value)}
                   placeholder="https://example.com/research-article"
                   className="pr-10"
                   dir="ltr"
                 />
               </div>
             </div>

             <div className="space-y-2">
               <Label htmlFor="url-title">כותרת (אופציונלי)</Label>
               <Input
                 id="url-title"
                 value={title}
                 onChange={(e) => setTitle(e.target.value)}
                 placeholder="המערכת תזהה אוטומטית"
               />
             </div>

             <div className="space-y-2">
               <Label htmlFor="url-desc">תיאור (אופציונלי)</Label>
               <Textarea
                 id="url-desc"
                 value={description}
                 onChange={(e) => setDescription(e.target.value)}
                 placeholder="תיאור קצר..."
                 rows={2}
               />
             </div>

             {/* AI note */}
             <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
               <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
               <p className="text-sm text-muted-foreground">
                 המערכת תמשוך את תוכן העמוד, תחלץ מחקרים ונתונים רלוונטיים ותשמור אותם באופן מובנה
               </p>
             </div>

             {scrapeResult?.success && (
               <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                 <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                 <p className="text-sm text-green-700">
                   {scrapeResult.pageTitle ? `"${scrapeResult.pageTitle}" עובד בהצלחה` : "העיבוד הושלם"}
                 </p>
               </div>
             )}

             <Button
               onClick={handleUrlSubmit}
               disabled={uploading || processing || !urlInput.trim()}
               className="w-full gap-2"
             >
               {uploading || processing ? (
                 <>
                   <Loader2 className="w-4 h-4 animate-spin" />
                   {processing ? "מעבד תוכן..." : "מושך נתונים..."}
                 </>
               ) : (
                 <>
                   <Globe className="w-4 h-4" />
                   משוך ועבד
                 </>
               )}
             </Button>
           </TabsContent>

           {/* File Tab */}
           <TabsContent value="file" className="space-y-4">
             <div className="space-y-2">
               <Label htmlFor="file-title">כותרת *</Label>
               <Input
                 id="file-title"
                 value={title}
                 onChange={(e) => setTitle(e.target.value)}
                 placeholder="שם מקור הנתונים"
               />
             </div>

             <div className="space-y-2">
               <Label htmlFor="file-description">תיאור</Label>
               <Textarea
                 id="file-description"
                 value={description}
                 onChange={(e) => setDescription(e.target.value)}
                 placeholder="תיאור קצר של הנתונים..."
                 rows={2}
               />
             </div>

             <div className="space-y-2">
               <Label>קובץ</Label>
               <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                 <input
                   type="file"
                   id="file-upload"
                   className="hidden"
                   accept=".pdf,.csv,.json,.xlsx,.xls,.txt"
                   onChange={handleFileChange}
                 />
                 <label
                   htmlFor="file-upload"
                   className="cursor-pointer flex flex-col items-center gap-2"
                 >
                   {file ? (
                     <>
                       <FileText className="w-10 h-10 text-primary" />
                       <span className="font-medium text-foreground">{file.name}</span>
                       <span className="text-xs text-muted-foreground">
                         {(file.size / 1024).toFixed(1)} KB
                       </span>
                     </>
                   ) : (
                     <>
                       <Upload className="w-10 h-10 text-muted-foreground" />
                       <span className="text-sm text-muted-foreground">
                         גרור קובץ או לחץ לבחירה
                       </span>
                       <span className="text-xs text-muted-foreground">
                         PDF, CSV, JSON, Excel, TXT (עד 10MB)
                       </span>
                     </>
                   )}
                 </label>
               </div>
             </div>

             <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
               <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
               <p className="text-sm text-muted-foreground">
                 המערכת תעבד את הקובץ ותחלץ נתונים רלוונטיים באופן אוטומטי
               </p>
             </div>

             <div className="flex gap-2">
               <Button
                 variant="outline"
                 onClick={() => onOpenChange(false)}
                 className="flex-1"
               >
                 ביטול
               </Button>
               <Button
                 onClick={handleFileSubmit}
                 disabled={uploading || processing || !title.trim()}
                 className="flex-1 gap-2"
               >
                 {uploading || processing ? (
                   <>
                     <Loader2 className="w-4 h-4 animate-spin" />
                     {processing ? "מעבד..." : "מעלה..."}
                   </>
                 ) : (
                   <>
                     <Upload className="w-4 h-4" />
                     העלאה
                   </>
                 )}
               </Button>
             </div>
           </TabsContent>
         </Tabs>
       </DialogContent>
     </Dialog>
   );
 };
