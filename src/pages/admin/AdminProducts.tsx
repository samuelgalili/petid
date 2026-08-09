import { useCallback, useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package, Plus, Edit, Trash2, MoreHorizontal,
  Upload, Download, AlertCircle, Flag, CheckCircle,
  ShoppingCart, Eye, Star, Sparkles, FileSpreadsheet
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { BulkProductImport, type ParsedProduct } from "@/components/admin/BulkProductImport";
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
import { ProductBulkActions } from "@/components/admin/products/ProductBulkActions";
import { ProductKeyboardShortcutsHelp } from "@/components/admin/products/ProductKeyboardShortcutsHelp";
import { InlineEditCell } from "@/components/admin/products/InlineEditCell";
import { useProductKeyboardShortcuts } from "@/hooks/useProductKeyboardShortcuts";
import { normalizeProductPetType } from "@/lib/productStore";
import { useAwsAdminAuth } from "@/hooks/useAwsAdminAuth";
import { ADMIN_PERMISSIONS, adminHasPermission } from "@/lib/adminPermissions";
import {
  bulkDeleteAdminProducts,
  createAdminProduct,
  deleteAdminProduct,
  getAdminProducts,
  updateAdminProduct,
  uploadAdminProductImage,
} from "@/lib/mipoApi";

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
  flavors?: string[] | null;
  sale_price?: number | null;
  images?: string[] | null;
  brand?: string | null;
  weight_unit?: string | null;
  price_per_weight?: number | null;
  ingredients?: string | null;
  benefits?: unknown[] | null;
  feeding_guide?: unknown[] | null;
  product_attributes?: Record<string, unknown> | null;
  life_stage?: string | null;
  dog_size?: string | null;
  special_diet?: string[] | null;
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
  const { admin } = useAwsAdminAuth();
  const { logAction } = useAuditLog();
  const canDeleteProducts = adminHasPermission(admin, ADMIN_PERMISSIONS.PRODUCTS_DELETE);
  const queryClient = useQueryClient();
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
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const openManualProductDialog = useCallback(() => {
    setEditingProduct({ ...emptyProduct });
    setIsDialogOpen(true);
  }, []);

  // Keyboard shortcuts
  const { shortcuts } = useProductKeyboardShortcuts({
    onNewProduct: openManualProductDialog,
    onSearch: () => searchInputRef.current?.focus(),
    onSelectAll: () => setSelectedProducts(displayProducts.map(p => p.id)),
    onDeselectAll: () => setSelectedProducts([]),
    onDelete: () => canDeleteProducts && selectedProducts.length > 0 && setBulkDeleteDialog(true),
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
      setWizardOpen(false);
      setBulkImportOpen(false);
    },
    enabled: !isDialogOpen,
  });

  // Unflag product mutation
  const unflagMutation = useMutation({
    mutationFn: async (productId: string) => {
      const product = products.find(p => p.id === productId);
      await updateAdminProduct(productId, {
        source: product?.source,
        is_flagged: false,
        flagged_at: null,
        flagged_reason: null,
      });

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

  // Check URL params for direct admin actions.
  useEffect(() => {
    if (searchParams.get("filter") === "needs_review") {
      setShowNeedsReview(true);
    }

    if (searchParams.get("new") === "true") {
      openManualProductDialog();

      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("new");
      const nextQuery = nextParams.toString();
      navigate(nextQuery ? `/admin/products?${nextQuery}` : "/admin/products", { replace: true });
    }
  }, [navigate, openManualProductDialog, searchParams]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products-unified"],
    queryFn: async () => getAdminProducts() as Promise<ProductData[]>,
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
        sale_price: product.sale_price || null,
        image_url: product.image_url || "/placeholder.svg",
        images: product.images || null,
        category: product.category,
        in_stock: product.in_stock,
        is_featured: product.is_featured,
        sku: product.sku || null,
        pet_type: normalizeProductPetType(product.pet_type),
        flavors: product.flavors || null,
        brand: product.brand || null,
        weight_unit: product.weight_unit || null,
        price_per_weight: product.price_per_weight || null,
        source_url: product.source_url || null,
        ingredients: product.ingredients || null,
        benefits: product.benefits || [],
        feeding_guide: product.feeding_guide || [],
        product_attributes: product.product_attributes || {},
        life_stage: product.life_stage || null,
        dog_size: product.dog_size || null,
        special_diet: product.special_diet || [],
      };

      if (product.id) {
        await updateAdminProduct(product.id, {
          ...productData,
          source: product.source,
        });

        await logAction({
          action_type: "product.updated",
          entity_type: "product",
          entity_id: product.id,
          new_values: product,
        });
      } else {
        await createAdminProduct({
          ...productData,
          business_id: product.business_id,
        });

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
      const product = products.find(p => p.id === productId);
      await deleteAdminProduct(productId, product?.source);

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
      const result = await bulkDeleteAdminProducts(productIds);

      await logAction({
        action_type: "product.deleted",
        entity_type: "product",
        metadata: { deleted_count: result.deleted, bulk: true, manual: result.manual, scraped: result.scraped },
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

  const bulkImportMutation = useMutation({
    mutationFn: async (importedProducts: ParsedProduct[]) => {
      let created = 0;
      let failed = 0;

      for (const product of importedProducts) {
        try {
          await createAdminProduct({
            name: product.name,
            description: product.description || null,
            price: product.price,
            original_price: product.original_price || null,
            sale_price: product.sale_price || null,
            image_url: product.image_url || "/placeholder.svg",
            images: product.images || null,
            category: product.category || "other",
            in_stock: product.in_stock,
            is_featured: false,
            sku: product.sku || null,
            pet_type: normalizeProductPetType(product.petType),
            brand: product.brand || null,
            source_url: product.sourceUrl || null,
            ingredients: product.ingredients || null,
            benefits: product.benefits || [],
            feeding_guide: product.feeding_guide || [],
            product_attributes: product.product_attributes || {},
            life_stage: product.life_stage || null,
            dog_size: product.dog_size || null,
            special_diet: product.special_diet || [],
          });
          created++;
        } catch (error) {
          console.error("Bulk import product failed:", error);
          failed++;
        }
      }

      if (created === 0) {
        throw new Error("לא נוצרו מוצרים. יש לבדוק את נתוני הקובץ ולנסות שוב.");
      }

      await logAction({
        action_type: "product.created",
        entity_type: "product",
        metadata: { bulk: true, created_count: created, failed_count: failed },
      });

      return { created, failed };
    },
    onSuccess: ({ created, failed }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products-unified"] });
      toast({
        title: `${created} מוצרים נוספו לחנות`,
        description: failed > 0 ? `${failed} מוצרים נכשלו` : "ייבוא המוצרים הסתיים בהצלחה",
      });
    },
  });

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);
      const upload = await uploadAdminProductImage(file);
      setEditingProduct((prev) => prev ? { ...prev, image_url: upload.url } : null);
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
      await updateAdminProduct(productId, {
        source: source === "scraped" ? "scraped" : "manual",
        [field]: value,
      } as Partial<ProductData>);
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
            {canDeleteProducts && (
              <DropdownMenuItem
                onClick={() => setDeleteDialog({ open: true, productId: product.id })}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                מחיקה
              </DropdownMenuItem>
            )}
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
          <Button onClick={openManualProductDialog}>
            <Plus className="w-4 h-4 ml-2" />
            מוצר ידני חדש
          </Button>
          <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
            <FileSpreadsheet className="w-4 h-4 ml-2" />
            ייבוא מקובץ
          </Button>
          <Button variant="outline" onClick={() => setWizardOpen(true)}>
            <Upload className="w-4 h-4 ml-2" />
            ייבוא מקישור
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/smart-editor')}>
            <Sparkles className="w-4 h-4 ml-2" />
            עורך חכם
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

      {!isLoading && products.length === 0 && (
        <Card className="mb-4 border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-foreground">עוד אין מוצרים בחנות</p>
              <p className="text-sm text-muted-foreground">
                אפשר להוסיף מוצר ידנית, לייבא קובץ מוצרים, או לסרוק מוצר מקישור.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={openManualProductDialog}>
                <Plus className="w-4 h-4 ml-2" />
                מוצר חדש
              </Button>
              <Button size="sm" variant="outline" onClick={() => setBulkImportOpen(true)}>
                <FileSpreadsheet className="w-4 h-4 ml-2" />
                ייבוא קובץ
              </Button>
              <Button size="sm" variant="outline" onClick={() => setWizardOpen(true)}>
                <Upload className="w-4 h-4 ml-2" />
                ייבוא מקישור
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
            canDelete={canDeleteProducts}
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

      <BulkProductImport
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        onImportComplete={async (importedProducts) => {
          await bulkImportMutation.mutateAsync(importedProducts);
        }}
        onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ["admin-products-unified"] })}
      />
    </AdminLayout>
  );
};

export default AdminProducts;
