/**
 * AI OS Admin Panel — Agent Management, Security Center, Workflows, Memory
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Bot, Shield, Workflow, Brain, Settings, Activity, 
  AlertTriangle, CheckCircle2, XCircle, Clock, 
  ArrowLeft, Plus, ToggleLeft, ToggleRight, Eye,
  Lock, Unlock, Zap, BarChart3, Database, Search,
  ChevronRight, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ===== TAB: AGENTS =====
const AgentsTab = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [agentsRes, permsRes] = await Promise.all([
      supabase.from("agent_bots").select("*").order("name"),
      (supabase as any).from("ai_os_agent_permissions").select("*").order("agent_slug"),
    ]);
    if (agentsRes.data) setAgents(agentsRes.data);
    if (permsRes.data) setPermissions(permsRes.data);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">סוכנים פעילים ({agents.length})</h3>
        <Button size="sm" variant="outline" onClick={fetchData}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          רענן
        </Button>
      </div>
      
      <div className="grid gap-3">
        {agents.map(agent => {
          const agentPerms = permissions.filter(p => p.agent_slug === agent.slug);
          return (
            <div key={agent.id} className="border border-border rounded-xl p-4 bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: agent.color + "20", color: agent.color }}>
                  {agent.icon || "🤖"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{agent.name}</h4>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-medium",
                      agent.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                    )}>
                      {agent.is_active ? "פעיל" : "מושבת"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{agent.description}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">{agentPerms.length} כלים</p>
                </div>
              </div>
              {agentPerms.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {agentPerms.map(p => (
                    <span key={p.id} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {p.tool_name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {agents.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">אין סוכנים רשומים</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ===== TAB: TOOLS =====
const ToolsTab = () => {
  const [tools, setTools] = useState<any[]>([]);

  useEffect(() => {
    (supabase as any).from("ai_os_tool_registry").select("*").order("category").then(({ data }: any) => {
      if (data) setTools(data);
    });
  }, []);

  const getRiskColor = (level: string) => {
    switch (level) {
      case "critical": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "high": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "medium": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      default: return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">רישום כלים ({tools.length})</h3>
      </div>
      
      <div className="grid gap-2">
        {tools.map(tool => (
          <div key={tool.id} className="border border-border rounded-xl p-3 bg-card flex items-center gap-3">
            <Zap className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-foreground">{tool.display_name}</h4>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", getRiskColor(tool.risk_level))}>
                  {tool.risk_level}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{tool.description || tool.name}</p>
            </div>
            <div className="flex items-center gap-2">
              {tool.requires_approval && <Lock className="w-3.5 h-3.5 text-amber-500" title="דורש אישור" />}
              {tool.is_active ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
              )}
            </div>
          </div>
        ))}
        {tools.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">אין כלים רשומים</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ===== TAB: SECURITY =====
const SecurityTab = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);

  useEffect(() => {
    fetchSecurity();
  }, []);

  const fetchSecurity = async () => {
    const [incRes, execRes] = await Promise.all([
      (supabase as any).from("ai_os_security_incidents").select("*").order("created_at", { ascending: false }).limit(50),
      (supabase as any).from("ai_os_tool_executions").select("*").eq("status", "pending").order("created_at", { ascending: false }),
    ]);
    if (incRes.data) setIncidents(incRes.data);
    if (execRes.data) setExecutions(execRes.data);
  };

  const handleApprove = async (id: string) => {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-os-gateway`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      body: JSON.stringify({ action: "approve", execution_id: id }),
    });
    fetchSecurity();
  };

  const handleReject = async (id: string) => {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-os-gateway`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      body: JSON.stringify({ action: "reject", execution_id: id, reason: "Rejected by admin" }),
    });
    fetchSecurity();
  };

  return (
    <div className="space-y-6">
      {/* Pending Approvals */}
      {executions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4" />
            ממתין לאישור ({executions.length})
          </h3>
          <div className="space-y-2">
            {executions.map((exec: any) => (
              <div key={exec.id} className="border border-amber-200 dark:border-amber-800 rounded-xl p-4 bg-amber-50/50 dark:bg-amber-900/10">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{exec.tool_name}</h4>
                    <p className="text-xs text-muted-foreground">Agent: {exec.agent_slug} · Risk: {(exec.risk_score * 100).toFixed(0)}%</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleReject(exec.id)} className="h-7 text-xs text-destructive">
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      דחה
                    </Button>
                    <Button size="sm" onClick={() => handleApprove(exec.id)} className="h-7 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      אשר
                    </Button>
                  </div>
                </div>
                <pre className="text-[10px] bg-muted/50 rounded-lg p-2 overflow-x-auto">{JSON.stringify(exec.input_params, null, 2)}</pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incidents */}
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4" />
          אירועי אבטחה ({incidents.length})
        </h3>
        {incidents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">אין אירועי אבטחה</p>
          </div>
        ) : (
          <div className="space-y-2">
            {incidents.map((inc: any) => (
              <div key={inc.id} className="border border-border rounded-xl p-3 bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={cn("w-3.5 h-3.5", inc.severity === "critical" ? "text-red-500" : inc.severity === "high" ? "text-orange-500" : "text-amber-500")} />
                  <span className="text-xs font-semibold text-foreground">{inc.incident_type}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                    inc.severity === "critical" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                    inc.severity === "high" && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                    inc.severity === "medium" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                  )}>
                    {inc.severity}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{inc.description}</p>
                {inc.agent_slug && <p className="text-[10px] text-muted-foreground mt-1">Agent: {inc.agent_slug}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ===== TAB: WORKFLOWS =====
const WorkflowsTab = () => {
  const [workflows, setWorkflows] = useState<any[]>([]);

  useEffect(() => {
    (supabase as any).from("ai_os_workflow_runs").select("*").order("created_at", { ascending: false }).limit(50).then(({ data }: any) => {
      if (data) setWorkflows(data);
    });
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "failed": case "cancelled": return <XCircle className="w-4 h-4 text-destructive" />;
      case "running": return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      case "waiting_approval": return <Clock className="w-4 h-4 text-amber-500" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">ריצות Workflow ({workflows.length})</h3>
      {workflows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Workflow className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">אין workflows פעילים</p>
        </div>
      ) : (
        <div className="space-y-2">
          {workflows.map(wf => (
            <div key={wf.id} className="border border-border rounded-xl p-3 bg-card flex items-center gap-3">
              {getStatusIcon(wf.status)}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground">{wf.workflow_name}</h4>
                <p className="text-xs text-muted-foreground">
                  שלב {wf.current_step}/{wf.total_steps} · {wf.trigger_type}
                </p>
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                wf.status === "completed" && "bg-emerald-100 text-emerald-700",
                wf.status === "running" && "bg-blue-100 text-blue-700",
                wf.status === "failed" && "bg-red-100 text-red-700",
              )}>
                {wf.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ===== TAB: MEMORY =====
const MemoryTab = () => {
  const [memories, setMemories] = useState<any[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (supabase as any).from("ai_os_agent_memory").select("*").order("updated_at", { ascending: false }).limit(100).then(({ data }: any) => {
      if (data) setMemories(data);
    });
  }, []);

  const filtered = memories.filter(m => 
    !filter || m.key.includes(filter) || m.memory_type.includes(filter) || JSON.stringify(m.value).includes(filter)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="חפש בזיכרון..."
            className="pr-10 text-sm"
            dir="rtl"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">אין רשומות זיכרון</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(mem => (
            <div key={mem.id} className="border border-border rounded-xl p-3 bg-card">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{mem.memory_type}</span>
                <span className="text-xs font-semibold text-foreground">{mem.key}</span>
                {mem.is_protected && <Lock className="w-3 h-3 text-amber-500" />}
                <span className="text-[10px] text-muted-foreground ml-auto">Trust: {(mem.trust_score * 100).toFixed(0)}%</span>
              </div>
              <pre className="text-[10px] bg-muted/50 rounded-lg p-2 overflow-x-auto max-h-20">{JSON.stringify(mem.value, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ===== MAIN ADMIN PAGE =====
export default function AiOsAdmin() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 h-14 border-b border-border bg-background sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/growo")} className="h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Settings className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">AI OS Admin</h1>
            <p className="text-[10px] text-muted-foreground">ניהול סוכנים, כלים, אבטחה</p>
          </div>
        </div>
        <div className="mr-auto">
          <Button size="sm" onClick={() => navigate("/admin/ai-os")} variant="outline" className="text-xs">
            <Zap className="w-3.5 h-3.5 mr-1" />
            AI OS Console
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4">
        <Tabs defaultValue="agents" dir="rtl">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="agents" className="text-xs gap-1">
              <Bot className="w-3.5 h-3.5" /> סוכנים
            </TabsTrigger>
            <TabsTrigger value="tools" className="text-xs gap-1">
              <Zap className="w-3.5 h-3.5" /> כלים
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs gap-1">
              <Shield className="w-3.5 h-3.5" /> אבטחה
            </TabsTrigger>
            <TabsTrigger value="workflows" className="text-xs gap-1">
              <Workflow className="w-3.5 h-3.5" /> Workflows
            </TabsTrigger>
            <TabsTrigger value="memory" className="text-xs gap-1">
              <Brain className="w-3.5 h-3.5" /> זיכרון
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents"><AgentsTab /></TabsContent>
          <TabsContent value="tools"><ToolsTab /></TabsContent>
          <TabsContent value="security"><SecurityTab /></TabsContent>
          <TabsContent value="workflows"><WorkflowsTab /></TabsContent>
          <TabsContent value="memory"><MemoryTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
