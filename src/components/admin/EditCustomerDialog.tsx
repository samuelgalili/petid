/**
 * Correcting a customer's details from their card.
 *
 * Asked for straight after a manual order could not be placed because the
 * customer had no email on file. That is the right reading of it: a detail
 * that is wrong is wrong everywhere it is used, and typing round it inside one
 * order fixes it for one order.
 *
 * THE EMAIL IS NOT ALWAYS EDITABLE, and the screen says so rather than
 * offering a box that fails on submit. For a guest it is a way to reach them.
 * For somebody with an account it is the address they SIGN IN with, and an
 * admin who could repoint it could then use password recovery - an account
 * takeover whose audit trail reads like somebody fixing a typo. The server
 * refuses it either way; this is the half that explains why.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updateAdminCustomer, type MipoCustomer } from "@/lib/mipoApi";
import { createClientId } from "@/lib/randomId";

export const EditCustomerDialog = ({
  open,
  onOpenChange,
  customer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: MipoCustomer;
  onSaved: () => void;
}) => {
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // One key per submission, minted again when the form changes - the same rule
  // as the other two dialogs.
  const idempotencyKey = useRef(createClientId("customer-edit"));
  const resetKey = useCallback(() => { idempotencyKey.current = createClientId("customer-edit"); }, []);

  useEffect(() => {
    if (!open) return;
    setFullName(customer.full_name || "");
    setEmail(customer.email || "");
    setPhone(customer.phone || "");
    resetKey();
  }, [open, customer, resetKey]);

  const emailIsLogin = Boolean(customer.user_id);
  const nameTooShort = fullName.trim().length < 2;
  const emailUnusable = !emailIsLogin && email.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const save = useCallback(async () => {
    if (nameTooShort || emailUnusable || saving) return;
    setSaving(true);
    try {
      await updateAdminCustomer({
        identity_id: customer.identity_id,
        full_name: fullName.trim(),
        phone: phone.trim(),
        // Sent only when it can be changed AND was: the server treats a
        // present key as an edit, so sending an unchanged email on an account
        // would be asking to change a login and be refused.
        ...(!emailIsLogin && email.trim() && email.trim() !== (customer.email || "")
          ? { email: email.trim() }
          : {}),
      }, idempotencyKey.current);

      toast({ title: "הפרטים עודכנו" });
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "עדכון הפרטים נכשל",
        description: error instanceof Error ? error.message : "נסה שוב",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [customer, email, emailIsLogin, emailUnusable, fullName, nameTooShort, onOpenChange, onSaved, phone, saving, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* z above the card's Sheet, like the other dialogs opened from here. */}
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto z-[10002]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>עריכת פרטי לקוח</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="edit-name" className="text-xs">שם מלא</Label>
            <Input id="edit-name" value={fullName} className="h-9 text-xs"
              onChange={(event) => { setFullName(event.target.value); resetKey(); }} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-phone" className="text-xs">טלפון</Label>
            <Input id="edit-phone" value={phone} dir="ltr" className="h-9 text-xs"
              onChange={(event) => { setPhone(event.target.value); resetKey(); }} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-email" className="text-xs">אימייל</Label>
            <Input id="edit-email" value={email} dir="ltr" disabled={emailIsLogin} className="h-9 text-xs"
              onChange={(event) => { setEmail(event.target.value); resetKey(); }} />
            {emailIsLogin && (
              <p className="text-[11px] leading-4 text-muted-foreground">
                זו הכתובת שהלקוח מתחבר איתה, ולכן אי אפשר לשנות אותה מכאן. שינוי
                כתובת התחברות נעשה בתהליך שחזור חשבון, שבו הלקוח עצמו מאשר.
              </p>
            )}
          </div>

          {(nameTooShort || emailUnusable) && (
            <p className="text-[11px] text-destructive">
              {nameTooShort ? "שם חייב שתי אותיות לפחות" : "כתובת אימייל לא תקינה"}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button onClick={save} disabled={nameTooShort || emailUnusable || saving} className="gap-1.5">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            שמירה
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
