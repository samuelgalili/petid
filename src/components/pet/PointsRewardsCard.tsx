/**
 * Points & Rewards Card - כרטיס נקודות ותגמולים
 * עיצוב נקי ותואם למערכת העיצוב האחידה
 */

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Gift, 
  TrendingUp, 
  Star, 
  ChevronLeft,
  ShoppingBag,
  Camera,
  Users,
  Flame,
  Award
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
    { points: 100, reward: '₪10 הנחה', icon: '🎁', available: points >= 100 },
    { points: 250, reward: '₪25 הנחה', icon: '💰', available: points >= 250 },
    { points: 500, reward: 'משלוח חינם', icon: '🚚', available: points >= 500 },
    { points: 1000, reward: 'מוצר במתנה', icon: '🎉', available: points >= 1000 },
  ];

  // דרכים לצבור נקודות
  const earnMethods = [
    { icon: ShoppingBag, label: 'רכישה בחנות', value: 'נקודה לכל ₪1', color: 'text-primary' },
    { icon: Camera, label: 'פרסום פוסט', value: '+10 נקודות', color: 'text-accent' },
    { icon: Users, label: 'הזמנת חברים', value: '+50 נקודות', color: 'text-success' },
    { icon: Flame, label: 'סטריק יומי', value: '+5 נקודות', color: 'text-warning' },
  ];

  if (loading) {
    return (
      <Card className="p-4">
        <div className="h-24 bg-muted rounded-lg animate-pulse" />
      </Card>
    );
  }

  const progressPercent = progress?.progress || 0;

  return (
    <div className="space-y-4" dir="rtl">
      {/* כרטיס ראשי - נקודות */}
      <Card className="p-4 bg-card border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Award className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">דרגת {currentRank?.name || 'מתחיל'}</p>
              <p className="text-sm font-semibold">הנקודות שלי</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/rewards')}
          >
            פרטים
            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
          </Button>
        </div>

        {/* נקודות */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold text-foreground">
            {points.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">נקודות</span>
          {currentRank?.icon && (
            <span className="text-lg mr-auto">{currentRank.icon}</span>
          )}
        </div>

        {/* התקדמות לדרגה הבאה */}
        {progress && progress.pointsNeeded > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">עד דרגת {progress.nextRank?.name || 'הבא'}</span>
              <span className="font-medium">{progress.pointsNeeded} נקודות</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}
      </Card>

      {/* הטבות זמינות */}
      <Card className="p-4 bg-card border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold">הטבות זמינות</h4>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {availableRewards.map((reward, idx) => (
            <button 
              key={idx}
              onClick={() => reward.available && navigate('/rewards')}
              disabled={!reward.available}
              className={`p-3 rounded-xl border text-center transition-colors ${
                reward.available 
                  ? 'bg-primary/5 border-primary/20 hover:bg-primary/10 cursor-pointer' 
                  : 'bg-muted/30 border-border opacity-50 cursor-not-allowed'
              }`}
            >
              <span className="text-lg block mb-1">{reward.icon}</span>
              <p className="text-xs font-medium text-foreground">{reward.reward}</p>
              <p className="text-[10px] text-muted-foreground">{reward.points} נק׳</p>
            </button>
          ))}
        </div>
      </Card>

      {/* דרכים לצבור נקודות */}
      <Card className="p-4 bg-card border border-border">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-accent" />
          <h4 className="text-sm font-semibold">צבור נקודות</h4>
        </div>
        
        <div className="space-y-2.5">
          {earnMethods.map((method, idx) => {
            const Icon = method.icon;
            return (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${method.color}`} />
                  </div>
                  <span className="text-sm">{method.label}</span>
                </div>
                <span className="text-xs text-muted-foreground font-medium">{method.value}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default PointsRewardsCard;
