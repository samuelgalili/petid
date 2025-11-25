import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { Gift, Sparkles, ShoppingBag, Percent, Tag, Star, Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const { totalPoints, deductPoints } = usePoints();
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const [availableRewards, setAvailableRewards] = useState<Reward[]>([]);
  const [redeemedRewards, setRedeemedRewards] = useState<RedeemedReward[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch available rewards from database
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
          title: "Error loading rewards",
          description: "Could not load available rewards. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRewards();
  }, [toast]);

  // Fetch user's redeemed rewards from database
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

  const confirmRedemption = async () => {
    if (!selectedReward) return;

    if (totalPoints < selectedReward.points) {
      toast({
        title: "Not enough points",
        description: `You need ${selectedReward.points - totalPoints} more points to redeem this reward.`,
        variant: "destructive",
      });
      setShowRedeemDialog(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to redeem rewards.",
          variant: "destructive",
        });
        return;
      }

      // Deduct points first
      await deductPoints(selectedReward.points);

      // Generate redemption code
      const code = `${selectedReward.type.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Calculate expiration date (30 days from now)
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Save redemption to database
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

      // Add to local state
      const newRedemption: RedeemedReward = {
        ...selectedReward,
        redeemedAt: new Date().toISOString().split("T")[0],
        code,
        status: "active",
        expires: expiresAt.toISOString().split("T")[0],
      };

      setRedeemedRewards((prev) => [newRedemption, ...prev]);

      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#F4D35E", "#7DD3C0", "#FFE8D6", "#E8F5E8"],
      });

      toast({
        title: "Reward Redeemed! 🎉",
        description: `Your code: ${code}`,
      });

      setShowRedeemDialog(false);
      setSelectedReward(null);
    } catch (error) {
      console.error('Error redeeming reward:', error);
      toast({
        title: "Redemption failed",
        description: "Could not redeem reward. Please try again.",
        variant: "destructive",
      });
      setShowRedeemDialog(false);
    }
  };

  const getStatusBadge = (status: RedeemedReward["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "used":
        return <Badge variant="secondary">Used</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired</Badge>;
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900 font-jakarta mb-4">Rewards</h1>

            {/* Points Balance Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-[#F4D35E] via-[#FBD66A] to-[#F4E976] rounded-2xl p-6 shadow-lg relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>

              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-white" />
                    <span className="text-white/90 text-sm font-jakarta">Your Points</span>
                  </div>
                  <div className="text-5xl font-bold text-white">{totalPoints}</div>
                  <p className="text-white/80 text-xs mt-2 font-jakarta">
                    Complete tasks to earn more points
                  </p>
                </div>
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Gift className="w-10 h-10 text-white" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6">
          <Tabs defaultValue="available" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="available" className="font-jakarta">
                Available Rewards
              </TabsTrigger>
              <TabsTrigger value="redeemed" className="font-jakarta">
                My Rewards
              </TabsTrigger>
            </TabsList>

            <TabsContent value="available" className="space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Gift className="w-12 h-12 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 font-jakarta">Loading rewards...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {availableRewards.map((reward, index) => (
                    <motion.div
                      key={reward.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                        <div className={`bg-gradient-to-br ${reward.bgGradient} p-4`}>
                          <div className="flex items-start gap-4">
                            <div className="text-5xl">{reward.icon}</div>

                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h3 className="text-lg font-bold text-gray-900 font-jakarta">
                                    {reward.title}
                                  </h3>
                                  <p className="text-sm text-gray-600 font-jakarta">
                                    {reward.description}
                                  </p>
                                </div>
                                <Badge
                                  className={`bg-gradient-to-br ${reward.color} text-white border-0 whitespace-nowrap`}
                                >
                                  {reward.value}
                                </Badge>
                              </div>

                              <div className="flex items-center justify-between mt-4">
                                <div className="flex items-center gap-2">
                                  <Star className="w-4 h-4 text-[#F4D35E]" fill="#F4D35E" />
                                  <span className="text-sm font-bold text-gray-900">
                                    {reward.points} points
                                  </span>
                                </div>

                                <Button
                                  onClick={() => handleRedeemReward(reward)}
                                  disabled={totalPoints < reward.points}
                                  className={`bg-gradient-to-r ${reward.color} hover:opacity-90 text-white border-0 font-jakarta font-bold`}
                                >
                                  {totalPoints < reward.points ? "Not Enough Points" : "Redeem"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="redeemed" className="space-y-4">
              {redeemedRewards.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Gift className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 font-jakarta mb-2">
                    No Rewards Yet
                  </h3>
                  <p className="text-sm text-gray-600 font-jakarta">
                    Redeem your first reward to see it here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {redeemedRewards.map((reward, index) => (
                    <motion.div
                      key={`${reward.id}-${reward.redeemedAt}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="overflow-hidden">
                        <div className={`bg-gradient-to-br ${reward.bgGradient} p-4`}>
                          <div className="flex items-start gap-4">
                            <div className="text-4xl">{reward.icon}</div>

                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h3 className="text-base font-bold text-gray-900 font-jakarta">
                                    {reward.title}
                                  </h3>
                                  <p className="text-xs text-gray-600 font-jakarta">
                                    {reward.description}
                                  </p>
                                </div>
                                {getStatusBadge(reward.status)}
                              </div>

                              <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 mt-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-gray-600 font-jakarta">
                                    Redemption Code
                                  </span>
                                  <Tag className="w-4 h-4 text-gray-400" />
                                </div>
                                <code className="text-sm font-bold text-gray-900 font-mono">
                                  {reward.code}
                                </code>
                              </div>

                              <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Redeemed: {reward.redeemedAt}</span>
                                </div>
                                {reward.expires && (
                                  <span className="font-jakarta">Expires: {reward.expires}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Redemption Confirmation Dialog */}
        <AlertDialog open={showRedeemDialog} onOpenChange={setShowRedeemDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-jakarta">Redeem Reward?</AlertDialogTitle>
              <AlertDialogDescription className="font-jakarta">
                {selectedReward && (
                  <div className="space-y-4 mt-4">
                    <div className="flex items-center gap-4">
                      <div className="text-5xl">{selectedReward.icon}</div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">{selectedReward.title}</h4>
                        <p className="text-sm text-gray-600">{selectedReward.description}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cost:</span>
                        <span className="font-bold text-gray-900">
                          {selectedReward.points} points
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Your Balance:</span>
                        <span className="font-bold text-gray-900">{totalPoints} points</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
                        <span className="text-gray-600">After Redemption:</span>
                        <span className="font-bold text-[#7DD3C0]">
                          {totalPoints - selectedReward.points} points
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500">
                      You'll receive a redemption code that can be used at checkout.
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-jakarta">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmRedemption}
                className="bg-gradient-to-r from-[#7DD3C0] to-[#6BC4AD] hover:opacity-90 font-jakarta"
              >
                Confirm Redemption
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Rewards;