import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Printer, X, Package, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface OrderItem {
  product_name: string;
  quantity: number;
  price: number;
  product_id?: string | null;
}

interface LabelOrder {
  id: string;
  order_number: string;
  order_date: string;
  customer_name: string | null;
  pet_name: string | null;
  shipping_address: any;
  order_items?: OrderItem[];
  total: number;
  shipping: number;
  user_id: string;
}

export type LabelFormat = "lite" | "premium";

interface OrderLabelGeneratorProps {
  orders: LabelOrder[];
  open: boolean;
  onClose: () => void;
  initialFormat?: LabelFormat;
}

const APP_URL = "https://petid.lovable.app";

// ─── Shared Helpers ──────────────────────────────────────────
const formatAddress = (addr: any): string => {
  if (!addr) return "כתובת לא זמינה";
  if (typeof addr === "string") return addr;
  const parts = [addr.street, addr.city, addr.zipCode, addr.country].filter(Boolean);
  return parts.join(", ") || "כתובת לא זמינה";
};

const getFullName = (order: LabelOrder): string => {
  if (order.customer_name) return order.customer_name;
  const addr = order.shipping_address;
  if (addr && typeof addr === "object") return addr.fullName || addr.name || "לקוח";
  return "לקוח";
};

const getPhone = (order: LabelOrder): string => {
  const addr = order.shipping_address;
  if (addr && typeof addr === "object") return addr.phone || "";
  return "";
};

// ─── Logistics Lite Label (10×15cm) ─────────────────────────
const LiteLabel = ({ order }: { order: LabelOrder }) => (
  <div style={{
    width: "100mm", height: "150mm",
    border: "2px solid #222", borderRadius: "8px",
    padding: "6mm", marginBottom: "6mm",
    display: "flex", flexDirection: "column",
    justifyContent: "space-between", background: "#fff",
    pageBreakAfter: "always", fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
    color: "#1a1a1a", position: "relative", overflow: "hidden",
  }}>
    {/* Header */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #222", paddingBottom: "4mm", marginBottom: "4mm" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <span style={{ fontSize: "14px" }}>🐾</span>
        <span style={{ fontSize: "16px", fontWeight: 800 }}>
          Pet<span style={{ color: "#6366f1" }}>ID</span>
        </span>
      </div>
      <div style={{ textAlign: "left" }}>
        <div style={{ fontSize: "13px", fontWeight: 800, fontFamily: "monospace" }}>#{order.order_number}</div>
        <div style={{ fontSize: "9px", color: "#6b7280" }}>{new Date(order.order_date).toLocaleDateString("he-IL")}</div>
      </div>
    </div>

    {/* Recipient */}
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: "8px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "2mm" }}>נמען</div>
      <div style={{ fontSize: "16px", fontWeight: 800, marginBottom: "2mm" }}>{getFullName(order)}</div>
      <div style={{ fontSize: "13px", lineHeight: 1.7, fontWeight: 500, marginBottom: "2mm" }}>{formatAddress(order.shipping_address)}</div>
      {getPhone(order) && (
        <div style={{ fontSize: "13px", fontWeight: 600, fontFamily: "monospace", marginBottom: "2mm" }}>📞 {getPhone(order)}</div>
      )}
      {order.pet_name && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "2mm",
          background: "#eff6ff", border: "1px solid #93c5fd",
          borderRadius: "4px", padding: "1.5mm 3mm",
          fontSize: "10px", fontWeight: 700, color: "#1d4ed8", marginTop: "2mm"
        }}>
          🐾 {order.pet_name}
        </div>
      )}
    </div>

    {/* Barcode-style order ref + QR */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "2px dashed #d1d5db", paddingTop: "4mm", marginTop: "3mm" }}>
      <div>
        <div style={{ fontSize: "8px", color: "#9ca3af", marginBottom: "1mm" }}>קוד משלוח</div>
        <div style={{ fontSize: "20px", fontWeight: 900, fontFamily: "monospace", letterSpacing: "2px" }}>
          {order.order_number}
        </div>
      </div>
      <QRCodeSVG
        value={`${APP_URL}/order/${order.order_number}`}
        size={40}
        level="L"
        bgColor="#ffffff"
        fgColor="#1a1a1a"
      />
    </div>
  </div>
);

