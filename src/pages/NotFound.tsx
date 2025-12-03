import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4" dir="rtl">
      <motion.div 
        className="text-center max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Pet Icon */}
        <motion.div
          className="w-32 h-32 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center"
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <span className="text-6xl">🐕</span>
        </motion.div>

        {/* Error Code */}
        <h1 className="text-7xl font-black text-primary mb-4 font-jakarta">404</h1>
        
        {/* Error Message */}
        <h2 className="text-2xl font-bold text-foreground mb-2 font-jakarta">
          אופס! העמוד לא נמצא
        </h2>
        <p className="text-muted-foreground mb-8 font-jakarta">
          נראה שהעמוד שחיפשת הלך לטייל... 🐾
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => navigate('/home')}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold font-jakarta"
            size="lg"
          >
            <Home className="w-5 h-5 ml-2" strokeWidth={1.5} />
            חזרה לדף הבית
          </Button>
          
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="w-full font-jakarta"
            size="lg"
          >
            <ArrowRight className="w-5 h-5 ml-2" strokeWidth={1.5} />
            חזרה לעמוד הקודם
          </Button>
        </div>

        {/* Debug Info (only in dev) */}
        <p className="text-xs text-muted-foreground/50 mt-8 font-mono">
          נתיב: {location.pathname}
        </p>
      </motion.div>
    </div>
  );
};

export default NotFound;