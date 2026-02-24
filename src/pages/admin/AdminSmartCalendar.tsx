import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfWeek, addDays } from "date-fns";
import { he } from "date-fns/locale";
import {
  Calendar as CalIcon, CheckCircle2, Eye, Send,
  MessageCircle, Mail, Smartphone, Rss
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const channelIcons: Record<string, React.ComponentType<any>> = {
  whatsapp: Smartphone, feed: Rss, email: Mail, sms: MessageCircle,
};
const channelColors: Record<string, string> = {
  whatsapp: "bg-green-500/10 text-green-700",
  feed: "bg-blue-500/10 text-blue-700",
  email: "bg-purple-500/10 text-purple-700",
  sms: "bg-orange-500/10 text-orange-700",
};

const AdminSmartCalendar = () => {
  const [preview, setPreview] = useState<any>(null);
  const queryClient = useQueryClient();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

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

  const approveAll = useMutation({
    mutationFn: async () => {
      const draftIds = items.filter((i: any) => i.status === "draft").map((i: any) => i.id);
      if (!draftIds.length) return;
      const { error } = await supabase
        .from("content_calendar")
        .update({ status: "approved", approved_at: new Date().toISOString() })
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
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-calendar-items"] });
      toast.success("תוכן אושר");
    },
  });

  const drafts = items.filter((i: any) => i.status === "draft");

  return (
    <AdminLayout title="לוח תוכן חכם — Content Calendar" icon={CalIcon}>
      <div className="space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {drafts.length} תכנים ממתינים לאישור
          </p>
          <Button
            onClick={() => approveAll.mutate()}
            disabled={approveAll.isPending || drafts.length === 0}
            className="gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            אשר הכל ({drafts.length})
          </Button>
        </div>

        {/* Weekly Grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const dayItems = items.filter(
              (i: any) => i.scheduled_for?.startsWith(dayStr)
            );
            return (
              <div key={dayStr} className="min-h-[200px]">
                <div className="text-center mb-2">
                  <p className="text-xs text-muted-foreground">
                    {format(day, "EEEE", { locale: he })}
                  </p>
                  <p className="text-sm font-bold">{format(day, "d/M")}</p>
                </div>
                <div className="space-y-1.5">
                  {dayItems.map((item: any) => {
                    const ChIcon = channelIcons[item.channel] || Rss;
                    return (
                      <Card
                        key={item.id}
                        className="p-2 cursor-pointer hover:shadow-sm transition-shadow"
                        onClick={() => setPreview(item)}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <Badge className={cn("text-[9px] gap-0.5", channelColors[item.channel])}>
                            <ChIcon className="w-2.5 h-2.5" />
                            {item.channel}
                          </Badge>
                          {item.nrc_verified && (
                            <Badge className="text-[9px] bg-emerald-500/10 text-emerald-600">NRC ✓</Badge>
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
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Preview Dialog */}
        <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{preview?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge>{preview?.channel}</Badge>
                {preview?.nrc_verified && <Badge variant="outline">NRC 2006 ✓</Badge>}
                <Badge variant="outline">{preview?.status}</Badge>
              </div>
              <ScrollArea className="h-[300px]">
                <p className="text-sm whitespace-pre-wrap" dir="auto">{preview?.content}</p>
              </ScrollArea>
              {preview?.pet_context && (
                <div className="p-3 rounded-lg bg-muted/50 text-xs">
                  <p className="font-medium mb-1">הקשר חיית מחמד:</p>
                  <pre className="text-[10px]">{JSON.stringify(preview.pet_context, null, 2)}</pre>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setPreview(null)}>
                  סגור
                </Button>
                {preview?.status === "draft" && (
                  <Button
                    className="flex-1 gap-1.5"
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
