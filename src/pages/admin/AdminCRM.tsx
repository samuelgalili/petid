import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  AdminStatCard, 
  AdminStatsGrid, 
  AdminPageHeader, 
  AdminToolbar,
  AdminSectionCard,
  AdminEmptyState,
  AdminDataCard
} from "@/components/admin/AdminStyles";
import { 
  Users, Phone, Mail, Calendar, Clock, Plus, Search, Star,
  Tag, Bell, CheckCircle, AlertTriangle, Target, TrendingUp,
  ShoppingBag, MessageSquare, History, Activity, Crown,
  UserCheck, UserX, Zap, Award, ArrowUpRight, Gift, Heart,
  CreditCard, Receipt, DollarSign, Banknote, Package, Percent, Trash2, Minus,
  RefreshCw, Building2, Send, ExternalLink, MapPin, Home, Edit, Save, PawPrint,
  Syringe, Stethoscope, FileText, GraduationCap, Scale, Shield, ShieldCheck, ShieldX,
  Image, ThumbsUp, Scissors, Gem
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInDays, subDays } from "date-fns";
import { he } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// RFM Score Calculation with enhanced metrics
const calculateRFMScore = (orders: any[], customerId: string) => {
  const customerOrders = orders.filter(o => o.user_id === customerId);
  if (customerOrders.length === 0) {
    return { 
      score: 0, recency: 0, frequency: 0, monetary: 0, 
      label: "חדש", orderCount: 0, totalSpent: 0,
      avgOrderValue: 0, daysSinceLastOrder: null
    };
  }
  
  const now = new Date();
  const lastOrder = customerOrders.sort((a, b) => 
    new Date(b.order_date || b.created_at).getTime() - new Date(a.order_date || a.created_at).getTime()
  )[0];
  const daysSinceLastOrder = differenceInDays(now, new Date(lastOrder.order_date || lastOrder.created_at));
  const orderCount = customerOrders.length;
  const totalSpent = customerOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
  const avgOrderValue = totalSpent / orderCount;
  
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
  
  return { 
    score: totalScore, 
    recency: recencyScore, 
    frequency: frequencyScore, 
    monetary: monetaryScore, 
    label, 
    lastOrderDate: lastOrder.order_date || lastOrder.created_at, 
    orderCount, 
    totalSpent,
    avgOrderValue,
    daysSinceLastOrder
  };
};

// Segment configuration
const segments = [
  { value: "all", label: "הכל", icon: Users, color: "primary" },
  { value: "VIP", label: "VIP", icon: Crown, color: "warning" },
  { value: "נאמן", label: "נאמן", icon: Heart, color: "success" },
  { value: "פוטנציאלי", label: "פוטנציאלי", icon: Target, color: "info" },
  { value: "בסיכון", label: "בסיכון", icon: AlertTriangle, color: "danger" },
  { value: "רדום", label: "רדום", icon: Clock, color: "purple" },
  { value: "חדש", label: "חדש", icon: Zap, color: "cyan" },
] as const;

