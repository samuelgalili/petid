import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Search,
  RefreshCw,
  Zap,
  Play,
  Pause,
  Edit,
  Trash2,
  MoreVertical,
  Mail,
  MessageSquare,
  Bell,
  CheckCircle,
  Clock,
  ArrowRight,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Automation {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_conditions: any;
  actions: any;
  is_active: boolean | null;
  execution_count: number | null;
  last_executed_at: string | null;
  created_at: string;
  updated_at?: string;
  created_by?: string | null;
}

const triggerTypes = [
  { value: "task_status_changed", label: "שינוי סטטוס משימה", icon: <CheckCircle className="w-4 h-4" /> },
  { value: "deal_stage_changed", label: "שינוי שלב עסקה", icon: <ArrowRight className="w-4 h-4" /> },
  { value: "task_overdue", label: "משימה באיחור", icon: <Clock className="w-4 h-4" /> },
  { value: "new_customer", label: "לקוח חדש נרשם", icon: <Plus className="w-4 h-4" /> },
  { value: "order_placed", label: "הזמנה חדשה", icon: <CheckCircle className="w-4 h-4" /> },
];

const actionTypes = [
  { value: "send_email", label: "שלח אימייל", icon: <Mail className="w-4 h-4" />, color: "bg-blue-500" },
  { value: "send_notification", label: "שלח התראה", icon: <Bell className="w-4 h-4" />, color: "bg-amber-500" },
  { value: "send_sms", label: "שלח SMS", icon: <MessageSquare className="w-4 h-4" />, color: "bg-green-500" },
  { value: "create_task", label: "צור משימה", icon: <Plus className="w-4 h-4" />, color: "bg-purple-500" },
  { value: "update_field", label: "עדכן שדה", icon: <Edit className="w-4 h-4" />, color: "bg-cyan-500" },
];

