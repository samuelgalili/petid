import { Calendar, MapPin, Heart, Package, Menu, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: "🦴",
      label: "אתני ושטף",
      description: "AMMI SPN",
      path: "/tracker",
      external: false,
      color: "bg-[#FFE5E5]",
    },
    {
      icon: "🧸",
      label: "צעיר",
      description: "LIYE SOON",
      path: "/parks",
      external: false,
      color: "bg-[#D4F0ED]",
    },
    {
      icon: "🦴",
      label: "חשבה",
      description: "OROOUN",
      path: "/experiences",
      external: false,
      color: "bg-[#F5F0E8]",
    },
    {
      icon: "🦅",
      label: "אודיקה",
      description: "PRETECIOUS",
      path: "/tracker",
      external: false,
      color: "bg-[#E8E5FF]",
    },
    {
      icon: "🪞",
      label: "מדריכה",
      description: "FOR MIRROR",
      path: "/parks",
      external: false,
      color: "bg-[#FFF9E5]",
    },
    {
      icon: "🎾",
      label: "דינה",
      description: "FOR PA",
      path: "/experiences",
      external: false,
      color: "bg-[#E5F5E8]",
    },
    {
      icon: "🐾",
      label: "מידעית",
      description: "PAL MELA",
      path: "/tracker",
      external: false,
      color: "bg-[#FFE5E5]",
    },
    {
      icon: "🦴",
      label: "שינותב",
      description: "DELALEIDUO",
      path: "/parks",
      external: false,
      color: "bg-[#D4F0ED]",
    },
    {
      icon: "🎀",
      label: "משטיע",
      description: "MEEMINDES",
      path: "https://petid.co.il/catalog-new/",
      external: true,
      color: "bg-[#FFE5E5]",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="bg-background border-b border-border/50 p-6 pb-6">
        <div className="flex items-center justify-between mb-6 animate-slide-up">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted animate-press">
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-medium">שלום,</p>
              <p className="font-bold text-base">ישראל ישראלי</p>
            </div>
            <Avatar className="w-11 h-11 border border-border shadow-sm">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" />
              <AvatarFallback className="bg-muted text-foreground">יי</AvatarFallback>
            </Avatar>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted animate-press relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 left-2 w-1.5 h-1.5 bg-foreground rounded-full" />
          </Button>
        </div>

        {/* Pet Avatars */}
        <div className="flex justify-center gap-3 mb-4 animate-scale-in">
          <div className="relative group">
            <Avatar className="w-[72px] h-[72px] border-2 border-foreground shadow-md cursor-pointer hover:scale-105 transition-transform animate-press">
              <AvatarImage src="https://images.unsplash.com/photo-1568572933382-74d440642117?w=200&h=200&fit=crop" />
              <AvatarFallback>🐕</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-foreground rounded-full border-2 border-background flex items-center justify-center">
              <span className="text-background text-[10px] font-bold">✓</span>
            </div>
          </div>
          <Avatar className="w-[72px] h-[72px] border border-border shadow-sm opacity-40 hover:opacity-60 cursor-pointer hover:scale-105 transition-all animate-press">
            <AvatarImage src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200&h=200&fit=crop" />
            <AvatarFallback>🐕</AvatarFallback>
          </Avatar>
          <Avatar className="w-[72px] h-[72px] border border-border shadow-sm opacity-40 hover:opacity-60 cursor-pointer hover:scale-105 transition-all animate-press">
            <AvatarImage src="https://images.unsplash.com/photo-1560807707-8cc77767d783?w=200&h=200&fit=crop" />
            <AvatarFallback>🐕</AvatarFallback>
          </Avatar>
        </div>

        <div className="text-center animate-slide-up">
          <h2 className="text-xl font-bold mb-0.5">הוקי ארביב</h2>
          <p className="text-sm text-muted-foreground font-medium">גיל 1.5 שנים</p>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="px-6 pt-8 grid grid-cols-3 gap-3">
        {features.map((feature, index) => {
          if (feature.external) {
            return (
              <a
                key={index}
                href={feature.path}
                target="_blank"
                rel="noopener noreferrer"
                style={{ animationDelay: `${index * 50}ms` }}
                className={`group ${feature.color} rounded-3xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:shadow-md active:scale-95 transition-all duration-200 animate-scale-in min-h-[120px] relative`}
              >
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/40 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white/60" />
                </div>
                <div className="text-4xl mb-1">{feature.icon}</div>
                <div className="text-center">
                  <h3 className="font-bold text-sm mb-0">{feature.label}</h3>
                  <p className="text-[10px] text-foreground/60 uppercase tracking-wide">{feature.description}</p>
                </div>
              </a>
            );
          }
          
          return (
            <div
              key={index}
              onClick={() => navigate(feature.path)}
              style={{ animationDelay: `${index * 50}ms` }}
              className={`group ${feature.color} rounded-3xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:shadow-md active:scale-95 transition-all duration-200 animate-scale-in min-h-[120px] relative`}
            >
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/40 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white/60" />
              </div>
              <div className="text-4xl mb-1">{feature.icon}</div>
              <div className="text-center">
                <h3 className="font-bold text-sm mb-0">{feature.label}</h3>
                <p className="text-[10px] text-foreground/60 uppercase tracking-wide">{feature.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
