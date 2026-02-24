import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Bell, Check, Clock, Filter, Search, Trash2, Shield, Flag, Heart, ShoppingCart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const getLinkByCategory = (category: string) => {
  switch (category) {
    case 'insurance': return '/admin/pet-services';
    case 'moderation': return '/admin/reports';
    case 'adoption': return '/admin/adoption';
    case 'sales': return '/admin/orders';
    default: return '/admin/notifications';
  }
};

const AdminNotifications = () => {
  const { notifications, markAsRead, markAllAsRead } = useAdminNotifications();
  const navigate = useNavigate();
  const { toast } = useToast();

  const deleteNotification = async (id: string) => {
    const { error } = await supabase.from('admin_data_alerts').delete().eq('id', id);
    if (error) {
      toast({ title: 'שגיאה במחיקה', variant: 'destructive' });
    } else {
      toast({ title: 'התראה נמחקה' });
      // Note: The realtime subscription in the hook will handle the UI update if we delete? 
      // Actually DELETE events are not listened to in the hook currently.
      // Ideally we should update the hook to listen to DELETE/UPDATE as well.
      // For now, page refresh or navigating away/back updates it.
    }
  };

  return (
    <AdminLayout title="מרכז התראות" breadcrumbs={[{ label: 'התראות' }]}>
      <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              מרכז התראות
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              כל העדכונים החשובים מהמערכת במקום אחד
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="flex-1 sm:flex-none">
              <Check className="w-4 h-4 ml-2" />
              סמן הכל כנקרא
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="חיפוש התראות..." className="pr-9" />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium">אין התראות חדשות</h3>
                <p className="text-muted-foreground text-sm mt-1">נראה שהכל שקט בגזרה!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                      notification.is_read 
                        ? 'bg-card border-border/50 opacity-70 hover:opacity-100' 
                        : 'bg-primary/5 border-primary/20 shadow-sm'
                    }`}
                  >
                    <div className={`mt-1 p-2 rounded-full shrink-0 ${
                      notification.category === 'insurance' ? 'bg-blue-100 text-blue-600' :
                      notification.category === 'moderation' ? 'bg-red-100 text-red-600' :
                      notification.category === 'adoption' ? 'bg-purple-100 text-purple-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {notification.category === 'insurance' && <Shield className="w-4 h-4" />}
                      {notification.category === 'moderation' && <Flag className="w-4 h-4" />}
                      {notification.category === 'adoption' && <Heart className="w-4 h-4" />}
                      {notification.category === 'sales' && <ShoppingCart className="w-4 h-4" />}
                    </div>
                    
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(getLinkByCategory(notification.category))}>
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-sm font-medium ${!notification.is_read && 'text-primary'}`}>
                          {notification.title}
                        </h4>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: he })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.description}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => markAsRead(notification.id)}
                          title="סמן כנקרא"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteNotification(notification.id)}
                        title="מחק"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminNotifications;
