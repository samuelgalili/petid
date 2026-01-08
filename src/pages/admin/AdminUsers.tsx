import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Users, Ban, Unlock, 
  Shield, Store, Heart, Eye, Mail, Trash2, AlertTriangle,
  RefreshCw, Plus, Edit, MessageSquare,
  UserCheck, Crown, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useSensitiveActionRateLimiter } from "@/hooks/useRateLimiter";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { 
  AdminStatCard, 
  AdminStatsGrid, 
  AdminToolbar,
  AdminEmptyState,
  AdminStatusBadge,
  AdminPageHeader,
} from "@/components/admin/AdminStyles";

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
  admin: { label: "מנהל", color: "text-rose-700", bgColor: "bg-rose-500/10", icon: <Shield className="w-3 h-3" /> },
  moderator: { label: "מנהל תוכן", color: "text-orange-700", bgColor: "bg-orange-500/10", icon: <Crown className="w-3 h-3" /> },
  business: { label: "עסק", color: "text-blue-700", bgColor: "bg-blue-500/10", icon: <Building2 className="w-3 h-3" /> },
  org: { label: "עמותה", color: "text-emerald-700", bgColor: "bg-emerald-500/10", icon: <Heart className="w-3 h-3" /> },
  user: { label: "משתמש", color: "text-slate-700", bgColor: "bg-slate-500/10", icon: <UserCheck className="w-3 h-3" /> },
};

const AdminUsers = () => {
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const rateLimiter = useSensitiveActionRateLimiter();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
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
        throw new Error(response.error.message || "מחיקת המשתמש נכשלה");
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

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (roleFilter === "all") return matchesSearch;
    if (roleFilter === "blocked") return matchesSearch && user.blocked_at;
    return matchesSearch && user.roles.includes(roleFilter);
  });

  const activeUsers = users.filter(u => !u.blocked_at).length;
  const blockedUsers = users.filter(u => u.blocked_at).length;
  const adminUsers = users.filter(u => u.roles.includes('admin')).length;
  const businessUsers = users.filter(u => u.roles.includes('business')).length;

  return (
    <AdminLayout title="ניהול משתמשים" icon={Users}>
      <div className="space-y-6">
        {/* Page Header */}
        <AdminPageHeader
          title="ניהול משתמשים"
          description="צפייה וניהול משתמשים רשומים"
          icon={Users}
          onRefresh={() => refetch()}
          isRefreshing={isLoading}
        />

        {/* Stats */}
        <AdminStatsGrid>
          <AdminStatCard
            title="סה״כ משתמשים"
            value={users.length}
            icon={Users}
            color="primary"
          />
          <AdminStatCard
            title="פעילים"
            value={activeUsers}
            icon={UserCheck}
            color="success"
          />
          <AdminStatCard
            title="מנהלים"
            value={adminUsers}
            icon={Shield}
            color="danger"
          />
          <AdminStatCard
            title="חסומים"
            value={blockedUsers}
            icon={Ban}
            color="warning"
          />
        </AdminStatsGrid>

        {/* Toolbar */}
        <AdminToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="חיפוש לפי שם או אימייל..."
          onRefresh={() => refetch()}
          isRefreshing={isLoading}
          onAdd={() => navigate("/auth?signup=true")}
          addLabel="משתמש חדש"
        >
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="סינון לפי תפקיד" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל המשתמשים</SelectItem>
              <SelectItem value="admin">מנהלים</SelectItem>
              <SelectItem value="business">עסקים</SelectItem>
              <SelectItem value="org">עמותות</SelectItem>
              <SelectItem value="blocked">חסומים</SelectItem>
            </SelectContent>
          </Select>
        </AdminToolbar>

        {/* Users List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <AdminEmptyState
            icon={Users}
            title="לא נמצאו משתמשים"
            description={searchQuery ? "נסה לשנות את החיפוש" : "אין משתמשים במערכת"}
          />
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user, index) => {
              const isBlocked = !!user.blocked_at;
              const isAdmin = user.roles.includes('admin');

              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card className={`hover:shadow-md transition-all ${isBlocked ? 'border-rose-200 bg-rose-50/50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {user.full_name?.charAt(0) || user.email?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{user.full_name || "ללא שם"}</p>
                            {isBlocked && (
                              <AdminStatusBadge status="danger" label="חסום" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {user.roles.length === 0 ? (
                              <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">משתמש</span>
                            ) : (
                              user.roles.map((role) => {
                                const config = roleConfig[role] || roleConfig.user;
                                return (
                                  <span key={role} className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${config.bgColor} ${config.color}`}>
                                    {config.icon}
                                    {config.label}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* Created Date */}
                        <div className="hidden md:block text-sm text-muted-foreground">
                          {user.created_at ? format(new Date(user.created_at), "dd/MM/yyyy", { locale: he }) : "-"}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => navigate(`/user/${user.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => {
                              if (user.email) {
                                window.location.href = `mailto:${user.email}`;
                              }
                            }}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => navigate(`/messages/${user.id}`)}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => navigate("/admin/roles")}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          {isBlocked ? (
                            <Button 
                              size="icon" 
                              variant="ghost"
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => setBlockDialog({ open: true, userId: user.id, action: "unblock" })}
                            >
                              <Unlock className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button 
                              size="icon" 
                              variant="ghost"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => setBlockDialog({ open: true, userId: user.id, action: "block" })}
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Block Dialog */}
        <Dialog open={blockDialog.open} onOpenChange={(open) => setBlockDialog({ open })}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>{blockDialog.action === "block" ? "חסימת משתמש" : "הסרת חסימה"}</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              {blockDialog.action === "block"
                ? "המשתמש לא יוכל לגשת לאפליקציה. האם להמשיך?"
                : "המשתמש יוכל לגשת שוב לאפליקציה. האם להמשיך?"}
            </p>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setBlockDialog({ open: false })}>
                ביטול
              </Button>
              <Button 
                variant={blockDialog.action === "block" ? "destructive" : "default"}
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
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>מחיקת משתמש לצמיתות</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-lg border border-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <p className="text-sm text-rose-700 font-medium">
                  פעולה זו בלתי הפיכה! כל הנתונים של {deleteDialog.userName} יימחקו לצמיתות.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delete-reason">סיבת המחיקה (חובה)</Label>
                <Input
                  id="delete-reason"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="הזן סיבה למחיקה..."
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setDeleteDialog({ open: false })}>
                ביטול
              </Button>
              <Button 
                variant="destructive"
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
    </AdminLayout>
  );
};

export default AdminUsers;
