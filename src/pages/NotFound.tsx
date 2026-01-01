import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const containerVariants = {
  hidden: { 
    opacity: 0,
    y: 30
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.43, 0.13, 0.23, 0.96] as const,
      delayChildren: 0.1,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { 
    opacity: 0,
    y: 20
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.43, 0.13, 0.23, 0.96] as const
    }
  }
};

const numberVariants = {
  hidden: (direction: number) => ({
    opacity: 0,
    x: direction * 40,
    y: 15,
    rotate: direction * 5
  }),
  visible: {
    opacity: 0.7,
    x: 0,
    y: 0,
    rotate: 0,
    transition: {
      duration: 0.8,
      ease: [0.43, 0.13, 0.23, 0.96] as const
    }
  }
};

const petVariants = {
  hidden: { 
    scale: 0.8,
    opacity: 0,
    y: 15,
    rotate: -5
  },
  visible: { 
    scale: 1,
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: {
      duration: 0.6,
      ease: [0.43, 0.13, 0.23, 0.96] as const
    }
  },
  floating: {
    y: [-5, 5],
    transition: {
      y: {
        duration: 2,
        ease: "easeInOut" as const,
        repeat: Infinity,
        repeatType: "reverse" as const
      }
    }
  }
};

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4" dir="rtl">
      <AnimatePresence mode="wait">
        <motion.div 
          className="text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* 4 - Pet - 4 */}
          <div className="flex items-center justify-center gap-4 md:gap-6 mb-8 md:mb-12">
            <motion.span 
              className="text-[80px] md:text-[120px] font-black text-foreground/70 font-jakarta select-none"
              variants={numberVariants}
              custom={-1}
            >
              4
            </motion.span>
            
            <motion.div
              variants={petVariants}
              animate={["visible", "floating"]}
              whileHover={{ 
                scale: 1.1, 
                rotate: [0, -5, 5, -5, 0],
                transition: { duration: 0.5 }
              }}
              className="w-[80px] h-[80px] md:w-[120px] md:h-[120px] rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center cursor-pointer"
            >
              <span className="text-5xl md:text-7xl select-none">🐕</span>
            </motion.div>
            
            <motion.span 
              className="text-[80px] md:text-[120px] font-black text-foreground/70 font-jakarta select-none"
              variants={numberVariants}
              custom={1}
            >
              4
            </motion.span>
          </div>
          
          {/* Title */}
          <motion.h1 
            className="text-3xl md:text-5xl font-black text-foreground mb-4 md:mb-6 font-jakarta select-none"
            variants={itemVariants}
          >
            אופס! הדף ברח! 🐾
          </motion.h1>
          
          {/* Subtitle */}
          <motion.p 
            className="text-lg md:text-xl text-muted-foreground mb-8 md:mb-12 font-jakarta select-none"
            variants={itemVariants}
          >
            נראה שהעמוד הזה יצא לטייל ולא חזר...
          </motion.p>

          {/* CTA Button */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ 
              scale: 1.05,
              transition: {
                duration: 0.3,
                ease: [0.43, 0.13, 0.23, 0.96]
              }
            }}
            whileTap={{ scale: 0.98 }}
          >
            <button 
              onClick={() => navigate('/home')}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-full text-lg font-bold hover:bg-primary/90 transition-colors font-jakarta select-none shadow-lg"
            >
              <Home className="w-5 h-5" strokeWidth={2} />
              חזרה הביתה
            </button>
          </motion.div>

          {/* Back Link */}
          <motion.div 
            className="mt-8"
            variants={itemVariants}
          >
            <button
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-foreground transition-colors underline font-jakarta select-none text-sm"
            >
              או חזרה לעמוד הקודם
            </button>
          </motion.div>

          {/* Debug path - subtle */}
          <motion.p 
            className="text-xs text-muted-foreground/30 mt-12 font-mono"
            variants={itemVariants}
          >
            {location.pathname}
          </motion.p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default NotFound;