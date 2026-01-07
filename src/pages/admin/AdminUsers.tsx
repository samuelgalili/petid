import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Users, Ban, Unlock, MoreHorizontal, 
  Shield, Store, Heart, Eye, Mail, Trash2, AlertTriangle,
  Search, ArrowLeft, RefreshCw, Plus, Filter, Edit, MessageSquare,
  UserCheck, Crown, Building2, MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useSensitiveActionRateLimiter } from "@/hooks/useRateLimiter";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface UserData {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  blocked_at: string | null;
  roles: string[];
}

const roleConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  admin: { label: "מנהל", color: "text-red-100", bgColor: "bg-red-500", icon: <Shield className="w-3 h-3" /> },
  moderator: { label: "מנהל תוכן", color: "text-orange-100", bgColor: "bg-orange-500", icon: <Crown className="w-3 h-3" /> },
  business: { label: "עסק", color: "text-blue-100", bgColor: "bg-blue-500", icon: <Building2 className="w-3 h-3" /> },
  org: { label: "עמותה", color: "text-green-100", bgColor: "bg-green-500", icon: <Heart className="w-3 h-3" /> },
  user: { label: "משתמש", color: "text-slate-100", bgColor: "bg-slate-600", icon: <UserCheck className="w-3 h-3" /> },
};

