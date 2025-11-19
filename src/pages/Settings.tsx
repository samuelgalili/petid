import { ChevronLeft, User, Bell, Globe, Lock, Info, LogOut, Moon, Sun } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";

const Settings = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [location, setLocation] = useState(true);

  const settingsSections = [
    {
      title: "חשבון",
      items: [
        {
          icon: User,
          label: "פרופיל אישי",
          description: "ערוך את הפרטים האישיים שלך",
          action: () => navigate("/profile"),
          type: "link",
        },
      ],
    },
    {
      title: "העדפות",
      items: [
        {
          icon: Bell,
          label: "התראות",
          description: "קבל עדכונים על חיית המחמד שלך",
          action: () => setNotifications(!notifications),
          type: "toggle",
          value: notifications,
        },
        {
          icon: darkMode ? Moon : Sun,
          label: "מצב כהה",
          description: "שנה את מראה האפליקציה",
          action: () => setDarkMode(!darkMode),
          type: "toggle",
          value: darkMode,
        },
        {
          icon: Globe,
          label: "מיקום",
          description: "אפשר שירותי מיקום",
          action: () => setLocation(!location),
          type: "toggle",
          value: location,
        },
      ],
    },
    {
      title: "פרטיות ואבטחה",
      items: [
        {
          icon: Lock,
          label: "פרטיות",
          description: "נהל את ההגדרות שלך",
          action: () => {},
          type: "link",
        },
      ],
    },
    {
      title: "מידע",
      items: [
        {
          icon: Info,
          label: "אודות",
          description: "גרסה 1.0.0",
          action: () => {},
          type: "link",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="bg-background border-b border-border/50 p-6 sticky top-0 z-10 backdrop-blur-sm bg-background/95">
        <div className="flex items-center gap-4 animate-slide-up">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full hover:bg-muted animate-press"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">הגדרות</h1>
        </div>
      </div>

      {/* Profile Card */}
      <div className="px-6 pt-6 pb-4">
        <Card className="border border-border rounded-2xl p-5 hover:shadow-md transition-shadow animate-scale-in">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-border">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" />
              <AvatarFallback className="bg-muted text-foreground font-bold">יי</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-bold text-base mb-0.5">ישראל ישראלי</h3>
              <p className="text-sm text-muted-foreground">israel@example.com</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl hover:bg-muted animate-press"
              onClick={() => navigate("/profile")}
            >
              ערוך
            </Button>
          </div>
        </Card>
      </div>

      {/* Settings Sections */}
      <div className="px-6 space-y-6">
        {settingsSections.map((section, sectionIndex) => (
          <div
            key={sectionIndex}
            className="animate-scale-in"
            style={{ animationDelay: `${(sectionIndex + 1) * 50}ms` }}
          >
            <h2 className="text-sm font-bold text-muted-foreground mb-3 mr-1">
              {section.title}
            </h2>
            <Card className="border border-border rounded-2xl overflow-hidden">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <div key={itemIndex}>
                    {itemIndex > 0 && <Separator className="bg-border" />}
                    <div
                      onClick={item.type === "link" ? item.action : undefined}
                      className={`flex items-center gap-4 p-4 transition-colors ${
                        item.type === "link"
                          ? "cursor-pointer hover:bg-muted/30 active:bg-muted/50"
                          : ""
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-0.5">{item.label}</h3>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      {item.type === "toggle" && (
                        <Switch
                          checked={item.value}
                          onCheckedChange={item.action}
                          className="flex-shrink-0"
                        />
                      )}
                      {item.type === "link" && (
                        <ChevronLeft className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        ))}

        {/* Logout Button */}
        <Card
          className="border border-border rounded-2xl overflow-hidden cursor-pointer hover:bg-destructive/5 active:bg-destructive/10 transition-colors animate-scale-in"
          style={{ animationDelay: `${(settingsSections.length + 1) * 50}ms` }}
        >
          <div className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-destructive">התנתק</h3>
            </div>
          </div>
        </Card>

        {/* App Version */}
        <div className="text-center py-6 animate-fade-in" style={{ animationDelay: "400ms" }}>
          <p className="text-xs text-muted-foreground">Pet Care App</p>
          <p className="text-xs text-muted-foreground">גרסה 1.0.0</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;
