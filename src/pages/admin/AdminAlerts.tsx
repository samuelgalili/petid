import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  AlertTriangle, 
  Package, 
  Clock,
  Settings,
  Check,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";

const AdminAlerts = () => {
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['system-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_alerts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('system_alerts')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-alerts'] });
    }
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('system_alerts')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-alerts'] });
      toast.success('ההתראה נדחתה');
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('system_alerts')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-alerts'] });
      toast.success('כל ההתראות סומנו כנקראו');
    }
  });

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, { className: string; text: string }> = {
      low: { className: 'bg-gray-100 text-gray-700', text: 'נמוך' },
      medium: { className: 'bg-yellow-100 text-yellow-700', text: 'בינוני' },
      high: { className: 'bg-orange-100 text-orange-700', text: 'גבוה' },
      critical: { className: 'bg-red-100 text-red-700', text: 'קריטי' }
    };
    const style = styles[severity] || styles.medium;
    return <Badge className={style.className}>{style.text}</Badge>;
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
        return <Package className="h-5 w-5 text-orange-500" />;
      case 'order_stuck':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'payment_failed':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'system':
        return <Settings className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const activeAlerts = alerts?.filter(a => !a.dismissed_at) || [];
  const unreadCount = activeAlerts.filter(a => !a.is_read).length;
  const criticalCount = activeAlerts.filter(a => a.severity === 'critical' && !a.is_read).length;

  return (
    <AdminLayout title="התראות מערכת">
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">התראות מערכת</h1>
            <p className="text-muted-foreground">ניהול התראות ומוניטורינג</p>
          </div>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={unreadCount === 0}
          >
            <Check className="h-4 w-4" />
            סמן הכל כנקרא
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Bell className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeAlerts.length}</p>
                <p className="text-sm text-muted-foreground">סה"כ התראות</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadCount}</p>
                <p className="text-sm text-muted-foreground">לא נקראו</p>
              </div>
            </CardContent>
          </Card>
          <Card className={criticalCount > 0 ? 'border-red-500' : ''}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
                <p className="text-sm text-muted-foreground">קריטיות</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alerts?.filter(a => a.dismissed_at).length || 0}</p>
                <p className="text-sm text-muted-foreground">נדחו</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              התראות פעילות
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : activeAlerts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>אין התראות פעילות</p>
              </div>
            ) : (
              <AnimatePresence>
                <div className="space-y-3">
                  {activeAlerts.map((alert) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={`p-4 rounded-lg border ${
                        !alert.is_read ? 'bg-primary/5 border-primary/20' : ''
                      } ${alert.severity === 'critical' ? 'border-red-300 bg-red-50' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          {getAlertIcon(alert.alert_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{alert.title}</h4>
                            {getSeverityBadge(alert.severity || 'medium')}
                            {!alert.is_read && (
                              <Badge variant="secondary" className="text-xs">חדש</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(alert.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {!alert.is_read && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => markAsReadMutation.mutate(alert.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {alert.action_required && (
                            <Button size="sm" variant="outline">
                              טפל
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => dismissMutation.mutate(alert.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAlerts;
