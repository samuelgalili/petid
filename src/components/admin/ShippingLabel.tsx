/**
 * The label the warehouse picks and ships from.
 *
 * The owner asked for it in the same breath as the manual order: place the
 * order and it produces a shipping label with all the customer's details.
 *
 * WHAT A LABEL HAS TO ANSWER, and why each of these is on it:
 *
 *   * WHERE IT GOES, in the order a courier reads it - name, street and
 *     number, floor and apartment, city, postcode, phone. A phone number is
 *     not decoration on a delivery: it is what happens instead of a failed
 *     attempt.
 *   * WHAT GOES IN IT. The picker needs the lines and the counts, or the label
 *     is a second document they have to find.
 *   * WHETHER MONEY IS STILL OWED. This is the one that costs real money if it
 *     is wrong: a cash-on-delivery parcel handed over without collecting is
 *     unpaid stock out of the door. It is stated as an amount, in the largest
 *     type on the label, and an already-paid order says so just as loudly so
 *     nobody asks a paid customer for money at their door.
 *   * WHAT THE CUSTOMER ASKED FOR. The delivery note, verbatim.
 *
 * It prints through the browser rather than generating a PDF: a warehouse
 * prints from a screen, a PDF pipeline is a dependency and a font problem, and
 * @media print with a fixed width does the same job.
 */

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { MipoOrder } from "@/lib/mipoApi";

export type LabelLine = { name: string; quantity: number };

export type LabelAddress = {
  fullName: string;
  phone: string;
  address: string;
  building: string;
  entranceType: "house" | "building";
  floor: string;
  apartment: string;
  lobbyCode: string;
  city: string;
  zipCode: string;
  notes: string;
  leaveAtDoor: boolean;
};

const line2 = (address: LabelAddress) => {
  const parts = [address.address, address.building].filter(Boolean).join(" ");
  const inside = [
    address.floor && `קומה ${address.floor}`,
    address.apartment && `דירה ${address.apartment}`,
  ].filter(Boolean).join(", ");
  return [parts, inside].filter(Boolean).join(" · ");
};

export const ShippingLabel = ({
  open,
  onOpenChange,
  order,
  address,
  lines,
  amountDue,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: MipoOrder;
  address: LabelAddress;
  lines: LabelLine[];
  /** What the courier must still collect. 0 when the order is already paid. */
  amountDue: number;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    {/* Above the customer card's Sheet, for the same reason the order dialog
        is: a Sheet overlay is z-[10000] and a Dialog is z-50, so anything
        opened from inside the card is otherwise untappable on a phone. */}
    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto z-[10002]" dir="rtl">
      <DialogHeader className="text-right print:hidden">
        <DialogTitle>תווית משלוח · {order.order_number}</DialogTitle>
      </DialogHeader>

      <div id="mipo-shipping-label" className="space-y-3 rounded-lg border-2 border-black p-3 text-black">
        <div className="flex items-baseline justify-between border-b-2 border-black pb-2">
          <span className="text-lg font-black">MIPO</span>
          <span className="text-xs font-bold tabular-nums">{order.order_number}</span>
        </div>

        <div className="space-y-0.5">
          <p className="text-base font-bold leading-tight">{address.fullName}</p>
          <p className="text-sm leading-tight">{line2(address)}</p>
          <p className="text-sm leading-tight">
            {address.city}{address.zipCode ? ` ${address.zipCode}` : ""}
          </p>
          <p className="text-sm font-semibold tabular-nums" dir="ltr">{address.phone}</p>
          {address.entranceType === "building" && address.lobbyCode && (
            <p className="text-xs">קוד כניסה: <span className="font-bold">{address.lobbyCode}</span></p>
          )}
        </div>

        {/* THE MOST EXPENSIVE LINE ON THE LABEL. A parcel handed over without
            collecting is unpaid stock out of the door, and asking a customer
            who already paid for money at their door is its own kind of damage -
            so both states are stated, and loudly. */}
        <div className={`border-2 border-black p-2 text-center ${amountDue > 0 ? "bg-black text-white" : ""}`}>
          {amountDue > 0 ? (
            <>
              <p className="text-[11px] font-bold">לגבות מהלקוח</p>
              <p className="text-2xl font-black tabular-nums">₪{amountDue}</p>
            </>
          ) : (
            <p className="text-base font-black">שולם — לא לגבות</p>
          )}
        </div>

        <div className="space-y-0.5 border-t-2 border-black pt-2">
          <p className="text-[11px] font-bold">תכולה</p>
          {lines.map((line) => (
            <p key={line.name} className="flex justify-between gap-2 text-xs leading-tight">
              <span className="flex-1">{line.name}</span>
              <span className="font-bold tabular-nums">×{line.quantity}</span>
            </p>
          ))}
        </div>

        {address.notes && (
          <div className="border-t-2 border-black pt-2">
            <p className="text-[11px] font-bold">הערה למשלוח</p>
            <p className="text-xs leading-tight">{address.notes}</p>
          </div>
        )}

        {address.leaveAtDoor && (
          <p className="border-t-2 border-black pt-2 text-[11px] font-bold">
            הלקוח אישר השארה ליד הדלת אם אין מענה
          </p>
        )}
      </div>

      <DialogFooter className="gap-2 print:hidden sm:justify-start">
        <Button onClick={() => window.print()} className="gap-1.5">
          <Printer className="h-3.5 w-3.5" />
          הדפסה
        </Button>
        <Button variant="outline" onClick={() => onOpenChange(false)}>סגירה</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
