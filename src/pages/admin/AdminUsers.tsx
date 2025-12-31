import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, Ban, Unlock, Key, MoreHorizontal, 
  Shield, Store, Heart, Eye, Mail, Trash2, AlertTriangle
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, Column, FilterOption } from "@/components/admin/DataTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useSensitiveActionRateLimiter } from "@/hooks/useRateLimiter";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface UserData {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  blocked_at: string | null;
  roles: string[];
}

const AdminUsers = () => {
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const rateLimiter = useSensitiveActionRateLimiter();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; userId?: string; action?: "block" | "unblock" }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId?: string; userName?: string }>({ open: false });
  const [deleteReason, setDeleteReason] = useState("");

  const { data: users = [], isLoading } = useQuery({
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

  const bulkBlockMutation = useMutation({
    mutationFn: async (block: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      for (const userId of selectedUsers) {
        await supabase
          .from("profiles")
          .update({
            blocked_at: block ? new Date().toISOString() : null,
            blocked_by: block ? user?.id : null,
          })
          .eq("id", userId);

        await logAction({
          action_type: block ? "user.blocked" : "user.unblocked",
          entity_type: "user",
          entity_id: userId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: `${selectedUsers.length} משתמשים עודכנו` });
      setSelectedUsers([]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      // Client-side rate limiting check
      if (!rateLimiter.isAllowed()) {
        throw new Error("יותר מדי פעולות. נסה שוב בעוד דקה.");
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("לא מחובר");
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
      toast({ 
        title: "המשתמש נמחק", 
        description: "כל הנתונים נמחקו לצמיתות" 
      });
      setDeleteDialog({ open: false });
      setDeleteReason("");
    },
    onError: (error: Error) => {
      toast({ 
        title: "שגיאה", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin": return <Shield className="w-3 h-3" />;
      case "business": return <Store className="w-3 h-3" />;
      case "org": return <Heart className="w-3 h-3" />;
      default: return <Users className="w-3 h-3" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-700 border-red-200";
      case "business": return "bg-blue-100 text-blue-700 border-blue-200";
      case "org": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const columns: Column<UserData>[] = [
    {
      key: "user",
      header: "משתמש",
      render: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback>{user.full_name?.charAt(0) || user.email?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.full_name || "ללא שם"}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "roles",
      header: "תפקידים",
      render: (user) => (
        <div className="flex flex-wrap gap-1">
          {user.roles.length === 0 ? (
            <Badge variant="outline" className="text-xs">משתמש</Badge>
          ) : (
            user.roles.map((role) => (
              <Badge key={role} variant="outline" className={`text-xs ${getRoleBadgeColor(role)}`}>
                {getRoleIcon(role)}
                <span className="mr-1">
                  {role === "admin" ? "מנהל" : role === "business" ? "עסק" : role === "org" ? "עמותה" : "משתמש"}
                </span>
              </Badge>
            ))
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "סטטוס",
      render: (user) => (
        user.blocked_at ? (
          <Badge variant="destructive" className="text-xs">
            <Ban className="w-3 h-3 ml-1" />
            חסום
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
            פעיל
          </Badge>
        )
      ),
    },
    {
      key: "created_at",
      header: "תאריך הרשמה",
      sortable: true,
      render: (user) => (
        <span className="text-sm text-muted-foreground">
          {user.created_at ? format(new Date(user.created_at), "d בMMM yyyy", { locale: he }) : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (user) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/user/${user.id}`)}>
              <Eye className="w-4 h-4 ml-2" />
              צפייה בפרופיל
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin/roles")}>
              <Shield className="w-4 h-4 ml-2" />
              ניהול תפקידים
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {user.blocked_at ? (
              <DropdownMenuItem onClick={() => setBlockDialog({ open: true, userId: user.id, action: "unblock" })}>
                <Unlock className="w-4 h-4 ml-2" />
                הסר חסימה
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem 
                onClick={() => setBlockDialog({ open: true, userId: user.id, action: "block" })}
                className="text-destructive"
              >
                <Ban className="w-4 h-4 ml-2" />
                חסום משתמש
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setDeleteDialog({ 
                open: true, 
                userId: user.id, 
                userName: user.full_name || user.email || "משתמש" 
              })}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              מחק משתמש לצמיתות
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filters: FilterOption[] = [
    {
      key: "status",
      label: "סטטוס",
      options: [
        { value: "active", label: "פעילים" },
        { value: "blocked", label: "חסומים" },
      ],
    },
  ];

  const filteredUsers = users.filter((user) => {
    // Additional filtering logic can be added here
    return true;
  });

  return (
    <AdminLayout title="ניהול משתמשים" breadcrumbs={[{ label: "משתמשים" }]}>
      <DataTable
        data={filteredUsers}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="חיפוש לפי שם או אימייל..."
        searchKey={(item, query) => 
          (item.full_name?.toLowerCase().includes(query.toLowerCase()) || 
           item.email?.toLowerCase().includes(query.toLowerCase())) ?? false
        }
        selectable
        selectedItems={selectedUsers}
        onSelectionChange={setSelectedUsers}
        emptyIcon={<Users className="w-12 h-12" />}
        emptyMessage="לא נמצאו משתמשים"
        bulkActions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => bulkBlockMutation.mutate(true)}
              disabled={bulkBlockMutation.isPending}
            >
              <Ban className="w-4 h-4 ml-1" />
              חסום נבחרים
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkBlockMutation.mutate(false)}
              disabled={bulkBlockMutation.isPending}
            >
              <Unlock className="w-4 h-4 ml-1" />
              הסר חסימה
            </Button>
          </div>
        }
      />

      <ConfirmDialog
        open={blockDialog.open}
        onOpenChange={(open) => setBlockDialog({ open })}
        title={blockDialog.action === "block" ? "חסימת משתמש" : "הסרת חסימה"}
        description={
          blockDialog.action === "block"
            ? "המשתמש לא יוכל לגשת לאפליקציה. האם להמשיך?"
            : "המשתמש יוכל לגשת שוב לאפליקציה. האם להמשיך?"
        }
        confirmLabel={blockDialog.action === "block" ? "חסום" : "הסר חסימה"}
        variant={blockDialog.action === "block" ? "destructive" : "default"}
        loading={blockMutation.isPending}
        onConfirm={() => {
          if (blockDialog.userId && blockDialog.action) {
            blockMutation.mutate({
              userId: blockDialog.userId,
              block: blockDialog.action === "block",
            });
          }
        }}
        icon={blockDialog.action === "block" ? <Ban className="w-5 h-5 text-destructive" /> : <Unlock className="w-5 h-5" />}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          setDeleteDialog({ open });
          if (!open) setDeleteReason("");
        }}
        title="מחיקת משתמש לצמיתות"
        description={
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive font-medium">
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
                dir="rtl"
              />
            </div>
          </div>
        }
        confirmLabel="מחק לצמיתות"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteDialog.userId && deleteReason.trim()) {
            deleteMutation.mutate({
              userId: deleteDialog.userId,
              reason: deleteReason.trim(),
            });
          }
        }}
        icon={<Trash2 className="w-5 h-5 text-destructive" />}
      />
    </AdminLayout>
  );
};

export default AdminUsers;
