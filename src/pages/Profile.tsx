import { ChevronLeft, Camera, Mail, Phone, MapPin, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useState } from "react";

const Profile = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="bg-background border-b border-border/50 p-6 sticky top-0 z-10 backdrop-blur-sm bg-background/95">
        <div className="flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full hover:bg-muted animate-press"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">פרופיל אישי</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="rounded-xl hover:bg-muted animate-press font-semibold"
          >
            {isEditing ? "שמור" : "ערוך"}
          </Button>
        </div>
      </div>

      {/* Avatar Section */}
      <div className="px-6 pt-8 pb-6">
        <div className="flex flex-col items-center animate-scale-in">
          <div className="relative group">
            <Avatar className="w-28 h-28 border-2 border-border shadow-md">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" />
              <AvatarFallback className="bg-muted text-foreground font-bold text-3xl">
                יי
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <Button
                size="icon"
                className="absolute bottom-0 left-0 w-9 h-9 rounded-full bg-foreground hover:bg-foreground/90 shadow-md"
              >
                <Camera className="w-4 h-4" />
              </Button>
            )}
          </div>
          <h2 className="text-xl font-bold mt-4 mb-1">ישראל ישראלי</h2>
          <p className="text-sm text-muted-foreground">משתמש מאז 2024</p>
        </div>
      </div>

      {/* Profile Form */}
      <div className="px-6 space-y-4">
        <Card className="border border-border rounded-2xl p-5 animate-scale-in" style={{ animationDelay: "100ms" }}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-semibold mb-2 block">
                שם מלא
              </Label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <Input
                  id="name"
                  defaultValue="ישראל ישראלי"
                  disabled={!isEditing}
                  className="border-border rounded-xl disabled:opacity-100 disabled:bg-transparent"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-semibold mb-2 block">
                אימייל
              </Label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <Input
                  id="email"
                  type="email"
                  defaultValue="israel@example.com"
                  disabled={!isEditing}
                  className="border-border rounded-xl disabled:opacity-100 disabled:bg-transparent"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-semibold mb-2 block">
                טלפון
              </Label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <Input
                  id="phone"
                  type="tel"
                  defaultValue="050-1234567"
                  disabled={!isEditing}
                  className="border-border rounded-xl disabled:opacity-100 disabled:bg-transparent"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location" className="text-sm font-semibold mb-2 block">
                מיקום
              </Label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <Input
                  id="location"
                  defaultValue="תל אביב, ישראל"
                  disabled={!isEditing}
                  className="border-border rounded-xl disabled:opacity-100 disabled:bg-transparent"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="joined" className="text-sm font-semibold mb-2 block">
                תאריך הצטרפות
              </Label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <Input
                  id="joined"
                  defaultValue="ינואר 2024"
                  disabled
                  className="border-border rounded-xl disabled:opacity-100 disabled:bg-transparent"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Card */}
        <Card className="border border-border rounded-2xl p-5 animate-scale-in" style={{ animationDelay: "150ms" }}>
          <h3 className="text-sm font-bold mb-4">סטטיסטיקה</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">3</p>
              <p className="text-xs text-muted-foreground">חיות מחמד</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">45</p>
              <p className="text-xs text-muted-foreground">ביקורים בגינות</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs text-muted-foreground">טיפולים</p>
            </div>
          </div>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
