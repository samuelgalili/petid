import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert, CheckCircle2, XCircle, Clock, AlertTriangle,
  MessageCircle, DollarSign, Send, Edit3, Bot, Brain,
  Megaphone, Target, Headphones, Stethoscope, Scale, FlaskConical,
  Store, Truck
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<any>> = {
  brain: Brain, megaphone: Megaphone, target: Target,
  "message-circle": MessageCircle, store: Store, truck: Truck,
  headphones: Headphones, stethoscope: Stethoscope, scale: Scale,
  bot: FlaskConical,
};

const colorMap: Record<string, string> = {
  purple: "from-purple-500 to-purple-600", pink: "from-pink-500 to-pink-600",
  cyan: "from-cyan-500 to-cyan-600", orange: "from-orange-500 to-orange-600",
  green: "from-green-500 to-green-600", blue: "from-blue-500 to-blue-600",
  amber: "from-amber-500 to-amber-600", emerald: "from-emerald-500 to-emerald-600",
  indigo: "from-indigo-500 to-indigo-600", violet: "from-violet-500 to-violet-600",
};

type CriticalCategory = "communication" | "pricing" | "leads" | "all";

const categoryConfig: Record<string, { label: string; icon: React.ComponentType<any>; keywords: string[] }> = {
  communication: { label: "תקשורת", icon: MessageCircle, keywords: ["whatsapp", "sms", "email", "הודעה"] },
  pricing: { label: "מחירים", icon: DollarSign, keywords: ["price", "מחיר", "הנחה", "discount"] },
  leads: { label: "לידים", icon: Target, keywords: ["lead", "ליד", "libra", "insurance", "ביטוח"] },
};

