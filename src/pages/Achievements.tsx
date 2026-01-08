import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Trophy, Lock } from "lucide-react";
import { fadeIn, staggerContainer, staggerItem } from "@/lib/animations";
import BottomNav from "@/components/BottomNav";

const rarityColors = {
  common: "bg-secondary text-foreground border-border",
  rare: "bg-primary/10 text-primary border-primary/30",
  epic: "bg-accent/10 text-accent border-accent/30",
  legendary: "bg-yellow-100 text-yellow-900 border-yellow-300"
};

const Achievements = () => {
  const { achievements, badges, loading } = useGame();
  const navigate = useNavigate();

  const earnedBadgeIds = achievements.map(a => a.badge_id);
  const earnedBadges = badges.filter(b => earnedBadgeIds.includes(b.id));
  const lockedBadges = badges.filter(b => !earnedBadgeIds.includes(b.id));

  const totalPoints = achievements.reduce((sum, a) => sum + a.points_awarded, 0);
  const completionPercentage = Math.round((earnedBadges.length / badges.length) * 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="text-center space-y-4"
        >
          <Trophy className="w-16 h-16 mx-auto text-primary" />
          <h1 className="text-4xl font-black">ההישגים שלי</h1>
          <p className="text-muted-foreground">צבירת תגמולים ונקודות</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="grid grid-cols-3 gap-4"
        >
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{earnedBadges.length}</div>
            <div className="text-sm text-muted-foreground">באדג׳ים</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{totalPoints}</div>
            <div className="text-sm text-muted-foreground">נקודות</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{completionPercentage}%</div>
            <div className="text-sm text-muted-foreground">השלמה</div>
          </Card>
        </motion.div>

        {/* Progress */}
        <Card className="p-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="font-medium">התקדמות כללית</span>
            <span className="text-muted-foreground">{earnedBadges.length} / {badges.length}</span>
          </div>
          <Progress value={completionPercentage} className="h-3" />
        </Card>

        {/* Badges List */}
        <Tabs defaultValue="earned" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="earned">שהושגו ({earnedBadges.length})</TabsTrigger>
            <TabsTrigger value="locked">נעולים ({lockedBadges.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="earned" className="mt-6">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {earnedBadges.map((badge) => {
                const achievement = achievements.find(a => a.badge_id === badge.id);
                return (
                  <motion.div key={badge.id} variants={staggerItem}>
                    <Card className={`p-6 border-2 ${rarityColors[badge.rarity]}`}>
                      <div className="text-center space-y-3">
                        <div className="text-6xl">{badge.icon}</div>
                        <h3 className="text-xl font-bold">{badge.name_he}</h3>
                        <Badge variant="secondary" className={rarityColors[badge.rarity]}>
                          {badge.rarity}
                        </Badge>
                        <p className="text-sm text-muted-foreground">{badge.description}</p>
                        <div className="text-primary font-bold">+{badge.points_reward} נקודות</div>
                        {achievement && (
                          <div className="text-xs text-muted-foreground">
                            הושג ב-{new Date(achievement.earned_at).toLocaleDateString('he-IL')}
                          </div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </TabsContent>

          <TabsContent value="locked" className="mt-6">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {lockedBadges.map((badge) => (
                <motion.div key={badge.id} variants={staggerItem}>
                  <Card className="p-6 border-2 border-dashed opacity-60">
                    <div className="text-center space-y-3">
                      <div className="relative inline-block">
                        <div className="text-6xl grayscale">{badge.icon}</div>
                        <Lock className="absolute -top-1 -right-1 w-6 h-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-xl font-bold">{badge.name_he}</h3>
                      <Badge variant="outline">{badge.rarity}</Badge>
                      <p className="text-sm text-muted-foreground">{badge.description}</p>
                      <div className="text-muted-foreground font-medium">
                        +{badge.points_reward} נקודות
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default Achievements;
