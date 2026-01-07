import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, Reorder } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Star,
  Calendar,
  User,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  Mail,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  GripVertical,
  Paperclip,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
}

interface Column {
  id: string;
  title: string;
  color: string;
  bgColor: string;
}

const columns: Column[] = [
  { id: "todo", title: "התחלה", color: "bg-blue-500", bgColor: "bg-blue-50" },
  { id: "in_progress", title: "בתהליך", color: "bg-amber-500", bgColor: "bg-amber-50" },
  { id: "review", title: "בדיקה", color: "bg-purple-500", bgColor: "bg-purple-50" },
  { id: "done", title: "הסתיים", color: "bg-green-500", bgColor: "bg-green-50" },
];

const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  low: { label: "נמוכה", color: "text-gray-600", bgColor: "bg-gray-100" },
  medium: { label: "בינונית", color: "text-blue-600", bgColor: "bg-blue-100" },
  high: { label: "גבוהה", color: "text-orange-600", bgColor: "bg-orange-100" },
  urgent: { label: "דחוף מאוד", color: "text-red-600", bgColor: "bg-red-100" },
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

  // New task form
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
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
        setTasks(data);
      } else {
        // Mock data for demo
        setTasks([
          {
            id: "1",
            title: "טיפול רישיון עסק",
            description: "הוסמך והתקנה של מיקרו מייקון על כניים מהם לשלחת הראשי",
            status: "done",
            priority: "high",
            assigned_to: null,
            due_date: "2024-12-25",
            rating: 3,
            tags: ["רישיון", "דחוף"],
            created_at: new Date().toISOString(),
          },
          {
            id: "2",
            title: "משימת שירות לקוחות",
            description: "בדיקת תלונות לקוחות באתר - טיפול משוב וביקורת",
            status: "in_progress",
            priority: "urgent",
            assigned_to: null,
            due_date: "2025-01-22",
            rating: 5,
            tags: ["לקוחות", "שירות"],
            created_at: new Date().toISOString(),
          },
          {
            id: "3",
            title: "משימת ניהול צוות",
            description: "הכנה לוח משמרות להחודש הבא - תכנון משמרות לפי סגנון",
            status: "todo",
            priority: "medium",
            assigned_to: null,
            due_date: "2025-01-22",
            rating: null,
            tags: ["צוות"],
            created_at: new Date().toISOString(),
          },
          {
            id: "4",
            title: "משימת פיתוח עסקי",
            description: "ביחירה תוכנית שכלית לרבעון הבא - עבודה בהרחבת מביאה אזורית",
            status: "review",
            priority: "high",
            assigned_to: null,
            due_date: "2025-02-27",
            rating: 4,
            tags: ["פיתוח"],
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status);
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("admin_tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));

      toast({
        title: "עודכן בהצלחה",
        description: "סטטוס המשימה עודכן",
      });
    } catch (error) {
      console.error("Error updating task:", error);
      // Update locally for demo
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
    }
  };

  const handleCreateTask = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_tasks")
        .insert({
          title: newTask.title,
          description: newTask.description,
          priority: newTask.priority,
          due_date: newTask.due_date || null,
          status: "todo",
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setTasks([data, ...tasks]);
      }

      setIsCreateDialogOpen(false);
      setNewTask({ title: "", description: "", priority: "medium", due_date: "" });

      toast({
        title: "נוצר בהצלחה",
        description: "המשימה נוספה ללוח",
      });
    } catch (error) {
      console.error("Error creating task:", error);
      // Create locally for demo
      const mockTask: Task = {
        id: Date.now().toString(),
        ...newTask,
        status: "todo",
        assigned_to: null,
        rating: null,
        tags: null,
        created_at: new Date().toISOString(),
      };
      setTasks([mockTask, ...tasks]);
      setIsCreateDialogOpen(false);
      setNewTask({ title: "", description: "", priority: "medium", due_date: "" });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("admin_tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;

      setTasks(tasks.filter(task => task.id !== taskId));

      toast({
        title: "נמחק בהצלחה",
        description: "המשימה הוסרה מהלוח",
      });
    } catch (error) {
      console.error("Error deleting task:", error);
      setTasks(tasks.filter(task => task.id !== taskId));
    }
  };

  const renderStars = (rating: number | null) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              rating && star <= rating
                ? "fill-amber-400 text-amber-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const priority = priorityConfig[task.priority] || priorityConfig.medium;
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => {
          setSelectedTask(task);
          setIsViewDialogOpen(true);
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-gray-300" />
            {task.due_date && (
              <span className="text-xs text-muted-foreground">
                {new Date(task.due_date).toLocaleDateString("he-IL")}
              </span>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                setSelectedTask(task);
                setIsViewDialogOpen(true);
              }}>
                <Eye className="w-4 h-4 ml-2" />
                צפייה
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
              }}>
                <Edit className="w-4 h-4 ml-2" />
                עריכה
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
              }}>
                <Mail className="w-4 h-4 ml-2" />
                שליחת תזכורת
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTask(task.id);
                }}
              >
                <Trash2 className="w-4 h-4 ml-2" />
                מחיקה
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Title */}
        <h4 className="font-bold text-foreground mb-2 line-clamp-2">{task.title}</h4>

        {/* Description */}
        {task.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {task.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Priority Badge */}
        <Badge className={`${priority.bgColor} ${priority.color} border-none text-xs mb-3`}>
          {priority.label}
        </Badge>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          {renderStars(task.rating)}
          <div className="flex items-center gap-2">
            {task.tags && task.tags.length > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Paperclip className="w-3 h-3" />
                <span className="text-xs">{task.tags.length}</span>
              </div>
            )}
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs bg-violet-100 text-violet-600">
                A
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" dir="rtl">
      {/* Header - Nartina Dark Style */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 shadow-lg">
        <div className="flex items-center justify-between px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-slate-700 text-white"
            onClick={() => navigate("/admin/dashboard")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white">ניהול משימות</h1>
            <Badge variant="secondary" className="bg-violet-500/20 text-violet-300">
              {tasks.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-slate-700 text-white"
            onClick={fetchTasks}
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="px-4 pb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="חיפוש משימות..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
            />
          </div>
          <Button variant="outline" size="icon" className="border-slate-600 text-slate-300 hover:bg-slate-700">
            <Filter className="w-4 h-4" />
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-violet-500 hover:bg-violet-600">
                <Plus className="w-4 h-4 ml-1" />
                חדש
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" dir="rtl">
              <DialogHeader>
                <DialogTitle>משימה חדשה</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>כותרת</Label>
                  <Input
                    placeholder="הזן כותרת משימה..."
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>תיאור</Label>
                  <Textarea
                    placeholder="הזן תיאור..."
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>עדיפות</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">נמוכה</SelectItem>
                        <SelectItem value="medium">בינונית</SelectItem>
                        <SelectItem value="high">גבוהה</SelectItem>
                        <SelectItem value="urgent">דחוף מאוד</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>תאריך יעד</Label>
                    <Input
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    />
                  </div>
                </div>
                <Button
                  className="w-full bg-violet-500 hover:bg-violet-600"
                  onClick={handleCreateTask}
                  disabled={!newTask.title}
                >
                  יצירת משימה
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
        </div>
      ) : (
        <div className="px-4 py-6">
          {/* Kanban Columns */}
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
            {columns.map((column) => {
              const columnTasks = getTasksByStatus(column.id);
              return (
                <div
                  key={column.id}
                  className="flex-shrink-0 w-72 snap-center"
                >
                  {/* Column Header */}
                  <div className={`${column.bgColor} rounded-t-xl p-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${column.color}`} />
                      <h3 className="font-bold text-foreground">{column.title}</h3>
                    </div>
                    <Badge variant="secondary" className="bg-white/50">
                      {columnTasks.length}
                    </Badge>
                  </div>

                  {/* Column Content */}
                  <div className={`${column.bgColor} rounded-b-xl p-3 min-h-[400px] space-y-3`}>
                    <Button
                      variant="ghost"
                      className="w-full border-2 border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500"
                      onClick={() => setIsCreateDialogOpen(true)}
                    >
                      <Plus className="w-4 h-4 ml-1" />
                      הוסף משימה
                    </Button>

                    {columnTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTask.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">עדיפות:</span>
                  <Badge className={`${priorityConfig[selectedTask.priority]?.bgColor} ${priorityConfig[selectedTask.priority]?.color}`}>
                    {priorityConfig[selectedTask.priority]?.label}
                  </Badge>
                </div>

                {selectedTask.due_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">תאריך יעד:</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(selectedTask.due_date).toLocaleDateString("he-IL")}
                    </span>
                  </div>
                )}

                {selectedTask.description && (
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">תיאור:</span>
                    <p className="text-foreground bg-muted p-3 rounded-lg">
                      {selectedTask.description}
                    </p>
                  </div>
                )}

                {selectedTask.rating && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">דירוג:</span>
                    {renderStars(selectedTask.rating)}
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">העבר לסטטוס:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {columns.map((col) => (
                      <Button
                        key={col.id}
                        variant={selectedTask.status === col.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          handleStatusChange(selectedTask.id, col.id);
                          setIsViewDialogOpen(false);
                        }}
                        className={selectedTask.status === col.id ? col.color : ""}
                      >
                        {col.title}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTasks;
