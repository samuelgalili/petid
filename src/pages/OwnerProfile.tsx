/**
 * OwnerProfile - The Owner's Personal Profile Page
 * Sections: Personal Info, Fleet (My Pets), Insurance & Finance, Orders, Document Vault, Support
 */

import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { PageTransition } from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import {
  ChevronRight, MapPin, BadgeCheck, PawPrint, Shield, FileText,
  Phone, ShoppingBag, CreditCard, Truck, RefreshCw, Download,
  Building2, FolderOpen, ChevronDown, ChevronUp, Clock, Stethoscope,
  Receipt, CalendarClock, Package, ExternalLink,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";

// ─── Types ────────────────────────────────────────
interface Pet {
  id: string;
  name: string;
  type: string;
  breed?: string;
  avatar_url?: string;
  health_score?: number;
}

interface InsurancePolicy {
  id: string;
  provider: string;
  policy_number: string;
  status: string;
  expires_at: string;
  pet_name?: string;
}

interface Claim {
  id: string;
  status: string;
  total_amount: number;
  paid_amount?: number;
  diagnosis?: string;
  submitted_at: string;
}

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  items_count?: number;
}

interface PetDocument {
  id: string;
  file_name: string;
  document_type?: string;
  uploaded_at: string;
  pet_id?: string;
  title?: string;
}

// ─── Section wrapper ─────────────────────────────
const Section = ({ title, icon: Icon, children, defaultOpen = true }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mx-4 mb-4 bg-card rounded-2xl border border-border/30 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
          </div>
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
        }
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
};

// ─── Status badge helper ─────────────────────────
const statusLabel: Record<string, { text: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }> = {
  pending: { text: "בטיפול", variant: "warning" },
  processing: { text: "בטיפול", variant: "warning" },
  approved: { text: "אושר", variant: "success" },
  paid: { text: "שולם", variant: "success" },
  denied: { text: "נדחה", variant: "destructive" },
  active: { text: "פעיל", variant: "success" },
  completed: { text: "הושלם", variant: "secondary" },
  shipped: { text: "נשלח", variant: "default" },
  delivered: { text: "נמסר", variant: "success" },
};

const getStatusBadge = (status: string) => {
  const cfg = statusLabel[status] || { text: status, variant: "secondary" as const };
  return <Badge variant={cfg.variant} className="text-[10px]">{cfg.text}</Badge>;
};

