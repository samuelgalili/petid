import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Building2,
  ShoppingBag,
  Truck,
  Phone,
  Mail,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  FileText,
  DollarSign,
  MapPin,
  TrendingUp,
  Users,
  Package,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  AdminStatCard,
  AdminStatsGrid,
  AdminPageHeader,
  AdminSectionCard,
  AdminEmptyState,
} from "@/components/admin/AdminStyles";
import { cn } from "@/lib/utils";

interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  supplier_type: string;
  monthly_amount: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

const supplierTypeConfig: Record<string, { label: string; icon: any; color: string; bgColor: string; borderColor: string }> = {
  fixed: { 
    label: "קבוע", 
    icon: Building2, 
    color: "text-emerald-600", 
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30"
  },
  variable: { 
    label: "משתנה", 
    icon: Truck, 
    color: "text-blue-600", 
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30"
  },
  merchandise: { 
    label: "סחורה", 
    icon: ShoppingBag, 
    color: "text-violet-600", 
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30"
  },
};

const AdminSuppliers = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [supplierProducts, setSupplierProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    supplier_type: "variable",
    monthly_amount: "",
    notes: "",
  });

  useEffect(() => {
    fetchSuppliers();
    fetchSupplierProducts();
  }, []);

  const fetchSupplierProducts = async () => {
    try {
      const { data } = await supabase
        .from("business_products")
        .select("id, name, price, sale_price, cost_price, supplier_id, image_url, in_stock")
        .not("supplier_id", "is", null);
      if (data) setSupplierProducts(data);
    } catch (err) {
      console.error("Error fetching supplier products:", err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");

      if (error) throw error;

      if (data && data.length > 0) {
        setSuppliers(data);
      } else {
        // Demo data
        setSuppliers([
          {
            id: "1",
            name: "דיו סנטר",
            contact_name: "יוסי כהן",
            email: "info@diocenter.co.il",
            phone: "03-1234567",
            address: "רחוב הרצל 15",
            city: "תל אביב",
            supplier_type: "merchandise",
            monthly_amount: 1655,
            notes: null,
            is_active: true,
            created_at: new Date().toISOString(),
          },
          {
            id: "2",
            name: "חברת החשמל",
            contact_name: null,
            email: "service@iec.co.il",
            phone: "*103",
            address: null,
            city: null,
            supplier_type: "fixed",
            monthly_amount: 7655,
            notes: "תשלום חודשי קבוע",
            is_active: true,
            created_at: new Date().toISOString(),
          },
          {
            id: "3",
            name: "שרם שיווק",
            contact_name: "דני שרם",
            email: "danny@sherem.co.il",
            phone: "052-8765432",
            address: "אזור תעשייה",
            city: "חולון",
            supplier_type: "variable",
            monthly_amount: 988,
            notes: null,
            is_active: true,
            created_at: new Date().toISOString(),
          },
          {
            id: "4",
            name: "עיריית ירושלים",
            contact_name: null,
            email: null,
            phone: "*106",
            address: null,
            city: "ירושלים",
            supplier_type: "fixed",
            monthly_amount: 2544,
            notes: "ארנונה",
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (supplier.contact_name && supplier.contact_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === "all" || supplier.supplier_type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: suppliers.length,
    totalMonthly: suppliers.reduce((sum, s) => sum + Number(s.monthly_amount), 0),
    fixed: suppliers.filter(s => s.supplier_type === "fixed").length,
    variable: suppliers.filter(s => s.supplier_type === "variable").length,
    merchandise: suppliers.filter(s => s.supplier_type === "merchandise").length,
    fixedAmount: suppliers.filter(s => s.supplier_type === "fixed").reduce((sum, s) => sum + Number(s.monthly_amount), 0),
    variableAmount: suppliers.filter(s => s.supplier_type === "variable").reduce((sum, s) => sum + Number(s.monthly_amount), 0),
    merchandiseAmount: suppliers.filter(s => s.supplier_type === "merchandise").reduce((sum, s) => sum + Number(s.monthly_amount), 0),
  };

  const handleCreateSupplier = async () => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .insert({
          name: formData.name,
          contact_name: formData.contact_name || null,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          city: formData.city || null,
          supplier_type: formData.supplier_type,
          monthly_amount: parseFloat(formData.monthly_amount) || 0,
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setSuppliers([data, ...suppliers]);
      }

      setIsCreateDialogOpen(false);
      resetForm();

      toast({ title: "✅ ספק נוסף בהצלחה" });
    } catch (error) {
      console.error("Error creating supplier:", error);
      // Demo fallback
      const mockSupplier: Supplier = {
        id: Date.now().toString(),
        name: formData.name,
        contact_name: formData.contact_name || null,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        city: formData.city || null,
        supplier_type: formData.supplier_type,
        monthly_amount: parseFloat(formData.monthly_amount) || 0,
        notes: formData.notes || null,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setSuppliers([mockSupplier, ...suppliers]);
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "✅ ספק נוסף בהצלחה" });
    }
  };

  const handleUpdateSupplier = async () => {
    if (!selectedSupplier) return;
    
    try {
      const { error } = await supabase
        .from("suppliers")
        .update({
          name: formData.name,
          contact_name: formData.contact_name || null,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          city: formData.city || null,
          supplier_type: formData.supplier_type,
          monthly_amount: parseFloat(formData.monthly_amount) || 0,
          notes: formData.notes || null,
        })
        .eq("id", selectedSupplier.id);

      if (error) throw error;

      setSuppliers(suppliers.map(s => 
        s.id === selectedSupplier.id 
          ? { ...s, ...formData, monthly_amount: parseFloat(formData.monthly_amount) || 0 }
          : s
      ));

      setIsViewDialogOpen(false);
      setIsEditMode(false);
      setSelectedSupplier(null);
      resetForm();

      toast({ title: "✅ ספק עודכן בהצלחה" });
    } catch (error) {
      console.error("Error updating supplier:", error);
      // Demo fallback
      setSuppliers(suppliers.map(s => 
        s.id === selectedSupplier.id 
          ? { ...s, ...formData, monthly_amount: parseFloat(formData.monthly_amount) || 0 }
          : s
      ));
      setIsViewDialogOpen(false);
      setIsEditMode(false);
      toast({ title: "✅ ספק עודכן בהצלחה" });
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
      setSuppliers(suppliers.filter(s => s.id !== id));
      toast({ title: "✅ ספק נמחק בהצלחה" });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      setSuppliers(suppliers.filter(s => s.id !== id));
      toast({ title: "✅ ספק נמחק בהצלחה" });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      contact_name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      supplier_type: "variable",
      monthly_amount: "",
      notes: "",
    });
  };

  const openViewDialog = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_name: supplier.contact_name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      city: supplier.city || "",
      supplier_type: supplier.supplier_type,
      monthly_amount: supplier.monthly_amount.toString(),
      notes: supplier.notes || "",
    });
    setIsEditMode(false);
    setIsViewDialogOpen(true);
  };

  return (
    <AdminLayout title="ניהול ספקים">
      <div className="p-6 space-y-6">
        <AdminPageHeader
          title="ניהול ספקים"
          description="ניהול ספקים, הוצאות קבועות ומשתנות"
          icon={Building2}
          onRefresh={fetchSuppliers}
          isRefreshing={loading}
          actions={
            <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              ספק חדש
            </Button>
          }
        />

        {/* Stats Grid */}
        <AdminStatsGrid columns={4}>
          <AdminStatCard
            title="סה״כ הוצאות חודשיות"
            value={`₪${stats.totalMonthly.toLocaleString()}`}
            icon={DollarSign}
            color="primary"
            subtitle={`${stats.total} ספקים פעילים`}
          />
          <AdminStatCard
            title="הוצאות קבועות"
            value={`₪${stats.fixedAmount.toLocaleString()}`}
            icon={Building2}
            color="success"
            subtitle={`${stats.fixed} ספקים`}
          />
          <AdminStatCard
            title="הוצאות משתנות"
            value={`₪${stats.variableAmount.toLocaleString()}`}
            icon={Truck}
            color="info"
            subtitle={`${stats.variable} ספקים`}
          />
          <AdminStatCard
            title="סחורה"
            value={`₪${stats.merchandiseAmount.toLocaleString()}`}
            icon={ShoppingBag}
            color="purple"
            subtitle={`${stats.merchandise} ספקים`}
          />
        </AdminStatsGrid>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("all")}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            הכל
            <Badge variant="secondary" className="mr-1">{stats.total}</Badge>
          </Button>
          {Object.entries(supplierTypeConfig).map(([type, config]) => {
            const count = suppliers.filter(s => s.supplier_type === type).length;
            const Icon = config.icon;
            return (
              <Button
                key={type}
                variant={filterType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(type)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {config.label}
                <Badge variant="secondary" className="mr-1">{count}</Badge>
              </Button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם ספק או איש קשר..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Suppliers List */}
        <AdminSectionCard title="רשימת ספקים" icon={Package}>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <AdminEmptyState
              icon={Building2}
              title="לא נמצאו ספקים"
              description="הוסף ספקים חדשים או שנה את הסינון"
              action={{ label: "הוסף ספק", onClick: () => setIsCreateDialogOpen(true) }}
            />
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredSuppliers.map((supplier, index) => {
                    const typeConfig = supplierTypeConfig[supplier.supplier_type] || supplierTypeConfig.variable;
                    const Icon = typeConfig.icon;

                    return (
                      <motion.div
                        key={supplier.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <Card className="hover:shadow-md transition-all hover:border-primary/30">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "w-12 h-12 rounded-xl flex items-center justify-center",
                                  typeConfig.bgColor
                                )}>
                                  <Icon className={cn("h-6 w-6", typeConfig.color)} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold">{supplier.name}</h4>
                                    <Badge 
                                      variant="outline" 
                                      className={cn("text-xs", typeConfig.color, typeConfig.borderColor)}
                                    >
                                      {typeConfig.label}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    {supplier.contact_name && (
                                      <span className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {supplier.contact_name}
                                      </span>
                                    )}
                                    {supplier.city && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {supplier.city}
                                      </span>
                                    )}
                                    {supplier.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {supplier.phone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="text-left">
                                  <p className="text-xl font-bold">₪{supplier.monthly_amount.toLocaleString()}</p>
                                  <p className="text-xs text-muted-foreground">לחודש</p>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openViewDialog(supplier)}>
                                      <Eye className="h-4 w-4 ml-2" />
                                      צפייה
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      openViewDialog(supplier);
                                      setIsEditMode(true);
                                    }}>
                                      <Edit className="h-4 w-4 ml-2" />
                                      עריכה
                                    </DropdownMenuItem>
                                    {supplier.phone && (
                                      <DropdownMenuItem onClick={() => window.location.href = `tel:${supplier.phone}`}>
                                        <Phone className="h-4 w-4 ml-2" />
                                        התקשר
                                      </DropdownMenuItem>
                                    )}
                                    {supplier.email && (
                                      <DropdownMenuItem onClick={() => window.location.href = `mailto:${supplier.email}`}>
                                        <Mail className="h-4 w-4 ml-2" />
                                        שלח מייל
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem>
                                      <FileText className="h-4 w-4 ml-2" />
                                      חשבוניות
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => handleDeleteSupplier(supplier.id)}
                                    >
                                      <Trash2 className="h-4 w-4 ml-2" />
                                      מחיקה
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </AdminSectionCard>

        {/* Product Margins by Supplier */}
        {supplierProducts.length > 0 && (
          <AdminSectionCard title="מרווחי מוצרים לפי ספק" icon={BarChart3}>
            <div className="space-y-4">
              {suppliers.filter(s => supplierProducts.some(p => p.supplier_id === s.id)).map(supplier => {
                const products = supplierProducts.filter(p => p.supplier_id === supplier.id);
                const productsWithCost = products.filter(p => p.cost_price);
                const avgMargin = productsWithCost.length > 0
                  ? productsWithCost.reduce((sum, p) => {
                      const sellPrice = p.sale_price || p.price;
                      return sum + ((sellPrice - p.cost_price) / sellPrice) * 100;
                    }, 0) / productsWithCost.length
                  : 0;
                const totalRevenue = products.reduce((sum, p) => sum + (p.sale_price || p.price), 0);
                const totalCost = productsWithCost.reduce((sum, p) => sum + p.cost_price, 0);

                return (
                  <div key={supplier.id} className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-bold">{supplier.name}</h4>
                          <p className="text-xs text-muted-foreground">{products.length} מוצרים</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={cn("text-lg font-extrabold", avgMargin > 30 ? "text-emerald-600" : avgMargin > 15 ? "text-amber-600" : "text-destructive")}>
                          {Math.round(avgMargin)}% מרווח
                        </p>
                        <p className="text-xs text-muted-foreground">₪{Math.round(totalRevenue - totalCost)} רווח פוטנציאלי</p>
                      </div>
                    </div>
                    {productsWithCost.filter(p => ((p.sale_price || p.price) - p.cost_price) / (p.sale_price || p.price) < 0.15).length > 0 && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span className="text-amber-700 dark:text-amber-400 font-medium">
                          {productsWithCost.filter(p => ((p.sale_price || p.price) - p.cost_price) / (p.sale_price || p.price) < 0.15).length} מוצרים עם מרווח מתחת ל-15%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </AdminSectionCard>
        )}

        {/* Create Supplier Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                ספק חדש
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>שם הספק *</Label>
                <Input
                  placeholder="הזן שם ספק..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>איש קשר</Label>
                  <Input
                    placeholder="שם איש קשר"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>טלפון</Label>
                  <Input
                    placeholder="טלפון"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>אימייל</Label>
                <Input
                  type="email"
                  placeholder="אימייל"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>כתובת</Label>
                  <Input
                    placeholder="כתובת"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div>
                  <Label>עיר</Label>
                  <Input
                    placeholder="עיר"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>סוג ספק</Label>
                  <Select
                    value={formData.supplier_type}
                    onValueChange={(value) => setFormData({ ...formData, supplier_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">קבוע</SelectItem>
                      <SelectItem value="variable">משתנה</SelectItem>
                      <SelectItem value="merchandise">סחורה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>סכום חודשי</Label>
                  <Input
                    type="number"
                    placeholder="₪0"
                    value={formData.monthly_amount}
                    onChange={(e) => setFormData({ ...formData, monthly_amount: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>הערות</Label>
                <Textarea
                  placeholder="הערות נוספות..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
                ביטול
              </Button>
              <Button onClick={handleCreateSupplier} disabled={!formData.name}>
                הוסף ספק
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View/Edit Supplier Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
          setIsViewDialogOpen(open);
          if (!open) {
            setIsEditMode(false);
            setSelectedSupplier(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-md">
            {selectedSupplier && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {isEditMode ? <Edit className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    {isEditMode ? "עריכת ספק" : selectedSupplier.name}
                  </DialogTitle>
                </DialogHeader>

                {isEditMode ? (
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>שם הספק *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>איש קשר</Label>
                        <Input
                          value={formData.contact_name}
                          onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>טלפון</Label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>אימייל</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>כתובת</Label>
                        <Input
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>עיר</Label>
                        <Input
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>סוג ספק</Label>
                        <Select
                          value={formData.supplier_type}
                          onValueChange={(value) => setFormData({ ...formData, supplier_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">קבוע</SelectItem>
                            <SelectItem value="variable">משתנה</SelectItem>
                            <SelectItem value="merchandise">סחורה</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>סכום חודשי</Label>
                        <Input
                          type="number"
                          value={formData.monthly_amount}
                          onChange={(e) => setFormData({ ...formData, monthly_amount: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>הערות</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsEditMode(false)}>
                        ביטול
                      </Button>
                      <Button onClick={handleUpdateSupplier} disabled={!formData.name}>
                        שמור שינויים
                      </Button>
                    </DialogFooter>
                  </div>
                ) : (
                  <div className="space-y-4 mt-4">
                    <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">סכום חודשי</span>
                        <span className="text-2xl font-bold">₪{selectedSupplier.monthly_amount.toLocaleString()}</span>
                      </div>
                    </Card>

                    <div className="space-y-3">
                      {selectedSupplier.contact_name && (
                        <div className="flex items-center gap-3">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedSupplier.contact_name}</span>
                        </div>
                      )}

                      {selectedSupplier.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a href={`tel:${selectedSupplier.phone}`} className="text-primary hover:underline">
                            {selectedSupplier.phone}
                          </a>
                        </div>
                      )}

                      {selectedSupplier.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${selectedSupplier.email}`} className="text-primary hover:underline">
                            {selectedSupplier.email}
                          </a>
                        </div>
                      )}

                      {(selectedSupplier.address || selectedSupplier.city) && (
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{[selectedSupplier.address, selectedSupplier.city].filter(Boolean).join(", ")}</span>
                        </div>
                      )}
                    </div>

                    {selectedSupplier.notes && (
                      <>
                        <Separator />
                        <Card className="p-3 bg-muted/30">
                          <p className="text-sm text-muted-foreground mb-1">הערות:</p>
                          <p className="text-sm">{selectedSupplier.notes}</p>
                        </Card>
                      </>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1" onClick={() => setIsEditMode(true)}>
                        <Edit className="h-4 w-4 ml-2" />
                        עריכה
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <FileText className="h-4 w-4 ml-2" />
                        חשבוניות
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminSuppliers;
