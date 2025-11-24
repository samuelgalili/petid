import { ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

const Feed = () => {
  const navigate = useNavigate();

  return (
    <div 
      className="min-h-screen pb-20" 
      dir="rtl" 
      style={{ background: 'hsl(48 67% 97%)' }}
    >
      {/* Header */}
      <div className="bg-white border-b border-border/20 px-6 py-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center hover:bg-[#ECECEC] transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <h1 className="text-xl font-bold">שתי עובדיות</h1>
          
          <Avatar className="w-10 h-10">
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" />
            <AvatarFallback>👤</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pt-6 space-y-4">
        {/* Top Card with Stats */}
        <div 
          className="rounded-[1.75rem] p-5 relative overflow-hidden"
          style={{ 
            backgroundColor: '#F5F0E8',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)'
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1 leading-tight">
                ששל הולכתמיה<br />שייו הלולדרה
              </h2>
              <p className="text-sm text-foreground/60">
                הגיעיף! נוגע בהליטובקה
              </p>
            </div>
            
            <Avatar className="w-16 h-16 border-2 border-white shadow-md">
              <AvatarImage src="https://images.unsplash.com/photo-1568572933382-74d440642117?w=200&h=200&fit=crop" />
              <AvatarFallback>🐕</AvatarFallback>
            </Avatar>
          </div>

          {/* Stats Icons */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="flex flex-col items-center gap-2">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg relative"
                style={{ backgroundColor: 'hsl(174 62% 50%)' }}
              >
                7
              </div>
              <span className="text-xs font-medium text-center">כס כיטוס</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-2xl relative"
                style={{ backgroundColor: 'hsl(45 100% 60%)' }}
              >
                ?
              </div>
              <span className="text-xs font-medium text-center">חווח דפיוומק</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center relative"
                style={{ backgroundColor: 'hsl(0 70% 95%)' }}
              >
                <span className="text-3xl">🖌️</span>
              </div>
              <span className="text-xs font-medium text-center">שיוק במייעת</span>
            </div>
          </div>
        </div>

        {/* First Update Card */}
        <div 
          className="rounded-[1.75rem] p-5 flex gap-4 relative overflow-hidden"
          style={{ 
            backgroundColor: 'hsl(174 55% 65%)',
            boxShadow: '0 4px 16px rgba(93, 213, 200, 0.25)'
          }}
        >
          <img 
            src="https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop" 
            alt="Dog"
            className="w-28 h-28 rounded-2xl object-cover"
          />
          
          <div className="flex-1 flex flex-col justify-between text-white">
            <div>
              <h3 className="text-base font-bold mb-1 leading-tight">
                מיינינג מאססייייט שטייהד
              </h3>
              <p className="text-sm opacity-90">
                סַבון לי:ידניס פאוס<br />כַמִּי
              </p>
            </div>
            
            <div className="flex items-center justify-between mt-3">
              <button 
                className="px-5 py-2 bg-white rounded-full text-sm font-semibold"
                style={{ color: 'hsl(174 55% 45%)' }}
              >
                לוחים בו
              </button>
              <div className="flex items-center gap-1.5">
                <span className="text-sm opacity-90">נפיא שחייהד</span>
                <div className="w-2 h-2 rounded-full bg-white/80" />
              </div>
            </div>
          </div>
        </div>

        {/* Second Update Card */}
        <div 
          className="rounded-[1.75rem] p-5 flex gap-4 relative overflow-hidden"
          style={{ 
            backgroundColor: 'hsl(174 55% 65%)',
            boxShadow: '0 4px 16px rgba(93, 213, 200, 0.25)'
          }}
        >
          <img 
            src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=300&h=300&fit=crop" 
            alt="Dog"
            className="w-28 h-28 rounded-2xl object-cover"
          />
          
          <div className="flex-1 flex flex-col justify-between text-white">
            <div>
              <h3 className="text-base font-bold mb-1 leading-tight">
                ביוטאס לקיים שכיוע
              </h3>
              <p className="text-sm opacity-90">
                קיטבוער ונעוט<br />הסכ
              </p>
            </div>
            
            <button 
              className="self-start px-5 py-2 bg-white rounded-full text-sm font-semibold mt-3"
              style={{ color: 'hsl(174 55% 45%)' }}
            >
              כווט
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Feed;
