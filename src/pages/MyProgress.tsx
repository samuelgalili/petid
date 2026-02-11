import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Trophy, Star, Target, Calendar, Flame, Gift, 
  ChevronLeft, Award, Zap, TrendingUp, CheckCircle2,
  Clock, Crown, Sparkles, Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNav from "@/components/BottomNav";
import { useGame } from "@/contexts/GameContext";

import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { TaskProofDialog } from "@/components/TaskProofDialog";

interface Task {
  id: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
  type: 'daily' | 'weekly';
  category: string;
}

const MyProgress = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { achievements, badges, loading: gameLoading } = useGame();
  const stats = { totalPoints: 0 };
  const awardPoints = async (_action: string) => {};
  const [activeTab, setActiveTab] = useState("overview");
  const [streak, setStreak] = useState(0);
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'טיול יומי', description: 'צא לטיול עם חיית המחמד', points: 10, completed: false, type: 'daily', category: 'activity' },
    { id: '2', title: 'צילום יומי', description: 'צלם תמונה ושתף', points: 5, completed: false, type: 'daily', category: 'social' },
    { id: '3', title: 'ביקורת מוצר', description: 'כתוב ביקורת על מוצר', points: 15, completed: false, type: 'daily', category: 'engagement' },
    { id: '4', title: 'אימון שבועי', description: 'השלם 3 שיעורי אימון', points: 50, completed: false, type: 'weekly', category: 'training' },
    { id: '5', title: 'טיפוח', description: 'תזמן ביקור אצל מטפח', points: 30, completed: false, type: 'weekly', category: 'care' },
    { id: '6', title: 'מעורבות קהילתית', description: 'הגב ל-5 פוסטים', points: 25, completed: false, type: 'weekly', category: 'social' },
  ]);

  const totalPoints = stats?.totalPoints || 0;
  const earnedBadges = achievements?.filter(a => a.badge) || [];
  const lockedBadges = badges?.filter(b => !achievements?.some(a => a.badge_id === b.id)) || [];

  useEffect(() => {
    const fetchStreak = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('streaks')
        .select('current_streak')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setStreak(data.current_streak || 0);
      }
    };
    fetchStreak();
  }, []);

  const dailyTasks = tasks.filter(t => t.type === 'daily');
  const weeklyTasks = tasks.filter(t => t.type === 'weekly');
  const dailyProgress = Math.round((dailyTasks.filter(t => t.completed).length / dailyTasks.length) * 100);
  const weeklyProgress = Math.round((weeklyTasks.filter(t => t.completed).length / weeklyTasks.length) * 100);

  const handleTaskClick = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.completed) return;
    
    setSelectedTask(task);
    setProofDialogOpen(true);
  };

  const handleProofSubmitted = async (taskId: string, proofType: 'post' | 'story' | 'reel', mediaUrl: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.completed) return;

    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, completed: true } : t
    ));

    await awardPoints(task.points.toString(), 'task_completion');
    
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#10B981', '#F59E0B', '#8B5CF6'],
    });

    toast({
      title: `+${task.points} נקודות! 🎉`,
      description: `השלמת: ${task.title}`,
    });
  };

  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      activity: '🐕',
      social: '📸',
      engagement: '💬',
      training: '🎓',
      care: '✨',
    };
    return emojis[category] || '⭐';
  };

  const getRarityStyle = (rarity: string) => {
    const styles: Record<string, string> = {
      common: 'bg-muted border-muted-foreground/30',
      rare: 'bg-blue-500/10 border-blue-500/50',
      epic: 'bg-purple-500/10 border-purple-500/50',
      legendary: 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/50',
    };
    return styles[rarity] || styles.common;
  };

  if (gameLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Trophy className="w-12 h-12 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      {/* Clean Header */}
      <motion.div 
        className="sticky top-0 z-40 bg-card/98 backdrop-blur-xl border-b border-border/40"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-muted/60 transition-all active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">ההתקדמות שלי</h1>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/rewards')}
            className="gap-1.5 text-primary"
          >
            <Gift className="w-4 h-4" />
            פרסים
          </Button>
        </div>
      </motion.div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Stats Row */}
        <motion.div 
          className="grid grid-cols-3 gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-3 text-center border-0 bg-primary/5">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-primary" fill="currentColor" />
            </div>
            <p className="text-2xl font-bold text-foreground">{totalPoints}</p>
            <p className="text-xs text-muted-foreground">נקודות</p>
          </Card>
          
          <Card className="p-3 text-center border-0 bg-orange-500/5">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{streak}</p>
            <p className="text-xs text-muted-foreground">ימי רצף</p>
          </Card>
          
          <Card className="p-3 text-center border-0 bg-purple-500/5">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Award className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{earnedBadges.length}</p>
            <p className="text-xs text-muted-foreground">תגים</p>
          </Card>
        </motion.div>

        {/* Tabs - Instagram style */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex gap-2 border-b border-border pb-3">
            {[
              { value: "overview", label: "סקירה" },
              { value: "tasks", label: "משימות" },
              { value: "badges", label: "תגים" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                  activeTab === tab.value
                    ? "text-foreground border-b-2 border-foreground -mb-[13px]"
                    : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Today's Progress */}
            <Card className="p-4 border-0 bg-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  משימות יומיות
                </h3>
                <span className="text-sm text-primary font-medium">{dailyProgress}%</span>
              </div>
              <Progress value={dailyProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {dailyTasks.filter(t => t.completed).length}/{dailyTasks.length} משימות הושלמו
              </p>
            </Card>

            {/* Weekly Progress */}
            <Card className="p-4 border-0 bg-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-accent" />
                  משימות שבועיות
                </h3>
                <span className="text-sm text-accent font-medium">{weeklyProgress}%</span>
              </div>
              <Progress value={weeklyProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {weeklyTasks.filter(t => t.completed).length}/{weeklyTasks.length} משימות הושלמו
              </p>
            </Card>

            {/* Level Progress */}
            <Card className="p-4 border-0 bg-gradient-to-r from-primary/10 to-accent/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center">
                  <Crown className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">רמה {Math.floor(totalPoints / 100) + 1}</h3>
                  <p className="text-xs text-muted-foreground">
                    {100 - (totalPoints % 100)} נקודות לרמה הבאה
                  </p>
                </div>
              </div>
              <Progress value={totalPoints % 100} className="h-2" />
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => navigate('/rewards')}
              >
                <Gift className="w-5 h-5 text-primary" />
                <span className="text-sm">מימוש פרסים</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => setActiveTab('tasks')}
              >
                <Zap className="w-5 h-5 text-orange-500" />
                <span className="text-sm">צבירת נקודות</span>
              </Button>
            </div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4 mt-4">
            {/* Daily Tasks */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                משימות יומיות
              </h3>
              <AnimatePresence>
                {dailyTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card 
                      className={`p-4 border-0 ${task.completed ? 'bg-success/5' : 'bg-card'} cursor-pointer`}
                      onClick={() => !task.completed && handleTaskClick(task.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            task.completed 
                              ? 'bg-success text-white' 
                              : 'border-2 border-dashed border-primary/50 bg-primary/5'
                          }`}
                        >
                          {task.completed ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Camera className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {getCategoryEmoji(task.category)} {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {task.completed ? task.description : '📸 העלה הוכחה להשלמה'}
                          </p>
                        </div>
                        <span className={`text-sm font-bold ${task.completed ? 'text-success' : 'text-primary'}`}>
                          +{task.points}
                        </span>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Weekly Tasks */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" />
                משימות שבועיות
              </h3>
              <AnimatePresence>
                {weeklyTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card 
                      className={`p-4 border-0 ${task.completed ? 'bg-success/5' : 'bg-card'} cursor-pointer`}
                      onClick={() => !task.completed && handleTaskClick(task.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            task.completed 
                              ? 'bg-success text-white' 
                              : 'border-2 border-dashed border-accent/50 bg-accent/5'
                          }`}
                        >
                          {task.completed ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Camera className="w-4 h-4 text-accent" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {getCategoryEmoji(task.category)} {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {task.completed ? task.description : '📸 העלה הוכחה להשלמה'}
                          </p>
                        </div>
                        <span className={`text-sm font-bold ${task.completed ? 'text-success' : 'text-accent'}`}>
                          +{task.points}
                        </span>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges" className="space-y-4 mt-4">
            {/* Earned Badges */}
            {earnedBadges.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  תגים שהושגו ({earnedBadges.length})
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {earnedBadges.map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className={`p-3 text-center border ${getRarityStyle(achievement.badge?.rarity || 'common')}`}>
                        <div className="text-3xl mb-2">{achievement.badge?.icon}</div>
                        <p className="text-xs font-medium text-foreground truncate">
                          {achievement.badge?.name_he}
                        </p>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Locked Badges */}
            {lockedBadges.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-muted-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  תגים נעולים ({lockedBadges.length})
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {lockedBadges.slice(0, 9).map((badge, index) => (
                    <motion.div
                      key={badge.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="p-3 text-center border border-muted bg-muted/30">
                        <div className="text-3xl mb-2 grayscale opacity-40">{badge.icon}</div>
                        <p className="text-xs text-muted-foreground truncate">{badge.name_he}</p>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {earnedBadges.length === 0 && lockedBadges.length === 0 && (
              <Card className="p-8 text-center border-0 bg-muted/30">
                <Award className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">
                  השלם משימות כדי לקבל תגים!
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />

      <TaskProofDialog
        open={proofDialogOpen}
        onOpenChange={setProofDialogOpen}
        task={selectedTask}
        onProofSubmitted={handleProofSubmitted}
      />
    </div>
  );
};

export default MyProgress;
