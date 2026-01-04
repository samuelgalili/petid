import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { Gift, Sparkles, Star, Clock, Tag, Trophy, Crown, Zap, ChevronLeft, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePoints } from "@/contexts/PointsContext";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";

interface Reward {
  id: string;
  title: string;
  description: string;
  points: number;
  value: string;
  type: "discount" | "voucher" | "freebie" | "premium";
  icon: string;
  color: string;
  bgGradient: string;
  expires?: string;
}

interface RedeemedReward extends Reward {
  redeemedAt: string;
  code: string;
  status: "active" | "used" | "expired";
}

const Rewards = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { totalPoints, deductPoints } = usePoints();
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const [availableRewards, setAvailableRewards] = useState<Reward[]>([]);
  const [redeemedRewards, setRedeemedRewards] = useState<RedeemedReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"available" | "redeemed">("available");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchRewards = async () => {
      try {
        const { data, error } = await supabase
          .from('rewards')
          .select('*')
          .eq('is_active', true)
          .order('points_cost', { ascending: true });

        if (error) throw error;

        if (data) {
          const mappedRewards: Reward[] = data.map((reward) => ({
            id: reward.id,
            title: reward.title,
            description: reward.description,
            points: reward.points_cost,
            value: reward.value,
            type: reward.type as "discount" | "voucher" | "freebie" | "premium",
            icon: reward.icon,
            color: reward.gradient,
            bgGradient: reward.gradient,
          }));
          setAvailableRewards(mappedRewards);
        }
      } catch (error) {
        console.error('Error fetching rewards:', error);
        toast({
          title: "שגיאה בטעינה",
          description: "לא הצלחנו לטעון את הפרסים",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRewards();
  }, [toast]);

  useEffect(() => {
    const fetchRedeemedRewards = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('redemptions')
          .select(`
            *,
            rewards (*)
          `)
          .eq('user_id', user.id)
          .order('redeemed_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const mappedRedemptions: RedeemedReward[] = data.map((redemption: any) => ({
            id: redemption.reward_id,
            title: redemption.rewards.title,
            description: redemption.rewards.description,
            points: redemption.rewards.points_cost,
            value: redemption.rewards.value,
            type: redemption.rewards.type as "discount" | "voucher" | "freebie" | "premium",
            icon: redemption.rewards.icon,
            color: redemption.rewards.gradient,
            bgGradient: redemption.rewards.gradient,
            redeemedAt: new Date(redemption.redeemed_at).toISOString().split("T")[0],
            code: redemption.redemption_code,
            status: redemption.status as "active" | "used" | "expired",
            expires: new Date(redemption.expires_at).toISOString().split("T")[0],
          }));
          setRedeemedRewards(mappedRedemptions);
        }
      } catch (error) {
        console.error('Error fetching redeemed rewards:', error);
      }
    };

    fetchRedeemedRewards();
  }, []);

  const handleRedeemReward = (reward: Reward) => {
    setSelectedReward(reward);
    setShowRedeemDialog(true);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "הקוד הועתק בהצלחה! 📋",
      description: `קוד: ${code}`,
    });
  };

  const confirmRedemption = async () => {
    if (!selectedReward) return;

    if (totalPoints < selectedReward.points) {
      toast({
        title: "אין מספיק נקודות 😔",
        description: `חסרות לך עוד ${selectedReward.points - totalPoints} נקודות למימוש`,
        variant: "destructive",
      });
      setShowRedeemDialog(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "יש להתחבר",
          description: "התחבר לחשבון כדי לממש פרסים",
          variant: "destructive",
        });
        return;
      }

      await deductPoints(selectedReward.points);

      const typeMap: Record<string, string> = {
        discount: 'הנחה',
        voucher: 'שובר',
        freebie: 'מתנה',
        premium: 'פרימיום',
        product: 'מוצר',
        service: 'שירות',
      };
      const hebrewType = typeMap[selectedReward.type] || 'פרס';
      const code = `${hebrewType}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('redemptions')
        .insert({
          user_id: user.id,
          reward_id: selectedReward.id,
          redemption_code: code,
          status: 'active',
          expires_at: expiresAt.toISOString(),
        });

      if (error) throw error;

      const newRedemption: RedeemedReward = {
        ...selectedReward,
        redeemedAt: new Date().toISOString().split("T")[0],
        code,
        status: "active",
        expires: expiresAt.toISOString().split("T")[0],
      };

      setRedeemedRewards((prev) => [newRedemption, ...prev]);

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#F58529", "#DD2A7B", "#8134AF", "#FEDA77", "#FFD700"],
      });

      toast({
        title: "מזל טוב! הפרס מומש 🎉",
        description: `קוד המימוש שלך: ${code}`,
      });

      setShowRedeemDialog(false);
      setSelectedReward(null);
      setActiveTab("redeemed");
    } catch (error) {
      console.error('Error redeeming reward:', error);
      toast({
        title: "שגיאה במימוש הפרס",
        description: "משהו השתבש, נסה שוב",
        variant: "destructive",
      });
      setShowRedeemDialog(false);
    }
  };

  const getStatusBadge = (status: RedeemedReward["status"]) => {
    switch (status) {
      case "active":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-400 to-emerald-500 text-white">
            פעיל ✓
          </span>
        );
      case "used":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-600">
            נוצל
          </span>
        );
      case "expired":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-error/10 text-error">
            פג תוקף
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div 
            className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-petid p-[3px]"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
              <Gift className="w-8 h-8 text-petid-blue" />
            </div>
          </motion.div>
          <p className="text-muted-foreground font-jakarta font-medium">טוען פרסים...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-24" dir="rtl">
        {/* Clean Header - like Feed */}
        <motion.div 
          className="sticky top-0 z-40 bg-card/98 backdrop-blur-xl border-b border-border/40"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/profile')}
                className="p-2 rounded-xl hover:bg-muted/60 transition-all active:scale-95"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <h1 className="text-xl font-semibold text-foreground">
                פרסים והטבות
              </h1>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
              <Star className="w-4 h-4 text-primary" fill="currentColor" />
              <span className="text-sm font-bold text-primary">{totalPoints}</span>
            </div>
          </div>
        </motion.div>

        <div className="max-w-lg mx-auto px-4 pt-4">
          {/* Points Card - Clean style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-card border border-border p-5 mb-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">הנקודות שלך</p>
                <motion.div 
                  className="text-4xl font-bold text-foreground"
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  {totalPoints}
                </motion.div>
                <p className="text-muted-foreground text-xs mt-1">
                  צבור נקודות ומימוש להטבות
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-primary" />
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>התקדמות</span>
                <span>{totalPoints}/500</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((totalPoints / 500) * 100, 100)}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
            </div>
          </motion.div>

          {/* Clean Tabs */}
          <div className="flex gap-2 mb-5 border-b border-border pb-3">
            <button
              onClick={() => setActiveTab("available")}
              className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                activeTab === "available"
                  ? "text-foreground border-b-2 border-foreground -mb-[13px]"
                  : "text-muted-foreground"
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Gift className="w-4 h-4" />
                פרסים זמינים
              </span>
            </button>
            <button
              onClick={() => setActiveTab("redeemed")}
              className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                activeTab === "redeemed"
                  ? "text-foreground border-b-2 border-foreground -mb-[13px]"
                  : "text-muted-foreground"
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Star className="w-4 h-4" />
                הפרסים שלי
                {redeemedRewards.filter(r => r.status === "active").length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                    {redeemedRewards.filter(r => r.status === "active").length}
                  </span>
                )}
              </span>
            </button>
          </div>

          {/* Available Rewards */}
          <AnimatePresence mode="wait">
            {activeTab === "available" && (
              <motion.div
                key="available"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {availableRewards.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-16"
                  >
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-tr from-primary/10 to-accent/10 flex items-center justify-center">
                      <Gift className="w-10 h-10 text-primary/50" />
                    </div>
                    <p className="text-muted-foreground font-jakarta font-medium">אין פרסים זמינים כרגע</p>
                    <p className="text-muted-foreground/70 font-jakarta text-sm mt-1">בדוק שוב מאוחר יותר</p>
                  </motion.div>
                ) : (
                  availableRewards.map((reward, index) => (
                    <motion.div
                      key={reward.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="bg-card rounded-xl overflow-hidden border border-border"
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl">{reward.icon}</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="text-base font-semibold text-foreground truncate">
                                {reward.title}
                              </h3>
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary flex-shrink-0">
                                {reward.value}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
                              {reward.description}
                            </p>
                            <p className="text-[10px] text-muted-foreground/50 mb-2">
                              * בחנות PetID בלבד
                            </p>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-primary" fill="currentColor" />
                                <span className="text-xs font-medium text-foreground">
                                  {reward.points} נקודות
                                </span>
                              </div>

                              <button
                                onClick={() => handleRedeemReward(reward)}
                                disabled={totalPoints < reward.points}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                  totalPoints >= reward.points
                                    ? "bg-foreground text-background hover:bg-foreground/90"
                                    : "bg-muted text-muted-foreground cursor-not-allowed"
                                }`}
                              >
                                {totalPoints >= reward.points ? "מימוש" : `חסרות ${reward.points - totalPoints}`}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}

            {/* Redeemed Rewards */}
            {activeTab === "redeemed" && (
              <motion.div
                key="redeemed"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {redeemedRewards.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-16"
                  >
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-tr from-petid-blue/20 to-petid-gold/20 flex items-center justify-center">
                      <Star className="w-10 h-10 text-petid-gold" />
                    </div>
                    <p className="text-muted-foreground font-jakarta font-medium">אין פרסים עדיין</p>
                    <p className="text-muted-foreground/70 font-jakarta text-sm mt-1">מימשת פרס? הוא יופיע כאן</p>
                  </motion.div>
                ) : (
                  redeemedRewards.map((reward, index) => (
                    <motion.div
                      key={`${reward.id}-${reward.redeemedAt}`}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-card rounded-3xl overflow-hidden shadow-lg shadow-primary/5 border border-border"
                    >
                      {/* Gradient header */}
                      <div className="bg-gradient-primary p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{reward.icon}</span>
                            <div>
                              <h3 className="text-primary-foreground font-black font-jakarta">
                                {reward.title}
                              </h3>
                              <p className="text-primary-foreground/80 text-xs font-jakarta">
                                {reward.value}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(reward.status)}
                        </div>
                      </div>

                      {/* Code section */}
                      <div className="p-4">
                        <div className="bg-muted rounded-2xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground font-jakarta flex items-center gap-1">
                              <Tag className="w-3.5 h-3.5" />
                              קוד מימוש
                            </span>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => copyCode(reward.code)}
                              className="text-primary text-xs font-bold font-jakarta flex items-center gap-1"
                            >
                              {copiedCode === reward.code ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  הועתק!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  העתק
                                </>
                              )}
                            </motion.button>
                          </div>
                          <code className="text-lg font-black text-foreground font-mono tracking-wider">
                            {reward.code}
                          </code>
                        </div>

                        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1 font-jakarta">
                            <Clock className="w-3.5 h-3.5" />
                            <span>מומש: {reward.redeemedAt}</span>
                          </div>
                          {reward.expires && (
                            <span className="font-jakarta">בתוקף עד: {reward.expires}</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <BottomNav />

        {/* Redemption Dialog - Instagram Style */}
        <AlertDialog open={showRedeemDialog} onOpenChange={setShowRedeemDialog}>
          <AlertDialogContent className="rounded-3xl p-0 overflow-hidden max-w-sm" dir="rtl">
            {/* Gradient Header */}
            <div className="bg-gradient-primary p-6 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                className="w-20 h-20 mx-auto mb-3 rounded-full bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center"
              >
                <span className="text-5xl">{selectedReward?.icon}</span>
              </motion.div>
              <AlertDialogTitle className="text-2xl font-black text-primary-foreground font-jakarta">
                לממש פרס? ✨
              </AlertDialogTitle>
            </div>

            <AlertDialogDescription asChild>
              <div className="p-6">
                {selectedReward && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="text-xl font-black text-foreground font-jakarta mb-1">
                        {selectedReward.title}
                      </h4>
                      <p className="text-muted-foreground text-sm font-jakarta">
                        {selectedReward.description}
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-jakarta text-sm">עלות:</span>
                        <div className="flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-warning" fill="currentColor" />
                          <span className="font-black text-foreground font-jakarta">
                            {selectedReward.points} נקודות
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-muted-foreground font-jakarta text-sm">יתרה לאחר מימוש:</span>
                        <span className="font-black text-primary font-jakarta">
                          {totalPoints - selectedReward.points} נקודות
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>

            <AlertDialogFooter className="p-4 pt-0 flex gap-3">
              <AlertDialogCancel className="flex-1 rounded-xl font-jakarta h-12 border-border">
                ביטול
              </AlertDialogCancel>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={confirmRedemption}
                className="flex-[2] h-12 bg-gradient-primary text-primary-foreground rounded-xl font-black font-jakarta shadow-lg shadow-primary/20"
              >
                אישור מימוש 🎉
              </motion.button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageTransition>
  );
};

export default Rewards;