const AdminUsers = () => {
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const rateLimiter = useSensitiveActionRateLimiter();
  const [searchQuery, setSearchQuery] = useState("");
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; userId?: string; action?: "block" | "unblock" }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId?: string; userName?: string }>({ open: false });
  const [deleteReason, setDeleteReason] = useState("");

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, created_at, blocked_at");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      return (profiles || []).map((profile) => ({
        ...profile,
        roles: (roles || [])
          .filter((r) => r.user_id === profile.id)
          .map((r) => r.role),
      })) as UserData[];
    },
  });

  const blockMutation = useMutation({
    mutationFn: async ({ userId, block }: { userId: string; block: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("profiles")
        .update({
          blocked_at: block ? new Date().toISOString() : null,
          blocked_by: block ? user?.id : null,
          blocked_reason: block ? "חסימה על ידי מנהל" : null,
        })
        .eq("id", userId);

      if (error) throw error;

      await logAction({
        action_type: block ? "user.blocked" : "user.unblocked",
        entity_type: "user",
        entity_id: userId,
      });
    },
    onSuccess: (_, { block }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: block ? "המשתמש נחסם" : "החסימה הוסרה" });
      setBlockDialog({ open: false });
    },
    onError: () => {
      toast({ title: "שגיאה", description: "הפעולה נכשלה", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      if (!rateLimiter.isAllowed()) {
        throw new Error("יותר מדי פעולות. נסה שוב בעוד דקה.");
      }

      const response = await supabase.functions.invoke("delete-user", {
        body: { userId, reason },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to delete user");
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "המשתמש נמחק", description: "כל הנתונים נמחקו לצמיתות" });
      setDeleteDialog({ open: false });
      setDeleteReason("");
    },
    onError: (error: Error) => {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    },
  });

  const filteredUsers = users.filter((user) =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeUsers = users.filter(u => !u.blocked_at).length;
  const blockedUsers = users.filter(u => u.blocked_at).length;
  const adminUsers = users.filter(u => u.roles.includes('admin')).length;
  const businessUsers = users.filter(u => u.roles.includes('business')).length;

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="flex items-center justify-between px-4 py-4">
          <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700" onClick={() => navigate("/admin/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white">NARTINA</h1>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Actions Bar */}
        <div className="px-4 pb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white gap-2">
              <Plus className="w-4 h-4" />
              משתמש חדש
            </Button>
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-2">
              <Filter className="w-4 h-4" />
              פילטר
            </Button>
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="חיפוש לפי שם או אימייל..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pr-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400" 
            />
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-4 py-4 grid grid-cols-4 gap-3">
        <Card className="bg-emerald-500 border-none p-4 flex items-center justify-between">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{users.length}</p>
            <p className="text-sm text-white/80">סה"כ משתמשים</p>
          </div>
          <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </Card>

        <Card className="bg-cyan-500 border-none p-4 flex items-center justify-between">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-white" />
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{activeUsers}</p>
            <p className="text-sm text-white/80">פעילים</p>
          </div>
          <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </Card>

        <Card className="bg-red-500 border-none p-4 flex items-center justify-between">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{adminUsers}</p>
            <p className="text-sm text-white/80">מנהלים</p>
          </div>
          <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </Card>

        <Card className="bg-slate-600 border-none p-4 flex items-center justify-between">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Ban className="w-5 h-5 text-white" />
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{blockedUsers}</p>
            <p className="text-sm text-white/80">חסומים</p>
          </div>
          <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </Card>
      </div>

      {/* Table */}
      <div className="px-4">
        <div className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700">
          {/* Table Header */}
          <div className="grid grid-cols-[auto_1fr_200px_1fr_120px_120px_auto_auto_auto_auto_auto_80px] gap-2 px-4 py-3 bg-slate-800 text-slate-400 text-sm font-medium border-b border-slate-700">
            <div></div>
            <div>שם משתמש</div>
            <div>אימייל</div>
            <div>תפקידים</div>
            <div>תאריך הרשמה</div>
            <div>סטטוס</div>
            <div>צפייה</div>
            <div>מייל</div>
            <div>הודעה</div>
            <div>עריכה</div>
            <div>חסימה</div>
            <div></div>
          </div>

          {/* Table Body */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Users className="w-16 h-16 mb-4 opacity-50" />
              <p>לא נמצאו משתמשים</p>
            </div>
          ) : (
            filteredUsers.map((user, index) => {
              const isBlocked = !!user.blocked_at;
              const isAdmin = user.roles.includes('admin');

              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="grid grid-cols-[auto_1fr_200px_1fr_120px_120px_auto_auto_auto_auto_auto_80px] gap-2 px-4 py-3 items-center border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors relative"
                >
                  {/* Left Color Strip */}
                  <div className={`absolute right-0 top-0 bottom-0 w-1 ${isBlocked ? 'bg-red-500' : isAdmin ? 'bg-amber-500' : 'bg-emerald-500'}`} />

                  {/* Avatar */}
                  <div className="pr-4">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-purple-500 text-white">
                        {user.full_name?.charAt(0) || user.email?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Name */}
                  <div className="text-white font-medium">{user.full_name || "ללא שם"}</div>

                  {/* Email */}
                  <div className="text-slate-300 text-sm truncate">{user.email}</div>

                  {/* Roles */}
                  <div className="flex flex-wrap gap-1">
                    {user.roles.length === 0 ? (
                      <Badge variant="outline" className="text-xs border-slate-500 text-slate-400">משתמש</Badge>
                    ) : (
                      user.roles.map((role) => {
                        const config = roleConfig[role] || roleConfig.user;
                        return (
                          <Badge key={role} className={`${config.bgColor} ${config.color} border-none text-xs flex items-center gap-1`}>
                            {config.icon}
                            {config.label}
                          </Badge>
                        );
                      })
                    )}
                  </div>

                  {/* Created At */}
                  <div className="text-slate-300 text-sm">
                    {user.created_at ? format(new Date(user.created_at), "dd/MM/yyyy", { locale: he }) : "-"}
                  </div>

                  {/* Status */}
                  <div>
                    {isBlocked ? (
                      <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs">
                        <Ban className="w-3 h-3 ml-1" />
                        חסום
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">
                        פעיל
                      </Badge>
                    )}
                  </div>

                  {/* View Button */}
                  <div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-slate-300"
                      onClick={() => navigate(`/user/${user.id}`)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Mail Button */}
                  <div>
                    <Button size="icon" variant="ghost" className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-slate-300">
                      <Mail className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Message Button */}
                  <div>
                    <Button size="icon" variant="ghost" className="w-8 h-8 bg-purple-600 hover:bg-purple-500 text-white">
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Edit Button */}
                  <div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="w-8 h-8 bg-cyan-600 hover:bg-cyan-500 text-white"
                      onClick={() => navigate("/admin/roles")}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Block/Unblock Button */}
                  <div>
                    {isBlocked ? (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="w-8 h-8 bg-emerald-600 hover:bg-emerald-500 text-white"
                        onClick={() => setBlockDialog({ open: true, userId: user.id, action: "unblock" })}
                      >
                        <Unlock className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="w-8 h-8 bg-red-600 hover:bg-red-500 text-white"
                        onClick={() => setBlockDialog({ open: true, userId: user.id, action: "block" })}
                      >
                        <Ban className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Indicator */}
                  <div className="flex justify-center">
                    <div className={`w-3 h-3 rounded-full ${isBlocked ? 'bg-red-500' : isAdmin ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Block Dialog */}
      <Dialog open={blockDialog.open} onOpenChange={(open) => setBlockDialog({ open })}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white" dir="rtl">
          <DialogHeader>
            <DialogTitle>{blockDialog.action === "block" ? "חסימת משתמש" : "הסרת חסימה"}</DialogTitle>
          </DialogHeader>
          <p className="text-slate-300">
            {blockDialog.action === "block"
              ? "המשתמש לא יוכל לגשת לאפליקציה. האם להמשיך?"
              : "המשתמש יוכל לגשת שוב לאפליקציה. האם להמשיך?"}
          </p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => setBlockDialog({ open: false })}>
              ביטול
            </Button>
            <Button 
              className={blockDialog.action === "block" ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"}
              onClick={() => {
                if (blockDialog.userId && blockDialog.action) {
                  blockMutation.mutate({ userId: blockDialog.userId, block: blockDialog.action === "block" });
                }
              }}
              disabled={blockMutation.isPending}
            >
              {blockDialog.action === "block" ? "חסום" : "הסר חסימה"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => { setDeleteDialog({ open }); if (!open) setDeleteReason(""); }}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white" dir="rtl">
          <DialogHeader>
            <DialogTitle>מחיקת משתמש לצמיתות</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400 font-medium">
                פעולה זו בלתי הפיכה! כל הנתונים של {deleteDialog.userName} יימחקו לצמיתות.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-reason" className="text-slate-300">סיבת המחיקה (חובה)</Label>
              <Input
                id="delete-reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="הזן סיבה למחיקה..."
                className="bg-slate-700 border-slate-600"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => setDeleteDialog({ open: false })}>
              ביטול
            </Button>
            <Button 
              className="bg-red-500 hover:bg-red-600"
              onClick={() => {
                if (deleteDialog.userId && deleteReason.trim()) {
                  deleteMutation.mutate({ userId: deleteDialog.userId, reason: deleteReason.trim() });
                }
              }}
              disabled={deleteMutation.isPending || !deleteReason.trim()}
            >
              מחק לצמיתות
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
