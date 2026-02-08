import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  TrendingUp,
  Database,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DATA_CATEGORIES } from "@/types/admin-data";

interface CategoryHealth {
  category: string;
  label: string;
  icon: string;
  totalSources: number;
  processedSources: number;
  syncedSources: number;
  failedSources: number;
  avgQuality: number;
  lastUpdate: string | null;
}

export const DataHealthDashboard = () => {
  const { toast } = useToast();
  const [health, setHealth] = useState<CategoryHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const categories: CategoryHealth[] = [];

      for (const cat of DATA_CATEGORIES) {
        const { data: sources } = await supabase
          .from("admin_data_sources" as any)
          .select("*")
          .eq("data_type", cat.id)
          .eq("is_active", true);

        const items = (sources as any[]) || [];
        const processed = items.filter((s) => s.is_processed);
        const synced = items.filter((s) => s.sync_status === "synced");
        const failed = items.filter((s) => s.sync_status === "failed");
        const avgQ = processed.length > 0
          ? processed.reduce((sum: number, s: any) => sum + (s.quality_score || 0), 0) / processed.length
          : 0;

        const lastItem = items.sort((a: any, b: any) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )[0];

        categories.push({
          category: cat.id,
          label: cat.labelHe,
          icon: cat.icon,
          totalSources: items.length,
          processedSources: processed.length,
          syncedSources: synced.length,
          failedSources: failed.length,
          avgQuality: Math.round(avgQ * 10) / 10,
          lastUpdate: lastItem?.updated_at || null,
        });
      }

      setHealth(categories);

      // Fetch recent sync logs
      const { data: logs } = await supabase
        .from("admin_data_sync_log" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentLogs((logs as any[]) || []);
    } catch (err) {
      console.error("Failed to fetch health:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-data-sources", {
        body: { syncAll: true },
      });

      if (error) throw error;

      toast({
        title: "סנכרון הושלם ✅",
        description: `${data?.synced || 0} מקורות סונכרנו`,
      });
      fetchHealth();
    } catch (err: any) {
      toast({
        title: "שגיאה בסנכרון",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const getHealthColor = (cat: CategoryHealth) => {
    if (cat.totalSources === 0) return "text-muted-foreground";
    if (cat.failedSources > 0) return "text-destructive";
    if (cat.processedSources === cat.totalSources && cat.syncedSources === cat.totalSources)
      return "text-green-600";
    return "text-yellow-500";
  };

  const getHealthIcon = (cat: CategoryHealth) => {
    if (cat.totalSources === 0) return <Database className="w-4 h-4 text-muted-foreground" />;
    if (cat.failedSources > 0) return <XCircle className="w-4 h-4 text-destructive" />;
    if (cat.processedSources === cat.totalSources) return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  };

  const getOverallScore = () => {
    if (health.length === 0) return 0;
    const total = health.reduce((sum, h) => sum + h.totalSources, 0);
    const processed = health.reduce((sum, h) => sum + h.processedSources, 0);
    if (total === 0) return 0;
    return Math.round((processed / total) * 100);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("he-IL", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const overallScore = getOverallScore();

  return (
    <div className="space-y-4" dir="rtl">
      {/* Overall Health */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">בריאות המערכת</h3>
            <p className="text-xs text-muted-foreground">
              {overallScore}% מהמקורות מעובדים
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSyncAll}
          disabled={syncing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "מסנכרן..." : "סנכרן הכל"}
        </Button>
      </div>

      <Progress value={overallScore} className="h-2" />

      {/* Category Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {health.map((cat) => (
          <Card key={cat.category} className="overflow-hidden">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="text-lg">{cat.icon}</span>
                  {cat.label}
                </span>
                {getHealthIcon(cat)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">מקורות</span>
                  <p className="font-semibold">{cat.totalSources}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">מעובדים</span>
                  <p className={`font-semibold ${getHealthColor(cat)}`}>
                    {cat.processedSources}/{cat.totalSources}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">איכות</span>
                  <p className="font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {cat.avgQuality}/10
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">עדכון</span>
                  <p className="font-semibold text-[10px]">{formatDate(cat.lastUpdate)}</p>
                </div>
              </div>
              {cat.failedSources > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  {cat.failedSources} נכשלו
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Sync Activity */}
      {recentLogs.length > 0 && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">פעילות סנכרון אחרונה</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2">
              {recentLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between text-xs border-b last:border-0 pb-2">
                  <div className="flex items-center gap-2">
                    {log.status === "completed" ? (
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                    ) : log.status === "failed" ? (
                      <XCircle className="w-3 h-3 text-destructive" />
                    ) : (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    )}
                    <span>{log.target_table}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      +{log.records_created} /{" "}↑{log.records_updated}
                    </span>
                    <span className="text-muted-foreground">{formatDate(log.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
