import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Pause,
  Clock,
  RefreshCw,
  Calendar,
  Users,
  Timer,
  MoreVertical,
  Plus,
  StopCircle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { format, differenceInMinutes, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { he } from "date-fns/locale";

interface TimeEntry {
  id: string;
  task_id: string;
  task_title?: string;
  user_id: string;
  user_name?: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  description: string | null;
  is_billable: boolean;
}

interface ActiveTimer {
  taskId: string;
  taskTitle: string;
  startTime: Date;
}

const AdminTimeTracking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);

  useEffect(() => {
    fetchTimeEntries();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - activeTimer.startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const fetchTimeEntries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("task_time_entries")
        .select("*")
        .order("start_time", { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        setTimeEntries(data.map(e => ({ ...e, task_title: "משימה", user_name: "משתמש" })));
      } else {
        // Mock data
        setTimeEntries([
          { id: "1", task_id: "1", task_title: "פיתוח אתר", user_id: "1", user_name: "יצחק נחמד", start_time: "2025-01-07T09:00:00", end_time: "2025-01-07T12:30:00", duration_minutes: 210, description: "עבודה על הדשבורד", is_billable: true },
          { id: "2", task_id: "2", task_title: "פגישת לקוח", user_id: "1", user_name: "יצחק נחמד", start_time: "2025-01-07T14:00:00", end_time: "2025-01-07T15:30:00", duration_minutes: 90, description: "פגישת הכרות", is_billable: true },
          { id: "3", task_id: "3", task_title: "תיקוני באגים", user_id: "2", user_name: "לאה רובינסון", start_time: "2025-01-07T10:00:00", end_time: "2025-01-07T11:00:00", duration_minutes: 60, description: null, is_billable: false },
          { id: "4", task_id: "1", task_title: "פיתוח אתר", user_id: "1", user_name: "יצחק נחמד", start_time: "2025-01-06T09:00:00", end_time: "2025-01-06T17:00:00", duration_minutes: 480, description: "עבודה על ממשק המשתמש", is_billable: true },
          { id: "5", task_id: "4", task_title: "כתיבת תיעוד", user_id: "3", user_name: "לילך יצחק", start_time: "2025-01-06T14:00:00", end_time: "2025-01-06T16:00:00", duration_minutes: 120, description: null, is_billable: false },
        ]);
      }
    } catch (error) {
      console.error("Error fetching time entries:", error);
      setTimeEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const startTimer = (taskId: string, taskTitle: string) => {
    setActiveTimer({ taskId, taskTitle, startTime: new Date() });
    setElapsedSeconds(0);
    toast({ title: "הטיימר התחיל" });
  };

  const stopTimer = async () => {
    if (!activeTimer) return;

    const duration = Math.floor(elapsedSeconds / 60);
    const newEntry: TimeEntry = {
      id: Date.now().toString(),
      task_id: activeTimer.taskId,
      task_title: activeTimer.taskTitle,
      user_id: "current",
      user_name: "אני",
      start_time: activeTimer.startTime.toISOString(),
      end_time: new Date().toISOString(),
      duration_minutes: duration,
      description: null,
      is_billable: true,
    };

    setTimeEntries([newEntry, ...timeEntries]);
    setActiveTimer(null);
    setElapsedSeconds(0);
    toast({ title: `נרשמו ${duration} דקות` });

    try {
      await supabase.from("task_time_entries").insert({
        task_id: activeTimer.taskId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        start_time: activeTimer.startTime.toISOString(),
        end_time: new Date().toISOString(),
        duration_minutes: duration,
      });
    } catch (e) {}
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const todayEntries = timeEntries.filter(e => {
    const entryDate = new Date(e.start_time).toDateString();
    return entryDate === new Date().toDateString();
  });

  const todayTotal = todayEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  const weekTotal = timeEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  const billableTotal = timeEntries.filter(e => e.is_billable).reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

  // Weekly chart data
  const weekDays = eachDayOfInterval({
    start: startOfWeek(new Date(), { weekStartsOn: 0 }),
    end: endOfWeek(new Date(), { weekStartsOn: 0 }),
  });

  const weeklyData = weekDays.map(day => {
    const dayEntries = timeEntries.filter(e => new Date(e.start_time).toDateString() === day.toDateString());
    const total = dayEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    return { day: format(day, 'EEEEEE', { locale: he }), minutes: total };
  });

  const maxWeeklyMinutes = Math.max(...weeklyData.map(d => d.minutes), 480);

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="flex items-center justify-between px-4 py-4">
          <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700" onClick={() => navigate("/admin/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h1 className="text-lg font-bold text-white">מעקב זמן</h1>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700" onClick={fetchTimeEntries} disabled={loading}>
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Active Timer */}
      {activeTimer && (
        <div className="px-4 py-4">
          <Card className="bg-gradient-to-r from-cyan-500 to-purple-500 border-none p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                  <Timer className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold">{activeTimer.taskTitle}</p>
                  <p className="text-white/80 text-sm">עובד עכשיו...</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-3xl font-mono font-bold text-white">{formatElapsedTime(elapsedSeconds)}</span>
                <Button size="lg" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white gap-2" onClick={stopTimer}>
                  <StopCircle className="w-5 h-5" />
                  עצור
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Stats Cards */}
      <div className="px-4 py-4 grid grid-cols-4 gap-3">
        <Card className="bg-cyan-500 border-none p-4 flex items-center justify-between">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{formatDuration(todayTotal)}</p>
            <p className="text-sm text-white/80">היום</p>
          </div>
          <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </Card>

        <Card className="bg-purple-500 border-none p-4 flex items-center justify-between">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{formatDuration(weekTotal)}</p>
            <p className="text-sm text-white/80">השבוע</p>
          </div>
          <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </Card>

        <Card className="bg-emerald-500 border-none p-4 flex items-center justify-between">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{formatDuration(billableTotal)}</p>
            <p className="text-sm text-white/80">לחיוב</p>
          </div>
          <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </Card>

        <Card className="bg-amber-500 border-none p-4 flex items-center justify-between">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{timeEntries.length}</p>
            <p className="text-sm text-white/80">רשומות</p>
          </div>
          <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </Card>
      </div>

      {/* Weekly Chart */}
      <div className="px-4 mb-4">
        <Card className="bg-slate-800/50 border-slate-700 p-4">
          <h3 className="text-white font-bold mb-4">סקירה שבועית</h3>
          <div className="flex items-end justify-between gap-2 h-32">
            {weeklyData.map((day, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-slate-700 rounded-t-lg relative" style={{ height: '100px' }}>
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-t-lg transition-all"
                    style={{ height: `${(day.minutes / maxWeeklyMinutes) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400">{day.day}</span>
                <span className="text-xs text-white font-medium">{formatDuration(day.minutes)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Start Buttons */}
      <div className="px-4 mb-4">
        <Card className="bg-slate-800/50 border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold">התחל טיימר מהיר</h3>
            <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 gap-1" onClick={() => setIsManualEntryOpen(true)}>
              <Plus className="w-4 h-4" />
              רישום ידני
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {["פיתוח", "פגישה", "תמיכה", "תיעוד", "בדיקות"].map((task) => (
              <Button
                key={task}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-cyan-500 hover:border-cyan-500 hover:text-white gap-2"
                onClick={() => startTimer(task, task)}
                disabled={!!activeTimer}
              >
                <Play className="w-4 h-4" />
                {task}
              </Button>
            ))}
          </div>
        </Card>
      </div>

      {/* Time Entries List */}
      <div className="px-4">
        <h3 className="text-white font-bold mb-3">רשומות אחרונות</h3>
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
          ) : timeEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Clock className="w-16 h-16 mb-4 opacity-50" />
              <p>אין רשומות זמן</p>
            </div>
          ) : (
            timeEntries.slice(0, 10).map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-cyan-500 text-white text-xs">{entry.user_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white font-medium text-sm">{entry.task_title}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{entry.user_name}</span>
                        <span>•</span>
                        <span>{format(new Date(entry.start_time), "dd/MM HH:mm", { locale: he })}</span>
                        {entry.description && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[150px]">{entry.description}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {entry.is_billable && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">לחיוב</Badge>
                    )}
                    <span className="text-white font-mono font-bold">{formatDuration(entry.duration_minutes || 0)}</span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Manual Entry Dialog */}
      <Dialog open={isManualEntryOpen} onOpenChange={setIsManualEntryOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white" dir="rtl">
          <DialogHeader>
            <DialogTitle>רישום זמן ידני</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>משימה</Label>
              <Select>
                <SelectTrigger className="bg-slate-700 border-slate-600"><SelectValue placeholder="בחר משימה" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dev">פיתוח</SelectItem>
                  <SelectItem value="meeting">פגישה</SelectItem>
                  <SelectItem value="support">תמיכה</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>שעת התחלה</Label>
                <Input type="time" className="bg-slate-700 border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label>שעת סיום</Label>
                <Input type="time" className="bg-slate-700 border-slate-600" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>תיאור</Label>
              <Input className="bg-slate-700 border-slate-600" placeholder="תיאור העבודה..." />
            </div>
            <Button className="w-full bg-cyan-500 hover:bg-cyan-600">שמור</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTimeTracking;
