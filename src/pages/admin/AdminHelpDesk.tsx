/**
 * AdminHelpDesk — V56 Customer Support Center
 * 1. Unified Inbox sorted by urgency with AI-triage summaries
 * 2. Pet 360 Sidebar (health, documents, orders, insurance)
 * 3. Proactive Tools (canned responses, transfer to vet)
 * 4. CRM internal notes
 */

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Headphones, MessageSquare, Clock, CheckCircle, AlertCircle, User,
  Search, Plus, Send, Ticket, PawPrint, Heart, FileText, ShoppingCart,
  Shield, Stethoscope, StickyNote, ChevronRight, Sparkles, AlertTriangle,
  Copy, Truck, Package, Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";

// =====================================================
// CANNED RESPONSES
// =====================================================
const CANNED_RESPONSES = [
  {
    category: "החזרות",
    title: "אישור החזרה",
    text: "שלום {customer},\n\nההחזרה עבור ההזמנה #{order} אושרה. הזיכוי יופיע בחשבונך תוך 3-5 ימי עסקים.\n\nתודה על הסבלנות,\nצוות PetID",
  },
  {
    category: "מינון",
    title: "הסבר מינון מזון",
    text: "שלום {customer},\n\nלגבי המינון עבור {pet} – לפי משקל הגוף של {pet}, המינון המומלץ הוא כפי שמצוין בטבלת ההאכלה שבאריזה.\n\nחשוב: מינון הוא המלצה כללית. ייעוץ וטרינרי מומלץ.\n\nצוות PetID",
  },
  {
    category: "טכני",
    title: "בעיית התחברות",
    text: "שלום {customer},\n\nאנחנו מצטערים לשמוע על בעיית ההתחברות. אנא נסה:\n1. איפוס סיסמה דרך כפתור 'שכחתי סיסמה'\n2. ניקוי מטמון הדפדפן\n3. שימוש בדפדפן אחר\n\nאם הבעיה נמשכת, אנחנו כאן.\nצוות PetID",
  },
  {
    category: "ביטוח",
    title: "מידע על פוליסת Libra",
    text: "שלום {customer},\n\nלגבי פוליסת הביטוח של {pet} – הפוליסה מכסה טיפולים וטרינריים בהתאם לתנאי התוכנית שנבחרה.\n\nלפרטים מלאים, ניתן לצפות בפרטי הפוליסה באפליקציה בתפריט 'ביטוח'.\n\nצוות PetID",
  },
  {
    category: "משלוח",
    title: "עדכון משלוח",
    text: "שלום {customer},\n\nההזמנה #{order} עבור {pet} נשלחה ובדרכה אליך! זמן אספקה משוער: 2-4 ימי עסקים.\n\nנעדכן אותך ברגע שתגיע.\nצוות PetID",
  },
];

// =====================================================
// TYPES
// =====================================================
interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  category: string | null;
  user_id: string | null;
  pet_id: string | null;
  assigned_to: string | null;
  ai_triage_summary: string | null;
  vet_flag: boolean | null;
  internal_notes: string | null;
  related_order_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  tags: string[] | null;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  message: string;
  sender_id: string | null;
  is_internal: boolean | null;
  created_at: string;
}

interface PetInfo {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  birth_date: string | null;
  weight: number | null;
  medical_conditions: string[] | null;
  avatar_url: string | null;
}

