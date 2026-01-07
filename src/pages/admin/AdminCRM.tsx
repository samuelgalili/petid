import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Phone, 
  Mail, 
  MessageSquare, 
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  Star,
  TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { he } from "date-fns/locale";

const AdminCRM = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['crm-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['crm-orders', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', selectedCustomer.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCustomer
  });

  const filteredCustomers = customers?.filter(c => 
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getCustomerScore = (customer: any) => {
    // Mock scoring logic
    return Math.floor(Math.random() * 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <AdminLayout title="CRM">
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">ניהול קשרי לקוחות (CRM)</h1>
            <p className="text-muted-foreground">מעקב, תקשורת והיסטוריה מלאה</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            הוסף לקוח
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customers?.length || 0}</p>
                <p className="text-sm text-muted-foreground">סה"כ לקוחות</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <Star className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">VIP 24</p>
                <p className="text-sm text-muted-foreground">לקוחות פרימיום</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">85%</p>
                <p className="text-sm text-muted-foreground">שימור לקוחות</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100">
                <MessageSquare className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">156</p>
                <p className="text-sm text-muted-foreground">אינטראקציות השבוע</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                רשימת לקוחות
              </CardTitle>
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="חיפוש לקוח..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto">
              {isLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCustomers.map((customer) => (
                    <motion.div
                      key={customer.id}
                      whileHover={{ scale: 1.02 }}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedCustomer?.id === customer.id 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          {customer.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{customer.full_name || 'ללא שם'}</p>
                          <p className="text-xs text-muted-foreground">{customer.email}</p>
                        </div>
                        <div className={`text-sm font-bold ${getScoreColor(getCustomerScore(customer))}`}>
                          {getCustomerScore(customer)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>פרטי לקוח</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCustomer ? (
                <Tabs defaultValue="info">
                  <TabsList className="w-full">
                    <TabsTrigger value="info" className="flex-1">פרטים</TabsTrigger>
                    <TabsTrigger value="history" className="flex-1">היסטוריה</TabsTrigger>
                    <TabsTrigger value="notes" className="flex-1">הערות</TabsTrigger>
                    <TabsTrigger value="tasks" className="flex-1">משימות</TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="mt-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold">
                        {selectedCustomer.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{selectedCustomer.full_name}</h3>
                        <p className="text-muted-foreground">{selectedCustomer.email}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">לקוח פעיל</Badge>
                          <Badge variant="outline">חבר מועדון</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Phone className="h-4 w-4" />
                          <span className="text-sm">טלפון</span>
                        </div>
                        <p className="font-medium">{selectedCustomer.phone || 'לא צוין'}</p>
                      </div>
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Mail className="h-4 w-4" />
                          <span className="text-sm">אימייל</span>
                        </div>
                        <p className="font-medium">{selectedCustomer.email}</p>
                      </div>
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">תאריך הצטרפות</span>
                        </div>
                        <p className="font-medium">
                          {format(new Date(selectedCustomer.created_at), 'dd/MM/yyyy', { locale: he })}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">פעילות אחרונה</span>
                        </div>
                        <p className="font-medium">לפני 2 ימים</p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button className="flex-1 gap-2">
                        <Phone className="h-4 w-4" />
                        התקשר
                      </Button>
                      <Button variant="outline" className="flex-1 gap-2">
                        <Mail className="h-4 w-4" />
                        שלח מייל
                      </Button>
                      <Button variant="outline" className="flex-1 gap-2">
                        <MessageSquare className="h-4 w-4" />
                        הודעה
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="mt-4">
                    <div className="space-y-4">
                      {recentOrders?.map((order: any) => (
                        <div key={order.id} className="p-4 rounded-lg border">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">הזמנה #{order.id.slice(0, 8)}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                              </p>
                            </div>
                            <div className="text-left">
                              <p className="font-bold">₪{order.total}</p>
                              <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                                {order.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!recentOrders || recentOrders.length === 0) && (
                        <p className="text-center text-muted-foreground py-8">אין היסטוריית הזמנות</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="mt-4">
                    <div className="space-y-4">
                      <textarea 
                        className="w-full h-32 p-3 rounded-lg border resize-none"
                        placeholder="הוסף הערה חדשה..."
                      />
                      <Button>שמור הערה</Button>
                      <div className="border-t pt-4 mt-4">
                        <p className="text-center text-muted-foreground">אין הערות קודמות</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="tasks" className="mt-4">
                    <div className="space-y-4">
                      <Button variant="outline" className="w-full gap-2">
                        <Plus className="h-4 w-4" />
                        הוסף משימה/תזכורת
                      </Button>
                      <p className="text-center text-muted-foreground py-8">אין משימות פעילות</p>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mb-4 opacity-50" />
                  <p>בחר לקוח מהרשימה לצפייה בפרטים</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCRM;
