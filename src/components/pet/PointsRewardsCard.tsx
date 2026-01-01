/**
 * Points & Rewards Card - כרטיס נקודות ותגמולים
 */

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Coins, 
  Gift, 
  TrendingUp, 
  Star, 
  Crown,
  ChevronLeft,
  Sparkles,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PointsRewardsCardProps {
  petName: string;
}

export const PointsRewardsCard = ({ petName }: PointsRewardsCardProps) => {
  const navigate = useNavigate();
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tierProgress, setTierProgress] = useState(0);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', user.id)
          .single();

        if (profile) {
          setPoints(profile.points || 0);
          // חישוב התקדמות לדרגה הבאה (כל 500 נקודות = דרגה)
          setTierProgress((profile.points % 500) / 5);
        }
      } catch (error) {
        console.error('Error fetching points:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPoints();
  }, []);

  const getCurrentTier = () => {
    if (points >= 2000) return { name: 'פלטינום', icon: '💎', color: 'from-purple-500 to-pink-500' };
    if (points >= 1000) return { name: 'זהב', icon: '👑', color: 'from-amber-400 to-yellow-500' };
    if (points >= 500) return { name: 'כסף', icon: '🥈', color: 'from-gray-300 to-gray-400' };
    return { name: 'ברונזה', icon: '🥉', color: 'from-amber-600 to-amber-700' };
  };

  const getNextTier = () => {
    if (points >= 2000) return null;
    if (points >= 1000) return { name: 'פלטינום', points: 2000 };
    if (points >= 500) return { name: 'זהב', points: 1000 };
    return { name: 'כסף', points: 500 };
  };

  const currentTier = getCurrentTier();
  const nextTier = getNextTier();
  const cashback = Math.floor(points * 0.1); // 10% מהנקודות כקאשבק

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
      {/* כרטיס ראשי - נקודות */}
      <Card className={`p-5 relative overflow-hidden bg-gradient-to-br ${currentTier.color}`}>
        {/* דפוס ברקע */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="relative z-10">
          {/* שורה עליונה */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentTier.icon}</span>
              <div>
                <p className="text-white/80 text-xs">דרגת {currentTier.name}</p>
                <p className="text-white font-bold text-sm">הנקודות שלי</p>
              </div>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              className="bg-white/20 text-white border-0 hover:bg-white/30 rounded-full gap-1"
              onClick={() => navigate('/rewards')}
            >
              פרטים
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* נקודות */}
          <div className="flex items-end gap-2 mb-4">
            <motion.span 
              className="text-4xl font-black text-white"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              {points.toLocaleString()}
            </motion.span>
            <span className="text-white/70 text-sm mb-1">נקודות</span>
          </div>

          {/* התקדמות לדרגה הבאה */}
          {nextTier && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/80">עד דרגת {nextTier.name}</span>
                <span className="text-white font-medium">{nextTier.points - points} נקודות</span>
              </div>
              <Progress value={tierProgress} className="h-2 bg-white/20" />
            </div>
          )}
        </div>
      </Card>

      {/* קאשבק */}
      <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
              <Coins className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium">קאשבק זמין</p>
              <p className="text-2xl font-black text-green-600">₪{cashback}</p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="rounded-full border-green-500/30 text-green-600 hover:bg-green-500/10"
            onClick={() => navigate('/shop')}
          >
            מימוש
          </Button>
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
              <Zap className="w-4 h-4 text-amber-500" />
              <span>רכישה בחנות</span>
            </div>
            <span className="text-xs text-muted-foreground">נקודה לכל ₪1</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>פרסום פוסט</span>
            </div>
            <span className="text-xs text-muted-foreground">10 נקודות</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" />
              <span>הזמנת חברים</span>
            </div>
            <span className="text-xs text-muted-foreground">50 נקודות</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default PointsRewardsCard;
