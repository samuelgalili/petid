import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

interface OrderLabelGeneratorProps {
  orders: LabelOrder[];
  open: boolean;
  onClose: () => void;
}

const APP_URL = "https://petid.lovable.app";

export const OrderLabelGenerator = ({ orders, open, onClose }: OrderLabelGeneratorProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8" />
        <title>PetID — תוויות משלוח</title>
        <style>
          @page { size: A5 landscape; margin: 8mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #1a1a1a; background: #fff; }
          .label {
            width: 210mm; height: 148mm;
            border: 2px solid #222;
            border-radius: 12px;
            padding: 10mm;
            page-break-after: always;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            overflow: hidden;
          }
          .label:last-child { page-break-after: auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e5e5; padding-bottom: 6mm; margin-bottom: 5mm; }
          .logo-area { display: flex; align-items: center; gap: 8px; }
          .logo-text { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
          .logo-id { background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .paw { font-size: 18px; }
          .order-num { font-size: 14px; font-weight: 700; color: #374151; text-align: left; }
          .order-date { font-size: 10px; color: #6b7280; text-align: left; }
          .body { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; flex: 1; }
          .section-title { font-size: 9px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3mm; }
          .address-block { font-size: 13px; line-height: 1.6; font-weight: 500; }
          .address-name { font-size: 15px; font-weight: 700; margin-bottom: 2mm; }
          .items-table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .items-table th { text-align: right; padding: 2mm 1mm; border-bottom: 1.5px solid #d1d5db; font-weight: 700; color: #374151; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
          .items-table td { padding: 2mm 1mm; border-bottom: 1px solid #f3f4f6; }
          .items-table td:last-child { text-align: left; font-weight: 600; }
          .footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 2px solid #e5e5e5; padding-top: 5mm; margin-top: 4mm; }
          .qr-area { display: flex; align-items: center; gap: 4mm; }
          .qr-label { font-size: 8px; color: #9ca3af; max-width: 70px; line-height: 1.3; }
          .nrc-badge { display: flex; align-items: center; gap: 3mm; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 3mm 4mm; }
          .nrc-icon { font-size: 16px; }
          .nrc-text { font-size: 9px; font-weight: 700; color: #166534; }
          .nrc-sub { font-size: 7px; color: #4ade80; }
          .total-badge { text-align: left; }
          .total-label { font-size: 9px; color: #6b7280; }
          .total-value { font-size: 18px; font-weight: 800; color: #1a1a1a; }
          .pet-badge { display: inline-flex; align-items: center; gap: 2mm; background: #eff6ff; border: 1px solid #93c5fd; border-radius: 6px; padding: 1.5mm 3mm; font-size: 10px; font-weight: 600; color: #1d4ed8; margin-top: 2mm; }
          @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 300);
  };

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

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            תוויות משלוח — {orders.length} הזמנות
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            הדפס {orders.length} תוויות (A5)
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 ml-1" />
            סגור
          </Button>
        </div>

        {/* Preview (scaled down) */}
        <div className="border rounded-2xl bg-muted/20 p-4 overflow-auto max-h-[60vh]">
          <div ref={printRef}>
            {orders.map((order) => (
              <div key={order.id} style={{
                width: "210mm", height: "148mm",
                border: "2px solid #222", borderRadius: "12px",
                padding: "10mm", marginBottom: "8mm",
                display: "flex", flexDirection: "column",
                justifyContent: "space-between", position: "relative",
                overflow: "hidden", background: "#fff",
                pageBreakAfter: "always",
              }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #e5e5e5", paddingBottom: "6mm", marginBottom: "5mm" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "18px" }}>🐾</span>
                    <span style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px" }}>
                      Pet<span style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ID</span>
                    </span>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#374151" }}>#{order.order_number}</div>
                    <div style={{ fontSize: "10px", color: "#6b7280" }}>{new Date(order.order_date).toLocaleDateString("he-IL")}</div>
                  </div>
                </div>

                {/* Body — 2 columns */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6mm", flex: 1 }}>
                  {/* Left: Address */}
                  <div>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "3mm" }}>
                      כתובת למשלוח
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "2mm" }}>
                      {getFullName(order)}
                    </div>
                    <div style={{ fontSize: "13px", lineHeight: 1.6, fontWeight: 500 }}>
                      {formatAddress(order.shipping_address)}
                    </div>
                    {getPhone(order) && (
                      <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2mm" }}>
                        📞 {getPhone(order)}
                      </div>
                    )}
                    {order.pet_name && (
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: "2mm",
                        background: "#eff6ff", border: "1px solid #93c5fd",
                        borderRadius: "6px", padding: "1.5mm 3mm",
                        fontSize: "10px", fontWeight: 600, color: "#1d4ed8", marginTop: "3mm"
                      }}>
                        🐾 {order.pet_name}
                      </div>
                    )}
                  </div>

                  {/* Right: Items */}
                  <div>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "3mm" }}>
                      פריטים
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "right", padding: "2mm 1mm", borderBottom: "1.5px solid #d1d5db", fontWeight: 700, color: "#374151", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.5px" }}>מוצר</th>
                          <th style={{ textAlign: "center", padding: "2mm 1mm", borderBottom: "1.5px solid #d1d5db", fontWeight: 700, color: "#374151", fontSize: "9px" }}>כמות</th>
                          <th style={{ textAlign: "left", padding: "2mm 1mm", borderBottom: "1.5px solid #d1d5db", fontWeight: 700, color: "#374151", fontSize: "9px" }}>מחיר</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(order.order_items || []).slice(0, 6).map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: "2mm 1mm", borderBottom: "1px solid #f3f4f6", fontSize: "11px", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.product_name}
                            </td>
                            <td style={{ padding: "2mm 1mm", borderBottom: "1px solid #f3f4f6", textAlign: "center" }}>
                              ×{item.quantity}
                            </td>
                            <td style={{ padding: "2mm 1mm", borderBottom: "1px solid #f3f4f6", textAlign: "left", fontWeight: 600 }}>
                              ₪{item.price}
                            </td>
                          </tr>
                        ))}
                        {(order.order_items?.length || 0) > 6 && (
                          <tr>
                            <td colSpan={3} style={{ padding: "1mm", fontSize: "9px", color: "#9ca3af", textAlign: "center" }}>
                              +{(order.order_items?.length || 0) - 6} פריטים נוספים
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "2px solid #e5e5e5", paddingTop: "5mm", marginTop: "4mm" }}>
                  {/* QR Code */}
                  <div style={{ display: "flex", alignItems: "center", gap: "4mm" }}>
                    <QRCodeSVG
                      value={`${APP_URL}/pet/${order.user_id}`}
                      size={52}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#1a1a1a"
                    />
                    <div style={{ fontSize: "8px", color: "#9ca3af", maxWidth: "70px", lineHeight: 1.3 }}>
                      סרוק לפרופיל<br />חיית המחמד
                    </div>
                  </div>

                  {/* NRC Badge */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: "3mm",
                    background: "#f0fdf4", border: "1.5px solid #86efac",
                    borderRadius: "8px", padding: "3mm 4mm"
                  }}>
                    <span style={{ fontSize: "16px" }}>🔬</span>
                    <div>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#166534" }}>Dr. NRC Certified</div>
                      <div style={{ fontSize: "7px", color: "#4ade80" }}>NRC 2006 Standard</div>
                    </div>
                  </div>

                  {/* Total */}
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: "9px", color: "#6b7280" }}>סה״כ</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#1a1a1a" }}>₪{order.total?.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderLabelGenerator;
