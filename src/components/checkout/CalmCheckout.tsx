/**
 * Calm Checkout - צ'קאאוט רגוע
 * 2 צעדים בלבד, שקיפות מלאה, ללא לחץ
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Package, CreditCard, Shield, Bell, Heart, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CHECKOUT, SUCCESS } from "@/lib/brandVoice";

interface CalmCheckoutProps {
  step: "shipping" | "payment";
  onComplete: () => void;
  subtotal: number;
  shipping: number;
  total: number;
}

export const CalmCheckoutHeader = ({ 
  step 
}: { 
  step: "shipping" | "payment" 
}) => {
  return (
    <div className="mb-6" dir="rtl">
      {/* Step indicator - simple */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === "shipping" ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
          }`}>
            {step === "payment" ? <Check className="w-4 h-4" /> : "1"}
          </div>
          <span className={`text-sm ${step === "shipping" ? "font-medium" : "text-muted-foreground"}`}>
            משלוח
          </span>
        </div>
        
        <div className="w-12 h-px bg-border" />
        
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === "payment" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            2
          </div>
          <span className={`text-sm ${step === "payment" ? "font-medium" : "text-muted-foreground"}`}>
            תשלום
          </span>
        </div>
      </div>

      {/* Reassurance message */}
      <p className="text-center text-sm text-muted-foreground">
        {CHECKOUT.twoStepsOnly} • {CHECKOUT.transparentPricing}
      </p>
    </div>
  );
};

export const RecurringOrderOption = ({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) => {
  return (
    <Card className="p-4 border-dashed border-primary/30 bg-primary/5" dir="rtl">
      <div className="flex items-start gap-3">
        <Checkbox
          id="recurring"
          checked={checked}
          onCheckedChange={onCheckedChange}
          className="mt-1"
        />
        <div className="flex-1">
          <Label htmlFor="recurring" className="font-medium cursor-pointer">
            שמרו להזמנה קבועה
          </Label>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {CHECKOUT.saveForRecurring}
          </p>
          
          {/* Trust indicators */}
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Bell className="w-3 h-3 text-primary" />
              <span>{CHECKOUT.reminderBeforeCharge}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Shield className="w-3 h-3 text-primary" />
              <span>{CHECKOUT.noAutoCharge}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const OrderSummaryCalm = ({
  items,
  subtotal,
  shipping,
  discount = 0,
  total,
}: {
  items: Array<{ name: string; quantity: number; price: number; image?: string }>;
  subtotal: number;
  shipping: number;
  discount?: number;
  total: number;
}) => {
  return (
    <Card className="p-4" dir="rtl">
      <h3 className="font-medium text-foreground mb-4">סיכום הזמנה</h3>
      
      {/* Items */}
      <div className="space-y-3 mb-4">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            {item.image && (
              <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">כמות: {item.quantity}</p>
            </div>
            <span className="text-sm font-medium">₪{item.price}</span>
          </div>
        ))}
      </div>

      {/* Pricing - Transparent */}
      <div className="border-t border-border pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">סכום ביניים</span>
          <span>₪{subtotal.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">משלוח</span>
          <span>{shipping === 0 ? "חינם 🎁" : `₪${shipping.toFixed(2)}`}</span>
        </div>
        
        {discount > 0 && (
          <div className="flex justify-between text-sm text-success">
            <span>הנחה</span>
            <span>-₪{discount.toFixed(2)}</span>
          </div>
        )}
        
        <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
          <span>סה״כ לתשלום</span>
          <span className="text-primary">₪{total.toFixed(2)}</span>
        </div>
      </div>
    </Card>
  );
};

export const ThankYouMessage = ({ petName }: { petName?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-8"
      dir="rtl"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="w-20 h-20 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center"
      >
        <Heart className="w-10 h-10 text-success" />
      </motion.div>
      
      <h2 className="text-xl font-bold text-foreground mb-3">
        תודה שבחרתם לדאוג לחבר שלכם איתנו 💛
      </h2>
      
      <p className="text-muted-foreground max-w-sm mx-auto">
        אנחנו כאן אם צריך כל שאלה או התאמה בהמשך.
      </p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"
      >
        <Package className="w-4 h-4" />
        <span>ההזמנה בדרך אליכם! 📦</span>
      </motion.div>
    </motion.div>
  );
};

// Delay option for checkout
export const DelayOrderOption = ({
  onDelay,
}: {
  onDelay: (days: number) => void;
}) => {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div className="mt-4" dir="rtl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowOptions(!showOptions)}
        className="text-muted-foreground text-xs"
      >
        <Clock className="w-3 h-3 mr-1" />
        לא עכשיו? אפשר לדחות
      </Button>
      
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 flex gap-2"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelay(3)}
              className="text-xs"
            >
              עוד 3 ימים
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelay(7)}
              className="text-xs"
            >
              עוד שבוע
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelay(14)}
              className="text-xs"
            >
              עוד שבועיים
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
