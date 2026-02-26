/**
 * InvoiceLineItemReview — Spreadsheet-style review UI for extracted invoice line items.
 * Supports SKU auto-matching, cost allocation, and inline editing before inventory update.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2, AlertCircle, Package, Loader2, Save,
  Pencil, ArrowRight, ShoppingBag, Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface InvoiceLineItem {
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string | null;
}

export interface ScannedInvoiceData {
  invoiceNumber: string | null;
  vendor: string | null;
  vendorPhone?: string | null;
  vendorEmail?: string | null;
  vendorAddress?: string | null;
  vendorTaxId?: string | null;
  date: string | null;
  currency: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number | null;
  shippingCost: number;
  discount: number;
  total: number;
  supplierId?: string;
  supplierName?: string;
}

interface MatchedProduct {
  id: string;
  name: string;
  sku: string | null;
  cost_price: number | null;
  price: number;
}

interface ReviewLineItem extends InvoiceLineItem {
  matchedProduct: MatchedProduct | null;
  matchStatus: 'matched' | 'new' | 'manual';
  finalCostPerUnit: number;
  editing: boolean;
}

interface Props {
  data: ScannedInvoiceData;
  onSave: (items: ReviewLineItem[], invoiceData: ScannedInvoiceData) => void;
  onCancel: () => void;
  saving?: boolean;
}

export const InvoiceLineItemReview: React.FC<Props> = ({ data, onSave, onCancel, saving }) => {
  // Fetch inventory products for SKU matching
  const { data: products = [] } = useQuery({
    queryKey: ['inventory-products-for-matching'],
    queryFn: async () => {
      const { data: prods, error } = await supabase
        .from('business_products')
        .select('id, name, sku, cost_price, price')
        .limit(500);
      if (error) throw error;
      return (prods || []) as MatchedProduct[];
    },
  });

  // Build review items with auto-matching
  const [reviewItems, setReviewItems] = useState<ReviewLineItem[]>(() => {
    return buildReviewItems(data.lineItems, [], data);
  });

  // Re-match when products load
  useMemo(() => {
    if (products.length > 0) {
      setReviewItems(prev => {
        return buildReviewItems(
          prev.map(r => ({ name: r.name, sku: r.sku, quantity: r.quantity, unitPrice: r.unitPrice, totalPrice: r.totalPrice, unit: r.unit })),
          products,
          data
        );
      });
    }
  }, [products, data]);

  const updateItem = useCallback((index: number, updates: Partial<ReviewLineItem>) => {
    setReviewItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, ...updates };
      // Recalculate total if qty or price changed
      if ('quantity' in updates || 'unitPrice' in updates) {
        updated.totalPrice = updated.quantity * updated.unitPrice;
        updated.finalCostPerUnit = calculateFinalCost(updated.unitPrice, updated.quantity, data);
      }
      return updated;
    }));
  }, [data]);

  const matchedCount = reviewItems.filter(r => r.matchStatus === 'matched').length;
  const newCount = reviewItems.filter(r => r.matchStatus === 'new').length;

  const allocatedSubtotal = reviewItems.reduce((s, r) => s + r.totalPrice, 0);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Summary header */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="סה״כ פריטים" value={reviewItems.length} icon={<Package className="w-4 h-4" />} />
        <SummaryCard
          label="זוהו במלאי"
          value={matchedCount}
          icon={<CheckCircle2 className="w-4 h-4 text-primary" />}
          accent
        />
        <SummaryCard
          label="מוצרים חדשים"
          value={newCount}
          icon={<AlertCircle className="w-4 h-4 text-amber-500" />}
        />
      </div>

      {/* Cost breakdown */}
      <Card className="border border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">סכום ביניים</span>
            <span className="font-medium">₪{(data.subtotal || allocatedSubtotal).toLocaleString()}</span>
          </div>
          {data.shippingCost > 0 && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">משלוח</span>
              <span className="font-medium">₪{data.shippingCost.toLocaleString()}</span>
            </div>
          )}
          {(data.taxAmount ?? 0) > 0 && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">מע״מ ({data.taxRate}%)</span>
              <span className="font-medium">₪{(data.taxAmount || 0).toLocaleString()}</span>
            </div>
          )}
          {data.discount > 0 && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">הנחה</span>
              <span className="font-medium text-primary">-₪{data.discount.toLocaleString()}</span>
            </div>
          )}
          <Separator className="my-2" />
          <div className="flex items-center justify-between text-sm font-bold">
            <span>סה״כ</span>
            <span>₪{(data.total || 0).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Spreadsheet-style table */}
      <Card className="border border-border/50 overflow-hidden">
        <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border/50">
          <div className="grid grid-cols-[1fr_80px_80px_80px_90px_40px] gap-2 text-[11px] font-semibold text-muted-foreground">
            <span>מוצר</span>
            <span className="text-center">כמות</span>
            <span className="text-center">מחיר יח׳</span>
            <span className="text-center">סה״כ</span>
            <span className="text-center">עלות סופית</span>
            <span />
          </div>
        </CardHeader>
        <ScrollArea className="max-h-[340px]">
          <AnimatePresence>
            {reviewItems.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  "grid grid-cols-[1fr_80px_80px_80px_90px_40px] gap-2 items-center px-4 py-3 border-b border-border/30 text-sm",
                  item.editing && "bg-primary/5"
                )}
              >
                {/* Name + status */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={item.matchStatus} />
                    {item.editing ? (
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(i, { name: e.target.value })}
                        className="h-7 text-xs px-2"
                      />
                    ) : (
                      <span className="truncate text-xs font-medium">{item.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.sku && (
                      <span className="text-[10px] text-muted-foreground">SKU: {item.sku}</span>
                    )}
                    {item.matchedProduct && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-primary/5 border-primary/20">
                        <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
                        {item.matchedProduct.name}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Quantity */}
                <div className="text-center">
                  {item.editing ? (
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, { quantity: parseFloat(e.target.value) || 0 })}
                      className="h-7 text-xs px-1 text-center"
                    />
                  ) : (
                    <span className="text-xs">{item.quantity} {item.unit || ''}</span>
                  )}
                </div>

                {/* Unit Price */}
                <div className="text-center">
                  {item.editing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(i, { unitPrice: parseFloat(e.target.value) || 0 })}
                      className="h-7 text-xs px-1 text-center"
                    />
                  ) : (
                    <span className="text-xs">₪{item.unitPrice.toFixed(2)}</span>
                  )}
                </div>

                {/* Total */}
                <div className="text-center">
                  <span className="text-xs font-medium">₪{item.totalPrice.toFixed(2)}</span>
                </div>

                {/* Final Cost Per Unit (with shipping/tax allocated) */}
                <div className="text-center">
                  <span className="text-xs font-bold text-primary">₪{item.finalCostPerUnit.toFixed(2)}</span>
                </div>

                {/* Edit toggle */}
                <div className="text-center">
                  <button
                    onClick={() => updateItem(i, { editing: !item.editing })}
                    className="p-1 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </ScrollArea>
      </Card>

      {/* Footer actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calculator className="w-3.5 h-3.5" />
          <span>עלות סופית = מחיר יח׳ + (משלוח+מע״מ−הנחה) / סה״כ כמות</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={onCancel}>
            ביטול
          </Button>
          <Button
            size="sm"
            className="rounded-xl gap-2"
            onClick={() => onSave(reviewItems, data)}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            עדכן מלאי ומרווחים
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ── Helpers ── */

function buildReviewItems(
  lineItems: InvoiceLineItem[],
  products: MatchedProduct[],
  invoiceData: ScannedInvoiceData
): ReviewLineItem[] {
  return lineItems.map(li => {
    const matched = matchProduct(li, products);
    return {
      ...li,
      matchedProduct: matched,
      matchStatus: matched ? 'matched' : 'new',
      finalCostPerUnit: calculateFinalCost(li.unitPrice, li.quantity, invoiceData),
      editing: false,
    };
  });
}

function matchProduct(li: InvoiceLineItem, products: MatchedProduct[]): MatchedProduct | null {
  // First try exact SKU match
  if (li.sku) {
    const skuMatch = products.find(p => p.sku && p.sku.toLowerCase() === li.sku!.toLowerCase());
    if (skuMatch) return skuMatch;
  }
  // Then try fuzzy name match
  const nameLower = li.name.toLowerCase().trim();
  const nameMatch = products.find(p => {
    const pName = p.name.toLowerCase().trim();
    return pName === nameLower || pName.includes(nameLower) || nameLower.includes(pName);
  });
  return nameMatch || null;
}

function calculateFinalCost(unitPrice: number, quantity: number, data: ScannedInvoiceData): number {
  const subtotal = data.subtotal || data.lineItems.reduce((s, li) => s + li.totalPrice, 0);
  if (subtotal <= 0 || quantity <= 0) return unitPrice;
  const itemTotal = unitPrice * quantity;
  const proportion = itemTotal / subtotal;
  const overhead = (data.shippingCost || 0) + (data.taxAmount || 0) - (data.discount || 0);
  const allocatedOverhead = overhead * proportion;
  return (itemTotal + allocatedOverhead) / quantity;
}

function SummaryCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent?: boolean }) {
  return (
    <Card className="border border-border/50">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", accent ? "bg-primary/10" : "bg-muted/50")}>
          {icon}
        </div>
        <div>
          <p className="text-lg font-bold">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusIcon({ status }: { status: 'matched' | 'new' | 'manual' }) {
  if (status === 'matched') {
    return (
      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="w-3 h-3 text-primary" />
      </div>
    );
  }
  return (
    <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
      <ShoppingBag className="w-3 h-3 text-amber-500" />
    </div>
  );
}

export default InvoiceLineItemReview;
