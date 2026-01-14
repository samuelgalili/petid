import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Package, Plus, Edit, Trash2, MoreHorizontal, 
  Upload, Download, AlertCircle, Flag, CheckCircle
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, Column, FilterOption } from "@/components/admin/DataTable";
import { ProductFormDialog } from "@/components/admin/ProductFormDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { supabase } from "@/integrations/supabase/client";
import { ProductBulkActions, ProductKeyboardShortcutsHelp } from "@/components/admin/products";
import { useProductKeyboardShortcuts } from "@/hooks/useProductKeyboardShortcuts";

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
  is_flagged?: boolean | null;
  flagged_reason?: string | null;
  flagged_at?: string | null;
  sku?: string | null;
  pet_type?: string | null;
  // Unified field to track source
  source?: 'manual' | 'scraped';
  source_url?: string | null;
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
  { value: "dry-food", label: "מזון יבש" },
  { value: "wet-food", label: "מזון רטוב" },
  { value: "treats", label: "חטיפים" },
  { value: "toys", label: "צעצועים" },
  { value: "accessories", label: "אביזרים" },
  { value: "health", label: "בריאות" },
  { value: "grooming", label: "טיפוח" },
  { value: "חנות הכלבים", label: "חנות הכלבים" },
  { value: "מותגים", label: "מותגים" },
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
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showNeedsReview, setShowNeedsReview] = useState(false);
  const [showFlagged, setShowFlagged] = useState(false);
  const [showScrapedOnly, setShowScrapedOnly] = useState(false);
  const [showManualOnly, setShowManualOnly] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  const { shortcuts } = useProductKeyboardShortcuts({
    onNewProduct: () => {
      setEditingProduct(emptyProduct);
      setIsDialogOpen(true);
    },
    onSearch: () => searchInputRef.current?.focus(),
    onSelectAll: () => setSelectedProducts(displayProducts.map(p => p.id)),
    onDeselectAll: () => setSelectedProducts([]),
    onDelete: () => selectedProducts.length > 0 && setBulkDeleteDialog(true),
    onExport: () => {
      const csvContent = [
        ['שם', 'קטגוריה', 'מחיר'].join(','),
        ...displayProducts.map(p => [`"${p.name}"`, `"${p.category || ''}"`, p.price].join(','))
      ].join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    },
    onEscape: () => {
      setSelectedProducts([]);
      setIsDialogOpen(false);
    },
    enabled: !isDialogOpen,
  });

  // Unflag product mutation
  const unflagMutation = useMutation({
    mutationFn: async (productId: string) => {
      // Find the product to determine its source
      const product = products.find(p => p.id === productId);
      const tableName = product?.source === 'scraped' ? 'scraped_products' : 'business_products';
      
      const { error } = await supabase
        .from(tableName)
        .update({ is_flagged: false, flagged_at: null, flagged_reason: null })
        .eq("id", productId);
      if (error) throw error;

      await logAction({
        action_type: "product.updated",
        entity_type: "product",
        entity_id: productId,
        new_values: { is_flagged: false },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products-unified"] });
      toast({ title: "המוצר הוסר מבדיקה", description: "המוצר זמין לרכישה שוב" });
    },
    onError: (error) => {
      console.error("Error unflagging product:", error);
      toast({ title: "שגיאה", description: "נכשל בהסרת הדגל", variant: "destructive" });
    },
  });

  // Check URL param for needs_review filter
  useEffect(() => {
    if (searchParams.get("filter") === "needs_review") {
      setShowNeedsReview(true);
    }
  }, [searchParams]);

  // Default business ID for the store
  const DEFAULT_BUSINESS_ID = "cf941cc4-e1d1-4d7c-8122-a5df81a1e53c";

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products-unified"],
    queryFn: async () => {
      // Fetch from business_products (manual)
      const { data: businessProducts, error: bpError } = await supabase
        .from("business_products")
        .select("*")
        .order("created_at", { ascending: false });

      if (bpError) console.error("Error fetching business_products:", bpError);

      // Fetch from scraped_products (imported)
      const { data: scrapedProducts, error: spError } = await supabase
        .from("scraped_products")
        .select("*")
        .order("scraped_at", { ascending: false });

      if (spError) console.error("Error fetching scraped_products:", spError);

      // Transform and unify
      const manualProducts: ProductData[] = (businessProducts || []).map(p => ({
        ...p,
        source: 'manual' as const,
        source_url: null,
      }));

      const importedProducts: ProductData[] = (scrapedProducts || []).map(sp => ({
        id: sp.id,
        name: sp.product_name || '',
        description: sp.long_description || sp.short_description || '',
        price: sp.final_price || sp.regular_price || 0,
        original_price: sp.regular_price !== sp.final_price ? sp.regular_price : null,
        image_url: sp.main_image_url || '/placeholder.svg',
        category: sp.sub_category || sp.main_category || null,
        in_stock: sp.stock_status === 'in_stock' || sp.stock_status === null,
        is_featured: false,
        business_id: DEFAULT_BUSINESS_ID,
        created_at: sp.created_at || sp.scraped_at,
        is_flagged: sp.is_flagged || false,
        flagged_reason: sp.flagged_reason || null,
        sku: sp.sku || null,
        pet_type: sp.pet_type || null,
        source: 'scraped' as const,
        source_url: (sp as any).source_url || null,
      }));

      // Combine - manual first, then scraped
      return [...manualProducts, ...importedProducts];
    },
  });


  const saveMutation = useMutation({
    mutationFn: async (product: Partial<ProductData>) => {
      const productData = {
        name: product.name,
        description: product.description,
        price: product.price,
        original_price: product.original_price,
        sale_price: (product as any).sale_price || null,
        image_url: product.image_url || "/placeholder.svg",
        category: product.category,
        in_stock: product.in_stock,
        is_featured: product.is_featured,
        sku: (product as any).sku || null,
        pet_type: (product as any).pet_type || null,
        flavors: (product as any).flavors || null,
      };

      if (product.id) {
        const { error } = await supabase
          .from("business_products")
          .update(productData)
          .eq("id", product.id);

        if (error) throw error;

        await logAction({
          action_type: "product.updated",
          entity_type: "product",
          entity_id: product.id,
          new_values: product,
        });
      } else {
        // For new products, use the default business
        const { error } = await supabase
          .from("business_products")
          .insert({
            ...productData,
            business_id: product.business_id || DEFAULT_BUSINESS_ID,
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
      queryClient.invalidateQueries({ queryKey: ["admin-products-unified"] });
      toast({ title: editingProduct?.id ? "המוצר עודכן" : "המוצר נוסף בהצלחה!" });
      setIsDialogOpen(false);
      setEditingProduct(null);
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast({ title: "שגיאה", description: "הפעולה נכשלה", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      // Find the product to determine its source
      const product = products.find(p => p.id === productId);
      const tableName = product?.source === 'scraped' ? 'scraped_products' : 'business_products';
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", productId);

      if (error) throw error;

      await logAction({
        action_type: "product.deleted",
        entity_type: "product",
        entity_id: productId,
        metadata: { source: product?.source },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products-unified"] });
      toast({ title: "המוצר נמחק" });
      setDeleteDialog({ open: false });
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast({ title: "שגיאה", description: "המחיקה נכשלה", variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      // Separate products by source
      const productsToDelete = products.filter(p => productIds.includes(p.id));
      const manualIds = productsToDelete.filter(p => p.source === 'manual').map(p => p.id);
      const scrapedIds = productsToDelete.filter(p => p.source === 'scraped').map(p => p.id);

      // Delete from business_products
      if (manualIds.length > 0) {
        const { error } = await supabase
          .from("business_products")
          .delete()
          .in("id", manualIds);
        if (error) throw error;
      }

      // Delete from scraped_products
      if (scrapedIds.length > 0) {
        const { error } = await supabase
          .from("scraped_products")
          .delete()
          .in("id", scrapedIds);
        if (error) throw error;
      }

      await logAction({
        action_type: "product.deleted",
        entity_type: "product",
        metadata: { deleted_count: productIds.length, bulk: true, manual: manualIds.length, scraped: scrapedIds.length },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products-unified"] });
      toast({ title: `${selectedProducts.length} מוצרים נמחקו` });
      setBulkDeleteDialog(false);
      setSelectedProducts([]);
    },
    onError: (error) => {
      console.error("Bulk delete error:", error);
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
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted">
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            {/* Source indicator */}
            {product.source === 'scraped' && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center" title="מיובא">
                <Download className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{product.name}</p>
            <div className="flex items-center gap-1">
              <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "source",
      header: "מקור",
      render: (product) => (
        <Badge 
          variant="outline" 
          className={`text-xs ${
            product.source === 'scraped' 
              ? 'bg-blue-50 text-blue-700 border-blue-200' 
              : 'bg-purple-50 text-purple-700 border-purple-200'
          }`}
        >
          {product.source === 'scraped' ? 'מיובא' : 'ידני'}
        </Badge>
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
          {product.is_flagged && (
            <Badge variant="destructive" className="text-xs bg-red-100 text-red-700 border-red-200">
              <Flag className="w-3 h-3 ml-1" />
              מדווח
            </Badge>
          )}
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
            {product.is_flagged && (
              <DropdownMenuItem 
                onClick={() => unflagMutation.mutate(product.id)}
                className="text-green-600"
              >
                <CheckCircle className="w-4 h-4 ml-2" />
                הסר דגל - טופל
              </DropdownMenuItem>
            )}
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
    {
      key: "source",
      label: "מקור",
      options: [
        { value: "manual", label: "ידני" },
        { value: "scraped", label: "מיובא" },
      ],
    },
  ];

  // Filter products based on active filters
  const displayProducts = showFlagged 
    ? products.filter(p => p.is_flagged)
    : showNeedsReview 
      ? products.filter(p => p.needs_image_review || p.needs_price_review)
      : showScrapedOnly
        ? products.filter(p => p.source === 'scraped')
        : showManualOnly
          ? products.filter(p => p.source === 'manual')
          : products;

  const scrapedCount = products.filter(p => p.source === 'scraped').length;
  const manualCount = products.filter(p => p.source === 'manual').length;

  return (
    <AdminLayout title="ניהול מוצרים" icon={Package} breadcrumbs={[{ label: "מוצרים" }]}>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => {
            setEditingProduct(emptyProduct);
            setIsDialogOpen(true);
          }}>
            <Plus className="w-4 h-4 ml-2" />
            הוסף מוצר
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/data-import')}>
            <Upload className="w-4 h-4 ml-2" />
            ייבוא CSV
          </Button>
          <ProductKeyboardShortcutsHelp shortcuts={shortcuts} />
          <Button 
            variant="outline"
            onClick={() => {
              const csvContent = [
                ['שם', 'קטגוריה', 'מחיר', 'מחיר מקורי', 'במלאי', 'מקודם'].join(','),
                ...displayProducts.map(p => [
                  `"${p.name}"`,
                  `"${p.category || ''}"`,
                  p.price,
                  p.original_price || '',
                  p.in_stock ? 'כן' : 'לא',
                  p.is_featured ? 'כן' : 'לא'
                ].join(','))
              ].join('\n');
              
              const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
              toast({ title: "הקובץ יורד" });
            }}
          >
            <Download className="w-4 h-4 ml-2" />
            ייצוא
          </Button>
        </div>
        {/* Filter toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Stats badges */}
          <Badge variant="secondary" className="bg-muted">
            סה״כ: {products.length}
          </Badge>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Download className="w-3 h-3 ml-1" />
            מיובאים: {scrapedCount}
          </Badge>
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            ידניים: {manualCount}
          </Badge>
          
          {showFlagged && (
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              <Flag className="w-3 h-3 ml-1" />
              מוצרים מדווחים ({products.filter(p => p.is_flagged).length})
            </Badge>
          )}
          {showNeedsReview && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
              <AlertCircle className="w-3 h-3 ml-1" />
              מציג מוצרים לבדיקה ({products.filter(p => p.needs_image_review || p.needs_price_review).length})
            </Badge>
          )}
          
          {/* Source filter buttons */}
          <Button 
            variant={showScrapedOnly ? "default" : "outline"} 
            size="sm"
            className={showScrapedOnly ? "bg-blue-500 hover:bg-blue-600" : ""}
            onClick={() => {
              setShowScrapedOnly(!showScrapedOnly);
              setShowManualOnly(false);
              setShowFlagged(false);
              setShowNeedsReview(false);
            }}
          >
            <Download className="w-4 h-4 ml-2" />
            מיובאים
          </Button>
          <Button 
            variant={showManualOnly ? "default" : "outline"} 
            size="sm"
            className={showManualOnly ? "bg-purple-500 hover:bg-purple-600" : ""}
            onClick={() => {
              setShowManualOnly(!showManualOnly);
              setShowScrapedOnly(false);
              setShowFlagged(false);
              setShowNeedsReview(false);
            }}
          >
            ידניים
          </Button>
          <Button 
            variant={showFlagged ? "default" : "outline"} 
            size="sm"
            className={showFlagged ? "bg-red-500 hover:bg-red-600" : ""}
            onClick={() => {
              setShowFlagged(!showFlagged);
              setShowNeedsReview(false);
              setShowScrapedOnly(false);
              setShowManualOnly(false);
            }}
          >
            <Flag className="w-4 h-4 ml-2" />
            מדווחים
          </Button>
          <Button 
            variant={showNeedsReview ? "default" : "outline"} 
            size="sm"
            onClick={() => {
              setShowNeedsReview(!showNeedsReview);
              setShowFlagged(false);
              setShowScrapedOnly(false);
              setShowManualOnly(false);
              if (showNeedsReview) {
                navigate('/admin/products', { replace: true });
              }
            }}
          >
            <AlertCircle className="w-4 h-4 ml-2" />
            לבדיקה
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
          <ProductBulkActions
            selectedIds={selectedProducts}
            onActionComplete={() => queryClient.invalidateQueries({ queryKey: ["admin-products"] })}
            onClearSelection={() => setSelectedProducts([])}
          />
        }
      />

      {/* Edit/Create Dialog */}
      <ProductFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        product={editingProduct}
        onProductChange={setEditingProduct}
        onSave={() => {
          if (editingProduct) {
            saveMutation.mutate(editingProduct);
          }
        }}
        isSaving={saveMutation.isPending}
        onImageUpload={handleImageUpload}
        isUploading={uploading}
      />

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

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        open={bulkDeleteDialog}
        onOpenChange={setBulkDeleteDialog}
        title="מחיקת מוצרים"
        description={`האם אתה בטוח שברצונך למחוק ${selectedProducts.length} מוצרים? פעולה זו לא ניתנת לביטול.`}
        confirmLabel={`מחק ${selectedProducts.length} מוצרים`}
        variant="destructive"
        loading={bulkDeleteMutation.isPending}
        onConfirm={() => {
          bulkDeleteMutation.mutate(selectedProducts);
        }}
        icon={<Trash2 className="w-5 h-5 text-destructive" />}
      />
    </AdminLayout>
  );
};

export default AdminProducts;
