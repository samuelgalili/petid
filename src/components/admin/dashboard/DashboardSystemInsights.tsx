/**
 * DashboardSystemInsights — System health, API usage, webhook monitor, backup/export, enhanced audit.
 * Items 16-20 of admin enhancement plan.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Wifi,
  WifiOff,
  Zap,
  Shield,
  Download,
  History,
  Webhook,
  Server,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface WebhookStatus {
  name: string;
  lastEvent: string | null;
  status: "active" | "inactive";
}

interface AuditEntry {
  id: string;
  action_type: string;
  entity_type: string;
  created_at: string;
}

export const DashboardSystemInsights = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookStatus[]>([]);
  const [edgeFunctionCount, setEdgeFunctionCount] = useState(0);
  const [apiKeyCount, setApiKeyCount] = useState(0);
  const [automationCount, setAutomationCount] = useState(0);
  const [totalAuditActions, setTotalAuditActions] = useState(0);

  useEffect(() => {
    fetchSystemData();
  }, []);

  const fetchSystemData = async () => {
    try {
      setLoading(true);

      const [auditRes, apiKeysRes, automationsRes, cardcomRes] = await Promise.all([
        supabase.from("admin_audit_log").select("id, action_type, entity_type, created_at").order("created_at", { ascending: false }).limit(8),
        supabase.from("api_keys").select("id").eq("is_active", true),
        supabase.from("automations").select("id").eq("is_active", true),
        supabase.from("cardcom_events").select("id, received_at").order("received_at", { ascending: false }).limit(1),
      ]);

      setAuditLogs((auditRes.data || []) as AuditEntry[]);
      setTotalAuditActions(auditRes.data?.length || 0);
      setApiKeyCount((apiKeysRes.data || []).length);
      setAutomationCount((automationsRes.data || []).length);

      // Webhook statuses
      const webhookList: WebhookStatus[] = [
        {
          name: "CardCom",
          lastEvent: cardcomRes.data?.[0]?.received_at || null,
          status: cardcomRes.data?.[0] ? "active" : "inactive",
        },
        {
          name: "WhatsApp",
          lastEvent: null,
          status: "inactive",
        },
      ];
      setWebhooks(webhookList);

      // Count edge functions from config (approximate)
      setEdgeFunctionCount(18); // Based on config.toml
    } catch (err) {
      console.error("System insights error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async (tableName: string) => {
    try {
      const { data } = await (supabase as any).from(tableName).select("*").limit(1000);
      if (!data || data.length === 0) return;

      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(","),
        ...data.map((row) =>
          headers.map((h) => {
            const val = (row as any)[h];
            return typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val ?? "";
          }).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tableName}_export_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <Activity className="w-5 h-5 text-emerald-500" />
        System & Operations
      </h2>

      {/* System Health Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Edge Functions", value: edgeFunctionCount, icon: <Zap className="w-4 h-4 text-amber-500" /> },
          { label: "Active API Keys", value: apiKeyCount, icon: <Shield className="w-4 h-4 text-sky-500" /> },
          { label: "Automations", value: automationCount, icon: <Activity className="w-4 h-4 text-violet-500" /> },
          { label: "Audit Actions", value: totalAuditActions, icon: <History className="w-4 h-4 text-slate-500" /> },
        ].map((s) => (
          <Card key={s.label} className="border-slate-200">
            <CardContent className="p-3 text-center">
              <div className="flex justify-center mb-1">{s.icon}</div>
              <p className="text-xl font-bold text-slate-800">{s.value}</p>
              <p className="text-[10px] text-slate-500">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Webhook Monitor */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Webhook className="w-4 h-4 text-sky-500" />
              Webhook Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {webhooks.map((wh) => (
              <div key={wh.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {wh.status === "active" ? (
                    <Wifi className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-slate-300" />
                  )}
                  <span className="text-sm font-medium text-slate-700">{wh.name}</span>
                </div>
                <div className="text-right">
                  <Badge className={cn(
                    "text-[10px] border-0",
                    wh.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                  )}>
                    {wh.status === "active" ? "Connected" : "No events"}
                  </Badge>
                  {wh.lastEvent && (
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      Last: {new Date(wh.lastEvent).toLocaleDateString("he-IL")}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-500" />
              Quick Export (CSV)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {["orders", "business_products", "profiles", "pets"].map((table) => (
              <Button
                key={table}
                variant="outline"
                size="sm"
                className="w-full justify-between text-xs"
                onClick={() => handleExportCSV(table)}
              >
                <span className="capitalize">{table.replace("_", " ")}</span>
                <Download className="w-3 h-3" />
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Audit Log */}
      {auditLogs.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                Recent Audit Log
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/admin/audit")}>
                <ExternalLink className="w-3 h-3 mr-1" /> View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Badge variant="outline" className="text-[9px] flex-shrink-0">
                    {log.action_type}
                  </Badge>
                  <span className="text-slate-500 truncate">{log.entity_type}</span>
                </div>
                <span className="text-[10px] text-slate-400 flex-shrink-0">
                  {new Date(log.created_at).toLocaleDateString("he-IL")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
