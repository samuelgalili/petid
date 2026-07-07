import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { createClientId } from "@/lib/randomId";

interface Badge {
  id: string;
  name: string;
  name_he: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
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
  streak_level: "bronze" | "silver" | "gold" | "platinum";
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

const DEFAULT_BADGES: Badge[] = [
  {
    id: "care-plan-first",
    name: "Care Planner",
    name_he: "תוכנית טיפול ראשונה",
    description: "Added the first item to a care plan",
    icon: "bone",
    rarity: "common",
    condition_type: "care_plan_items",
    condition_value: 1,
    points_reward: 10,
  },
  {
    id: "streak-7",
    name: "Weekly Streak",
    name_he: "שבוע רצוף",
    description: "Used MIPO for seven days",
    icon: "sparkles",
    rarity: "rare",
    condition_type: "streak_days",
    condition_value: 7,
    points_reward: 25,
  },
];

const STORAGE_KEY = "mipo-game-state";

const GameContext = createContext<GameContextType | undefined>(undefined);

const loadState = (): { achievements: Achievement[]; streak: Streak | null } => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{\"achievements\":[],\"streak\":null}");
  } catch {
    return { achievements: [], streak: null };
  }
};

const saveState = (state: { achievements: Achievement[]; streak: Streak | null }) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Local persistence is best-effort.
  }
};

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const initialState = useMemo(loadState, []);
  const [achievements, setAchievements] = useState<Achievement[]>(initialState.achievements);
  const [streak, setStreak] = useState<Streak | null>(initialState.streak);
  const [badges] = useState<Badge[]>(DEFAULT_BADGES);
  const [loading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    saveState({ achievements, streak });
  }, [achievements, streak]);

  const fetchAchievements = async () => {
    const state = loadState();
    setAchievements(state.achievements);
    setStreak(state.streak);
  };

  const awardBadge = async (badgeId: string) => {
    const badge = badges.find((item) => item.id === badgeId);
    if (!badge || achievements.some((item) => item.badge_id === badgeId)) return;

    const achievement: Achievement = {
      id: createClientId("achievement"),
      user_id: "local",
      badge_id: badgeId,
      earned_at: new Date().toISOString(),
      points_awarded: badge.points_reward,
      badge,
    };
    setAchievements((current) => [achievement, ...current]);

    confetti({ particleCount: 80, spread: 65, origin: { y: 0.65 } });
    toast({
      title: `🎉 ${badge.name_he}!`,
      description: `קיבלת ${badge.points_reward} נקודות`,
    });
  };

  const checkAndAwardBadges = async (conditionType: string, currentValue: number) => {
    const eligibleBadges = badges.filter(
      (badge) =>
        badge.condition_type === conditionType &&
        badge.condition_value <= currentValue &&
        !achievements.some((achievement) => achievement.badge_id === badge.id),
    );

    for (const badge of eligibleBadges) {
      await awardBadge(badge.id);
    }
  };

  const updateStreak = async () => {
    const today = new Date().toISOString().split("T")[0];
    if (streak?.last_activity_date === today) return;

    const lastDate = streak?.last_activity_date ? new Date(streak.last_activity_date) : null;
    const diffDays = lastDate
      ? Math.floor((new Date(today).getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const currentStreak = diffDays === 1 ? (streak?.current_streak || 0) + 1 : 1;
    const longestStreak = Math.max(currentStreak, streak?.longest_streak || 0);
    const streakLevel: Streak["streak_level"] =
      currentStreak >= 30 ? "platinum" : currentStreak >= 14 ? "gold" : currentStreak >= 7 ? "silver" : "bronze";

    setStreak({
      id: streak?.id || createClientId("streak"),
      user_id: "local",
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_activity_date: today,
      streak_level: streakLevel,
    });
    await checkAndAwardBadges("streak_days", currentStreak);
  };

  useEffect(() => {
    const handleCarePlanTrigger = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.conditionType && detail?.currentValue != null) {
        checkAndAwardBadges(detail.conditionType, detail.currentValue);
        updateStreak();
      }
    };
    window.addEventListener("care-plan-game-trigger", handleCarePlanTrigger);
    return () => window.removeEventListener("care-plan-game-trigger", handleCarePlanTrigger);
  }, [achievements, streak]);

  return (
    <GameContext.Provider
      value={{ achievements, streak, badges, loading, awardBadge, checkAndAwardBadges, updateStreak, fetchAchievements }}
    >
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
