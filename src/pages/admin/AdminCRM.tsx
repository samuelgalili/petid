import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, Phone, Mail, Calendar, Clock, Plus, Search, Filter, Star,
  Tag, Bell, CheckCircle, AlertTriangle, Target, DollarSign, ShoppingBag, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import { he } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const calculateRFMScore = (orders: any[], customerId: string) => {
  const customerOrders = orders.filter(o => o.user_id === customerId);
  if (customerOrders.length === 0) {
    return { score: 0, recency: 0, frequency: 0, monetary: 0, label: "חדש", orderCount: 0, totalSpent: 0 };
  }
  const now = new Date();
  const lastOrder = customerOrders.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())[0];
  const daysSinceLastOrder = differenceInDays(now, new Date(lastOrder.order_date));
  const orderCount = customerOrders.length;
  const totalSpent = customerOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
  const recencyScore = daysSinceLastOrder <= 7 ? 5 : daysSinceLastOrder <= 30 ? 4 : daysSinceLastOrder <= 90 ? 3 : daysSinceLastOrder <= 180 ? 2 : 1;
  const frequencyScore = orderCount >= 10 ? 5 : orderCount >= 5 ? 4 : orderCount >= 3 ? 3 : orderCount >= 2 ? 2 : 1;
  const monetaryScore = totalSpent >= 5000 ? 5 : totalSpent >= 2000 ? 4 : totalSpent >= 1000 ? 3 : totalSpent >= 500 ? 2 : 1;
  const totalScore = Math.round((recencyScore + frequencyScore + monetaryScore) / 3 * 20);
  let label = "רגיל";
  if (totalScore >= 80) label = "VIP";
  else if (totalScore >= 60) label = "נאמן";
  else if (totalScore >= 40) label = "פוטנציאלי";
  else if (recencyScore <= 2 && frequencyScore >= 3) label = "בסיכון";
  else if (recencyScore <= 1) label = "רדום";
  return { score: totalScore, recency: recencyScore, frequency: frequencyScore, monetary: monetaryScore, label, lastOrderDate: lastOrder.order_date, orderCount, totalSpent };
};

