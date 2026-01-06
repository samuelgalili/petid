/**
 * Points & Rewards Card - כרטיס נקודות ותגמולים
 * משתמש במערכת הנאמנות החדשה
 */

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Gift, 
  TrendingUp, 
  Star, 
  ChevronLeft,
  Sparkles,
  Zap,
  Crown,
  ShoppingBag,
  Camera,
  Users
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLoyalty } from "@/hooks/useLoyalty";

interface PointsRewardsCardProps {
  petName: string;
}

export const PointsRewardsCard = ({ petName }: PointsRewardsCardProps) => {
  const navigate = useNavigate();
  const { stats, loading, currentRank, progress } = useLoyalty();

  const points = stats?.totalPoints || 0;

  // הטבות זמינות לפי נקודות
  const availableRewards = [
    { points: 100, reward: '₪10 הנחה', available: points >= 100 },
    { points: 250, reward: '₪25 הנחה', available: points >= 250 },
    { points: 500, reward: 'משלוח חינם', available: points >= 500 },
    { points: 1000, reward: 'מוצר במתנה', available: points >= 1000 },
  ];

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-32 bg-muted rounded-xl" />
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="space-y-4"
    >
      {/* כרטיס ראשי - נקודות ודרגה */}
      <Card className={`p-5 relative overflow-hidden bg-gradient-to-br ${currentRank?.color || 'from-teal-500 to-cyan-600'} shadow-xl`}>
        {/* דפוס ברקע משופר */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2 blur-lg" />
          <motion.div 
            className="absolute top-1/2 left-1/2 w-20 h-20 bg-white/30 rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </div>

        <div className="relative z-10">
          {/* שורה עליונה */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.div 
                className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <span className="text-2xl">{currentRank?.icon || '🥉'}</span>
              </motion.div>
              <div>
                <p className="text-white/90 text-xs font-medium">דרגת {currentRank?.name || 'מתחיל'}</p>
                <p className="text-white font-bold text-base">הנקודות שלי</p>
              </div>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              className="bg-white/25 text-white border-0 hover:bg-white/35 rounded-full gap-1 backdrop-blur-sm shadow-md"
              onClick={() => navigate('/rewards')}
            >
              פרטים
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* נקודות - משופר */}
          <div className="flex items-end gap-3 mb-4">
            <motion.div 
              className="flex items-baseline gap-2"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <span className="text-5xl font-black text-white drop-shadow-lg">
                {points.toLocaleString()}
              </span>
              <span className="text-white/80 text-sm font-medium mb-2">נקודות</span>
            </motion.div>
            <motion.div
              className="mr-auto"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Star className="w-6 h-6 text-white/60 fill-white/40" />
            </motion.div>
          </div>

          {/* התקדמות לדרגה הבאה - משופר */}
          {progress && progress.pointsNeeded > 0 && (
            <div className="space-y-2 bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/90 font-medium">עד דרגת {progress.nextRank?.name || 'הבא'}</span>
                <span className="text-white font-bold bg-white/20 px-2 py-0.5 rounded-full">{progress.pointsNeeded} נקודות</span>
              </div>
              <div className="relative h-2.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 right-0 bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.progress}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* הטבות זמינות */}
      <Card className="p-4">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" />
          הטבות זמינות למימוש
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {availableRewards.map((reward, idx) => (
            <div 
              key={idx}
              className={`p-3 rounded-xl border text-center transition-all ${
                reward.available 
                  ? 'bg-primary/5 border-primary/20 cursor-pointer hover:bg-primary/10' 
                  : 'bg-muted/50 border-border/50 opacity-50'
              }`}
              onClick={() => reward.available && navigate('/rewards')}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                {reward.available ? (
                  <Star className="w-4 h-4 text-primary fill-primary" />
                ) : (
                  <Star className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <p className="text-xs font-medium">{reward.reward}</p>
              <p className="text-[10px] text-muted-foreground">{reward.points} נקודות</p>
            </div>
          ))}
        </div>
      </Card>

      {/* דרכים לצבור נקודות */}
      <Card className="p-4 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent" />
          דרכים לצבור נקודות
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-500" />
              <span>רכישה בחנות</span>
            </div>
            <span className="text-xs text-muted-foreground">נקודה לכל ₪1</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-purple-500" />
              <span>פרסום פוסט</span>
            </div>
            <span className="text-xs text-muted-foreground">10 נקודות</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span>הזמנת חברים</span>
            </div>
            <span className="text-xs text-muted-foreground">50 נקודות</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-600" />
              <span>בונוס ותק</span>
            </div>
            <span className="text-xs text-muted-foreground">100 נקודות/חודש</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default PointsRewardsCard;
