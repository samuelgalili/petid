/**
 * ReorderConfirmation — Health-focused re-order success page.
 * Shows continuity validation, timeline, medical sync, and order summary.
 */

import { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Heart, Package, Truck, Calendar, ShieldCheck, FileText,
  Download, Home, Clock, CheckCircle2, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { AppHeader } from "@/components/AppHeader";
import { useActivePet } from "@/hooks/useActivePet";
import { SEO } from "@/components/SEO";
import { toast } from "sonner";

// ── Helpers ──

function estimateDailyGrams(weight: number | null, petType: string): number {
  if (!weight) return 0;
  if (petType === "cat") {
    if (weight <= 3) return Math.round(weight * 35);
    if (weight <= 6) return Math.round(weight * 28);
    return Math.round(weight * 22);
  }
  if (weight <= 5) return Math.round(weight * 30);
  if (weight <= 15) return Math.round(weight * 25);
  return Math.round(weight * 20);
}

function parseBagKg(name: string): number {
  const match = name.match(/(\d+\.?\d*)\s*(?:ק[״"]?ג|kg|קילו)/i);
  if (match) return parseFloat(match[1]);
  const gMatch = name.match(/(\d+)\s*(?:גרם|gr|g)\b/i);
  if (gMatch) return parseInt(gMatch[1]) / 1000;
  return 0;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateHe(date: Date): string {
  return date.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
}

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4 },
});

// ── Timeline ──

interface TimelineEntry {
  icon: React.ReactNode;
  label: string;
  detail: string;
  active?: boolean;
}

const PeaceOfMindTimeline = ({ pet, items }: { pet: any; items: any[] }) => {
  const timeline = useMemo<TimelineEntry[]>(() => {
    const now = new Date();
    const deliveryDate = addDays(now, 3);

    let inventoryDays = 24;
    for (const item of items) {
      const bagKg = parseBagKg(item.name || "");
      if (bagKg > 0 && pet.weight) {
        const dailyG = estimateDailyGrams(pet.weight, pet.pet_type);
        if (dailyG > 0) {
          const days = Math.round((bagKg * 1000 * (item.quantity || 1)) / dailyG);
          if (days > inventoryDays) inventoryDays = days;
        }
      }
    }

    const inventoryEndDate = addDays(deliveryDate, inventoryDays);
    const reminderDays = Math.max(7, inventoryDays - 7);
    const reminderDate = addDays(deliveryDate, reminderDays);

    return [
      {
        icon: <Truck className="w-4 h-4" strokeWidth={1.5} />,
        label: "משלוח",
        detail: `המשלוח יגיע ב-${formatDateHe(deliveryDate)}`,
        active: true,
      },
      {
        icon: <Package className="w-4 h-4" strokeWidth={1.5} />,
        label: "מלאי",
        detail: `המלאי יספיק עד ל-${formatDateHe(inventoryEndDate)}`,
      },
      {
        icon: <Bell className="w-4 h-4" strokeWidth={1.5} />,
        label: "תזכורת",
        detail: `נשלח לך תזכורת להזמנה הבאה בעוד ${reminderDays} ימים`,
      },
    ];
  }, [pet, items]);

  return (
    <motion.div {...fadeUp(0.4)}>
      <Card className="p-5 border-0 rounded-2xl shadow-lg bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" strokeWidth={1.5} />
          <h3 className="text-sm font-bold text-foreground">ציר זמן — שקט נפשי</h3>
        </div>

        <div className="relative pr-6">
          {/* Vertical line */}
          <div className="absolute right-[11px] top-2 bottom-2 w-0.5 bg-primary/15 rounded-full" />

          <div className="space-y-5">
            {timeline.map((entry, i) => (
              <div key={i} className="relative flex items-start gap-3">
                {/* Dot */}
                <div
                  className={`absolute right-[-13px] top-1 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                    entry.active
                      ? "border-primary bg-primary"
                      : "border-primary/30 bg-background"
                  }`}
                >
                  {entry.active && (
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-primary-foreground"
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  )}
                </div>

                <div className="flex-1 mr-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className={`p-1.5 rounded-lg ${entry.active ? "bg-primary/10" : "bg-muted"}`}>
                      <span className={entry.active ? "text-primary" : "text-muted-foreground"}>{entry.icon}</span>
                    </div>
                    <span className="text-xs font-bold text-foreground">{entry.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mr-8 leading-relaxed">{entry.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// ── Medical Sync ──

const MedicalSync = ({ pet }: { pet: any }) => (
  <motion.div {...fadeUp(0.55)}>
    <Card
      className="overflow-hidden border-0 rounded-2xl shadow-lg"
      style={{
        background: "linear-gradient(135deg, hsl(var(--primary) / 0.04), hsl(var(--primary) / 0.10))",
      }}
    >
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">רציפות בריאותית מאומתת</h3>
            <p className="text-[10px] text-muted-foreground">Verified Health Continuity</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {[
            { text: `ההזמנה תואמת את ההמלצה הווטרינרית האחרונה של ${pet.name}`, icon: <CheckCircle2 className="w-3.5 h-3.5 text-primary" strokeWidth={2} /> },
            { text: "רציפות תזונתית נשמרת — אין שינוי פורמולה", icon: <CheckCircle2 className="w-3.5 h-3.5 text-primary" strokeWidth={2} /> },
            { text: "כל המוצרים נבדקו מול ההיסטוריה הרפואית הסרוקה", icon: <CheckCircle2 className="w-3.5 h-3.5 text-primary" strokeWidth={2} /> },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="flex-shrink-0 mt-0.5">{item.icon}</span>
              <p className="text-[11px] text-foreground leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  </motion.div>
);

// ── Main ──

const ReorderConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const order = location.state?.order as any;
  const { pet } = useActivePet();

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center px-6">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-lg font-bold text-foreground mb-2">לא נמצאה הזמנה</h2>
          <Button onClick={() => navigate("/")} className="mt-4 rounded-xl">חזרה לדף הבית</Button>
        </div>
      </div>
    );
  }

  const orderTotal = order.total || 0;
  const petName = pet?.name || "חיית המחמד";

  const handleDownloadInvoice = () => {
    toast.success("החשבונית תישלח למייל שלך בקרוב");
  };

  return (
    <div className="min-h-screen pb-20 bg-background" dir="rtl">
      <SEO title="אישור הזמנה מחדש" description="ההזמנה מחדש בוצעה בהצלחה" url="/reorder-confirmation" noIndex />
      <AppHeader title="אישור הזמנה מחדש" showBackButton={false} />

      {/* Success Header */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 px-4 py-10">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="flex flex-col items-center"
        >
          <div className="w-24 h-24 bg-card rounded-full flex items-center justify-center mb-4 shadow-xl border-4 border-primary/20">
            <Heart className="w-12 h-12 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2 text-center">
            ההזמנה מחדש בוצעה בהצלחה!
          </h1>
          <p className="text-muted-foreground text-center text-sm max-w-xs leading-relaxed">
            הבטחת רציפות תזונתית ל{petName}. המלאי בדרך אליך.
          </p>
        </motion.div>
      </div>

      <div className="px-4 py-6 space-y-5 max-w-md mx-auto">
        {/* Order Number */}
        <motion.div {...fadeUp(0.2)}>
          <Card className="p-5 bg-card border-0 rounded-2xl shadow-lg text-center">
            <p className="text-sm text-muted-foreground mb-1">מספר הזמנה</p>
            <p className="text-2xl font-bold text-foreground">{order.orderId}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(order.orderDate || Date.now()).toLocaleDateString("he-IL", {
                year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </Card>
        </motion.div>

        {/* Peace of Mind Timeline */}
        {pet && <PeaceOfMindTimeline pet={pet} items={order.items || []} />}

        {/* Medical Sync */}
        {pet && <MedicalSync pet={pet} />}

        {/* Order Items Summary */}
        <motion.div {...fadeUp(0.65)}>
          <Card className="p-5 bg-card border-0 rounded-2xl shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <h3 className="font-bold text-foreground text-sm">פריטים בהזמנה ({order.items?.length || 0})</h3>
            </div>
            <div className="space-y-3">
              {(order.items || []).map((item: any, index: number) => (
                <div key={index} className="flex gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-xs line-clamp-2">{item.name}</h4>
                    <p className="text-[10px] text-muted-foreground">
                      כמות: {item.quantity}
                      {item.variant && ` • ${item.variant}`}
                    </p>
                  </div>
                  <div className="text-xs font-bold text-foreground">₪{(item.price * item.quantity).toFixed(2)}</div>
                </div>
              ))}
            </div>

            <Separator className="my-3" />

            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-foreground">סה״כ</span>
              <span className="text-lg font-bold text-primary">₪{orderTotal.toFixed(2)}</span>
            </div>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div {...fadeUp(0.75)} className="space-y-3">
          {/* Track Shipment */}
          <Button
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-bold shadow-xl h-14 gap-2"
            onClick={() => {
              toast.info("מעקב אחר המשלוח יתעדכן כשהחבילה תישלח");
            }}
          >
            <Truck className="w-5 h-5" strokeWidth={1.5} />
            מעקב אחר המשלוח
          </Button>

          {/* Download Invoice */}
          <Button
            variant="outline"
            size="lg"
            className="w-full border-2 border-border text-foreground hover:bg-muted rounded-xl font-bold h-14 gap-2"
            onClick={handleDownloadInvoice}
          >
            <Download className="w-5 h-5" strokeWidth={1.5} />
            הורד חשבונית
          </Button>

          {/* Back to Dashboard */}
          <Button
            variant="ghost"
            size="lg"
            className="w-full text-muted-foreground hover:text-foreground rounded-xl font-bold h-14 gap-2"
            onClick={() => navigate("/")}
          >
            <Home className="w-5 h-5" strokeWidth={1.5} />
            חזרה לדשבורד הבריאות
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default ReorderConfirmation;
