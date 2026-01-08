import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const Accessibility = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
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
          <h1 className="text-xl font-bold text-foreground font-jakarta">הצהרת נגישות</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="prose prose-sm max-w-none text-foreground">
          <h2 className="text-lg font-bold mb-4 font-jakarta">התחייבות לנגישות</h2>
          <p className="text-muted-foreground mb-4 font-jakarta leading-relaxed">
            Petid מחויבת להנגשת האפליקציה לכלל המשתמשים, כולל אנשים עם מוגבלויות.
            אנו פועלים בהתאם לתקן הישראלי ת"י 5568 ולהנחיות WCAG 2.1 ברמת AA.
          </p>

          <h3 className="text-base font-bold mt-6 mb-3 font-jakarta">פעולות שננקטו</h3>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground font-jakarta">
            <li>התאמה לתוכנות קוראי מסך</li>
            <li>ניווט באמצעות מקלדת</li>
            <li>ניגודיות צבעים מספקת</li>
            <li>תמיכה בהגדלת טקסט</li>
            <li>טקסט חלופי לתמונות</li>
            <li>מבנה כותרות היררכי</li>
          </ul>

          <h3 className="text-base font-bold mt-6 mb-3 font-jakarta">יצירת קשר</h3>
          <p className="text-muted-foreground font-jakarta leading-relaxed">
            נתקלתם בבעיית נגישות? נשמח לשמוע ולטפל בהקדם.
            <br />
            דוא"ל: accessibility@petid.co.il
          </p>

          <p className="text-xs text-muted-foreground/60 mt-8 font-jakarta">
            עודכן לאחרונה: דצמבר 2025
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Accessibility;