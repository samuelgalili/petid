import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Activity, AlertTriangle, CheckCircle2, XCircle, RefreshCw,
  Shield, Zap, Clock, Server, Database, Heart, ToggleLeft
} from "lucide-react";
import { format } from "date-fns";

type HealthStatus = "healthy" | "degraded" | "error";

interface BotHealth {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  health_status: string | null;
  last_error: string | null;
  last_health_check: string | null;
  last_run_at: string | null;
  icon: string | null;
  color: string | null;
}

interface HealthCheck {
  id: string;
  bot_slug: string;
  check_type: string;
  status: string;
  message: string | null;
  response_time_ms: number | null;
  checked_at: string;
}

interface ValidationRule {
  id: string;
  field_name: string;
  table_name: string;
  rule_type: string;
  rule_config: Record<string, any>;
  description: string | null;
  is_active: boolean;
}

const statusConfig: Record<HealthStatus, { color: string; icon: typeof CheckCircle2; label: string }> = {
  healthy: { color: "text-green-500", icon: CheckCircle2, label: "תקין" },
  degraded: { color: "text-yellow-500", icon: AlertTriangle, label: "מופחת" },
  error: { color: "text-red-500", icon: XCircle, label: "שגיאה" },
};

export default function AdminHealthCheck() {
  const queryClient = useQueryClient();

  // Dry Run mode
  const { data: dryRunSetting } = useQuery({
    queryKey: ["dry-run-mode"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "dry_run_mode")
        .maybeSingle();
      return (data?.value as any)?.enabled ?? false;
    },
  });

  const toggleDryRun = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("system_settings")
        .update({ value: { enabled } as any, updated_at: new Date().toISOString() })
        .eq("key", "dry_run_mode");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dry-run-mode"] });
      toast.success(dryRunSetting ? "מצב סימולציה כבוי" : "מצב סימולציה פעיל — לא ייקראו APIs חיצוניים");
    },
  });

  // Bot health data
  const { data: bots, isLoading: botsLoading } = useQuery({
    queryKey: ["bot-health"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_bots")
        .select("id, name, slug, is_active, health_status, last_error, last_health_check, last_run_at, icon, color")
        .order("name");
      if (error) throw error;
      return data as BotHealth[];
    },
  });

  // Recent health checks
  const { data: healthChecks } = useQuery({
    queryKey: ["health-checks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_health_checks")
        .select("*")
        .order("checked_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as HealthCheck[];
    },
  });

  // Validation rules
  const { data: validationRules } = useQuery({
    queryKey: ["validation-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_validation_rules")
        .select("*")
        .order("table_name");
      if (error) throw error;
      return data as ValidationRule[];
    },
  });

  const overallStatus: HealthStatus = bots?.some(b => (b.health_status as HealthStatus) === "error")
    ? "error"
    : bots?.some(b => (b.health_status as HealthStatus) === "degraded")
    ? "degraded"
    : "healthy";

  const StatusIcon = statusConfig[overallStatus].icon;

  const agentNameMap: Record<string, string> = {
    support: "שרה",
    "nrc-science": "דני",
    sales: "רוני",
    "content-creation": "אלונה",
    crm: "גאי",
    brain: "Brain",
    inventory: "Inventory",
    marketing: "Marketing",
    medical: "Medical",
    compliance: "Compliance",
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Health Check & QA
          </h1>
          <p className="text-muted-foreground text-sm mt-1">ניטור בריאות הסוכנים, ולידציה ומצב סימולציה</p>
        </div>

        {/* Dry Run Toggle */}
        <Card className="border-2 border-dashed border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ToggleLeft className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-semibold text-sm">מצב סימולציה (Dry Run)</p>
                <p className="text-xs text-muted-foreground">טיוטות בלבד — ללא APIs חיצוניים</p>
              </div>
            </div>
            <Switch
              checked={dryRunSetting ?? false}
              onCheckedChange={(v) => toggleDryRun.mutate(v)}
            />
          </CardContent>
        </Card>
      </div>

      {/* System Status Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              overallStatus === "healthy" ? "bg-green-500/10" : overallStatus === "degraded" ? "bg-yellow-500/10" : "bg-red-500/10"
            }`}>
              <StatusIcon className={`w-8 h-8 ${statusConfig[overallStatus].color}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold">סטטוס מערכת: {statusConfig[overallStatus].label}</h2>
              <p className="text-sm text-muted-foreground">
                {bots?.filter(b => b.is_active).length || 0} סוכנים פעילים מתוך {bots?.length || 0}
                {dryRunSetting && " • 🟡 מצב סימולציה פעיל"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="agents" dir="rtl">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agents">סוכנים</TabsTrigger>
          <TabsTrigger value="logs">לוג בריאות</TabsTrigger>
          <TabsTrigger value="validation">ולידציה</TabsTrigger>
        </TabsList>

        {/* Agent Health Grid */}
        <TabsContent value="agents">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bots?.map((bot) => {
              const status = (bot.health_status || "healthy") as HealthStatus;
              const config = statusConfig[status];
              const Icon = config.icon;
              const displayName = agentNameMap[bot.slug] || bot.name;

              return (
                <Card key={bot.id} className="relative overflow-hidden">
                  {!bot.is_active && (
                    <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center">
                      <Badge variant="destructive">מושבת</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="text-xl">{bot.icon || "🤖"}</span>
                        {displayName}
                      </CardTitle>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">סטטוס</span>
                      <Badge variant={status === "healthy" ? "default" : status === "degraded" ? "secondary" : "destructive"}>
                        {config.label}
                      </Badge>
                    </div>
                    {bot.last_run_at && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">הרצה אחרונה</span>
                        <span className="text-xs">{format(new Date(bot.last_run_at), "dd/MM HH:mm")}</span>
                      </div>
                    )}
                    {bot.last_error && (
                      <div className="mt-2 p-2 bg-red-500/5 rounded-lg border border-red-500/20">
                        <p className="text-xs text-red-600 line-clamp-2">{bot.last_error}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Health Check Logs */}
        <TabsContent value="logs">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {healthChecks && healthChecks.length > 0 ? (
                  <div className="divide-y divide-border">
                    {healthChecks.map((check) => {
                      const s = (check.status || "healthy") as HealthStatus;
                      const Icon = statusConfig[s].icon;
                      return (
                        <div key={check.id} className="p-4 flex items-center gap-3">
                          <Icon className={`w-4 h-4 flex-shrink-0 ${statusConfig[s].color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {agentNameMap[check.bot_slug] || check.bot_slug} — {check.check_type}
                            </p>
                            {check.message && (
                              <p className="text-xs text-muted-foreground truncate">{check.message}</p>
                            )}
                          </div>
                          <div className="text-left flex-shrink-0">
                            {check.response_time_ms !== null && (
                              <span className="text-xs text-muted-foreground">{check.response_time_ms}ms</span>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(check.checked_at), "dd/MM HH:mm:ss")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Heart className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm">אין לוגים עדיין — הפעל בדיקת בריאות</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Validation Rules */}
        <TabsContent value="validation">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                כללי ולידציה — הגנה על שלמות נתונים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {validationRules?.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <Database className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {rule.table_name}.{rule.field_name}
                          <Badge variant="outline" className="mr-2 text-xs">{rule.rule_type}</Badge>
                        </p>
                        <p className="text-xs text-muted-foreground">{rule.description}</p>
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">
                          {JSON.stringify(rule.rule_config)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={rule.is_active ? "default" : "secondary"}>
                      {rule.is_active ? "פעיל" : "מושבת"}
                    </Badge>
                  </div>
                ))}
                {(!validationRules || validationRules.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">אין כללי ולידציה מוגדרים</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
