import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

interface Badge {
  id: string;
  name: string;
  name_he: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  condition_type: string;
  condition_value: number;
  points_reward: number;
}

interface Achievement {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  points_awarded: number;
  badge?: Badge;
}

interface Streak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  streak_level: 'bronze' | 'silver' | 'gold' | 'platinum';
}

interface GameContextType {
  achievements: Achievement[];
  streak: Streak | null;
  badges: Badge[];
  loading: boolean;
  awardBadge: (badgeId: string) => Promise<void>;
  checkAndAwardBadges: (conditionType: string, currentValue: number) => Promise<void>;
  updateStreak: () => Promise<void>;
  fetchAchievements: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchGameData();
  }, []);

  const fetchGameData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch all badges
      const { data: badgesData } = await supabase
        .from('badges')
        .select('*')
        .order('rarity');
      
      if (badgesData) setBadges(badgesData as Badge[]);

      // Fetch user achievements
      await fetchAchievements();

      // Fetch user streak
      const { data: streakData } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (streakData) {
        setStreak(streakData as Streak);
      } else {
        // Create initial streak
        const { data: newStreak } = await supabase
          .from('streaks')
          .insert({
            user_id: user.id,
            current_streak: 0,
            longest_streak: 0,
            streak_level: 'bronze'
          })
          .select()
          .single();
        
        if (newStreak) setStreak(newStreak as Streak);
      }
    } catch (error) {
      console.error("Error fetching game data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAchievements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('achievements')
        .select('*, badge:badges(*)')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (data) setAchievements(data as Achievement[]);
    } catch (error) {
      console.error("Error fetching achievements:", error);
    }
  };

  const awardBadge = async (badgeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if already earned
      const alreadyEarned = achievements.some(a => a.badge_id === badgeId);
      if (alreadyEarned) return;

      const badge = badges.find(b => b.id === badgeId);
      if (!badge) return;

      // Insert achievement
      const { error } = await supabase
        .from('achievements')
        .insert({
          user_id: user.id,
          badge_id: badgeId,
          points_awarded: badge.points_reward
        });

      if (error) throw error;

      // Update points in profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', user.id)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ points: (profile.points || 0) + badge.points_reward })
          .eq('id', user.id);
      }

      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Show toast
      toast({
        title: `🎉 ${badge.name_he}!`,
        description: `קיבלת ${badge.points_reward} נקודות`,
      });

      // Refresh achievements
      await fetchAchievements();
    } catch (error) {
      console.error("Error awarding badge:", error);
    }
  };

  const checkAndAwardBadges = async (conditionType: string, currentValue: number) => {
    const eligibleBadges = badges.filter(
      b => b.condition_type === conditionType && 
      b.condition_value <= currentValue &&
      !achievements.some(a => a.badge_id === b.id)
    );

    for (const badge of eligibleBadges) {
      await awardBadge(badge.id);
    }
  };

  const updateStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !streak) return;

      const today = new Date().toISOString().split('T')[0];
      const lastActivity = streak.last_activity_date;

      let newStreak = streak.current_streak;
      
      if (lastActivity === today) {
        // Already logged today
        return;
      } else if (lastActivity) {
        const lastDate = new Date(lastActivity);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          // Consecutive day
          newStreak += 1;
        } else {
          // Streak broken
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      const longestStreak = Math.max(newStreak, streak.longest_streak);
      
      let streakLevel: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze';
      if (newStreak >= 30) streakLevel = 'platinum';
      else if (newStreak >= 14) streakLevel = 'gold';
      else if (newStreak >= 7) streakLevel = 'silver';

      const { data } = await supabase
        .from('streaks')
        .update({
          current_streak: newStreak,
          longest_streak: longestStreak,
          last_activity_date: today,
          streak_level: streakLevel
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (data) setStreak(data as Streak);

      // Check for streak badges
      await checkAndAwardBadges('streak_days', newStreak);
    } catch (error) {
      console.error("Error updating streak:", error);
    }
  };

  // Listen for care-plan-game-trigger events from useCarePlan
  useEffect(() => {
    const handleCarePlanTrigger = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.conditionType && detail?.currentValue != null) {
        checkAndAwardBadges(detail.conditionType, detail.currentValue);
        updateStreak();
      }
    };
    window.addEventListener("care-plan-game-trigger", handleCarePlanTrigger);
    return () => window.removeEventListener("care-plan-game-trigger", handleCarePlanTrigger);
  }, [badges, achievements, streak]);

  return (
    <GameContext.Provider value={{
      achievements,
      streak,
      badges,
      loading,
      awardBadge,
      checkAndAwardBadges,
      updateStreak,
      fetchAchievements
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
