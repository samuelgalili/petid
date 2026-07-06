import { useState } from "react";
import { 
  Tag, 
  DollarSign, 
  Package, 
  Star, 
  Trash2,
  Copy,
  Archive,
  RefreshCw,
  Loader2,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  bulkDeleteAdminProducts,
  bulkUpdateAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  type MipoProduct,
} from "@/lib/mipoApi";
import { toast } from "sonner";

interface ProductBulkActionsProps {
  selectedIds: string[];
  onActionComplete: () => void;
  onClearSelection: () => void;
  products?: Array<MipoProduct>;
}

const categories = [
  { value: "dry-food", label: "אוכל יבש" },
  { value: "wet-food", label: "אוכל רטוב" },
  { value: "treats", label: "חטיפים" },
  { value: "toys", label: "צעצועים" },
  { value: "accessories", label: "אביזרים" },
  { value: "health", label: "בריאות" },
  { value: "grooming", label: "טיפוח" },
];

export function ProductBulkActions({ 
  selectedIds, 
  onActionComplete,
  onClearSelection,
  products = []
}: ProductBulkActionsProps) {
  const [loading, setLoading] = useState(false);
  const [priceDialog, setPriceDialog] = useState(false);
  const [priceAction, setPriceAction] = useState<'set' | 'increase' | 'decrease'>('set');
  const [priceValue, setPriceValue] = useState('');
  const [priceType, setPriceType] = useState<'fixed' | 'percent'>('percent');

  if (selectedIds.length === 0) return null;

  const handleBulkUpdate = async (updates: Record<string, any>) => {
    setLoading(true);
    try {
      const result = await bulkUpdateAdminProducts(selectedIds, updates);
      
      toast.success(`${result.updated} מוצרים עודכנו בהצלחה`);
      onActionComplete();
      onClearSelection();
    } catch (err) {
      console.error('Bulk update error:', err);
      toast.error('שגיאה בעדכון המוצרים');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`למחוק ${selectedIds.length} מוצרים?`)) return;
    
    setLoading(true);
    try {
      const result = await bulkDeleteAdminProducts(selectedIds);
      
      toast.success(`${result.deleted} מוצרים נמחקו`);
      onActionComplete();
      onClearSelection();
    } catch (err) {
      console.error('Bulk delete error:', err);
      toast.error('שגיאה במחיקת המוצרים');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceUpdate = async () => {
    if (!priceValue) return;

    setLoading(true);
    try {
      const selectedProducts = products.filter(p => selectedIds.includes(p.id));
      if (selectedProducts.length === 0) {
        throw new Error("לא נמצאו מוצרים נבחרים");
      }

      // Calculate new prices
      const value = parseFloat(priceValue);
      const updates = selectedProducts.map(p => {
        const currentPrice = Number(p.price) || 0;
        let newPrice = currentPrice;
        
        if (priceAction === 'set') {
          newPrice = priceType === 'fixed' ? value : currentPrice;
        } else if (priceAction === 'increase') {
          newPrice = priceType === 'percent'
            ? currentPrice * (1 + value / 100)
            : currentPrice + value;
        } else if (priceAction === 'decrease') {
          newPrice = priceType === 'percent'
            ? currentPrice * (1 - value / 100)
            : currentPrice - value;
        }
        
        return {
          id: p.id,
          source: p.source,
          price: Math.max(0, Math.round(newPrice * 100) / 100),
        };
      });

      // Update each product
      for (const update of updates) {
        await updateAdminProduct(update.id, {
          source: update.source,
          price: update.price,
        });
      }

      toast.success(`מחירים עודכנו ל-${selectedIds.length} מוצרים`);
      setPriceDialog(false);
      setPriceValue('');
      onActionComplete();
      onClearSelection();
    } catch (err) {
      console.error('Price update error:', err);
      toast.error('שגיאה בעדכון המחירים');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    setLoading(true);
    try {
      const selectedProducts = products.filter(p => selectedIds.includes(p.id));
      if (selectedProducts.length === 0) {
        throw new Error("לא נמצאו מוצרים לשכפול");
      }

      // Create duplicates
      for (const product of selectedProducts) {
        const { id, source, created_at, updated_at, business_id, ...duplicate } = product;
        await createAdminProduct({
          ...duplicate,
          name: `${product.name} (העתק)`,
          business_id: business_id || undefined,
        });
      }

      toast.success(`${selectedIds.length} מוצרים שוכפלו`);
      onActionComplete();
      onClearSelection();
    } catch (err) {
      console.error('Duplicate error:', err);
      toast.error('שגיאה בשכפול המוצרים');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
        <Badge variant="secondary" className="text-sm">
          {selectedIds.length} נבחרו
        </Badge>

        <div className="flex-1 flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={loading}>
                <Tag className="h-4 w-4 ml-2" />
                קטגוריה
                <ChevronDown className="h-3 w-3 mr-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {categories.map((cat) => (
                <DropdownMenuItem 
                  key={cat.value}
                  onClick={() => handleBulkUpdate({ category: cat.value })}
                >
                  {cat.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setPriceDialog(true)}
            disabled={loading}
          >
            <DollarSign className="h-4 w-4 ml-2" />
            עדכון מחיר
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={loading}>
                <Package className="h-4 w-4 ml-2" />
                מלאי
                <ChevronDown className="h-3 w-3 mr-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBulkUpdate({ in_stock: true })}>
                סמן במלאי
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkUpdate({ in_stock: false })}>
                סמן אזל מהמלאי
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={loading}>
                <Star className="h-4 w-4 ml-2" />
                קידום
                <ChevronDown className="h-3 w-3 mr-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBulkUpdate({ is_featured: true })}>
                הוסף לקידום
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkUpdate({ is_featured: false })}>
                הסר מקידום
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDuplicate}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            ) : (
              <Copy className="h-4 w-4 ml-2" />
            )}
            שכפל
          </Button>

          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleBulkDelete}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4 ml-2" />
            מחק
          </Button>
        </div>

        <Button 
          variant="ghost" 
          size="sm"
          onClick={onClearSelection}
        >
          בטל בחירה
        </Button>
      </div>

      {/* Price Update Dialog */}
      <Dialog open={priceDialog} onOpenChange={setPriceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>עדכון מחיר מרובה</DialogTitle>
            <DialogDescription>
              עדכון מחיר ל-{selectedIds.length} מוצרים
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Select value={priceAction} onValueChange={(v: any) => setPriceAction(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="set">קבע</SelectItem>
                  <SelectItem value="increase">העלה</SelectItem>
                  <SelectItem value="decrease">הורד</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="ערך"
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
                className="flex-1"
              />

              {priceAction !== 'set' && (
                <Select value={priceType} onValueChange={(v: any) => setPriceType(v)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">%</SelectItem>
                    <SelectItem value="fixed">₪</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              {priceAction === 'set' && `המחיר יקבע ל-₪${priceValue || '0'}`}
              {priceAction === 'increase' && priceType === 'percent' && `המחיר יעלה ב-${priceValue || '0'}%`}
              {priceAction === 'increase' && priceType === 'fixed' && `המחיר יעלה ב-₪${priceValue || '0'}`}
              {priceAction === 'decrease' && priceType === 'percent' && `המחיר ירד ב-${priceValue || '0'}%`}
              {priceAction === 'decrease' && priceType === 'fixed' && `המחיר ירד ב-₪${priceValue || '0'}`}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handlePriceUpdate} disabled={loading || !priceValue}>
              {loading && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              עדכן מחירים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
