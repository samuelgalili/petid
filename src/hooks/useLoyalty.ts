import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Rank definitions with criteria
export const LOYALTY_RANKS = [
  { 
    level: 1, 
    name: 'גור', 
    nameEn: 'Pup',
    minPoints: 0, 
    maxPoints: 49,
    minTenureDays: 0,
    icon: '🐕',
    color: 'from-amber-400 to-amber-600',
    description: 'משתמש חדש - ברוך הבא למשפחה!'
  },
  { 
    level: 2, 
    name: 'מגן', 
    nameEn: 'Guardian',
    minPoints: 50, 
    maxPoints: 149,
    minTenureDays: 14,
    icon: '🛡️',
    color: 'from-blue-400 to-blue-600',
    description: 'מתחיל להשתלב - פעילות ראשונית'
  },
  { 
    level: 3, 
    name: 'צייד', 
    nameEn: 'Hunter',
    minPoints: 150, 
    maxPoints: 349,
    minTenureDays: 30,
    icon: '🎯',
    color: 'from-green-400 to-emerald-600',
    description: 'בונה נאמנות - רכישות חוזרות'
  },
  { 
    level: 4, 
    name: 'סגן אלפא', 
    nameEn: 'Beta',
    minPoints: 350, 
    maxPoints: 699,
    minTenureDays: 60,
    icon: '⚡',
    color: 'from-purple-400 to-purple-600',
    description: 'משתמש פעיל ומשפיע'
  },
  { 
    level: 5, 
    name: 'אלפא', 
    nameEn: 'Alpha',
    minPoints: 700, 
    maxPoints: Infinity,
    minTenureDays: 90,
    icon: '👑',
    color: 'from-yellow-400 to-orange-500',
    description: 'Top Tier - וותיק ומעורב'
  }
];

export interface LoyaltyStats {
  totalPoints: number;
  currentRank: string;
  rankLevel: number;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
  totalPurchases: number;
  totalReviews: number;
  totalPhotos: number;
  totalReferrals: number;
  consecutiveMonthsActive: number;
  longestStreakDays: number;
  currentStreakDays: number;
}

export interface LoyaltyEvent {
  id: string;
  actionType: string;
  pointsEarned: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface PointRule {
  actionType: string;
  actionNameHe: string;
  points: number;
  cooldownHours: number;
  dailyLimit: number | null;
  weeklyLimit: number | null;
  requiresTenureDays: number;
  isActive: boolean;
}

export const useLoyalty = () => {
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
  const [events, setEvents] = useState<LoyaltyEvent[]>([]);
  const [rules, setRules] = useState<PointRule[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Calculate rank based on points and tenure
  const calculateRank = useCallback((points: number, tenureDays: number) => {
    // Find the highest rank that meets both point and tenure requirements
    for (let i = LOYALTY_RANKS.length - 1; i >= 0; i--) {
      const rank = LOYALTY_RANKS[i];
      if (points >= rank.minPoints && tenureDays >= rank.minTenureDays) {
        return rank;
      }
    }
    return LOYALTY_RANKS[0]; // Default to first rank
  }, []);

  // Get progress to next rank
  const getProgressToNextRank = useCallback((points: number, tenureDays: number) => {
    const currentRank = calculateRank(points, tenureDays);
    const nextRankIndex = LOYALTY_RANKS.findIndex(r => r.level === currentRank.level) + 1;
    
    if (nextRankIndex >= LOYALTY_RANKS.length) {
      return { progress: 100, pointsNeeded: 0, daysNeeded: 0, nextRank: null };
    }
    
    const nextRank = LOYALTY_RANKS[nextRankIndex];
    const pointsProgress = Math.min(100, ((points - currentRank.minPoints) / (nextRank.minPoints - currentRank.minPoints)) * 100);
    const tenureProgress = Math.min(100, (tenureDays / nextRank.minTenureDays) * 100);
    
    // Progress is the minimum of both requirements
    const progress = Math.min(pointsProgress, tenureProgress);
    
    return {
      progress,
      pointsNeeded: Math.max(0, nextRank.minPoints - points),
      daysNeeded: Math.max(0, nextRank.minTenureDays - tenureDays),
      nextRank
    };
  }, [calculateRank]);

  // Fetch user stats
  const fetchStats = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_loyalty_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStats({
          totalPoints: data.total_points,
          currentRank: data.current_rank,
          rankLevel: data.rank_level,
          firstActivityAt: data.first_activity_at,
          lastActivityAt: data.last_activity_at,
          totalPurchases: data.total_purchases || 0,
          totalReviews: data.total_reviews || 0,
          totalPhotos: data.total_photos || 0,
          totalReferrals: data.total_referrals || 0,
          consecutiveMonthsActive: data.consecutive_months_active || 0,
          longestStreakDays: data.longest_streak_days || 0,
          currentStreakDays: data.current_streak_days || 0
        });
      } else {
        // Initialize stats for new user
        const { data: newStats, error: insertError } = await supabase
          .from('user_loyalty_stats')
          .insert({
            user_id: user.id,
            total_points: 0,
            current_rank: 'גור',
            rank_level: 1
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setStats({
          totalPoints: 0,
          currentRank: 'גור',
          rankLevel: 1,
          firstActivityAt: null,
          lastActivityAt: null,
          totalPurchases: 0,
          totalReviews: 0,
          totalPhotos: 0,
          totalReferrals: 0,
          consecutiveMonthsActive: 0,
          longestStreakDays: 0,
          currentStreakDays: 0
        });
      }
    } catch (error) {
      console.error('Error fetching loyalty stats:', error);
    }
  }, []);

