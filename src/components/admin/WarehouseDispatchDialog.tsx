import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getAdminDispatchConfig } from "@/lib/mipoApi";
import {
  buildWhatsAppLink,
  formatWarehouseDispatchMessage,
  normalizeWhatsAppPhone,
  type DispatchOrder,
} from "@/lib/warehouseDispatch";

// A per-browser convenience only: the number of record comes from the server.
const PHONE_OVERRIDE_KEY = "mipo-warehouse-whatsapp";

const readOverride = () => {
  try {
    return localStorage.getItem(PHONE_OVERRIDE_KEY) || "";
  } catch {
    return "";
  }
};

const writeOverride = (value: string) => {
  try {
    if (value.trim()) localStorage.setItem(PHONE_OVERRIDE_KEY, value.trim());
    else localStorage.removeItem(PHONE_OVERRIDE_KEY);
  } catch {
    // A browser that refuses storage still sends fine; only the memory is lost.
  }
};

interface WarehouseDispatchDialogProps {
  orders: DispatchOrder[];
  open: boolean;
  onClose: () => void;
  onPrint?: () => void;
}

export const WarehouseDispatchDialog = ({
  orders,
  open,
  onClose,
  onPrint,
}: WarehouseDispatchDialogProps) => {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);

  const config = useQuery({
    queryKey: ["admin-dispatch-config"],
    queryFn: getAdminDispatchConfig,
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  // The admin's own override wins, then the configured number. Once the field
  // has been edited in this dialog it is left alone.
  useEffect(() => {
    if (!open || touched) return;
    setPhone(readOverride() || config.data?.warehouse_whatsapp || "");
  }, [config.data?.warehouse_whatsapp, open, touched]);

  useEffect(() => {
    if (!open) setTouched(false);
  }, [open]);

  const message = useMemo(
    () => orders.map(formatWarehouseDispatchMessage).join("\n\n———\n\n"),
    [orders],
  );

  const normalized = normalizeWhatsAppPhone(phone);
  const phoneLooksWrong = phone.trim().length > 0 && normalized === null;

  const handleSend = () => {
    writeOverride(phone);
    // Opened in a new tab so the admin panel, and the order they are working
    // through, is still there when they come back from WhatsApp.
    window.open(buildWhatsAppLink(phone, message), "_blank", "noopener,noreferrer");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast({ title: "הטקסט הועתק" });
    } catch {
      toast({
        title: "ההעתקה נכשלה",
        description: "יש לסמן את הטקסט בתצוגה המקדימה ולהעתיק ידנית",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            שליחת {orders.length > 1 ? `${orders.length} משלוחים` : "משלוח"} למחסן
          </DialogTitle>
          <DialogDescription>
            וואטסאפ פותח שיחה עם הטקסט מוכן לשליחה. את התווית המודפסת עצמה יש לצרף
            ידנית — אתר אינו יכול לצרף קובץ לשיחה של אתר אחר.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="warehouse-phone">מספר המחסן</Label>
          <Input
            id="warehouse-phone"
            dir="ltr"
            className="text-left"
            placeholder="050-000-0000"
            value={phone}
            onChange={(event) => {
              setTouched(true);
              setPhone(event.target.value);
            }}
          />
          {phoneLooksWrong ? (
            <p className="text-xs text-destructive" role="alert">
              המספר אינו תקין. ללא מספר תקין וואטסאפ ייפתח עם בחירת איש קשר.
            </p>
          ) : normalized ? (
            <p className="text-xs text-muted-foreground">יישלח אל +{normalized}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              לא הוגדר מספר מחסן — וואטסאפ ייפתח עם בחירת איש קשר.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>תצוגה מקדימה</Label>
          <pre
            className="max-h-64 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs whitespace-pre-wrap"
            dir="rtl"
          >
            {message}
          </pre>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleSend} className="gap-2">
            <MessageCircle className="w-4 h-4" />
            פתיחת וואטסאפ
          </Button>
          <Button type="button" variant="outline" onClick={handleCopy} className="gap-2">
            <Copy className="w-4 h-4" />
            העתקת הטקסט
          </Button>
          {onPrint && (
            <Button type="button" variant="outline" onClick={onPrint} className="gap-2">
              <Printer className="w-4 h-4" />
              הדפסת התווית לצירוף
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>
            סגור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WarehouseDispatchDialog;
