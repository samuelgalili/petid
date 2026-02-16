import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Heart, Package, MapPin, CreditCard, Home, Share2,
  ShieldCheck, TrendingUp, CalendarCheck, Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { AppHeader } from "@/components/AppHeader";
import { useActivePet } from "@/hooks/useActivePet";
import { toast } from "sonner";

interface OrderDetails {
  orderId: string;
  items: any[];
  shippingData: any;
  paymentMethod: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  orderDate: string;
}

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

// ── Health Score Section ──

const HealthScoreUpdate = ({ pet, items }: { pet: any; items: any[] }) => {
  const impact = useMemo(() => {
    const cartText = items.map((i: any) => i.name?.toLowerCase() || "").join(" ");
    let boost = 0;
    const areas: string[] = [];

    if (cartText.match(/food|מזון|kibble|גורים|puppy|adult/)) { boost += 15; areas.push("תזונה"); }
    if (cartText.match(/omega|אומגה|salmon|סלמון|coat/)) { boost += 10; areas.push("פרווה"); }
    if (cartText.match(/vitamin|ויטמין|supplement|תוסף/)) { boost += 8; areas.push("חיסון"); }
    if (cartText.match(/dental|שיניים|chew|לעיסה/)) { boost += 5; areas.push("שיניים"); }
    if (cartText.match(/joint|מפרקים|glucosamine/)) { boost += 7; areas.push("מפרקים"); }

    const currentScore = 80;
    const projectedScore = Math.min(100, currentScore + boost);
    return { currentScore, projectedScore, boost, areas };
  }, [items]);

  const circumference = 2 * Math.PI * 50;
  const offset = circumference - (impact.projectedScore / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="p-5 border-0 rounded-2xl shadow-lg bg-card text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-primary" strokeWidth={1.5} />
          <h3 className="text-base font-bold text-foreground">{pet.name} מודה לך!</h3>
        </div>

        {/* Gauge */}
        <div className="relative w-28 h-28 mx-auto mb-4">
          <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <motion.circle
              cx="60" cy="60" r="50" fill="none"
              stroke="hsl(var(--primary))" strokeWidth="8"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-2xl font-black text-primary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              {impact.projectedScore}%
            </motion.span>
            <span className="text-[9px] text-muted-foreground font-semibold">ציון בריאות</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          בזכות הרכישה, ציון ה{impact.areas.length > 0 ? impact.areas.join(" ו") : "בריאות"} של{" "}
          <span className="font-bold text-foreground">{pet.name}</span> עלה ל-
          <span className="font-bold text-primary">{impact.projectedScore}%</span>
        </p>

        {impact.boost > 0 && (
          <div className="flex items-center justify-center gap-1 mt-2">
            <TrendingUp className="w-3 h-3 text-primary" strokeWidth={2} />
            <span className="text-[10px] font-semibold text-primary">+{impact.boost}% שיפור</span>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

// ── Peace of Mind Summary ──

const PeaceOfMindSummary = ({ pet, items }: { pet: any; items: any[] }) => {
  const inventoryDays = useMemo(() => {
    if (!pet.weight) return null;
    let maxDays = 0;
    for (const item of items) {
      const bagKg = parseBagKg(item.name || "");
      if (bagKg > 0) {
        const dailyG = estimateDailyGrams(pet.weight, pet.pet_type);
        if (dailyG > 0) {
          const days = Math.round((bagKg * 1000 * (item.quantity || 1)) / dailyG);
          if (days > maxDays) maxDays = days;
        }
      }
    }
    return maxDays > 0 ? maxDays : null;
  }, [pet, items]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card className="p-5 border-0 rounded-2xl shadow-lg bg-card">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-primary" strokeWidth={1.5} />
          <h3 className="font-bold text-foreground text-sm">שקט נפשי</h3>
        </div>

        <div className="space-y-3">
          {/* Inventory */}
          {inventoryDays && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
              <Box className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-xs font-bold text-foreground">המלאי עודכן</p>
                <p className="text-[11px] text-muted-foreground">
                  יש לך שקט נפשי ל-{inventoryDays} הימים הקרובים
                </p>
              </div>
            </div>
          )}

          {/* Safety verified */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
            <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="text-xs font-bold text-foreground">בדיקה רפואית הושלמה</p>
              <p className="text-[11px] text-muted-foreground">
                כל המוצרים נבדקו ונמצאו מתאימים לפרופיל הבריאותי של {pet.name}
              </p>
            </div>
          </div>

          {/* Insurance */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
            <CalendarCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="text-xs font-bold text-foreground">כיסוי ביטוחי</p>
              <p className="text-[11px] text-muted-foreground">
                הכיסוי של Libra בתוקף ומותאם למזון הרפואי החדש
              </p>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// ── Social Health ID Card ──

const SocialHealthCard = ({ pet }: { pet: any }) => {
  const handleShare = async () => {
    const shareText = `✅ ${pet.name} (${pet.breed || pet.pet_type}) — מעודכנ/ת בחיסונים ותזונה! ציון בריאות: 100% 🐾 #PetID #HealthyPet`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `כרטיס בריאות — ${pet.name}`, text: shareText });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("הטקסט הועתק ללוח!");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
    >
      <Card
        className="overflow-hidden border-0 rounded-2xl shadow-lg"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
        }}
      >
        <div className="p-5 text-center">
          <div className="w-14 h-14 rounded-full bg-background/20 flex items-center justify-center mx-auto mb-3">
            <Heart className="w-7 h-7 text-primary-foreground" strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-bold text-primary-foreground mb-1">
            כרטיס בריאות מאומת
          </h3>
          <p className="text-primary-foreground/80 text-xs mb-1">
            {pet.name}{pet.breed ? ` • ${pet.breed}` : ""} • {pet.pet_type === "cat" ? "חתול" : "כלב"}
          </p>
          <div className="flex items-center justify-center gap-3 mt-3 mb-4">
            <div className="px-3 py-1.5 rounded-full bg-background/20">
              <span className="text-[10px] font-bold text-primary-foreground">💉 חיסונים מעודכנים</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-background/20">
              <span className="text-[10px] font-bold text-primary-foreground">🥗 תזונה 100%</span>
            </div>
          </div>
          <Button
            onClick={handleShare}
            variant="secondary"
            size="sm"
            className="rounded-full font-bold text-xs gap-2"
          >
            <Share2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            שתף כרטיס בריאות
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

// ── Main ──

const OrderConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const order = location.state?.order as OrderDetails;
  const { pet } = useActivePet();

  useEffect(() => {
    if (!order) {
      const savedOrder = localStorage.getItem("lastOrder");
      if (!savedOrder) {
        navigate("/");
      }
    }
  }, [order, navigate]);

  if (!order) return null;

  const orderTotal = order.total + (order.paymentMethod === "cash-on-delivery" ? 5 : 0);

  return (
    <div className="min-h-screen pb-20 bg-background" dir="rtl">
      <AppHeader title="אישור הזמנה" showBackButton={false} />

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
          <h1 className="text-2xl font-bold text-foreground mb-2 text-center">
            {pet ? `${pet.name} מודה לך!` : "הזמנה אושרה!"}
          </h1>
          <p className="text-muted-foreground text-center text-sm">
            {pet ? "מדד הבריאות השתפר בזכות הרכישה" : "תודה על ההזמנה שלך"}
          </p>
        </motion.div>
      </div>

      <div className="px-4 py-6 space-y-5 max-w-md mx-auto">
        {/* Order Number */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-5 bg-card border-0 rounded-2xl shadow-lg text-center">
            <p className="text-sm text-muted-foreground mb-1">מספר הזמנה</p>
            <p className="text-2xl font-bold text-foreground">{order.orderId}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(order.orderDate).toLocaleDateString("he-IL", {
                year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </Card>
        </motion.div>

        {/* Health Score Update */}
        {pet && <HealthScoreUpdate pet={pet} items={order.items} />}

        {/* Peace of Mind Summary */}
        {pet && <PeaceOfMindSummary pet={pet} items={order.items} />}

        {/* Social Health ID Card */}
        {pet && <SocialHealthCard pet={pet} />}

        {/* Confirmation Email */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="p-4 bg-primary/5 border-0 rounded-2xl">
            <p className="text-sm text-foreground text-center">
              📧 אימייל אישור נשלח ל{" "}
              <span className="font-semibold">{order.shippingData.email}</span>
            </p>
          </Card>
        </motion.div>

        {/* Shipping */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="p-5 bg-card border-0 rounded-2xl shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <h3 className="font-bold text-foreground">כתובת למשלוח</h3>
            </div>
            <div className="text-sm text-muted-foreground space-y-1 mr-7">
              <p className="font-semibold text-foreground">{order.shippingData.fullName}</p>
              <p>{order.shippingData.address}</p>
              <p>{order.shippingData.city}, {order.shippingData.zipCode}</p>
              <p>{order.shippingData.phone}</p>
            </div>
          </Card>
        </motion.div>

        {/* Payment */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="p-5 bg-card border-0 rounded-2xl shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <h3 className="font-bold text-foreground">אמצעי תשלום</h3>
            </div>
            <p className="text-sm text-muted-foreground mr-7">
              {order.paymentMethod === "credit-card" ? "כרטיס אשראי" :
               order.paymentMethod === "paypal" ? "PayPal" : "מזומן במשלוח"}
            </p>
          </Card>
        </motion.div>

        {/* Order Items */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="p-5 bg-card border-0 rounded-2xl shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <h3 className="font-bold text-foreground">פריטים בהזמנה ({order.items.length})</h3>
            </div>
            <div className="space-y-3">
              {order.items.map((item: any, index: number) => (
                <div key={index} className="flex gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-sm line-clamp-2">{item.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      כמות: {item.quantity}
                      {item.variant && ` • ${item.variant}`}
                      {item.size && ` • ${item.size}`}
                    </p>
                  </div>
                  <div className="text-sm font-bold text-foreground">₪{(item.price * item.quantity).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Order Summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card className="p-5 bg-gradient-to-br from-card to-muted/30 border-0 rounded-2xl shadow-xl space-y-3">
            <h3 className="font-bold text-foreground text-base mb-3">סיכום הזמנה</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">סכום ביניים</span>
              <span className="font-semibold text-foreground">₪{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">משלוח</span>
              <span className="font-semibold text-foreground">
                {order.shipping === 0 ? <span className="text-primary font-bold">חינם</span> : `₪${order.shipping.toFixed(2)}`}
              </span>
            </div>
            {order.paymentMethod === "cash-on-delivery" && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">עמלת מזומן</span>
                <span className="font-semibold text-foreground">₪5.00</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground">* המחירים כוללים מע״מ</div>
            <Separator />
            <div className="flex justify-between pt-2">
              <span className="text-lg font-bold text-foreground">סה״כ ששולם</span>
              <span className="text-2xl font-bold text-primary">₪{orderTotal.toFixed(2)}</span>
            </div>
          </Card>
        </motion.div>

        {/* Delivery Estimate */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <Card className="p-4 bg-primary/5 border-0 rounded-2xl">
            <p className="text-sm text-foreground text-center">
              🚚 זמן אספקה משוער: <span className="font-bold">2-4 ימי עסקים</span>
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1">תקבל מידע על המשלוח במייל</p>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <Button
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-bold shadow-xl h-14"
            onClick={() => navigate("/")}
          >
            <Home className="w-5 h-5 ml-2" strokeWidth={1.5} />
            חזרה לדשבורד הבריאות
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full border-2 border-border text-foreground hover:bg-muted rounded-xl font-bold h-14"
            onClick={() => navigate("/order-history")}
          >
            <Package className="w-5 h-5 ml-2" strokeWidth={1.5} />
            צפה בכל ההזמנות
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
