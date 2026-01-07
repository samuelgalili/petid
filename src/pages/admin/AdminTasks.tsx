import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Calendar,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  Mail,
  MessageSquare,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  ListTodo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  rating: number | null;
  tags: string[] | null;
  created_at: string;
  assignee_name?: string;
  assignee_avatar?: string;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  todo: { label: "בהתחלה", color: "text-slate-100", bgColor: "bg-slate-600", icon: <ListTodo className="w-4 h-4" /> },
  in_progress: { label: "בתהליך", color: "text-amber-100", bgColor: "bg-amber-500", icon: <Clock className="w-4 h-4" /> },
  review: { label: "בבדיקה", color: "text-purple-100", bgColor: "bg-purple-500", icon: <Eye className="w-4 h-4" /> },
  done: { label: "הסתיים", color: "text-emerald-100", bgColor: "bg-emerald-500", icon: <CheckCircle className="w-4 h-4" /> },
};

const priorityConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  low: { label: "לא דחוף", color: "text-slate-300", bgColor: "bg-slate-700", borderColor: "border-slate-500" },
  medium: { label: "בינוני", color: "text-blue-300", bgColor: "bg-blue-900/50", borderColor: "border-blue-500" },
  high: { label: "דחוף", color: "text-orange-300", bgColor: "bg-orange-900/50", borderColor: "border-orange-500" },
  urgent: { label: "דחוף מאוד", color: "text-red-300", bgColor: "bg-red-900/50", borderColor: "border-red-500" },
};

