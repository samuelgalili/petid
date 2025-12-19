import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Flame, Target, Zap, Award } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChallengeBadge {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  requirement: number;
  color: string;
  gradient: string;
}

const CHALLENGE_BADGES: ChallengeBadge[] = [
  {
    id: "first_challenge",
    name: "מתחיל אתגרים",
    icon: <Flame className="w-4 h-4" />,
    description: "השתתפת באתגר הראשון שלך",
    requirement: 1,
    color: "text-orange-500",
    gradient: "from-orange-500 to-red-500",
  },
  {
    id: "challenger_3",
    name: "אתגרן מתקדם",
    icon: <Star className="w-4 h-4" />,
    description: "השתתפת ב-3 אתגרים",
    requirement: 3,
    color: "text-yellow-500",
    gradient: "from-yellow-400 to-orange-500",
  },
  {
    id: "challenger_5",
    name: "אלוף אתגרים",
    icon: <Trophy className="w-4 h-4" />,
    description: "השתתפת ב-5 אתגרים",
    requirement: 5,
    color: "text-amber-500",
    gradient: "from-amber-400 to-yellow-500",
  },
  {
    id: "challenger_10",
    name: "אגדת אתגרים",
    icon: <Award className="w-4 h-4" />,
    description: "השתתפת ב-10 אתגרים",
    requirement: 10,
    color: "text-purple-500",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    id: "speed_challenger",
    name: "בזק",
    icon: <Zap className="w-4 h-4" />,
    description: "הצטרפת ל-3 אתגרים בשבוע אחד",
    requirement: 3,
    color: "text-blue-500",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    id: "goal_setter",
    name: "שובר מטרות",
    icon: <Target className="w-4 h-4" />,
    description: "סיימת אתגר עם פוסט",
    requirement: 1,
    color: "text-green-500",
    gradient: "from-green-500 to-emerald-500",
  },
];

interface ChallengeBadgesProps {
  className?: string;
  userId?: string;
  showAll?: boolean;
}

export const ChallengeBadges = ({ className, userId, showAll = false }: ChallengeBadgesProps) => {
  const { user } = useAuth();
  const [challengeCount, setChallengeCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (targetUserId) {
      fetchChallengeCount();
    }
  }, [targetUserId]);

  const fetchChallengeCount = async () => {
    try {
      const { count } = await supabase
        .from("challenge_participants")
        .select("*", { count: "exact", head: true })
        .eq("user_id", targetUserId);

      setChallengeCount(count || 0);
    } catch (error) {
      console.error("Error fetching challenge count:", error);
    } finally {
      setLoading(false);
    }
  };

  const earnedBadges = CHALLENGE_BADGES.filter(badge => challengeCount >= badge.requirement);
  const lockedBadges = CHALLENGE_BADGES.filter(badge => challengeCount < badge.requirement);

  if (loading) {
    return (
      <div className={cn("flex gap-2", className)}>
        {[1, 2, 3].map(i => (
          <div key={i} className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const badgesToShow = showAll ? [...earnedBadges, ...lockedBadges] : earnedBadges;

  if (badgesToShow.length === 0) return null;

  return (
    <TooltipProvider>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {badgesToShow.map((badge, index) => {
          const isEarned = challengeCount >= badge.requirement;

          return (
            <Tooltip key={badge.id}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1, type: "spring" }}
                >
                  <Badge
                    variant={isEarned ? "default" : "outline"}
                    className={cn(
                      "h-8 px-2.5 gap-1.5 cursor-pointer transition-all duration-300",
                      isEarned
                        ? `bg-gradient-to-r ${badge.gradient} text-white border-0 shadow-md hover:shadow-lg hover:scale-105`
                        : "opacity-40 grayscale border-dashed"
                    )}
                  >
                    {badge.icon}
                    <span className="text-xs font-medium">{badge.name}</span>
                  </Badge>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <div className="text-center">
                  <p className="font-semibold text-sm">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                  {!isEarned && (
                    <p className="text-xs text-primary mt-1">
                      {badge.requirement - challengeCount} אתגרים נוספים
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};
