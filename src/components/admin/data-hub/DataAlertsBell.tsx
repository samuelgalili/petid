import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, AlertTriangle, Info, AlertCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface DataAlert {
  id: string;
  alert_type: string;
  severity: string;
  category: string;
  title: string;
  description: string | null;
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
}

export const DataAlertsBell = () => {
  const [alerts, setAlerts] = useState<DataAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAlerts = async () => {
    const { data } = await supabase
      .from("admin_data_alerts" as any)
      .select("*")
      .eq("is_resolved", false)
      .order("created_at", { ascending: false })
      .limit(20);

    const items = (data as unknown as DataAlert[]) || [];
    setAlerts(items);
    setUnreadCount(items.filter((a) => !a.is_read).length);
  };

  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel("admin-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_data_alerts" }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const markAsRead = async (id: string) => {
    await supabase
      .from("admin_data_alerts" as any)
      .update({ is_read: true })
      .eq("id", id);
    fetchAlerts();
  };

  const resolveAlert = async (id: string) => {
    await supabase
      .from("admin_data_alerts" as any)
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", id);
    fetchAlerts();
  };

  const markAllRead = async () => {
    await supabase
      .from("admin_data_alerts" as any)
      .update({ is_read: true })
      .eq("is_read", false);
    fetchAlerts();
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error": return <AlertCircle className="w-4 h-4 text-destructive" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `לפני ${mins} דקות`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `לפני ${hours} שעות`;
    return `לפני ${Math.floor(hours / 24)} ימים`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-[10px]"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" dir="rtl">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm">התראות מערכת</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
              סמן הכל כנקרא
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <Check className="w-8 h-8 mx-auto mb-2 opacity-50" />
              אין התראות חדשות
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "flex gap-3 p-3 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer",
                  !alert.is_read && "bg-primary/5"
                )}
                onClick={() => !alert.is_read && markAsRead(alert.id)}
              >
                <div className="mt-0.5">{getSeverityIcon(alert.severity)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{alert.title}</p>
                  {alert.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {alert.description}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {getTimeAgo(alert.created_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={(e) => { e.stopPropagation(); resolveAlert(alert.id); }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
