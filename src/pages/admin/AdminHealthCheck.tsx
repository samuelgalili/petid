import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Activity, AlertTriangle, CheckCircle2, XCircle, RefreshCw,
  Shield, Zap, Clock, Server, Database, Heart, ToggleLeft,
  Globe, Truck, CreditCard, Wifi, WifiOff, ShieldCheck,
  Bug, Moon, Sun, ScanLine
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
  healthy: { color: "text-emerald-500", icon: CheckCircle2, label: "תקין" },
  degraded: { color: "text-yellow-500", icon: AlertTriangle, label: "מופחת" },
  error: { color: "text-red-500", icon: XCircle, label: "שגיאה" },
};

// ─── API Connection Indicators ───
const apiConnections = [
  { name: 'China Suppliers API', description: 'YunExpress / Cainiao', icon: Globe, status: 'healthy' as HealthStatus, latency: 142, lastCheck: new Date(Date.now() - 180000).toISOString() },
  { name: 'Israel Shipping', description: 'HFD Express / ZigZag', icon: Truck, status: 'healthy' as HealthStatus, latency: 38, lastCheck: new Date(Date.now() - 120000).toISOString() },
  { name: 'CardCom Payments', description: 'Terminal ••••47', icon: CreditCard, status: 'healthy' as HealthStatus, latency: 95, lastCheck: new Date(Date.now() - 60000).toISOString() },
  { name: 'WhatsApp Business', description: 'Meta Cloud API', icon: Wifi, status: 'degraded' as HealthStatus, latency: 320, lastCheck: new Date(Date.now() - 300000).toISOString() },
];

