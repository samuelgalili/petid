import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Plus, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminGoals, Goal } from '@/hooks/admin/useAdminGoals';

interface AdminGoalsWidgetProps {
  onAddGoal?: () => void;
}

export const AdminGoalsWidget: React.FC<AdminGoalsWidgetProps> = ({ onAddGoal }) => {
  const { goals, getProgress } = useAdminGoals();

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 70) return 'bg-primary';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-destructive';
  };

  const getTrendIcon = (goal: Goal) => {
    const progress = getProgress(goal);
    if (progress >= 100) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (progress >= 50) return <TrendingUp className="w-4 h-4 text-primary" />;
    if (progress >= 25) return <Minus className="w-4 h-4 text-muted-foreground" />;
    return <TrendingDown className="w-4 h-4 text-destructive" />;
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === '₪' || unit === 'שקל') {
      return `₪${value.toLocaleString()}`;
    }
    return `${value.toLocaleString()} ${unit}`;
  };

  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" />
            יעדים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-3">
              לא הוגדרו יעדים עדיין
            </p>
            <Button variant="outline" size="sm" onClick={onAddGoal}>
              <Plus className="w-4 h-4 ml-2" />
              הוסף יעד
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" />
            יעדים
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAddGoal}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map(goal => {
          const progress = getProgress(goal);
          
          return (
            <div key={goal.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{goal.name}</span>
                  {getTrendIcon(goal)}
                </div>
                <Badge variant={progress >= 100 ? 'default' : 'secondary'} className="text-xs">
                  {progress.toFixed(0)}%
                </Badge>
              </div>
              <Progress 
                value={Math.min(progress, 100)} 
                className="h-2"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatValue(goal.current, goal.unit)}</span>
                <span>יעד: {formatValue(goal.target, goal.unit)}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
