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
  // Default position - top right where cart icon typically appears
  const [cartPosition, setCartPosition] = useState({ x: window.innerWidth - 40, y: 38 });

  const setCartIconPosition = useCallback((x: number, y: number) => {
    if (x > 0 && y > 0) {
      setCartPosition({ x, y });
    }
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
              className="absolute"
              style={{ 
                width: 72,
                height: 72,
              }}
              initial={{
                x: item.startX - 36,
                y: item.startY - 36,
                scale: 1,
                opacity: 1,
                rotate: 0,
              }}
              animate={{
                x: item.endX - 18,
                y: item.endY - 18,
                scale: 0.25,
                opacity: [1, 1, 0.8, 0],
                rotate: [0, -8, 5, 0],
              }}
              transition={{
                duration: 0.65,
                ease: [0.32, 0.72, 0, 1],
                opacity: { times: [0, 0.5, 0.8, 1] },
                rotate: { duration: 0.5 },
              }}
            >
              {/* Outer glow ring */}
              <motion.div
                className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-petid-gold/60 via-petid-gold/30 to-transparent"
                initial={{ opacity: 0, scale: 1.2 }}
                animate={{ 
                  opacity: [0, 0.8, 0.4, 0],
                  scale: [1.3, 1, 0.8],
                }}
                transition={{ duration: 0.65 }}
                style={{ filter: 'blur(8px)' }}
              />
              
              {/* Product image container */}
              <motion.div
                className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-petid-gold/50 shadow-[0_8px_32px_rgba(0,0,0,0.25),0_0_20px_rgba(212,175,55,0.4)]"
                animate={{
                  boxShadow: [
                    '0 8px 32px rgba(0,0,0,0.25), 0 0 20px rgba(212,175,55,0.4)',
                    '0 4px 16px rgba(0,0,0,0.2), 0 0 30px rgba(212,175,55,0.6)',
                    '0 2px 8px rgba(0,0,0,0.15), 0 0 15px rgba(212,175,55,0.3)',
                  ]
                }}
                transition={{ duration: 0.65 }}
              >
                <img 
                  src={item.image} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
                
                {/* Shine sweep effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                />
                
                {/* Golden overlay pulse */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-t from-petid-gold/40 via-transparent to-petid-gold/20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.7, 0.3, 0] }}
                  transition={{ duration: 0.65 }}
                />
              </motion.div>
              
              {/* Sparkle particles */}
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-petid-gold"
                  style={{
                    left: '50%',
                    top: '50%',
                    boxShadow: '0 0 6px 2px rgba(212,175,55,0.8)',
                  }}
                  initial={{ 
                    x: 0, 
                    y: 0, 
                    scale: 0,
                    opacity: 0,
                  }}
                  animate={{ 
                    x: [0, (i % 2 === 0 ? 1 : -1) * (20 + i * 8)],
                    y: [0, (i < 2 ? -1 : 1) * (15 + i * 5)],
                    scale: [0, 1.2, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{ 
                    duration: 0.5,
                    delay: 0.15 + i * 0.05,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </FlyingCartContext.Provider>
  );
};