const AdminTasks = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
    assigned_to: "",
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("admin_tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setTasks(data.map(task => ({
          ...task,
          assignee_name: task.assigned_to ? "יצחק נחמד" : undefined,
        })));
      } else {
        // Mock data for demo
        setTasks([
          { id: "1", title: "שיחת פולאואפ על הצעת מחיר", description: "התקשרות לבירור הצעת מחיר", status: "todo", priority: "urgent", assigned_to: "1", due_date: "2025-11-28", rating: null, tags: ["מכירות"], created_at: "2025-11-24", assignee_name: "יצחק נחמד" },
          { id: "2", title: "הקמת שרת ראשוני", description: "הקמה והתקנה של שרת", status: "in_progress", priority: "urgent", assigned_to: "1", due_date: "2025-11-22", rating: null, tags: ["טכני"], created_at: "2025-11-20", assignee_name: "יצחק נחמד" },
          { id: "3", title: "gfgdg", description: "", status: "done", priority: "medium", assigned_to: "2", due_date: "2025-11-18", rating: null, tags: [], created_at: "2025-11-14", assignee_name: "לאה רובינסון" },
          { id: "4", title: "משימה חשובה", description: "תיאור משימה", status: "todo", priority: "urgent", assigned_to: "3", due_date: "2025-10-31", rating: null, tags: [], created_at: "2025-10-29", assignee_name: "לילך יצחק" },
          { id: "5", title: "משימה חשובה ביותר", description: "תיאור", status: "todo", priority: "low", assigned_to: "3", due_date: "2025-10-13", rating: null, tags: [], created_at: "2025-10-08", assignee_name: "לילך יצחק" },
          { id: "6", title: "Dummy tasks", description: "Test", status: "done", priority: "medium", assigned_to: "4", due_date: "2025-09-12", rating: null, tags: [], created_at: "2025-09-07", assignee_name: "יצחק דויד" },
        ]);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTasksByStatus = (status: string) => tasks.filter((task) => task.status === status);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from("admin_tasks").update({ status: newStatus }).eq("id", taskId);
      if (error) throw error;
      setTasks(tasks.map(task => task.id === taskId ? { ...task, status: newStatus } : task));
      toast({ title: "עודכן בהצלחה" });
    } catch (error) {
      setTasks(tasks.map(task => task.id === taskId ? { ...task, status: newStatus } : task));
    }
  };

  const handleCreateTask = async () => {
    try {
      const { data, error } = await supabase.from("admin_tasks").insert({
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        due_date: newTask.due_date || null,
        status: "todo",
      }).select().single();

      if (error) throw error;
      if (data) setTasks([data, ...tasks]);
      setIsCreateDialogOpen(false);
      setNewTask({ title: "", description: "", priority: "medium", due_date: "", assigned_to: "" });
      toast({ title: "המשימה נוצרה בהצלחה" });
    } catch (error) {
      const mockTask: Task = {
        id: Date.now().toString(),
        ...newTask,
        status: "todo",
        assigned_to: null,
        rating: null,
        tags: null,
        created_at: new Date().toISOString(),
        assignee_name: "צוות",
      };
      setTasks([mockTask, ...tasks]);
      setIsCreateDialogOpen(false);
      setNewTask({ title: "", description: "", priority: "medium", due_date: "", assigned_to: "" });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from("admin_tasks").delete().eq("id", taskId);
      if (error) throw error;
      setTasks(tasks.filter(task => task.id !== taskId));
      toast({ title: "המשימה נמחקה" });
    } catch (error) {
      setTasks(tasks.filter(task => task.id !== taskId));
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.assignee_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProgressByStatus = (task: Task) => {
    switch (task.status) {
      case "done": return 100;
      case "review": return 75;
      case "in_progress": return 50;
      default: return 10;
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="flex items-center justify-between px-4 py-4">
          <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700" onClick={() => navigate("/admin/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <img src="/petid-logo.png" alt="Logo" className="h-8" onError={(e) => (e.currentTarget.style.display = 'none')} />
            <h1 className="text-lg font-bold text-white">NARTINA</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700" onClick={fetchTasks} disabled={loading}>
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="px-4 pb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white gap-2">
                  <Calendar className="w-4 h-4" />
                  משימה חדשה
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-slate-800 border-slate-700 text-white" dir="rtl">
                <DialogHeader>
                  <DialogTitle>משימה חדשה</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>כותרת</Label>
                    <Input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="bg-slate-700 border-slate-600" />
                  </div>
                  <div className="space-y-2">
                    <Label>תיאור</Label>
                    <Textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} className="bg-slate-700 border-slate-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>עדיפות</Label>
                      <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                        <SelectTrigger className="bg-slate-700 border-slate-600"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">לא דחוף</SelectItem>
                          <SelectItem value="medium">בינוני</SelectItem>
                          <SelectItem value="high">דחוף</SelectItem>
                          <SelectItem value="urgent">דחוף מאוד</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>תאריך יעד</Label>
                      <Input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} className="bg-slate-700 border-slate-600" />
                    </div>
                  </div>
                  <Button className="w-full bg-cyan-500 hover:bg-cyan-600" onClick={handleCreateTask} disabled={!newTask.title}>צור משימה</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-2">
              <Filter className="w-4 h-4" />
              פילטר
            </Button>
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">אפשרויות</Button>
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="חיפוש לפי שם עובד..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pr-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400" 
            />
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-4 py-4 grid grid-cols-4 gap-3">
        {Object.entries(statusConfig).reverse().map(([key, config]) => (
          <Card key={key} className={`${config.bgColor} border-none p-4 flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{getTasksByStatus(key).length}</p>
              <p className="text-sm text-white/80">משימות</p>
              <p className="text-xs font-medium text-white">{config.label}</p>
            </div>
            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </Card>
        ))}
      </div>

      {/* Table */}
      <div className="px-4">
        <div className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700">
          {/* Table Header */}
          <div className="grid grid-cols-[auto_1fr_150px_150px_120px_120px_100px_auto_auto_auto_auto_auto_80px] gap-2 px-4 py-3 bg-slate-800 text-slate-400 text-sm font-medium border-b border-slate-700">
            <div>משימה</div>
            <div>שם עובד</div>
            <div>תאריך משימה</div>
            <div>כותרת</div>
            <div>סטטוס</div>
            <div>דחיפות</div>
            <div>יעד סיום</div>
            <div>הסתיים</div>
            <div>מייל</div>
            <div>הודעה</div>
            <div>עריכה</div>
            <div>מחק</div>
            <div></div>
          </div>

          {/* Table Body */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <ListTodo className="w-16 h-16 mb-4 opacity-50" />
              <p>אין משימות</p>
            </div>
          ) : (
            filteredTasks.map((task, index) => {
              const priority = priorityConfig[task.priority] || priorityConfig.medium;
              const status = statusConfig[task.status] || statusConfig.todo;
              const isCompleted = task.status === "done";

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`grid grid-cols-[auto_1fr_150px_150px_120px_120px_100px_auto_auto_auto_auto_auto_80px] gap-2 px-4 py-3 items-center border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors relative`}
                >
                  {/* Left Color Strip */}
                  <div className={`absolute right-0 top-0 bottom-0 w-1 ${isCompleted ? 'bg-emerald-500' : 'bg-red-500'}`} />

                  {/* Task Button */}
                  <div className="flex items-center gap-2 pr-4">
                    <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 text-xs h-8">
                      משימה
                    </Button>
                  </div>

                  {/* Employee Name with Avatar */}
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={task.assignee_avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-purple-500 text-white text-xs">
                        {task.assignee_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-white text-sm">{task.assignee_name || "לא משויך"}</span>
                  </div>

                  {/* Task Date */}
                  <div className="text-slate-300 text-sm">
                    {task.created_at ? format(new Date(task.created_at), "dd-MM-yyyy", { locale: he }) : "-"}
                  </div>

                  {/* Title */}
                  <div className="text-white text-sm truncate">{task.title}</div>

                  {/* Status with Progress */}
                  <div className="space-y-1">
                    <Badge className={`${status.bgColor} ${status.color} border-none text-xs`}>
                      {status.label}
                    </Badge>
                    <Progress value={getProgressByStatus(task)} className="h-1 bg-slate-700" />
                  </div>

                  {/* Priority */}
                  <div>
                    <Badge className={`${priority.bgColor} ${priority.color} border ${priority.borderColor} text-xs`}>
                      {task.priority === "urgent" && <AlertTriangle className="w-3 h-3 ml-1" />}
                      {priority.label}
                    </Badge>
                  </div>

                  {/* Due Date */}
                  <div className="flex items-center gap-1 text-slate-300 text-sm">
                    {task.priority === "urgent" && <AlertTriangle className="w-4 h-4 text-red-400" />}
                    {task.due_date ? format(new Date(task.due_date), "dd-MM-yyyy", { locale: he }) : "-"}
                  </div>

                  {/* Completed Checkbox */}
                  <div className="flex justify-center">
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={() => handleStatusChange(task.id, isCompleted ? "todo" : "done")}
                      className="border-slate-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                  </div>

                  {/* Mail Button */}
                  <div>
                    <Button size="icon" variant="ghost" className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-slate-300">
                      <Mail className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Notification Button */}
                  <div>
                    <Button size="icon" variant="ghost" className="w-8 h-8 bg-purple-600 hover:bg-purple-500 text-white">
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Edit Button */}
                  <div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="w-8 h-8 bg-cyan-600 hover:bg-cyan-500 text-white"
                      onClick={() => { setSelectedTask(task); setIsViewDialogOpen(true); }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Delete Button */}
                  <div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="w-8 h-8 bg-red-600 hover:bg-red-500 text-white"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Indicator Dot */}
                  <div className="flex justify-center">
                    <div className={`w-3 h-3 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Task Floating Button */}
      <Button
        className="fixed bottom-24 left-4 w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 shadow-lg shadow-orange-500/30"
        onClick={() => setIsCreateDialogOpen(true)}
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Task View/Edit Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md bg-slate-800 border-slate-700 text-white" dir="rtl">
          <DialogHeader>
            <DialogTitle>פרטי משימה</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-slate-400">כותרת</Label>
                <p className="text-lg font-medium">{selectedTask.title}</p>
              </div>
              {selectedTask.description && (
                <div>
                  <Label className="text-slate-400">תיאור</Label>
                  <p className="text-sm">{selectedTask.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-400">סטטוס</Label>
                  <Select value={selectedTask.status} onValueChange={(v) => handleStatusChange(selectedTask.id, v)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-400">דחיפות</Label>
                  <Badge className={`${priorityConfig[selectedTask.priority]?.bgColor} ${priorityConfig[selectedTask.priority]?.color} mt-1`}>
                    {priorityConfig[selectedTask.priority]?.label}
                  </Badge>
                </div>
              </div>
              {selectedTask.due_date && (
                <div>
                  <Label className="text-slate-400">תאריך יעד</Label>
                  <p>{format(new Date(selectedTask.due_date), "d בMMMM yyyy", { locale: he })}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTasks;
