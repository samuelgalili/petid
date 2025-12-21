import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Users, Search, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface CollaborativePostInviteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId?: string;
  onCollaboratorAdded?: (userId: string) => void;
}

interface User {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  isPending?: boolean;
}

export const CollaborativePostInvite = ({ 
  open, 
  onOpenChange, 
  postId,
  onCollaboratorAdded 
}: CollaborativePostInviteProps) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  useEffect(() => {
    if (search.length >= 2) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [search]);

  const searchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .neq('id', user?.id || '')
        .ilike('full_name', `%${search}%`)
        .limit(10);

      // If we have a postId, check existing collaborators
      if (postId && data) {
        const { data: collaborators } = await supabase
          .from('post_collaborators')
          .select('collaborator_id, status')
          .eq('post_id', postId);

        const collaboratorMap = new Map(
          collaborators?.map(c => [c.collaborator_id, c.status]) || []
        );

        setUsers(data.map(u => ({
          ...u,
          isPending: collaboratorMap.get(u.id) === 'pending'
        })));
      } else {
        setUsers(data || []);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const inviteCollaborator = async (collaboratorId: string) => {
    if (!user) return;
    setInviting(collaboratorId);

    try {
      if (postId) {
        // Add to existing post
        const { error } = await supabase
          .from('post_collaborators')
          .insert({
            post_id: postId,
            collaborator_id: collaboratorId,
            status: 'pending'
          });

        if (error) throw error;
      }

      onCollaboratorAdded?.(collaboratorId);
      toast.success("הזמנה לשיתוף נשלחה!");
      
      setUsers(users.map(u => 
        u.id === collaboratorId ? { ...u, isPending: true } : u
      ));
    } catch (error: any) {
      console.error("Error inviting collaborator:", error);
      if (error.code === '23505') {
        toast.error("משתמש זה כבר הוזמן");
      } else {
        toast.error("שגיאה בשליחת ההזמנה");
      }
    } finally {
      setInviting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            הזמן שותף לפוסט
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חפש משתמשים..."
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
          ) : search.length < 2 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>הקלד שם לחיפוש</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>לא נמצאו משתמשים</p>
            </div>
          ) : (
            <AnimatePresence>
              {users.map((u) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback>{u.full_name?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{u.full_name || "משתמש"}</p>
                  </div>
                  <Button
                    variant={u.isPending ? "secondary" : "default"}
                    size="sm"
                    className="rounded-full"
                    onClick={() => inviteCollaborator(u.id)}
                    disabled={u.isPending || inviting === u.id}
                  >
                    {inviting === u.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : u.isPending ? (
                      <>
                        <Check className="w-4 h-4 ml-1" />
                        ממתין
                      </>
                    ) : (
                      "הזמן"
                    )}
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          השותף יצטרך לאשר את ההזמנה לפני שהפוסט יפורסם
        </p>
      </DialogContent>
    </Dialog>
  );
};