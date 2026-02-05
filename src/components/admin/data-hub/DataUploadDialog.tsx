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
 import { Upload, FileText, Loader2, Sparkles } from "lucide-react";
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
 
   const category = DATA_CATEGORIES.find((c) => c.id === dataType);
 
   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const selectedFile = e.target.files?.[0];
     if (selectedFile) {
       // Validate file type
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
 
       // Validate file size (max 10MB)
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
 
   const handleSubmit = async () => {
     if (!title.trim()) {
       toast({
         title: "שגיאה",
         description: "יש להזין כותרת",
         variant: "destructive",
       });
       return;
     }
 
     try {
       setUploading(true);
 
       const { data: userData } = await supabase.auth.getUser();
       let fileUrl = null;
       let fileName = null;
       let fileType = null;
       let fileSize = null;
 
       // Upload file if exists
       if (file) {
         const fileExt = file.name.split(".").pop();
         const filePath = `${dataType}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
 
         const { data: uploadData, error: uploadError } = await supabase.storage
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
 
       // Create data source record
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
 
       // Process with AI if file exists
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
           // Don't fail the upload if processing fails
         }
       }
 
       toast({
         title: "הועלה בהצלחה! 🎉",
         description: file
           ? "הקובץ נשמר ומעובד על ידי המערכת"
           : "הנתונים נשמרו במערכת",
       });
 
       // Reset form
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
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="sm:max-w-md">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <span className="text-2xl">{category?.icon}</span>
             העלאת נתונים - {category?.labelHe}
           </DialogTitle>
           <DialogDescription>
             העלה קבצים והמערכת תלמד מהם לשיפור ההמלצות
           </DialogDescription>
         </DialogHeader>
 
         <div className="space-y-4 py-4">
           {/* Title */}
           <div className="space-y-2">
             <Label htmlFor="title">כותרת *</Label>
             <Input
               id="title"
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               placeholder="שם מקור הנתונים"
             />
           </div>
 
           {/* Description */}
           <div className="space-y-2">
             <Label htmlFor="description">תיאור</Label>
             <Textarea
               id="description"
               value={description}
               onChange={(e) => setDescription(e.target.value)}
               placeholder="תיאור קצר של הנתונים..."
               rows={3}
             />
           </div>
 
           {/* File Upload */}
           <div className="space-y-2">
             <Label>קובץ (אופציונלי)</Label>
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
 
           {/* AI Processing Note */}
           <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
             <Sparkles className="w-5 h-5 text-accent shrink-0 mt-0.5" />
             <p className="text-sm text-muted-foreground">
               המערכת תעבד את הקובץ ותחלץ נתונים רלוונטיים באופן אוטומטי לשימוש בהמלצות ובתצוגות
             </p>
           </div>
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
             onClick={handleSubmit}
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
       </DialogContent>
     </Dialog>
   );
 };