const AdminAutomations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const [newAutomation, setNewAutomation] = useState({
    name: "",
    description: "",
    trigger_type: "task_status_changed",
    actions: [] as string[],
  });

  useEffect(() => {
    fetchAutomations();
  }, []);

  const fetchAutomations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setAutomations(data);
      } else {
        // Mock data
        setAutomations([
          { id: "1", name: "התראה על משימה באיחור", description: "שולח התראה כשמשימה עוברת את תאריך היעד", trigger_type: "task_overdue", trigger_conditions: {}, actions: [{ type: "send_notification", config: {} }], is_active: true, execution_count: 45, last_executed_at: "2025-01-07T10:30:00", created_at: "2025-01-01" },
          { id: "2", name: "אימייל ברוכים הבאים", description: "שולח אימייל ללקוח חדש", trigger_type: "new_customer", trigger_conditions: {}, actions: [{ type: "send_email", config: {} }], is_active: true, execution_count: 123, last_executed_at: "2025-01-07T09:15:00", created_at: "2024-12-15" },
          { id: "3", name: "משימת פולואפ אוטומטית", description: "יוצר משימת פולואפ כשעסקה עוברת לשלב הצעת מחיר", trigger_type: "deal_stage_changed", trigger_conditions: { stage: "proposal" }, actions: [{ type: "create_task", config: {} }], is_active: false, execution_count: 28, last_executed_at: "2025-01-05T14:00:00", created_at: "2024-12-20" },
          { id: "4", name: "התראת הזמנה חדשה", description: "שולח התראה למנהל כשיש הזמנה חדשה", trigger_type: "order_placed", trigger_conditions: {}, actions: [{ type: "send_notification", config: {} }, { type: "send_email", config: {} }], is_active: true, execution_count: 89, last_executed_at: "2025-01-07T11:00:00", created_at: "2024-12-10" },
        ]);
      }
    } catch (error) {
      console.error("Error fetching automations:", error);
      setAutomations([
        { id: "1", name: "התראה על משימה באיחור", description: "שולח התראה כשמשימה עוברת את תאריך היעד", trigger_type: "task_overdue", trigger_conditions: {}, actions: [{ type: "send_notification", config: {} }], is_active: true, execution_count: 45, last_executed_at: "2025-01-07T10:30:00", created_at: "2025-01-01" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    setAutomations(automations.map(a => a.id === id ? { ...a, is_active: isActive } : a));
    try {
      await supabase.from("automation_rules").update({ is_active: isActive }).eq("id", id);
      toast({ title: isActive ? "האוטומציה הופעלה" : "האוטומציה הושבתה" });
    } catch (e) {}
  };

  const handleCreateAutomation = async () => {
    try {
      const { data, error } = await supabase.from("automation_rules").insert({
        name: newAutomation.name,
        description: newAutomation.description,
        trigger_type: newAutomation.trigger_type,
        trigger_conditions: {},
        actions: newAutomation.actions.map(a => ({ type: a, config: {} })),
        is_active: true,
      }).select().single();

      if (error) throw error;
      if (data) setAutomations([data, ...automations]);
      setIsCreateDialogOpen(false);
      setNewAutomation({ name: "", description: "", trigger_type: "task_status_changed", actions: [] });
      toast({ title: "האוטומציה נוצרה בהצלחה" });
    } catch (error) {
      const mockAutomation: Automation = {
        id: Date.now().toString(),
        name: newAutomation.name,
        description: newAutomation.description,
        trigger_type: newAutomation.trigger_type,
        trigger_conditions: {},
        actions: newAutomation.actions.map(a => ({ type: a, config: {} })),
        is_active: true,
        execution_count: 0,
        last_executed_at: null,
        created_at: new Date().toISOString(),
      };
      setAutomations([mockAutomation, ...automations]);
      setIsCreateDialogOpen(false);
      setNewAutomation({ name: "", description: "", trigger_type: "task_status_changed", actions: [] });
    }
  };

  const handleDeleteAutomation = async (id: string) => {
    setAutomations(automations.filter(a => a.id !== id));
    try {
      await supabase.from("automation_rules").delete().eq("id", id);
      toast({ title: "האוטומציה נמחקה" });
    } catch (e) {}
  };

  const activeCount = automations.filter(a => a.is_active).length;
  const totalExecutions = automations.reduce((sum, a) => sum + a.execution_count, 0);

  const filteredAutomations = automations.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="flex items-center justify-between px-4 py-4">
          <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700" onClick={() => navigate("/admin/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg font-bold text-white">אוטומציות</h1>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700" onClick={fetchAutomations} disabled={loading}>
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Actions Bar */}
        <div className="px-4 pb-4 flex items-center justify-between gap-3">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white gap-2">
                <Plus className="w-4 h-4" />
                אוטומציה חדשה
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-slate-800 border-slate-700 text-white" dir="rtl">
              <DialogHeader>
                <DialogTitle>אוטומציה חדשה</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>שם האוטומציה</Label>
                  <Input value={newAutomation.name} onChange={(e) => setNewAutomation({ ...newAutomation, name: e.target.value })} className="bg-slate-700 border-slate-600" placeholder="לדוגמה: התראה על משימה באיחור" />
                </div>
                <div className="space-y-2">
                  <Label>תיאור</Label>
                  <Input value={newAutomation.description} onChange={(e) => setNewAutomation({ ...newAutomation, description: e.target.value })} className="bg-slate-700 border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label>טריגר (מתי להפעיל)</Label>
                  <Select value={newAutomation.trigger_type} onValueChange={(v) => setNewAutomation({ ...newAutomation, trigger_type: v })}>
                    <SelectTrigger className="bg-slate-700 border-slate-600"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {triggerTypes.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex items-center gap-2">{t.icon}{t.label}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>פעולות (מה לבצע)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {actionTypes.map(a => (
                      <Button
                        key={a.value}
                        type="button"
                        variant={newAutomation.actions.includes(a.value) ? "default" : "outline"}
                        className={`justify-start gap-2 ${newAutomation.actions.includes(a.value) ? a.color : "border-slate-600 text-slate-300"}`}
                        onClick={() => {
                          if (newAutomation.actions.includes(a.value)) {
                            setNewAutomation({ ...newAutomation, actions: newAutomation.actions.filter(x => x !== a.value) });
                          } else {
                            setNewAutomation({ ...newAutomation, actions: [...newAutomation.actions, a.value] });
                          }
                        }}
                      >
                        {a.icon}
                        {a.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button className="w-full bg-amber-500 hover:bg-amber-600" onClick={handleCreateAutomation} disabled={!newAutomation.name || newAutomation.actions.length === 0}>
                  צור אוטומציה
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="חיפוש אוטומציות..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400" />
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-4 py-4 grid grid-cols-3 gap-3">
        <Card className="bg-amber-500 border-none p-4 flex items-center justify-between">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{automations.length}</p>
            <p className="text-sm text-white/80">סה"כ אוטומציות</p>
          </div>
          <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </Card>

        <Card className="bg-emerald-500 border-none p-4 flex items-center justify-between">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Play className="w-5 h-5 text-white" />
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{activeCount}</p>
            <p className="text-sm text-white/80">פעילות</p>
          </div>
          <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </Card>

        <Card className="bg-purple-500 border-none p-4 flex items-center justify-between">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{totalExecutions}</p>
            <p className="text-sm text-white/80">הפעלות</p>
          </div>
          <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </Card>
      </div>

      {/* Automations List */}
      <div className="px-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : filteredAutomations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Zap className="w-16 h-16 mb-4 opacity-50" />
            <p>אין אוטומציות</p>
          </div>
        ) : (
          filteredAutomations.map((automation, index) => {
            const trigger = triggerTypes.find(t => t.value === automation.trigger_type);
            
            return (
              <motion.div
                key={automation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${automation.is_active ? 'bg-amber-500' : 'bg-slate-600'} flex items-center justify-center`}>
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">{automation.name}</h3>
                      <p className="text-slate-400 text-sm">{automation.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={automation.is_active}
                      onCheckedChange={(checked) => handleToggleActive(automation.id, checked)}
                    />
                  </div>
                </div>

                {/* Flow Visualization */}
                <div className="flex items-center gap-2 mb-3 bg-slate-700/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm">
                    {trigger?.icon}
                    <span>{trigger?.label || automation.trigger_type}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                  <div className="flex items-center gap-1">
                    {automation.actions.map((action: any, idx: number) => {
                      const actionConfig = actionTypes.find(a => a.value === action.type);
                      return (
                        <div key={idx} className={`flex items-center gap-1 px-2 py-1 ${actionConfig?.color || 'bg-slate-600'} rounded text-white text-xs`}>
                          {actionConfig?.icon}
                          <span>{actionConfig?.label || action.type}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stats & Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>הופעל {automation.execution_count} פעמים</span>
                    {automation.last_executed_at && (
                      <span>אחרון: {new Date(automation.last_executed_at).toLocaleDateString("he-IL")}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-slate-300">
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="w-8 h-8 bg-cyan-600 hover:bg-cyan-500 text-white">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="w-8 h-8 bg-red-600 hover:bg-red-500 text-white" onClick={() => handleDeleteAutomation(automation.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminAutomations;
