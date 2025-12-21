import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Package, Plus, Edit, Trash2, MoreHorizontal, 
  Upload, Download, Image as ImageIcon, AlertCircle
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, Column, FilterOption } from "@/components/admin/DataTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { supabase } from "@/integrations/supabase/client";

interface ProductData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string;
  category: string | null;
  in_stock: boolean | null;
  is_featured: boolean | null;
  business_id: string;
  created_at: string;
  needs_image_review?: boolean | null;
  needs_price_review?: boolean | null;
}

const emptyProduct: Partial<ProductData> = {
  name: "",
  description: "",
  price: 0,
  original_price: null,
  image_url: "",
  category: "",
  in_stock: true,
  is_featured: false,
};

const categories = [
  { value: "food", label: "מזון" },
  { value: "treats", label: "חטיפים" },
  { value: "toys", label: "צעצועים" },
  { value: "accessories", label: "אביזרים" },
  { value: "health", label: "בריאות" },
  { value: "grooming", label: "טיפוח" },
];

const AdminProducts = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<Partial<ProductData> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; productId?: string }>({ open: false });
  const [uploading, setUploading] = useState(false);
  const [showNeedsReview, setShowNeedsReview] = useState(false);

  // Check URL param for needs_review filter
  useEffect(() => {
    if (searchParams.get("filter") === "needs_review") {
      setShowNeedsReview(true);
    }
  }, [searchParams]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ProductData[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (product: Partial<ProductData>) => {
      if (product.id) {
        const { error } = await supabase
          .from("business_products")
          .update({
            name: product.name,
            description: product.description,
            price: product.price,
            original_price: product.original_price,
            image_url: product.image_url,
            category: product.category,
            in_stock: product.in_stock,
            is_featured: product.is_featured,
          })
          .eq("id", product.id);

        if (error) throw error;

        await logAction({
          action_type: "product.updated",
          entity_type: "product",
          entity_id: product.id,
          new_values: product,
        });
      } else {
        // For new products, we need a business_id
        // In a real app, this would come from the selected business
        const { error } = await supabase
          .from("business_products")
          .insert({
            name: product.name,
            description: product.description,
            price: product.price,
            original_price: product.original_price,
            image_url: product.image_url || "/placeholder.svg",
            category: product.category,
            in_stock: product.in_stock,
            is_featured: product.is_featured,
            business_id: "00000000-0000-0000-0000-000000000000", // Placeholder
          });

        if (error) throw error;

        await logAction({
          action_type: "product.created",
          entity_type: "product",
          new_values: product,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: editingProduct?.id ? "המוצר עודכן" : "המוצר נוסף" });
      setIsDialogOpen(false);
      setEditingProduct(null);
    },
    onError: () => {
      toast({ title: "שגיאה", description: "הפעולה נכשלה", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from("business_products")
        .delete()
        .eq("id", productId);

      if (error) throw error;

      await logAction({
        action_type: "product.deleted",
        entity_type: "product",
        entity_id: productId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: "המוצר נמחק" });
      setDeleteDialog({ open: false });
    },
    onError: () => {
      toast({ title: "שגיאה", description: "המחיקה נכשלה", variant: "destructive" });
    },
  });

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `product-${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setEditingProduct((prev) => prev ? { ...prev, image_url: publicUrl } : null);
      toast({ title: "התמונה הועלתה" });
    } catch (error) {
      toast({ title: "שגיאה בהעלאת התמונה", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const columns: Column<ProductData>[] = [
    {
      key: "product",
      header: "מוצר",
      render: (product) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-medium">{product.name}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "קטגוריה",
      render: (product) => (
        <Badge variant="outline" className="text-xs">
          {categories.find((c) => c.value === product.category)?.label || product.category || "-"}
        </Badge>
      ),
    },
    {
      key: "price",
      header: "מחיר",
      sortable: true,
      render: (product) => (
        <div>
          <span className="font-medium">₪{product.price}</span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-xs text-muted-foreground line-through mr-2">
              ₪{product.original_price}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "סטטוס",
      render: (product) => (
        <div className="flex gap-1 flex-wrap">
          {product.in_stock ? (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              במלאי
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-xs">
              אזל
            </Badge>
          )}
          {product.is_featured && (
            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
              מקודם
            </Badge>
          )}
          {(product.needs_image_review || product.needs_price_review) && (
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
              <AlertCircle className="w-3 h-3 ml-1" />
              דורש בדיקה
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (product) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setEditingProduct(product);
              setIsDialogOpen(true);
            }}>
              <Edit className="w-4 h-4 ml-2" />
              עריכה
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setDeleteDialog({ open: true, productId: product.id })}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              מחיקה
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filters: FilterOption[] = [
    {
      key: "category",
      label: "קטגוריה",
      options: categories,
    },
    {
      key: "in_stock",
      label: "מלאי",
      options: [
        { value: "true", label: "במלאי" },
        { value: "false", label: "אזל" },
      ],
    },
  ];

  // Filter products for needs_review if enabled
  const displayProducts = showNeedsReview 
    ? products.filter(p => p.needs_image_review || p.needs_price_review)
    : products;

  return (
    <AdminLayout title="ניהול מוצרים" breadcrumbs={[{ label: "מוצרים" }]}>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => {
            setEditingProduct(emptyProduct);
            setIsDialogOpen(true);
          }}>
            <Plus className="w-4 h-4 ml-2" />
            הוסף מוצר
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/products/import')}>
            <Upload className="w-4 h-4 ml-2" />
            ייבוא CSV
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            ייצוא
          </Button>
        </div>
        {/* Filter toggle for needs review */}
        <div className="flex items-center gap-2">
          {showNeedsReview && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
              <AlertCircle className="w-3 h-3 ml-1" />
              מציג מוצרים לבדיקה ({displayProducts.length})
            </Badge>
          )}
          <Button 
            variant={showNeedsReview ? "default" : "outline"} 
            size="sm"
            onClick={() => {
              setShowNeedsReview(!showNeedsReview);
              // Clear URL param when toggling off
              if (showNeedsReview) {
                navigate('/admin/products', { replace: true });
              }
            }}
          >
            <AlertCircle className="w-4 h-4 ml-2" />
            {showNeedsReview ? "הצג הכל" : "דורשים בדיקה"}
          </Button>
        </div>
      </div>

      <DataTable
        data={displayProducts}
        columns={columns}
        loading={isLoading}
        filters={filters}
        searchPlaceholder="חיפוש לפי שם מוצר..."
        searchKey={(item, query) => 
          item.name.toLowerCase().includes(query.toLowerCase())
        }
        selectable
        selectedItems={selectedProducts}
        onSelectionChange={setSelectedProducts}
        emptyIcon={<Package className="w-12 h-12" />}
        emptyMessage={showNeedsReview ? "אין מוצרים שדורשים בדיקה" : "לא נמצאו מוצרים"}
        bulkActions={
          <div className="flex gap-2">
            <Button size="sm" variant="destructive">
              <Trash2 className="w-4 h-4 ml-1" />
              מחק נבחרים
            </Button>
          </div>
        }
      />

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingProduct?.id ? "עריכת מוצר" : "הוספת מוצר"}</DialogTitle>
          </DialogHeader>
          
          {editingProduct && (
            <form onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(editingProduct);
            }} className="space-y-4">
              {/* Image Upload */}
              <div className="flex justify-center">
                <div 
                  className="w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {editingProduct.image_url ? (
                    <img src={editingProduct.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                      <span className="text-xs">העלה תמונה</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>שם המוצר *</Label>
                  <Input
                    value={editingProduct.name || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    required
                  />
                </div>
                
                <div className="col-span-2">
                  <Label>תיאור</Label>
                  <Textarea
                    value={editingProduct.description || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label>מחיר *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingProduct.price || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                    required
                  />
                </div>

                <div>
                  <Label>מחיר לפני הנחה</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingProduct.original_price || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, original_price: parseFloat(e.target.value) || null })}
                  />
                </div>

                <div>
                  <Label>קטגוריה</Label>
                  <Select 
                    value={editingProduct.category || ""} 
                    onValueChange={(value) => setEditingProduct({ ...editingProduct, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר קטגוריה" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingProduct.in_stock ?? true}
                      onCheckedChange={(checked) => setEditingProduct({ ...editingProduct, in_stock: checked })}
                    />
                    <Label>במלאי</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingProduct.is_featured ?? false}
                      onCheckedChange={(checked) => setEditingProduct({ ...editingProduct, is_featured: checked })}
                    />
                    <Label>מקודם</Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  ביטול
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "שומר..." : "שמור"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open })}
        title="מחיקת מוצר"
        description="האם אתה בטוח שברצונך למחוק את המוצר? פעולה זו לא ניתנת לביטול."
        confirmLabel="מחק"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteDialog.productId) {
            deleteMutation.mutate(deleteDialog.productId);
          }
        }}
        icon={<Trash2 className="w-5 h-5 text-destructive" />}
      />
    </AdminLayout>
  );
};

export default AdminProducts;
