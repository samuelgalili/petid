 import { Button } from "@/components/ui/button";
 import { Upload, Database, Sparkles } from "lucide-react";
 
 interface DataHubHeaderProps {
   onUpload: () => void;
 }
 
 export const DataHubHeader = ({ onUpload }: DataHubHeaderProps) => {
   return (
     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
       <div className="flex items-center gap-3">
         <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
           <Database className="w-6 h-6 text-white" />
         </div>
         <div>
           <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
             מאגר נתונים מרכזי
             <Sparkles className="w-4 h-4 text-amber-500" />
           </h2>
           <p className="text-sm text-muted-foreground">
             העלה קבצים והמערכת תלמד מהם לשיפור ההמלצות
           </p>
         </div>
       </div>
       
       <Button onClick={onUpload} className="gap-2">
         <Upload className="w-4 h-4" />
         העלאת נתונים
       </Button>
     </div>
   );
 };