  // Fetch recent events
  const fetchEvents = useCallback(async (limit = 10) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('loyalty_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setEvents((data || []).map(e => ({
        id: e.id,
        actionType: e.action_type,
        pointsEarned: e.points_earned,
        createdAt: e.created_at,
        metadata: e.metadata as Record<string, unknown> | undefined
      })));
    } catch (error) {
      console.error('Error fetching loyalty events:', error);
    }
  }, []);

  // Fetch point rules
  const fetchRules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('loyalty_point_rules')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      setRules((data || []).map(r => ({
        actionType: r.action_type,
        actionNameHe: r.action_name_he,
        points: r.points,
        cooldownHours: r.cooldown_hours || 0,
        dailyLimit: r.daily_limit,
        weeklyLimit: r.weekly_limit,
        requiresTenureDays: r.requires_tenure_days || 0,
        isActive: r.is_active ?? true
      })));
    } catch (error) {
      console.error('Error fetching loyalty rules:', error);
    }
  }, []);

  // Check if action is allowed (cooldown, limits, tenure)
  const canEarnPoints = useCallback(async (actionType: string): Promise<{ allowed: boolean; reason?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { allowed: false, reason: 'לא מחובר' };

      const rule = rules.find(r => r.actionType === actionType);
      if (!rule) return { allowed: false, reason: 'פעולה לא מוכרת' };

      // Check tenure requirement
      if (stats?.firstActivityAt) {
        const tenureDays = Math.floor((Date.now() - new Date(stats.firstActivityAt).getTime()) / (1000 * 60 * 60 * 24));
        if (tenureDays < rule.requiresTenureDays) {
          return { allowed: false, reason: `נדרש ותק של ${rule.requiresTenureDays} ימים` };
        }
      } else if (rule.requiresTenureDays > 0) {
        return { allowed: false, reason: `נדרש ותק של ${rule.requiresTenureDays} ימים` };
      }

      // Check cooldown
      if (rule.cooldownHours > 0) {
        const cooldownTime = new Date(Date.now() - rule.cooldownHours * 60 * 60 * 1000).toISOString();
        const { data: recentEvents } = await supabase
          .from('loyalty_events')
          .select('id')
          .eq('user_id', user.id)
          .eq('action_type', actionType)
          .gte('created_at', cooldownTime)
          .limit(1);

        if (recentEvents && recentEvents.length > 0) {
          return { allowed: false, reason: 'יש להמתין לפני ביצוע פעולה זו שוב' };
        }
      }

      // Check daily limit
      if (rule.dailyLimit !== null) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { data: todayEvents, count } = await supabase
          .from('loyalty_events')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('action_type', actionType)
          .gte('created_at', today.toISOString());

        if ((count || 0) >= rule.dailyLimit) {
          return { allowed: false, reason: 'הגעת למגבלה היומית' };
        }
      }

      // Check weekly limit
      if (rule.weeklyLimit !== null) {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: weekEvents, count } = await supabase
          .from('loyalty_events')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('action_type', actionType)
          .gte('created_at', weekAgo);

        if ((count || 0) >= rule.weeklyLimit) {
          return { allowed: false, reason: 'הגעת למגבלה השבועית' };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking points eligibility:', error);
      return { allowed: false, reason: 'שגיאה בבדיקת זכאות' };
    }
  }, [rules, stats]);

  // Award points for an action
  const awardPoints = useCallback(async (
    actionType: string, 
    referenceId?: string, 
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; points: number; newRank?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, points: 0 };

      const eligibility = await canEarnPoints(actionType);
      if (!eligibility.allowed) {
        console.log('Points not awarded:', eligibility.reason);
        return { success: false, points: 0 };
      }

      const rule = rules.find(r => r.actionType === actionType);
      if (!rule) return { success: false, points: 0 };

      // Insert event
      const { error: eventError } = await supabase
        .from('loyalty_events')
        .insert([{
          user_id: user.id,
          action_type: actionType,
          points_earned: rule.points,
          reference_id: referenceId || null,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null
        }]);

      if (eventError) throw eventError;

      // Update stats
      const newTotalPoints = (stats?.totalPoints || 0) + rule.points;
      const now = new Date().toISOString();
      const firstActivity = stats?.firstActivityAt || now;
      const tenureDays = Math.floor((Date.now() - new Date(firstActivity).getTime()) / (1000 * 60 * 60 * 24));
      
      const newRank = calculateRank(newTotalPoints, tenureDays);
      const rankChanged = newRank.name !== stats?.currentRank;

      // Determine which stat to increment based on action type
      const statUpdates: Record<string, number> = {};
      if (actionType.includes('purchase')) statUpdates.total_purchases = (stats?.totalPurchases || 0) + 1;
      if (actionType === 'write_review') statUpdates.total_reviews = (stats?.totalReviews || 0) + 1;
      if (actionType === 'upload_photo') statUpdates.total_photos = (stats?.totalPhotos || 0) + 1;
      if (actionType.includes('friend')) statUpdates.total_referrals = (stats?.totalReferrals || 0) + 1;

      const { error: statsError } = await supabase
        .from('user_loyalty_stats')
        .update({
          total_points: newTotalPoints,
          current_rank: newRank.name,
          rank_level: newRank.level,
          first_activity_at: firstActivity,
          last_activity_at: now,
          ...statUpdates
        })
        .eq('user_id', user.id);

      if (statsError) throw statsError;

      // Show toast
      if (rankChanged) {
        toast({
          title: `🎉 עלית לדרגת ${newRank.name}!`,
          description: newRank.description,
        });
      } else {
        toast({
          title: `+${rule.points} נקודות`,
          description: rule.actionNameHe,
        });
      }

      // Refresh stats
      await fetchStats();
      await fetchEvents();

      return { 
        success: true, 
        points: rule.points, 
        newRank: rankChanged ? newRank.name : undefined 
      };
    } catch (error) {
      console.error('Error awarding points:', error);
      return { success: false, points: 0 };
    }
  }, [rules, stats, canEarnPoints, calculateRank, fetchStats, fetchEvents, toast]);

  // Initial fetch
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchRules()]);
      await fetchEvents();
      setLoading(false);
    };
    init();
  }, [fetchStats, fetchRules, fetchEvents]);

  // Calculate tenure days
  const tenureDays = stats?.firstActivityAt 
    ? Math.floor((Date.now() - new Date(stats.firstActivityAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const currentRankData = LOYALTY_RANKS.find(r => r.name === stats?.currentRank) || LOYALTY_RANKS[0];
  const progressData = getProgressToNextRank(stats?.totalPoints || 0, tenureDays);

  return {
    stats,
    events,
    rules,
    loading,
    currentRank: currentRankData,
    tenureDays,
    progress: progressData,
    awardPoints,
    canEarnPoints,
    refreshStats: fetchStats,
    refreshEvents: fetchEvents
  };
};
