import { useState } from "react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { Check, Circle, Calendar, Trophy, Flame, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { usePoints } from "@/contexts/PointsContext";
import confetti from "canvas-confetti";
import { AppHeader } from "@/components/AppHeader";

interface Task {
  id: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
  type: "daily" | "weekly";
  category: "feeding" | "exercise" | "grooming" | "health" | "training";
}

const Tasks = () => {
  const { toast } = useToast();
  const { totalPoints, addPoints } = usePoints();
  const [streak, setStreak] = useState(7);

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "Morning Feeding",
      description: "Feed your pet their morning meal",
      points: 10,
      completed: false,
      type: "daily",
      category: "feeding",
    },
    {
      id: "2",
      title: "30-Minute Walk",
      description: "Take your dog for a walk",
      points: 20,
      completed: false,
      type: "daily",
      category: "exercise",
    },
    {
      id: "3",
      title: "Brush Fur",
      description: "Brush your pet's coat",
      points: 15,
      completed: false,
      type: "daily",
      category: "grooming",
    },
    {
      id: "4",
      title: "Play Time",
      description: "Interactive play session (15 mins)",
      points: 15,
      completed: false,
      type: "daily",
      category: "exercise",
    },
    {
      id: "5",
      title: "Evening Feeding",
      description: "Feed your pet their evening meal",
      points: 10,
      completed: false,
      type: "daily",
      category: "feeding",
    },
    {
      id: "6",
      title: "Weekly Vet Check",
      description: "Schedule or complete vet appointment",
      points: 100,
      completed: false,
      type: "weekly",
      category: "health",
    },
    {
      id: "7",
      title: "Deep Grooming",
      description: "Bath and nail trim",
      points: 50,
      completed: false,
      type: "weekly",
      category: "grooming",
    },
    {
      id: "8",
      title: "Training Session",
      description: "Practice commands (30 mins)",
      points: 30,
      completed: false,
      type: "weekly",
      category: "training",
    },
  ]);

  const dailyTasks = tasks.filter((task) => task.type === "daily");
  const weeklyTasks = tasks.filter((task) => task.type === "weekly");

  const dailyCompleted = dailyTasks.filter((task) => task.completed).length;
  const weeklyCompleted = weeklyTasks.filter((task) => task.completed).length;

  const dailyProgress = (dailyCompleted / dailyTasks.length) * 100;
  const weeklyProgress = (weeklyCompleted / weeklyTasks.length) * 100;

  const handleCompleteTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.completed) return;

    try {
      await addPoints(task.points);
      
      setTasks((prevTasks) =>
        prevTasks.map((t) => 
          t.id === taskId ? { ...t, completed: true } : t
        )
      );
      
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["hsl(var(--accent))", "hsl(var(--error))", "hsl(var(--secondary))"],
      });

      toast({
        title: "Task Completed! 🎉",
        description: `You earned ${task.points} points!`,
      });
    } catch (error) {
      // Error already handled in context
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "feeding":
        return "🍖";
      case "exercise":
        return "🏃";
      case "grooming":
        return "✂️";
      case "health":
        return "⚕️";
      case "training":
        return "🎓";
      default:
        return "🐾";
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-20">
        <AppHeader 
          title="משימות טיפול" 
          showBackButton={false}
          showMenuButton={true}
          extraAction={{
            icon: Bell,
            onClick: () => {}
          }}
        />
        
        <div className="px-4 pt-4">
          {/* Points & Streak Card */}
          <div className="bg-gradient-primary rounded-2xl p-4 shadow-lg mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center shadow-md">
                  <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
                    <path d="M14 5C9.5 5 7 8 7 11.5C7 14 8.5 16.5 11 17.5L12 21L16 21L17 17.5C19.5 16.5 21 14 21 11.5C21 8 18.5 5 14 5Z" fill="hsl(var(--error))"/>
                    <circle cx="11.5" cy="11" r="1.5" fill="white"/>
                    <circle cx="16.5" cy="11" r="1.5" fill="white"/>
                    <path d="M8.5 7.5C8.5 6 7 5 5.5 6.5C4 8 5 10 6.5 10C7.5 10 8.5 9 8.5 7.5Z" fill="hsl(var(--error))"/>
                    <path d="M19.5 7.5C19.5 6 21 5 22.5 6.5C24 8 23 10 21.5 10C20.5 10 19.5 9 19.5 7.5Z" fill="hsl(var(--error))"/>
                  </svg>
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground">{totalPoints}</div>
                  <div className="text-sm text-foreground/70">Total Points</div>
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 mb-1">
                  <Flame className="w-5 h-5 text-warning" strokeWidth={1.5} />
                  <span className="text-2xl font-bold text-foreground">{streak}</span>
                </div>
                <div className="text-xs text-foreground/70">Day Streak</div>
              </div>
            </div>
        </div>

        {/* Tasks Content */}
        <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="daily" className="font-jakarta">
                Daily Tasks
              </TabsTrigger>
              <TabsTrigger value="weekly" className="font-jakarta">
                Weekly Tasks
              </TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-4">
              {/* Daily Progress */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-secondary" strokeWidth={1.5} />
                    <span className="font-semibold text-gray-900 font-jakarta">Daily Progress</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {dailyCompleted}/{dailyTasks.length}
                  </span>
                </div>
                <Progress value={dailyProgress} className="h-2" />
              </Card>

              {/* Daily Task List */}
              <div className="space-y-3">
                {dailyTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card
                      className={`p-4 transition-all ${
                        task.completed
                          ? "bg-success/10 border-success/20"
                          : "bg-white hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          disabled={task.completed}
                          className="mt-1"
                        >
                          {task.completed ? (
                            <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" strokeWidth={1.5} />
                            </div>
                          ) : (
                            <Circle className="w-6 h-6 text-gray-300 hover:text-accent transition-colors" strokeWidth={1.5} />
                          )}
                        </button>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{getCategoryIcon(task.category)}</span>
                            <h3
                              className={`font-semibold font-jakarta ${
                                task.completed
                                  ? "text-gray-500 line-through"
                                  : "text-gray-900"
                              }`}
                            >
                              {task.title}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          <Badge variant="secondary" className="bg-accent/20 text-gray-900">
                            +{task.points} points
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="weekly" className="space-y-4">
              {/* Weekly Progress */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-accent" strokeWidth={1.5} />
                    <span className="font-semibold text-gray-900 font-jakarta">Weekly Progress</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {weeklyCompleted}/{weeklyTasks.length}
                  </span>
                </div>
                <Progress value={weeklyProgress} className="h-2" />
              </Card>

              {/* Weekly Task List */}
              <div className="space-y-3">
                {weeklyTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card
                      className={`p-4 transition-all ${
                        task.completed
                          ? "bg-success/10 border-success/20"
                          : "bg-white hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          disabled={task.completed}
                          className="mt-1"
                        >
                          {task.completed ? (
                            <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" strokeWidth={1.5} />
                            </div>
                          ) : (
                            <Circle className="w-6 h-6 text-gray-300 hover:text-accent transition-colors" strokeWidth={1.5} />
                          )}
                        </button>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{getCategoryIcon(task.category)}</span>
                            <h3
                              className={`font-semibold font-jakarta ${
                                task.completed
                                  ? "text-gray-500 line-through"
                                  : "text-gray-900"
                              }`}
                            >
                              {task.title}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          <Badge variant="secondary" className="bg-accent/20 text-gray-900">
                            +{task.points} points
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Tasks;