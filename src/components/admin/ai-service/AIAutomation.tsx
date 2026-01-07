import { useState } from "react";
import { motion } from "framer-motion";
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Settings,
  Trash2,
  Copy,
  Edit,
  ArrowRight,
  MessageSquare,
  Clock,
  Users,
  Filter,
  Zap,
  Target,
  CheckCircle2,
  XCircle,
  GitBranch
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AdminToolbar, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminStyles";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const automationFlows = [
  {
    id: 1,
    name: "ברכת לקוח חדש",
    description: "שליחת הודעת ברוכים הבאים ללקוחות חדשים",
    trigger: "לקוח חדש נרשם",
    status: "active",
    executions: 1245,
    successRate: 98.5,
    lastRun: "לפני 5 דקות"
  },
  {
    id: 2,
    name: "מענה אוטומטי - שעות פעילות",
    description: "מענה לשאלות על שעות פעילות",
    trigger: "מילות מפתח: שעות, פתוח, סגור",
    status: "active",
    executions: 3421,
    successRate: 99.2,
    lastRun: "לפני 2 דקות"
  },
  {
    id: 3,
    name: "העברה לנציג - תלונה",
    description: "העברה אוטומטית לנציג כשמזוהה תלונה",
    trigger: "זיהוי סנטימנט שלילי",
    status: "active",
    executions: 287,
    successRate: 95.8,
    lastRun: "לפני 15 דקות"
  },
  {
    id: 4,
    name: "תזכורת עגלה נטושה",
    description: "שליחת תזכורת ללקוחות עם עגלה נטושה",
    trigger: "עגלה נטושה 24 שעות",
    status: "paused",
    executions: 892,
    successRate: 42.3,
    lastRun: "לפני יום"
  },
  {
    id: 5,
    name: "איסוף ליד",
    description: "איסוף פרטי התקשרות מלקוחות מתעניינים",
    trigger: "שאלה על מחירים / מבצעים",
    status: "active",
    executions: 567,
    successRate: 78.4,
    lastRun: "לפני 8 דקות"
  },
];

const flowTemplates = [
  { id: 1, name: "ברכת לקוח חדש", icon: Users, category: "התחלה" },
  { id: 2, name: "מענה FAQ", icon: MessageSquare, category: "שירות" },
  { id: 3, name: "העברה לנציג", icon: ArrowRight, category: "אסקלציה" },
  { id: 4, name: "איסוף ליד", icon: Target, category: "שיווק" },
  { id: 5, name: "תזכורת", icon: Clock, category: "אוטומציה" },
  { id: 6, name: "סקר שביעות רצון", icon: CheckCircle2, category: "משוב" },
];

const AIAutomation = () => {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [flows, setFlows] = useState(automationFlows);

  const toggleFlowStatus = (id: number) => {
    setFlows(flows.map(flow => 
      flow.id === id 
        ? { ...flow, status: flow.status === "active" ? "paused" : "active" }
        : flow
    ));
  };

  const filteredFlows = flows.filter(flow =>
    flow.name.includes(search) || flow.description.includes(search)
  );

  return (
    <div className="space-y-6">
      <AdminToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="חיפוש תהליכים..."
        onAdd={() => setIsCreateOpen(true)}
        addLabel="תהליך חדש"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">תהליכים פעילים</p>
                <p className="text-2xl font-bold">{flows.filter(f => f.status === "active").length}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <Play className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">הפעלות היום</p>
                <p className="text-2xl font-bold">2,847</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <Zap className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">אחוז הצלחה</p>
                <p className="text-2xl font-bold">94.2%</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">מושהים</p>
                <p className="text-2xl font-bold">{flows.filter(f => f.status === "paused").length}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10">
                <Pause className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flows List */}
      <div className="space-y-4">
        {filteredFlows.map((flow, index) => (
          <motion.div
            key={flow.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className={cn(
              "transition-all hover:shadow-md",
              flow.status === "paused" && "opacity-60"
            )}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={cn(
                    "p-3 rounded-xl shrink-0",
                    flow.status === "active" 
                      ? "bg-primary/10 text-primary" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    <Workflow className="w-6 h-6" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{flow.name}</h3>
                      <AdminStatusBadge 
                        status={flow.status === "active" ? "active" : "inactive"}
                        label={flow.status === "active" ? "פעיל" : "מושהה"}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{flow.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        טריגר: {flow.trigger}
                      </span>
                      <span>|</span>
                      <span>{flow.executions.toLocaleString()} הפעלות</span>
                      <span>|</span>
                      <span className={flow.successRate > 90 ? "text-emerald-500" : "text-amber-500"}>
                        {flow.successRate}% הצלחה
                      </span>
                      <span>|</span>
                      <span>{flow.lastRun}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={flow.status === "active"}
                      onCheckedChange={() => toggleFlowStatus(flow.id)}
                    />
                    <Button variant="ghost" size="icon">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Create Flow Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>יצירת תהליך חדש</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Templates */}
            <div>
              <Label className="text-sm text-muted-foreground mb-3 block">בחר תבנית או התחל מאפס</Label>
              <div className="grid grid-cols-3 gap-3">
                {flowTemplates.map((template) => (
                  <Card 
                    key={template.id}
                    className="cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    <CardContent className="p-4 text-center">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <template.icon className="w-5 h-5 text-primary" />
                      </div>
                      <p className="font-medium text-sm">{template.name}</p>
                      <p className="text-xs text-muted-foreground">{template.category}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <div className="space-y-2">
                <Label>שם התהליך</Label>
                <Input placeholder="לדוגמה: מענה אוטומטי למחירים" />
              </div>
              
              <div className="space-y-2">
                <Label>תיאור</Label>
                <Textarea placeholder="תאר את מטרת התהליך..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>טריגר</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר טריגר" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="message">הודעה חדשה</SelectItem>
                      <SelectItem value="keyword">מילת מפתח</SelectItem>
                      <SelectItem value="sentiment">זיהוי סנטימנט</SelectItem>
                      <SelectItem value="time">תזמון</SelectItem>
                      <SelectItem value="event">אירוע</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>פעולה</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר פעולה" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reply">שלח תשובה</SelectItem>
                      <SelectItem value="handoff">העבר לנציג</SelectItem>
                      <SelectItem value="tag">הוסף תגית</SelectItem>
                      <SelectItem value="notify">שלח התראה</SelectItem>
                      <SelectItem value="collect">אסוף פרטים</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              ביטול
            </Button>
            <Button className="gap-2">
              <GitBranch className="w-4 h-4" />
              צור תהליך
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIAutomation;
