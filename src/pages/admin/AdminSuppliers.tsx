import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
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
  RefreshCw,
  DollarSign,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

const supplierTypeConfig: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  fixed: { label: "קבוע", icon: Building2, color: "text-green-600", bgColor: "bg-green-100" },
  variable: { label: "משתנה", icon: Truck, color: "text-blue-600", bgColor: "bg-blue-100" },
  merchandise: { label: "סחורה", icon: ShoppingBag, color: "text-pink-600", bgColor: "bg-pink-100" },
};

const AdminSuppliers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // New supplier form
  const [newSupplier, setNewSupplier] = useState({
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
  }, []);

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
        // Mock data for demo
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

  const totalMonthlyExpenses = filteredSuppliers.reduce((sum, s) => sum + Number(s.monthly_amount), 0);

  const handleCreateSupplier = async () => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .insert({
          name: newSupplier.name,
          contact_name: newSupplier.contact_name || null,
          email: newSupplier.email || null,
          phone: newSupplier.phone || null,
          address: newSupplier.address || null,
          city: newSupplier.city || null,
          supplier_type: newSupplier.supplier_type,
          monthly_amount: parseFloat(newSupplier.monthly_amount) || 0,
          notes: newSupplier.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setSuppliers([data, ...suppliers]);
      }

      setIsCreateDialogOpen(false);
      resetForm();

      toast({
        title: "נוצר בהצלחה",
        description: "הספק נוסף למערכת",
      });
    } catch (error) {
      console.error("Error creating supplier:", error);
      // Create locally for demo
      const mockSupplier: Supplier = {
        id: Date.now().toString(),
        name: newSupplier.name,
        contact_name: newSupplier.contact_name || null,
        email: newSupplier.email || null,
        phone: newSupplier.phone || null,
        address: newSupplier.address || null,
        city: newSupplier.city || null,
        supplier_type: newSupplier.supplier_type,
        monthly_amount: parseFloat(newSupplier.monthly_amount) || 0,
        notes: newSupplier.notes || null,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setSuppliers([mockSupplier, ...suppliers]);
      setIsCreateDialogOpen(false);
      resetForm();
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setSuppliers(suppliers.filter(s => s.id !== id));

      toast({
        title: "נמחק בהצלחה",
        description: "הספק הוסר מהמערכת",
      });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      setSuppliers(suppliers.filter(s => s.id !== id));
    }
  };

  const resetForm = () => {
    setNewSupplier({
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

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-violet-50 via-background to-orange-50" dir="rtl">
      {/* Header - Nartina Style */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-violet-600 to-violet-700 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-white/20 text-white"
            onClick={() => navigate("/admin/financial")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold">ניהול ספקים</h1>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-white/20 text-white"
            onClick={fetchSuppliers}
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
        </div>
      ) : (
        <div className="px-4 py-6 space-y-6">
          {/* Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-5 bg-gradient-to-br from-violet-500 to-violet-600 text-white border-none shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 mb-1">סה"כ הוצאות חודשיות</p>
                  <p className="text-3xl font-bold">₪{totalMonthlyExpenses.toLocaleString()}</p>
                  <p className="text-sm text-white/80 mt-1">{filteredSuppliers.length} ספקים פעילים</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <DollarSign className="w-8 h-8" />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Search & Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש ספק..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="סוג" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="fixed">קבוע</SelectItem>
                <SelectItem value="variable">משתנה</SelectItem>
                <SelectItem value="merchandise">סחורה</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="w-4 h-4 ml-1" />
                  חדש
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
                <DialogHeader>
                  <DialogTitle>ספק חדש</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>שם הספק *</Label>
                    <Input
                      placeholder="הזן שם ספק..."
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>איש קשר</Label>
                      <Input
                        placeholder="שם איש קשר"
                        value={newSupplier.contact_name}
                        onChange={(e) => setNewSupplier({ ...newSupplier, contact_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>טלפון</Label>
                      <Input
                        placeholder="טלפון"
                        value={newSupplier.phone}
                        onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>אימייל</Label>
                    <Input
                      type="email"
                      placeholder="אימייל"
                      value={newSupplier.email}
                      onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>כתובת</Label>
                      <Input
                        placeholder="כתובת"
                        value={newSupplier.address}
                        onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>עיר</Label>
                      <Input
                        placeholder="עיר"
                        value={newSupplier.city}
                        onChange={(e) => setNewSupplier({ ...newSupplier, city: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>סוג ספק</Label>
                      <Select
                        value={newSupplier.supplier_type}
                        onValueChange={(value) => setNewSupplier({ ...newSupplier, supplier_type: value })}
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
                    <div className="space-y-2">
                      <Label>סכום חודשי</Label>
                      <Input
                        type="number"
                        placeholder="₪0"
                        value={newSupplier.monthly_amount}
                        onChange={(e) => setNewSupplier({ ...newSupplier, monthly_amount: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full bg-violet-500 hover:bg-violet-600"
                    onClick={handleCreateSupplier}
                    disabled={!newSupplier.name}
                  >
                    הוספת ספק
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Type Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {Object.entries(supplierTypeConfig).map(([type, config]) => {
              const count = suppliers.filter(s => s.supplier_type === type).length;
              const Icon = config.icon;
              return (
                <Button
                  key={type}
                  variant={filterType === type ? "default" : "outline"}
                  size="sm"
                  className={filterType === type ? config.bgColor : ""}
                  onClick={() => setFilterType(filterType === type ? "all" : type)}
                >
                  <Icon className="w-4 h-4 ml-1" />
                  {config.label} ({count})
                </Button>
              );
            })}
          </div>

          {/* Suppliers List */}
          <div className="space-y-3">
            {filteredSuppliers.map((supplier, index) => {
              const typeConfig = supplierTypeConfig[supplier.supplier_type] || supplierTypeConfig.variable;
              const Icon = typeConfig.icon;
              
              return (
                <motion.div
                  key={supplier.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-4 bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${typeConfig.bgColor}`}>
                          <Icon className={`w-6 h-6 ${typeConfig.color}`} />
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground">{supplier.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className={`${typeConfig.color} border-current`}>
                              {typeConfig.label}
                            </Badge>
                            {supplier.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {supplier.city}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <p className="font-bold text-foreground">₪{supplier.monthly_amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">לחודש</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedSupplier(supplier);
                              setIsViewDialogOpen(true);
                            }}>
                              <Eye className="w-4 h-4 ml-2" />
                              צפייה
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 ml-2" />
                              עריכה
                            </DropdownMenuItem>
                            {supplier.phone && (
                              <DropdownMenuItem onClick={() => window.location.href = `tel:${supplier.phone}`}>
                                <Phone className="w-4 h-4 ml-2" />
                                התקשר
                              </DropdownMenuItem>
                            )}
                            {supplier.email && (
                              <DropdownMenuItem onClick={() => window.location.href = `mailto:${supplier.email}`}>
                                <Mail className="w-4 h-4 ml-2" />
                                שלח מייל
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <FileText className="w-4 h-4 ml-2" />
                              חשבוניות
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteSupplier(supplier.id)}
                            >
                              <Trash2 className="w-4 h-4 ml-2" />
                              מחיקה
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {filteredSuppliers.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">לא נמצאו ספקים</p>
            </div>
          )}
        </div>
      )}

      {/* Supplier View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          {selectedSupplier && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedSupplier.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">סכום חודשי:</span>
                  <span className="font-bold text-lg">₪{selectedSupplier.monthly_amount.toLocaleString()}</span>
                </div>

                {selectedSupplier.contact_name && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">איש קשר:</span>
                    <span>{selectedSupplier.contact_name}</span>
                  </div>
                )}

                {selectedSupplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${selectedSupplier.phone}`} className="text-violet-600 hover:underline">
                      {selectedSupplier.phone}
                    </a>
                  </div>
                )}

                {selectedSupplier.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${selectedSupplier.email}`} className="text-violet-600 hover:underline">
                      {selectedSupplier.email}
                    </a>
                  </div>
                )}

                {(selectedSupplier.address || selectedSupplier.city) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {[selectedSupplier.address, selectedSupplier.city].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}

                {selectedSupplier.notes && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">הערות:</p>
                    <p>{selectedSupplier.notes}</p>
                  </div>
                )}

                <Button 
                  className="w-full bg-violet-500 hover:bg-violet-600"
                  onClick={() => navigate(`/admin/suppliers/${selectedSupplier.id}/invoices`)}
                >
                  <FileText className="w-4 h-4 ml-2" />
                  צפייה בחשבוניות
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSuppliers;
