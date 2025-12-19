import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Ticket, Plus, Edit, Trash2, MoreHorizontal, 
  Percent, DollarSign, Copy, Check
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, Column, FilterOption } from "@/components/admin/DataTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface CouponData {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  used_count: number | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean | null;
  created_at: string;
}

const emptyCoupon: Partial<CouponData> = {
  code: "",
  discount_type: "percent",
  discount_value: 10,
  min_order_amount: null,
  max_uses: null,
  valid_from: null,
  valid_until: null,
  is_active: true,
};

const AdminCoupons = () => {
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const queryClient = useQueryClient();
  const [selectedCoupons, setSelectedCoupons] = useState<string[]>([]);
  const [editingCoupon, setEditingCoupon] = useState<Partial<CouponData> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; couponId?: string }>({ open: false });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CouponData[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (coupon: Partial<CouponData>) => {
      if (coupon.id) {
        const { error } = await supabase
          .from("coupons")
          .update({
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            min_order_amount: coupon.min_order_amount,
            max_uses: coupon.max_uses,
            valid_from: coupon.valid_from,
            valid_until: coupon.valid_until,
            is_active: coupon.is_active,
          })
          .eq("id", coupon.id);

        if (error) throw error;

        await logAction({
          action_type: "coupon.updated",
          entity_type: "coupon",
          entity_id: coupon.id,
          new_values: coupon,
        });
      } else {
        const { error } = await supabase
          .from("coupons")
          .insert({
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            min_order_amount: coupon.min_order_amount,
            max_uses: coupon.max_uses,
            valid_from: coupon.valid_from,
            valid_until: coupon.valid_until,
            is_active: coupon.is_active,
          });

        if (error) throw error;

        await logAction({
          action_type: "coupon.created",
          entity_type: "coupon",
          new_values: coupon,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: editingCoupon?.id ? "הקופון עודכן" : "הקופון נוצר" });
      setIsDialogOpen(false);
      setEditingCoupon(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "שגיאה", 
        description: error.message?.includes("unique") ? "קוד הקופון כבר קיים" : "הפעולה נכשלה", 
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (couponId: string) => {
      const { error } = await supabase
        .from("coupons")
        .delete()
        .eq("id", couponId);

      if (error) throw error;

      await logAction({
        action_type: "coupon.deleted",
        entity_type: "coupon",
        entity_id: couponId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: "הקופון נמחק" });
      setDeleteDialog({ open: false });
    },
    onError: () => {
      toast({ title: "שגיאה", description: "המחיקה נכשלה", variant: "destructive" });
    },
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({ title: "הקוד הועתק" });
  };

  const isExpired = (coupon: CouponData) => {
    if (!coupon.valid_until) return false;
    return new Date(coupon.valid_until) < new Date();
  };

  const isAtLimit = (coupon: CouponData) => {
    if (!coupon.max_uses) return false;
    return (coupon.used_count || 0) >= coupon.max_uses;
  };

  const columns: Column<CouponData>[] = [
    {
      key: "code",
      header: "קוד",
      render: (coupon) => (
        <div className="flex items-center gap-2">
          <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
            {coupon.code}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => copyCode(coupon.code)}
          >
            {copiedCode === coupon.code ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>
      ),
    },
    {
      key: "discount",
      header: "הנחה",
      render: (coupon) => (
        <div className="flex items-center gap-1">
          {coupon.discount_type === "percent" ? (
            <>
              <Percent className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{coupon.discount_value}%</span>
            </>
          ) : (
            <>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">₪{coupon.discount_value}</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: "usage",
      header: "שימוש",
      render: (coupon) => (
        <span className="text-sm">
          {coupon.used_count || 0}
          {coupon.max_uses && ` / ${coupon.max_uses}`}
        </span>
      ),
    },
    {
      key: "validity",
      header: "תוקף",
      render: (coupon) => (
        <div className="text-sm">
          {coupon.valid_until ? (
            <span className={isExpired(coupon) ? "text-destructive" : ""}>
              עד {format(new Date(coupon.valid_until), "d בMMM yyyy", { locale: he })}
            </span>
          ) : (
            <span className="text-muted-foreground">ללא הגבלה</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "סטטוס",
      render: (coupon) => {
        if (!coupon.is_active) {
          return <Badge variant="outline" className="text-xs">לא פעיל</Badge>;
        }
        if (isExpired(coupon)) {
          return <Badge variant="destructive" className="text-xs">פג תוקף</Badge>;
        }
        if (isAtLimit(coupon)) {
          return <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">מוגבל</Badge>;
        }
        return <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">פעיל</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (coupon) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setEditingCoupon(coupon);
              setIsDialogOpen(true);
            }}>
              <Edit className="w-4 h-4 ml-2" />
              עריכה
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setDeleteDialog({ open: true, couponId: coupon.id })}
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
      key: "is_active",
      label: "סטטוס",
      options: [
        { value: "true", label: "פעיל" },
        { value: "false", label: "לא פעיל" },
      ],
    },
    {
      key: "discount_type",
      label: "סוג הנחה",
      options: [
        { value: "percent", label: "אחוזים" },
        { value: "fixed", label: "סכום קבוע" },
      ],
    },
  ];

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEditingCoupon((prev) => prev ? { ...prev, code } : null);
  };

  return (
    <AdminLayout title="ניהול קופונים" breadcrumbs={[{ label: "קופונים" }]}>
      <div className="flex justify-between items-center mb-4">
        <Button onClick={() => {
          setEditingCoupon(emptyCoupon);
          setIsDialogOpen(true);
        }}>
          <Plus className="w-4 h-4 ml-2" />
          צור קופון
        </Button>
      </div>

      <DataTable
        data={coupons}
        columns={columns}
        loading={isLoading}
        filters={filters}
        searchPlaceholder="חיפוש לפי קוד..."
        searchKey={(item, query) => 
          item.code.toLowerCase().includes(query.toLowerCase())
        }
        selectable
        selectedItems={selectedCoupons}
        onSelectionChange={setSelectedCoupons}
        emptyIcon={<Ticket className="w-12 h-12" />}
        emptyMessage="לא נמצאו קופונים"
        bulkActions={
          <Button size="sm" variant="destructive">
            <Trash2 className="w-4 h-4 ml-1" />
            מחק נבחרים
          </Button>
        }
      />

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingCoupon?.id ? "עריכת קופון" : "יצירת קופון"}</DialogTitle>
          </DialogHeader>
          
          {editingCoupon && (
            <form onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(editingCoupon);
            }} className="space-y-4">
              <div>
                <Label>קוד קופון *</Label>
                <div className="flex gap-2">
                  <Input
                    value={editingCoupon.code || ""}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                    placeholder="SUMMER20"
                    required
                    className="font-mono"
                  />
                  <Button type="button" variant="outline" onClick={generateCode}>
                    צור
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>סוג הנחה</Label>
                  <Select 
                    value={editingCoupon.discount_type || "percent"} 
                    onValueChange={(value) => setEditingCoupon({ ...editingCoupon, discount_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">אחוזים</SelectItem>
                      <SelectItem value="fixed">סכום קבוע</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>ערך הנחה *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingCoupon.discount_value || ""}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, discount_value: parseFloat(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>מינימום הזמנה</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingCoupon.min_order_amount || ""}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, min_order_amount: parseFloat(e.target.value) || null })}
                    placeholder="₪0"
                  />
                </div>

                <div>
                  <Label>מקסימום שימושים</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingCoupon.max_uses || ""}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, max_uses: parseInt(e.target.value) || null })}
                    placeholder="ללא הגבלה"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>תקף מתאריך</Label>
                  <Input
                    type="date"
                    value={editingCoupon.valid_from ? editingCoupon.valid_from.split("T")[0] : ""}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, valid_from: e.target.value || null })}
                  />
                </div>

                <div>
                  <Label>תקף עד תאריך</Label>
                  <Input
                    type="date"
                    value={editingCoupon.valid_until ? editingCoupon.valid_until.split("T")[0] : ""}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, valid_until: e.target.value || null })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingCoupon.is_active ?? true}
                  onCheckedChange={(checked) => setEditingCoupon({ ...editingCoupon, is_active: checked })}
                />
                <Label>קופון פעיל</Label>
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
        title="מחיקת קופון"
        description="האם אתה בטוח שברצונך למחוק את הקופון? פעולה זו לא ניתנת לביטול."
        confirmLabel="מחק"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteDialog.couponId) {
            deleteMutation.mutate(deleteDialog.couponId);
          }
        }}
        icon={<Trash2 className="w-5 h-5 text-destructive" />}
      />
    </AdminLayout>
  );
};

export default AdminCoupons;
