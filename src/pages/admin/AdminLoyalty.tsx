import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  Search,
  Trophy,
  Star,
  Crown,
  Medal,
  Award,
  Gift,
  Users,
  TrendingUp,
  Plus,
  Edit,
  Settings,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface LoyaltyLevel {
  name: string;
  name_he: string;
  threshold: number;
  icon: any;
  color: string;
  benefits: string[];
}

interface Member {
  id: string;
  user_id: string;
  points: number;
  total_earned: number;
  level: string;
  joined_at: string;
  user?: {
    full_name: string;
    avatar_url: string;
    email: string;
  };
}

interface PointAction {
  id: string;
  action: string;
  action_he: string;
  points: number;
  is_active: boolean;
}

const levels: LoyaltyLevel[] = [
  { name: "Puppy", name_he: "גור", threshold: 0, icon: Star, color: "from-slate-400 to-slate-500", benefits: ["5% הנחה על הזמנה ראשונה"] },
  { name: "Guardian", name_he: "מגן", threshold: 250, icon: Medal, color: "from-emerald-400 to-emerald-600", benefits: ["10% הנחה", "משלוח חינם מ-₪100"] },
  { name: "Hunter", name_he: "צייד", threshold: 600, icon: Award, color: "from-blue-400 to-blue-600", benefits: ["15% הנחה", "משלוח חינם", "גישה מוקדמת למבצעים"] },
  { name: "Beta", name_he: "סגן אלפא", threshold: 1200, icon: Trophy, color: "from-purple-400 to-purple-600", benefits: ["20% הנחה", "מתנת יום הולדת", "שירות VIP"] },
  { name: "Alpha", name_he: "אלפא", threshold: 2500, icon: Crown, color: "from-amber-400 to-amber-600", benefits: ["25% הנחה", "כל ההטבות", "אירועים בלעדיים"] },
];

