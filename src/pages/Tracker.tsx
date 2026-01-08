import { ChevronRight, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import BottomNav from "@/components/BottomNav";
import { AppHeader } from "@/components/AppHeader";

const Tracker = () => {
  const days = [
    { day: "יום ב'", date: "24" },
    { day: "יום ג'", date: "25" },
    { day: "יום ד'", date: "26" },
    { day: "יום ה'", date: "27" },
    { day: "יום ו'", date: "28" },
    { day: "שבת", date: "29" },
    { day: "יום א'", date: "30" },
  ];

  const activities = [
    { time: "8:00", activity: "טיול", icon: "🦴" },
    { time: "10:20", activity: "אוכל", icon: "🍖" },
    { time: "12:30", activity: "זמן משחק", icon: "🎾" },
    { time: "16:30", activity: "רופא", icon: "💊" },
    { time: "17:00", activity: "חצר כלבה", icon: "🏃" },
  ];

  const quickActions = [
    { icon: "💤", label: "שינה", color: "bg-primary/10" },
    { icon: "💩", label: "צרכים", color: "bg-secondary" },
    { icon: "🦴", label: "טיול", color: "bg-accent/10" },
    { icon: "🍖", label: "אוכל", color: "bg-success/10" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      <AppHeader title="יומן מעקב" showBackButton={true} />

      {/* User Info Section */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="w-12 h-12 border-2 border-background shadow-md">
            <AvatarImage src="https://images.unsplash.com/photo-1568572933382-74d440642117?w=200&h=200&fit=crop" />
            <AvatarFallback>🐕</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-right">
            <p className="text-sm text-muted-foreground">שלום,</p>
            <p className="font-semibold">הוקי ארביב</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-4">
          <p className="text-sm font-medium mb-2">מעקב אחר התקדמות</p>
          <div className="grid grid-cols-4 gap-2">
            {quickActions.map((action, index) => (
              <Card
                key={index}
                className={`${action.color} p-3 flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform border-0`}
              >
                <span className="text-2xl">{action.icon}</span>
                <span className="text-xs font-medium">{action.label}</span>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="px-4 mb-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <ChevronRight className="w-5 h-5 cursor-pointer text-muted-foreground" />
            <span className="font-semibold">12-2024</span>
            <ChevronRight className="w-5 h-5 cursor-pointer rotate-180 text-muted-foreground" />
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => (
              <div
                key={index}
                className={`text-center ${
                  index === 0 ? "bg-primary text-primary-foreground rounded-xl p-2" : "p-2"
                }`}
              >
                <div className="text-xs mb-1">{day.day}</div>
                <div className="font-semibold">{day.date}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Schedule */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">פעולה</h2>
          <span className="text-sm text-muted-foreground">זמן</span>
        </div>

        <div className="space-y-3">
          {activities.map((item, index) => (
            <Card key={index} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <span className="font-medium">{item.activity}</span>
              </div>
              <span className="text-sm text-muted-foreground">{item.time}</span>
            </Card>
          ))}
        </div>

        <Button className="w-full mt-4 rounded-xl h-11">
          <Plus className="w-5 h-5 ml-2" />
          הוספה
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Tracker;