// =====================================================
// PRIORITY / STATUS CONFIG
// =====================================================
const PRIORITY_CONFIG: Record<string, { label: string; dot: string; sort: number }> = {
  urgent: { label: "דחוף", dot: "bg-rose-500", sort: 0 },
  high: { label: "גבוהה", dot: "bg-amber-500", sort: 1 },
  medium: { label: "בינונית", dot: "bg-blue-500", sort: 2 },
  low: { label: "נמוכה", dot: "bg-muted-foreground", sort: 3 },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: "פתוח", color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
  in_progress: { label: "בטיפול", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  waiting: { label: "ממתין", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  resolved: { label: "נפתר", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  closed: { label: "סגור", color: "text-muted-foreground bg-muted border-border" },
};

// =====================================================
// MAIN COMPONENT
// =====================================================
const AdminHelpDesk = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isCannedOpen, setIsCannedOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: "", description: "", priority: "medium" });

  // Fetch tickets
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as SupportTicket[];
    },
  });

  // Sorted and filtered
  const filteredTickets = useMemo(() => {
    let result = [...tickets];
    if (statusFilter !== "all") result = result.filter(t => t.status === statusFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(t =>
        t.subject?.toLowerCase().includes(q) ||
        t.ticket_number?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      );
    }
    // Sort by priority then date
    result.sort((a, b) => {
      const pa = PRIORITY_CONFIG[a.priority || "medium"]?.sort ?? 3;
      const pb = PRIORITY_CONFIG[b.priority || "medium"]?.sort ?? 3;
      if (pa !== pb) return pa - pb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return result;
  }, [tickets, statusFilter, searchTerm]);

  const selectedTicket = useMemo(() => tickets.find(t => t.id === selectedTicketId) || null, [tickets, selectedTicketId]);

  // Ticket messages
  const { data: ticketMessages = [] } = useQuery({
    queryKey: ["ticket-messages", selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return [];
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", selectedTicketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as TicketMessage[];
    },
    enabled: !!selectedTicketId,
  });

  // Pet 360 data
  const { data: petInfo } = useQuery({
    queryKey: ["pet-360", selectedTicket?.pet_id],
    queryFn: async () => {
      if (!selectedTicket?.pet_id) return null;
      const { data } = await supabase
        .from("pets")
        .select("id, name, type, breed, birth_date, weight, medical_conditions, avatar_url")
        .eq("id", selectedTicket.pet_id)
        .maybeSingle();
      return data as PetInfo | null;
    },
    enabled: !!selectedTicket?.pet_id,
  });

  // User's pets (fallback when ticket has user_id but no pet_id)
  const { data: userPets = [] } = useQuery({
    queryKey: ["user-pets", selectedTicket?.user_id],
    queryFn: async () => {
      if (!selectedTicket?.user_id || selectedTicket?.pet_id) return [];
      const { data } = await supabase
        .from("pets")
        .select("id, name, type, breed, birth_date, weight, medical_conditions, avatar_url")
        .eq("user_id", selectedTicket.user_id)
        .limit(5);
      return (data || []) as PetInfo[];
    },
    enabled: !!selectedTicket?.user_id && !selectedTicket?.pet_id,
  });

  // User's recent orders
  const { data: userOrders = [] } = useQuery({
    queryKey: ["user-orders", selectedTicket?.user_id],
    queryFn: async () => {
      if (!selectedTicket?.user_id) return [];
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, status, total, order_date")
        .eq("user_id", selectedTicket.user_id)
        .order("order_date", { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!selectedTicket?.user_id,
  });

  // User's recent vet documents
  const { data: vetDocs = [] } = useQuery({
    queryKey: ["vet-docs", selectedTicket?.user_id],
    queryFn: async () => {
      if (!selectedTicket?.user_id) return [];
      const { data } = await supabase
        .from("pet_documents")
        .select("id, title, document_type, created_at, file_url")
        .eq("user_id", selectedTicket.user_id)
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!selectedTicket?.user_id,
  });

  // Mutations
  const sendMessage = useMutation({
    mutationFn: async (isInternal: boolean) => {
      const msg = isInternal ? internalNote : newMessage;
      const { error } = await supabase.from("ticket_messages").insert({
        ticket_id: selectedTicketId!,
        message: msg,
        is_internal: isInternal,
      });
      if (error) throw error;
    },
    onSuccess: (_, isInternal) => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", selectedTicketId] });
      if (isInternal) {
        setInternalNote("");
        toast.success("הערה פנימית נשמרה");
      } else {
        setNewMessage("");
        toast.success("ההודעה נשלחה");
      }
    },
  });

  const updateTicket = useMutation({
    mutationFn: async (updates: Partial<SupportTicket>) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          ...updates,
          resolved_at: updates.status === "resolved" ? new Date().toISOString() : undefined,
        } as any)
        .eq("id", selectedTicketId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast.success("הפנייה עודכנה");
    },
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      const num = `TK-${Date.now().toString().slice(-6)}`;
      const { error } = await supabase.from("support_tickets").insert({
        ticket_number: num,
        subject: newTicket.subject,
        description: newTicket.description,
        priority: newTicket.priority,
        status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setIsNewTicketOpen(false);
      setNewTicket({ subject: "", description: "", priority: "medium" });
      toast.success("פנייה חדשה נוצרה");
    },
  });

  const saveInternalNotes = useMutation({
    mutationFn: async (notes: string) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ internal_notes: notes } as any)
        .eq("id", selectedTicketId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast.success("הערות CRM נשמרו");
    },
  });

  const toggleVetFlag = useCallback(() => {
    if (!selectedTicket) return;
    updateTicket.mutate({ vet_flag: !selectedTicket.vet_flag } as any);
  }, [selectedTicket, updateTicket]);

  // Stats
  const stats = useMemo(() => ({
    open: tickets.filter(t => t.status === "open").length,
    inProgress: tickets.filter(t => t.status === "in_progress").length,
    vetFlags: tickets.filter(t => t.vet_flag).length,
    total: tickets.length,
  }), [tickets]);

  // Pet age calculator
  const petAge = useMemo(() => {
    if (!petInfo?.birth_date) return null;
    const birth = new Date(petInfo.birth_date);
    const now = new Date();
    const years = Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const months = Math.floor(((now.getTime() - birth.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
    if (years > 0) return `${years} שנים${months > 0 ? ` ו-${months} חודשים` : ""}`;
    return `${months} חודשים`;
  }, [petInfo]);

  const activePet = petInfo || userPets[0] || null;

  return (
    <AdminLayout title="מרכז תמיכה" icon={Headphones}>
      <div className="space-y-5" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">מרכז תמיכה</h1>
            <p className="text-xs text-muted-foreground">ניהול פניות לקוחות עם תצוגת Pet 360°</p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setIsNewTicketOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> פנייה חדשה
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "פתוחות", value: stats.open, icon: AlertCircle, color: "text-rose-500 bg-rose-500/10" },
            { label: "בטיפול", value: stats.inProgress, icon: Clock, color: "text-blue-500 bg-blue-500/10" },
            { label: "ממתין לוטרינר", value: stats.vetFlags, icon: Stethoscope, color: "text-violet-500 bg-violet-500/10" },
            { label: "סה״כ", value: stats.total, icon: Headphones, color: "text-primary bg-primary/10" },
          ].map((s, i) => (
            <Card key={i} className="border-border/30">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", s.color)}>
                  <s.icon className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Layout: Inbox | Conversation | Pet 360 */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-4 min-h-[calc(100vh-280px)]">

          {/* Column 1: Inbox */}
          <Card className="border-border/30 overflow-hidden">
            <CardHeader className="pb-2 space-y-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="חיפוש..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pr-9 h-8 text-xs"
                />
              </div>
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList className="w-full h-7">
                  <TabsTrigger value="all" className="text-[10px] flex-1">הכל</TabsTrigger>
                  <TabsTrigger value="open" className="text-[10px] flex-1">פתוח</TabsTrigger>
                  <TabsTrigger value="in_progress" className="text-[10px] flex-1">בטיפול</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="p-2 space-y-1">
                {isLoading ? (
                  [...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)
                ) : filteredTickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Headphones className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">אין פניות</p>
                  </div>
                ) : filteredTickets.map(ticket => {
                  const pCfg = PRIORITY_CONFIG[ticket.priority || "medium"] || PRIORITY_CONFIG.medium;
                  const sCfg = STATUS_CONFIG[ticket.status || "open"] || STATUS_CONFIG.open;
                  return (
                    <div
                      key={ticket.id}
                      className={cn(
                        "p-2.5 rounded-lg border cursor-pointer transition-all",
                        selectedTicketId === ticket.id
                          ? "bg-primary/5 border-primary/30"
                          : "border-border/20 hover:bg-muted/50",
                        ticket.vet_flag && "border-l-2 border-l-violet-500",
                      )}
                      onClick={() => setSelectedTicketId(ticket.id)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-medium text-foreground line-clamp-1 flex-1">{ticket.subject}</p>
                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-1", pCfg.dot)} />
                      </div>
                      {ticket.ai_triage_summary && (
                        <div className="flex items-center gap-1 mb-1">
                          <Brain className="w-2.5 h-2.5 text-primary flex-shrink-0" />
                          <p className="text-[9px] text-primary line-clamp-1">{ticket.ai_triage_summary}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-muted-foreground">#{ticket.ticket_number}</span>
                        <span className={cn("text-[9px] px-1.5 py-0 rounded-full border", sCfg.color)}>{sCfg.label}</span>
                        {ticket.vet_flag && (
                          <Stethoscope className="w-2.5 h-2.5 text-violet-500" />
                        )}
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-1">
                        {format(new Date(ticket.created_at), "dd/MM HH:mm", { locale: he })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </Card>

          {/* Column 2: Conversation */}
          <Card className="border-border/30 flex flex-col overflow-hidden">
            {selectedTicket ? (
              <>
                {/* Ticket Header */}
                <CardHeader className="pb-2 border-b space-y-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm">{selectedTicket.subject}</CardTitle>
                      <p className="text-[10px] text-muted-foreground">#{selectedTicket.ticket_number}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Select
                        value={selectedTicket.status || "open"}
                        onValueChange={(v) => updateTicket.mutate({ status: v })}
                      >
                        <SelectTrigger className="h-7 w-24 text-[10px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                            <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant={selectedTicket.vet_flag ? "default" : "outline"}
                        size="sm"
                        className={cn("h-7 gap-1 text-[10px]", selectedTicket.vet_flag && "bg-violet-500 hover:bg-violet-600")}
                        onClick={toggleVetFlag}
                      >
                        <Stethoscope className="w-3 h-3" />
                        {selectedTicket.vet_flag ? "סומן לוטרינר" : "העבר לוטרינר"}
                      </Button>
                    </div>
                  </div>
                  {selectedTicket.ai_triage_summary && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                      <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" strokeWidth={2} />
                      <div>
                        <p className="text-[10px] font-semibold text-primary">סיכום AI לפני העברה לנציג</p>
                        <p className="text-[10px] text-muted-foreground">{selectedTicket.ai_triage_summary}</p>
                      </div>
                    </div>
                  )}
                  {selectedTicket.description && (
                    <p className="text-xs text-muted-foreground">{selectedTicket.description}</p>
                  )}
                </CardHeader>

                {/* Messages */}
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-3">
                    {ticketMessages.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground py-8">אין הודעות עדיין</p>
                    )}
                    {ticketMessages.map(msg => (
                      <div key={msg.id} className={cn("flex gap-2", msg.is_internal && "opacity-70")}>
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                          msg.is_internal ? "bg-amber-500/10" : msg.sender_id ? "bg-primary/10" : "bg-muted"
                        )}>
                          {msg.is_internal ? (
                            <StickyNote className="w-3 h-3 text-amber-500" />
                          ) : (
                            <User className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                        <div className={cn(
                          "flex-1 p-2.5 rounded-lg text-xs",
                          msg.is_internal ? "bg-amber-500/5 border border-amber-500/20" : "bg-muted/50"
                        )}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-[10px]">
                              {msg.is_internal ? "📌 הערה פנימית" : msg.sender_id ? "תמיכה" : "לקוח"}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              {format(new Date(msg.created_at), "HH:mm", { locale: he })}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Reply Area */}
                <div className="p-3 border-t space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="הקלד תשובה ללקוח..."
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      className="flex-1 h-8 text-xs"
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && newMessage.trim() && sendMessage.mutate(false)}
                    />
                    <Button
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => sendMessage.mutate(false)}
                      disabled={!newMessage.trim()}
                    >
                      <Send className="w-3 h-3" /> שלח
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => setIsCannedOpen(true)}>
                      <Copy className="w-3 h-3" /> תשובות מוכנות
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
                <Headphones className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm">בחר פנייה מהרשימה</p>
              </div>
            )}
          </Card>

          {/* Column 3: Pet 360 Sidebar */}
          <div className="space-y-3 hidden lg:block">
            {selectedTicket ? (
              <>
                {/* Pet Health Snapshot */}
                <Card className="border-border/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs flex items-center gap-1.5">
                      <PawPrint className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                      Pet 360°
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {activePet ? (
                      <>
                        <div className="flex items-center gap-3">
                          {activePet.avatar_url ? (
                            <img src={activePet.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <PawPrint className="w-5 h-5 text-primary" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-bold">{activePet.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {activePet.breed || activePet.type} {petAge ? `• ${petAge}` : ""}
                            </p>
                          </div>
                        </div>

                        {/* Health Score */}
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                          <Heart className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                          <div>
                            <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">ציון בריאות 95%</p>
                            <p className="text-[9px] text-muted-foreground">
                              {activePet.weight ? `${activePet.weight} ק"ג` : ""} 
                              {activePet.medical_conditions?.length ? ` • ${activePet.medical_conditions.length} מצבים` : " • בריא"}
                            </p>
                          </div>
                        </div>

                        {activePet.medical_conditions && activePet.medical_conditions.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">מצבים רפואיים</p>
                            <div className="flex flex-wrap gap-1">
                              {activePet.medical_conditions.map(c => (
                                <Badge key={c} variant="outline" className="text-[9px]">{c}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-3">אין חיית מחמד מקושרת</p>
                    )}
                  </CardContent>
                </Card>

                {/* Medical Vault */}
                <Card className="border-border/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                      מסמכים וטרינריים
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {vetDocs.length > 0 ? (
                      <div className="space-y-1.5">
                        {vetDocs.map((doc: any) => (
                          <div key={doc.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 cursor-pointer">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-medium truncate">{doc.title || doc.document_type}</p>
                              <p className="text-[9px] text-muted-foreground">
                                {format(new Date(doc.created_at), "dd/MM/yy")}
                              </p>
                            </div>
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground text-center py-2">אין מסמכים</p>
                    )}
                  </CardContent>
                </Card>

                {/* Order Status */}
                <Card className="border-border/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                      הזמנות אחרונות
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userOrders.length > 0 ? (
                      <div className="space-y-1.5">
                        {userOrders.map((order: any) => {
                          const isLate = order.status === "shipped" &&
                            new Date().getTime() - new Date(order.order_date).getTime() > 5 * 24 * 60 * 60 * 1000;
                          return (
                            <div key={order.id} className={cn(
                              "flex items-center justify-between p-1.5 rounded-md",
                              isLate && "bg-amber-500/5 border border-amber-500/20"
                            )}>
                              <div>
                                <p className="text-[10px] font-medium">{order.order_number}</p>
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] text-muted-foreground">
                                    {format(new Date(order.order_date), "dd/MM")}
                                  </span>
                                  {isLate && <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />}
                                </div>
                              </div>
                              <div className="text-left">
                                <p className="text-[10px] font-bold">₪{order.total}</p>
                                <Badge variant="outline" className="text-[8px]">
                                  {order.status === "pending" ? "ממתין" : order.status === "shipped" ? "נשלח" : order.status === "delivered" ? "נמסר" : order.status}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground text-center py-2">אין הזמנות</p>
                    )}
                  </CardContent>
                </Card>

                {/* Insurance Status */}
                <Card className="border-border/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                      ביטוח Libra
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-2 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-[10px] font-medium text-primary">בדיקה ידנית נדרשת</p>
                      <p className="text-[9px] text-muted-foreground">יש לבדוק סטטוס פוליסה במערכת Libra</p>
                    </div>
                  </CardContent>
                </Card>

                {/* CRM Internal Notes */}
                <Card className="border-border/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs flex items-center gap-1.5">
                      <StickyNote className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.5} />
                      הערות CRM
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Textarea
                      placeholder="הערות פנימיות על הלקוח..."
                      value={selectedTicket.internal_notes || ""}
                      onChange={e => {
                        // Local state update via ticket cache
                        queryClient.setQueryData(["support-tickets"], (old: SupportTicket[] | undefined) =>
                          old?.map(t => t.id === selectedTicketId ? { ...t, internal_notes: e.target.value } : t)
                        );
                      }}
                      className="text-xs min-h-[60px]"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-[10px]"
                      onClick={() => saveInternalNotes.mutate(selectedTicket.internal_notes || "")}
                    >
                      שמור הערות
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-border/30">
                <CardContent className="p-6 text-center text-muted-foreground">
                  <PawPrint className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">בחר פנייה לצפייה ב-Pet 360°</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* New Ticket Dialog */}
        <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <Ticket className="w-4 h-4" /> פנייה חדשה
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label className="text-xs">נושא</Label>
                <Input value={newTicket.subject} onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })} placeholder="נושא הפנייה..." className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">תיאור</Label>
                <Textarea value={newTicket.description} onChange={e => setNewTicket({ ...newTicket, description: e.target.value })} placeholder="תאר את הבעיה..." rows={3} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">עדיפות</Label>
                <Select value={newTicket.priority} onValueChange={v => setNewTicket({ ...newTicket, priority: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">נמוכה</SelectItem>
                    <SelectItem value="medium">בינונית</SelectItem>
                    <SelectItem value="high">גבוהה</SelectItem>
                    <SelectItem value="urgent">דחוף</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => createTicket.mutate()} disabled={!newTicket.subject}>צור פנייה</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Canned Responses Dialog */}
        <Dialog open={isCannedOpen} onOpenChange={setIsCannedOpen}>
          <DialogContent className="max-w-md max-h-[70vh]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-sm flex items-center gap-2">
                <Copy className="w-4 h-4" /> תשובות מוכנות
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-2 p-1">
                {CANNED_RESPONSES.map((cr, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-border/30 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      let text = cr.text;
                      if (activePet) text = text.split("{pet}").join(activePet.name);
                      if (selectedTicket?.ticket_number) text = text.split("{order}").join(selectedTicket.ticket_number);
                      text = text.split("{customer}").join("הלקוח/ה");
                      setNewMessage(text);
                      setIsCannedOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[9px]">{cr.category}</Badge>
                      <p className="text-xs font-medium">{cr.title}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{cr.text.slice(0, 100)}...</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminHelpDesk;
