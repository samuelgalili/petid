import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Receipt, 
  Search, 
  Download,
  FileText,
  Printer,
  Calendar,
  Camera,
  Upload,
  Loader2,
  Sparkles,
  UserPlus,
  Building2,
  RefreshCw,
  TrendingUp,
  ArrowUpRight
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { InvoiceLineItemReview, type ScannedInvoiceData } from "@/components/admin/InvoiceLineItemReview";

const AdminInvoices = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [showLineItemReview, setShowLineItemReview] = useState(false);
  const [savingLineItems, setSavingLineItems] = useState(false);
  const [newSupplierDialogOpen, setNewSupplierDialogOpen] = useState(false);
  const [pendingSupplierData, setPendingSupplierData] = useState<any>(null);
  const [existingSupplier, setExistingSupplier] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch suppliers for matching
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders-for-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: supplierInvoices } = useQuery({
    queryKey: ["supplier-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_invoices")
        .select("*, suppliers(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filteredOrders = orders?.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterType === "all") return matchesSearch;
    return matchesSearch && order.status === filterType;
  });

  const handleScanInvoice = async (file: File) => {
    setScanning(true);
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      // Call AI to analyze the invoice
      const { data, error } = await supabase.functions.invoke('scan-invoice', {
        body: { image: base64 }
      });

      if (error) throw error;

      // Check if supplier exists
      const vendorName = data.vendor?.trim().toLowerCase();
      if (vendorName) {
        const matchedSupplier = suppliers?.find(
          s => s.name.toLowerCase().includes(vendorName) || vendorName.includes(s.name.toLowerCase())
        );

        if (matchedSupplier) {
          // Supplier exists - attach supplier_id to scanned data
          setScannedData({ ...data, supplierId: matchedSupplier.id, supplierName: matchedSupplier.name });
          setExistingSupplier(matchedSupplier);
          toast({
            title: "החשבונית נסרקה בהצלחה",
            description: `הספק "${matchedSupplier.name}" זוהה במערכת`,
          });
        } else {
          // New supplier - ask for confirmation
          setScannedData(data);
          setPendingSupplierData({
            name: data.vendor || 'ספק לא ידוע',
            phone: data.vendorPhone || null,
            email: data.vendorEmail || null,
            address: data.vendorAddress || null,
          });
          setNewSupplierDialogOpen(true);
        }
      } else {
        setScannedData(data);
        toast({
          title: "החשבונית נסרקה בהצלחה",
          description: "לא זוהה שם ספק בחשבונית",
        });
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast({
        title: "שגיאה בסריקה",
        description: "לא ניתן היה לסרוק את החשבונית",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const handleConfirmNewSupplier = async () => {
    if (!pendingSupplierData) return;

    try {
      const { data: newSupplier, error } = await supabase
        .from("suppliers")
        .insert({
          name: pendingSupplierData.name,
          phone: pendingSupplierData.phone,
          email: pendingSupplierData.email,
          address: pendingSupplierData.address,
          supplier_type: "general",
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Update scanned data with new supplier ID
      setScannedData(prev => ({ ...prev, supplierId: newSupplier.id, supplierName: newSupplier.name }));
      setExistingSupplier(newSupplier);
      
      queryClient.invalidateQueries({ queryKey: ["suppliers-list"] });
      
      toast({
        title: "ספק חדש נוסף",
        description: `הספק "${newSupplier.name}" נוסף למערכת`,
      });
    } catch (error) {
      console.error('Error creating supplier:', error);
      toast({
        title: "שגיאה ביצירת ספק",
        description: "לא ניתן היה ליצור את הספק",
        variant: "destructive",
      });
    } finally {
      setNewSupplierDialogOpen(false);
      setPendingSupplierData(null);
    }
  };

  const handleSkipNewSupplier = () => {
    setNewSupplierDialogOpen(false);
    setPendingSupplierData(null);
    toast({
      title: "החשבונית נסרקה",
      description: "החשבונית נסרקה ללא שיוך לספק",
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleScanInvoice(file);
    }
  };

  const saveScannedInvoice = async () => {
    if (!scannedData) return;
    
    // If line items exist, show review UI instead of saving directly
    if (scannedData.lineItems?.length > 0 && !showLineItemReview) {
      setShowLineItemReview(true);
      return;
    }

    try {
      const { error } = await supabase
        .from("supplier_invoices")
        .insert({
          invoice_number: scannedData.invoiceNumber || null,
          amount: scannedData.total || 0,
          invoice_date: scannedData.date || new Date().toISOString().split('T')[0],
          supplier_id: scannedData.supplierId || null,
          notes: `ספק: ${scannedData.vendor || 'לא זוהה'}\nפריטים: ${scannedData.items?.join(', ') || 'לא זוהו'}`,
        });

      if (error) throw error;

      toast({
        title: "החשבונית נשמרה",
        description: "החשבונית נוספה למערכת בהצלחה",
      });
      
      queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] });
      setScanDialogOpen(false);
      setScannedData(null);
      setShowLineItemReview(false);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "שגיאה בשמירה",
        description: "לא ניתן היה לשמור את החשבונית",
        variant: "destructive",
      });
    }
  };

  const handleLineItemSave = async (reviewItems: any[], invoiceData: ScannedInvoiceData) => {
    setSavingLineItems(true);
    try {
      // 1. Save the invoice record
      const { error: invoiceError } = await supabase
        .from("supplier_invoices")
        .insert({
          invoice_number: invoiceData.invoiceNumber || null,
          amount: invoiceData.total || 0,
          invoice_date: invoiceData.date || new Date().toISOString().split('T')[0],
          supplier_id: invoiceData.supplierId || null,
          notes: `ספק: ${invoiceData.vendor || 'לא זוהה'}\nפריטים: ${reviewItems.map(r => r.name).join(', ')}`,
        });
      if (invoiceError) throw invoiceError;

      // 2. Update cost_price for matched products
      const matchedItems = reviewItems.filter((r: any) => r.matchedProduct);
      for (const item of matchedItems) {
        await supabase
          .from("business_products")
          .update({ cost_price: item.finalCostPerUnit })
          .eq("id", item.matchedProduct.id);
      }

      toast({
        title: "החשבונית ופריטים נשמרו",
        description: `${matchedItems.length} מוצרים עודכנו במלאי, ${reviewItems.length - matchedItems.length} מוצרים חדשים זוהו`,
      });

      queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-products-for-matching"] });
      setScanDialogOpen(false);
      setScannedData(null);
      setShowLineItemReview(false);
    } catch (error) {
      console.error('Save line items error:', error);
      toast({
        title: "שגיאה בשמירה",
        description: "לא ניתן היה לשמור את הפריטים",
        variant: "destructive",
      });
    } finally {
      setSavingLineItems(false);
    }
  };

  const thisMonthOrders = orders?.filter(o => {
    const orderDate = new Date(o.created_at);
    const now = new Date();
    return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
  }) || [];

  const lastMonthOrders = orders?.filter(o => {
    const orderDate = new Date(o.created_at);
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    return orderDate.getMonth() === lastMonth.getMonth() && orderDate.getFullYear() === lastMonth.getFullYear();
  }) || [];

  const totalRevenue = orders?.reduce((acc, o) => acc + (o.total || 0), 0) || 0;
  const thisMonthRevenue = thisMonthOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  const lastMonthRevenue = lastMonthOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  const revenueChange = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) : 0;

  const stats = [
    {
      title: "סה״כ חשבוניות",
      value: orders?.length || 0,
      icon: FileText,
      gradient: "from-primary to-primary/80",
      change: null,
    },
    {
      title: "סכום כולל",
      value: `₪${totalRevenue.toLocaleString()}`,
      icon: Receipt,
      gradient: "from-emerald-500 to-green-600",
      change: revenueChange,
    },
    {
      title: "החודש",
      value: thisMonthOrders.length,
      icon: Calendar,
      gradient: "from-amber-500 to-orange-600",
      change: null,
    },
    {
      title: "הכנסות החודש",
      value: `₪${thisMonthRevenue.toLocaleString()}`,
      icon: TrendingUp,
      gradient: "from-violet-500 to-purple-600",
      change: revenueChange,
    },
  ];

  const generateInvoice = (order: any) => {
    // Create invoice content
    const invoiceContent = `
      חשבונית מס' ${order.id.slice(0, 8).toUpperCase()}
      תאריך: ${format(new Date(order.created_at), "dd/MM/yyyy")}
      
      לקוח: ${order.customer_name || "לקוח כללי"}
      כתובת: ${order.shipping_address || ""}
      
      סה"כ לתשלום: ₪${order.total?.toLocaleString()}
    `;
    
    // Download as text file (in real app would be PDF)
    const blob = new Blob([invoiceContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${order.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout title="חשבוניות וקבלות" icon={Receipt}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-l from-card/80 to-transparent border border-border/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
              <Receipt className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-lg">ניהול חשבוניות</h2>
              <p className="text-xs text-muted-foreground">צפייה, סריקה והפקת חשבוניות</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ["orders-for-invoices"] })}
              className="gap-2 bg-background/50"
            >
              <RefreshCw className="w-4 h-4" />
              רענן
            </Button>
            <Button 
              onClick={() => setScanDialogOpen(true)}
              size="sm"
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2"
            >
              <Camera className="w-4 h-4" />
              סריקת חשבונית
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="relative overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5`} />
                <CardContent className="p-4 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      {stat.change !== null && Number(stat.change) !== 0 && (
                        <div className={cn(
                          "flex items-center gap-1 text-xs mt-1",
                          Number(stat.change) > 0 ? "text-emerald-500" : "text-red-500"
                        )}>
                          <ArrowUpRight className={cn("w-3 h-3", Number(stat.change) < 0 && "rotate-180")} />
                          <span>{Math.abs(Number(stat.change))}%</span>
                        </div>
                      )}
                    </div>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <Card className="border border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש לפי מספר הזמנה או שם לקוח..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="completed">הושלמו</SelectItem>
                  <SelectItem value="pending">ממתינים</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Invoices List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                חשבוניות ({filteredOrders?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span>טוען חשבוניות...</span>
                </div>
              ) : filteredOrders?.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">אין חשבוניות</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {filteredOrders?.map((order, index) => (
                    <motion.div 
                      key={order.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">#{order.order_number || order.id.slice(0, 8).toUpperCase()}</h3>
                            <Badge variant="outline" className={
                              order.status === "delivered" 
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                            }>
                              {order.status === "delivered" ? "הושלם" : "ממתין"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{order.order_number || "הזמנה"}</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: he })}
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="text-lg font-bold text-primary">₪{order.total?.toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateInvoice(order)}
                            title="הורדה"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.print()}
                            title="הדפסה"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Scan Invoice Dialog */}
        <Dialog open={scanDialogOpen} onOpenChange={(open) => {
          setScanDialogOpen(open);
          if (!open) { setScannedData(null); setShowLineItemReview(false); setExistingSupplier(null); }
        }}>
          <DialogContent className={cn(
            showLineItemReview ? "max-w-3xl" : "max-w-md",
            "bg-card border-border transition-all"
          )}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {showLineItemReview ? 'סקירת פריטים וחשבונית' : 'סריקת חשבונית עם AI'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Line-Item Review Mode */}
              {showLineItemReview && scannedData ? (
                <InvoiceLineItemReview
                  data={scannedData as ScannedInvoiceData}
                  onSave={handleLineItemSave}
                  onCancel={() => setShowLineItemReview(false)}
                  saving={savingLineItems}
                />
              ) : !scannedData ? (
                <div className="space-y-4">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={cameraInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {scanning ? (
                    <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="text-muted-foreground">סורק את החשבונית...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div 
                        className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Camera className="w-6 h-6 text-primary" />
                          </div>
                          <p className="text-foreground font-medium">צלם עם המצלמה</p>
                          <p className="text-xs text-muted-foreground">פתח את המצלמה וצלם</p>
                        </div>
                      </div>

                      <div 
                        className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <Upload className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <p className="text-foreground font-medium">העלה מהמכשיר</p>
                          <p className="text-xs text-muted-foreground">JPG, PNG, PDF</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Supplier status badge */}
                  {existingSupplier ? (
                    <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                      <Building2 className="w-5 h-5 text-primary" />
                      <span className="text-foreground text-sm">ספק קיים: {existingSupplier.name}</span>
                    </div>
                  ) : scannedData.supplierId ? (
                    <div className="flex items-center gap-2 p-3 bg-accent border border-border rounded-lg">
                      <UserPlus className="w-5 h-5 text-primary" />
                      <span className="text-foreground text-sm">ספק חדש נוסף: {scannedData.supplierName}</span>
                    </div>
                  ) : null}

                  <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">ספק:</span>
                      <span className="text-foreground font-medium">{scannedData.supplierName || scannedData.vendor || 'לא זוהה'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">מספר חשבונית:</span>
                      <span className="text-foreground font-medium">{scannedData.invoiceNumber || 'לא זוהה'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">תאריך:</span>
                      <span className="text-foreground font-medium">{scannedData.date || 'לא זוהה'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">סכום:</span>
                      <span className="text-primary font-bold text-lg">
                        {scannedData.currency === 'ILS' ? '₪' : scannedData.currency}
                        {scannedData.total?.toLocaleString() || 0}
                      </span>
                    </div>
                    {scannedData.lineItems?.length > 0 && (
                      <div className="pt-2 border-t border-border">
                        <span className="text-muted-foreground text-sm block mb-2">
                          {scannedData.lineItems.length} פריטים זוהו
                        </span>
                        <ul className="text-foreground text-sm space-y-1">
                          {scannedData.lineItems.slice(0, 3).map((item: any, i: number) => (
                            <li key={i} className="truncate flex items-center justify-between">
                              <span>• {item.name}</span>
                              <span className="text-muted-foreground text-xs">×{item.quantity} · ₪{item.unitPrice}</span>
                            </li>
                          ))}
                          {scannedData.lineItems.length > 3 && (
                            <li className="text-xs text-muted-foreground">...ועוד {scannedData.lineItems.length - 3} פריטים</li>
                          )}
                        </ul>
                      </div>
                    )}
                    {scannedData.items?.length > 0 && !scannedData.lineItems?.length && (
                      <div className="pt-2 border-t border-border">
                        <span className="text-muted-foreground text-sm block mb-2">פריטים:</span>
                        <ul className="text-foreground text-sm space-y-1">
                          {scannedData.items.slice(0, 5).map((item: string, i: number) => (
                            <li key={i} className="truncate">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setScannedData(null);
                        fileInputRef.current?.click();
                      }}
                    >
                      סריקה מחדש
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={saveScannedInvoice}
                    >
                      {scannedData.lineItems?.length > 0 ? 'סקירת פריטים →' : 'שמור חשבונית'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* New Supplier Confirmation Dialog */}
        <AlertDialog open={newSupplierDialogOpen} onOpenChange={setNewSupplierDialogOpen}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-primary" />
                </div>
                <AlertDialogTitle className="text-xl">ספק חדש זוהה</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-muted-foreground">
                הספק <span className="text-foreground font-semibold">"{pendingSupplierData?.name}"</span> לא נמצא במערכת.
                <br />
                האם ברצונך להוסיף אותו כספק חדש?
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            {pendingSupplierData && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 my-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">שם הספק:</span>
                  <span className="text-foreground">{pendingSupplierData.name}</span>
                </div>
                {pendingSupplierData.phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">טלפון:</span>
                    <span className="text-foreground">{pendingSupplierData.phone}</span>
                  </div>
                )}
                {pendingSupplierData.email && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">אימייל:</span>
                    <span className="text-foreground">{pendingSupplierData.email}</span>
                  </div>
                )}
              </div>
            )}

            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel 
                onClick={handleSkipNewSupplier}
              >
                דלג
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmNewSupplier}
              >
                <UserPlus className="w-4 h-4 ml-2" />
                הוסף ספק
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminInvoices;