import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Crown, Flame, Star, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface LeaderboardEntry {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  challenge_count: number;
  points: number;
}

interface ChallengeLeaderboardProps {
  className?: string;
  limit?: number;
}

const RANK_ICONS = [
  { icon: Crown, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { icon: Medal, color: "text-slate-400", bg: "bg-slate-400/10" },
  { icon: Medal, color: "text-amber-600", bg: "bg-amber-600/10" },
];

export const ChallengeLeaderboard = ({ className, limit = 5 }: ChallengeLeaderboardProps) => {
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      // Get participants grouped by user with count
      const { data: participants } = await supabase
        .from("challenge_participants")
        .select("user_id");

      if (!participants) {
        setLeaders([]);
        return;
      }

      // Count challenges per user
      const userCounts: Record<string, number> = {};
      participants.forEach(p => {
        userCounts[p.user_id] = (userCounts[p.user_id] || 0) + 1;
      });

      // Get top users
      const topUserIds = Object.entries(userCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([userId]) => userId);

      if (topUserIds.length === 0) {
        setLeaders([]);
        return;
      }

      // Fetch user profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, points")
        .in("id", topUserIds);

      if (!profiles) {
        setLeaders([]);
        return;
      }

      const leaderboard = topUserIds.map(userId => {
        const profile = profiles.find(p => p.id === userId);
        return {
          user_id: userId,
          full_name: profile?.full_name || "משתמש",
          avatar_url: profile?.avatar_url,
          challenge_count: userCounts[userId],
          points: profile?.points || 0,
        };
      });

      setLeaders(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={cn("p-4 space-y-3", className)}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
          <div className="h-5 w-24 bg-muted rounded animate-pulse" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 p-2">
            <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
            <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </Card>
    );
  }

  if (leaders.length === 0) return null;

  return (
    <Card className={cn("p-4 overflow-hidden border-0 shadow-lg", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-base">לידרבורד אתגרים</h3>
            <p className="text-xs text-muted-foreground">המשתתפים המובילים</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border-0">
          <Flame className="w-3 h-3 mr-1" />
          שבועי
        </Badge>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2">
        {leaders.map((leader, index) => {
          const RankIcon = RANK_ICONS[index]?.icon || Star;
          const rankColor = RANK_ICONS[index]?.color || "text-muted-foreground";
          const rankBg = RANK_ICONS[index]?.bg || "bg-muted";

          return (
            <motion.div
              key={leader.user_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(`/user/${leader.user_id}`)}
              className={cn(
                "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 hover:bg-muted/50",
                index === 0 && "bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 ring-1 ring-yellow-200/50"
              )}
            >
              {/* Rank */}
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", rankBg)}>
                {index < 3 ? (
                  <RankIcon className={cn("w-5 h-5", rankColor)} />
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>
                )}
              </div>

              {/* Avatar */}
              <div className="relative">
                <Avatar className={cn(
                  "w-10 h-10 ring-2 ring-offset-2 ring-offset-background",
                  index === 0 ? "ring-yellow-400" : index === 1 ? "ring-slate-400" : index === 2 ? "ring-amber-600" : "ring-border"
                )}>
                  <AvatarImage src={leader.avatar_url || undefined} />
                  <AvatarFallback className="bg-secondary text-muted-foreground text-sm font-medium">
                    {leader.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                {index === 0 && (
                  <motion.div
                    className="absolute -top-1 -right-1"
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <span className="text-base">👑</span>
                  </motion.div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{leader.full_name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    {leader.challenge_count} אתגרים
                  </span>
                </div>
              </div>

              {/* Points */}
              <div className="text-left">
                <div className="flex items-center gap-1 text-primary font-bold text-sm">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {leader.points}
                </div>
                <p className="text-[10px] text-muted-foreground">נקודות</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
};
