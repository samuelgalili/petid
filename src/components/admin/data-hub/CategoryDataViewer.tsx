import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Eye,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Globe,
  Edit3,
} from "lucide-react";
import { DataSourceType } from "@/types/admin-data";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface CategoryDataViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: DataSourceType;
  categoryLabel: string;
  categoryIcon: string;
  onDataChanged: () => void;
}

export const CategoryDataViewer = ({
  open,
  onOpenChange,
  category,
  categoryLabel,
  categoryIcon,
  onDataChanged,
}: CategoryDataViewerProps) => {
  const { toast } = useToast();
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSources = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("admin_data_sources" as any)
      .select("*")
      .eq("data_type", category)
      .order("created_at", { ascending: false });
    setSources((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchSources();
  }, [open, category]);

  const handleDelete = async (id: string, fileUrl?: string) => {
    if (fileUrl && !fileUrl.startsWith("http")) {
      const path = fileUrl.split("/").pop();
      if (path) await supabase.storage.from("admin-data").remove([path]);
    }
    await supabase.from("admin_data_sources" as any).delete().eq("id", id);
    toast({ title: "נמחק בהצלחה" });
    fetchSources();
    onDataChanged();
  };

  const getSourceIcon = (source: any) => {
    if (source.file_type === "url") return <Globe className="w-4 h-4 text-blue-500" />;
    if (source.file_type === "manual") return <Edit3 className="w-4 h-4 text-green-500" />;
    return <FileText className="w-4 h-4 text-amber-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{categoryIcon}</span>
            צפייה - {categoryLabel}
            <Badge variant="secondary" className="mr-auto">{sources.length}</Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[65vh]">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : sources.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">אין נתונים בקטגוריה זו</p>
            </div>
          ) : (
            <div className="space-y-2 pe-3">
              {sources.map((source) => (
                <Card key={source.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      {getSourceIcon(source)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium truncate flex-1">{source.title}</h4>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant={source.is_processed ? "default" : "secondary"} className="text-[9px] h-5">
                              {source.is_processed ? "מעובד" : "ממתין"}
                            </Badge>
                            {!source.is_active && (
                              <Badge variant="outline" className="text-[9px] h-5">לא פעיל</Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {format(new Date(source.created_at), "dd/MM/yyyy HH:mm", { locale: he })}
                          {source.file_url && source.file_type === "url" && (
                            <a href={source.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 mr-2 text-primary hover:underline">
                              <ExternalLink className="w-3 h-3" />
                              מקור
                            </a>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setExpandedId(expandedId === source.id ? null : source.id)}
                        >
                          {expandedId === source.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(source.id, source.file_url)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {expandedId === source.id && source.extracted_data && (
                      <div className="mt-3 pt-3 border-t">
                        <pre className="text-[10px] bg-muted p-2.5 rounded-lg max-h-48 overflow-auto whitespace-pre-wrap" dir="ltr">
                          {JSON.stringify(source.extracted_data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
