import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Bell, Send, Users, User, Plus, Trash2, 
  Check, Clock, AlertCircle
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface NotificationData {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  title_template: string;
  message_template: string;
  type: string;
}

const AdminNotify = () => {
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("send");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [notification, setNotification] = useState({
    title: "",
    message: "",
    type: "general",
    target: "all" as "all" | "role" | "user",
    targetRole: "",
    targetUserId: "",
  });

  const { data: recentNotifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ["admin-recent-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as NotificationData[];
    },
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["admin-notification-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_templates" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as NotificationTemplate[];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users-for-notify"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .limit(500);

      if (error) throw error;
      return data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (data: typeof notification) => {
      let userIds: string[] = [];

      if (data.target === "all") {
        const { data: allUsers } = await supabase.from("profiles").select("id");
        userIds = allUsers?.map((u) => u.id) || [];
      } else if (data.target === "role" && data.targetRole) {
        const { data: roleUsers } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", data.targetRole as any);
        userIds = roleUsers?.map((r) => r.user_id) || [];
      } else if (data.target === "user" && data.targetUserId) {
        userIds = [data.targetUserId];
      }

      if (userIds.length === 0) {
        throw new Error("לא נמצאו נמענים");
      }

      const notifications = userIds.map((userId) => ({
        user_id: userId,
        title: data.title,
        message: data.message,
        type: data.type,
        is_read: false,
      }));

      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) throw error;

      await logAction({
        action_type: "notification.sent",
        entity_type: "notification",
        metadata: {
          recipients_count: userIds.length,
          target: data.target,
        },
      });

      return userIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["admin-recent-notifications"] });
      toast({ title: "ההתראה נשלחה", description: `נשלח ל-${count} משתמשים` });
      setNotification({
        title: "",
        message: "",
        type: "general",
        target: "all",
        targetRole: "",
        targetUserId: "",
      });
    },
    onError: (error: Error) => {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    },
  });

  const applyTemplate = (template: NotificationTemplate) => {
    setNotification((prev) => ({
      ...prev,
      title: template.title_template,
      message: template.message_template,
      type: template.type,
    }));
    toast({ title: "התבנית הוחלה" });
  };

  const notificationColumns: Column<NotificationData>[] = [
    {
      key: "title",
      header: "כותרת",
      render: (n) => (
        <div>
          <p className="font-medium">{n.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{n.message}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "סוג",
      render: (n) => (
        <Badge variant="outline" className="text-xs">
          {n.type === "general" ? "כללי" : n.type === "adoption" ? "אימוץ" : n.type}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "סטטוס",
      render: (n) => (
        n.is_read ? (
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
            <Check className="w-3 h-3 ml-1" />
            נקרא
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
            <Clock className="w-3 h-3 ml-1" />
            לא נקרא
          </Badge>
        )
      ),
    },
    {
      key: "created_at",
      header: "תאריך",
      sortable: true,
      render: (n) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(n.created_at), "d בMMM yyyy, HH:mm", { locale: he })}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout title="שליחת התראות" breadcrumbs={[{ label: "התראות" }]}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="send" className="gap-2">
            <Send className="w-4 h-4" />
            שליחה
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Bell className="w-4 h-4" />
            היסטוריה
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <AlertCircle className="w-4 h-4" />
            תבניות
          </TabsTrigger>
        </TabsList>

        {/* Send Tab */}
        <TabsContent value="send">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="p-6">
                <h2 className="text-lg font-bold mb-4">שליחת התראה חדשה</h2>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  sendMutation.mutate(notification);
                }} className="space-y-4">
                  <div>
                    <Label>כותרת *</Label>
                    <Input
                      value={notification.title}
                      onChange={(e) => setNotification({ ...notification, title: e.target.value })}
                      placeholder="הזן כותרת..."
                      required
                    />
                  </div>

                  <div>
                    <Label>תוכן ההודעה *</Label>
                    <Textarea
                      value={notification.message}
                      onChange={(e) => setNotification({ ...notification, message: e.target.value })}
                      placeholder="הזן את תוכן ההודעה..."
                      rows={4}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>סוג התראה</Label>
                      <Select 
                        value={notification.type} 
                        onValueChange={(value) => setNotification({ ...notification, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">כללי</SelectItem>
                          <SelectItem value="promo">מבצע</SelectItem>
                          <SelectItem value="update">עדכון</SelectItem>
                          <SelectItem value="alert">התראה</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>נמענים</Label>
                      <Select 
                        value={notification.target} 
                        onValueChange={(value: "all" | "role" | "user") => setNotification({ ...notification, target: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">כל המשתמשים</SelectItem>
                          <SelectItem value="role">לפי תפקיד</SelectItem>
                          <SelectItem value="user">משתמש ספציפי</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {notification.target === "role" && (
                    <div>
                      <Label>תפקיד</Label>
                      <Select 
                        value={notification.targetRole} 
                        onValueChange={(value) => setNotification({ ...notification, targetRole: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר תפקיד" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">משתמשים</SelectItem>
                          <SelectItem value="business">עסקים</SelectItem>
                          <SelectItem value="org">עמותות</SelectItem>
                          <SelectItem value="admin">מנהלים</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {notification.target === "user" && (
                    <div>
                      <Label>משתמש</Label>
                      <Select 
                        value={notification.targetUserId} 
                        onValueChange={(value) => setNotification({ ...notification, targetUserId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר משתמש" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={sendMutation.isPending}
                  >
                    <Send className="w-4 h-4 ml-2" />
                    {sendMutation.isPending ? "שולח..." : "שלח התראה"}
                  </Button>
                </form>
              </Card>
            </div>

            <div>
              <Card className="p-4">
                <h3 className="font-medium mb-3">תבניות מהירות</h3>
                <div className="space-y-2">
                  {templates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">אין תבניות</p>
                  ) : (
                    templates.slice(0, 5).map((template) => (
                      <Button
                        key={template.id}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-right"
                        onClick={() => applyTemplate(template)}
                      >
                        {template.name}
                      </Button>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <DataTable
            data={recentNotifications}
            columns={notificationColumns}
            loading={notificationsLoading}
            searchPlaceholder="חיפוש לפי כותרת..."
            searchKey={(item, query) => 
              item.title.toLowerCase().includes(query.toLowerCase())
            }
            emptyIcon={<Bell className="w-12 h-12" />}
            emptyMessage="אין התראות"
            pageSize={20}
          />
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 ml-2" />
              צור תבנית
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="p-4">
                <h3 className="font-medium mb-2">{template.name}</h3>
                <p className="text-sm font-medium">{template.title_template}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{template.message_template}</p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => applyTemplate(template)}>
                    השתמש
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {templates.length === 0 && !templatesLoading && (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-2" />
              <p>אין תבניות עדיין</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Template Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>יצירת תבנית חדשה</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            יצירת תבניות תהיה זמינה בקרוב
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminNotify;
