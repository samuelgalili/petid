import { Eye, Heart, MessageCircle, TrendingUp, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface BusinessInsightsProps {
  viewCount: number;
  totalReviews: number;
  rating: number;
}

export const BusinessInsights = ({ viewCount, totalReviews, rating }: BusinessInsightsProps) => {
  const insights = [
    {
      label: 'צפיות',
      value: viewCount || 0,
      icon: Eye,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'ביקורות',
      value: totalReviews || 0,
      icon: MessageCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'דירוג',
      value: rating || 0,
      icon: TrendingUp,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      suffix: '⭐',
    },
  ];

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="font-bold">תובנות</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {insights.map((insight) => (
          <div
            key={insight.label}
            className={`${insight.bgColor} rounded-xl p-3 text-center`}
          >
            <insight.icon className={`w-5 h-5 ${insight.color} mx-auto mb-1`} />
            <div className="font-bold text-lg">
              {insight.value}{insight.suffix}
            </div>
            <div className="text-xs text-muted-foreground">{insight.label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
};