const AdminCRM = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newReminder, setNewReminder] = useState({ title: "", description: "", due_date: "", priority: "medium" });

  const { data: customers, isLoading } = useQuery({
    queryKey: ['crm-customers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: allOrders } = useQuery({
    queryKey: ['crm-all-orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('id, user_id, total, order_date, status');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: tags } = useQuery({
    queryKey: ['customer-tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customer_tags').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: tagAssignments } = useQuery({
    queryKey: ['customer-tag-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customer_tag_assignments').select('*, customer_tags(*)');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: customerNotes } = useQuery({
    queryKey: ['customer-notes', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const { data, error } = await supabase.from('customer_notes').select('*').eq('customer_id', selectedCustomer.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCustomer
  });

  const { data: customerReminders } = useQuery({
    queryKey: ['customer-reminders', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const { data, error } = await supabase.from('customer_reminders').select('*').eq('customer_id', selectedCustomer.id).order('due_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCustomer
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['crm-orders', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const { data, error } = await supabase.from('orders').select('*').eq('user_id', selectedCustomer.id).order('created_at', { ascending: false }).limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCustomer
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from('customer_notes').insert({ customer_id: selectedCustomer.id, content });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-notes'] });
      setNewNote("");
      setShowNoteDialog(false);
      toast({ title: "הערה נוספה" });
    }
  });

  const addReminderMutation = useMutation({
    mutationFn: async (reminder: typeof newReminder) => {
      const { error } = await supabase.from('customer_reminders').insert({ customer_id: selectedCustomer.id, ...reminder, due_date: new Date(reminder.due_date).toISOString() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-reminders'] });
      setNewReminder({ title: "", description: "", due_date: "", priority: "medium" });
      setShowReminderDialog(false);
      toast({ title: "תזכורת נוספה" });
    }
  });

  const customersWithScores = useMemo(() => {
    if (!customers || !allOrders) return [];
    return customers.map(customer => ({
      ...customer,
      rfm: calculateRFMScore(allOrders, customer.id),
      tags: tagAssignments?.filter(ta => ta.customer_id === customer.id) || []
    }));
  }, [customers, allOrders, tagAssignments]);

  const filteredCustomers = useMemo(() => {
    let filtered = customersWithScores;
    if (searchTerm) {
      filtered = filtered.filter(c => c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (segmentFilter !== "all") {
      filtered = filtered.filter(c => c.rfm.label === segmentFilter);
    }
    return filtered;
  }, [customersWithScores, searchTerm, segmentFilter]);

  const stats = useMemo(() => {
    const segments = customersWithScores.reduce((acc, c) => { acc[c.rfm.label] = (acc[c.rfm.label] || 0) + 1; return acc; }, {} as Record<string, number>);
    return { total: customers?.length || 0, vip: segments["VIP"] || 0, atRisk: segments["בסיכון"] || 0, dormant: segments["רדום"] || 0 };
  }, [customersWithScores, customers]);

  const getScoreColor = (score: number) => score >= 80 ? "text-success" : score >= 60 ? "text-primary" : score >= 40 ? "text-warning" : "text-destructive";
  const getScoreBgColor = (score: number) => score >= 80 ? "bg-success/10" : score >= 60 ? "bg-primary/10" : score >= 40 ? "bg-warning/10" : "bg-destructive/10";
  const getLabelColor = (label: string) => {
    switch (label) {
      case "VIP": return "bg-amber-500 text-white";
      case "נאמן": return "bg-primary text-primary-foreground";
      case "בסיכון": return "bg-destructive text-destructive-foreground";
      case "רדום": return "bg-muted text-muted-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <AdminLayout title="CRM">
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">ניהול קשרי לקוחות (CRM)</h1>
            <p className="text-muted-foreground">מעקב, סגמנטציה והיסטוריה מלאה עם Lead Scoring</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer" onClick={() => setSegmentFilter("all")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
              <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">סה״כ</p></div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer" onClick={() => setSegmentFilter("VIP")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><Star className="h-5 w-5 text-amber-500" /></div>
              <div><p className="text-2xl font-bold">{stats.vip}</p><p className="text-xs text-muted-foreground">VIP</p></div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer" onClick={() => setSegmentFilter("בסיכון")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
              <div><p className="text-2xl font-bold">{stats.atRisk}</p><p className="text-xs text-muted-foreground">בסיכון</p></div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer" onClick={() => setSegmentFilter("רדום")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted"><Clock className="h-5 w-5 text-muted-foreground" /></div>
              <div><p className="text-2xl font-bold">{stats.dormant}</p><p className="text-xs text-muted-foreground">רדומים</p></div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />רשימת לקוחות</CardTitle>
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="חיפוש..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10" />
                </div>
                <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                  <SelectTrigger className="w-[100px]"><Filter className="h-4 w-4" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">הכל</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="בסיכון">בסיכון</SelectItem>
                    <SelectItem value="רדום">רדום</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {isLoading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div> : (
                  <div className="space-y-2">
                    {filteredCustomers.map((customer) => (
                      <motion.div key={customer.id} whileHover={{ scale: 1.01 }} className={cn("p-3 rounded-lg border cursor-pointer", selectedCustomer?.id === customer.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted')} onClick={() => setSelectedCustomer(customer)}>
                        <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold", getScoreBgColor(customer.rfm.score))}>{customer.full_name?.charAt(0) || '?'}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{customer.full_name || 'ללא שם'}</p>
                              <Badge className={cn("text-xs", getLabelColor(customer.rfm.label))}>{customer.rfm.label}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                          </div>
                          <div className="text-left">
                            <p className={cn("text-xl font-bold", getScoreColor(customer.rfm.score))}>{customer.rfm.score}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              {selectedCustomer ? (
                <Tabs defaultValue="info">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold", getScoreBgColor(selectedCustomer.rfm.score))}>{selectedCustomer.full_name?.charAt(0) || '?'}</div>
                      <div>
                        <h3 className="text-xl font-bold">{selectedCustomer.full_name}</h3>
                        <p className="text-muted-foreground text-sm">{selectedCustomer.email}</p>
                        <Badge className={cn("mt-1", getLabelColor(selectedCustomer.rfm.label))}>{selectedCustomer.rfm.label}</Badge>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className={cn("text-4xl font-bold", getScoreColor(selectedCustomer.rfm.score))}>{selectedCustomer.rfm.score}</p>
                      <p className="text-sm text-muted-foreground">ציון RFM</p>
                    </div>
                  </div>

                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="info" className="flex-1">סקירה</TabsTrigger>
                    <TabsTrigger value="history" className="flex-1">היסטוריה</TabsTrigger>
                    <TabsTrigger value="notes" className="flex-1">הערות</TabsTrigger>
                    <TabsTrigger value="reminders" className="flex-1">תזכורות</TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="p-4">
                        <div className="flex justify-between mb-2"><span className="text-sm text-muted-foreground">עדכניות</span><span className="font-bold">{selectedCustomer.rfm.recency}/5</span></div>
                        <Progress value={selectedCustomer.rfm.recency * 20} className="h-2" />
                      </Card>
                      <Card className="p-4">
                        <div className="flex justify-between mb-2"><span className="text-sm text-muted-foreground">תדירות</span><span className="font-bold">{selectedCustomer.rfm.frequency}/5</span></div>
                        <Progress value={selectedCustomer.rfm.frequency * 20} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{selectedCustomer.rfm.orderCount} הזמנות</p>
                      </Card>
                      <Card className="p-4">
                        <div className="flex justify-between mb-2"><span className="text-sm text-muted-foreground">סכום</span><span className="font-bold">{selectedCustomer.rfm.monetary}/5</span></div>
                        <Progress value={selectedCustomer.rfm.monetary * 20} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">₪{selectedCustomer.rfm.totalSpent.toLocaleString()}</p>
                      </Card>
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1 gap-2"><Phone className="h-4 w-4" />התקשר</Button>
                      <Button variant="outline" className="flex-1 gap-2"><Mail className="h-4 w-4" />מייל</Button>
                      <Button variant="outline" className="flex-1 gap-2" onClick={() => setShowReminderDialog(true)}><Bell className="h-4 w-4" />תזכורת</Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="history">
                    <ScrollArea className="h-[300px]">
                      {recentOrders?.length ? recentOrders.map((order: any) => (
                        <div key={order.id} className="p-3 rounded-lg border mb-2">
                          <div className="flex justify-between">
                            <div><p className="font-medium">#{order.id.slice(0, 8)}</p><p className="text-xs text-muted-foreground">{format(new Date(order.created_at), 'dd/MM/yyyy', { locale: he })}</p></div>
                            <p className="font-bold">₪{parseFloat(String(order.total)).toLocaleString()}</p>
                          </div>
                        </div>
                      )) : <p className="text-center py-8 text-muted-foreground">אין הזמנות</p>}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="notes">
                    <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
                      <DialogTrigger asChild><Button className="w-full mb-4 gap-2"><Plus className="h-4 w-4" />הוסף הערה</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>הערה חדשה</DialogTitle></DialogHeader>
                        <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="תוכן..." rows={4} className="mt-4" />
                        <Button className="mt-4" onClick={() => addNoteMutation.mutate(newNote)} disabled={!newNote.trim()}>שמור</Button>
                      </DialogContent>
                    </Dialog>
                    <ScrollArea className="h-[250px]">
                      {customerNotes?.length ? customerNotes.map((note: any) => (
                        <div key={note.id} className="p-3 rounded-lg border bg-muted/30 mb-2">
                          <p className="text-sm">{note.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">{format(new Date(note.created_at), 'dd/MM HH:mm', { locale: he })}</p>
                        </div>
                      )) : <p className="text-center py-8 text-muted-foreground">אין הערות</p>}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="reminders">
                    <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
                      <DialogTrigger asChild><Button className="w-full mb-4 gap-2"><Plus className="h-4 w-4" />הוסף תזכורת</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>תזכורת חדשה</DialogTitle></DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div><Label>כותרת</Label><Input value={newReminder.title} onChange={(e) => setNewReminder({...newReminder, title: e.target.value})} /></div>
                          <div><Label>תאריך</Label><Input type="datetime-local" value={newReminder.due_date} onChange={(e) => setNewReminder({...newReminder, due_date: e.target.value})} /></div>
                          <Button onClick={() => addReminderMutation.mutate(newReminder)} disabled={!newReminder.title || !newReminder.due_date}>צור</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <ScrollArea className="h-[250px]">
                      {customerReminders?.length ? customerReminders.map((r: any) => (
                        <div key={r.id} className="p-3 rounded-lg border mb-2 flex items-center gap-3">
                          <CheckCircle className={cn("h-5 w-5", r.status === 'completed' ? "text-success" : "text-muted-foreground")} />
                          <div className="flex-1"><p className="font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{format(new Date(r.due_date), 'dd/MM HH:mm', { locale: he })}</p></div>
                        </div>
                      )) : <p className="text-center py-8 text-muted-foreground">אין תזכורות</p>}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Users className="h-16 w-16 mb-4 opacity-30" />
                  <p>בחר לקוח מהרשימה</p>
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
