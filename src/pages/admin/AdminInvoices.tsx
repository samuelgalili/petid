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
  Building2
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const AdminInvoices = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
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
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "שגיאה בשמירה",
        description: "לא ניתן היה לשמור את החשבונית",
        variant: "destructive",
      });
    }
  };

  const stats = [
    {
      title: "סה״כ חשבוניות",
      value: orders?.length || 0,
      icon: FileText,
      gradient: "from-violet-500 to-purple-600",
    },
    {
      title: "סכום כולל",
      value: `₪${(orders?.reduce((acc, o) => acc + (o.total || 0), 0) || 0).toLocaleString()}`,
      icon: Receipt,
      gradient: "from-emerald-500 to-green-600",
    },
    {
      title: "החודש",
      value: orders?.filter(o => {
        const orderDate = new Date(o.created_at);
        const now = new Date();
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      }).length || 0,
      icon: Calendar,
      gradient: "from-amber-500 to-orange-600",
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
        {/* Scan Button */}
        <div className="flex justify-end">
          <Button 
            onClick={() => setScanDialogOpen(true)}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          >
            <Camera className="w-4 h-4 ml-2" />
            סריקת חשבונית
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 to-slate-800">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-10`} />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Controls */}
        <Card className="border-0 bg-gradient-to-br from-slate-900 to-slate-800">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="חיפוש לפי מספר הזמנה או שם לקוח..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
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
        <Card className="border-0 bg-gradient-to-br from-slate-900 to-slate-800">
          <CardHeader className="border-b border-slate-700/50">
            <CardTitle className="text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-violet-400" />
              חשבוניות ({filteredOrders?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">טוען...</div>
            ) : filteredOrders?.length === 0 ? (
              <div className="p-8 text-center text-slate-400">אין חשבוניות</div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {filteredOrders?.map((order) => (
                  <div key={order.id} className="p-4 hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white">#{order.order_number || order.id.slice(0, 8).toUpperCase()}</h3>
                          <Badge className={
                            order.status === "delivered" 
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          }>
                            {order.status === "delivered" ? "הושלם" : "ממתין"}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400">{order.order_number || "הזמנה"}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: he })}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-violet-400">₪{order.total?.toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-700 text-slate-300"
                          onClick={() => generateInvoice(order)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-700 text-slate-300"
                          onClick={() => window.print()}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scan Invoice Dialog */}
        <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
          <DialogContent className="max-w-md bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-400" />
                סריקת חשבונית עם AI
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

              {!scannedData ? (
                <div className="space-y-4">
                  {/* Camera capture input */}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={cameraInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {scanning ? (
                    <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
                        <p className="text-slate-400">סורק את החשבונית...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {/* Camera button */}
                      <div 
                        className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-all"
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center">
                            <Camera className="w-6 h-6 text-violet-400" />
                          </div>
                          <p className="text-slate-300 font-medium">צלם עם המצלמה</p>
                          <p className="text-xs text-slate-500">פתח את המצלמה וצלם</p>
                        </div>
                      </div>

                      {/* Upload button */}
                      <div 
                        className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-all"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center">
                            <Upload className="w-6 h-6 text-slate-400" />
                          </div>
                          <p className="text-slate-300 font-medium">העלה מהמכשיר</p>
                          <p className="text-xs text-slate-500">JPG, PNG, PDF</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Supplier status badge */}
                  {existingSupplier ? (
                    <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <Building2 className="w-5 h-5 text-emerald-400" />
                      <span className="text-emerald-300 text-sm">ספק קיים: {existingSupplier.name}</span>
                    </div>
                  ) : scannedData.supplierId ? (
                    <div className="flex items-center gap-2 p-3 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                      <UserPlus className="w-5 h-5 text-violet-400" />
                      <span className="text-violet-300 text-sm">ספק חדש נוסף: {scannedData.supplierName}</span>
                    </div>
                  ) : null}

                  <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">ספק:</span>
                      <span className="text-white font-medium">{scannedData.supplierName || scannedData.vendor || 'לא זוהה'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">מספר חשבונית:</span>
                      <span className="text-white font-medium">{scannedData.invoiceNumber || 'לא זוהה'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">תאריך:</span>
                      <span className="text-white font-medium">{scannedData.date || 'לא זוהה'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">סכום:</span>
                      <span className="text-violet-400 font-bold text-lg">
                        {scannedData.currency === 'ILS' ? '₪' : scannedData.currency}
                        {scannedData.total?.toLocaleString() || 0}
                      </span>
                    </div>
                    {scannedData.items?.length > 0 && (
                      <div className="pt-2 border-t border-slate-700">
                        <span className="text-slate-400 text-sm block mb-2">פריטים:</span>
                        <ul className="text-white text-sm space-y-1">
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
                      className="flex-1 border-slate-700"
                      onClick={() => {
                        setScannedData(null);
                        fileInputRef.current?.click();
                      }}
                    >
                      סריקה מחדש
                    </Button>
                    <Button
                      className="flex-1 bg-violet-600 hover:bg-violet-700"
                      onClick={saveScannedInvoice}
                    >
                      שמור חשבונית
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* New Supplier Confirmation Dialog */}
        <AlertDialog open={newSupplierDialogOpen} onOpenChange={setNewSupplierDialogOpen}>
          <AlertDialogContent className="bg-slate-900 border-slate-800">
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-violet-400" />
                </div>
                <AlertDialogTitle className="text-xl">ספק חדש זוהה</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-slate-400">
                הספק <span className="text-white font-semibold">"{pendingSupplierData?.name}"</span> לא נמצא במערכת.
                <br />
                האם ברצונך להוסיף אותו כספק חדש?
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            {pendingSupplierData && (
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-2 my-4">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">שם הספק:</span>
                  <span className="text-white">{pendingSupplierData.name}</span>
                </div>
                {pendingSupplierData.phone && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">טלפון:</span>
                    <span className="text-white">{pendingSupplierData.phone}</span>
                  </div>
                )}
                {pendingSupplierData.email && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">אימייל:</span>
                    <span className="text-white">{pendingSupplierData.email}</span>
                  </div>
                )}
              </div>
            )}

            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel 
                onClick={handleSkipNewSupplier}
                className="border-slate-700 bg-transparent hover:bg-slate-800"
              >
                דלג
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmNewSupplier}
                className="bg-violet-600 hover:bg-violet-700"
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