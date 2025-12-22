import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart3, Users, MapPin, Clock, TrendingUp, Eye } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface AdvancedAnalyticsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}

export const AdvancedAnalytics = ({ open, onOpenChange, businessId }: AdvancedAnalyticsProps) => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['business-analytics', businessId],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      const { data, error } = await supabase
        .from('business_analytics')
        .select('*')
        .eq('business_id', businessId)
        .gte('viewed_at', thirtyDaysAgo);
      
      if (error) throw error;
      return data;
    },
    enabled: !!businessId && open,
  });

  // Process analytics data
  const processedData = analytics ? {
    totalViews: analytics.length,
    uniqueViewers: new Set(analytics.filter(a => a.viewer_id).map(a => a.viewer_id)).size,
    
    // Age distribution
    ageDistribution: analytics.reduce((acc, a) => {
      if (a.viewer_age_range) {
        acc[a.viewer_age_range] = (acc[a.viewer_age_range] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>),
    
    // City distribution
    cityDistribution: analytics.reduce((acc, a) => {
      if (a.viewer_city) {
        acc[a.viewer_city] = (acc[a.viewer_city] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>),
    
    // Views by hour
    hourlyDistribution: analytics.reduce((acc, a) => {
      const hour = new Date(a.viewed_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>),
    
    // Daily views for chart
    dailyViews: analytics.reduce((acc, a) => {
      const day = format(new Date(a.viewed_at), 'yyyy-MM-dd');
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  } : null;

  const getTopItems = (obj: Record<string, number>, limit = 5) => {
    return Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  };

  const getPeakHour = () => {
    if (!processedData?.hourlyDistribution) return null;
    const peak = Object.entries(processedData.hourlyDistribution)
      .sort((a, b) => b[1] - a[1])[0];
    return peak ? `${peak[0]}:00` : null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            ניתוח מתקדם
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">טוען נתונים...</div>
        ) : !processedData || processedData.totalViews === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">אין מספיק נתונים עדיין</p>
            <p className="text-xs text-muted-foreground mt-1">
              נתונים יופיעו כאן לאחר שהפרופיל יקבל צפיות
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-3 gap-3">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-muted/50 rounded-xl text-center"
              >
                <Eye className="w-5 h-5 mx-auto mb-1 text-primary" />
                <div className="text-xl font-bold">{processedData.totalViews}</div>
                <span className="text-[10px] text-muted-foreground">צפיות ב-30 יום</span>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-3 bg-muted/50 rounded-xl text-center"
              >
                <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
                <div className="text-xl font-bold">{processedData.uniqueViewers}</div>
                <span className="text-[10px] text-muted-foreground">צופים ייחודיים</span>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-3 bg-muted/50 rounded-xl text-center"
              >
                <Clock className="w-5 h-5 mx-auto mb-1 text-primary" />
                <div className="text-xl font-bold">{getPeakHour() || '--'}</div>
                <span className="text-[10px] text-muted-foreground">שעת שיא</span>
              </motion.div>
            </div>

            {/* Age Distribution */}
            {Object.keys(processedData.ageDistribution).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
              >
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  התפלגות גילאים
                </h3>
                <div className="space-y-2">
                  {getTopItems(processedData.ageDistribution).map(([age, count]) => {
                    const percentage = (count / processedData.totalViews) * 100;
                    return (
                      <div key={age} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{age}</span>
                          <span className="text-muted-foreground">{percentage.toFixed(0)}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* City Distribution */}
            {Object.keys(processedData.cityDistribution).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-3"
              >
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  מיקומים מובילים
                </h3>
                <div className="space-y-2">
                  {getTopItems(processedData.cityDistribution).map(([city, count]) => {
                    const percentage = (count / processedData.totalViews) * 100;
                    return (
                      <div key={city} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{city}</span>
                          <span className="text-muted-foreground">{count} צפיות</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Peak Hours */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                שעות פעילות
              </h3>
              <div className="flex gap-0.5 h-16 items-end">
                {Array.from({ length: 24 }, (_, hour) => {
                  const count = processedData.hourlyDistribution[hour] || 0;
                  const maxCount = Math.max(...Object.values(processedData.hourlyDistribution));
                  const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  
                  return (
                    <div
                      key={hour}
                      className="flex-1 bg-primary/20 rounded-t hover:bg-primary/40 transition-colors relative group"
                      style={{ height: `${Math.max(height, 5)}%` }}
                    >
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                        {hour}:00 - {count}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>00:00</span>
                <span>12:00</span>
                <span>23:00</span>
              </div>
            </motion.div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
