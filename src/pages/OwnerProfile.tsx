/**
 * OwnerProfile V48 - The Owner Hub Edition
 * Multi-pet orchestration, financial transparency, document security, high-end UI
 */

import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { PageTransition } from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import {
  ChevronRight, MapPin, BadgeCheck, PawPrint, Shield, FileText,
  Phone, ShoppingBag, CreditCard, RefreshCw,
  Building2, FolderOpen, ChevronDown, ChevronUp, Stethoscope,
  Receipt, CalendarClock, Package, ExternalLink, Dog, Cat,
  Cpu, Link2, TrendingUp, Lock, Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { calculateSmartReorderDays, estimateDailyGrams } from "@/lib/brandVoice";
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
  weight?: number;
  chip_number?: string;
  birth_date?: string;
  vet_clinic_name?: string;
  vet_clinic_phone?: string;
}

interface Claim {
  id: string;
  status: string;
  total_amount: number;
  paid_amount?: number;
  diagnosis?: string;
  submitted_at: string;
  pet_id?: string;
}

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  items?: any[];
}

interface PetDocument {
  id: string;
  file_name: string;
  document_type?: string;
  uploaded_at: string;
  pet_id?: string;
  title?: string;
}

// ─── Collapsible Section ─────────────────────────
const Section = ({ title, icon: Icon, children, defaultOpen = true, badge }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mx-4 mb-3 bg-card rounded-2xl border border-border/30 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
          </div>
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badge}
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

// ─── Status helpers ──────────────────────────────
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

