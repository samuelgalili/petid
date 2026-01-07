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
  Headphones, 
  MessageSquare, 
  Clock, 
  CheckCircle,
  AlertCircle,
  User,
  Search,
  Filter,
  Plus,
  Send
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  customer: {
    name: string;
    email: string;
  };
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  messages: number;
}

const AdminHelpDesk = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Mock tickets data
  const tickets: Ticket[] = [
    {
      id: '1',
      subject: 'בעיה במשלוח הזמנה #12345',
      description: 'ההזמנה לא הגיעה למרות שכתוב שנמסרה',
      status: 'open',
      priority: 'high',
      customer: { name: 'יוסי כהן', email: 'yossi@example.com' },
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: 3
    },
    {
      id: '2',
      subject: 'שאלה לגבי מוצר',
      description: 'האם המזון מתאים לכלב עם אלרגיות?',
      status: 'in_progress',
      priority: 'medium',
      customer: { name: 'שרה לוי', email: 'sara@example.com' },
      assignedTo: 'נציג 1',
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(),
      messages: 5
    },
    {
      id: '3',
      subject: 'בקשת החזר כספי',
      description: 'המוצר לא תואם את התיאור',
      status: 'resolved',
      priority: 'low',
      customer: { name: 'דני אברהם', email: 'dani@example.com' },
      assignedTo: 'נציג 2',
      createdAt: new Date(Date.now() - 172800000),
      updatedAt: new Date(Date.now() - 86400000),
      messages: 8
    }
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; text: string }> = {
      open: { variant: 'destructive', text: 'פתוח' },
      in_progress: { variant: 'default', text: 'בטיפול' },
      resolved: { variant: 'secondary', text: 'נפתר' },
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

  const filteredTickets = tickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchTerm && !t.subject.includes(searchTerm) && !t.customer.name.includes(searchTerm)) return false;
    return true;
  });

  const stats = {
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    avgResponseTime: '2.5 שעות'
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
                <p className="text-sm text-muted-foreground">נפתרו היום</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Headphones className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgResponseTime}</p>
                <p className="text-sm text-muted-foreground">זמן תגובה ממוצע</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List */}
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
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{ticket.customer.name}</span>
                      <span>•</span>
                      {getStatusBadge(ticket.status)}
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                      <span>{format(ticket.createdAt, 'dd/MM HH:mm', { locale: he })}</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {ticket.messages}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ticket Detail */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>פרטי פנייה</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTicket ? (
                <div className="space-y-6">
                  {/* Ticket Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold">{selectedTicket.subject}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusBadge(selectedTicket.status)}
                        {getPriorityBadge(selectedTicket.priority)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">הקצה לנציג</Button>
                      <Button size="sm">סמן כנפתר</Button>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2">פרטי לקוח</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">שם: </span>
                        <span>{selectedTicket.customer.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">אימייל: </span>
                        <span>{selectedTicket.customer.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h4 className="font-medium mb-2">תיאור הבעיה</h4>
                    <p className="text-muted-foreground">{selectedTicket.description}</p>
                  </div>

                  {/* Messages */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-4">היסטוריית שיחה</h4>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          {selectedTicket.customer.name.charAt(0)}
                        </div>
                        <div className="flex-1 p-3 rounded-lg bg-muted">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-sm">{selectedTicket.customer.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(selectedTicket.createdAt, 'HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm">{selectedTicket.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 flex-row-reverse">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                          T
                        </div>
                        <div className="flex-1 p-3 rounded-lg bg-primary/10">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-sm">תמיכה</span>
                            <span className="text-xs text-muted-foreground">12:30</span>
                          </div>
                          <p className="text-sm">שלום, תודה על פנייתך. אנחנו בודקים את הנושא ונחזור אליך בהקדם.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reply */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="הקלד תשובה..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1"
                    />
                    <Button className="gap-2">
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
