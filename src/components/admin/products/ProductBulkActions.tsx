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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProductBulkActionsProps {
  selectedIds: string[];
  onActionComplete: () => void;
  onClearSelection: () => void;
  products?: Array<{ id: string; source?: 'manual' | 'scraped' }>;
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
      const { error } = await supabase
        .from('business_products')
        .update(updates)
        .in('id', selectedIds);

      if (error) throw error;
      
      toast.success(`${selectedIds.length} מוצרים עודכנו בהצלחה`);
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
      // Separate products by source
      const selectedProducts = products.filter(p => selectedIds.includes(p.id));
      const manualIds = selectedProducts.filter(p => p.source === 'manual' || !p.source).map(p => p.id);
      const scrapedIds = selectedProducts.filter(p => p.source === 'scraped').map(p => p.id);
      
      // If no products info provided, try both tables
      if (selectedProducts.length === 0) {
        // Delete from business_products
        await supabase
          .from('business_products')
          .delete()
          .in('id', selectedIds);
        
        // Delete from scraped_products
        await supabase
          .from('scraped_products')
          .delete()
          .in('id', selectedIds);
      } else {
        // Delete from business_products
        if (manualIds.length > 0) {
          const { error } = await supabase
            .from('business_products')
            .delete()
            .in('id', manualIds);
          if (error) throw error;
        }
        
        // Delete from scraped_products
        if (scrapedIds.length > 0) {
          const { error } = await supabase
            .from('scraped_products')
            .delete()
            .in('id', scrapedIds);
          if (error) throw error;
        }
      }
      
      toast.success(`${selectedIds.length} מוצרים נמחקו`);
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
      // Get current prices first
      const { data: products, error: fetchError } = await supabase
        .from('business_products')
        .select('id, price')
        .in('id', selectedIds);

      if (fetchError) throw fetchError;

      // Calculate new prices
      const value = parseFloat(priceValue);
      const updates = products?.map(p => {
        let newPrice = p.price;
        
        if (priceAction === 'set') {
          newPrice = priceType === 'fixed' ? value : p.price;
        } else if (priceAction === 'increase') {
          newPrice = priceType === 'percent' 
            ? p.price * (1 + value / 100) 
            : p.price + value;
        } else if (priceAction === 'decrease') {
          newPrice = priceType === 'percent' 
            ? p.price * (1 - value / 100) 
            : p.price - value;
        }
        
        return { id: p.id, price: Math.max(0, Math.round(newPrice * 100) / 100) };
      }) || [];

      // Update each product
      for (const update of updates) {
        await supabase
          .from('business_products')
          .update({ price: update.price })
          .eq('id', update.id);
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
      // Get products to duplicate
      const { data: products, error: fetchError } = await supabase
        .from('business_products')
        .select('*')
        .in('id', selectedIds);

      if (fetchError) throw fetchError;

      // Create duplicates
      const duplicates = products?.map(p => ({
        ...p,
        id: undefined,
        name: `${p.name} (העתק)`,
        created_at: undefined,
        updated_at: undefined,
      })) || [];

      const { error: insertError } = await supabase
        .from('business_products')
        .insert(duplicates);

      if (insertError) throw insertError;

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