const AdminCRM = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showChargeDialog, setShowChargeDialog] = useState(false);
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
  const [pendingChargeData, setPendingChargeData] = useState<any>(null);
  const [newNote, setNewNote] = useState("");
  const [newReminder, setNewReminder] = useState({ title: "", description: "", due_date: "", priority: "medium" });
  const [newCharge, setNewCharge] = useState({ 
    amount: "", 
    description: "", 
    charge_type: "manual", 
    payment_method: "credit_card", 
    notes: "", 
    due_date: "",
    selectedProducts: [] as { id: string; name: string; price: number; quantity: number; customPrice: number; petId?: string; }[],
    discountType: "none" as "none" | "percentage" | "fixed",
    discountValue: ""
  });
  const [newTagName, setNewTagName] = useState("");
  const [selectedTagColor, setSelectedTagColor] = useState("#3B82F6");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editedCustomer, setEditedCustomer] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);

  // Data fetching
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
      const { data, error } = await supabase.from('orders').select('id, user_id, total, order_date, status, created_at');
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

  // Fetch customer pets with all details
  const { data: customerPets } = useQuery({
    queryKey: ['customer-pets', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', selectedCustomer.id)
        .eq('archived', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCustomer
  });

  // Fetch pet documents
  const { data: petDocuments } = useQuery({
    queryKey: ['pet-documents', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const { data, error } = await supabase
        .from('pet_documents')
        .select('*')
        .eq('user_id', selectedCustomer.id)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCustomer
  });

  // Fetch pet vaccinations
  const { data: petVaccinations } = useQuery({
    queryKey: ['pet-vaccinations', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const { data, error } = await supabase
        .from('pet_vaccinations')
        .select('*')
        .eq('user_id', selectedCustomer.id)
        .order('vaccination_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCustomer
  });

  // Fetch pet vet visits
  const { data: petVetVisits } = useQuery({
    queryKey: ['pet-vet-visits', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const { data, error } = await supabase
        .from('pet_vet_visits')
        .select('*')
        .eq('user_id', selectedCustomer.id)
        .order('visit_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCustomer
  });

  // Fetch training progress
  const { data: trainingProgress } = useQuery({
    queryKey: ['training-progress', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const { data, error } = await supabase
        .from('user_training_progress')
        .select('*, training_lessons(title, module_id, training_modules(title))')
        .eq('user_id', selectedCustomer.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCustomer
  });

  // Fetch customer charges
  const { data: customerCharges } = useQuery({
    queryKey: ['customer-charges', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const { data, error } = await supabase
        .from('customer_charges')
        .select('*')
        .eq('customer_id', selectedCustomer.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCustomer
  });

  // Fetch customer posts
  const { data: customerPosts } = useQuery({
    queryKey: ['customer-posts', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const { data, error } = await supabase
        .from('posts')
        .select('id, content, image_url, created_at, likes_count, comments_count')
        .eq('user_id', selectedCustomer.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCustomer
  });

  // Fetch customer product reviews
  const { data: customerReviews } = useQuery({
    queryKey: ['customer-reviews', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const { data, error } = await supabase
        .from('product_reviews')
        .select('id, rating, comment, created_at, product_id, business_products(name, image_url)')
        .eq('user_id', selectedCustomer.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCustomer
  });

  // Fetch customer grooming bookings
  const { data: customerGrooming } = useQuery({
    queryKey: ['customer-grooming', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const { data, error } = await supabase
        .from('grooming_appointments')
        .select('*')
        .eq('user_id', selectedCustomer.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCustomer
  });


  // Fetch customer achievements
  const { data: customerAchievements } = useQuery({
    queryKey: ['customer-achievements', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const { data, error } = await supabase
        .from('achievements')
        .select('*, badges(name, name_he, icon, rarity, description)')
        .eq('user_id', selectedCustomer.id)
        .order('earned_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCustomer
  });

  // Fetch business products for the charge dialog
  const { data: shopProducts } = useQuery({
    queryKey: ['shop-products-for-charge'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_products')
        .select('id, name, price, sale_price, image_url, category')
        .eq('in_stock', true)
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  // Mutations
  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from('customer_notes').insert({ customer_id: selectedCustomer.id, content });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-notes'] });
      setNewNote("");
      setShowNoteDialog(false);
      toast({ title: "✅ הערה נוספה בהצלחה" });
    }
  });

  const addReminderMutation = useMutation({
    mutationFn: async (reminder: typeof newReminder) => {
      const { error } = await supabase.from('customer_reminders').insert({ 
        customer_id: selectedCustomer.id, 
        ...reminder, 
        due_date: new Date(reminder.due_date).toISOString() 
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-reminders'] });
      setNewReminder({ title: "", description: "", due_date: "", priority: "medium" });
      setShowReminderDialog(false);
      toast({ title: "✅ תזכורת נוספה בהצלחה" });
    }
  });

  const addTagMutation = useMutation({
    mutationFn: async () => {
      const { data: newTag, error: tagError } = await supabase
        .from('customer_tags')
        .insert({ name: newTagName, color: selectedTagColor })
        .select()
        .single();
      if (tagError) throw tagError;
      
      const { error: assignError } = await supabase
        .from('customer_tag_assignments')
        .insert({ customer_id: selectedCustomer.id, tag_id: newTag.id });
      if (assignError) throw assignError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-tags'] });
      queryClient.invalidateQueries({ queryKey: ['customer-tag-assignments'] });
      setNewTagName("");
      setShowTagDialog(false);
      toast({ title: "✅ תגית נוספה בהצלחה" });
    }
  });

  const assignTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('customer_tag_assignments')
        .insert({ customer_id: selectedCustomer.id, tag_id: tagId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-tag-assignments'] });
      toast({ title: "✅ תגית שויכה בהצלחה" });
    }
  });

  const completeReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from('customer_reminders')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', reminderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-reminders'] });
      toast({ title: "✅ תזכורת הושלמה" });
    }
  });

  // Add charge mutation - now calls edge function for payment link
  const addChargeMutation = useMutation({
    mutationFn: async (params: { charge: typeof newCharge; sendWhatsapp: boolean }) => {
      const { charge, sendWhatsapp } = params;
      const { data, error } = await supabase.functions.invoke('create-crm-charge', {
        body: {
          customer_id: selectedCustomer.id,
          customer_phone: selectedCustomer.phone,
          customer_name: `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim(),
          amount: parseFloat(charge.amount),
          description: charge.description || charge.selectedProducts.map(p => `${p.name} x${p.quantity}`).join(', '),
          charge_type: charge.charge_type,
          payment_method: charge.payment_method,
          notes: charge.notes || null,
          due_date: charge.due_date || null,
          products: charge.selectedProducts.map(p => ({
            id: p.id,
            name: p.name,
            quantity: p.quantity,
            price: p.customPrice
          })),
          send_whatsapp: sendWhatsapp
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-charges'] });
      setNewCharge({ 
        amount: "", 
        description: "", 
        charge_type: "manual", 
        payment_method: "credit_card", 
        notes: "", 
        due_date: "",
        selectedProducts: [],
        discountType: "none",
        discountValue: ""
      });
      setShowChargeDialog(false);
      setShowPaymentMethodDialog(false);
      setPendingChargeData(null);
      
      if (variables.sendWhatsapp) {
        if (data?.whatsapp_sent) {
          toast({ title: "✅ לינק תשלום נשלח בהצלחה בווטסאפ" });
        } else {
          toast({ 
            title: "⚠️ החיוב נוצר אך שליחת ווטסאפ נכשלה", 
            description: "ניתן לשלוח ידנית את הלינק",
            variant: "destructive" 
          });
          // Open payment link in new tab as fallback
          if (data?.payment_url) {
            window.open(data.payment_url, '_blank');
          }
        }
      } else {
        toast({ title: "✅ לינק תשלום נוצר בהצלחה" });
        // Open payment link for direct payment
        if (data?.payment_url) {
          window.open(data.payment_url, '_blank');
        }
      }
    },
    onError: (error: any) => {
      console.error('Charge error:', error);
      toast({ title: "❌ שגיאה ביצירת חיוב", description: error.message, variant: "destructive" });
    }
  });

  // Mark charge as paid
  const markChargePaidMutation = useMutation({
    mutationFn: async (chargeId: string) => {
      const { error } = await supabase
        .from('customer_charges')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', chargeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-charges'] });
      toast({ title: "✅ חיוב סומן כשולם" });
    }
  });

  // Cancel charge
  const cancelChargeMutation = useMutation({
    mutationFn: async (chargeId: string) => {
      const { error } = await supabase
        .from('customer_charges')
        .update({ status: 'cancelled' })
        .eq('id', chargeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-charges'] });
      toast({ title: "✅ חיוב בוטל" });
    }
  });

  // Update customer profile mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async (customerData: any) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          first_name: customerData.first_name,
          last_name: customerData.last_name,
          phone: customerData.phone,
          email: customerData.email,
          street: customerData.street,
          city: customerData.city,
          region: customerData.region,
          house_number: customerData.house_number,
          apartment_number: customerData.apartment_number,
          building_code: customerData.building_code,
          postal_code: customerData.postal_code
        })
        .eq('id', customerData.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm-customers'] });
      // Update selectedCustomer with the new data
      if (selectedCustomer && selectedCustomer.id === variables.id) {
        setSelectedCustomer((prev: any) => ({
          ...prev,
          ...variables,
          full_name: `${variables.first_name || ''} ${variables.last_name || ''}`.trim() || prev.full_name
        }));
      }
      setIsEditingCustomer(false);
      setEditedCustomer(null);
      toast({ title: "✅ פרטי לקוח עודכנו בהצלחה" });
    },
    onError: () => {
      toast({ title: "❌ שגיאה בעדכון פרטי לקוח", variant: "destructive" });
    }
  });

  // Computed data
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
      filtered = filtered.filter(c => 
        c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (segmentFilter !== "all") {
      filtered = filtered.filter(c => c.rfm.label === segmentFilter);
    }
    return filtered.sort((a, b) => b.rfm.score - a.rfm.score);
  }, [customersWithScores, searchTerm, segmentFilter]);

  const stats = useMemo(() => {
    const segments = customersWithScores.reduce((acc, c) => { 
      acc[c.rfm.label] = (acc[c.rfm.label] || 0) + 1; 
      return acc; 
    }, {} as Record<string, number>);
    
    const totalRevenue = customersWithScores.reduce((sum, c) => sum + c.rfm.totalSpent, 0);
    const avgScore = customersWithScores.length 
      ? Math.round(customersWithScores.reduce((sum, c) => sum + c.rfm.score, 0) / customersWithScores.length)
      : 0;
    
    return { 
      total: customers?.length || 0, 
      vip: segments["VIP"] || 0, 
      loyal: segments["נאמן"] || 0,
      atRisk: segments["בסיכון"] || 0, 
      dormant: segments["רדום"] || 0,
      newCustomers: segments["חדש"] || 0,
      totalRevenue,
      avgScore
    };
  }, [customersWithScores, customers]);

  // Styling helpers
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-amber-600";
    if (score >= 60) return "text-emerald-600";
    if (score >= 40) return "text-blue-600";
    return "text-rose-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-gradient-to-br from-amber-500/20 to-amber-600/10";
    if (score >= 60) return "bg-gradient-to-br from-emerald-500/20 to-emerald-600/10";
    if (score >= 40) return "bg-gradient-to-br from-blue-500/20 to-blue-600/10";
    return "bg-gradient-to-br from-rose-500/20 to-rose-600/10";
  };

  const getLabelStyle = (label: string) => {
    switch (label) {
      case "VIP": return "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0";
      case "נאמן": return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
      case "פוטנציאלי": return "bg-blue-500/10 text-blue-700 border-blue-500/30";
      case "בסיכון": return "bg-rose-500/10 text-rose-700 border-rose-500/30";
      case "רדום": return "bg-slate-500/10 text-slate-600 border-slate-500/30";
      case "חדש": return "bg-cyan-500/10 text-cyan-700 border-cyan-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const tagColors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"];

  return (
    <AdminLayout title="CRM - ניהול קשרי לקוחות">
      <div className="p-6 space-y-6">
        <AdminPageHeader 
          title="ניהול קשרי לקוחות (CRM)"
          description="מעקב לקוחות, סגמנטציה חכמה וניהול אינטראקציות"
        />

        {/* Stats Grid */}
        <AdminStatsGrid columns={4}>
          <AdminStatCard 
            title="סה״כ לקוחות" 
            value={stats.total} 
            icon={Users} 
            color="primary"
            subtitle={`ממוצע ציון: ${stats.avgScore}`}
          />
          <AdminStatCard 
            title="לקוחות VIP" 
            value={stats.vip} 
            icon={Crown} 
            color="warning"
            trend={{ value: `${Math.round((stats.vip / (stats.total || 1)) * 100)}%`, isPositive: true }}
          />
          <AdminStatCard 
            title="בסיכון נטישה" 
            value={stats.atRisk} 
            icon={AlertTriangle} 
            color="danger"
            subtitle="דורשים תשומת לב"
          />
          <AdminStatCard 
            title="סה״כ הכנסות" 
            value={`₪${stats.totalRevenue.toLocaleString()}`} 
            icon={TrendingUp} 
            color="success"
          />
        </AdminStatsGrid>

        {/* Segment Filters */}
        <div className="flex flex-wrap gap-2">
          {segments.map((seg) => {
            const count = seg.value === "all" 
              ? stats.total 
              : customersWithScores.filter(c => c.rfm.label === seg.value).length;
            const Icon = seg.icon;
            const isActive = segmentFilter === seg.value;
            
            return (
              <Button
                key={seg.value}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={cn(
                  "gap-2 transition-all",
                  isActive && "shadow-md"
                )}
                onClick={() => setSegmentFilter(seg.value)}
              >
                <Icon className="h-4 w-4" />
                {seg.label}
                <Badge variant="secondary" className="mr-1 text-xs">
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer List */}
          <AdminSectionCard 
            title="רשימת לקוחות" 
            icon={Users}
            className="lg:col-span-1"
          >
            <div className="relative mb-4">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="חיפוש לפי שם, מייל או טלפון..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pr-10" 
              />
            </div>
            
            <ScrollArea className="h-[550px]">
              {isLoading ? (
                <div className="space-y-2">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : filteredCustomers.length === 0 ? (
                <AdminEmptyState 
                  icon={Users}
                  title="לא נמצאו לקוחות"
                  description="נסה לשנות את הסינון או החיפוש"
                />
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {filteredCustomers.map((customer, index) => (
                      <motion.div
                        key={customer.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <div 
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                            selectedCustomer?.id === customer.id 
                              ? "bg-primary/5 border-primary shadow-sm" 
                              : "hover:bg-muted/50 hover:border-primary/30"
                          )} 
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className={cn("h-12 w-12 border-2", selectedCustomer?.id === customer.id ? "border-primary" : "border-transparent")}>
                              <AvatarImage src={customer.avatar_url} />
                              <AvatarFallback className={cn("font-bold text-lg", getScoreBgColor(customer.rfm.score))}>
                                {customer.full_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-semibold truncate">{customer.full_name || 'ללא שם'}</p>
                                {customer.rfm.label === "VIP" && (
                                  <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <Badge variant="outline" className={cn("text-xs", getLabelStyle(customer.rfm.label))}>
                                  {customer.rfm.label}
                                </Badge>
                                {customer.tags.slice(0, 2).map((ta: any) => (
                                  <Badge 
                                    key={ta.id} 
                                    variant="outline" 
                                    className="text-xs"
                                    style={{ borderColor: ta.customer_tags?.color, color: ta.customer_tags?.color }}
                                  >
                                    {ta.customer_tags?.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <p className={cn("text-2xl font-bold", getScoreColor(customer.rfm.score))}>
                                {customer.rfm.score}
                              </p>
                              <p className="text-[10px] text-muted-foreground">RFM</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </AdminSectionCard>

          {/* Customer Details */}
          <Card className="lg:col-span-2">
            <CardContent className="p-0">
              {selectedCustomer ? (
                <div className="h-full">
                  {/* Customer Header */}
                  <div className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-b">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                          <AvatarImage src={selectedCustomer.avatar_url} />
                          <AvatarFallback className={cn("text-2xl font-bold", getScoreBgColor(selectedCustomer.rfm.score))}>
                            {selectedCustomer.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-2xl font-bold">{selectedCustomer.full_name || 'ללא שם'}</h2>
                            {selectedCustomer.rfm.label === "VIP" && (
                              <Crown className="h-6 w-6 text-amber-500" />
                            )}
                          </div>
                          <p className="text-muted-foreground">{selectedCustomer.email}</p>
                          {selectedCustomer.phone && (
                            <p className="text-muted-foreground text-sm">{selectedCustomer.phone}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={cn("px-3 py-1", getLabelStyle(selectedCustomer.rfm.label))}>
                              {selectedCustomer.rfm.label}
                            </Badge>
                            {selectedCustomer.tags.map((ta: any) => (
                              <Badge 
                                key={ta.id} 
                                variant="outline"
                                style={{ borderColor: ta.customer_tags?.color, color: ta.customer_tags?.color }}
                              >
                                {ta.customer_tags?.name}
                              </Badge>
                            ))}
                            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setShowTagDialog(true)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-center p-4 rounded-xl bg-background shadow-sm border">
                        <p className={cn("text-5xl font-bold", getScoreColor(selectedCustomer.rfm.score))}>
                          {selectedCustomer.rfm.score}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">ציון RFM</p>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <Tabs defaultValue="details" className="p-6">
                    <TabsList className="w-full mb-6 grid grid-cols-7">
                      <TabsTrigger value="details" className="gap-1 text-xs">
                        <Users className="h-4 w-4" />
                        פרטים
                      </TabsTrigger>
                      <TabsTrigger value="overview" className="gap-1 text-xs">
                        <Activity className="h-4 w-4" />
                        סקירה
                      </TabsTrigger>
                      <TabsTrigger value="activity" className="gap-1 text-xs">
                        <Heart className="h-4 w-4" />
                        פעילות
                      </TabsTrigger>
                      <TabsTrigger value="billing" className="gap-1 text-xs">
                        <CreditCard className="h-4 w-4" />
                        חיובים
                      </TabsTrigger>
                      <TabsTrigger value="history" className="gap-1 text-xs">
                        <History className="h-4 w-4" />
                        היסטוריה
                      </TabsTrigger>
                      <TabsTrigger value="notes" className="gap-1 text-xs">
                        <MessageSquare className="h-4 w-4" />
                        הערות
                      </TabsTrigger>
                      <TabsTrigger value="reminders" className="gap-1 text-xs">
                        <Bell className="h-4 w-4" />
                        תזכורות
                      </TabsTrigger>
                    </TabsList>

                    {/* Customer Details Tab */}
                    <TabsContent value="details" className="space-y-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          פרטי לקוח
                        </h3>
                        {!isEditingCustomer ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => {
                              setIsEditingCustomer(true);
                              setEditedCustomer({
                                id: selectedCustomer.id,
                                first_name: selectedCustomer.first_name || '',
                                last_name: selectedCustomer.last_name || '',
                                phone: selectedCustomer.phone || '',
                                email: selectedCustomer.email || '',
                                street: selectedCustomer.street || '',
                                city: selectedCustomer.city || '',
                                region: selectedCustomer.region || '',
                                house_number: selectedCustomer.house_number || '',
                                apartment_number: selectedCustomer.apartment_number || '',
                                building_code: selectedCustomer.building_code || '',
                                postal_code: selectedCustomer.postal_code || ''
                              });
                            }}
                          >
                            <Edit className="h-4 w-4" />
                            ערוך
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setIsEditingCustomer(false);
                                setEditedCustomer(null);
                              }}
                            >
                              ביטול
                            </Button>
                            <Button 
                              size="sm" 
                              className="gap-2"
                              onClick={() => updateCustomerMutation.mutate(editedCustomer)}
                              disabled={updateCustomerMutation.isPending}
                            >
                              <Save className="h-4 w-4" />
                              שמור
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Personal Info */}
                        <Card className="p-4">
                          <h4 className="font-medium mb-4 flex items-center gap-2 text-primary">
                            <Users className="h-4 w-4" />
                            פרטים אישיים
                          </h4>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">שם פרטי</Label>
                                {isEditingCustomer ? (
                                  <Input 
                                    value={editedCustomer?.first_name || ''} 
                                    onChange={(e) => setEditedCustomer({...editedCustomer, first_name: e.target.value})}
                                    className="mt-1"
                                  />
                                ) : (
                                  <p className="font-medium">{selectedCustomer.first_name || '-'}</p>
                                )}
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">שם משפחה</Label>
                                {isEditingCustomer ? (
                                  <Input 
                                    value={editedCustomer?.last_name || ''} 
                                    onChange={(e) => setEditedCustomer({...editedCustomer, last_name: e.target.value})}
                                    className="mt-1"
                                  />
                                ) : (
                                  <p className="font-medium">{selectedCustomer.last_name || '-'}</p>
                                )}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">טלפון</Label>
                              {isEditingCustomer ? (
                                <Input 
                                  value={editedCustomer?.phone || ''} 
                                  onChange={(e) => setEditedCustomer({...editedCustomer, phone: e.target.value})}
                                  className="mt-1"
                                  dir="ltr"
                                />
                              ) : (
                                <p className="font-medium flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  {selectedCustomer.phone || '-'}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">אימייל</Label>
                              {isEditingCustomer ? (
                                <Input 
                                  value={editedCustomer?.email || ''} 
                                  onChange={(e) => setEditedCustomer({...editedCustomer, email: e.target.value})}
                                  className="mt-1"
                                  dir="ltr"
                                  type="email"
                                />
                              ) : (
                                <p className="font-medium flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  {selectedCustomer.email || '-'}
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>

                        {/* Address Info */}
                        <Card className="p-4">
                          <h4 className="font-medium mb-4 flex items-center gap-2 text-primary">
                            <MapPin className="h-4 w-4" />
                            כתובת
                          </h4>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">עיר</Label>
                                {isEditingCustomer ? (
                                  <Input 
                                    value={editedCustomer?.city || ''} 
                                    onChange={(e) => {
                                      const city = e.target.value;
                                      // Auto-fill region based on city
                                      const cityToRegion: Record<string, string> = {
                                        'תל אביב': 'מרכז', 'רמת גן': 'מרכז', 'גבעתיים': 'מרכז', 'בני ברק': 'מרכז',
                                        'חולון': 'מרכז', 'בת ים': 'מרכז', 'ראשון לציון': 'מרכז', 'פתח תקווה': 'מרכז',
                                        'רחובות': 'מרכז', 'נס ציונה': 'מרכז', 'לוד': 'מרכז', 'רמלה': 'מרכז',
                                        'ירושלים': 'ירושלים', 'בית שמש': 'ירושלים', 'מעלה אדומים': 'ירושלים',
                                        'חיפה': 'צפון', 'נהריה': 'צפון', 'עכו': 'צפון', 'כרמיאל': 'צפון',
                                        'צפת': 'צפון', 'טבריה': 'צפון', 'עפולה': 'צפון', 'נצרת': 'צפון',
                                        'קריית שמונה': 'צפון', 'קריית ביאליק': 'צפון', 'קריית מוצקין': 'צפון',
                                        'באר שבע': 'דרום', 'אשדוד': 'דרום', 'אשקלון': 'דרום', 'דימונה': 'דרום',
                                        'אילת': 'דרום', 'ערד': 'דרום', 'קריית גת': 'דרום', 'שדרות': 'דרום',
                                        'נתניה': 'שרון', 'הרצליה': 'שרון', 'רעננה': 'שרון', 'כפר סבא': 'שרון',
                                        'הוד השרון': 'שרון', 'רמת השרון': 'שרון', 'חדרה': 'שרון',
                                        'מודיעין': 'שפלה', 'יבנה': 'שפלה', 'גדרה': 'שפלה'
                                      };
                                      const region = cityToRegion[city] || editedCustomer?.region || '';
                                      setEditedCustomer({...editedCustomer, city, region});
                                    }}
                                    className="mt-1"
                                  />
                                ) : (
                                  <p className="font-medium">{selectedCustomer.city || '-'}</p>
                                )}
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">מחוז</Label>
                                {isEditingCustomer ? (
                                  <Input 
                                    value={editedCustomer?.region || ''} 
                                    onChange={(e) => setEditedCustomer({...editedCustomer, region: e.target.value})}
                                    className="mt-1"
                                    placeholder="ימולא אוטומטית לפי העיר"
                                  />
                                ) : (
                                  <p className="font-medium">{selectedCustomer.region || '-'}</p>
                                )}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">רחוב</Label>
                              {isEditingCustomer ? (
                                <Input 
                                  value={editedCustomer?.street || ''} 
                                  onChange={(e) => setEditedCustomer({...editedCustomer, street: e.target.value})}
                                  className="mt-1"
                                />
                              ) : (
                                <p className="font-medium">{selectedCustomer.street || '-'}</p>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">מס׳ בית</Label>
                                {isEditingCustomer ? (
                                  <Input 
                                    value={editedCustomer?.house_number || ''} 
                                    onChange={(e) => setEditedCustomer({...editedCustomer, house_number: e.target.value})}
                                    className="mt-1"
                                  />
                                ) : (
                                  <p className="font-medium">{selectedCustomer.house_number || '-'}</p>
                                )}
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">מס׳ דירה</Label>
                                {isEditingCustomer ? (
                                  <Input 
                                    value={editedCustomer?.apartment_number || ''} 
                                    onChange={(e) => setEditedCustomer({...editedCustomer, apartment_number: e.target.value})}
                                    className="mt-1"
                                  />
                                ) : (
                                  <p className="font-medium">{selectedCustomer.apartment_number || '-'}</p>
                                )}
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">קוד כניסה</Label>
                                {isEditingCustomer ? (
                                  <Input 
                                    value={editedCustomer?.building_code || ''} 
                                    onChange={(e) => setEditedCustomer({...editedCustomer, building_code: e.target.value})}
                                    className="mt-1"
                                  />
                                ) : (
                                  <p className="font-medium">{selectedCustomer.building_code || '-'}</p>
                                )}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">מיקוד</Label>
                              {isEditingCustomer ? (
                                <div className="flex gap-2 mt-1">
                                  <Input 
                                    value={editedCustomer?.postal_code || ''} 
                                    onChange={(e) => setEditedCustomer({...editedCustomer, postal_code: e.target.value})}
                                    dir="ltr"
                                    placeholder="ימולא אוטומטית"
                                    className="flex-1"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      const city = editedCustomer?.city || '';
                                      const address = editedCustomer?.address || '';
                                      
                                      toast({ title: "מחפש מיקוד..." });
                                      
                                      try {
                                        const response = await supabase.functions.invoke('find-postal-code', {
                                          body: { city, address }
                                        });
                                        
                                        if (response.error) {
                                          throw new Error(response.error.message);
                                        }
                                        
                                        if (response.data?.postal_code) {
                                          setEditedCustomer({...editedCustomer, postal_code: response.data.postal_code});
                                          toast({ title: `מיקוד ${response.data.postal_code} נמצא עבור ${city}` });
                                        } else {
                                          toast({ title: "לא נמצא מיקוד", description: "נסה להזין כתובת מדויקת יותר", variant: "destructive" });
                                        }
                                      } catch (error) {
                                        console.error('Error finding postal code:', error);
                                        toast({ title: "שגיאה בחיפוש מיקוד", variant: "destructive" });
                                      }
                                    }}
                                    disabled={!editedCustomer?.city}
                                  >
                                    מצא מיקוד
                                  </Button>
                                </div>
                              ) : (
                                <p className="font-medium">{selectedCustomer.postal_code || '-'}</p>
                              )}
                            </div>
                          </div>
                        </Card>
                      </div>

                      {/* Pets Section - Full Width with Detailed Info */}
                      <Card className="p-4 col-span-2">
                        <h4 className="font-medium mb-4 flex items-center gap-2 text-primary">
                          <PawPrint className="h-4 w-4" />
                          חיות מחמד ({customerPets?.length || 0})
                        </h4>
                        {customerPets && customerPets.length > 0 ? (
                          <div className="space-y-4">
                            {customerPets.map((pet: any) => {
                              const petDocs = petDocuments?.filter((d: any) => d.pet_id === pet.id) || [];
                              const petVax = petVaccinations?.filter((v: any) => v.pet_id === pet.id) || [];
                              const petVisits = petVetVisits?.filter((v: any) => v.pet_id === pet.id) || [];
                              const petTraining = trainingProgress?.filter((t: any) => t.pet_id === pet.id) || [];
                              const completedLessons = petTraining.filter((t: any) => t.status === 'completed').length;
                              const totalLessons = petTraining.length;
                              const age = pet.birth_date 
                                ? Math.floor((new Date().getTime() - new Date(pet.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365))
                                : pet.age;

                              return (
                                <Card key={pet.id} className="p-4 bg-muted/30 border">
                                  {/* Pet Header */}
                                  <div className="flex items-start gap-4 mb-4">
                                    <Avatar className="h-16 w-16">
                                      <AvatarImage src={pet.avatar_url} alt={pet.name} />
                                      <AvatarFallback className="bg-primary/10 text-lg">
                                        <PawPrint className="h-6 w-6 text-primary" />
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h5 className="font-bold text-lg">{pet.name}</h5>
                                        {pet.has_insurance ? (
                                          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 gap-1">
                                            <ShieldCheck className="h-3 w-3" />
                                            מבוטח
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-muted-foreground gap-1">
                                            <ShieldX className="h-3 w-3" />
                                            ללא ביטוח
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {pet.type === 'dog' ? 'כלב' : pet.type === 'cat' ? 'חתול' : pet.type}
                                        {pet.breed && ` • ${pet.breed}`}
                                        {pet.gender && ` • ${pet.gender === 'male' ? 'זכר' : pet.gender === 'female' ? 'נקבה' : pet.gender}`}
                                      </p>
                                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                                        {age !== null && age !== undefined && (
                                          <Badge variant="outline" className="text-xs gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {age} שנים
                                          </Badge>
                                        )}
                                        {pet.weight && (
                                          <Badge variant="outline" className="text-xs gap-1">
                                            <Scale className="h-3 w-3" />
                                            {pet.weight} {pet.weight_unit || 'kg'}
                                          </Badge>
                                        )}
                                        {pet.is_neutered && (
                                          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-700 border-blue-500/30">
                                            מעוקר/מסורס
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Pet Details Grid */}
                                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {/* Insurance Info */}
                                    <div className="p-3 rounded-lg bg-background border">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Shield className="h-4 w-4 text-primary" />
                                        <span className="text-xs font-medium">ביטוח</span>
                                      </div>
                                      {pet.has_insurance ? (
                                        <div className="space-y-1">
                                          <p className="text-sm font-medium text-emerald-600">פעיל</p>
                                          {pet.insurance_company && (
                                            <p className="text-xs text-muted-foreground">{pet.insurance_company}</p>
                                          )}
                                          {pet.insurance_expiry_date && (
                                            <p className="text-xs text-muted-foreground">
                                              תוקף: {format(new Date(pet.insurance_expiry_date), 'dd/MM/yyyy')}
                                            </p>
                                          )}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">לא קיים</p>
                                      )}
                                    </div>

                                    {/* Last Vet Visit */}
                                    <div className="p-3 rounded-lg bg-background border">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Stethoscope className="h-4 w-4 text-primary" />
                                        <span className="text-xs font-medium">ביקור וטרינר אחרון</span>
                                      </div>
                                      {petVisits.length > 0 ? (
                                        <div className="space-y-1">
                                          <p className="text-sm font-medium">
                                            {format(new Date(petVisits[0].visit_date), 'dd/MM/yyyy')}
                                          </p>
                                          {petVisits[0].visit_type && (
                                            <p className="text-xs text-muted-foreground">{petVisits[0].visit_type}</p>
                                          )}
                                          {petVisits[0].clinic_name && (
                                            <p className="text-xs text-muted-foreground">{petVisits[0].clinic_name}</p>
                                          )}
                                        </div>
                                      ) : pet.last_vet_visit ? (
                                        <p className="text-sm">{format(new Date(pet.last_vet_visit), 'dd/MM/yyyy')}</p>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">לא תועד</p>
                                      )}
                                    </div>

                                    {/* Vaccinations */}
                                    <div className="p-3 rounded-lg bg-background border">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Syringe className="h-4 w-4 text-primary" />
                                        <span className="text-xs font-medium">חיסונים</span>
                                      </div>
                                      {petVax.length > 0 ? (
                                        <div className="space-y-1">
                                          <p className="text-sm font-medium">{petVax.length} חיסונים</p>
                                          <p className="text-xs text-muted-foreground">
                                            אחרון: {petVax[0].vaccine_name}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {format(new Date(petVax[0].vaccination_date), 'dd/MM/yyyy')}
                                          </p>
                                        </div>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">אין חיסונים</p>
                                      )}
                                    </div>

                                    {/* Training Progress */}
                                    <div className="p-3 rounded-lg bg-background border">
                                      <div className="flex items-center gap-2 mb-2">
                                        <GraduationCap className="h-4 w-4 text-primary" />
                                        <span className="text-xs font-medium">אילוף</span>
                                      </div>
                                      {totalLessons > 0 ? (
                                        <div className="space-y-1">
                                          <p className="text-sm font-medium">{completedLessons}/{totalLessons} שיעורים</p>
                                          <Progress value={(completedLessons / totalLessons) * 100} className="h-1.5" />
                                          <p className="text-xs text-muted-foreground">
                                            {Math.round((completedLessons / totalLessons) * 100)}% הושלם
                                          </p>
                                        </div>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">לא התחיל</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Documents */}
                                  {petDocs.length > 0 && (
                                    <div className="mt-3 pt-3 border-t">
                                      <div className="flex items-center gap-2 mb-2">
                                        <FileText className="h-4 w-4 text-primary" />
                                        <span className="text-xs font-medium">מסמכים ({petDocs.length})</span>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {petDocs.slice(0, 5).map((doc: any) => (
                                          <a 
                                            key={doc.id} 
                                            href={doc.file_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-background rounded border hover:bg-muted transition-colors"
                                          >
                                            <FileText className="h-3 w-3" />
                                            {doc.title || doc.file_name}
                                          </a>
                                        ))}
                                        {petDocs.length > 5 && (
                                          <span className="text-xs text-muted-foreground px-2 py-1">
                                            +{petDocs.length - 5} נוספים
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </Card>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <PawPrint className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">אין חיות מחמד רשומות</p>
                          </div>
                        )}
                      </Card>
                    </TabsContent>

                    <TabsContent value="overview" className="space-y-6">
                      {/* RFM Breakdown */}
                      <div className="grid grid-cols-3 gap-4">
                        <Card className="p-4 bg-gradient-to-br from-blue-500/5 to-blue-600/10 border-blue-500/20 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-2xl font-bold text-blue-600">{selectedCustomer.rfm.recency}/5</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">עדכניות</span>
                              <div className="p-2 rounded-lg bg-blue-500/10">
                                <Clock className="h-5 w-5 text-blue-600" />
                              </div>
                            </div>
                          </div>
                          <Progress value={selectedCustomer.rfm.recency * 20} className="h-2 mb-2" />
                          <p className="text-xs text-muted-foreground text-left">
                            {selectedCustomer.rfm.daysSinceLastOrder !== null 
                              ? `${selectedCustomer.rfm.daysSinceLastOrder} ימים מהזמנה אחרונה`
                              : 'אין הזמנות'}
                          </p>
                        </Card>
                        
                        <Card className="p-4 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 border-emerald-500/20 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-2xl font-bold text-emerald-600">{selectedCustomer.rfm.frequency}/5</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">תדירות</span>
                              <div className="p-2 rounded-lg bg-emerald-500/10">
                                <ShoppingBag className="h-5 w-5 text-emerald-600" />
                              </div>
                            </div>
                          </div>
                          <Progress value={selectedCustomer.rfm.frequency * 20} className="h-2 mb-2" />
                          <p className="text-xs text-muted-foreground text-left">
                            {selectedCustomer.rfm.orderCount} הזמנות סה״כ
                          </p>
                        </Card>
                        
                        <Card className="p-4 bg-gradient-to-br from-amber-500/5 to-amber-600/10 border-amber-500/20 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-2xl font-bold text-amber-600">{selectedCustomer.rfm.monetary}/5</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">סכום</span>
                              <div className="p-2 rounded-lg bg-amber-500/10">
                                <TrendingUp className="h-5 w-5 text-amber-600" />
                              </div>
                            </div>
                          </div>
                          <Progress value={selectedCustomer.rfm.monetary * 20} className="h-2 mb-2" />
                          <p className="text-xs text-muted-foreground text-left">
                            ₪{selectedCustomer.rfm.totalSpent.toLocaleString()} סה״כ
                          </p>
                        </Card>
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <Card className="p-4 bg-gradient-to-br from-violet-500/5 to-violet-600/10 border-violet-500/20 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <p className="text-2xl font-bold text-violet-600">
                              ₪{selectedCustomer.rfm.avgOrderValue?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-muted-foreground">ממוצע להזמנה</p>
                              <div className="p-3 rounded-xl bg-violet-500/10">
                                <Gift className="h-6 w-6 text-violet-600" />
                              </div>
                            </div>
                          </div>
                        </Card>
                        
                        <Card className="p-4 bg-gradient-to-br from-cyan-500/5 to-cyan-600/10 border-cyan-500/20 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <p className="text-2xl font-bold text-cyan-600">
                              {selectedCustomer.created_at 
                                ? format(new Date(selectedCustomer.created_at), 'dd/MM/yyyy', { locale: he })
                                : 'לא ידוע'}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-muted-foreground">לקוח מאז</p>
                              <div className="p-3 rounded-xl bg-cyan-500/10">
                                <Calendar className="h-6 w-6 text-cyan-600" />
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <Button className="flex-1 flex-row-reverse gap-2">
                          התקשר
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" className="flex-1 flex-row-reverse gap-2">
                          שלח מייל
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" className="flex-row-reverse gap-2" onClick={() => setShowReminderDialog(true)}>
                          תזכורת
                          <Bell className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" className="flex-row-reverse gap-2" onClick={() => setShowNoteDialog(true)}>
                          הערה
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TabsContent>

                    {/* Activity Tab - Posts, Reviews, Grooming, Loyalty, Achievements */}
                    <TabsContent value="activity" className="space-y-6">
                      {/* Activity Summary */}
                      <div className="grid grid-cols-4 gap-3">
                        <Card className="p-3 text-center">
                          <Image className="h-4 w-4 mx-auto mb-1 text-primary" />
                          <p className="text-xl font-bold">{customerPosts?.length || 0}</p>
                          <p className="text-xs text-muted-foreground">פוסטים</p>
                        </Card>
                        <Card className="p-3 text-center">
                          <Star className="h-4 w-4 mx-auto mb-1 text-amber-500" />
                          <p className="text-xl font-bold">{customerReviews?.length || 0}</p>
                          <p className="text-xs text-muted-foreground">ביקורות</p>
                        </Card>
                        <Card className="p-3 text-center">
                          <Scissors className="h-4 w-4 mx-auto mb-1 text-pink-500" />
                          <p className="text-xl font-bold">{customerGrooming?.length || 0}</p>
                          <p className="text-xs text-muted-foreground">טיפוח</p>
                        </Card>
                        <Card className="p-3 text-center">
                          <Award className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                          <p className="text-xl font-bold">{customerAchievements?.length || 0}</p>
                          <p className="text-xs text-muted-foreground">הישגים</p>
                        </Card>
                      </div>

                      {/* Recent Posts */}
                      {customerPosts && customerPosts.length > 0 && (
                        <Card className="p-4">
                          <h4 className="font-medium mb-3 flex items-center gap-2 text-primary">
                            <Image className="h-4 w-4" />
                            פוסטים אחרונים ({customerPosts.length})
                          </h4>
                          <div className="space-y-2">
                            {customerPosts.slice(0, 5).map((post: any) => (
                              <div key={post.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                                {post.image_url && (
                                  <img src={post.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm truncate">{post.content || 'ללא תוכן'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(post.created_at), 'dd/MM/yyyy', { locale: he })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <ThumbsUp className="h-3 w-3" />
                                    {post.likes_count || 0}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {post.comments_count || 0}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}

                      {/* Product Reviews */}
                      {customerReviews && customerReviews.length > 0 && (
                        <Card className="p-4">
                          <h4 className="font-medium mb-3 flex items-center gap-2 text-primary">
                            <Star className="h-4 w-4" />
                            ביקורות מוצרים ({customerReviews.length})
                          </h4>
                          <div className="space-y-2">
                            {customerReviews.slice(0, 5).map((review: any) => (
                              <div key={review.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                                {review.business_products?.image_url && (
                                  <img src={review.business_products.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">{review.business_products?.name || 'מוצר'}</p>
                                  <p className="text-xs text-muted-foreground truncate">{review.comment || '-'}</p>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} className={cn("h-3 w-3", i < review.rating ? "text-amber-500 fill-amber-500" : "text-muted")} />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}

                      {/* Grooming Bookings */}
                      {customerGrooming && customerGrooming.length > 0 && (
                        <Card className="p-4">
                          <h4 className="font-medium mb-3 flex items-center gap-2 text-primary">
                            <Scissors className="h-4 w-4" />
                            תורי טיפוח ({customerGrooming.length})
                          </h4>
                          <div className="space-y-2">
                            {customerGrooming.slice(0, 5).map((booking: any) => (
                              <div key={booking.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                                <div>
                                  <p className="text-sm font-medium">{booking.service_type || 'טיפוח'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {booking.appointment_date ? format(new Date(booking.appointment_date), 'dd/MM/yyyy', { locale: he }) : '-'}
                                  </p>
                                </div>
                                <Badge variant="outline" className={cn(
                                  "text-xs",
                                  booking.status === 'completed' && "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
                                  booking.status === 'pending' && "bg-amber-500/10 text-amber-700 border-amber-500/30",
                                  booking.status === 'cancelled' && "bg-rose-500/10 text-rose-700 border-rose-500/30"
                                )}>
                                  {booking.status === 'completed' ? 'הושלם' : booking.status === 'pending' ? 'ממתין' : booking.status === 'cancelled' ? 'בוטל' : booking.status || 'ממתין'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}

                      {/* Achievements */}
                      {customerAchievements && customerAchievements.length > 0 && (
                        <Card className="p-4">
                          <h4 className="font-medium mb-3 flex items-center gap-2 text-primary">
                            <Award className="h-4 w-4" />
                            הישגים ({customerAchievements.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {customerAchievements.map((achievement: any) => (
                              <Badge key={achievement.id} variant="outline" className="gap-1 py-1.5 px-3">
                                <span>{achievement.badges?.icon || '🏆'}</span>
                                <span>{achievement.badges?.name_he || achievement.badges?.name || 'הישג'}</span>
                                <span className="text-xs text-muted-foreground">
                                  +{achievement.points_awarded}
                                </span>
                              </Badge>
                            ))}
                          </div>
                        </Card>
                      )}

                      {/* Empty state */}
                      {(!customerPosts?.length && !customerReviews?.length && !customerGrooming?.length && !customerAchievements?.length) && (
                        <AdminEmptyState 
                          icon={Activity}
                          title="אין פעילות עדיין"
                          description="הלקוח עדיין לא ביצע פעילות במערכת"
                        />
                      )}
                    </TabsContent>

                    {/* Billing Tab */}
                    <TabsContent value="billing">
                      <div className="space-y-4">
                        <Button className="w-full gap-2" onClick={() => setShowChargeDialog(true)}>
                          <Plus className="h-4 w-4" />
                          הוסף חיוב ידני
                        </Button>

                        {/* Billing Summary */}
                        <div className="grid grid-cols-3 gap-3">
                          <Card className="p-3 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 border-emerald-500/20">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle className="h-4 w-4 text-emerald-600" />
                              <span className="text-xs text-muted-foreground">שולם</span>
                            </div>
                            <p className="text-lg font-bold text-emerald-600">
                              ₪{(customerCharges?.filter((c: any) => c.status === 'paid').reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0) || 0).toLocaleString()}
                            </p>
                          </Card>
                          <Card className="p-3 bg-gradient-to-br from-amber-500/5 to-amber-600/10 border-amber-500/20">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="h-4 w-4 text-amber-600" />
                              <span className="text-xs text-muted-foreground">ממתין</span>
                            </div>
                            <p className="text-lg font-bold text-amber-600">
                              ₪{(customerCharges?.filter((c: any) => c.status === 'pending').reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0) || 0).toLocaleString()}
                            </p>
                          </Card>
                          <Card className="p-3 bg-gradient-to-br from-rose-500/5 to-rose-600/10 border-rose-500/20">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertTriangle className="h-4 w-4 text-rose-600" />
                              <span className="text-xs text-muted-foreground">בוטל</span>
                            </div>
                            <p className="text-lg font-bold text-rose-600">
                              ₪{(customerCharges?.filter((c: any) => c.status === 'cancelled').reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0) || 0).toLocaleString()}
                            </p>
                          </Card>
                        </div>

                        <ScrollArea className="h-[280px]">
                          {customerCharges?.length ? (
                            <div className="space-y-3">
                              {customerCharges.map((charge: any) => (
                                <Card key={charge.id} className="p-4 hover:shadow-sm transition-shadow">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={cn(
                                        "p-2 rounded-lg",
                                        charge.status === 'paid' && "bg-emerald-500/10",
                                        charge.status === 'pending' && "bg-amber-500/10",
                                        charge.status === 'cancelled' && "bg-rose-500/10"
                                      )}>
                                        <Receipt className={cn(
                                          "h-4 w-4",
                                          charge.status === 'paid' && "text-emerald-600",
                                          charge.status === 'pending' && "text-amber-600",
                                          charge.status === 'cancelled' && "text-rose-600"
                                        )} />
                                      </div>
                                      <div>
                                        <p className="font-medium">{charge.description}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {format(new Date(charge.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                                          {charge.payment_method && ` • ${
                                            charge.payment_method === 'credit_card' ? 'כרטיס אשראי' :
                                            charge.payment_method === 'cash' ? 'מזומן' :
                                            charge.payment_method === 'bank_transfer' ? 'העברה בנקאית' :
                                            charge.payment_method === 'check' ? 'צ׳ק' : charge.payment_method
                                          }`}
                                        </p>
                                        {charge.notes && (
                                          <p className="text-xs text-muted-foreground mt-1">{charge.notes}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="text-left">
                                        <p className="font-bold text-lg">₪{parseFloat(charge.amount).toLocaleString()}</p>
                                        <Badge variant="outline" className={cn(
                                          "text-xs",
                                          charge.status === 'paid' && "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
                                          charge.status === 'pending' && "bg-amber-500/10 text-amber-700 border-amber-500/30",
                                          charge.status === 'cancelled' && "bg-rose-500/10 text-rose-700 border-rose-500/30"
                                        )}>
                                          {charge.status === 'paid' ? 'שולם' : charge.status === 'pending' ? 'ממתין' : 'בוטל'}
                                        </Badge>
                                      </div>
                                      {charge.status === 'pending' && (
                                        <div className="flex gap-1">
                                          <Button 
                                            variant="ghost" 
                                            size="sm"
                                            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                            onClick={() => markChargePaidMutation.mutate(charge.id)}
                                          >
                                            <CheckCircle className="h-4 w-4" />
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="sm"
                                            className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                                            onClick={() => cancelChargeMutation.mutate(charge.id)}
                                          >
                                            <AlertTriangle className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <AdminEmptyState 
                              icon={CreditCard}
                              title="אין חיובים"
                              description="הוסף חיוב ידני ללקוח"
                              action={{ label: "הוסף חיוב", onClick: () => setShowChargeDialog(true) }}
                            />
                          )}
                        </ScrollArea>
                      </div>
                    </TabsContent>

                    <TabsContent value="history">
                      <ScrollArea className="h-[400px]">
                        {recentOrders?.length ? (
                          <div className="space-y-3">
                            {recentOrders.map((order: any) => (
                              <Card 
                                key={order.id} 
                                className={cn(
                                  "p-4 hover:shadow-md transition-all cursor-pointer border-2",
                                  selectedOrder?.id === order.id ? "border-primary bg-primary/5" : "hover:border-primary/30"
                                )}
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowOrderDetail(true);
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "p-2.5 rounded-xl",
                                      order.status === 'completed' ? "bg-emerald-500/10" : 
                                      order.status === 'pending' ? "bg-amber-500/10" : "bg-rose-500/10"
                                    )}>
                                      <ShoppingBag className={cn(
                                        "h-5 w-5",
                                        order.status === 'completed' ? "text-emerald-600" : 
                                        order.status === 'pending' ? "text-amber-600" : "text-rose-600"
                                      )} />
                                    </div>
                                    <div>
                                      <p className="font-semibold">הזמנה #{order.id.slice(0, 8)}</p>
                                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(order.created_at), 'dd/MM/yyyy', { locale: he })}
                                        <span className="mx-1">•</span>
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(order.created_at), 'HH:mm', { locale: he })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-left flex items-center gap-3">
                                    <div>
                                      <p className="font-bold text-lg text-primary">₪{parseFloat(String(order.total)).toLocaleString()}</p>
                                      <Badge variant="outline" className={cn(
                                        "text-xs",
                                        order.status === 'completed' && "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
                                        order.status === 'pending' && "bg-amber-500/10 text-amber-700 border-amber-500/30",
                                        order.status === 'cancelled' && "bg-rose-500/10 text-rose-700 border-rose-500/30"
                                      )}>
                                        {order.status === 'completed' ? 'הושלם' : order.status === 'pending' ? 'ממתין' : order.status === 'cancelled' ? 'בוטל' : order.status}
                                      </Badge>
                                    </div>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Send receipt via WhatsApp
                                        const phone = selectedCustomer?.phone;
                                        if (phone) {
                                          try {
                                            const items = order.items ? JSON.parse(order.items) : [];
                                            const itemsList = items.map((item: any) => `• ${item.name} x${item.quantity || 1} - ₪${item.price}`).join('\n');
                                            const message = `🧾 *קבלה - PetID*\n\n` +
                                              `📋 הזמנה #${order.id.slice(0, 8)}\n` +
                                              `📅 ${format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}\n\n` +
                                              `*פריטים:*\n${itemsList || 'לא זמין'}\n\n` +
                                              `💰 *סה"כ: ₪${parseFloat(String(order.total)).toLocaleString()}*\n\n` +
                                              `תודה שקניתם ב-PetID! 🐾`;
                                            const cleanPhone = phone.replace(/\D/g, '').replace(/^0/, '');
                                            const whatsappUrl = `https://api.whatsapp.com/send?phone=972${cleanPhone}&text=${encodeURIComponent(message)}`;
                                            // Create a temporary link and click it
                                            const link = document.createElement('a');
                                            link.href = whatsappUrl;
                                            link.target = '_blank';
                                            link.rel = 'noopener noreferrer';
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            toast({ title: "נפתח WhatsApp לשליחת קבלה" });
                                          } catch (err) {
                                            console.error('Error opening WhatsApp:', err);
                                            toast({ title: "שגיאה בפתיחת WhatsApp", variant: "destructive" });
                                          }
                                        } else {
                                          toast({ title: "לא נמצא מספר טלפון", variant: "destructive" });
                                        }
                                      }}
                                      title="שלח קבלה ללקוח"
                                    >
                                      <Receipt className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* Quick preview of items */}
                                {order.items && (
                                  <div className="mt-3 pt-3 border-t border-dashed">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Package className="h-3 w-3" />
                                      <span>
                                        {(() => {
                                          try {
                                            const items = JSON.parse(order.items);
                                            const totalItems = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
                                            return `${totalItems} פריטים`;
                                          } catch {
                                            return 'פריטים לא זמינים';
                                          }
                                        })()}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <AdminEmptyState 
                            icon={ShoppingBag}
                            title="אין הזמנות"
                            description="הלקוח עדיין לא ביצע הזמנות"
                          />
                        )}
                      </ScrollArea>
                      
                      {/* Order Detail Dialog */}
                      <Dialog open={showOrderDetail} onOpenChange={setShowOrderDetail}>
                        <DialogContent className="max-w-lg" dir="rtl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Receipt className="h-5 w-5 text-primary" />
                              פירוט הזמנה #{selectedOrder?.id?.slice(0, 8)}
                            </DialogTitle>
                          </DialogHeader>
                          
                          {selectedOrder && (
                            <div className="space-y-4">
                              {/* Order Status & Date */}
                              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">
                                    {format(new Date(selectedOrder.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                                  </span>
                                </div>
                                <Badge variant="outline" className={cn(
                                  selectedOrder.status === 'completed' && "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
                                  selectedOrder.status === 'pending' && "bg-amber-500/10 text-amber-700 border-amber-500/30",
                                  selectedOrder.status === 'cancelled' && "bg-rose-500/10 text-rose-700 border-rose-500/30"
                                )}>
                                  {selectedOrder.status === 'completed' ? 'הושלם' : 
                                   selectedOrder.status === 'pending' ? 'ממתין' : 
                                   selectedOrder.status === 'cancelled' ? 'בוטל' : selectedOrder.status}
                                </Badge>
                              </div>
                              
                              {/* Order Items */}
                              <div className="space-y-2">
                                <h4 className="font-medium flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  פריטים בהזמנה
                                </h4>
                                <div className="border rounded-lg divide-y">
                                  {selectedOrder.items ? (
                                    (() => {
                                      try {
                                        const items = JSON.parse(selectedOrder.items);
                                        return items.map((item: any, idx: number) => (
                                          <div key={idx} className="p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              {item.image_url && (
                                                <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded object-cover" />
                                              )}
                                              <div>
                                                <p className="font-medium text-sm">{item.name}</p>
                                                <p className="text-xs text-muted-foreground">כמות: {item.quantity || 1}</p>
                                              </div>
                                            </div>
                                            <p className="font-semibold">₪{(item.price * (item.quantity || 1)).toLocaleString()}</p>
                                          </div>
                                        ));
                                      } catch {
                                        return (
                                          <div className="p-3 text-center text-muted-foreground text-sm">
                                            פרטי פריטים לא זמינים
                                          </div>
                                        );
                                      }
                                    })()
                                  ) : (
                                    <div className="p-3 text-center text-muted-foreground text-sm">
                                      אין פרטי פריטים
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Shipping Address */}
                              {selectedOrder.shipping_address && (
                                <div className="space-y-2">
                                  <h4 className="font-medium flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    כתובת משלוח
                                  </h4>
                                  <div className="p-3 bg-muted/30 rounded-lg text-sm">
                                    {selectedOrder.shipping_address}
                                  </div>
                                </div>
                              )}
                              
                              {/* Payment Info */}
                              <div className="space-y-2">
                                <h4 className="font-medium flex items-center gap-2">
                                  <CreditCard className="h-4 w-4" />
                                  תשלום
                                </h4>
                                <div className="p-3 bg-muted/30 rounded-lg flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">אמצעי תשלום</span>
                                  <span className="font-medium">{selectedOrder.payment_method || 'כרטיס אשראי'}</span>
                                </div>
                              </div>
                              
                              {/* Total */}
                              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <span className="text-lg font-medium">סה"כ לתשלום</span>
                                  <span className="text-2xl font-bold text-primary">
                                    ₪{parseFloat(String(selectedOrder.total)).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex gap-2 pt-2">
                                <Button
                                  variant="outline"
                                  className="flex-1 gap-2"
                                  onClick={() => {
                                    const phone = selectedCustomer?.phone;
                                    if (phone) {
                                      try {
                                        const items = selectedOrder.items ? JSON.parse(selectedOrder.items) : [];
                                        const itemsList = items.map((item: any) => `• ${item.name} x${item.quantity || 1} - ₪${item.price}`).join('\n');
                                        const message = `🧾 *קבלה - PetID*\n\n` +
                                          `📋 הזמנה #${selectedOrder.id.slice(0, 8)}\n` +
                                          `📅 ${format(new Date(selectedOrder.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}\n\n` +
                                          `*פריטים:*\n${itemsList || 'לא זמין'}\n\n` +
                                          `💰 *סה"כ: ₪${parseFloat(String(selectedOrder.total)).toLocaleString()}*\n\n` +
                                          `תודה שקניתם ב-PetID! 🐾`;
                                        const cleanPhone = phone.replace(/\D/g, '').replace(/^0/, '');
                                        const whatsappUrl = `https://api.whatsapp.com/send?phone=972${cleanPhone}&text=${encodeURIComponent(message)}`;
                                        const link = document.createElement('a');
                                        link.href = whatsappUrl;
                                        link.target = '_blank';
                                        link.rel = 'noopener noreferrer';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        toast({ title: "נפתח WhatsApp לשליחת קבלה" });
                                      } catch (err) {
                                        console.error('Error opening WhatsApp:', err);
                                        toast({ title: "שגיאה בפתיחת WhatsApp", variant: "destructive" });
                                      }
                                    } else {
                                      toast({ title: "לא נמצא מספר טלפון", variant: "destructive" });
                                    }
                                  }}
                                >
                                  <Send className="h-4 w-4" />
                                  שלח קבלה בווטסאפ
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TabsContent>

                    <TabsContent value="notes">
                      <div className="space-y-4">
                        <Button className="w-full gap-2" onClick={() => setShowNoteDialog(true)}>
                          <Plus className="h-4 w-4" />
                          הוסף הערה חדשה
                        </Button>
                        
                        <ScrollArea className="h-[300px]">
                          {customerNotes?.length ? (
                            <div className="space-y-3">
                              {customerNotes.map((note: any) => (
                                <Card key={note.id} className="p-4 bg-muted/30">
                                  <p className="text-sm leading-relaxed">{note.content}</p>
                                  <Separator className="my-2" />
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(note.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                                  </p>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <AdminEmptyState 
                              icon={MessageSquare}
                              title="אין הערות"
                              description="הוסף הערות לתיעוד אינטראקציות עם הלקוח"
                              action={{ label: "הוסף הערה", onClick: () => setShowNoteDialog(true) }}
                            />
                          )}
                        </ScrollArea>
                      </div>
                    </TabsContent>

                    <TabsContent value="reminders">
                      <div className="space-y-4">
                        <Button className="w-full gap-2" onClick={() => setShowReminderDialog(true)}>
                          <Plus className="h-4 w-4" />
                          הוסף תזכורת חדשה
                        </Button>
                        
                        <ScrollArea className="h-[300px]">
                          {customerReminders?.length ? (
                            <div className="space-y-3">
                              {customerReminders.map((reminder: any) => {
                                const isOverdue = new Date(reminder.due_date) < new Date() && reminder.status !== 'completed';
                                const isCompleted = reminder.status === 'completed';
                                
                                return (
                                  <Card 
                                    key={reminder.id} 
                                    className={cn(
                                      "p-4 transition-all",
                                      isCompleted && "opacity-60",
                                      isOverdue && "border-rose-500/50 bg-rose-500/5"
                                    )}
                                  >
                                    <div className="flex items-center gap-3">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                          "h-8 w-8 rounded-full",
                                          isCompleted ? "text-emerald-600" : "text-muted-foreground hover:text-emerald-600"
                                        )}
                                        onClick={() => !isCompleted && completeReminderMutation.mutate(reminder.id)}
                                        disabled={isCompleted}
                                      >
                                        <CheckCircle className="h-5 w-5" />
                                      </Button>
                                      <div className="flex-1">
                                        <p className={cn("font-medium", isCompleted && "line-through")}>
                                          {reminder.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {format(new Date(reminder.due_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                                        </p>
                                      </div>
                                      {isOverdue && !isCompleted && (
                                        <Badge variant="destructive" className="text-xs">באיחור</Badge>
                                      )}
                                      {isCompleted && (
                                        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-xs">
                                          הושלם
                                        </Badge>
                                      )}
                                    </div>
                                  </Card>
                                );
                              })}
                            </div>
                          ) : (
                            <AdminEmptyState 
                              icon={Bell}
                              title="אין תזכורות"
                              description="הגדר תזכורות למעקב אחר הלקוח"
                              action={{ label: "הוסף תזכורת", onClick: () => setShowReminderDialog(true) }}
                            />
                          )}
                        </ScrollArea>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[600px] text-center p-8">
                  <div className="p-6 rounded-full bg-muted mb-6">
                    <Users className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">בחר לקוח מהרשימה</h3>
                  <p className="text-muted-foreground max-w-sm">
                    לחץ על לקוח מהרשימה משמאל כדי לצפות בפרטים, היסטוריה והערות
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add Note Dialog */}
        <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                הערה חדשה
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Textarea 
                value={newNote} 
                onChange={(e) => setNewNote(e.target.value)} 
                placeholder="תוכן ההערה..." 
                rows={4} 
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNoteDialog(false)}>ביטול</Button>
              <Button onClick={() => addNoteMutation.mutate(newNote)} disabled={!newNote.trim()}>
                שמור הערה
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Reminder Dialog */}
        <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                תזכורת חדשה
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>כותרת</Label>
                <Input 
                  value={newReminder.title} 
                  onChange={(e) => setNewReminder({...newReminder, title: e.target.value})} 
                  placeholder="לדוגמה: להתקשר ללקוח"
                />
              </div>
              <div>
                <Label>תיאור (אופציונלי)</Label>
                <Textarea 
                  value={newReminder.description} 
                  onChange={(e) => setNewReminder({...newReminder, description: e.target.value})} 
                  placeholder="פרטים נוספים..."
                  rows={2}
                />
              </div>
              <div>
                <Label>תאריך ושעה</Label>
                <Input 
                  type="datetime-local" 
                  value={newReminder.due_date} 
                  onChange={(e) => setNewReminder({...newReminder, due_date: e.target.value})} 
                />
              </div>
              <div>
                <Label>עדיפות</Label>
                <Select value={newReminder.priority} onValueChange={(v) => setNewReminder({...newReminder, priority: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">נמוכה</SelectItem>
                    <SelectItem value="medium">בינונית</SelectItem>
                    <SelectItem value="high">גבוהה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReminderDialog(false)}>ביטול</Button>
              <Button 
                onClick={() => addReminderMutation.mutate(newReminder)} 
                disabled={!newReminder.title || !newReminder.due_date}
              >
                צור תזכורת
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Tag Dialog */}
        <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                הוסף תגית
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {tags && tags.length > 0 && (
                <div>
                  <Label className="mb-2 block">תגיות קיימות</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag: any) => (
                      <Button
                        key={tag.id}
                        variant="outline"
                        size="sm"
                        style={{ borderColor: tag.color, color: tag.color }}
                        onClick={() => {
                          assignTagMutation.mutate(tag.id);
                          setShowTagDialog(false);
                        }}
                      >
                        {tag.name}
                      </Button>
                    ))}
                  </div>
                  <Separator className="my-4" />
                </div>
              )}
              
              <div>
                <Label>תגית חדשה</Label>
                <Input 
                  value={newTagName} 
                  onChange={(e) => setNewTagName(e.target.value)} 
                  placeholder="שם התגית"
                />
              </div>
              <div>
                <Label className="mb-2 block">צבע</Label>
                <div className="flex gap-2">
                  {tagColors.map((color) => (
                    <button
                      key={color}
                      className={cn(
                        "w-8 h-8 rounded-full transition-transform",
                        selectedTagColor === color && "ring-2 ring-offset-2 ring-primary scale-110"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedTagColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTagDialog(false)}>ביטול</Button>
              <Button 
                onClick={() => addTagMutation.mutate()} 
                disabled={!newTagName.trim()}
              >
                צור תגית
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Charge Dialog - Enhanced */}
        <Dialog open={showChargeDialog} onOpenChange={setShowChargeDialog}>
          <DialogContent className="max-w-3xl h-[95vh] flex flex-col overflow-hidden p-0" dir="rtl">
            <div className="bg-gradient-to-l from-primary/10 via-primary/5 to-transparent p-6 border-b shrink-0">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2.5 bg-primary/10 rounded-xl">
                    <CreditCard className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <span>חיוב ידני חדש</span>
                    {selectedCustomer && (
                      <p className="text-sm font-normal text-muted-foreground mt-0.5">
                        עבור: {selectedCustomer.first_name} {selectedCustomer.last_name} {selectedCustomer.phone && `• ${selectedCustomer.phone}`} {selectedCustomer.email && `• ${selectedCustomer.email}`}
                      </p>
                    )}
                  </div>
                </DialogTitle>
              </DialogHeader>
            </div>
            
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-6">
                {/* Product Selection Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Package className="h-4 w-4 text-primary" />
                    <span>מוצרים</span>
                    {newCharge.selectedProducts.length > 0 && (
                      <Badge variant="secondary" className="mr-auto">
                        {newCharge.selectedProducts.reduce((sum, p) => sum + p.quantity, 0)} פריטים
                      </Badge>
                    )}
                  </div>
                  
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="חפש מוצר..."
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      className="pr-10 bg-muted/30"
                      dir="rtl"
                    />
                  </div>
                  
                  {/* Search Results */}
                  {productSearchTerm && (
                    <div className="rounded-xl border bg-card overflow-hidden max-h-48 overflow-y-auto">
                      {shopProducts?.filter((product: any) => 
                        product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                        product.category?.toLowerCase().includes(productSearchTerm.toLowerCase())
                      ).length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          לא נמצאו מוצרים
                        </div>
                      ) : (
                        <div className="divide-y">
                          {shopProducts?.filter((product: any) => 
                            product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                            product.category?.toLowerCase().includes(productSearchTerm.toLowerCase())
                          ).map((product: any) => (
                            <button
                              key={product.id}
                              onClick={() => {
                                const existingProduct = newCharge.selectedProducts.find(p => p.id === product.id);
                                if (existingProduct) {
                                  setNewCharge({
                                    ...newCharge,
                                    selectedProducts: newCharge.selectedProducts.map(p => 
                                      p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
                                    )
                                  });
                                } else {
                                  setNewCharge({
                                    ...newCharge,
                                    selectedProducts: [...newCharge.selectedProducts, {
                                      id: product.id,
                                      name: product.name,
                                      price: product.sale_price || product.price,
                                      quantity: 1,
                                      customPrice: product.sale_price || product.price
                                    }]
                                  });
                                }
                                setProductSearchTerm("");
                              }}
                              className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-right"
                            >
                              <div className="flex items-center gap-3">
                                {product.image_url && (
                                  <img src={product.image_url} alt={product.name} className="h-10 w-10 rounded-lg object-cover" />
                                )}
                                <div>
                                  <p className="font-medium">{product.name}</p>
                                  {product.category && (
                                    <p className="text-xs text-muted-foreground">{product.category}</p>
                                  )}
                                </div>
                              </div>
                              <span className="text-primary font-semibold">₪{(product.sale_price || product.price).toLocaleString()}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selected Products List - Enhanced RTL */}
                  {newCharge.selectedProducts.length > 0 && (
                    <div className="rounded-xl border bg-card overflow-hidden">
                      <div className="divide-y">
                        {newCharge.selectedProducts.map((product) => (
                          <div key={product.id} className="p-4 hover:bg-muted/30 transition-colors">
                            <div className="flex flex-wrap items-center gap-3">
                              {/* Product Info */}
                              <div className="flex-1 min-w-[140px]">
                                <p className="font-medium text-sm">{product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  מחיר יחידה: ₪{product.price.toLocaleString()}
                                </p>
                              </div>
                              
                              {/* Pet Selection - Show pet avatars */}
                              {customerPets && customerPets.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground ml-2">עבור:</span>
                                  <div className="flex items-center gap-1">
                                    {customerPets.map((pet: any) => (
                                      <button
                                        key={pet.id}
                                        type="button"
                                        onClick={() => {
                                          setNewCharge({
                                            ...newCharge,
                                            selectedProducts: newCharge.selectedProducts.map(p => 
                                              p.id === product.id 
                                                ? { ...p, petId: p.petId === pet.id ? undefined : pet.id }
                                                : p
                                            )
                                          });
                                        }}
                                        className={cn(
                                          "relative rounded-full transition-all duration-200",
                                          product.petId === pet.id 
                                            ? "ring-2 ring-primary ring-offset-2 scale-110" 
                                            : "opacity-60 hover:opacity-100 hover:scale-105"
                                        )}
                                        title={pet.name}
                                      >
                                        <Avatar className="h-8 w-8">
                                          <AvatarImage src={pet.avatar_url} alt={pet.name} />
                                          <AvatarFallback className="bg-primary/10 text-xs">
                                            <PawPrint className="h-3 w-3" />
                                          </AvatarFallback>
                                        </Avatar>
                                        {product.petId === pet.id && (
                                          <div className="absolute -bottom-0.5 -right-0.5 bg-primary rounded-full p-0.5">
                                            <CheckCircle className="h-3 w-3 text-primary-foreground" />
                                          </div>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                  {product.petId && (
                                    <span className="text-xs font-medium text-primary mr-2">
                                      {customerPets.find((p: any) => p.id === product.petId)?.name}
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {/* Quantity Controls */}
                              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1" dir="ltr">
                                <Button 
                                  type="button"
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 hover:bg-background shrink-0"
                                  onClick={() => {
                                    if (product.quantity > 1) {
                                      setNewCharge({
                                        ...newCharge,
                                        selectedProducts: newCharge.selectedProducts.map(p => 
                                          p.id === product.id ? { ...p, quantity: p.quantity - 1 } : p
                                        )
                                      });
                                    } else {
                                      setNewCharge({
                                        ...newCharge,
                                        selectedProducts: newCharge.selectedProducts.filter(p => p.id !== product.id)
                                      });
                                    }
                                  }}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-10 text-center text-base font-bold">{product.quantity}</span>
                                <Button 
                                  type="button"
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 hover:bg-background shrink-0"
                                  onClick={() => {
                                    setNewCharge({
                                      ...newCharge,
                                      selectedProducts: newCharge.selectedProducts.map(p => 
                                        p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
                                      )
                                    });
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              {/* Custom Price */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">מחיר:</span>
                                <div className="relative w-24" dir="ltr">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₪</span>
                                  <Input 
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={product.customPrice}
                                    onChange={(e) => {
                                      setNewCharge({
                                        ...newCharge,
                                        selectedProducts: newCharge.selectedProducts.map(p => 
                                          p.id === product.id ? { ...p, customPrice: parseFloat(e.target.value) || 0 } : p
                                        )
                                      });
                                    }}
                                    className="h-9 text-sm pl-7 text-right font-semibold"
                                  />
                                </div>
                              </div>
                              
                              {/* Line Total */}
                              <div className="min-w-[80px] text-center bg-primary/5 rounded-lg px-3 py-1.5">
                                <p className="text-xs text-muted-foreground">סה״כ</p>
                                <p className="font-bold text-primary">
                                  ₪{(product.customPrice * product.quantity).toLocaleString()}
                                </p>
                              </div>
                              
                              {/* Remove */}
                              <Button 
                                type="button"
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                onClick={() => {
                                  setNewCharge({
                                    ...newCharge,
                                    selectedProducts: newCharge.selectedProducts.filter(p => p.id !== product.id)
                                  });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Products Subtotal */}
                      <div className="bg-muted/50 px-4 py-3 flex justify-between items-center border-t">
                        <span className="text-sm font-medium">סה״כ מוצרים</span>
                        <span className="font-bold text-xl text-primary">
                          ₪{newCharge.selectedProducts.reduce((sum, p) => sum + (p.customPrice * p.quantity), 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Discount Section - Enhanced RTL */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Percent className="h-4 w-4 text-emerald-500" />
                    <span>הנחה</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Select 
                      value={newCharge.discountType} 
                      onValueChange={(v: "none" | "percentage" | "fixed") => setNewCharge({...newCharge, discountType: v, discountValue: ""})}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">ללא הנחה</SelectItem>
                        <SelectItem value="percentage">אחוז (%)</SelectItem>
                        <SelectItem value="fixed">סכום קבוע (₪)</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {newCharge.discountType !== "none" && (
                      <div className="relative w-32" dir="ltr">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                          {newCharge.discountType === "percentage" ? "%" : "₪"}
                        </span>
                        <Input 
                          type="number"
                          step="0.01"
                          min="0"
                          max={newCharge.discountType === "percentage" ? "100" : undefined}
                          value={newCharge.discountValue}
                          onChange={(e) => setNewCharge({...newCharge, discountValue: e.target.value})}
                          placeholder="0"
                          className="text-right pl-8"
                        />
                      </div>
                    )}
                    
                    {newCharge.discountType !== "none" && newCharge.discountValue && (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 px-3 py-1.5">
                        חיסכון: ₪{(newCharge.discountType === "percentage" 
                          ? newCharge.selectedProducts.reduce((sum, p) => sum + (p.customPrice * p.quantity), 0) * (parseFloat(newCharge.discountValue) / 100)
                          : parseFloat(newCharge.discountValue)
                        ).toLocaleString()}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Charge Details Grid - Enhanced RTL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Final Amount */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      סכום סופי לחיוב *
                    </Label>
                    <div className="relative" dir="ltr">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₪</span>
                      <Input 
                        type="number"
                        step="0.01"
                        min="0"
                        value={newCharge.amount || (() => {
                          const productsTotal = newCharge.selectedProducts.reduce((sum, p) => sum + (p.customPrice * p.quantity), 0);
                          if (productsTotal === 0) return "";
                          let discount = 0;
                          if (newCharge.discountType === "percentage" && newCharge.discountValue) {
                            discount = productsTotal * (parseFloat(newCharge.discountValue) / 100);
                          } else if (newCharge.discountType === "fixed" && newCharge.discountValue) {
                            discount = parseFloat(newCharge.discountValue);
                          }
                          return Math.max(0, productsTotal - discount).toFixed(2);
                        })()} 
                        onChange={(e) => setNewCharge({...newCharge, amount: e.target.value})} 
                        placeholder="0.00"
                        className="text-right pl-8 h-12 text-lg font-bold"
                      />
                    </div>
                    {newCharge.selectedProducts.length > 0 && (
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        className="w-full text-xs gap-1"
                        onClick={() => {
                          const productsTotal = newCharge.selectedProducts.reduce((sum, p) => sum + (p.customPrice * p.quantity), 0);
                          let discount = 0;
                          if (newCharge.discountType === "percentage" && newCharge.discountValue) {
                            discount = productsTotal * (parseFloat(newCharge.discountValue) / 100);
                          } else if (newCharge.discountType === "fixed" && newCharge.discountValue) {
                            discount = parseFloat(newCharge.discountValue);
                          }
                          setNewCharge({...newCharge, amount: Math.max(0, productsTotal - discount).toFixed(2)});
                        }}
                      >
                        <RefreshCw className="h-3 w-3" />
                        חשב מהמוצרים
                      </Button>
                    )}
                  </div>
                  
                  {/* Payment Method */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-primary" />
                      אמצעי תשלום
                    </Label>
                    <Select 
                      value={newCharge.payment_method} 
                      onValueChange={(v) => setNewCharge({...newCharge, payment_method: v})}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit_card">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            כרטיס אשראי
                          </div>
                        </SelectItem>
                        <SelectItem value="cash">
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" />
                            מזומן
                          </div>
                        </SelectItem>
                        <SelectItem value="bank_transfer">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            העברה בנקאית
                          </div>
                        </SelectItem>
                        <SelectItem value="check">צ׳ק</SelectItem>
                        <SelectItem value="other">אחר</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">תיאור החיוב *</Label>
                  <Input 
                    value={newCharge.description || (newCharge.selectedProducts.length > 0 
                      ? newCharge.selectedProducts.map(p => `${p.name} x${p.quantity}`).join(', ')
                      : ""
                    )} 
                    onChange={(e) => setNewCharge({...newCharge, description: e.target.value})} 
                    placeholder="לדוגמה: שירות ייעוץ, מוצר נוסף..."
                    className="h-11"
                  />
                </div>

                {/* Type & Due Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">סוג חיוב</Label>
                    <Select 
                      value={newCharge.charge_type} 
                      onValueChange={(v) => setNewCharge({...newCharge, charge_type: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">ידני</SelectItem>
                        <SelectItem value="service">שירות</SelectItem>
                        <SelectItem value="product">מוצר</SelectItem>
                        <SelectItem value="subscription">מנוי</SelectItem>
                        <SelectItem value="fee">עמלה</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">תאריך יעד</Label>
                    <Input 
                      type="date"
                      value={newCharge.due_date} 
                      onChange={(e) => setNewCharge({...newCharge, due_date: e.target.value})} 
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-muted-foreground">הערות (אופציונלי)</Label>
                  <Textarea 
                    value={newCharge.notes} 
                    onChange={(e) => setNewCharge({...newCharge, notes: e.target.value})} 
                    placeholder="הערות נוספות לחיוב..."
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>
            </ScrollArea>

            {/* Fixed Footer with Summary */}
            <div className="border-t bg-muted/30 p-4 space-y-4">
              {/* Summary Card */}
              {(newCharge.selectedProducts.length > 0 || parseFloat(newCharge.amount || "0") > 0) && (
                <div className="bg-gradient-to-l from-primary/10 via-primary/5 to-transparent rounded-xl p-4 border border-primary/20">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      {newCharge.selectedProducts.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {newCharge.selectedProducts.length} מוצרים • {newCharge.selectedProducts.reduce((sum, p) => sum + p.quantity, 0)} פריטים
                        </p>
                      )}
                      {newCharge.discountType !== "none" && newCharge.discountValue && (
                        <p className="text-sm text-emerald-600 font-medium">
                          כולל הנחה של {newCharge.discountType === "percentage" ? `${newCharge.discountValue}%` : `₪${newCharge.discountValue}`}
                        </p>
                      )}
                    </div>
                    <div className="text-center shrink-0">
                      <p className="text-xs text-muted-foreground mb-1">סה״כ לחיוב</p>
                      <p className="text-3xl font-bold text-primary">
                        ₪{parseFloat(newCharge.amount || "0").toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons - Choose payment method */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowChargeDialog(false)}
                    className="flex-1 h-11"
                  >
                    ביטול
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Send WhatsApp Link */}
                  <Button 
                    onClick={() => addChargeMutation.mutate({ charge: newCharge, sendWhatsapp: true })} 
                    disabled={!newCharge.amount || (!newCharge.description.trim() && newCharge.selectedProducts.length === 0) || addChargeMutation.isPending || !selectedCustomer?.phone}
                    className="h-12 text-base font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {addChargeMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        שלח לינק בווטסאפ
                      </>
                    )}
                  </Button>
                  
                  {/* Open Payment Link Directly */}
                  <Button 
                    onClick={() => addChargeMutation.mutate({ charge: newCharge, sendWhatsapp: false })} 
                    disabled={!newCharge.amount || (!newCharge.description.trim() && newCharge.selectedProducts.length === 0) || addChargeMutation.isPending}
                    className="h-12 text-base font-semibold gap-2"
                  >
                    {addChargeMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4" />
                        פתח דף תשלום
                      </>
                    )}
                  </Button>
                </div>
                
                {!selectedCustomer?.phone && (
                  <p className="text-xs text-amber-600 text-center">
                    ⚠️ ללקוח אין מספר טלפון - לא ניתן לשלוח בווטסאפ
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminCRM;
