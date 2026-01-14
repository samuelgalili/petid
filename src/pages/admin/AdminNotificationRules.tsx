import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw,
  Bell,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  Zap,
  Settings,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface NotificationRule {
  id: string;
  name: string;
  description: string;
  event_type: string;
  channels: string[];
  is_active: boolean;
  conditions: any;
  template: {
    title: string;
    body: string;
  };
  created_at: string;
  trigger_count: number;
}

interface NotificationLog {
  id: string;
  rule_id: string;
  rule_name: string;
  channel: string;
  recipient: string;
  status: "sent" | "failed" | "pending";
  sent_at: string;
  message: string;
}

const eventTypes = [
  { value: "new_order", label: "הזמנה חדשה" },
  { value: "order_shipped", label: "הזמנה נשלחה" },
  { value: "low_stock", label: "מלאי נמוך" },
  { value: "new_user", label: "משתמש חדש" },
  { value: "new_message", label: "הודעה חדשה" },
  { value: "task_overdue", label: "משימה באיחור" },
  { value: "review_submitted", label: "ביקורת חדשה" },
  { value: "payment_failed", label: "תשלום נכשל" },
];

const channelIcons: Record<string, any> = {
  push: Smartphone,
  email: Mail,
  sms: MessageSquare,
};

const AdminNotificationRules = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("rules");
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  const [newRule, setNewRule] = useState({
    name: "",
    description: "",
    event_type: "new_order",
    channels: ["push"] as string[],
    template_title: "",
    template_body: "",
  });

  const { data: rulesData } = useQuery({
    queryKey: ['notification-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: logsData } = useQuery({
    queryKey: ['notification-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    }
  });

  useEffect(() => {
    if (rulesData) {
      setRules(rulesData.map((r: any) => ({
        id: r.id,
        name: r.name || r.template_key,
        description: r.description || '',
        event_type: r.trigger_event || 'new_order',
        channels: r.channels || ['push'],
        is_active: r.is_active ?? true,
        conditions: r.conditions || {},
        template: { title: r.title_template || '', body: r.body_template || '' },
        created_at: r.created_at,
        trigger_count: 0,
      })));
    }
  }, [rulesData]);

  useEffect(() => {
    if (logsData) {
      setLogs(logsData.map((l: any) => ({
        id: l.id,
        rule_id: l.related_id || '',
        rule_name: l.title || 'התראה',
        channel: l.type || 'push',
        recipient: l.user_id || '',
        status: l.is_read ? 'sent' : 'pending',
        sent_at: l.created_at,
        message: l.message || '',
      })));
    }
  }, [logsData]);

  const handleToggleRule = (id: string, isActive: boolean) => {
    setRules(rules.map((r) => (r.id === id ? { ...r, is_active: isActive } : r)));
    toast({ title: isActive ? "הכלל הופעל" : "הכלל הושבת" });
  };

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
    toast({ title: "הכלל נמחק" });
  };

  const handleCreateRule = () => {
    const rule: NotificationRule = {
      id: Date.now().toString(),
      name: newRule.name,
      description: newRule.description,
      event_type: newRule.event_type,
      channels: newRule.channels,
      is_active: true,
      conditions: {},
      template: { title: newRule.template_title, body: newRule.template_body },
      created_at: new Date().toISOString(),
      trigger_count: 0,
    };
    setRules([rule, ...rules]);
    setIsCreateOpen(false);
    setNewRule({ name: "", description: "", event_type: "new_order", channels: ["push"], template_title: "", template_body: "" });
    toast({ title: "הכלל נוצר בהצלחה" });
  };

  const activeRules = rules.filter((r) => r.is_active).length;
  const totalTriggers = rules.reduce((sum, r) => sum + r.trigger_count, 0);

  return (
    <AdminLayout title="כללי התראות" icon={Bell} breadcrumbs={[{ label: "התראות" }]}>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{rules.length}</p>
              <p className="text-sm opacity-80">סה"כ כללים</p>
            </div>
            <Bell className="w-8 h-8 opacity-60" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-emerald-500 to-teal-500 text-white border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{activeRules}</p>
              <p className="text-sm opacity-80">פעילים</p>
            </div>
            <Play className="w-8 h-8 opacity-60" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-500 to-orange-500 text-white border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{totalTriggers}</p>
              <p className="text-sm opacity-80">הפעלות</p>
            </div>
            <Zap className="w-8 h-8 opacity-60" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-rose-500 to-pink-500 text-white border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{logs.filter((l) => l.status === "failed").length}</p>
              <p className="text-sm opacity-80">נכשלו</p>
            </div>
            <Clock className="w-8 h-8 opacity-60" />
          </div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="rules">כללי התראות</TabsTrigger>
            <TabsTrigger value="logs">יומן התראות</TabsTrigger>
          </TabsList>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                כלל חדש
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" dir="rtl">
              <DialogHeader>
                <DialogTitle>יצירת כלל התראה</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>שם הכלל</Label>
                  <Input
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    placeholder="לדוגמה: התראה על הזמנה חדשה"
                  />
                </div>
                <div className="space-y-2">
                  <Label>תיאור</Label>
                  <Input
                    value={newRule.description}
                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>אירוע מפעיל</Label>
                  <Select value={newRule.event_type} onValueChange={(v) => setNewRule({ ...newRule, event_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {eventTypes.map((e) => (
                        <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ערוצי שליחה</Label>
                  <div className="flex gap-2">
                    {["push", "email", "sms"].map((channel) => {
                      const Icon = channelIcons[channel];
                      const isSelected = newRule.channels.includes(channel);
                      return (
                        <Button
                          key={channel}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            if (isSelected) {
                              setNewRule({ ...newRule, channels: newRule.channels.filter((c) => c !== channel) });
                            } else {
                              setNewRule({ ...newRule, channels: [...newRule.channels, channel] });
                            }
                          }}
                          className="gap-2"
                        >
                          <Icon className="w-4 h-4" />
                          {channel === "push" ? "Push" : channel === "email" ? "אימייל" : "SMS"}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>כותרת ההתראה</Label>
                  <Input
                    value={newRule.template_title}
                    onChange={(e) => setNewRule({ ...newRule, template_title: e.target.value })}
                    placeholder="לדוגמה: הזמנה חדשה!"
                  />
                </div>
                <div className="space-y-2">
                  <Label>תוכן ההתראה</Label>
                  <Textarea
                    value={newRule.template_body}
                    onChange={(e) => setNewRule({ ...newRule, template_body: e.target.value })}
                    placeholder="השתמש ב-{{variable}} לערכים דינמיים"
                    rows={3}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateRule}
                  disabled={!newRule.name || newRule.channels.length === 0}
                >
                  צור כלל
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-3">
          {rules.map((rule, index) => {
            const eventLabel = eventTypes.find((e) => e.value === rule.event_type)?.label || rule.event_type;

            return (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Collapsible
                  open={expandedRule === rule.id}
                  onOpenChange={(open) => setExpandedRule(open ? rule.id : null)}
                >
                  <Card className="overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${rule.is_active ? "bg-primary/10" : "bg-muted"} flex items-center justify-center`}>
                              <Bell className={`w-5 h-5 ${rule.is_active ? "text-primary" : "text-muted-foreground"}`} />
                            </div>
                            <div>
                              <h3 className="font-bold">{rule.name}</h3>
                              <p className="text-sm text-muted-foreground">{rule.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                              {rule.channels.map((ch) => {
                                const Icon = channelIcons[ch];
                                return (
                                  <div key={ch} className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                                    <Icon className="w-3 h-3" />
                                  </div>
                                );
                              })}
                            </div>
                            <Badge variant="secondary">{rule.trigger_count} הפעלות</Badge>
                            <Switch
                              checked={rule.is_active}
                              onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <ChevronDown className={`w-4 h-4 transition-transform ${expandedRule === rule.id ? "rotate-180" : ""}`} />
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-4 pb-4 pt-0 border-t">
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">אירוע מפעיל</p>
                            <p className="font-medium">{eventLabel}</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">נוצר בתאריך</p>
                            <p className="font-medium">
                              {format(new Date(rule.created_at), "dd/MM/yyyy", { locale: he })}
                            </p>
                          </div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg mt-3">
                          <p className="text-sm text-muted-foreground mb-1">תבנית הודעה</p>
                          <p className="font-medium">{rule.template.title}</p>
                          <p className="text-sm text-muted-foreground">{rule.template.body}</p>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" size="sm" className="gap-2">
                            <Edit className="w-4 h-4" />
                            ערוך
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                            מחק
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </motion.div>
            );
          })}
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-3">
          {logs.map((log, index) => {
            const Icon = channelIcons[log.channel] || Bell;

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${log.status === "sent" ? "bg-emerald-500/10" : log.status === "failed" ? "bg-destructive/10" : "bg-amber-500/10"} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${log.status === "sent" ? "text-emerald-500" : log.status === "failed" ? "text-destructive" : "text-amber-500"}`} />
                      </div>
                      <div>
                        <h4 className="font-medium">{log.rule_name}</h4>
                        <p className="text-sm text-muted-foreground">{log.message}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <Badge variant={log.status === "sent" ? "default" : log.status === "failed" ? "destructive" : "secondary"}>
                        {log.status === "sent" ? "נשלח" : log.status === "failed" ? "נכשל" : "ממתין"}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(log.sent_at), "HH:mm dd/MM", { locale: he })}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminNotificationRules;
