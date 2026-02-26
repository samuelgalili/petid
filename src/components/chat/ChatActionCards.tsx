import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, MapPin, FileText, ShoppingCart, Shield, Sparkles } from "lucide-react";

// ============= OCR Approval Card =============
interface OcrApprovalCardProps {
  petName: string;
  changes: Record<string, string>;
  onApprove: () => void;
  onReject: () => void;
}

export const OcrApprovalCard = ({ petName, changes, onApprove, onReject }: OcrApprovalCardProps) => (
  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
    <Card className="p-4 border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">אישור נתוני OCR — {petName}</span>
      </div>
      <div className="space-y-2 mb-3">
        {Object.entries(changes).map(([key, val]) => (
          <div key={key} className="flex items-center justify-between text-sm bg-background rounded-lg px-3 py-2">
            <span className="text-muted-foreground">{key}</span>
            <span className="font-medium" dir="auto">{val}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 gap-1.5" onClick={onApprove}>
          <CheckCircle2 className="w-3.5 h-3.5" /> אשר ועדכן
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onReject}>
          <XCircle className="w-3.5 h-3.5" /> דחה
        </Button>
      </div>
    </Card>
  </motion.div>
);

// ============= Quick Checkout Card =============
interface QuickCheckoutCardProps {
  productName: string;
  price: number;
  imageUrl?: string;
  onCheckout: () => void;
}

export const QuickCheckoutCard = ({ productName, price, imageUrl, onCheckout }: QuickCheckoutCardProps) => (
  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
    <Card className="p-4 border-emerald-500/20 bg-emerald-500/5">
      <div className="flex items-center gap-3">
        {imageUrl && (
          <img src={imageUrl} alt={productName} className="w-14 h-14 rounded-lg object-cover" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{productName}</p>
          <p className="text-lg font-bold text-emerald-600">₪{price}</p>
        </div>
        <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={onCheckout}>
          <ShoppingCart className="w-3.5 h-3.5" /> הזמן
        </Button>
      </div>
    </Card>
  </motion.div>
);

// ============= Insurance Lead Card =============
interface InsuranceLeadCardProps {
  petName: string;
  breed?: string;
  onSubmit: () => void;
}

export const InsuranceLeadCard = ({ petName, breed, onSubmit }: InsuranceLeadCardProps) => (
  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
    <Card className="p-4 border-blue-500/20 bg-blue-500/5">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-4 h-4 text-primary" strokeWidth={1.5} />
        <span className="text-sm font-semibold">ליד ביטוח</span>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        ביטוח מותאם ל{petName}{breed ? ` (${breed})` : ""} — כיסוי מלא לטיפולים וטרינריים.
      </p>
      <Button size="sm" className="w-full gap-1.5 bg-blue-600 hover:bg-blue-700" onClick={onSubmit}>
        <Shield className="w-3.5 h-3.5" /> שלח בקשה לביטוח
      </Button>
    </Card>
  </motion.div>
);

// ============= Address Update Card =============
interface AddressUpdateCardProps {
  newAddress: string;
  petName: string;
  onConfirm: () => void;
}

export const AddressUpdateCard = ({ newAddress, petName, onConfirm }: AddressUpdateCardProps) => (
  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
    <Card className="p-4 border-amber-500/20 bg-amber-500/5">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-semibold">עדכון כתובת</span>
      </div>
      <p className="text-sm mb-3">
        הכתובת החדשה של {petName}: <strong dir="auto">{newAddress}</strong>
      </p>
      <Button size="sm" className="w-full gap-1.5" onClick={onConfirm}>
        <CheckCircle2 className="w-3.5 h-3.5" /> אשר עדכון
      </Button>
    </Card>
  </motion.div>
);

// ============= NRC Nutrition Plan Card =============
interface NrcPlanCardProps {
  petName: string;
  weight?: number;
  dailyKcal?: number;
  recommendations: string[];
}

export const NrcPlanCard = ({ petName, weight, dailyKcal, recommendations }: NrcPlanCardProps) => (
  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
    <Card className="p-4 border-violet-500/20 bg-violet-500/5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-violet-600" />
        <span className="text-sm font-semibold">תוכנית תזונה NRC 2006 — {petName}</span>
      </div>
      {weight && dailyKcal && (
        <div className="flex gap-3 mb-2">
          <Badge variant="outline" className="text-xs">משקל: {weight} ק"ג</Badge>
          <Badge variant="outline" className="text-xs">MER: {dailyKcal} kcal/יום</Badge>
        </div>
      )}
      <ul className="space-y-1">
        {recommendations.map((rec, i) => (
          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
            <span className="text-violet-500 mt-0.5">•</span>
            <span dir="auto">{rec}</span>
          </li>
        ))}
      </ul>
    </Card>
  </motion.div>
);

// ============= Pending Approval Card =============
export const PendingApprovalCard = ({ title }: { title: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/30"
  >
    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
    <span className="text-xs text-muted-foreground">{title} — ממתין לאישור מנהל</span>
  </motion.div>
);
