import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BottomNav from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { Plus, Minus, Trash2, ShoppingBag, Tag, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { SmartCartLayers } from "@/components/shop/SmartCartLayers";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
}

const Cart = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, getSubtotal, getTotalItems } = useCart();
  const { toast } = useToast();
  
  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [petCoinDiscount, setPetCoinDiscount] = useState(0);

  const subtotal = getSubtotal();
  
  // Check if coupon is free shipping type
  const isFreeShippingCoupon = appliedCoupon?.discount_type === 'free_shipping';
  const baseShipping = subtotal >= 200 ? 0 : 25;
  const shipping = isFreeShippingCoupon ? 0 : baseShipping;
  
  // Calculate discount (only for non-free-shipping coupons)
  const discount = appliedCoupon && !isFreeShippingCoupon
    ? appliedCoupon.discount_type === 'percentage'
      ? (subtotal * appliedCoupon.discount_value) / 100
      : appliedCoupon.discount_value
    : 0;
  
  // Price already includes VAT - no need to add tax separately
  const discountedSubtotal = Math.max(0, subtotal - discount - petCoinDiscount);
  const total = discountedSubtotal + shipping;

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setIsValidatingCoupon(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "קופון לא תקין",
          description: "הקופון שהזנת לא קיים או לא פעיל",
          variant: "destructive",
        });
        return;
      }

      if (data.min_order_amount && subtotal < data.min_order_amount) {
        toast({
          title: "מינימום הזמנה",
          description: `הזמנה מינימלית לקופון זה: ₪${data.min_order_amount}`,
          variant: "destructive",
        });
        return;
      }

      if (data.max_uses && data.used_count >= data.max_uses) {
        toast({
          title: "קופון מנוצל",
          description: "הקופון הזה כבר נוצל עד תום",
          variant: "destructive",
        });
        return;
      }

      setAppliedCoupon(data);
      toast({
        title: "קופון הופעל!",
        description: data.discount_type === 'free_shipping'
          ? 'משלוח חינם!'
          : data.discount_type === 'percentage' 
            ? `הנחה של ${data.discount_value}%`
            : `הנחה של ₪${data.discount_value}`,
      });
    } catch (error) {
      console.error("Error validating coupon:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לבדוק את הקופון",
        variant: "destructive",
      });
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    toast({
      title: "קופון הוסר",
      duration: 1500,
    });
  };

  const handleRemoveItem = (id: string, name: string) => {
    removeFromCart(id);
    toast({
      title: "הוסר מהעגלה",
      description: `${name} הוסר בהצלחה`,
      duration: 2000,
    });
  };

  const handleCheckout = () => {
    // Store coupon in sessionStorage for checkout page
    if (appliedCoupon) {
      sessionStorage.setItem('appliedCoupon', JSON.stringify(appliedCoupon));
    } else {
      sessionStorage.removeItem('appliedCoupon');
    }
    
    toast({
      title: "🎉 תודה!",
      description: "מעבר לדף תשלום...",
      duration: 2000,
    });
    setTimeout(() => {
      navigate("/checkout");
    }, 1000);
  };

  if (items.length === 0) {
    return (
      <div className="h-screen bg-background overflow-hidden" dir="rtl">
        <div className="h-full overflow-y-auto pb-[70px]">
        <AppHeader title="עגלת הקניות" showBackButton={true} />

        {/* Empty Cart State */}
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-16 h-16 text-primary" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              העגלה שלך ריקה
            </h2>
            <p className="text-muted-foreground mb-8">
              הוסף מוצרים מהחנות כדי להתחיל
            </p>
            <Button
              onClick={() => navigate("/shop")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-6 rounded-2xl shadow-lg"
            >
              המשך לקניות
            </Button>
          </motion.div>
        </div>
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden" dir="rtl">
      <SEO title="עגלת קניות" description="סיימו את הרכישה שלכם - מוצרים איכותיים לחיות מחמד" url="/cart" noIndex={true} />
      <div className="h-full overflow-y-auto pb-[70px]">
      <AppHeader title="עגלת הקניות" showBackButton={true} />
      
      {/* Cart Items */}
      <div className="px-4 py-4">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="mb-4"
            >
              <Card className="overflow-hidden border-0 shadow-md bg-card">
                <div className="flex gap-4 p-4">
                  {/* Product Image */}
                  <div className="w-24 h-24 bg-muted rounded-xl flex-shrink-0 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-sm mb-1 font-jakarta line-clamp-2">
                      {item.name}
                    </h3>
                    {item.variant && (
                      <p className="text-xs text-muted-foreground mb-2 font-jakarta">
                        {item.variant}
                      </p>
                    )}
                    
                    {/* Price */}
                    <div className="text-lg font-bold text-primary mb-3 font-jakarta">
                      ₪{item.price}
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-muted rounded-full px-2 py-1">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-full bg-card shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
                        >
                          <Minus className="w-4 h-4 text-foreground" strokeWidth={1.5} />
                        </motion.button>
                        <span className="text-base font-bold text-foreground w-8 text-center font-jakarta">
                          {item.quantity}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-full bg-card shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
                        >
                          <Plus className="w-4 h-4 text-foreground" strokeWidth={1.5} />
                        </motion.button>
                      </div>

                      {/* Remove Button */}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleRemoveItem(item.id, item.name)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                      >
                        <Trash2 className="w-5 h-5" strokeWidth={1.5} />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Coupon Input */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4"
        >
          <Card className="p-4 bg-card border-0 rounded-2xl shadow-lg">
            <Label className="font-jakarta text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              קוד קופון
            </Label>
            {appliedCoupon ? (
              <div className="flex items-center justify-between p-3 bg-success/10 rounded-xl border border-success/30">
                <div>
                  <p className="font-semibold text-success font-jakarta text-sm">{appliedCoupon.code}</p>
                  <p className="text-xs text-muted-foreground font-jakarta">
                    {appliedCoupon.discount_type === 'free_shipping'
                      ? 'משלוח חינם!'
                      : appliedCoupon.discount_type === 'percentage' 
                        ? `${appliedCoupon.discount_value}% הנחה`
                        : `₪${appliedCoupon.discount_value} הנחה`}
                  </p>
                </div>
                <button onClick={removeCoupon} className="p-1 hover:bg-destructive/10 rounded-full transition-colors">
                  <X className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2 mt-2">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="הזן קוד קופון"
                  className="flex-1 font-jakarta rounded-xl"
                />
                <Button
                  onClick={validateCoupon}
                  disabled={!couponCode.trim() || isValidatingCoupon}
                  className="bg-accent hover:bg-accent-hover text-accent-foreground rounded-xl font-jakarta"
                >
                  {isValidatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "הפעל"}
                </Button>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Smart AI Cart Layers */}
        <SmartCartLayers items={items} subtotal={subtotal} onPetCoinDiscount={setPetCoinDiscount} />

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-muted/30">
            <div className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-6 font-jakarta">
                סיכום הזמנה
              </h2>

              {/* Price Breakdown */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-jakarta">סכום ביניים</span>
                  <span className="font-bold text-foreground font-jakarta">
                    ₪{subtotal.toFixed(2)}
                  </span>
                </div>
                
                {/* Show discount if coupon applied */}
                {discount > 0 && (
                  <div className="flex justify-between items-center text-success">
                    <span className="font-jakarta">הנחה ({appliedCoupon?.code})</span>
                    <span className="font-bold font-jakarta">
                      -₪{discount.toFixed(2)}
                    </span>
                  </div>
                )}
                
                
                {/* PetCoin discount */}
                {petCoinDiscount > 0 && (
                  <div className="flex justify-between items-center text-primary">
                    <span className="font-jakarta">הנחת PetCoins 🪙</span>
                    <span className="font-bold font-jakarta">
                      -₪{petCoinDiscount.toFixed(0)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-jakarta">משלוח</span>
                  <span className="font-bold text-foreground font-jakarta">
                    {shipping === 0 ? (
                      <span className="text-success">חינם</span>
                    ) : (
                      `₪${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>

                {subtotal < 200 && !isFreeShippingCoupon && (
                  <div className="text-xs text-muted-foreground bg-accent/10 p-2 rounded-lg font-jakarta">
                    הוסף עוד ₪{(200 - subtotal).toFixed(2)} למשלוח חינם!
                  </div>
                )}

                <div className="text-xs text-muted-foreground font-jakarta">
                  * המחירים כוללים מע״מ
                </div>

                <div className="border-t-2 border-dashed border-border pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-foreground font-jakarta">
                      סה״כ לתשלום
                    </span>
                    <span className="text-2xl font-bold text-primary font-jakarta">
                      ₪{total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={handleCheckout}
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-bold rounded-2xl shadow-xl flex items-center justify-center gap-3"
                >
                  המשך לתשלום
                </Button>
              </motion.div>
            </div>
          </Card>
        </motion.div>

        {/* Continue Shopping */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/shop")}
          className="w-full mt-4 py-4 text-muted-foreground hover:text-foreground font-medium transition-colors font-jakarta"
        >
          ← המשך לקניות
        </motion.button>
      </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Cart;