import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-background overflow-hidden" dir="rtl">
      <div className="h-full overflow-y-auto pb-[70px]">
      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
          </Button>
          <h1 className="text-xl font-bold text-foreground font-jakarta">מדיניות פרטיות</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="prose prose-sm max-w-none text-foreground">
          <h2 className="text-lg font-bold mb-4 font-jakarta">מדיניות הפרטיות של Petid</h2>
          
          <p className="text-muted-foreground mb-4 font-jakarta leading-relaxed">
            פרטיותכם חשובה לנו. מדיניות זו מסבירה כיצד אנו אוספים, משתמשים ומגנים על המידע שלכם.
          </p>

          <h3 className="text-base font-bold mt-6 mb-3 font-jakarta">מידע שאנו אוספים</h3>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground font-jakarta">
            <li>פרטי הרשמה (שם, דוא"ל, טלפון)</li>
            <li>מידע על חיות המחמד שלכם</li>
            <li>תמונות ותוכן שאתם מעלים</li>
            <li>נתוני שימוש באפליקציה</li>
            <li>מידע מיקום (באישורכם)</li>
          </ul>

          <h3 className="text-base font-bold mt-6 mb-3 font-jakarta">שימוש במידע</h3>
          <p className="text-muted-foreground font-jakarta leading-relaxed">
            אנו משתמשים במידע שלכם כדי לספק ולשפר את השירותים שלנו, 
            להתאים תוכן אישית, ולשלוח עדכונים רלוונטיים.
          </p>

          <h3 className="text-base font-bold mt-6 mb-3 font-jakarta">אבטחת מידע</h3>
          <p className="text-muted-foreground font-jakarta leading-relaxed">
            אנו מיישמים אמצעי אבטחה מתקדמים להגנה על המידע שלכם, 
            כולל הצפנה ואחסון מאובטח.
          </p>

          <h3 className="text-base font-bold mt-6 mb-3 font-jakarta">יצירת קשר</h3>
          <p className="text-muted-foreground font-jakarta leading-relaxed">
            לשאלות בנושא פרטיות: privacy@petid.co.il
          </p>

          <p className="text-xs text-muted-foreground/60 mt-8 font-jakarta">
            עודכן לאחרונה: דצמבר 2025
          </p>
        </div>
      </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Privacy;