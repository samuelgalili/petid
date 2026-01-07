import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Bell, 
  AlertTriangle, 
  Package, 
  TrendingDown,
  Clock,
  Settings,
  Check,
  X,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface Alert {
  id: string;
  type: 'low_stock' | 'order_stuck' | 'payment_failed' | 'system' | 'review';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  isRead: boolean;
  actionRequired: boolean;
  relatedId?: string;
}

interface AlertRule {
  id: string;
  name: string;
  type: string;
  condition: string;
  isActive: boolean;
  channels: string[];
}

const AdminAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'low_stock',
      title: 'מלאי נמוך',
      message: 'המוצר "Royal Canin Medium Adult" ירד מתחת ל-10 יחידות',
      severity: 'high',
      timestamp: new Date(),
      isRead: false,
      actionRequired: true,
      relatedId: 'prod_123'
    },
    {
      id: '2',
      type: 'order_stuck',
      title: 'הזמנה תקועה',
      message: 'הזמנה #12345 ממתינה לטיפול מעל 24 שעות',
      severity: 'medium',
      timestamp: new Date(Date.now() - 3600000),
      isRead: false,
      actionRequired: true,
      relatedId: 'order_12345'
    },
    {
      id: '3',
      type: 'payment_failed',
      title: 'תשלום נכשל',
      message: 'תשלום עבור הזמנה #12346 נכשל - יש לפנות ללקוח',
      severity: 'critical',
      timestamp: new Date(Date.now() - 7200000),
      isRead: true,
      actionRequired: true
    },
    {
      id: '4',
      type: 'review',
      title: 'ביקורת שלילית',
      message: 'התקבלה ביקורת 1 כוכב על מוצר',
      severity: 'low',
      timestamp: new Date(Date.now() - 86400000),
      isRead: true,
      actionRequired: false
    }
  ]);

  const [alertRules, setAlertRules] = useState<AlertRule[]>([
    {
      id: '1',
      name: 'התראת מלאי נמוך',
      type: 'low_stock',
      condition: 'כמות < 10',
      isActive: true,
      channels: ['email', 'push']
    },
    {
      id: '2',
      name: 'הזמנה תקועה',
      type: 'order_stuck',
      condition: 'זמן המתנה > 24 שעות',
      isActive: true,
      channels: ['email']
    },
    {
      id: '3',
      name: 'תשלום נכשל',
      type: 'payment_failed',
      condition: 'סטטוס תשלום = נכשל',
      isActive: true,
      channels: ['email', 'push', 'sms']
    },
    {
      id: '4',
      name: 'ביקורת שלילית',
      type: 'review',
      condition: 'דירוג <= 2',
      isActive: false,
      channels: ['email']
    }
  ]);

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, { className: string; text: string }> = {
      low: { className: 'bg-gray-100 text-gray-700', text: 'נמוך' },
      medium: { className: 'bg-yellow-100 text-yellow-700', text: 'בינוני' },
      high: { className: 'bg-orange-100 text-orange-700', text: 'גבוה' },
      critical: { className: 'bg-red-100 text-red-700', text: 'קריטי' }
    };
    const style = styles[severity] || styles.low;
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

  const markAsRead = (id: string) => {
    setAlerts(alerts.map(a => 
      a.id === id ? { ...a, isRead: true } : a
    ));
  };

  const dismissAlert = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const toggleRule = (id: string) => {
    setAlertRules(alertRules.map(r => 
      r.id === id ? { ...r, isActive: !r.isActive } : r
    ));
  };

  const unreadCount = alerts.filter(a => !a.isRead).length;
  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.isRead).length;

  return (
    <AdminLayout title="התראות מערכת">
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">התראות מערכת</h1>
            <p className="text-muted-foreground">ניהול התראות ומוניטורינג</p>
          </div>
          <Button variant="outline" className="gap-2">
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
                <p className="text-2xl font-bold">{alerts.length}</p>
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
                <p className="text-2xl font-bold">{alertRules.filter(r => r.isActive).length}</p>
                <p className="text-sm text-muted-foreground">כללים פעילים</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Alerts */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                התראות פעילות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence>
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={`p-4 rounded-lg border ${
                        !alert.isRead ? 'bg-primary/5 border-primary/20' : ''
                      } ${alert.severity === 'critical' ? 'border-red-300 bg-red-50' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          {getAlertIcon(alert.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{alert.title}</h4>
                            {getSeverityBadge(alert.severity)}
                            {!alert.isRead && (
                              <Badge variant="secondary" className="text-xs">חדש</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(alert.timestamp, 'dd/MM/yyyy HH:mm', { locale: he })}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {!alert.isRead && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => markAsRead(alert.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {alert.actionRequired && (
                            <Button size="sm" variant="outline">
                              טפל
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => dismissAlert(alert.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {alerts.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>אין התראות פעילות</p>
                    </div>
                  )}
                </div>
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Alert Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                כללי התראות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alertRules.map((rule) => (
                  <div 
                    key={rule.id} 
                    className={`p-3 rounded-lg border ${!rule.isActive && 'opacity-60'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{rule.name}</p>
                      <Switch 
                        checked={rule.isActive}
                        onCheckedChange={() => toggleRule(rule.id)}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{rule.condition}</p>
                    <div className="flex gap-1">
                      {rule.channels.map(channel => (
                        <Badge key={channel} variant="outline" className="text-xs">
                          {channel === 'email' ? 'אימייל' : 
                           channel === 'push' ? 'Push' : 
                           channel === 'sms' ? 'SMS' : channel}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4 gap-2">
                <Settings className="h-4 w-4" />
                הגדרות מתקדמות
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAlerts;
