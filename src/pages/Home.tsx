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
      icon: Calendar,
      label: "יומן מעקב",
      description: "תיעוד פעילויות יומיות",
      path: "/tracker",
      external: false,
    },
    {
      icon: MapPin,
      label: "גינות כלבים",
      description: "מצא גינה קרובה",
      path: "/parks",
      external: false,
    },
    {
      icon: Heart,
      label: "חנות חיות",
      description: "מוצרים ואביזרים",
      path: "https://petid.co.il/catalog-new/",
      external: true,
    },
    {
      icon: Package,
      label: "חוויות",
      description: "הזמן שירותים",
      path: "/experiences",
      external: false,
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
      <div className="px-6 pt-8 grid grid-cols-2 gap-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          
          if (feature.external) {
            return (
              <a
                key={index}
                href={feature.path}
                target="_blank"
                rel="noopener noreferrer"
                style={{ animationDelay: `${index * 50}ms` }}
                className="group bg-card border border-border hover:border-foreground/20 rounded-2xl p-5 flex flex-col items-start gap-3 cursor-pointer hover:shadow-md active:scale-[0.98] transition-all duration-200 animate-scale-in"
              >
                <div className="w-11 h-11 rounded-xl bg-foreground flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5 text-background" />
                </div>
                <div className="text-right">
                  <h3 className="font-bold text-base mb-0.5">{feature.label}</h3>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </a>
            );
          }
          
          return (
            <Card
              key={index}
              onClick={() => navigate(feature.path)}
              style={{ animationDelay: `${index * 50}ms` }}
              className="group bg-card border border-border hover:border-foreground/20 rounded-2xl p-5 flex flex-col items-start gap-3 cursor-pointer hover:shadow-md active:scale-[0.98] transition-all duration-200 animate-scale-in"
            >
              <div className="w-11 h-11 rounded-xl bg-foreground flex items-center justify-center group-hover:scale-110 transition-transform">
                <Icon className="w-5 h-5 text-background" />
              </div>
              <div className="text-right">
                <h3 className="font-bold text-base mb-0.5">{feature.label}</h3>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