// ─── Main Component ──────────────────────────────
const OwnerProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [documents, setDocuments] = useState<PetDocument[]>([]);
  const [totalSaved, setTotalSaved] = useState(0);

  useEffect(() => {
    if (user) fetchOwnerData();
  }, [user]);

  const fetchOwnerData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Parallel fetches
      const [profileRes, petsRes, claimsRes, ordersRes, docsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("pets").select("*").eq("user_id", user.id).eq("archived", false).order("created_at", { ascending: false }),
        supabase.from("insurance_claims").select("*").eq("user_id", user.id).order("submitted_at", { ascending: false }).limit(10),
        (supabase as any).from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
        supabase.from("pet_documents").select("*").eq("user_id", user.id).order("uploaded_at", { ascending: false }).limit(20),
      ]);

      setProfile(profileRes.data);
      setPets((petsRes.data || []) as Pet[]);
      setClaims((claimsRes.data || []) as Claim[]);
      setOrders((ordersRes.data || []) as Order[]);
      setDocuments((docsRes.data || []) as unknown as PetDocument[]);

      // Calculate total saved from paid claims
      const saved = (claimsRes.data || [])
        .filter((c: any) => c.status === "paid" && c.paid_amount)
        .reduce((sum: number, c: any) => sum + (c.paid_amount || 0), 0);
      setTotalSaved(saved);
    } catch (err) {
      console.error("OwnerProfile fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("he-IL");

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background pb-20 pt-14" dir="rtl">
          <div className="px-4 space-y-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        </div>
        <BottomNav />
      </PageTransition>
    );
  }

  // Group documents by pet
  const petNameMap = new Map(pets.map(p => [p.id, p.name]));
  const docsByPet = documents.reduce<Record<string, PetDocument[]>>((acc, doc) => {
    const petName = (doc.pet_id && petNameMap.get(doc.pet_id)) || "כללי";
    if (!acc[petName]) acc[petName] = [];
    acc[petName].push(doc);
    return acc;
  }, {});

  return (
    <PageTransition>
      <SEO title="הפרופיל שלי" description="ניהול חשבון, חיות מחמד, ביטוח ומסמכים" url="/owner-profile" />
      <div className="min-h-screen bg-background pb-20" dir="rtl">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border/20">
          <div className="flex items-center justify-between px-4 h-14">
            <button onClick={() => navigate(-1)} className="p-2 -mr-2" aria-label="חזרה">
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-base font-bold text-foreground">הפרופיל שלי</h1>
            <Button variant="ghost" size="sm" onClick={() => navigate("/edit-profile")} className="text-xs">
              עריכה
            </Button>
          </div>
        </div>

        {/* ═══ 1. Personal Info Card ═══ */}
        <div className="mx-4 mt-4 mb-4 p-5 bg-card rounded-2xl border border-border/30">
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20 border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                {profile?.full_name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-foreground truncate">{profile?.full_name || "משתמש"}</h2>
                {profile?.id_verified && (
                  <BadgeCheck className="w-5 h-5 text-primary flex-shrink-0" />
                )}
              </div>
              {profile?.city && (
                <div className="flex items-center gap-1 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                  <span className="text-xs text-muted-foreground">{profile.city}</span>
                </div>
              )}
              {profile?.phone && (
                <p className="text-xs text-muted-foreground mb-2">{profile.phone}</p>
              )}
              {profile?.id_verified ? (
                <Badge variant="success" className="text-[10px]">
                  <BadgeCheck className="w-3 h-3 ml-1" />
                  ת״ז מאומת
                </Badge>
              ) : (
                <Badge variant="muted" className="text-[10px]">ת״ז לא מאומת</Badge>
              )}
            </div>
          </div>
          {profile?.bio && (
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed border-t border-border/20 pt-3">
              {profile.bio}
            </p>
          )}
        </div>

        {/* ═══ 2. Fleet Management (My Pets) ═══ */}
        <Section title={`חיות המחמד שלי (${pets.length})`} icon={PawPrint}>
          {pets.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">עדיין לא הוספת חיות מחמד</p>
              <Button size="sm" onClick={() => navigate("/add-pet")}>הוסף חיית מחמד</Button>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {pets.map((pet) => (
                <motion.button
                  key={pet.id}
                  onClick={() => navigate("/")}
                  className="flex-shrink-0 w-[140px] p-3 rounded-xl bg-muted/30 border border-border/20 text-center hover:bg-muted/50 transition-colors"
                  whileTap={{ scale: 0.97 }}
                >
                  <div className="w-14 h-14 rounded-full mx-auto mb-2 overflow-hidden bg-muted border-2 border-primary/20">
                    {pet.avatar_url ? (
                      <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <img src={pet.type === "dog" ? dogIcon : catIcon} alt={pet.type} className="w-7 h-7 opacity-60" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-foreground truncate">{pet.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{pet.breed || (pet.type === "dog" ? "כלב" : "חתול")}</p>
                  {/* Health Score Bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] text-muted-foreground">בריאות</span>
                      <span className="text-[9px] font-bold text-primary">{pet.health_score || 85}%</span>
                    </div>
                    <Progress value={pet.health_score || 85} className="h-1.5" />
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </Section>

        {/* ═══ 3. Insurance & Finance Center ═══ */}
        <Section title="ביטוח ופיננסים" icon={Shield}>
          {/* Total Saved */}
          {totalSaved > 0 && (
            <div className="p-3 mb-3 rounded-xl bg-success/5 border border-success/15">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">סה״כ נחסך בביטוח</span>
                <span className="text-sm font-bold text-success">₪{totalSaved.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Claims */}
          {claims.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">תביעות אחרונות</p>
              {claims.slice(0, 5).map((claim) => (
                <div key={claim.id} className="p-3 rounded-xl bg-muted/30 border border-border/20">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(claim.status)}
                      <span className="text-xs font-medium text-foreground">₪{claim.total_amount}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{formatDate(claim.submitted_at)}</span>
                  </div>
                  {claim.diagnosis && (
                    <p className="text-[10px] text-muted-foreground mt-1">{claim.diagnosis}</p>
                  )}
                  {claim.status === "paid" && claim.paid_amount && (
                    <p className="text-[10px] font-medium text-success mt-1">
                      שולם: ₪{claim.paid_amount}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">אין תביעות ביטוח עדיין</p>
          )}

          {/* Tax & Billing */}
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs gap-1.5" onClick={() => navigate("/order-history")}>
              <Receipt className="w-3.5 h-3.5" strokeWidth={1.5} />
              חשבוניות
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs gap-1.5" onClick={() => navigate("/settings")}>
              <CreditCard className="w-3.5 h-3.5" strokeWidth={1.5} />
              אמצעי תשלום
            </Button>
          </div>
        </Section>

        {/* ═══ 4. Order History & Logistics ═══ */}
        <Section title="הזמנות ולוגיסטיקה" icon={ShoppingBag}>
          {orders.length > 0 ? (
            <div className="space-y-2 mb-3">
              {orders.map((order) => (
                <div key={order.id} className="p-3 rounded-xl bg-muted/30 border border-border/20">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                      <span className="text-xs font-medium text-foreground">₪{order.total}</span>
                      {getStatusBadge(order.status)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{formatDate(order.created_at)}</span>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="w-full text-xs text-primary" onClick={() => navigate("/order-history")}>
                צפה בכל ההזמנות
                <ExternalLink className="w-3 h-3 mr-1" />
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">אין הזמנות עדיין</p>
          )}

          {/* Subscription Manager */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/15">
            <div className="flex items-center gap-2 mb-2">
              <CalendarClock className="w-4 h-4 text-primary" strokeWidth={1.5} />
              <span className="text-xs font-semibold text-foreground">מנוי אוטומטי (Auto-Restock)</span>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">
              הגדר משלוח אוטומטי למזון ותרופות — בלי לשכוח, בלי לחץ.
            </p>
            <Button size="sm" variant="outline" className="w-full text-xs gap-1.5" onClick={() => navigate("/shop?reorder=true")}>
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
              נהל מנויים
            </Button>
          </div>
        </Section>

        {/* ═══ 5. Document Vault ═══ */}
        <Section title="כספת מסמכים" icon={FolderOpen}>
          {documents.length > 0 ? (
            <div className="space-y-3">
              {Object.entries(docsByPet).map(([petName, docs]) => (
                <div key={petName}>
                  <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <PawPrint className="w-3 h-3 text-primary" strokeWidth={1.5} />
                    {petName}
                  </p>
                  <div className="space-y-1.5">
                    {docs.slice(0, 4).map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/20">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
                          <span className="text-[11px] text-foreground truncate">{doc.file_name}</span>
                        </div>
                        <span className="text-[9px] text-muted-foreground flex-shrink-0">{formatDate(doc.uploaded_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="w-full text-xs text-primary" onClick={() => navigate("/documents")}>
                צפה בכל המסמכים
                <ExternalLink className="w-3 h-3 mr-1" />
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground mb-2">אין מסמכים סרוקים עדיין</p>
              <p className="text-[10px] text-muted-foreground">סרקו מסמכים רפואיים מדף הפרופיל של חיית המחמד</p>
            </div>
          )}
        </Section>

        {/* ═══ 6. Support & Authorities ═══ */}
        <Section title="תמיכה ורשויות" icon={Stethoscope} defaultOpen={false}>
          <div className="space-y-2">
            {/* Municipal Vet */}
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs gap-2 h-10"
              onClick={() => window.open("tel:*6553", "_self")}
            >
              <Building2 className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              <div className="text-right">
                <p className="font-medium">שירות וטרינרי עירוני</p>
                <p className="text-[10px] text-muted-foreground">*6553</p>
              </div>
            </Button>

            {/* User's preferred clinic — extract from first pet */}
            {pets.length > 0 && (pets[0] as any).vet_clinic_name && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs gap-2 h-10"
                onClick={() => {
                  const phone = (pets[0] as any).vet_clinic_phone;
                  if (phone) window.open(`tel:${phone}`, "_self");
                }}
              >
                <Stethoscope className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <div className="text-right">
                  <p className="font-medium">{(pets[0] as any).vet_clinic_name}</p>
                  {(pets[0] as any).vet_clinic_phone && (
                    <p className="text-[10px] text-muted-foreground">{(pets[0] as any).vet_clinic_phone}</p>
                  )}
                </div>
              </Button>
            )}

            {/* Emergency */}
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs gap-2 h-10 border-destructive/30 text-destructive"
              onClick={() => window.open("tel:1800600060", "_self")}
            >
              <Phone className="w-4 h-4" strokeWidth={1.5} />
              <div className="text-right">
                <p className="font-medium">חירום וטרינרי 24/7</p>
                <p className="text-[10px]">1-800-600-060</p>
              </div>
            </Button>
          </div>
        </Section>
      </div>
      <BottomNav />
    </PageTransition>
  );
};

export default OwnerProfile;
