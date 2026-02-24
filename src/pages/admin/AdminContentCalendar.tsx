import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, Sparkles, Loader2, CheckCircle2, XCircle,
  FileText, MessageSquare, Lightbulb, Bell, Mail, Send,
  Edit3, ChevronLeft, ChevronRight, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays, startOfWeek, parseISO } from "date-fns";
import { he } from "date-fns/locale";

const typeConfig: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = {
  blog_post: { label: "בלוג", icon: FileText, color: "bg-blue-500/10 text-blue-600" },
  social_caption: { label: "קפשן", icon: MessageSquare, color: "bg-pink-500/10 text-pink-600" },
  pet_care_tip: { label: "טיפ", icon: Lightbulb, color: "bg-amber-500/10 text-amber-600" },
  push_notification: { label: "פוש", icon: Bell, color: "bg-purple-500/10 text-purple-600" },
  email_newsletter: { label: "אימייל", icon: Mail, color: "bg-emerald-500/10 text-emerald-600" },
};

const channelLabels: Record<string, string> = {
  feed: "פיד",
  email: "אימייל",
  whatsapp: "WhatsApp",
  push: "התראה",
};

const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

const AdminContentCalendar = () => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [editDialog, setEditDialog] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const queryClient = useQueryClient();

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 0 });
    return format(addDays(base, weekOffset * 7), "yyyy-MM-dd");
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(parseISO(weekStart), i);
      return { date: format(d, "yyyy-MM-dd"), label: dayNames[i], formatted: format(d, "d/M", { locale: he }) };
    });
  }, [weekStart]);

  // Fetch calendar tasks for this week
  const { data: calendarTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["content-calendar-tasks", weekStart],
    queryFn: async () => {
      const weekEnd = format(addDays(parseISO(weekStart), 6), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("agent_tasks")
        .select("*")
        .eq("task_type", "content-creation")
        .gte("scheduled_for", weekStart)
        .lte("scheduled_for", weekEnd + "T23:59:59")
        .order("scheduled_for", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 8000,
  });

  // Group tasks by day
  const tasksByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const day of weekDays) map[day.date] = [];
    for (const task of calendarTasks) {
      const d = task.scheduled_for?.split("T")[0];
      if (d && map[d]) map[d].push(task);
      else if (d) map[d] = [task];
    }
    return map;
  }, [calendarTasks, weekDays]);

  // Generate calendar
  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/content-calendar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ week_start: weekStart }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Calendar generation failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["content-calendar-tasks"] });
      toast.success(`✅ לוח תוכן נוצר — ${data.total_items} פריטים נשלחו לאישור`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Approve single task
  const approveMutation = useMutation({
    mutationFn: async ({ taskId, editedPayload }: { taskId: string; editedPayload?: string }) => {
      const updates: any = { status: "approved", approved_at: new Date().toISOString() };
      if (editedPayload) updates.payload = { ...(calendarTasks.find(t => t.id === taskId)?.payload as any || {}), draft_content: editedPayload };
      const { error } = await supabase.from("agent_tasks").update(updates).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-calendar-tasks"] });
      toast.success("✅ אושר");
      setEditDialog(null);
    },
  });

  // Reject single
  const rejectMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("agent_tasks").update({ status: "cancelled" }).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-calendar-tasks"] });
      toast.success("נדחה");
    },
  });

  // Approve all pending
  const approveAllMutation = useMutation({
    mutationFn: async () => {
      const pending = calendarTasks.filter(t => t.status === "pending_approval" || t.status === "draft");
      if (pending.length === 0) throw new Error("אין פריטים ממתינים");
      const ids = pending.map(t => t.id);
      const { error } = await supabase
        .from("agent_tasks")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
      return pending.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["content-calendar-tasks"] });
      toast.success(`✅ ${count} פריטים אושרו ותוזמנו`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pendingCount = calendarTasks.filter(t => t.status === "pending_approval" || t.status === "draft").length;
  const approvedCount = calendarTasks.filter(t => t.status === "approved" || t.status === "completed").length;

  return (
    <AdminLayout title="לוח תוכן שבועי" icon={CalendarDays}>
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => setWeekOffset(p => p - 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="text-center min-w-[140px]">
              <p className="font-medium text-sm">
                {format(parseISO(weekStart), "d MMMM", { locale: he })} — {format(addDays(parseISO(weekStart), 6), "d MMMM yyyy", { locale: he })}
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={() => setWeekOffset(p => p + 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {weekOffset !== 0 && (
              <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>היום</Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {generateMutation.isPending ? "מייצר..." : "צור לוח שבועי"}
            </Button>
            {pendingCount > 0 && (
              <Button
                className="gap-1.5"
                onClick={() => approveAllMutation.mutate()}
                disabled={approveAllMutation.isPending}
              >
                {approveAllMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                אשר הכל ({pendingCount})
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">סה"כ פריטים</p>
            <p className="text-2xl font-bold">{calendarTasks.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">ממתינים לאישור</p>
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">מאושרים</p>
            <p className="text-2xl font-bold text-emerald-600">{approvedCount}</p>
          </Card>
        </div>

        {/* Calendar Grid */}
        {calendarTasks.length === 0 && !tasksLoading ? (
          <Card className="p-12 text-center">
            <CalendarDays className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium">אין תוכן מתוכנן לשבוע זה</p>
            <p className="text-sm text-muted-foreground mt-1">לחץ "צור לוח שבועי" כדי שה-AI ייצר תוכנית תוכן מותאמת אישית</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weekDays.map((day) => {
              const items = tasksByDay[day.date] || [];
              return (
                <div key={day.date} className="space-y-2">
                  <div className="text-center py-2 rounded-lg bg-muted/50">
                    <p className="text-xs font-medium">{day.label}</p>
                    <p className="text-lg font-bold">{day.formatted}</p>
                  </div>
                  <AnimatePresence>
                    {items.map((task: any) => {
                      const payload = task.payload as any;
                      const contentType = payload?.content_type || "blog_post";
                      const conf = typeConfig[contentType] || typeConfig.blog_post;
                      const Icon = conf.icon;
                      const isPending = task.status === "pending_approval" || task.status === "draft";
                      const isApproved = task.status === "approved" || task.status === "completed";

                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <Card className={cn(
                            "p-3 text-sm space-y-2 border transition-colors",
                            isPending && "border-amber-500/30 bg-amber-500/5",
                            isApproved && "border-emerald-500/30 bg-emerald-500/5",
                            task.status === "cancelled" && "opacity-50"
                          )}>
                            <div className="flex items-center gap-1.5">
                              <Badge className={cn("text-[10px] gap-1 px-1.5", conf.color)}>
                                <Icon className="w-3 h-3" />
                                {conf.label}
                              </Badge>
                              {payload?.channel && (
                                <Badge variant="outline" className="text-[9px]">
                                  {channelLabels[payload.channel] || payload.channel}
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium text-xs leading-snug line-clamp-2" dir="auto">
                              {task.title}
                            </p>
                            {payload?.pet_context && (
                              <p className="text-[10px] text-muted-foreground line-clamp-1" dir="auto">
                                🐾 {payload.pet_context}
                              </p>
                            )}
                            {isPending && (
                              <div className="flex gap-1 pt-1">
                                <Button
                                  size="sm"
                                  className="h-6 text-[10px] px-2 gap-1"
                                  onClick={() => approveMutation.mutate({ taskId: task.id })}
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  אשר
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[10px] px-2 gap-1"
                                  onClick={() => {
                                    setEditDialog(task.id);
                                    setEditedContent(payload?.draft_content || "");
                                  }}
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[10px] px-1.5"
                                  onClick={() => rejectMutation.mutate(task.id)}
                                >
                                  <XCircle className="w-3 h-3 text-destructive" />
                                </Button>
                              </div>
                            )}
                            {isApproved && (
                              <Badge className="text-[9px] bg-emerald-500/10 text-emerald-600">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                מאושר
                              </Badge>
                            )}
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {items.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground/40">
                      <p className="text-xs">—</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Draft Dialog */}
        <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                עריכת טיוטה
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <ScrollArea className="h-[300px]">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={12}
                  className="text-sm min-h-[280px]"
                  dir="auto"
                />
              </ScrollArea>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditDialog(null)}>
                  ביטול
                </Button>
                <Button
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    if (editDialog) approveMutation.mutate({ taskId: editDialog, editedPayload: editedContent });
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

export default AdminContentCalendar;
