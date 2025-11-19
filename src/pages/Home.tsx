import { Calendar, MapPin, Heart, Scissors, Menu, Bell } from "lucide-react";
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
      color: "bg-blue text-blue-foreground",
      path: "/tracker",
      external: false,
    },
    {
      icon: MapPin,
      label: "גינות כלבים",
      color: "bg-green text-green-foreground",
      path: "/parks",
      external: false,
    },
    {
      icon: Heart,
      label: "חניות חיות",
      color: "bg-purple text-purple-foreground",
      path: "https://petid.co.il/catalog-new/",
      external: true,
    },
    {
      icon: Scissors,
      label: "טיפורים",
      color: "bg-pink text-pink-foreground",
      path: "/grooming",
      external: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-b from-muted to-background p-6 pb-8">
        <div className="flex items-center justify-between mb-6 animate-slide-up">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/50 animate-press">
            <Menu className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">שלום,</p>
              <p className="font-bold text-lg">ישראל ישראלי</p>
            </div>
            <Avatar className="w-12 h-12 border-2 border-background shadow-md ring-2 ring-coral/20 hover:ring-coral/40 transition-all">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" />
              <AvatarFallback>יי</AvatarFallback>
            </Avatar>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/50 animate-press relative">
            <Bell className="w-6 h-6" />
            <span className="absolute top-1 left-1 w-2 h-2 bg-coral rounded-full animate-pulse" />
          </Button>
        </div>

        {/* Pet Avatars */}
        <div className="flex justify-center gap-4 mb-4 animate-scale-in">
          <Avatar className="w-20 h-20 border-4 border-background shadow-lg ring-2 ring-coral cursor-pointer hover:scale-110 transition-transform animate-press">
            <AvatarImage src="https://images.unsplash.com/photo-1568572933382-74d440642117?w=200&h=200&fit=crop" />
            <AvatarFallback>🐕</AvatarFallback>
          </Avatar>
          <Avatar className="w-20 h-20 border-4 border-background shadow-lg opacity-60 hover:opacity-100 cursor-pointer hover:scale-105 transition-all animate-press">
            <AvatarImage src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200&h=200&fit=crop" />
            <AvatarFallback>🐕</AvatarFallback>
          </Avatar>
          <Avatar className="w-20 h-20 border-4 border-background shadow-lg opacity-60 hover:opacity-100 cursor-pointer hover:scale-105 transition-all animate-press">
            <AvatarImage src="https://images.unsplash.com/photo-1560807707-8cc77767d783?w=200&h=200&fit=crop" />
            <AvatarFallback>🐕</AvatarFallback>
          </Avatar>
        </div>

        <div className="text-center animate-slide-up">
          <h2 className="text-2xl font-bold mb-1">הוקי ארביב</h2>
          <p className="text-sm text-muted-foreground font-medium">גיל 1.5</p>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="px-6 grid grid-cols-2 gap-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          
          if (feature.external) {
            return (
              <a
                key={index}
                href={feature.path}
                target="_blank"
                rel="noopener noreferrer"
                style={{ animationDelay: `${index * 100}ms` }}
                className={`${feature.color} p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 shadow-md hover:shadow-xl rounded-lg border bg-card text-card-foreground animate-scale-in`}
              >
                <div className="w-16 h-16 rounded-2xl bg-background/20 backdrop-blur-sm flex items-center justify-center transition-transform group-hover:scale-110">
                  <Icon className="w-8 h-8" />
                </div>
                <span className="font-bold text-center">{feature.label}</span>
              </a>
            );
          }
          
          return (
            <Card
              key={index}
              onClick={() => navigate(feature.path)}
              style={{ animationDelay: `${index * 100}ms` }}
              className={`${feature.color} p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 shadow-md hover:shadow-xl animate-scale-in group`}
            >
              <div className="w-16 h-16 rounded-2xl bg-background/20 backdrop-blur-sm flex items-center justify-center transition-transform group-hover:scale-110">
                <Icon className="w-8 h-8" />
              </div>
              <span className="font-bold text-center">{feature.label}</span>
            </Card>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