const AdminLoyalty = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("members");
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionForm, setActionForm] = useState({
    action: "",
    action_he: "",
    points: 0
  });

  // Fetch loyalty actions from database
  const { data: actions = [], isLoading: actionsLoading, refetch: refetchActions } = useQuery({
    queryKey: ["loyalty-actions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("loyalty_point_actions")
        .select("*")
        .order("points", { ascending: false });
      
      if (error) throw error;
      return (data || []) as PointAction[];
    },
  });

  // Create action mutation
  const createActionMutation = useMutation({
    mutationFn: async (action: Partial<PointAction>) => {
      const { data, error } = await (supabase as any)
        .from("loyalty_point_actions")
        .insert(action)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-actions"] });
      toast({ title: "הפעולה נוספה בהצלחה" });
      setActionDialogOpen(false);
      setActionForm({ action: "", action_he: "", points: 0 });
    },
    onError: () => {
      toast({ title: "שגיאה בהוספת הפעולה", variant: "destructive" });
    },
  });

  // Toggle action active status
  const toggleActionMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from("loyalty_point_actions")
        .update({ is_active })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-actions"] });
      toast({ title: "הסטטוס עודכן" });
    },
  });

  // Delete action mutation
  const deleteActionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("loyalty_point_actions")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-actions"] });
      toast({ title: "הפעולה נמחקה" });
    },
  });

  // Fetch members
  const { isLoading: membersLoading, refetch: refetchMembers } = useQuery({
    queryKey: ["loyalty-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email, loyalty_points, created_at")
        .order("loyalty_points", { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        setMembers(
          data.map((p: any) => ({
            id: p.id,
            user_id: p.id,
            points: p.loyalty_points || 0,
            total_earned: (p.loyalty_points || 0) + Math.floor(Math.random() * 500),
            level: getLevelForPoints(p.loyalty_points || 0),
            joined_at: p.created_at,
            user: { full_name: p.full_name, avatar_url: p.avatar_url, email: p.email },
          }))
        );
      } else {
        setMembers([]);
      }
      return data;
    },
  });

  const getLevelForPoints = (points: number): string => {
    for (let i = levels.length - 1; i >= 0; i--) {
      if (points >= levels[i].threshold) return levels[i].name_he;
    }
    return levels[0].name_he;
  };

  const getLevelInfo = (levelName: string) => {
    return levels.find((l) => l.name_he === levelName) || levels[0];
  };

  const getNextLevel = (currentLevel: string) => {
    const currentIndex = levels.findIndex((l) => l.name_he === currentLevel);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
  };

  const getProgressToNext = (points: number, currentLevel: string) => {
    const current = getLevelInfo(currentLevel);
    const next = getNextLevel(currentLevel);
    if (!next) return 100;
    const range = next.threshold - current.threshold;
    const progress = points - current.threshold;
    return Math.min(100, (progress / range) * 100);
  };

  const filteredMembers = members.filter(
    (m) =>
      m.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalMembers: members.length,
    totalPoints: members.reduce((sum, m) => sum + m.points, 0),
    avgPoints: members.length > 0 ? Math.round(members.reduce((sum, m) => sum + m.points, 0) / members.length) : 0,
    alphaMembers: members.filter((m) => m.level === "אלפא").length,
  };

  const loading = membersLoading || actionsLoading;

  return (
    <AdminLayout title="מועדון נאמנות" icon={Trophy} breadcrumbs={[{ label: "מועדון" }]}>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-gradient-to-br from-violet-500 to-purple-600 text-white border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{stats.totalMembers}</p>
              <p className="text-sm opacity-80">חברי מועדון</p>
            </div>
            <Users className="w-8 h-8 opacity-60" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-500 to-orange-500 text-white border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</p>
              <p className="text-sm opacity-80">סה"כ נקודות</p>
            </div>
            <Star className="w-8 h-8 opacity-60" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-emerald-500 to-teal-500 text-white border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{stats.avgPoints}</p>
              <p className="text-sm opacity-80">ממוצע לחבר</p>
            </div>
            <TrendingUp className="w-8 h-8 opacity-60" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-rose-500 to-pink-500 text-white border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{stats.alphaMembers}</p>
              <p className="text-sm opacity-80">חברי אלפא</p>
            </div>
            <Crown className="w-8 h-8 opacity-60" />
          </div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members">חברי מועדון</TabsTrigger>
          <TabsTrigger value="levels">רמות והטבות</TabsTrigger>
          <TabsTrigger value="actions">פעולות ונקודות</TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש חברים..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => refetchMembers()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              אין חברי מועדון עדיין
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMembers.map((member, index) => {
                const levelInfo = getLevelInfo(member.level);
                const nextLevel = getNextLevel(member.level);
                const progress = getProgressToNext(member.points, member.level);
                const LevelIcon = levelInfo.icon;

                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={member.user?.avatar_url} />
                            <AvatarFallback>
                              {member.user?.full_name?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br ${levelInfo.color} flex items-center justify-center`}>
                            <LevelIcon className="w-3 h-3 text-white" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold truncate">{member.user?.full_name}</h3>
                            <Badge variant="outline" className={`bg-gradient-to-r ${levelInfo.color} text-white border-none text-xs`}>
                              {member.level}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {member.user?.email}
                          </p>
                        </div>

                        <div className="text-left min-w-[120px]">
                          <div className="flex items-center gap-1 justify-end mb-1">
                            <Star className="w-4 h-4 text-amber-500" />
                            <span className="font-bold text-lg">{member.points.toLocaleString()}</span>
                          </div>
                          {nextLevel && (
                            <>
                              <Progress value={progress} className="h-1.5 mb-1" />
                              <p className="text-xs text-muted-foreground text-left">
                                {nextLevel.threshold - member.points} עד {nextLevel.name_he}
                              </p>
                            </>
                          )}
                          {!nextLevel && (
                            <p className="text-xs text-amber-500 text-left">🏆 דרגה מקסימלית</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Levels Tab */}
        <TabsContent value="levels" className="space-y-4">
          <div className="grid gap-4">
            {levels.map((level, index) => {
              const LevelIcon = level.icon;
              const membersInLevel = members.filter((m) => m.level === level.name_he).length;

              return (
                <motion.div
                  key={level.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-4 overflow-hidden">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${level.color} flex items-center justify-center shrink-0`}>
                        <LevelIcon className="w-7 h-7 text-white" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-lg">{level.name_he}</h3>
                            <p className="text-sm text-muted-foreground">
                              {level.threshold.toLocaleString()} נקודות ומעלה
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {membersInLevel} חברים
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {level.benefits.map((benefit, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              <Gift className="w-3 h-3 ml-1" />
                              {benefit}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold">פעולות לצבירת נקודות</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => refetchActions()} disabled={actionsLoading}>
                <RefreshCw className={`w-4 h-4 ${actionsLoading ? "animate-spin" : ""}`} />
              </Button>
              <Button size="sm" className="gap-2" onClick={() => setActionDialogOpen(true)}>
                <Plus className="w-4 h-4" />
                הוסף פעולה
              </Button>
            </div>
          </div>

          <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>הוספת פעולה חדשה</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>שם הפעולה (אנגלית) *</Label>
                  <Input
                    value={actionForm.action}
                    onChange={(e) => setActionForm({ ...actionForm, action: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    placeholder="לדוגמה: newsletter_signup"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label>שם הפעולה (עברית) *</Label>
                  <Input
                    value={actionForm.action_he}
                    onChange={(e) => setActionForm({ ...actionForm, action_he: e.target.value })}
                    placeholder="לדוגמה: הרשמה לניוזלטר"
                  />
                </div>
                <div>
                  <Label>נקודות</Label>
                  <Input
                    type="number"
                    value={actionForm.points}
                    onChange={(e) => setActionForm({ ...actionForm, points: Number(e.target.value) })}
                    placeholder="50"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setActionDialogOpen(false)}>ביטול</Button>
                  <Button 
                    onClick={() => {
                      if (!actionForm.action || !actionForm.action_he) {
                        toast({ title: "נא למלא את כל השדות", variant: "destructive" });
                        return;
                      }
                      createActionMutation.mutate({
                        action: actionForm.action,
                        action_he: actionForm.action_he,
                        points: actionForm.points || 0,
                        is_active: true
                      });
                    }}
                    disabled={createActionMutation.isPending}
                  >
                    הוסף פעולה
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {actionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : actions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              אין פעולות נקודות עדיין
            </div>
          ) : (
            <div className="grid gap-3">
              {actions.map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`p-4 ${!action.is_active ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Star className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{action.action_he}</h4>
                          <p className="text-xs text-muted-foreground">{action.action}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="text-lg px-3">
                          +{action.points}
                        </Badge>
                        <Switch
                          checked={action.is_active}
                          onCheckedChange={(checked) => toggleActionMutation.mutate({ id: action.id, is_active: checked })}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteActionMutation.mutate(action.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminLoyalty;