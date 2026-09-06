import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Printer, X, Package, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatShippingAddressForLabel, type ShippingAddressFields } from "@/lib/shippingAddress";
import { renderCode128Svg } from "@/lib/barcode";

interface OrderItem {
  product_name: string;
  quantity: number;
  price: number;
  product_id?: string | null;
  variant?: string | null;
  size?: string | null;
  /** Snapshotted onto the order line when the order was placed. */
  sku?: string | null;
  weight?: string | null;
  weight_unit?: string | null;
}

interface LabelOrder {
  id: string;
  order_number: string;
  order_date: string;
  customer_name: string | null;
  pet_name: string | null;
  shipping_address: ShippingAddressFields | string | null;
  order_items?: OrderItem[];
  total: number;
  shipping: number;
  user_id?: string | null;
  special_instructions?: string | null;
}

// The business the warehouse is fulfilling on behalf of.
const BUSINESS = {
  name: "יובל דיגיטל",
  taxStatus: "עוסק פטור",
  taxId: "036574564",
  address: "יגיע כפיים 1, פתח-תקווה",
} as const;

export type LabelFormat = "lite" | "premium";

interface OrderLabelGeneratorProps {
  orders: LabelOrder[];
  open: boolean;
  onClose: () => void;
  initialFormat?: LabelFormat;
}

// ─── Shared Helpers ──────────────────────────────────────────
// Formatting lives in the shared helper, not here. This file used to read
// `addr.street`, a key the server never writes, so the street was missing from
// every label the warehouse received.
const formatAddress = formatShippingAddressForLabel;

const addressOf = (order: LabelOrder): ShippingAddressFields =>
  order.shipping_address && typeof order.shipping_address === "object" ? order.shipping_address : {};

const getFullName = (order: LabelOrder): string =>
  // `fullName` is the only name key the server has ever written into the
  // address; `customer_name` is the column on the order itself.
  order.customer_name || addressOf(order).fullName || "לקוח";

const getPhone = (order: LabelOrder): string => addressOf(order).phone || "";

const getSecondaryPhone = (order: LabelOrder): string => addressOf(order).phoneSecondary || "";

const formatItemWeight = (item: OrderItem): string => {
  const weight = String(item.weight ?? "").trim();
  if (!weight) return "—";
  const unit = String(item.weight_unit ?? "").trim();
  // A weight that already carries its unit must not have a second one appended.
  return unit && !weight.toLowerCase().includes(unit.toLowerCase()) ? `${weight} ${unit}` : weight;
};

// ─── Warehouse Label (10×15cm) ──────────────────────────────
// Everything the logistics centre needs to pick, pack and deliver, and nothing
// it does not: no prices anywhere on the sheet.
const labelStyles = {
  sectionTitle: {
    fontSize: "8px", fontWeight: 700, color: "#6b7280",
    letterSpacing: "1.5px", marginBottom: "1.5mm",
  },
  divider: { borderTop: "1.5px solid #d1d5db", paddingTop: "3mm", marginTop: "3mm" },
  th: {
    textAlign: "right" as const, padding: "1.5mm 1mm",
    borderBottom: "1.5px solid #9ca3af", fontWeight: 700,
    fontSize: "8px", color: "#374151", whiteSpace: "nowrap" as const,
  },
  td: {
    padding: "1.5mm 1mm", borderBottom: "1px solid #e5e7eb",
    fontSize: "10px", verticalAlign: "top" as const,
  },
};

const WarehouseLabel = ({ order }: { order: LabelOrder }) => {
  const address = addressOf(order);
  const items = order.order_items || [];
  const totalUnits = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const barcode = renderCode128Svg(order.order_number, { moduleWidth: 2, height: 44 });

  return (
    <div style={{
      width: "100mm",
      // Deliberately a minimum, not a fixed height: an order with many lines
      // must run onto a second page rather than have items clipped off the
      // bottom, which would be a picking error nobody could see.
      minHeight: "150mm",
      border: "2px solid #222", borderRadius: "8px",
      padding: "5mm", marginBottom: "6mm",
      display: "flex", flexDirection: "column",
      background: "#fff", pageBreakAfter: "always",
      fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
      color: "#1a1a1a", position: "relative",
    }}>
      {/* Sender and order reference */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #222", paddingBottom: "3mm" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "1mm" }}>
            <span style={{ fontSize: "14px" }}>🐾</span>
            <span style={{ fontSize: "15px", fontWeight: 800 }}>MIPO</span>
          </div>
          <div style={{ fontSize: "8px", color: "#4b5563", lineHeight: 1.5 }}>
            <div>{BUSINESS.name} · {BUSINESS.taxStatus} {BUSINESS.taxId}</div>
            <div>{BUSINESS.address}</div>
          </div>
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: "14px", fontWeight: 800, fontFamily: "monospace" }}>#{order.order_number}</div>
          <div style={{ fontSize: "9px", color: "#6b7280" }}>{new Date(order.order_date).toLocaleDateString("he-IL")}</div>
        </div>
      </div>

      {/* Recipient */}
      <div style={{ paddingTop: "3mm" }}>
        <div style={labelStyles.sectionTitle}>נמען</div>
        <div style={{ fontSize: "15px", fontWeight: 800, marginBottom: "1.5mm" }}>{getFullName(order)}</div>
        <div style={{ fontSize: "12px", lineHeight: 1.6, fontWeight: 500 }}>{formatAddress(order.shipping_address)}</div>
        <div style={{ fontSize: "12px", fontWeight: 600, fontFamily: "monospace", marginTop: "1.5mm" }}>
          {getPhone(order) && <span>📞 {getPhone(order)}</span>}
          {getSecondaryPhone(order) && (
            <span style={{ marginRight: "4mm" }}>נוסף: {getSecondaryPhone(order)}</span>
          )}
        </div>
      </div>

      {/* Access: a courier who cannot pass the lobby door cannot deliver. */}
      {(address.lobbyCode || address.leaveAtDoor) && (
        <div style={{ ...labelStyles.divider }}>
          {address.lobbyCode && (
            <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: address.leaveAtDoor ? "2mm" : 0 }}>
              קוד כניסה ללובי: <span style={{ fontFamily: "monospace", fontSize: "14px" }}>{address.lobbyCode}</span>
            </div>
          )}
          {address.leaveAtDoor && (
            <div style={{
              background: "#fef3c7", border: "1.5px solid #f59e0b",
              borderRadius: "4px", padding: "2mm 3mm",
              fontSize: "11px", fontWeight: 700, color: "#92400e",
            }}>
              ⚠ הלקוח אישר השארה ליד הדלת באחריותו
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <div style={{ ...labelStyles.divider, flex: 1 }}>
        <div style={labelStyles.sectionTitle}>
          פריטים — {items.length} שורות, {totalUnits} יחידות
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...labelStyles.th, width: "6mm" }}>#</th>
              <th style={{ ...labelStyles.th, width: "22mm" }}>מק״ט</th>
              <th style={labelStyles.th}>מוצר</th>
              <th style={{ ...labelStyles.th, textAlign: "center", width: "12mm" }}>כמות</th>
              <th style={{ ...labelStyles.th, width: "16mm" }}>משקל</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.product_id || item.product_name}-${index}`}>
                <td style={{ ...labelStyles.td, color: "#9ca3af" }}>{index + 1}</td>
                <td style={{ ...labelStyles.td, fontFamily: "monospace", fontSize: "9px", wordBreak: "break-all" }}>
                  {item.sku || "—"}
                </td>
                <td style={labelStyles.td}>
                  {item.product_name}
                  {(item.variant || item.size) && (
                    <div style={{ fontSize: "8px", color: "#6b7280" }}>
                      {[item.variant, item.size].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </td>
                <td style={{ ...labelStyles.td, textAlign: "center", fontWeight: 800, fontSize: "12px" }}>
                  ×{item.quantity}
                </td>
                <td style={{ ...labelStyles.td, fontSize: "9px" }}>{formatItemWeight(item)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...labelStyles.td, textAlign: "center", color: "#b91c1c", fontWeight: 700 }}>
                  אין פריטים בהזמנה — אין לשלוח
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {(order.special_instructions || address.notes) && (
        <div style={labelStyles.divider}>
          <div style={labelStyles.sectionTitle}>הערות</div>
          <div style={{ fontSize: "10px", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
            {[order.special_instructions, address.notes].filter(Boolean).join("\n")}
          </div>
        </div>
      )}

      {order.pet_name && (
        <div style={{ fontSize: "10px", color: "#1d4ed8", fontWeight: 700, marginTop: "2mm" }}>
          🐾 {order.pet_name}
        </div>
      )}

      {/* Scannable order reference */}
      <div style={{ ...labelStyles.divider, borderTop: "2px dashed #d1d5db", textAlign: "center" }}>
        {barcode
          ? <div style={{ lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: barcode }} />
          : null}
        <div style={{ fontSize: "13px", fontWeight: 900, fontFamily: "monospace", letterSpacing: "2px", marginTop: "1mm" }}>
          {order.order_number}
        </div>
      </div>
    </div>
  );
};

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
        <div style={{ fontSize: "9px", color: "#b45309", marginTop: "1mm" }}>מספר הזמנה #{order.order_number}</div>
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

    <div style={{ borderTop: "2px solid #e5e5e5", paddingTop: "4mm", textAlign: "left" }}>
      <div style={{ fontSize: "8px", color: "#9ca3af" }}>אסמכתת משלוח</div>
      <div style={{ fontSize: "16px", fontWeight: 900, fontFamily: "monospace", letterSpacing: "1px" }}>
        {order.order_number}
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
        <title>MIPO — ${format === "lite" ? "תוויות מחסן" : "תוויות Premium A5"}</title>
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

  const formatLabel = format === "lite" ? "תווית מחסן (10×15 ס״מ)" : "Premium A5 Experience";

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
              תווית מחסן
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
            ? "תווית מחסן (10×15 ס״מ): נמען, כתובת מלאה, טלפונים, מק״ט לכל פריט, כמות, משקל, הערות וברקוד. ללא מחירים."
            : "תווית A5 עם פרטי משלוח, רשימת מוצרים ואסמכתת הזמנה."
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
                ? <WarehouseLabel key={order.id} order={order} />
                : <PremiumLabel key={order.id} order={order} />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderLabelGenerator;
