import { useState, useEffect } from "react";
import { Zap, CheckCircle2, Loader2, Clock, AlertTriangle, Brain, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FleetCommand {
  id: string;
  raw_command: string;
  status: string;
  target_agent: string | null;
  brain_analysis: any;
  result: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; label: string; className: string }> = {
  pending: { icon: Clock, label: "ממתין", className: "text-amber-500" },
  processing: { icon: Loader2, label: "מעבד", className: "text-sky-500 animate-spin" },
  completed: { icon: CheckCircle2, label: "הושלם", className: "text-emerald-500" },
  failed: { icon: AlertTriangle, label: "נכשל", className: "text-red-500" },
};

export const DashboardFleetCommand = () => {
  const { toast } = useToast();
  const [command, setCommand] = useState("");
  const [sending, setSending] = useState(false);
  const [commands, setCommands] = useState<FleetCommand[]>([]);

  useEffect(() => {
    fetchCommands();

    const channel = supabase
      .channel("fleet-commands-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fleet_commands" },
        () => fetchCommands()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchCommands = async () => {
    const { data } = await supabase
      .from("fleet_commands" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setCommands(data as any);
  };

  const sendCommand = async () => {
    if (!command.trim()) return;
    setSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("fleet_commands" as any).insert({
        raw_command: command.trim(),
        status: "pending",
        issued_by: user?.id || null,
      } as any);

      if (error) throw error;

      toast({ title: "פקודה נשלחה", description: "Brain מנתח ומאציל לסוכנים..." });
      setCommand("");
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendCommand();
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Brain className="w-4 h-4 text-primary" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-sm">Fleet Command Center</h3>
          <p className="text-xs text-muted-foreground">שלח פקודות ל-Brain — הוא ינתח, יאציל ידווח</p>
        </div>
      </div>

      {/* Command Input */}
      <div className="p-4 space-y-3">
        <Textarea
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="כתוב פקודה לצוות הסוכנים... (Ctrl+Enter לשליחה)"
          className="min-h-[80px] resize-none bg-muted/40 border-border/50 text-foreground placeholder:text-muted-foreground text-sm"
          dir="rtl"
        />
        <Button
          onClick={sendCommand}
          disabled={!command.trim() || sending}
          className="w-full gap-2 font-medium"
          size="sm"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" strokeWidth={1.5} />
          )}
          {sending ? "שולח..." : "⚡ Send to Fleet"}
        </Button>
      </div>

      {/* Live Feed */}
      {commands.length > 0 && (
        <div className="border-t border-border">
          <div className="px-5 py-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">Live Feed</span>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {commands.map((cmd) => {
              const statusCfg = STATUS_CONFIG[cmd.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;

              return (
                <div
                  key={cmd.id}
                  className="px-5 py-3 border-t border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <StatusIcon className={cn("w-4 h-4 mt-0.5 shrink-0", statusCfg.className)} strokeWidth={1.5} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate" dir="rtl">
                        {cmd.raw_command}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={cn("text-xs font-medium", statusCfg.className)}>
                          {statusCfg.label}
                        </span>
                        {cmd.target_agent && (
                          <span className="text-xs text-muted-foreground">
                            → {cmd.target_agent}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(cmd.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {cmd.brain_analysis && (
                        <p className="text-xs text-muted-foreground mt-1 truncate" dir="rtl">
                          🧠 {typeof cmd.brain_analysis === "object"
                            ? (cmd.brain_analysis as any).reasoning || JSON.stringify(cmd.brain_analysis)
                            : String(cmd.brain_analysis)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
