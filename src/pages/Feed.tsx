import { ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { FeedPageSkeleton } from "@/components/LoadingSkeleton";
import BottomNav from "@/components/BottomNav";

const Feed = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Simulate data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div 
        className="min-h-screen pb-20" 
        dir="rtl"
        style={{ backgroundColor: '#F8F6F3' }}
      >
        <div className="bg-white px-5 py-4">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <button 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#F5F5F5' }}
            >
              <ArrowRight className="w-5 h-5" style={{ color: '#1A1A1A' }} />
            </button>
            
            <h1 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>
              שתי עובדיות
            </h1>
            
            <div className="w-10 h-10 rounded-full" style={{ backgroundColor: '#F5F5F5' }} />
          </div>
        </div>

        <FeedPageSkeleton />
        <BottomNav />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen pb-20" 
      dir="rtl"
      style={{ backgroundColor: '#F8F6F3' }}
    >
      {/* Header */}
      <div className="bg-white px-5 py-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: '#F5F5F5' }}
          >
            <ArrowRight className="w-5 h-5" style={{ color: '#1A1A1A' }} />
          </button>
          
          <h1 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>
            שתי עובדיות
          </h1>
          
          <Avatar className="w-10 h-10">
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" />
            <AvatarFallback style={{ backgroundColor: '#FFB8A1' }}>👤</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-5 pt-5 space-y-4 max-w-md mx-auto">
        {/* Top Stats Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="rounded-[28px] p-6 relative overflow-hidden"
          style={{ 
            backgroundColor: '#F5F0E8',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)'
          }}
        >
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1 pr-3">
              <h2 className="text-xl font-bold mb-1.5 leading-tight" style={{ color: '#1A1A1A' }}>
                ששל הולכתמיה<br />שייו הלולדרה
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: '#666666' }}>
                הגיעיף! נוגע בהליטובקה
              </p>
            </div>
            
            <Avatar className="w-16 h-16 border-[3px] shadow-lg flex-shrink-0" style={{ borderColor: '#FFFFFF' }}>
              <AvatarImage src="https://images.unsplash.com/photo-1568572933382-74d440642117?w=200&h=200&fit=crop" />
              <AvatarFallback>🐕</AvatarFallback>
            </Avatar>
          </div>

          {/* Stats Icons Grid */}
          <div className="grid grid-cols-3 gap-4 relative">
            {/* Bubble pointer for third item */}
            <div 
              className="absolute right-[66.66%] top-[-8px] w-12 h-12 rounded-[12px] z-10"
              style={{ 
                backgroundColor: '#5EBAB0',
                transform: 'translateX(50%)'
              }}
            >
              <div className="absolute bottom-[-6px] right-1/2 translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px]" style={{ 
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderTopColor: '#5EBAB0'
              }} />
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-white font-bold text-base">עוד</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-md"
                style={{ backgroundColor: '#5EBAB0' }}
              >
                <span className="text-white font-bold text-xl">7</span>
              </div>
              <span className="text-xs font-medium text-center" style={{ color: '#1A1A1A' }}>
                כס כיטוס
              </span>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-md"
                style={{ backgroundColor: '#E8B84E' }}
              >
                <span className="text-white font-bold text-2xl">?</span>
              </div>
              <span className="text-xs font-medium text-center" style={{ color: '#1A1A1A' }}>
                חווח דפיוומק
              </span>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-md relative"
                style={{ backgroundColor: '#F5E5E5' }}
              >
                <span className="text-4xl">🖌️</span>
              </div>
              <span className="text-xs font-medium text-center" style={{ color: '#1A1A1A' }}>
                שיוק במייעת
              </span>
            </div>
          </div>
        </motion.div>

        {/* First Update Card - Dog with golden retriever */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-[28px] p-5 flex gap-4 relative overflow-hidden cursor-pointer"
          style={{ 
            backgroundColor: '#5EBAB0',
            boxShadow: '0 4px 16px rgba(94, 186, 176, 0.3)'
          }}
        >
          <div className="relative w-28 h-28 flex-shrink-0">
            <img 
              src="https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop" 
              alt="Dog"
              className="w-full h-full rounded-2xl object-cover"
            />
          </div>
          
          <div className="flex-1 flex flex-col justify-between text-white min-h-[112px]">
            <div>
              <h3 className="text-base font-bold mb-1 leading-tight">
                מיינינג מאססייייט שטייהד
              </h3>
              <p className="text-sm opacity-95 leading-relaxed">
                סַבון לי:ידניס פאוס<br />כַמִּי
              </p>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <button 
                className="px-6 py-2 bg-white rounded-full text-sm font-bold transition-transform active:scale-95"
                style={{ color: '#5EBAB0' }}
              >
                לוחים בו
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm opacity-95">נפיא שחייהד</span>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FFC857' }} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Second Update Card - Puppy */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-[28px] p-5 flex gap-4 relative overflow-hidden cursor-pointer"
          style={{ 
            backgroundColor: '#87C9C3',
            boxShadow: '0 4px 16px rgba(135, 201, 195, 0.3)'
          }}
        >
          <div className="relative w-28 h-28 flex-shrink-0">
            <img 
              src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=300&h=300&fit=crop" 
              alt="Puppy"
              className="w-full h-full rounded-2xl object-cover"
            />
          </div>
          
          <div className="flex-1 flex flex-col justify-between text-white min-h-[112px]">
            <div>
              <h3 className="text-base font-bold mb-1 leading-tight">
                ביוטאס לקיים שכיוע
              </h3>
              <p className="text-sm opacity-95 leading-relaxed">
                קיטבוער ונעוט<br />הסכ
              </p>
            </div>
            
            <button 
              className="self-start px-6 py-2 bg-white rounded-full text-sm font-bold mt-2 transition-transform active:scale-95"
              style={{ color: '#5EBAB0' }}
            >
              כווט
            </button>
          </div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Feed;