const AdminApprovalQueue = () => {
  const [activeCategory, setActiveCategory] = useState<CriticalCategory>("all");
  const [editDialog, setEditDialog] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [autoApproveInternal, setAutoApproveInternal] = useState(true);
  const queryClient = useQueryClient();

  const { data: bots = [] } = useQuery({
    queryKey: ["agent-bots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agent_bots").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: pendingTasks = [], isLoading } = useQuery({
    queryKey: ["approval-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_tasks")
        .select("*, agent_bots(*)")
        .eq("requires_approval", true)
        .in("status", ["pending_approval", "draft"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000,
  });

  const { data: recentDecisions = [] } = useQuery({
    queryKey: ["recent-decisions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_tasks")
        .select("*, agent_bots(*)")
        .eq("requires_approval", true)
        .in("status", ["approved", "cancelled", "completed"])
        .order("approved_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ taskId, editedPayload }: { taskId: string; editedPayload?: string }) => {
      const updates: any = { status: "approved", approved_at: new Date().toISOString() };
      if (editedPayload) {
        updates.payload = { draft_content: editedPayload };
      }
      const { error } = await supabase.from("agent_tasks").update(updates).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
      queryClient.invalidateQueries({ queryKey: ["recent-decisions"] });
      toast.success("✅ פעולה אושרה");
      setEditDialog(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("agent_tasks").update({ status: "cancelled" }).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
      queryClient.invalidateQueries({ queryKey: ["recent-decisions"] });
      toast.success("פעולה נדחתה");
    },
  });

  const categorizeTask = (task: any): string => {
    const text = `${task.title} ${task.description} ${task.task_type}`.toLowerCase();
    for (const [key, config] of Object.entries(categoryConfig)) {
      if (config.keywords.some((kw) => text.includes(kw))) return key;
    }
    return "other";
  };

  const filtered = activeCategory === "all"
    ? pendingTasks
    : pendingTasks.filter((t: any) => categorizeTask(t) === activeCategory);

  const stats = {
    communication: pendingTasks.filter((t: any) => categorizeTask(t) === "communication").length,
    pricing: pendingTasks.filter((t: any) => categorizeTask(t) === "pricing").length,
    leads: pendingTasks.filter((t: any) => categorizeTask(t) === "leads").length,
  };

  return (
    <AdminLayout title="תור אישורים — Human-in-the-Loop" icon={ShieldAlert}>
      <div className="space-y-6">
        {/* Auto-Pilot Toggle */}
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Auto-Pilot לפעולות פנימיות</p>
            <p className="text-xs text-muted-foreground">
              עדכוני CRM, לוגים ומלאי — אוטומטי ללא אישור
            </p>
          </div>
          <Switch checked={autoApproveInternal} onCheckedChange={setAutoApproveInternal} />
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveCategory("all")}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">סה"כ ממתינים</p>
                <p className="text-2xl font-bold">{pendingTasks.length}</p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground/40" />
            </div>
          </Card>
          {Object.entries(categoryConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <Card key={key} className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveCategory(key as CriticalCategory)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                    <p className="text-2xl font-bold">{stats[key as keyof typeof stats]}</p>
                  </div>
                  <Icon className="w-8 h-8 text-muted-foreground/40" />
                </div>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" className="gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              ממתינים ({filtered.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              היסטוריה
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {filtered.length === 0 ? (
              <Card className="p-12 text-center">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-emerald-500/40" />
                <p className="text-lg font-medium">אין פעולות קריטיות ממתינות</p>
                <p className="text-sm text-muted-foreground mt-1">כל הפעולות אושרו או מטופלות אוטומטית</p>
              </Card>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {filtered.map((task: any) => {
                    const bot = task.agent_bots;
                    const Icon = bot ? iconMap[bot.icon] || Bot : Bot;
                    const category = categorizeTask(task);
                    const CatIcon = categoryConfig[category]?.icon || Clock;
                    const draftContent = (task.payload as any)?.draft_content;

                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                      >
                        <Card className="p-5 border-amber-500/30 bg-amber-500/5">
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0",
                              bot ? colorMap[bot.color] : "from-gray-500 to-gray-600"
                            )}>
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium">{task.title}</h3>
                                <Badge variant="outline" className="text-[10px] gap-1">
                                  <CatIcon className="w-3 h-3" />
                                  {categoryConfig[category]?.label || "כללי"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{bot?.name}</p>
                              {task.description && (
                                <p className="text-sm mt-2">{task.description}</p>
                              )}
                              {task.reason && (
                                <p className="text-xs mt-1 text-muted-foreground">
                                  <span className="font-medium">סיבה:</span> {task.reason}
                                </p>
                              )}
                              {task.expected_outcome && (
                                <p className="text-xs mt-1 text-muted-foreground">
                                  <span className="font-medium">תוצאה צפויה:</span> {task.expected_outcome}
                                </p>
                              )}

                              {/* AI Draft Preview */}
                              {draftContent && (
                                <div className="mt-3 p-3 rounded-lg bg-background border border-border/50">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Send className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-xs font-medium">טיוטת AI</span>
                                  </div>
                                  <p className="text-sm whitespace-pre-wrap" dir="auto">{draftContent}</p>
                                </div>
                              )}

                              <div className="flex gap-2 mt-4">
                                <Button
                                  size="sm"
                                  className="gap-1.5"
                                  onClick={() => approveMutation.mutate({ taskId: task.id })}
                                  disabled={approveMutation.isPending}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  אשר ושלח
                                </Button>
                                {draftContent && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5"
                                    onClick={() => {
                                      setEditDialog(task.id);
                                      setEditedContent(draftContent);
                                    }}
                                  >
                                    <Edit3 className="w-4 h-4" />
                                    ערוך טיוטה
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="gap-1.5"
                                  onClick={() => rejectMutation.mutate(task.id)}
                                  disabled={rejectMutation.isPending}
                                >
                                  <XCircle className="w-4 h-4" />
                                  דחה
                                </Button>
                              </div>
                            </div>
                            <div className="text-[10px] text-muted-foreground shrink-0">
                              {new Date(task.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {recentDecisions.map((task: any) => {
                  const bot = task.agent_bots;
                  const Icon = bot ? iconMap[bot.icon] || Bot : Bot;
                  return (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                      <div className={cn(
                        "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0",
                        bot ? colorMap[bot.color] : "from-gray-500 to-gray-600"
                      )}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{bot?.name}</p>
                      </div>
                      <Badge className={cn(
                        "text-[10px]",
                        task.status === "approved" || task.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-red-500/10 text-red-600"
                      )}>
                        {task.status === "approved" || task.status === "completed" ? "אושר" : "נדחה"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {task.approved_at && new Date(task.approved_at).toLocaleDateString("he-IL")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Edit Draft Dialog */}
        <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                עריכת טיוטת AI
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={6}
                className="text-sm"
                dir="auto"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditDialog(null)}>
                  ביטול
                </Button>
                <Button
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    if (editDialog) {
                      approveMutation.mutate({ taskId: editDialog, editedPayload: editedContent });
                    }
                  }}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  אשר ושלח
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminApprovalQueue;
