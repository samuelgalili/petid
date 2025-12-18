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

      const code = `${selectedReward.type.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
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
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600">
            פג תוקף
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div 
            className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-orange-400 p-[3px]"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <Gift className="w-8 h-8 text-purple-500" />
            </div>
          </motion.div>
          <p className="text-gray-600 font-jakarta font-medium">טוען פרסים...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-purple-50/50 via-pink-50/30 to-orange-50/50 pb-24" dir="rtl">
        {/* Instagram-style Header */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
          <div className="flex items-center justify-between px-4 py-3">
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            
            <div className="flex items-center gap-2">
              <span className="text-xl font-black bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 bg-clip-text text-transparent font-jakarta">
                פרסים והטבות
              </span>
              <Sparkles className="w-5 h-5 text-purple-500" />
            </div>
            
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-orange-400 p-[2px]">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <Gift className="w-4 h-4 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4">
          {/* Points Balance Card - Instagram Story Style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 p-6 mb-6 shadow-xl shadow-purple-200/50"
          >
            {/* Decorative circles */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-yellow-300" />
                  <span className="text-white/90 text-sm font-jakarta">הנקודות שלך</span>
                </div>
                <motion.div 
                  className="text-5xl font-black text-white"
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  {totalPoints}
                </motion.div>
                <p className="text-white/70 text-xs mt-2 font-jakarta">
                  השלם משימות לצבירת נקודות נוספות ✨
                </p>
              </div>
              <motion.div 
                className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: 10 }}
              >
                <Trophy className="w-10 h-10 text-yellow-300" />
              </motion.div>
            </div>

            {/* Progress indicator */}
            <div className="mt-4 relative z-10">
              <div className="flex justify-between text-xs text-white/70 mb-1 font-jakarta">
                <span>רמה נוכחית</span>
                <span>{totalPoints}/500 לרמה הבאה</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-yellow-300 to-yellow-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((totalPoints / 500) * 100, 100)}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
            </div>
          </motion.div>

          {/* Instagram-style Tabs */}
          <div className="flex gap-2 mb-6">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab("available")}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold font-jakarta transition-all ${
                activeTab === "available"
                  ? "bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 text-white shadow-lg shadow-purple-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <Gift className="w-4 h-4" />
                פרסים זמינים
              </span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab("redeemed")}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold font-jakarta transition-all ${
                activeTab === "redeemed"
                  ? "bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 text-white shadow-lg shadow-purple-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <Star className="w-4 h-4" />
                הפרסים שלי
                {redeemedRewards.filter(r => r.status === "active").length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {redeemedRewards.filter(r => r.status === "active").length}
                  </span>
                )}
              </span>
            </motion.button>
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
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-tr from-pink-100 to-purple-100 flex items-center justify-center">
                      <Gift className="w-10 h-10 text-purple-300" />
                    </div>
                    <p className="text-gray-500 font-jakarta font-medium">אין פרסים זמינים כרגע</p>
                    <p className="text-gray-400 font-jakarta text-sm mt-1">בדוק שוב מאוחר יותר</p>
                  </motion.div>
                ) : (
                  availableRewards.map((reward, index) => (
                    <motion.div
                      key={reward.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-3xl overflow-hidden shadow-lg shadow-gray-100/80 border border-gray-100"
                    >
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          {/* Icon with gradient ring */}
                          <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-100 via-purple-100 to-orange-100 flex items-center justify-center">
                              <span className="text-4xl">{reward.icon}</span>
                            </div>
                            {totalPoints >= reward.points && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center"
                              >
                                <Zap className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-1">
                              <h3 className="text-lg font-black text-gray-900 font-jakarta">
                                {reward.title}
                              </h3>
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-pink-50 to-purple-50 text-purple-700 border border-purple-100">
                                {reward.value}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 font-jakarta mb-3 line-clamp-2">
                              {reward.description}
                            </p>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 flex items-center justify-center">
                                  <Star className="w-3.5 h-3.5 text-white" fill="white" />
                                </div>
                                <span className="text-sm font-bold text-gray-900 font-jakarta">
                                  {reward.points} נקודות
                                </span>
                              </div>

                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleRedeemReward(reward)}
                                disabled={totalPoints < reward.points}
                                className={`px-5 py-2.5 rounded-xl text-sm font-bold font-jakarta transition-all ${
                                  totalPoints >= reward.points
                                    ? "bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 text-white shadow-lg shadow-purple-200 hover:shadow-xl"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                }`}
                              >
                                {totalPoints >= reward.points ? "מימוש ✨" : `חסרות ${reward.points - totalPoints}`}
                              </motion.button>
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
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-tr from-pink-100 to-purple-100 flex items-center justify-center">
                      <Star className="w-10 h-10 text-purple-300" />
                    </div>
                    <p className="text-gray-500 font-jakarta font-medium">אין פרסים עדיין</p>
                    <p className="text-gray-400 font-jakarta text-sm mt-1">מימשת פרס? הוא יופיע כאן</p>
                  </motion.div>
                ) : (
                  redeemedRewards.map((reward, index) => (
                    <motion.div
                      key={`${reward.id}-${reward.redeemedAt}`}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-3xl overflow-hidden shadow-lg shadow-gray-100/80 border border-gray-100"
                    >
                      {/* Gradient header */}
                      <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{reward.icon}</span>
                            <div>
                              <h3 className="text-white font-black font-jakarta">
                                {reward.title}
                              </h3>
                              <p className="text-white/80 text-xs font-jakarta">
                                {reward.value}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(reward.status)}
                        </div>
                      </div>

                      {/* Code section */}
                      <div className="p-4">
                        <div className="bg-gray-50 rounded-2xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-500 font-jakarta flex items-center gap-1">
                              <Tag className="w-3.5 h-3.5" />
                              קוד מימוש
                            </span>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => copyCode(reward.code)}
                              className="text-purple-600 text-xs font-bold font-jakarta flex items-center gap-1"
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
                          <code className="text-lg font-black text-gray-900 font-mono tracking-wider">
                            {reward.code}
                          </code>
                        </div>

                        <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
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
            <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 p-6 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                className="w-20 h-20 mx-auto mb-3 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                <span className="text-5xl">{selectedReward?.icon}</span>
              </motion.div>
              <AlertDialogTitle className="text-2xl font-black text-white font-jakarta">
                לממש פרס? ✨
              </AlertDialogTitle>
            </div>

            <AlertDialogDescription asChild>
              <div className="p-6">
                {selectedReward && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="text-xl font-black text-gray-900 font-jakarta mb-1">
                        {selectedReward.title}
                      </h4>
                      <p className="text-gray-500 text-sm font-jakarta">
                        {selectedReward.description}
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-pink-50 via-purple-50 to-orange-50 rounded-2xl p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 font-jakarta text-sm">עלות:</span>
                        <div className="flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
                          <span className="font-black text-gray-900 font-jakarta">
                            {selectedReward.points} נקודות
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-gray-600 font-jakarta text-sm">יתרה לאחר מימוש:</span>
                        <span className="font-black text-purple-600 font-jakarta">
                          {totalPoints - selectedReward.points} נקודות
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>

            <AlertDialogFooter className="p-4 pt-0 flex gap-3">
              <AlertDialogCancel className="flex-1 rounded-xl font-jakarta h-12 border-gray-200">
                ביטול
              </AlertDialogCancel>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={confirmRedemption}
                className="flex-[2] h-12 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 text-white rounded-xl font-black font-jakarta shadow-lg shadow-purple-200"
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
