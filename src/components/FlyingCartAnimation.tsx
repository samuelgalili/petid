import { motion, AnimatePresence } from "framer-motion";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface FlyingItem {
  id: string;
  image: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface FlyingCartContextType {
  triggerFly: (image: string, startX: number, startY: number) => void;
  setCartIconPosition: (x: number, y: number) => void;
}

const FlyingCartContext = createContext<FlyingCartContextType | undefined>(undefined);

export const useFlyingCart = () => {
  const context = useContext(FlyingCartContext);
  if (!context) {
    throw new Error("useFlyingCart must be used within FlyingCartProvider");
  }
  return context;
};

export const FlyingCartProvider = ({ children }: { children: ReactNode }) => {
  const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);
  const [cartPosition, setCartPosition] = useState({ x: window.innerWidth - 60, y: 26 });

  const setCartIconPosition = useCallback((x: number, y: number) => {
    setCartPosition({ x, y });
  }, []);

  const triggerFly = useCallback((image: string, startX: number, startY: number) => {
    const id = `fly-${Date.now()}`;
    const newItem: FlyingItem = {
      id,
      image,
      startX,
      startY,
      endX: cartPosition.x,
      endY: cartPosition.y,
    };
    
    setFlyingItems(prev => [...prev, newItem]);
    
    // Remove after animation
    setTimeout(() => {
      setFlyingItems(prev => prev.filter(item => item.id !== id));
    }, 800);
  }, [cartPosition]);

  return (
    <FlyingCartContext.Provider value={{ triggerFly, setCartIconPosition }}>
      {children}
      
      {/* Flying items overlay */}
      <div className="fixed inset-0 pointer-events-none z-[9999]">
        <AnimatePresence>
          {flyingItems.map((item) => (
            <motion.div
              key={item.id}
              className="absolute w-16 h-16 rounded-xl overflow-hidden shadow-2xl"
              initial={{
                x: item.startX - 32,
                y: item.startY - 32,
                scale: 1,
                opacity: 1,
              }}
              animate={{
                x: item.endX - 32,
                y: item.endY - 32,
                scale: 0.2,
                opacity: 0,
              }}
              transition={{
                duration: 0.7,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <img 
                src={item.image} 
                alt="" 
                className="w-full h-full object-cover"
              />
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 bg-petid-gold/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0] }}
                transition={{ duration: 0.7 }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </FlyingCartContext.Provider>
  );
};
