import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { playAddToCartSound } from "@/lib/sounds";
import { trackEvent } from "@/lib/analytics";

export interface CartItem {
  /** Stable cart-line identity: product + variant + size. */
  id: string;
  /** Catalog identity sent to the order API. */
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  variant?: string;
  size?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "id" | "productId" | "quantity"> & {
    id?: string;
    productId?: string;
    quantity?: number;
  }) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  cartShake: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const getLegacyProductId = (item: Partial<CartItem> & { id?: string }) => {
  if (item.productId) return item.productId;
  const id = item.id || "";
  const legacySuffix = `-${item.size || "default"}`;
  return id.endsWith(legacySuffix) ? id.slice(0, -legacySuffix.length) : id;
};

const getLineId = (productId: string, variant?: string, size?: string) => (
  JSON.stringify([productId, variant || "", size || ""])
);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem("petid-cart");
      const parsed = savedCart ? JSON.parse(savedCart) : [];
      if (!Array.isArray(parsed)) return [];

      return parsed.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const productId = getLegacyProductId(item);
        if (!productId) return [];
        return [{
          ...item,
          id: getLineId(productId, item.variant, item.size),
          productId,
        } as CartItem];
      });
    } catch {
      return [];
    }
  });
  const [cartShake, setCartShake] = useState(false);

  useEffect(() => {
    localStorage.setItem("petid-cart", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    const clearUserData = () => setItems([]);
    window.addEventListener("mipo:user-data-cleared", clearUserData);
    return () => window.removeEventListener("mipo:user-data-cleared", clearUserData);
  }, []);

  const addToCart: CartContextType["addToCart"] = (item) => {
    const productId = item.productId || item.id;
    if (!productId) return;

    trackEvent("cart.item_added", {
      entity_type: "product",
      entity_id: productId,
      payload: {
        quantity: item.quantity || 1,
        price: item.price,
        variant: item.variant || null,
        size: item.size || null,
      },
    });
    const lineId = getLineId(productId, item.variant, item.size);

    setItems((prevItems) => {
      const existingItem = prevItems.find((cartItem) => cartItem.id === lineId);

      if (existingItem) {
        return prevItems.map((i) =>
          i.id === lineId
            ? { ...i, quantity: i.quantity + (item.quantity || 1) }
            : i
        );
      }

      return [...prevItems, {
        ...item,
        id: lineId,
        productId,
        quantity: item.quantity || 1,
      }];
    });
    
    // Trigger shake animation and sound
    setCartShake(true);
    playAddToCartSound();
    setTimeout(() => setCartShake(false), 500);
  };

  const removeFromCart = (id: string) => {
    setItems((prevItems) => {
      const removed = prevItems.find((item) => item.id === id);
      if (removed) {
        // Abandonment is only visible as the gap between adds and orders, so a
        // removal is as worth recording as an add.
        trackEvent("cart.item_removed", {
          entity_type: "product",
          entity_id: removed.productId,
          payload: { quantity: removed.quantity, price: removed.price },
        });
      }
      return prevItems.filter((item) => item.id !== id);
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getSubtotal = () => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalItems,
        getSubtotal,
        cartShake,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
