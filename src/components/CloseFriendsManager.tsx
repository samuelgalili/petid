import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Star, Search, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface CloseFriendsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Friend {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  isCloseFriend: boolean;
}

export const CloseFriendsManager = ({ open, onOpenChange }: CloseFriendsManagerProps) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && user) {
      fetchFriends();
    }
  }, [open, user]);

  const fetchFriends = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get followers
      const { data: followers } = await supabase
        .from('user_follows')
        .select('follower_id')
        .eq('following_id', user.id);

      // Get close friends
      const { data: closeFriends } = await supabase
        .from('close_friends')
        .select('friend_id')
        .eq('user_id', user.id);

      const closeFriendIds = closeFriends?.map(cf => cf.friend_id) || [];
      const followerIds = followers?.map(f => f.follower_id) || [];

      if (followerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', followerIds);

        setFriends(profiles?.map(p => ({
          ...p,
          isCloseFriend: closeFriendIds.includes(p.id)
        })) || []);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCloseFriend = async (friendId: string, isCloseFriend: boolean) => {
    if (!user) return;

    try {
      if (isCloseFriend) {
        await supabase
          .from('close_friends')
          .delete()
          .eq('user_id', user.id)
          .eq('friend_id', friendId);
      } else {
        await supabase
          .from('close_friends')
          .insert({ user_id: user.id, friend_id: friendId });
      }

      setFriends(friends.map(f => 
        f.id === friendId ? { ...f, isCloseFriend: !isCloseFriend } : f
      ));

      toast.success(isCloseFriend ? "הוסר מחברים קרובים" : "נוסף לחברים קרובים");
    } catch (error) {
      console.error("Error toggling close friend:", error);
      toast.error("שגיאה בעדכון");
    }
  };

  const filteredFriends = friends.filter(f => 
    f.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const closeFriendsCount = friends.filter(f => f.isCloseFriend).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
              <Star className="w-4 h-4 text-white" fill="white" />
            </div>
            חברים קרובים
            <span className="text-sm font-normal text-muted-foreground">({closeFriendsCount})</span>
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חפש חברים..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 rounded-xl"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>אין עוקבים עדיין</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredFriends.map((friend) => (
                <motion.div
                  key={friend.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={friend.avatar_url || undefined} />
                    <AvatarFallback>{friend.full_name?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{friend.full_name || "משתמש"}</p>
                  </div>
                  <Button
                    variant={friend.isCloseFriend ? "default" : "outline"}
                    size="sm"
                    className={`rounded-full ${friend.isCloseFriend ? "bg-green-500 hover:bg-green-600" : ""}`}
                    onClick={() => toggleCloseFriend(friend.id, friend.isCloseFriend)}
                  >
                    {friend.isCloseFriend ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Star className="w-4 h-4" />
                    )}
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          סטוריז לחברים קרובים יוצגו רק לאנשים שבחרת
        </p>
      </DialogContent>
    </Dialog>
  );
};