import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfWeek, addDays, isMonday, isWednesday, isFriday } from "date-fns";
import { he } from "date-fns/locale";
import {
  Calendar as CalIcon, CheckCircle2, Send, Loader2,
  MessageCircle, Mail, Smartphone, Rss, ShieldCheck,
  BookOpen, Users, ShoppingBag, BarChart3, Sparkles,
  MousePointerClick, Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

/* ─── Constants ─── */
const channelIcons: Record<string, React.ComponentType<any>> = {
  whatsapp: Smartphone, feed: Rss, email: Mail, sms: MessageCircle, push: Send,
};
const channelColors: Record<string, string> = {
  whatsapp: "bg-green-500/10 text-green-700",
  feed: "bg-blue-500/10 text-blue-700",
  email: "bg-purple-500/10 text-purple-700",
  sms: "bg-orange-500/10 text-orange-700",
  push: "bg-rose-500/10 text-rose-700",
};

const GANTT_DAY_LABELS: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = {
  "1": { label: "חינוכי (NRC)", icon: BookOpen, color: "text-emerald-600" },
  "3": { label: "סושיאל (סטורי)", icon: Users, color: "text-blue-600" },
  "5": { label: "מסחרי (מבצע)", icon: ShoppingBag, color: "text-amber-600" },
};

/* ─── Main Component ─── */
const AdminSmartCalendar = () => {
  const [preview, setPreview] = useState<any>(null);
  const [editCaption, setEditCaption] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  /* ─── Queries ─── */
  const { data: items = [] } = useQuery({
    queryKey: ["content-calendar-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_calendar")
        .select("*, automation_bots(name, icon, color)")
        .order("scheduled_for");
      if (error) throw error;
      return data || [];
    },
  });

  /* ─── Mutations ─── */
  const approveAll = useMutation({
    mutationFn: async () => {
      const draftIds = items.filter((i: any) => i.status === "draft").map((i: any) => i.id);
      if (!draftIds.length) return;
      const { error } = await supabase
        .from("content_calendar")
        .update({ status: "approved", approved_at: new Date().toISOString(), compliance_status: "approved" } as any)
        .in("id", draftIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-calendar-items"] });
      toast.success("✅ כל התכנים אושרו לפרסום");
    },
  });

  const approveOne = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("content_calendar")
        .update({ status: "approved", approved_at: new Date().toISOString(), compliance_status: "approved" } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-calendar-items"] });
      toast.success("תוכן אושר");
    },
  });

  const updateCaption = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from("content_calendar")
        .update({ content } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-calendar-items"] });
      toast.success("הכיתוב עודכן");
    },
  });

  const generateWeek = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("content-calendar", {
        body: { week_start: format(weekStart, "yyyy-MM-dd") },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["content-calendar-items"] });
      toast.success(`🎨 לומי יצרה ${data.total_items} פריטי תוכן לשבוע`);
    } catch (err: any) {
      toast.error(err.message || "שגיאה ביצירת לוח תוכן");
    } finally {
      setIsGenerating(false);
    }
  };

  const drafts = items.filter((i: any) => i.status === "draft");
  const approved = items.filter((i: any) => i.status === "approved");
  const published = items.filter((i: any) => i.status === "published");
  const totalClicks = items.reduce((sum: number, i: any) => sum + ((i as any).link_clicks || 0), 0);
  const totalLeads = items.reduce((sum: number, i: any) => sum + ((i as any).leads_generated || 0), 0);

  return (
    <AdminLayout title="לומי — Content Calendar" icon={CalIcon}>
      <div className="space-y-6">
        {/* ═══ KPI Bar ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "טיוטות", value: drafts.length, color: "text-amber-600", icon: Sparkles },
            { label: "מאושרים", value: approved.length, color: "text-emerald-600", icon: CheckCircle2 },
            { label: "פורסמו", value: published.length, color: "text-blue-600", icon: Send },
            { label: "קליקים", value: totalClicks, color: "text-purple-600", icon: MousePointerClick },
            { label: "לידים", value: totalLeads, color: "text-rose-600", icon: Target },
          ].map((kpi) => (
            <Card key={kpi.label} className="p-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <kpi.icon className={cn("w-4 h-4", kpi.color)} strokeWidth={1.5} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className={cn("text-2xl font-bold mt-1", kpi.color)}>{kpi.value}</p>
            </Card>
          ))}
        </div>

        {/* ═══ Actions ═══ */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">
            {drafts.length} תכנים ממתינים לאישור
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={generateWeek}
              disabled={isGenerating}
              className="gap-1.5 rounded-xl"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGenerating ? "לומי יוצרת..." : "צור שבוע חדש"}
            </Button>
            <Button
              onClick={() => approveAll.mutate()}
              disabled={approveAll.isPending || drafts.length === 0}
              className="gap-1.5 rounded-xl"
            >
              <CheckCircle2 className="w-4 h-4" />
              אשר הכל ({drafts.length})
            </Button>
          </div>
        </div>

        {/* ═══ Weekly Grid with Gantt Labels ═══ */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const dayOfWeek = day.getDay().toString();
            const ganttInfo = GANTT_DAY_LABELS[dayOfWeek];
            const dayItems = items.filter((i: any) => i.scheduled_for?.startsWith(dayStr));

            return (
              <div key={dayStr} className="min-h-[220px]">
                <div className="text-center mb-2">
                  <p className="text-xs text-muted-foreground">
                    {format(day, "EEEE", { locale: he })}
                  </p>
                  <p className="text-sm font-bold">{format(day, "d/M")}</p>
                  {ganttInfo && (
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <ganttInfo.icon className={cn("w-3 h-3", ganttInfo.color)} />
                      <span className={cn("text-[9px] font-medium", ganttInfo.color)}>
                        {ganttInfo.label}
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  {dayItems.map((item: any) => {
                    const ChIcon = channelIcons[item.channel] || Rss;
                    const complianceOk = (item as any).consent_verified || (item as any).compliance_status === "approved";
                    return (
                      <Card
                        key={item.id}
                        className="p-2 cursor-pointer hover:shadow-sm transition-shadow rounded-xl"
                        onClick={() => {
                          setPreview(item);
                          setEditCaption(item.content || "");
                        }}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <Badge className={cn("text-[9px] gap-0.5", channelColors[item.channel])}>
                            <ChIcon className="w-2.5 h-2.5" />
                            {item.channel}
                          </Badge>
                          {item.nrc_verified && (
                            <Badge className="text-[9px] bg-emerald-500/10 text-emerald-600">NRC ✓</Badge>
                          )}
                          {complianceOk && (
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                          )}
                        </div>
                        <p className="text-[11px] font-medium line-clamp-2">{item.title}</p>
                        <div className="flex items-center justify-between mt-1">
                          <Badge
                            className={cn(
                              "text-[9px]",
                              item.status === "approved"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : item.status === "published"
                                ? "bg-blue-500/10 text-blue-600"
                                : "bg-amber-500/10 text-amber-600"
                            )}
                          >
                            {item.status === "approved" ? "מאושר" : item.status === "published" ? "פורסם" : "טיוטה"}
                          </Badge>
                          {(item as any).link_clicks > 0 && (
                            <span className="text-[9px] text-muted-foreground">
                              {(item as any).link_clicks} 👆
                            </span>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══ Preview + Edit Dialog ═══ */}
        <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
          <DialogContent dir="rtl" className="max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {preview?.title}
                {(preview as any)?.compliance_status === "approved" && (
                  <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 gap-1">
                    <ShieldCheck className="w-3 h-3" /> Compliance ✓
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge>{preview?.channel}</Badge>
                {preview?.nrc_verified && <Badge variant="outline">NRC 2006 ✓</Badge>}
                <Badge variant="outline">{preview?.status}</Badge>
                {(preview as any)?.lumi_category && (
                  <Badge variant="outline" className="text-primary">
                    {(preview as any).lumi_category}
                  </Badge>
                )}
              </div>

              {/* Editable Caption */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">כיתוב (ניתן לעריכה):</p>
                <Textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="text-sm min-h-[120px] rounded-xl"
                  dir="auto"
                />
              </div>

              {/* Performance Stats */}
              {((preview as any)?.link_clicks > 0 || (preview as any)?.leads_generated > 0) && (
                <Card className="p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold">ביצועים</span>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <p className="text-lg font-bold text-primary">{(preview as any)?.link_clicks || 0}</p>
                      <p className="text-[10px] text-muted-foreground">קליקים</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-rose-600">{(preview as any)?.leads_generated || 0}</p>
                      <p className="text-[10px] text-muted-foreground">לידים</p>
                    </div>
                  </div>
                </Card>
              )}

              {preview?.pet_context && (
                <div className="p-3 rounded-xl bg-muted/50 text-xs">
                  <p className="font-medium mb-1">הקשר חיית מחמד:</p>
                  <pre className="text-[10px]">{JSON.stringify(preview.pet_context, null, 2)}</pre>
                </div>
              )}

              {/* Unsubscribe footer reminder */}
              {(preview?.channel === "whatsapp" || preview?.channel === "sms") && (
                <div className="p-2 rounded-lg bg-amber-500/10 text-[10px] text-amber-700 text-center">
                  ⚠️ כל הודעה חייבת לכלול: "להסרה השב הסר"
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setPreview(null)}>
                  סגור
                </Button>
                {editCaption !== (preview?.content || "") && (
                  <Button
                    variant="secondary"
                    className="flex-1 rounded-xl gap-1.5"
                    onClick={() => {
                      updateCaption.mutate({ id: preview.id, content: editCaption });
                    }}
                  >
                    שמור עריכה
                  </Button>
                )}
                {preview?.status === "draft" && (
                  <Button
                    className="flex-1 gap-1.5 rounded-xl"
                    onClick={() => {
                      approveOne.mutate(preview.id);
                      setPreview(null);
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4" /> אשר לפרסום
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminSmartCalendar;
