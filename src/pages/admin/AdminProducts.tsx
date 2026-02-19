import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Package, Plus, Edit, Trash2, MoreHorizontal, 
  Upload, Download, AlertCircle, Flag, CheckCircle, Globe,
  TrendingUp, ShoppingCart, Eye, Star
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProductImportWizard } from "@/components/admin/ProductImportWizard";
import { DataTable, Column, FilterOption } from "@/components/admin/DataTable";
import { ProductFormDialog } from "@/components/admin/ProductFormDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { supabase } from "@/integrations/supabase/client";
import { ProductBulkActions, ProductKeyboardShortcutsHelp, InlineEditCell } from "@/components/admin/products";
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
  const [wizardOpen, setWizardOpen] = useState(false);
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
      // Validate required fields
      if (!product.name || !product.name.trim()) {
        throw new Error("שם המוצר הוא שדה חובה");
      }
      if (!product.price || product.price <= 0) {
        throw new Error("יש להזין מחיר תקין");
      }

      const productData = {
        name: product.name.trim(),
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
    onError: (error: any) => {
      console.error("Save error:", error);
      toast({ title: "שגיאה", description: error.message || "הפעולה נכשלה", variant: "destructive" });
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

  // Inline edit mutation
  const inlineEditMutation = useMutation({
    mutationFn: async ({ productId, field, value, source }: { productId: string; field: string; value: any; source?: string }) => {
      const tableName = source === 'scraped' ? 'scraped_products' : 'business_products';
      const { error } = await supabase
        .from(tableName)
        .update({ [field]: value })
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products-unified"] });
    },
    onError: (error) => {
      console.error("Inline edit error:", error);
      toast({ title: "שגיאה בעדכון", variant: "destructive" });
    },
  });

  const handleInlineEdit = async (productId: string, field: string, value: any, source?: string) => {
    await inlineEditMutation.mutateAsync({ productId, field, value, source });
  };

  const columns: Column<ProductData>[] = [
    {
      key: "product",
      header: "מוצר",
      render: (product) => (
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted border border-border shadow-sm shrink-0">
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            {product.source === 'scraped' && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center" title="מיובא">
                <Download className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate text-sm">{product.name}</p>
            {product.sku && (
              <p className="text-[10px] text-muted-foreground font-mono">SKU: {product.sku}</p>
            )}
            <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "קטגוריה",
      render: (product) => (
        <InlineEditCell
          value={product.category}
          type="select"
          options={categories}
          displayValue={
            <Badge variant="outline" className="text-xs cursor-pointer">
              {categories.find((c) => c.value === product.category)?.label || product.category || "ללא"}
            </Badge>
          }
          onSave={(v) => handleInlineEdit(product.id, "category", v, product.source)}
        />
      ),
    },
    {
      key: "price",
      header: "מחיר",
      sortable: true,
      render: (product) => (
        <InlineEditCell
          value={product.price}
          type="number"
          displayValue={
            <div>
              <span className="font-bold text-sm">₪{product.price}</span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-[10px] text-muted-foreground line-through mr-1.5">
                  ₪{product.original_price}
                </span>
              )}
            </div>
          }
          onSave={(v) => handleInlineEdit(product.id, "price", v, product.source)}
        />
      ),
    },
    {
      key: "status",
      header: "סטטוס",
      render: (product) => (
        <div className="flex gap-1 flex-wrap">
          <InlineEditCell
            value={product.in_stock}
            type="toggle"
            displayValue={
              product.in_stock ? (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  במלאי
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-[10px]">
                  אזל
                </Badge>
              )
            }
            onSave={(v) => handleInlineEdit(product.id, "in_stock", v, product.source)}
          />
          {product.is_flagged && (
            <Badge variant="destructive" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20">
              <Flag className="w-2.5 h-2.5 ml-0.5" />
              מדווח
            </Badge>
          )}
          <InlineEditCell
            value={product.is_featured}
            type="toggle"
            displayValue={
              product.is_featured ? (
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <Star className="w-2.5 h-2.5 ml-0.5" />
                  מקודם
                </Badge>
              ) : null
            }
            onSave={(v) => handleInlineEdit(product.id, "is_featured", v, product.source)}
          />
        </div>
      ),
    },
    {
      key: "source",
      header: "מקור",
      render: (product) => (
        <Badge 
          variant="outline" 
          className={`text-[10px] ${
            product.source === 'scraped' 
              ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' 
              : 'bg-purple-500/10 text-purple-600 border-purple-500/20'
          }`}
        >
          {product.source === 'scraped' ? 'מיובא' : 'ידני'}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (product) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {product.is_flagged && (
              <DropdownMenuItem 
                onClick={() => unflagMutation.mutate(product.id)}
                className="text-emerald-600"
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
              עריכה מלאה
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => navigate(`/product/${product.id}`)}
            >
              <Eye className="w-4 h-4 ml-2" />
              צפייה בחנות
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
  const outOfStockCount = products.filter(p => !p.in_stock).length;
  const featuredCount = products.filter(p => p.is_featured).length;
  const flaggedCount = products.filter(p => p.is_flagged).length;
  const needsReviewCount = products.filter(p => p.needs_image_review || p.needs_price_review).length;

  return (
    <AdminLayout title="ניהול מוצרים" icon={Package} breadcrumbs={[{ label: "מוצרים" }]}>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" dir="rtl">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{products.length}</p>
              <p className="text-xs text-muted-foreground">סה״כ מוצרים</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{products.length - outOfStockCount}</p>
              <p className="text-xs text-muted-foreground">במלאי</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{scrapedCount}</p>
              <p className="text-xs text-muted-foreground">מיובאים</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{flaggedCount + needsReviewCount}</p>
              <p className="text-xs text-muted-foreground">דורשים טיפול</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="w-4 h-4 ml-2" />
            הוסף מוצר
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/data-import')}>
            <Upload className="w-4 h-4 ml-2" />
            ייבוא CSV
          </Button>
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
          <ProductKeyboardShortcutsHelp shortcuts={shortcuts} />
        </div>
        
        {/* Quick Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button 
            variant={showScrapedOnly ? "default" : "outline"} 
            size="sm"
            onClick={() => {
              setShowScrapedOnly(!showScrapedOnly);
              setShowManualOnly(false);
              setShowFlagged(false);
              setShowNeedsReview(false);
            }}
          >
            <Download className="w-3.5 h-3.5 ml-1.5" />
            מיובאים ({scrapedCount})
          </Button>
          <Button 
            variant={showManualOnly ? "default" : "outline"} 
            size="sm"
            onClick={() => {
              setShowManualOnly(!showManualOnly);
              setShowScrapedOnly(false);
              setShowFlagged(false);
              setShowNeedsReview(false);
            }}
          >
            ידניים ({manualCount})
          </Button>
          {flaggedCount > 0 && (
            <Button 
              variant={showFlagged ? "default" : "outline"} 
              size="sm"
              className={showFlagged ? "" : "text-red-600 border-red-200 hover:bg-red-50"}
              onClick={() => {
                setShowFlagged(!showFlagged);
                setShowNeedsReview(false);
                setShowScrapedOnly(false);
                setShowManualOnly(false);
              }}
            >
              <Flag className="w-3.5 h-3.5 ml-1.5" />
              מדווחים ({flaggedCount})
            </Button>
          )}
          {needsReviewCount > 0 && (
            <Button 
              variant={showNeedsReview ? "default" : "outline"} 
              size="sm"
              className={showNeedsReview ? "" : "text-amber-600 border-amber-200 hover:bg-amber-50"}
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
              <AlertCircle className="w-3.5 h-3.5 ml-1.5" />
              לבדיקה ({needsReviewCount})
            </Button>
          )}
        </div>
      </div>

      <DataTable
        data={displayProducts}
        columns={columns}
        loading={isLoading}
        filters={filters}
        searchPlaceholder="חיפוש לפי שם, SKU, קטגוריה..."
        searchKey={(item, query) => {
          const q = query.toLowerCase();
          return item.name.toLowerCase().includes(q) ||
            (item.sku?.toLowerCase().includes(q) ?? false) ||
            (item.category?.toLowerCase().includes(q) ?? false) ||
            (item.description?.toLowerCase().includes(q) ?? false);
        }}
        selectable
        selectedItems={selectedProducts}
        onSelectionChange={setSelectedProducts}
        emptyIcon={<Package className="w-12 h-12" />}
        emptyMessage={showNeedsReview ? "אין מוצרים שדורשים בדיקה" : "לא נמצאו מוצרים"}
        bulkActions={
          <ProductBulkActions
            selectedIds={selectedProducts}
            products={products}
            onActionComplete={() => queryClient.invalidateQueries({ queryKey: ["admin-products-unified"] })}
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

      {/* Product Import Wizard */}
      <ProductImportWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-products-unified"] })}
      />
    </AdminLayout>
  );
};

export default AdminProducts;
