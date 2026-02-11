/**
 * Community Section - אזור מועדון וקהילה
 * ערכים: רצף, נאמנות, תרומה, משמעות
 * Gamification עדין - לא אגרסיבי
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Heart, 
  Users, 
  Gift, 
  Star, 
  Trophy,
  TrendingUp,
  HandHeart,
  Calendar,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CLUB, PROGRESS } from "@/lib/brandVoice";

interface CommunitySectionProps {
  points: number;
  streak: number;
  level: number;
  className?: string;
}

export const CommunitySection = ({
  points,
  streak,
  level,
  className = "",
}: CommunitySectionProps) => {
  const navigate = useNavigate();
  const pointsToNextLevel = 500 - (points % 500);

  return (
    <div className={`space-y-4 ${className}`} dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" />
          קהילה ומועדון
        </h2>
      </div>

      {/* Loyalty Status - Gentle */}
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">רמה {level}</p>
            <p className="text-xs text-muted-foreground">
              עוד {pointsToNextLevel} נקודות לרמה הבאה
            </p>
          </div>
          <span className="text-xl font-bold text-primary">{points}</span>
        </div>
        
        <Progress value={(points % 500) / 500 * 100} className="h-2" />
      </Card>

      {/* Streak - Consistency Value */}
      {streak > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card className="p-4 border-l-4 border-l-amber-400">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {PROGRESS.dailyStreak(streak)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {CLUB.pointsForFrequency}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Community Values Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Adoption Stories */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/adoption")}
        >
          <Card className="p-4 cursor-pointer hover:border-primary/50 transition-colors h-full">
            <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mb-3">
              <HandHeart className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            </div>
            <p className="font-medium text-sm text-foreground">{CLUB.adoptionStories}</p>
            <p className="text-xs text-muted-foreground mt-1">{CLUB.contribution}</p>
          </Card>
        </motion.div>

        {/* Shelter Partnership */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/adoption")}
        >
          <Card className="p-4 cursor-pointer hover:border-primary/50 transition-colors h-full">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="font-medium text-sm text-foreground">{CLUB.shelterPartnership}</p>
            <p className="text-xs text-muted-foreground mt-1">{CLUB.meaning}</p>
          </Card>
        </motion.div>
      </div>

      {/* Responsibility Boost - Subtle */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm text-foreground">
              {CLUB.responsibilityBoost}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              כל הזמנה קבועה = נקודות נוספות
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Achievement badge - subtle, not aggressive
export const AchievementBadge = ({
  icon,
  title,
  description,
  earned,
  earnedAt,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  earned: boolean;
  earnedAt?: string;
}) => {
  return (
    <motion.div
      whileHover={{ scale: earned ? 1.02 : 1 }}
      className={`p-4 rounded-xl border ${
        earned 
          ? "bg-primary/5 border-primary/20" 
          : "bg-muted/50 border-border opacity-60"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          earned ? "bg-primary/10" : "bg-muted"
        }`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className={`font-medium text-sm ${earned ? "text-foreground" : "text-muted-foreground"}`}>
            {title}
          </p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {earned && (
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
        )}
      </div>
      {earned && earnedAt && (
        <p className="text-xs text-muted-foreground mt-2 text-left">
          הושג ב-{new Date(earnedAt).toLocaleDateString('he-IL')}
        </p>
      )}
    </motion.div>
  );
};

// Donation prompt - gentle, value-driven
export const DonationPrompt = ({
  onDonate,
}: {
  onDonate: () => void;
}) => {
  return (
    <Card className="p-5 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 border-pink-200/50 dark:border-pink-800/50" dir="rtl">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center flex-shrink-0">
          <HandHeart className="w-6 h-6 text-pink-600 dark:text-pink-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-foreground mb-1">
            עזרו לחיות שמחפשות בית
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            חלק מההכנסות שלנו הולך לעמותות לבעלי חיים. 
            אפשר גם להוסיף תרומה קטנה בהזמנה הבאה.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onDonate}
            className="border-pink-300 dark:border-pink-700 text-pink-600 dark:text-pink-400"
          >
            <Heart className="w-4 h-4 mr-2" />
            הוסיפו ₪5 לתרומה
          </Button>
        </div>
      </div>
    </Card>
  );
};