// ─── Premium A5 Experience Label ─────────────────────────────
const PremiumLabel = ({ order }: { order: LabelOrder }) => (
  <div style={{
    width: "148mm", height: "210mm",
    border: "2.5px solid #1a1a1a", borderRadius: "14px",
    padding: "10mm", marginBottom: "8mm",
    display: "flex", flexDirection: "column",
    justifyContent: "space-between", background: "#fff",
    pageBreakAfter: "always", fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
    color: "#1a1a1a", position: "relative", overflow: "hidden",
  }}>
    {/* Gold accent line */}
    <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: "3px", background: "linear-gradient(90deg, transparent, #d4a845, transparent)", borderRadius: "0 0 4px 4px" }} />

    {/* Header */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #e5e5e5", paddingBottom: "5mm", marginBottom: "4mm" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2mm" }}>
          <span style={{ fontSize: "16px" }}>🐾</span>
          <span style={{ fontSize: "20px", fontWeight: 800 }}>
            Pet<span style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ID</span>
          </span>
          <span style={{ fontSize: "9px", color: "#d4a845", fontWeight: 700, marginRight: "4px" }}>PREMIUM</span>
        </div>
        <div style={{ fontSize: "9px", color: "#6b7280" }}>{new Date(order.order_date).toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" })}</div>
      </div>
      <div style={{ textAlign: "left" }}>
        <div style={{ fontSize: "14px", fontWeight: 800, fontFamily: "monospace" }}>#{order.order_number}</div>
      </div>
    </div>

    {/* Personal pet message */}
    {order.pet_name && (
      <div style={{
        background: "linear-gradient(135deg, #fef3c7, #fffbeb)",
        border: "1.5px solid #fbbf24",
        borderRadius: "10px", padding: "4mm 5mm",
        marginBottom: "4mm", textAlign: "center",
      }}>
        <div style={{ fontSize: "14px", fontWeight: 800, color: "#92400e" }}>
          🎁 משלוח מיוחד עבור {order.pet_name}!
        </div>
        <div style={{ fontSize: "9px", color: "#b45309", marginTop: "1mm" }}>
          כל פריט נבחר בקפידה עבור חיית המחמד שלך
        </div>
      </div>
    )}

    {/* Recipient */}
    <div style={{ marginBottom: "4mm" }}>
      <div style={{ fontSize: "8px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "2mm" }}>פרטי משלוח</div>
      <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "1mm" }}>{getFullName(order)}</div>
      <div style={{ fontSize: "11px", lineHeight: 1.5, color: "#374151" }}>{formatAddress(order.shipping_address)}</div>
      {getPhone(order) && <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "1mm" }}>📞 {getPhone(order)}</div>}
    </div>

    {/* Detailed Product List */}
    <div style={{ flex: 1, marginBottom: "4mm" }}>
      <div style={{ fontSize: "8px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "2mm" }}>פירוט מוצרים</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
        <thead>
          <tr style={{ background: "#f9fafb" }}>
            <th style={{ textAlign: "right", padding: "2.5mm 2mm", borderBottom: "1.5px solid #d1d5db", fontWeight: 700, color: "#374151", fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>#</th>
            <th style={{ textAlign: "right", padding: "2.5mm 2mm", borderBottom: "1.5px solid #d1d5db", fontWeight: 700, color: "#374151", fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>מוצר</th>
            <th style={{ textAlign: "center", padding: "2.5mm 2mm", borderBottom: "1.5px solid #d1d5db", fontWeight: 700, color: "#374151", fontSize: "8px" }}>כמות</th>
            <th style={{ textAlign: "left", padding: "2.5mm 2mm", borderBottom: "1.5px solid #d1d5db", fontWeight: 700, color: "#374151", fontSize: "8px" }}>מחיר</th>
            <th style={{ textAlign: "left", padding: "2.5mm 2mm", borderBottom: "1.5px solid #d1d5db", fontWeight: 700, color: "#374151", fontSize: "8px" }}>סה״כ</th>
          </tr>
        </thead>
        <tbody>
          {(order.order_items || []).map((item, idx) => (
            <tr key={idx}>
              <td style={{ padding: "2mm", borderBottom: "1px solid #f3f4f6", fontSize: "9px", color: "#9ca3af" }}>{idx + 1}</td>
              <td style={{ padding: "2mm", borderBottom: "1px solid #f3f4f6", maxWidth: "60mm" }}>{item.product_name}</td>
              <td style={{ padding: "2mm", borderBottom: "1px solid #f3f4f6", textAlign: "center" }}>×{item.quantity}</td>
              <td style={{ padding: "2mm", borderBottom: "1px solid #f3f4f6", textAlign: "left" }}>₪{item.price}</td>
              <td style={{ padding: "2mm", borderBottom: "1px solid #f3f4f6", textAlign: "left", fontWeight: 700 }}>₪{(item.price * item.quantity).toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} style={{ padding: "3mm 2mm", textAlign: "left", fontWeight: 800, fontSize: "12px", borderTop: "2px solid #1a1a1a" }}>סה״כ</td>
            <td style={{ padding: "3mm 2mm", textAlign: "left", fontWeight: 900, fontSize: "14px", borderTop: "2px solid #1a1a1a" }}>₪{order.total?.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    {/* Footer: QR + NRC Badge */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "2px solid #e5e5e5", paddingTop: "4mm" }}>
      {/* Large QR to pet health dashboard */}
      <div style={{ display: "flex", alignItems: "center", gap: "4mm" }}>
        <QRCodeSVG
          value={`${APP_URL}/pet/${order.user_id}`}
          size={72}
          level="H"
          bgColor="#ffffff"
          fgColor="#1a1a1a"
        />
        <div style={{ maxWidth: "55mm" }}>
          <div style={{ fontSize: "9px", fontWeight: 700, color: "#1a1a1a", marginBottom: "1mm" }}>דשבורד בריאות חי</div>
          <div style={{ fontSize: "7px", color: "#9ca3af", lineHeight: 1.4 }}>
            סרוק לצפייה ברשומות הרפואיות, לוח חיסונים ותוכנית תזונה מותאמת אישית
          </div>
        </div>
      </div>

      {/* Dr. NRC Scientific Seal */}
      <div style={{
        display: "flex", alignItems: "center", gap: "3mm",
        background: "linear-gradient(135deg, #f0fdf4, #ecfdf5)",
        border: "2px solid #86efac",
        borderRadius: "10px", padding: "3mm 5mm",
      }}>
        <div style={{ fontSize: "24px" }}>🔬</div>
        <div>
          <div style={{ fontSize: "10px", fontWeight: 800, color: "#166534" }}>Dr. NRC Certified</div>
          <div style={{ fontSize: "7px", color: "#22c55e", fontWeight: 600 }}>Scientific Seal of Approval</div>
          <div style={{ fontSize: "6px", color: "#86efac", marginTop: "0.5mm" }}>NRC 2006 · AAFCO 2026</div>
        </div>
      </div>
    </div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────
export const OrderLabelGenerator = ({ orders, open, onClose, initialFormat = "lite" }: OrderLabelGeneratorProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [format, setFormat] = useState<LabelFormat>(initialFormat);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const pageSize = format === "lite" ? "100mm 150mm" : "A5 portrait";
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8" />
        <title>PetID — תוויות ${format === "lite" ? "Logistics Lite" : "Premium A5"}</title>
        <style>
          @page { size: ${pageSize}; margin: ${format === "lite" ? "2mm" : "0"}; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #1a1a1a; background: #fff; }
          @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  const formatLabel = format === "lite" ? "Logistics Lite (10×15cm)" : "Premium A5 Experience";

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            תוויות משלוח — {orders.length} הזמנות
          </DialogTitle>
        </DialogHeader>

        {/* Format Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
              format === "lite" ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"
            )} onClick={() => setFormat("lite")}>
              <Package className="w-3.5 h-3.5" />
              Logistics Lite
            </div>
            <Switch
              checked={format === "premium"}
              onCheckedChange={(checked) => setFormat(checked ? "premium" : "lite")}
            />
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
              format === "premium" ? "bg-amber-500/10 text-amber-600 border border-amber-500/30" : "text-muted-foreground hover:text-foreground"
            )} onClick={() => setFormat("premium")}>
              <Sparkles className="w-3.5 h-3.5" />
              Premium A5
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {formatLabel}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground">
          {format === "lite"
            ? "תווית משלוח קומפקטית (10×15 ס״מ) — כתובת, ברקוד, QR. מתאימה לשליחים."
            : "תווית Premium A5 — רשימת מוצרים, הודעה אישית, חותמת Dr. NRC, QR לדשבורד בריאות."
          }
        </p>

        <div className="flex gap-2">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            הדפס {orders.length} תוויות ({format === "lite" ? "10×15" : "A5"})
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 ml-1" />
            סגור
          </Button>
        </div>

        {/* Preview */}
        <div className="border rounded-2xl bg-muted/20 p-4 overflow-auto max-h-[55vh]">
          <div ref={printRef} style={{ transform: format === "lite" ? "scale(0.7)" : "scale(0.55)", transformOrigin: "top right" }}>
            {orders.map((order) => (
              format === "lite"
                ? <LiteLabel key={order.id} order={order} />
                : <PremiumLabel key={order.id} order={order} />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderLabelGenerator;