// ─── QA Error Log ───
const qaErrors = [
  { id: '1', severity: 'error' as const, message: 'OCR scan returned weight > 200kg for pet #892 — blocked by validation rule', bot: 'QA Bot', timestamp: new Date(Date.now() - 900000).toISOString() },
  { id: '2', severity: 'warning' as const, message: 'WhatsApp delivery rate dropped below 95% threshold (current: 91.2%)', bot: 'Compliance', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', severity: 'warning' as const, message: 'Product "Joint Chews XL" missing Hebrew translation — flagged for admin', bot: 'Content Bot', timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: '4', severity: 'info' as const, message: 'Dry Run simulation completed: 12 WhatsApp messages drafted, 0 sent', bot: 'QA Bot', timestamp: new Date(Date.now() - 10800000).toISOString() },
  { id: '5', severity: 'error' as const, message: 'CardCom webhook signature mismatch — event rejected (ID: evt_28f4)', bot: 'Security', timestamp: new Date(Date.now() - 14400000).toISOString() },
  { id: '6', severity: 'info' as const, message: 'NRC formula validation passed for 847/847 active pets', bot: 'QA Bot', timestamp: new Date(Date.now() - 18000000).toISOString() },
];

// ─── Security Scans ───
const securityScans = [
  { name: 'RLS Policy Audit', status: 'passed', tables: 42, lastRun: new Date(Date.now() - 3600000).toISOString() },
  { name: 'API Key Rotation Check', status: 'passed', tables: 8, lastRun: new Date(Date.now() - 7200000).toISOString() },
  { name: 'Edge Function Auth Scan', status: 'warning', tables: 16, lastRun: new Date(Date.now() - 1800000).toISOString() },
  { name: 'Data Encryption Verify', status: 'passed', tables: 12, lastRun: new Date(Date.now() - 5400000).toISOString() },
];

export default function AdminHealthCheck() {
  const queryClient = useQueryClient();
  const [darkPanel, setDarkPanel] = useState(false);

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

  const { data: bots } = useQuery({
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
    support: "שרה", "nrc-science": "דני", sales: "רוני",
    "content-creation": "אלונה", crm: "גאי", brain: "Brain",
    inventory: "Inventory", marketing: "Marketing",
    medical: "Medical", compliance: "Compliance",
  };

  const panelClass = darkPanel ? 'bg-[hsl(220,20%,8%)] text-[hsl(0,0%,92%)] rounded-[24px] p-6' : '';
  const cardClass = darkPanel ? 'bg-[hsl(220,18%,13%)] border-[hsl(220,15%,20%)] text-[hsl(0,0%,90%)]' : '';
  const mutedClass = darkPanel ? 'text-[hsl(220,10%,55%)]' : 'text-muted-foreground';

  return (
    <div className={cn("space-y-6 transition-colors duration-300", panelClass)} dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            System Health & Security
          </h1>
          <p className={cn("text-sm mt-1", mutedClass)}>ניטור API, אבטחה, ובריאות סוכנים</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Dark Panel Toggle */}
          <Button
            variant="outline"
            size="sm"
            className={cn("rounded-xl gap-2 text-xs", darkPanel && 'border-[hsl(220,15%,25%)] text-[hsl(0,0%,80%)] hover:bg-[hsl(220,15%,18%)]')}
            onClick={() => setDarkPanel(!darkPanel)}
          >
            {darkPanel ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {darkPanel ? 'Light' : 'Dark'}
          </Button>

          {/* Dry Run Toggle */}
          <Card className={cn("border-2 border-dashed border-yellow-500/30 bg-yellow-500/5", cardClass)}>
            <CardContent className="p-3 flex items-center gap-3">
              <ToggleLeft className="w-4 h-4 text-yellow-600" />
              <div>
                <p className="font-semibold text-xs">Dry Run</p>
                <p className={cn("text-[10px]", mutedClass)}>סימולציה בלבד</p>
              </div>
              <Switch
                checked={dryRunSetting ?? false}
                onCheckedChange={(v) => toggleDryRun.mutate(v)}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── API Connection Status ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {apiConnections.map((api, i) => {
          const Icon = api.icon;
          const isOk = api.status === 'healthy';
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className={cn("relative overflow-hidden", cardClass)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", isOk ? "bg-emerald-500/10" : "bg-yellow-500/10")}>
                      <Icon className={cn("w-4 h-4", isOk ? "text-emerald-500" : "text-yellow-500")} strokeWidth={1.5} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("w-2 h-2 rounded-full", isOk ? "bg-emerald-500 animate-pulse" : "bg-yellow-500 animate-pulse")} />
                      <span className={cn("text-[10px] font-medium", isOk ? "text-emerald-500" : "text-yellow-500")}>
                        {isOk ? 'Online' : 'Degraded'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">{api.name}</p>
                  <p className={cn("text-[10px] mt-0.5", mutedClass)}>{api.description}</p>
                  <div className={cn("flex items-center justify-between mt-2 text-[10px]", mutedClass)}>
                    <span>{api.latency}ms</span>
                    <span>{format(new Date(api.lastCheck), "HH:mm:ss")}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ─── System Status Overview ─── */}
      <Card className={cardClass}>
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center",
              overallStatus === "healthy" ? "bg-emerald-500/10" : overallStatus === "degraded" ? "bg-yellow-500/10" : "bg-red-500/10"
            )}>
              <StatusIcon className={cn("w-7 h-7", statusConfig[overallStatus].color)} />
            </div>
            <div>
              <h2 className="text-lg font-bold">סטטוס מערכת: {statusConfig[overallStatus].label}</h2>
              <p className={cn("text-sm", mutedClass)}>
                {bots?.filter(b => b.is_active).length || 0} סוכנים פעילים מתוך {bots?.length || 0}
                {dryRunSetting && " • 🟡 מצב סימולציה פעיל"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="security" dir="rtl">
        <TabsList className={cn("grid w-full grid-cols-4", darkPanel && 'bg-[hsl(220,18%,15%)]')}>
          <TabsTrigger value="security">אבטחה</TabsTrigger>
          <TabsTrigger value="errors">שגיאות</TabsTrigger>
          <TabsTrigger value="agents">סוכנים</TabsTrigger>
          <TabsTrigger value="validation">ולידציה</TabsTrigger>
        </TabsList>

        {/* ═══ SECURITY SCANS ═══ */}
        <TabsContent value="security">
          <div className="space-y-4">
            <Card className={cardClass}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  <CardTitle className="text-sm font-semibold">סקירת אבטחה</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {securityScans.map((scan, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={cn("flex items-center gap-3 p-3 rounded-2xl border", darkPanel ? 'border-[hsl(220,15%,20%)] bg-[hsl(220,18%,11%)]' : 'border-border/40 bg-muted/20')}
                  >
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center",
                      scan.status === 'passed' ? 'bg-emerald-500/10' : 'bg-yellow-500/10'
                    )}>
                      {scan.status === 'passed'
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                        : <AlertTriangle className="w-4 h-4 text-yellow-500" strokeWidth={1.5} />
                      }
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{scan.name}</p>
                      <p className={cn("text-[10px]", mutedClass)}>{scan.tables} רכיבים נבדקו</p>
                    </div>
                    <div className="text-left">
                      <Badge variant={scan.status === 'passed' ? 'default' : 'secondary'} className="text-[10px]">
                        {scan.status === 'passed' ? 'עבר' : 'אזהרה'}
                      </Badge>
                      <p className={cn("text-[9px] mt-1", mutedClass)}>
                        {format(new Date(scan.lastRun), "dd/MM HH:mm")}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            <Card className={cardClass}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ScanLine className="w-5 h-5 text-primary" strokeWidth={1.5} />
                    <div>
                      <p className="text-sm font-semibold">בדיקה אחרונה</p>
                      <p className={cn("text-[10px]", mutedClass)}>
                        {format(new Date(Date.now() - 1800000), "dd/MM/yyyy HH:mm:ss")}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className={cn("rounded-xl text-xs gap-1.5", darkPanel && 'border-[hsl(220,15%,25%)] hover:bg-[hsl(220,15%,18%)]')}>
                    <RefreshCw className="w-3.5 h-3.5" />
                    הרץ סריקה
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══ QA ERROR LOG ═══ */}
        <TabsContent value="errors">
          <Card className={cardClass}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <CardTitle className="text-sm font-semibold">לוג שגיאות ואזהרות</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[450px]">
                <div className="divide-y divide-border/30">
                  {qaErrors.map((err, i) => (
                    <motion.div
                      key={err.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-4 flex items-start gap-3"
                    >
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                        err.severity === 'error' ? 'bg-red-500/10' : err.severity === 'warning' ? 'bg-yellow-500/10' : 'bg-primary/10'
                      )}>
                        {err.severity === 'error'
                          ? <XCircle className="w-3.5 h-3.5 text-red-500" strokeWidth={1.5} />
                          : err.severity === 'warning'
                          ? <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" strokeWidth={1.5} />
                          : <CheckCircle2 className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn("text-[10px] font-semibold uppercase tracking-wider",
                            err.severity === 'error' ? 'text-red-500' : err.severity === 'warning' ? 'text-yellow-500' : 'text-primary'
                          )}>
                            {err.severity}
                          </span>
                          <span className={cn("text-[10px]", mutedClass)}>· {err.bot}</span>
                        </div>
                        <p className="text-xs leading-relaxed">{err.message}</p>
                        <p className={cn("text-[10px] mt-1", mutedClass)}>
                          {format(new Date(err.timestamp), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ AGENTS ═══ */}
        <TabsContent value="agents">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bots?.map((bot) => {
              const status = (bot.health_status || "healthy") as HealthStatus;
              const config = statusConfig[status];
              const Icon = config.icon;
              const displayName = agentNameMap[bot.slug] || bot.name;

              return (
                <Card key={bot.id} className={cn("relative overflow-hidden", cardClass)}>
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
                      <Icon className={cn("w-5 h-5", config.color)} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className={mutedClass}>סטטוס</span>
                      <Badge variant={status === "healthy" ? "default" : status === "degraded" ? "secondary" : "destructive"}>
                        {config.label}
                      </Badge>
                    </div>
                    {bot.last_run_at && (
                      <div className="flex items-center justify-between text-sm">
                        <span className={mutedClass}>הרצה אחרונה</span>
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

        {/* ═══ VALIDATION ═══ */}
        <TabsContent value="validation">
          <Card className={cardClass}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                כללי ולידציה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {validationRules?.map((rule) => (
                  <div key={rule.id} className={cn("flex items-center justify-between p-3 rounded-2xl border",
                    darkPanel ? 'border-[hsl(220,15%,20%)] bg-[hsl(220,18%,11%)]' : 'border-border/40 bg-card'
                  )}>
                    <div className="flex items-center gap-3">
                      <Database className={cn("w-4 h-4", mutedClass)} />
                      <div>
                        <p className="text-sm font-medium">
                          {rule.table_name}.{rule.field_name}
                          <Badge variant="outline" className="mr-2 text-xs">{rule.rule_type}</Badge>
                        </p>
                        <p className={cn("text-xs", mutedClass)}>{rule.description}</p>
                      </div>
                    </div>
                    <Badge variant={rule.is_active ? "default" : "secondary"}>
                      {rule.is_active ? "פעיל" : "מושבת"}
                    </Badge>
                  </div>
                ))}
                {(!validationRules || validationRules.length === 0) && (
                  <p className={cn("text-sm text-center py-8", mutedClass)}>אין כללי ולידציה מוגדרים</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
