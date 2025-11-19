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
    },
    {
      icon: MapPin,
      label: "גינות כלבים",
      color: "bg-green text-green-foreground",
      path: "/parks",
    },
    {
      icon: Heart,
      label: "חניות חיות",
      color: "bg-purple text-purple-foreground",
      path: "/shop",
    },
    {
      icon: Scissors,
      label: "טיפורים",
      color: "bg-pink text-pink-foreground",
      path: "/grooming",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-b from-muted to-background p-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Menu className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">שלום,</p>
              <p className="font-bold">ישראל ישראלי</p>
            </div>
            <Avatar className="w-12 h-12 border-2 border-background shadow-md">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" />
              <AvatarFallback>יי</AvatarFallback>
            </Avatar>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="w-6 h-6" />
          </Button>
        </div>

        {/* Pet Avatars */}
        <div className="flex justify-center gap-4 mb-4">
          <Avatar className="w-20 h-20 border-4 border-background shadow-lg ring-2 ring-coral">
            <AvatarImage src="https://images.unsplash.com/photo-1568572933382-74d440642117?w=200&h=200&fit=crop" />
            <AvatarFallback>🐕</AvatarFallback>
          </Avatar>
          <Avatar className="w-20 h-20 border-4 border-background shadow-lg opacity-60">
            <AvatarImage src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200&h=200&fit=crop" />
            <AvatarFallback>🐕</AvatarFallback>
          </Avatar>
          <Avatar className="w-20 h-20 border-4 border-background shadow-lg opacity-60">
            <AvatarImage src="https://images.unsplash.com/photo-1560807707-8cc77767d783?w=200&h=200&fit=crop" />
            <AvatarFallback>🐕</AvatarFallback>
          </Avatar>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold mb-1">הוקי ארביב</h2>
          <p className="text-sm text-muted-foreground">גיל 1.5</p>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="px-6 grid grid-cols-2 gap-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card
              key={index}
              onClick={() => navigate(feature.path)}
              className={`${feature.color} p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:scale-105 transition-transform shadow-md`}
            >
              <div className="w-16 h-16 rounded-2xl bg-background/20 flex items-center justify-center">
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
