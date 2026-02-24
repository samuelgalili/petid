import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, CheckCircle2, XCircle, Clock, AlertTriangle,
  Edit3, Bot, Brain, Megaphone, Target, MessageCircle,
  Store, Headphones, Stethoscope, Scale, Sparkles, FlaskConical
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<any>> = {
  brain: Brain, megaphone: Megaphone, target: Target,
  "message-circle": MessageCircle, store: Store,
  headphones: Headphones, stethoscope: Stethoscope, scale: Scale,
  bot: FlaskConical, sparkles: Sparkles,
};

const colorMap: Record<string, string> = {
  purple: "from-purple-500 to-purple-600", pink: "from-pink-500 to-pink-600",
  cyan: "from-cyan-500 to-cyan-600", orange: "from-orange-500 to-orange-600",
  green: "from-green-500 to-green-600", blue: "from-blue-500 to-blue-600",
  amber: "from-amber-500 to-amber-600", emerald: "from-emerald-500 to-emerald-600",
  indigo: "from-indigo-500 to-indigo-600", violet: "from-violet-500 to-violet-600",
};

const AdminActionCenter = () => {
  const [editDialog, setEditDialog] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const queryClient = useQueryClient();

  const { data: pendingItems = [] } = useQuery({
    queryKey: ["action-center-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_approval_queue")
        .select("*, automation_bots(*)")
        .eq("status", "pending_review")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000,
  });

  const { data: recentItems = [] } = useQuery({
    queryKey: ["action-center-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_approval_queue")
        .select("*, automation_bots(*)")
        .in("status", ["approved", "rejected"])
        .order("reviewed_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, editedDraft }: { id: string; editedDraft?: string }) => {
      const updates: any = {
        status: "approved",
        reviewed_at: new Date().toISOString(),
      };
      if (editedDraft) updates.draft_content = editedDraft;
      const { error } = await supabase.from("admin_approval_queue").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-center-pending"] });
      queryClient.invalidateQueries({ queryKey: ["action-center-history"] });
      toast.success("✅ פעולה אושרה");
      setEditDialog(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("admin_approval_queue")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-center-pending"] });
      queryClient.invalidateQueries({ queryKey: ["action-center-history"] });
      toast.success("פעולה נדחתה");
    },
  });

  return (
    <AdminLayout title="Action Center — תור אישורים" icon={ShieldCheck}>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">{pendingItems.length}</p>
            <p className="text-xs text-muted-foreground">ממתינים לאישור</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {recentItems.filter((i: any) => i.status === "approved").length}
            </p>
            <p className="text-xs text-muted-foreground">אושרו היום</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {recentItems.filter((i: any) => i.status === "rejected").length}
            </p>
            <p className="text-xs text-muted-foreground">נדחו</p>
          </Card>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" className="gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              ממתינים ({pendingItems.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              היסטוריה
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {pendingItems.length === 0 ? (
              <Card className="p-12 text-center">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-emerald-500/40" />
                <p className="text-lg font-medium">אין פעולות ממתינות</p>
                <p className="text-sm text-muted-foreground mt-1">כל הפריטים אושרו</p>
              </Card>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {pendingItems.map((item: any) => {
                    const bot = item.automation_bots;
                    const Icon = bot ? iconMap[bot.icon] || Bot : Bot;
                    const changes = item.proposed_changes as Record<string, any> | null;

                    return (
                      <motion.div
                        key={item.id}
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
                                <h3 className="font-medium">{item.title}</h3>
                                {item.pet_name && (
                                  <Badge variant="outline" className="text-[10px]">
                                    🐾 {item.pet_name}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-[10px]">
                                  {item.category}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{bot?.name}</p>

                              {item.description && (
                                <p className="text-sm mt-2">{item.description}</p>
                              )}

                              {/* AI Draft */}
                              {item.draft_content && (
                                <div className="mt-3 p-3 rounded-lg bg-background border border-border/50">
                                  <span className="text-xs font-medium text-primary">טיוטת AI</span>
                                  <p className="text-sm mt-1 whitespace-pre-wrap" dir="auto">
                                    {item.draft_content}
                                  </p>
                                </div>
                              )}

                              {/* Proposed Changes */}
                              {changes && Object.keys(changes).length > 0 && (
                                <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/30">
                                  <span className="text-xs font-medium">שינויים מוצעים:</span>
                                  <div className="mt-1 space-y-1">
                                    {Object.entries(changes).map(([key, val]) => (
                                      <div key={key} className="text-xs flex gap-2">
                                        <span className="font-medium text-muted-foreground">{key}:</span>
                                        <span dir="auto">{String(val)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-2 mt-4">
                                <Button
                                  size="sm"
                                  className="gap-1.5"
                                  onClick={() => approveMutation.mutate({ id: item.id })}
                                  disabled={approveMutation.isPending}
                                >
                                  <CheckCircle2 className="w-4 h-4" /> אשר
                                </Button>
                                {item.draft_content && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5"
                                    onClick={() => {
                                      setEditDialog(item.id);
                                      setEditedContent(item.draft_content);
                                    }}
                                  >
                                    <Edit3 className="w-4 h-4" /> ערוך
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="gap-1.5"
                                  onClick={() => rejectMutation.mutate(item.id)}
                                  disabled={rejectMutation.isPending}
                                >
                                  <XCircle className="w-4 h-4" /> דחה
                                </Button>
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {new Date(item.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                            </span>
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
                {recentItems.map((item: any) => {
                  const bot = item.automation_bots;
                  const Icon = bot ? iconMap[bot.icon] || Bot : Bot;
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                      <div className={cn(
                        "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0",
                        bot ? colorMap[bot.color] : "from-gray-500 to-gray-600"
                      )}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{bot?.name}</p>
                      </div>
                      <Badge className={cn(
                        "text-[10px]",
                        item.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-red-500/10 text-red-600"
                      )}>
                        {item.status === "approved" ? "אושר" : "נדחה"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit3 className="w-5 h-5" /> עריכת טיוטה
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={6}
                dir="auto"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditDialog(null)}>
                  ביטול
                </Button>
                <Button
                  className="flex-1 gap-1.5"
                  onClick={() => editDialog && approveMutation.mutate({ id: editDialog, editedDraft: editedContent })}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle2 className="w-4 h-4" /> אשר ושלח
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminActionCenter;
