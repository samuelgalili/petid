 import { motion, AnimatePresence } from "framer-motion";
 import { FileText, Trash2, Power, RefreshCw, CheckCircle, Clock, AlertCircle } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Switch } from "@/components/ui/switch";
 import { Skeleton } from "@/components/ui/skeleton";
 import { DataSource } from "@/types/admin-data";
 import { format } from "date-fns";
 import { he } from "date-fns/locale";
 
 interface DataSourceListProps {
   sources: DataSource[];
   loading: boolean;
   onDelete: (id: string, fileUrl?: string) => void;
   onToggleActive: (id: string, isActive: boolean) => void;
   onRefresh: () => void;
 }
 
 export const DataSourceList = ({
   sources,
   loading,
   onDelete,
   onToggleActive,
   onRefresh,
 }: DataSourceListProps) => {
   if (loading) {
     return (
       <div className="space-y-3">
         {[1, 2, 3].map((i) => (
           <Skeleton key={i} className="h-24 w-full rounded-xl" />
         ))}
       </div>
     );
   }
 
   if (sources.length === 0) {
     return (
       <Card className="border-dashed">
         <CardContent className="flex flex-col items-center justify-center py-12 text-center">
           <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
             <FileText className="w-8 h-8 text-muted-foreground" />
           </div>
           <h3 className="font-semibold text-foreground mb-1">אין נתונים עדיין</h3>
           <p className="text-sm text-muted-foreground max-w-sm">
             העלה קבצים כדי שהמערכת תלמד מהם ותשתמש בהם להמלצות ולנתונים
           </p>
         </CardContent>
       </Card>
     );
   }
 
   return (
     <div className="space-y-3">
       <div className="flex items-center justify-between">
         <span className="text-sm text-muted-foreground">
           {sources.length} מקורות נתונים
         </span>
         <Button variant="ghost" size="sm" onClick={onRefresh} className="gap-2">
           <RefreshCw className="w-4 h-4" />
           רענון
         </Button>
       </div>
 
       <AnimatePresence mode="popLayout">
         {sources.map((source, index) => (
           <motion.div
             key={source.id}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, x: -100 }}
             transition={{ delay: index * 0.05 }}
           >
             <Card className="overflow-hidden">
               <CardContent className="p-4">
                 <div className="flex items-start gap-4">
                   {/* File Icon */}
                   <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                     <FileText className="w-6 h-6 text-muted-foreground" />
                   </div>
 
                   {/* Content */}
                   <div className="flex-1 min-w-0">
                     <div className="flex items-start justify-between gap-2">
                       <div>
                         <h4 className="font-medium text-foreground truncate">
                           {source.title}
                         </h4>
                         {source.description && (
                           <p className="text-sm text-muted-foreground line-clamp-1">
                             {source.description}
                           </p>
                         )}
                       </div>
                       
                       <div className="flex items-center gap-2">
                         {/* Status Badge */}
                         <Badge
                           variant={source.is_processed ? "default" : "secondary"}
                           className="gap-1"
                         >
                           {source.is_processed ? (
                             <>
                               <CheckCircle className="w-3 h-3" />
                               מעובד
                             </>
                           ) : (
                             <>
                               <Clock className="w-3 h-3" />
                               ממתין
                             </>
                           )}
                         </Badge>
                       </div>
                     </div>
 
                     {/* Meta info */}
                     <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                       {source.file_name && (
                         <span className="truncate max-w-[150px]">
                           📎 {source.file_name}
                         </span>
                       )}
                       {source.file_size && (
                         <span>
                           {(source.file_size / 1024).toFixed(1)} KB
                         </span>
                       )}
                       <span>
                         {format(new Date(source.created_at), "dd/MM/yyyy", { locale: he })}
                       </span>
                     </div>
                   </div>
 
                   {/* Actions */}
                   <div className="flex items-center gap-2 shrink-0">
                     <div className="flex items-center gap-2">
                       <Switch
                         checked={source.is_active}
                         onCheckedChange={() => onToggleActive(source.id, source.is_active)}
                       />
                       <span className="text-xs text-muted-foreground">
                         {source.is_active ? "פעיל" : "מושבת"}
                       </span>
                     </div>
                     
                     <Button
                       variant="ghost"
                       size="icon"
                       className="text-destructive hover:bg-destructive/10"
                       onClick={() => onDelete(source.id, source.file_url || undefined)}
                     >
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   </div>
                 </div>
               </CardContent>
             </Card>
           </motion.div>
         ))}
       </AnimatePresence>
     </div>
   );
 };