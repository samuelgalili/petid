import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Store, CheckCircle, XCircle, MapPin, Phone, Star, BadgeCheck
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { SwipeableItem } from "@/components/ui/swipeable-item";

interface BusinessData {
  id: string;
  business_name: string;
  business_type: string;
  description: string | null;
  logo_url: string | null;
  city: string | null;
  phone: string | null;
  is_verified: boolean | null;
  rating: number | null;
  total_reviews: number | null;
  created_at: string;
}

const businessTypeLabels: Record<string, string> = {
  pet_shop: "חנות חיות",
  vet_clinic: "מרפאה",
  groomer: "מספרה",
  trainer: "מאלף",
  boarding: "פנסיון",
  pet_food: "מזון",
  other: "אחר",
};

const AdminBusiness = () => {
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "verified" | "pending">("all");
  const [verifyDialog, setVerifyDialog] = useState<{ open: boolean; business?: BusinessData; action?: "verify" | "unverify" }>({ open: false });
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

  // Filter businesses
  const filteredBusinesses = businesses.filter(b => {
    const matchesSearch = b.business_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || 
      (filter === "verified" && b.is_verified) || 
      (filter === "pending" && !b.is_verified);
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: businesses.length,
    verified: businesses.filter(b => b.is_verified).length,
    pending: businesses.filter(b => !b.is_verified).length,
  };

  return (
    <AdminLayout title="עסקים" breadcrumbs={[{ label: "עסקים" }]}>
      {/* Stats - Instagram style */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        <Card className="p-4 min-w-[100px] text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">סה״כ</p>
        </Card>
        <Card className="p-4 min-w-[100px] text-center border-green-200 bg-green-50/50">
          <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
          <p className="text-xs text-muted-foreground">מאומתים</p>
        </Card>
        <Card className="p-4 min-w-[100px] text-center border-yellow-200 bg-yellow-50/50">
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">ממתינים</p>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="space-y-3 mb-4">
        <Input
          placeholder="חיפוש עסק..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-xl"
        />
        <div className="flex gap-2">
          {(["all", "verified", "pending"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {f === "all" ? "הכל" : f === "verified" ? "מאומתים" : "ממתינים"}
            </button>
          ))}
        </div>
      </div>

      {/* Business Cards - Feed style */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-14 h-14 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filteredBusinesses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Store className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">לא נמצאו עסקים</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredBusinesses.map((business, index) => (
            <SwipeableItem
              key={business.id}
              onEdit={() => setVerifyDialog({ open: true, business, action: business.is_verified ? "unverify" : "verify" })}
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-14 h-14 rounded-xl">
                      <AvatarImage src={business.logo_url || undefined} />
                      <AvatarFallback className="rounded-xl text-lg">
                        {business.business_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate">{business.business_name}</span>
                        {business.is_verified && (
                          <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {businessTypeLabels[business.business_type] || business.business_type}
                        </Badge>
                        {business.city && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />
                            {business.city}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1">
                        {business.rating && (
                          <span className="text-xs flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {business.rating}
                          </span>
                        )}
                        {business.phone && (
                          <a href={`tel:${business.phone}`} className="text-xs text-primary flex items-center gap-0.5">
                            <Phone className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={business.is_verified ? "outline" : "default"}
                      className="rounded-lg text-xs"
                      onClick={() => setVerifyDialog({ open: true, business, action: business.is_verified ? "unverify" : "verify" })}
                    >
                      {business.is_verified ? "בטל" : "אמת"}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            </SwipeableItem>
          ))}
        </div>
      )}

      {/* Verify Dialog */}
      <Dialog open={verifyDialog.open} onOpenChange={(open) => setVerifyDialog({ open })}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {verifyDialog.action === "verify" ? "אימות עסק" : "ביטול אימות"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {verifyDialog.business && (
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12 rounded-lg">
                  <AvatarImage src={verifyDialog.business.logo_url || undefined} />
                  <AvatarFallback className="rounded-lg">
                    {verifyDialog.business.business_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{verifyDialog.business.business_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {businessTypeLabels[verifyDialog.business.business_type]}
                  </p>
                </div>
              </div>
            )}

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
                  if (verifyDialog.business) {
                    verifyMutation.mutate({
                      businessId: verifyDialog.business.id,
                      verify: verifyDialog.action === "verify",
                      notes: verificationNotes,
                    });
                  }
                }}
                disabled={verifyMutation.isPending}
              >
                {verifyMutation.isPending ? "..." : verifyDialog.action === "verify" ? "אמת" : "בטל אימות"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminBusiness;