const docTypeLabel: Record<string, string> = {
  medical: "רפואי",
  vaccination: "חיסונים",
  insurance: "ביטוח",
  registration: "רישום",
  invoice: "חשבונית",
  other: "אחר",
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
  const [monthlySpendEstimate, setMonthlySpendEstimate] = useState(0);
  const [restockDays, setRestockDays] = useState(0);

  useEffect(() => {
    if (user) fetchOwnerData();
  }, [user]);

  const fetchOwnerData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [profileRes, petsRes, claimsRes, ordersRes, docsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("pets").select("*").eq("user_id", user.id).eq("archived", false).order("created_at", { ascending: false }),
        supabase.from("insurance_claims").select("*").eq("user_id", user.id).order("submitted_at", { ascending: false }).limit(10),
        (supabase as any).from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("pet_documents").select("*").eq("user_id", user.id).order("uploaded_at", { ascending: false }).limit(20),
      ]);

      setProfile(profileRes.data);
      const fetchedPets = (petsRes.data || []) as Pet[];
      setPets(fetchedPets);
      setClaims((claimsRes.data || []) as Claim[]);
      const fetchedOrders = (ordersRes.data || []) as Order[];
      setOrders(fetchedOrders);
      setDocuments((docsRes.data || []) as unknown as PetDocument[]);

      // Total saved from paid claims
      const saved = (claimsRes.data || [])
        .filter((c: any) => c.status === "paid" && c.paid_amount)
        .reduce((sum: number, c: any) => sum + (c.paid_amount || 0), 0);
      setTotalSaved(saved);

      // Spending prediction: average monthly from last orders
      if (fetchedOrders.length >= 2) {
        const totals = fetchedOrders.map((o: any) => o.total || 0);
        const avg = totals.reduce((a: number, b: number) => a + b, 0) / totals.length;
        setMonthlySpendEstimate(Math.round(avg));
      }

      // Restock prediction from last order + primary pet weight (V47 logic)
      if (fetchedOrders.length > 0 && fetchedPets.length > 0) {
        const lastOrder = fetchedOrders[0] as any;
        const primaryPet = fetchedPets[0];
        const orderItems = Array.isArray(lastOrder.items)
          ? lastOrder.items.map((i: any) => ({ name: i.product_name || i.name || "", quantity: i.quantity || 1 }))
          : [];
        const days = calculateSmartReorderDays(
          new Date(lastOrder.created_at),
          orderItems,
          primaryPet.weight || null,
          primaryPet.type
        );
        setRestockDays(days);
      }
    } catch (err) {
      console.error("OwnerProfile fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("he-IL");

  // Derived data
  const dogCount = pets.filter(p => p.type === "dog").length;
  const catCount = pets.filter(p => p.type === "cat").length;
  const petNameMap = new Map(pets.map(p => [p.id, p.name]));
  const docsByPet = documents.reduce<Record<string, PetDocument[]>>((acc, doc) => {
    const petName = (doc.pet_id && petNameMap.get(doc.pet_id)) || "כללי";
    if (!acc[petName]) acc[petName] = [];
    acc[petName].push(doc);
    return acc;
  }, {});

  // Unique clinics from all pets
  const clinics = pets
    .filter(p => p.vet_clinic_name)
    .reduce<Array<{ name: string; phone?: string }>>((acc, p) => {
      if (!acc.find(c => c.name === p.vet_clinic_name)) {
        acc.push({ name: p.vet_clinic_name!, phone: p.vet_clinic_phone });
      }
      return acc;
    }, []);

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background pb-20 pt-14" dir="rtl">
          <div className="px-4 space-y-3">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
        </div>
        <BottomNav />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <SEO title="הפרופיל שלי" description="ניהול חשבון, חיות מחמד, ביטוח ומסמכים" url="/owner-profile" />
      <div className="min-h-screen bg-background pb-20" dir="rtl">
        {/* ── Header ── */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border/20">
          <div className="flex items-center justify-between px-4 h-14">
            <button onClick={() => navigate(-1)} className="p-2 -mr-2" aria-label="חזרה">
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-base font-bold text-foreground">מרכז הבעלים</h1>
            <Button variant="ghost" size="sm" onClick={() => navigate("/edit-profile")} className="text-xs">
              עריכה
            </Button>
          </div>
        </div>

        {/* ═══ 1. Personal Info Card ═══ */}
        <div className="mx-4 mt-4 mb-3 p-5 bg-card rounded-2xl border border-border/30">
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
              <div className="flex items-center gap-1.5 flex-wrap">
                {profile?.id_verified ? (
                  <Badge variant="success" className="text-[10px]">
                    <BadgeCheck className="w-3 h-3 ml-1" />
                    ת״ז מאומת
                  </Badge>
                ) : (
                  <Badge variant="muted" className="text-[10px]">ת״ז לא מאומת</Badge>
                )}
                {/* Pet count summary */}
                {dogCount > 0 && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Dog className="w-3 h-3" strokeWidth={1.5} />
                    {dogCount}
                  </Badge>
                )}
                {catCount > 0 && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Cat className="w-3 h-3" strokeWidth={1.5} />
                    {catCount}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {profile?.bio && (
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed border-t border-border/20 pt-3">
              {profile.bio}
            </p>
          )}
        </div>

        {/* ═══ 2. Fleet Management (My Pets) ═══ */}
        <Section
          title="ניהול חיות המחמד"
          icon={PawPrint}
          badge={
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
              {pets.length}
            </span>
          }
        >
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
                  className="flex-shrink-0 w-[150px] p-3 rounded-xl bg-muted/30 border border-border/20 text-center hover:bg-muted/50 transition-colors relative"
                  whileTap={{ scale: 0.97 }}
                >
                  {/* Species indicator */}
                  <div className="absolute top-2 left-2">
                    {pet.type === "dog" ? (
                      <Dog className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                    ) : (
                      <Cat className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                    )}
                  </div>

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

                  {/* Health Score */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] text-muted-foreground">בריאות</span>
                      <span className="text-[9px] font-bold text-primary">{pet.health_score || 85}%</span>
                    </div>
                    <Progress value={pet.health_score || 85} className="h-1.5" />
                  </div>

                  {/* Microchip link status */}
                  {pet.chip_number && (
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <Cpu className="w-3 h-3 text-muted-foreground" strokeWidth={1.5} />
                      <span className="text-[9px] text-muted-foreground">שבב מקושר</span>
                      {profile?.id_verified && (
                        <Link2 className="w-3 h-3 text-primary" strokeWidth={1.5} />
                      )}
                    </div>
                  )}
                </motion.button>
              ))}
              {/* Add pet card */}
              <motion.button
                onClick={() => navigate("/add-pet")}
                className="flex-shrink-0 w-[150px] p-3 rounded-xl border-2 border-dashed border-border/30 flex flex-col items-center justify-center gap-2 hover:border-primary/30 transition-colors"
                whileTap={{ scale: 0.97 }}
              >
                <PawPrint className="w-6 h-6 text-muted-foreground/40" strokeWidth={1.5} />
                <span className="text-[10px] text-muted-foreground/60">הוסף חיית מחמד</span>
              </motion.button>
            </div>
          )}
        </Section>

        {/* ═══ 3. Insurance & Finance Center ═══ */}
        <Section title="ביטוח ופיננסים" icon={Shield}>
          {/* Financial Summary Row */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {totalSaved > 0 && (
              <div className="p-3 rounded-xl bg-success/5 border border-success/15 text-center">
                <Wallet className="w-4 h-4 text-success mx-auto mb-1" strokeWidth={1.5} />
                <span className="text-xs text-muted-foreground block">נחסך</span>
                <span className="text-sm font-bold text-success">₪{totalSaved.toLocaleString()}</span>
              </div>
            )}
            {monthlySpendEstimate > 0 && (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-center">
                <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" strokeWidth={1.5} />
                <span className="text-xs text-muted-foreground block">הוצאה ממוצעת</span>
                <span className="text-sm font-bold text-primary">₪{monthlySpendEstimate}/חודש</span>
              </div>
            )}
          </div>

          {/* Restock prediction */}
          {restockDays > 0 && (
            <div className="p-2.5 mb-3 rounded-xl bg-accent/5 border border-accent/15 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-accent flex-shrink-0" strokeWidth={1.5} />
              <p className="text-[11px] text-foreground">
                המלאי הנוכחי יספיק ל-<span className="font-bold text-primary">{restockDays}</span> ימים נוספים
              </p>
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
                      {claim.pet_id && petNameMap.has(claim.pet_id) && (
                        <span className="text-[9px] text-muted-foreground">• {petNameMap.get(claim.pet_id)}</span>
                      )}
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
            <p className="text-xs text-muted-foreground text-center py-3">אין תביעות ביטוח עדיין</p>
          )}

          {/* Billing Buttons */}
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
              {orders.slice(0, 3).map((order) => (
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
            <p className="text-xs text-muted-foreground text-center py-3">אין הזמנות עדיין</p>
          )}

          {/* Auto-Restock */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/15">
            <div className="flex items-center gap-2 mb-2">
              <CalendarClock className="w-4 h-4 text-primary" strokeWidth={1.5} />
              <span className="text-xs font-semibold text-foreground">מנוי אוטומטי (Auto-Restock)</span>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">
              הגדר משלוח אוטומטי למזון ותרופות — רציפות תזונתית מובטחת.
            </p>
            <Button size="sm" variant="outline" className="w-full text-xs gap-1.5" onClick={() => navigate("/shop?reorder=true")}>
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
              נהל מנויים
            </Button>
          </div>
        </Section>

        {/* ═══ 5. Document Vault ═══ */}
        <Section title="כספת מסמכים מאובטחת" icon={FolderOpen} badge={
          <Lock className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
        }>
          {documents.length > 0 ? (
            <div className="space-y-3">
              {Object.entries(docsByPet).map(([petName, docs]) => (
                <div key={petName}>
                  <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <PawPrint className="w-3 h-3 text-primary" strokeWidth={1.5} />
                    {petName}
                    <span className="text-[9px] font-normal text-muted-foreground">({docs.length})</span>
                  </p>
                  <div className="space-y-1.5">
                    {docs.slice(0, 4).map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/20">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
                          <div className="min-w-0">
                            <span className="text-[11px] text-foreground truncate block">{doc.title || doc.file_name}</span>
                            {doc.document_type && (
                              <span className="text-[9px] text-muted-foreground">
                                {docTypeLabel[doc.document_type] || doc.document_type}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[9px] text-muted-foreground flex-shrink-0 mr-2">{formatDate(doc.uploaded_at)}</span>
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

            {/* All unique clinics from pets */}
            {clinics.map((clinic, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs gap-2 h-10"
                onClick={() => {
                  if (clinic.phone) window.open(`tel:${clinic.phone}`, "_self");
                }}
              >
                <Stethoscope className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <div className="text-right">
                  <p className="font-medium">{clinic.name}</p>
                  {clinic.phone && (
                    <p className="text-[10px] text-muted-foreground">{clinic.phone}</p>
                  )}
                </div>
              </Button>
            ))}

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
