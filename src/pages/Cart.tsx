import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag, Truck, Shield, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";

const Cart = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, updateQuantity, removeFromCart, getSubtotal } = useCart();

  const subtotal = getSubtotal();
  const shipping = subtotal >= 199 ? 0 : 25;
  const tax = subtotal * 0.17; // 17% VAT in Israel
  const total = subtotal + shipping + tax;

  const handleCheckout = () => {
    if (items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add some items to your cart first",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Proceeding to checkout",
      description: "Redirecting to payment...",
    });
    // Navigate to checkout page (to be implemented)
  };

  const handleRemoveItem = (id: string, name: string) => {
    removeFromCart(id);
    toast({
      title: "Item removed",
      description: `${name} removed from cart`,
    });
  };

  return (
    <div className="min-h-screen pb-32 bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-gray-100"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Button>
          <h1 className="text-base font-bold font-jakarta text-gray-900">Shopping Cart</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Empty Cart State */}
      {items.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center px-4 py-20"
        >
          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <ShoppingBag className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 font-jakarta mb-2">Your cart is empty</h2>
          <p className="text-sm text-gray-600 font-jakarta mb-6 text-center">
            Add some items to get started
          </p>
          <Button
            size="lg"
            className="bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900 rounded-xl font-bold font-jakarta"
            onClick={() => navigate("/home")}
          >
            Continue Shopping
          </Button>
        </motion.div>
      )}

      {/* Cart Items */}
      {items.length > 0 && (
        <div className="px-4 py-5 space-y-5">
          {/* Items List */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 font-jakarta">
              Cart Items ({items.length})
            </h2>
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  layout
                >
                  <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="flex gap-3">
                      {/* Product Image */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 font-jakarta text-sm mb-1 truncate">
                          {item.name}
                        </h3>
                        {item.variant && (
                          <p className="text-xs text-gray-600 font-jakarta mb-1">
                            Flavor: {item.variant}
                          </p>
                        )}
                        {item.size && (
                          <p className="text-xs text-gray-600 font-jakarta mb-2">
                            Size: {item.size}
                          </p>
                        )}
                        <p className="text-base font-bold text-gray-900 font-jakarta">
                          ₪{item.price.toFixed(2)}
                        </p>
                      </div>

                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 flex-shrink-0"
                        onClick={() => handleRemoveItem(item.id, item.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs font-semibold text-gray-700 font-jakarta">
                        Quantity
                      </span>
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="h-8 w-8 hover:bg-gray-100"
                        >
                          <Minus className="w-3 h-3 text-gray-700" />
                        </Button>
                        <span className="w-10 text-center text-sm font-bold text-gray-900 font-jakarta">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="h-8 w-8 hover:bg-gray-100"
                        >
                          <Plus className="w-3 h-3 text-gray-700" />
                        </Button>
                      </div>
                      <span className="text-sm font-bold text-gray-900 font-jakarta">
                        ₪{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <Separator />

          {/* Delivery Info */}
          <Card className="p-4 bg-gradient-to-r from-[#B8E3D5]/20 to-[#FBD66A]/20 border-none">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-5 h-5 text-[#7DD3C0]" />
              <span className="text-sm font-bold text-gray-900 font-jakarta">
                Delivery Information
              </span>
            </div>
            <p className="text-xs text-gray-600 font-jakarta">
              {shipping === 0
                ? "🎉 You qualify for FREE shipping!"
                : `Add ₪${(199 - subtotal).toFixed(2)} more for FREE shipping`}
            </p>
          </Card>

          <Separator />

          {/* Order Summary */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900 font-jakarta">Order Summary</h3>
            <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 font-jakarta">Subtotal</span>
                <span className="font-semibold text-gray-900 font-jakarta">
                  ₪{subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 font-jakarta flex items-center gap-1">
                  <Truck className="w-4 h-4" />
                  Shipping
                </span>
                <span className="font-semibold text-gray-900 font-jakarta">
                  {shipping === 0 ? (
                    <span className="text-[#7DD3C0]">FREE</span>
                  ) : (
                    `₪${shipping.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 font-jakarta flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  Tax (VAT 17%)
                </span>
                <span className="font-semibold text-gray-900 font-jakarta">
                  ₪{tax.toFixed(2)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-gray-900 font-jakarta">Total</span>
                <span className="text-xl font-bold text-gray-900 font-jakarta">
                  ₪{total.toFixed(2)}
                </span>
              </div>
            </Card>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-2 py-2">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-[#7DD3C0]/20 flex items-center justify-center mb-1">
                <Shield className="w-5 h-5 text-[#7DD3C0]" />
              </div>
              <span className="text-xs font-semibold text-gray-900 font-jakarta">
                Secure Payment
              </span>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-[#FBD66A]/20 flex items-center justify-center mb-1">
                <Truck className="w-5 h-5 text-[#F4C542]" />
              </div>
              <span className="text-xs font-semibold text-gray-900 font-jakarta">
                Fast Delivery
              </span>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-[#7DD3C0]/20 flex items-center justify-center mb-1">
                <Shield className="w-5 h-5 text-[#7DD3C0]" />
              </div>
              <span className="text-xs font-semibold text-gray-900 font-jakarta">
                30-Day Returns
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Checkout Button */}
      {items.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-3 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-2xl mx-auto">
            <Button
              size="lg"
              className="w-full bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900 rounded-xl font-bold font-jakarta shadow-md h-12"
              onClick={handleCheckout}
            >
              Proceed to Checkout · ₪{total.toFixed(2)}
            </Button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Cart;
