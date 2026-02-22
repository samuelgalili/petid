import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, CheckCircle2, XCircle, Search, RefreshCw, AlertTriangle, Clock } from "lucide-react";
import { useProductCurationActions } from "@/hooks/admin/useProductCuration";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const AdminReviewQueue = () => {
  const [search, setSearch] = useState("");
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const { approveMutation, rejectMutation } = useProductCurationActions();

  const { data: pendingProducts = [], isLoading, refetch } = useQuery({
    queryKey: ["review-queue"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("business_products")
        .select("id, name, image_url, price, category, safety_score, ingredients, brand, curation_status, curation_notes, created_at") as any)
        .eq("curation_status", "pending_review")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = pendingProducts.filter((p: any) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="תור ביקורת מוצרים" icon={ShieldAlert}>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-10" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">ממתינים לביקורת</p>
                  <p className="text-2xl font-bold">{pendingProducts.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-rose-600 opacity-10" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Red Flags שזוהו</p>
                  <p className="text-2xl font-bold">
                    {pendingProducts.filter((p: any) => p.curation_notes?.includes("Red Flags")).length}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-10" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">SafeScore נמוך</p>
                  <p className="text-2xl font-bold">
                    {pendingProducts.filter((p: any) => (p.safety_score ?? 10) < 5).length}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש מוצר..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Products List */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              מוצרים לביקורת ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                טוען...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-lg font-medium">אין מוצרים בתור הביקורת</p>
                <p className="text-sm">כל המוצרים אושרו או סווגו אוטומטית</p>
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((product: any) => (
                  <div key={product.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{product.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {product.brand && (
                            <Badge variant="outline" className="text-xs">{product.brand}</Badge>
                          )}
                          <span className="text-sm text-muted-foreground">{product.category || "ללא קטגוריה"}</span>
                          <span className="text-sm text-primary font-medium">₪{product.price}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            className={
                              (product.safety_score ?? 10) < 5
                                ? "bg-red-100 text-red-700 border-red-200"
                                : "bg-amber-100 text-amber-700 border-amber-200"
                            }
                          >
                            SafeScore: {product.safety_score ?? "N/A"}
                          </Badge>
                          {product.curation_notes && (
                            <span className="text-xs text-muted-foreground">{product.curation_notes}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => approveMutation.mutate({ productId: product.id })}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle2 className="w-4 h-4 ml-1" />
                          אישור
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setRejectDialog(product.id);
                            setRejectNotes("");
                          }}
                          disabled={rejectMutation.isPending}
                        >
                          <XCircle className="w-4 h-4 ml-1" />
                          דחייה
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reject Dialog */}
        <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>דחיית מוצר</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="סיבת הדחייה (אופציונלי)..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setRejectDialog(null)}>
                  ביטול
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    if (rejectDialog) {
                      rejectMutation.mutate(
                        { productId: rejectDialog, notes: rejectNotes || undefined },
                        { onSuccess: () => setRejectDialog(null) }
                      );
                    }
                  }}
                  disabled={rejectMutation.isPending}
                >
                  אישור דחייה
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminReviewQueue;
