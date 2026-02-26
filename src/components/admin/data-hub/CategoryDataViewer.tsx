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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Globe,
  Edit3,
  Search,
  Database,
  FolderOpen,
  Dog,
  Heart,
  Zap,
  Brain,
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

// Maps category to its domain table
const CATEGORY_TABLE_MAP: Record<string, string> = {
  breeds: "breed_information",
  // Future tables can be added here:
  // insurance: "insurance_providers",
  // dog_parks: "dog_parks",
  // research: "knowledge_articles",
  // articles: "knowledge_articles",
};

const BREED_RATING_FIELDS = [
  { key: "affection_family", label: "משפחה", icon: Heart },
  { key: "energy_level", label: "אנרגיה", icon: Zap },
  { key: "trainability", label: "אילוף", icon: Brain },
];

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
  const [domainData, setDomainData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewTab, setViewTab] = useState<"data" | "sources">("data");

  const domainTable = CATEGORY_TABLE_MAP[category];

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Fetch raw sources
      const { data: srcData } = await supabase
        .from("admin_data_sources" as any)
        .select("*")
        .eq("data_type", category)
        .order("created_at", { ascending: false });
      setSources((srcData as any[]) || []);

      // Fetch domain data if table exists
      if (domainTable) {
        const { data: dd } = await supabase
          .from(domainTable as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500);
        setDomainData((dd as any[]) || []);
      } else {
        setDomainData([]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAll();
      setSearchQuery("");
      setViewTab(domainTable ? "data" : "sources");
    }
  }, [open, category]);

  const handleDeleteSource = async (id: string, fileUrl?: string) => {
    if (fileUrl && !fileUrl.startsWith("http")) {
      const path = fileUrl.split("/").pop();
      if (path) await supabase.storage.from("admin-data").remove([path]);
    }
    await supabase.from("admin_data_sources" as any).delete().eq("id", id);
    toast({ title: "נמחק בהצלחה" });
    fetchAll();
    onDataChanged();
  };

  const getSourceIcon = (source: any) => {
    if (source.file_type === "url") return <Globe className="w-3.5 h-3.5 text-primary" />;
    if (source.file_type === "manual") return <Edit3 className="w-3.5 h-3.5 text-primary" />;
    return <FileText className="w-3.5 h-3.5 text-primary" />;
  };

  // Filter domain data
  const filteredDomainData = domainData.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (category === "breeds") {
      return (
        item.breed_name?.toLowerCase().includes(q) ||
        item.breed_name_he?.includes(q)
      );
    }
    return JSON.stringify(item).toLowerCase().includes(q);
  });

  const filteredSources = sources.filter((s) => {
    if (!searchQuery.trim()) return true;
    return s.title?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const renderBreedCard = (breed: any) => (
    <Card key={breed.id} className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold truncate">
                {breed.breed_name_he || breed.breed_name}
              </h4>
              {breed.is_active === false && (
                <Badge variant="outline" className="text-[9px] h-4">לא פעיל</Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">{breed.breed_name}</p>
          </div>
          <Badge variant="secondary" className="text-[9px] shrink-0">
            {breed.life_expectancy_years || "—"} שנים
          </Badge>
        </div>
        {breed.description_he && (
          <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-2">{breed.description_he}</p>
        )}
        <div className="mt-2 space-y-1">
          {BREED_RATING_FIELDS.map(({ key, label, icon: Icon }) => {
            const val = breed[key];
            if (val == null) return null;
            return (
              <div key={key} className="flex items-center gap-1.5 text-[10px]">
                <Icon className="w-3 h-3 text-muted-foreground" />
                <span className="w-10 text-muted-foreground">{label}</span>
                <Progress value={val * 20} className="h-1 flex-1" />
                <span className="w-3 text-right font-medium">{val}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const renderGenericDomainCard = (item: any) => {
    const title = item.title || item.name || item.breed_name || item.id;
    return (
      <Card key={item.id} className="overflow-hidden">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Database className="w-3.5 h-3.5 text-primary mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium truncate">{title}</h4>
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(item.created_at), "dd/MM/yyyy", { locale: he })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
            >
              {expandedId === item.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </div>
          {expandedId === item.id && (
            <pre className="mt-2 text-[9px] bg-muted p-2 rounded max-h-32 overflow-auto whitespace-pre-wrap" dir="ltr">
              {JSON.stringify(item, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderSourceCard = (source: any) => {
    const ext = source.extracted_data || {};
    const hasReadableContent = ext.title || ext.summary || ext.summary_he || ext.full_content;
    const isExpanded = expandedId === source.id;

    return (
      <Card key={source.id} className="overflow-hidden hover:shadow-sm transition-shadow">
        <CardContent className="p-2.5">
          <div className="flex items-start gap-2">
            {getSourceIcon(source)}
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : source.id)}>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-medium truncate flex-1">{source.title}</h4>
                <Badge variant={source.is_processed ? "default" : "secondary"} className="text-[8px] h-4 px-1.5">
                  {source.is_processed ? "✓ עובד" : "⏳ ממתין"}
                </Badge>
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                {format(new Date(source.created_at), "dd/MM/yy HH:mm", { locale: he })}
                {source.file_type === "url" && source.file_url && (
                  <a href={source.file_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 mr-2 text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}>
                    <ExternalLink className="w-2.5 h-2.5" /> מקור
                  </a>
                )}
              </p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button variant="ghost" size="icon" className="h-6 w-6"
                onClick={() => setExpandedId(isExpanded ? null : source.id)}>
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10"
                onClick={() => handleDeleteSource(source.id, source.file_url)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-2 space-y-2 border-t pt-2">
              {hasReadableContent ? (
                <>
                  {ext.title_he && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">כותרת בעברית</p>
                      <p className="text-xs font-medium">{ext.title_he}</p>
                    </div>
                  )}
                  {ext.summary_he && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">סיכום</p>
                      <p className="text-xs leading-relaxed">{ext.summary_he}</p>
                    </div>
                  )}
                  {!ext.summary_he && ext.summary && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">Summary</p>
                      <p className="text-xs leading-relaxed" dir="ltr">{ext.summary}</p>
                    </div>
                  )}
                  {ext.authors && Array.isArray(ext.authors) && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">מחברים</p>
                      <div className="flex flex-wrap gap-1">
                        {ext.authors.map((a: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[9px]">{a}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {ext.topics && Array.isArray(ext.topics) && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">נושאים</p>
                      <div className="flex flex-wrap gap-1">
                        {ext.topics.map((t: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[9px]">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {ext.key_findings_he && Array.isArray(ext.key_findings_he) && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">ממצאים עיקריים</p>
                      <ul className="text-xs space-y-0.5 list-disc list-inside">
                        {ext.key_findings_he.map((f: string, i: number) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                  )}
                  {source.file_url && source.file_type === "url" && (
                    <a href={source.file_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                      <ExternalLink className="w-3 h-3" /> קרא את המחקר המלא
                    </a>
                  )}
                </>
              ) : (
                <div className="text-center py-3 text-muted-foreground">
                  <p className="text-[10px]">אין תוכן מעובד למקור זה</p>
                  {source.file_url && source.file_type === "url" && (
                    <a href={source.file_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                      <ExternalLink className="w-3 h-3" /> פתח קישור מקור
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0" dir="rtl">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="text-xl">{categoryIcon}</span>
            {categoryLabel}
            <div className="flex items-center gap-1.5 mr-auto">
              {domainTable && (
                <Badge variant="default" className="text-[10px]">
                  {domainData.length} רשומות
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px]">
                {sources.length} מקורות
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pt-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש..."
              className="pr-9 h-8 text-xs"
            />
          </div>
        </div>

        {domainTable && (
          <div className="px-4 pt-2">
            <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="data" className="text-xs gap-1.5 h-7">
                  <Database className="w-3 h-3" />
                  נתונים ({filteredDomainData.length})
                </TabsTrigger>
                <TabsTrigger value="sources" className="text-xs gap-1.5 h-7">
                  <FolderOpen className="w-3 h-3" />
                  מקורות ({filteredSources.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        <ScrollArea className="flex-1 px-4 pb-4 pt-2 max-h-[55vh]">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
            </div>
          ) : viewTab === "data" && domainTable ? (
            filteredDomainData.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Dog className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">{searchQuery ? "לא נמצאו תוצאות" : "אין נתונים בקטגוריה"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredDomainData.map((item) =>
                  category === "breeds" ? renderBreedCard(item) : renderGenericDomainCard(item)
                )}
              </div>
            )
          ) : (
            filteredSources.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">{searchQuery ? "לא נמצאו תוצאות" : "אין מקורות נתונים"}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredSources.map(renderSourceCard)}
              </div>
            )
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
