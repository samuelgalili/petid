import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Headphones, 
  MessageSquare, 
  Clock, 
  CheckCircle,
  AlertCircle,
  User,
  Search,
  Plus,
  Send
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";

const AdminHelpDesk = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: ticketMessages } = useQuery({
    queryKey: ['ticket-messages', selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return [];
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', selectedTicket.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedTicket
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          message: newMessage,
          is_internal: false
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', selectedTicket?.id] });
      setNewMessage("");
      toast.success('ההודעה נשלחה');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('הסטטוס עודכן');
    }
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; text: string }> = {
      open: { variant: 'destructive', text: 'פתוח' },
      in_progress: { variant: 'default', text: 'בטיפול' },
      waiting: { variant: 'secondary', text: 'ממתין' },
      resolved: { variant: 'outline', text: 'נפתר' },
      closed: { variant: 'outline', text: 'סגור' }
    };
    const style = styles[status] || styles.open;
    return <Badge variant={style.variant}>{style.text}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700'
    };
    const labels: Record<string, string> = {
      low: 'נמוכה',
      medium: 'בינונית',
      high: 'גבוהה',
      urgent: 'דחוף'
    };
    return <Badge className={colors[priority]}>{labels[priority]}</Badge>;
  };

  const filteredTickets = tickets?.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchTerm && !t.subject?.includes(searchTerm) && !t.ticket_number?.includes(searchTerm)) return false;
    return true;
  }) || [];

  const stats = {
    open: tickets?.filter(t => t.status === 'open').length || 0,
    inProgress: tickets?.filter(t => t.status === 'in_progress').length || 0,
    resolved: tickets?.filter(t => t.status === 'resolved').length || 0
  };

  return (
    <AdminLayout title="מרכז תמיכה">
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">מרכז תמיכה</h1>
            <p className="text-muted-foreground">ניהול פניות ותמיכת לקוחות</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            פנייה חדשה
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.open}</p>
                <p className="text-sm text-muted-foreground">פניות פתוחות</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">בטיפול</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.resolved}</p>
                <p className="text-sm text-muted-foreground">נפתרו</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Headphones className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tickets?.length || 0}</p>
                <p className="text-sm text-muted-foreground">סה"כ פניות</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                פניות
              </CardTitle>
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="חיפוש..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mt-2">
                <TabsList className="w-full">
                  <TabsTrigger value="all" className="flex-1">הכל</TabsTrigger>
                  <TabsTrigger value="open" className="flex-1">פתוח</TabsTrigger>
                  <TabsTrigger value="in_progress" className="flex-1">בטיפול</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Headphones className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>אין פניות</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTickets.map((ticket) => (
                    <motion.div
                      key={ticket.id}
                      whileHover={{ scale: 1.02 }}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTicket?.id === ticket.id 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-sm line-clamp-1">{ticket.subject}</p>
                        {getPriorityBadge(ticket.priority || 'medium')}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>#{ticket.ticket_number}</span>
                        <span>•</span>
                        {getStatusBadge(ticket.status || 'open')}
                      </div>
                      <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                        <span>{format(new Date(ticket.created_at), 'dd/MM HH:mm', { locale: he })}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>פרטי פנייה</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTicket ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold">{selectedTicket.subject}</h3>
                      <p className="text-sm text-muted-foreground">#{selectedTicket.ticket_number}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusBadge(selectedTicket.status || 'open')}
                        {getPriorityBadge(selectedTicket.priority || 'medium')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: selectedTicket.id, status: 'in_progress' })}
                      >
                        התחל טיפול
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: selectedTicket.id, status: 'resolved' })}
                      >
                        סמן כנפתר
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">תיאור הבעיה</h4>
                    <p className="text-muted-foreground">{selectedTicket.description || 'אין תיאור'}</p>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-4">היסטוריית שיחה</h4>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto">
                      {ticketMessages?.map((msg: any) => (
                        <div key={msg.id} className={`flex gap-3 ${msg.is_internal ? 'flex-row-reverse' : ''}`}>
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="h-4 w-4" />
                          </div>
                          <div className={`flex-1 p-3 rounded-lg ${msg.is_internal ? 'bg-primary/10' : 'bg-muted'}`}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium text-sm">{msg.is_internal ? 'תמיכה' : 'לקוח'}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(msg.created_at), 'HH:mm', { locale: he })}
                              </span>
                            </div>
                            <p className="text-sm">{msg.message}</p>
                          </div>
                        </div>
                      ))}
                      {(!ticketMessages || ticketMessages.length === 0) && (
                        <p className="text-center text-muted-foreground">אין הודעות</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="הקלד תשובה..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      className="gap-2"
                      onClick={() => sendMessageMutation.mutate()}
                      disabled={!newMessage.trim()}
                    >
                      <Send className="h-4 w-4" />
                      שלח
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Headphones className="h-12 w-12 mb-4 opacity-50" />
                  <p>בחר פנייה מהרשימה לצפייה בפרטים</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminHelpDesk;
