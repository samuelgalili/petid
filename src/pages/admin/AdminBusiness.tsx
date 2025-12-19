import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Store, CheckCircle, XCircle, MoreHorizontal, 
  Eye, Clock, MapPin, Phone, Mail, Globe
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, Column, FilterOption } from "@/components/admin/DataTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface BusinessData {
  id: string;
  business_name: string;
  business_type: string;
  description: string | null;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  is_verified: boolean | null;
  verification_requested_at: string | null;
  verification_notes: string | null;
  rating: number | null;
  total_reviews: number | null;
  created_at: string;
}

const businessTypeLabels: Record<string, string> = {
  pet_shop: "חנות חיות",
  vet_clinic: "מרפאה וטרינרית",
  groomer: "מספרה",
  trainer: "מאלף",
  boarding: "פנסיון",
  pet_food: "מזון לחיות",
  other: "אחר",
};

const AdminBusiness = () => {
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const queryClient = useQueryClient();
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessData | null>(null);
  const [verifyDialog, setVerifyDialog] = useState<{ open: boolean; businessId?: string; action?: "verify" | "unverify" }>({ open: false });
  const [verificationNotes, setVerificationNotes] = useState("");

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BusinessData[];
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ businessId, verify, notes }: { businessId: string; verify: boolean; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("business_profiles")
        .update({
          is_verified: verify,
          verified_by: verify ? user?.id : null,
          verification_notes: notes || null,
        })
        .eq("id", businessId);

      if (error) throw error;

      await logAction({
        action_type: verify ? "business.verified" : "business.unverified",
        entity_type: "business",
        entity_id: businessId,
      });
    },
    onSuccess: (_, { verify }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      toast({ title: verify ? "העסק אומת בהצלחה" : "האימות בוטל" });
      setVerifyDialog({ open: false });
      setVerificationNotes("");
    },
    onError: () => {
      toast({ title: "שגיאה", description: "הפעולה נכשלה", variant: "destructive" });
    },
  });

  const columns: Column<BusinessData>[] = [
    {
      key: "business",
      header: "עסק",
      render: (business) => (
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12 rounded-lg">
            <AvatarImage src={business.logo_url || undefined} />
            <AvatarFallback className="rounded-lg">{business.business_name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{business.business_name}</p>
              {business.is_verified && (
                <CheckCircle className="w-4 h-4 text-primary fill-primary/20" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {businessTypeLabels[business.business_type] || business.business_type}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "location",
      header: "מיקום",
      render: (business) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{business.city || "-"}</span>
        </div>
      ),
    },
    {
      key: "rating",
      header: "דירוג",
      render: (business) => (
        <div className="text-sm">
          {business.rating ? (
            <span className="font-medium">{business.rating.toFixed(1)} ⭐</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
          {business.total_reviews && (
            <span className="text-muted-foreground mr-1">({business.total_reviews})</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "סטטוס",
      render: (business) => (
        <div className="flex flex-col gap-1">
          {business.is_verified ? (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 w-fit">
              <CheckCircle className="w-3 h-3 ml-1" />
              מאומת
            </Badge>
          ) : business.verification_requested_at ? (
            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 w-fit">
              <Clock className="w-3 h-3 ml-1" />
              ממתין לאימות
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs w-fit">
              לא מאומת
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "created_at",
      header: "נוסף",
      sortable: true,
      render: (business) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(business.created_at), "d בMMM yyyy", { locale: he })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (business) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectedBusiness(business)}>
              <Eye className="w-4 h-4 ml-2" />
              צפייה בפרטים
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {business.is_verified ? (
              <DropdownMenuItem 
                onClick={() => setVerifyDialog({ open: true, businessId: business.id, action: "unverify" })}
                className="text-destructive"
              >
                <XCircle className="w-4 h-4 ml-2" />
                בטל אימות
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setVerifyDialog({ open: true, businessId: business.id, action: "verify" })}>
                <CheckCircle className="w-4 h-4 ml-2" />
                אמת עסק
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filters: FilterOption[] = [
    {
      key: "business_type",
      label: "סוג עסק",
      options: Object.entries(businessTypeLabels).map(([value, label]) => ({ value, label })),
    },
    {
      key: "is_verified",
      label: "סטטוס אימות",
      options: [
        { value: "true", label: "מאומת" },
        { value: "false", label: "לא מאומת" },
      ],
    },
  ];

  const pendingVerification = businesses.filter(
    (b) => !b.is_verified && b.verification_requested_at
  ).length;

  return (
    <AdminLayout title="ניהול עסקים" breadcrumbs={[{ label: "עסקים" }]}>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-2xl font-bold">{businesses.length}</p>
          <p className="text-sm text-muted-foreground">סה״כ עסקים</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-600">
            {businesses.filter((b) => b.is_verified).length}
          </p>
          <p className="text-sm text-muted-foreground">מאומתים</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-yellow-600">{pendingVerification}</p>
          <p className="text-sm text-muted-foreground">ממתינים לאימות</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold">
            {businesses.filter((b) => b.rating && b.rating >= 4).length}
          </p>
          <p className="text-sm text-muted-foreground">דירוג 4+</p>
        </Card>
      </div>

      <DataTable
        data={businesses}
        columns={columns}
        loading={isLoading}
        filters={filters}
        searchPlaceholder="חיפוש לפי שם עסק..."
        searchKey={(item, query) => 
          item.business_name.toLowerCase().includes(query.toLowerCase())
        }
        emptyIcon={<Store className="w-12 h-12" />}
        emptyMessage="לא נמצאו עסקים"
      />

      {/* Business Details Dialog */}
      <Dialog open={!!selectedBusiness} onOpenChange={() => setSelectedBusiness(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>פרטי עסק</DialogTitle>
          </DialogHeader>
          
          {selectedBusiness && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 rounded-lg">
                  <AvatarImage src={selectedBusiness.logo_url || undefined} />
                  <AvatarFallback className="rounded-lg text-xl">
                    {selectedBusiness.business_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg">{selectedBusiness.business_name}</h3>
                  <p className="text-muted-foreground">
                    {businessTypeLabels[selectedBusiness.business_type]}
                  </p>
                </div>
              </div>

              {selectedBusiness.description && (
                <p className="text-sm">{selectedBusiness.description}</p>
              )}

              <div className="space-y-2 text-sm">
                {selectedBusiness.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedBusiness.address}, {selectedBusiness.city}</span>
                  </div>
                )}
                {selectedBusiness.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedBusiness.phone}</span>
                  </div>
                )}
                {selectedBusiness.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedBusiness.email}</span>
                  </div>
                )}
                {selectedBusiness.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <a href={selectedBusiness.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {selectedBusiness.website}
                    </a>
                  </div>
                )}
              </div>

              {selectedBusiness.verification_notes && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs font-medium mb-1">הערות אימות:</p>
                  <p className="text-sm">{selectedBusiness.verification_notes}</p>
                </div>
              )}

              <DialogFooter>
                {selectedBusiness.is_verified ? (
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      setSelectedBusiness(null);
                      setVerifyDialog({ open: true, businessId: selectedBusiness.id, action: "unverify" });
                    }}
                  >
                    <XCircle className="w-4 h-4 ml-2" />
                    בטל אימות
                  </Button>
                ) : (
                  <Button 
                    onClick={() => {
                      setSelectedBusiness(null);
                      setVerifyDialog({ open: true, businessId: selectedBusiness.id, action: "verify" });
                    }}
                  >
                    <CheckCircle className="w-4 h-4 ml-2" />
                    אמת עסק
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verify Dialog */}
      <Dialog open={verifyDialog.open} onOpenChange={(open) => setVerifyDialog({ open })}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {verifyDialog.action === "verify" ? "אימות עסק" : "ביטול אימות"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {verifyDialog.action === "verify" 
                ? "האם לאמת את העסק? עסקים מאומתים מקבלים תג כחול."
                : "האם לבטל את אימות העסק?"}
            </p>

            <div>
              <Label>הערות (אופציונלי)</Label>
              <Textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="הוסף הערות..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setVerifyDialog({ open: false })}>
                ביטול
              </Button>
              <Button
                variant={verifyDialog.action === "unverify" ? "destructive" : "default"}
                onClick={() => {
                  if (verifyDialog.businessId) {
                    verifyMutation.mutate({
                      businessId: verifyDialog.businessId,
                      verify: verifyDialog.action === "verify",
                      notes: verificationNotes,
                    });
                  }
                }}
                disabled={verifyMutation.isPending}
              >
                {verifyMutation.isPending ? "מעבד..." : verifyDialog.action === "verify" ? "אמת" : "בטל אימות"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminBusiness;
