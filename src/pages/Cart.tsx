import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { ArrowRight, Plus, Minus, Trash2, ShoppingBag, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Cart = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, getSubtotal, getTotalItems } = useCart();
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const shippingCost = getSubtotal() >= 200 ? 0 : 25;
  const taxRate = 0.17; // 17% VAT
  const tax = getSubtotal() * taxRate;
  const total = getSubtotal() + shippingCost + tax;

  const handleRemoveItem = (id: string, name: string) => {
    removeFromCart(id);
    toast({
      title: "הוסר מהעגלה",
      description: `${name} הוסר בהצלחה`,
      duration: 2000,
    });
  };

  const handleCheckout = () => {
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
      <div className="min-h-screen bg-white pb-20" dir="rtl">
        <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        
        {/* Header */}
        <div className="bg-[#FFC107] pt-6 pb-6 shadow-md">
          <div className="max-w-md mx-auto px-4 flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <ArrowRight className="w-6 h-6 text-gray-900" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 text-center flex-1 font-jakarta">
              עגלת הקניות
            </h1>
          </div>
        </div>

        {/* Empty Cart State */}
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-16 h-16 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3 font-jakarta">
              העגלה שלך ריקה
            </h2>
            <p className="text-gray-600 mb-8 font-jakarta">
              הוסף מוצרים מהחנות כדי להתחיל
            </p>
            <Button
              onClick={() => navigate("/shop")}
              className="bg-[#FFC107] hover:bg-[#FFB300] text-gray-900 font-bold px-8 py-6 rounded-2xl shadow-lg font-jakarta"
            >
              המשך לקניות
            </Button>
          </motion.div>
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32" dir="rtl">
      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      {/* Header */}
      <div className="bg-[#FFC107] pt-6 pb-6 shadow-md sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowRight className="w-6 h-6 text-gray-900" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 text-center flex-1 font-jakarta">
            עגלת הקניות ({getTotalItems()})
          </h1>
        </div>
      </div>

      {/* Cart Items */}
      <div className="max-w-md mx-auto px-4 py-6">
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
              <Card className="overflow-hidden border-0 shadow-md">
                <div className="flex gap-4 p-4">
                  {/* Product Image */}
                  <div className="w-24 h-24 bg-gray-50 rounded-xl flex-shrink-0 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm mb-1 font-jakarta line-clamp-2">
                      {item.name}
                    </h3>
                    {item.variant && (
                      <p className="text-xs text-gray-600 mb-2 font-jakarta">
                        {item.variant}
                      </p>
                    )}
                    
                    {/* Price */}
                    <div className="text-lg font-bold text-[#E91E63] mb-3 font-jakarta">
                      {item.price}₪
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-gray-100 rounded-full px-2 py-1">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
                        >
                          <Minus className="w-4 h-4 text-gray-700" />
                        </motion.button>
                        <span className="text-base font-bold text-gray-900 w-8 text-center font-jakarta">
                          {item.quantity}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
                        >
                          <Plus className="w-4 h-4 text-gray-700" />
                        </motion.button>
                      </div>

                      {/* Remove Button */}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleRemoveItem(item.id, item.name)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 font-jakarta">
                סיכום הזמנה
              </h2>

              {/* Price Breakdown */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-jakarta">סכום ביניים</span>
                  <span className="font-bold text-gray-900 font-jakarta">
                    ₪{getSubtotal().toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-jakarta">משלוח</span>
                  <span className="font-bold text-gray-900 font-jakarta">
                    {shippingCost === 0 ? (
                      <span className="text-green-600">חינם</span>
                    ) : (
                      `₪${shippingCost.toFixed(2)}`
                    )}
                  </span>
                </div>

                {getSubtotal() < 200 && (
                  <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded-lg font-jakarta">
                    הוסף עוד ₪{(200 - getSubtotal()).toFixed(2)} למשלוח חינם!
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-jakarta">מע״מ (17%)</span>
                  <span className="font-bold text-gray-900 font-jakarta">
                    ₪{tax.toFixed(2)}
                  </span>
                </div>

                <div className="border-t-2 border-dashed border-gray-300 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900 font-jakarta">
                      סה״כ לתשלום
                    </span>
                    <span className="text-2xl font-bold text-[#E91E63] font-jakarta">
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
                  className="w-full h-14 bg-[#FFC107] hover:bg-[#FFB300] text-gray-900 text-lg font-bold rounded-2xl shadow-xl flex items-center justify-center gap-3 font-jakarta"
                >
                  <CreditCard className="w-6 h-6" />
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
          className="w-full mt-4 py-4 text-gray-600 hover:text-gray-900 font-medium transition-colors font-jakarta"
        >
          ← המשך לקניות
        </motion.button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Cart;
