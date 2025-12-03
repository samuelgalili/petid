import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
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
          <h1 className="text-xl font-bold text-foreground font-jakarta">תנאי שימוש</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="prose prose-sm max-w-none text-foreground">
          <h2 className="text-lg font-bold mb-4 font-jakarta">תנאי השימוש באפליקציית Petid</h2>
          
          <p className="text-muted-foreground mb-4 font-jakarta leading-relaxed">
            ברוכים הבאים ל-Petid. השימוש באפליקציה מהווה הסכמה לתנאים אלה.
          </p>

          <h3 className="text-base font-bold mt-6 mb-3 font-jakarta">שימוש מותר</h3>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground font-jakarta">
            <li>ניהול פרופילים של חיות מחמד</li>
            <li>שיתוף תוכן ברשת החברתית Petish</li>
            <li>רכישת מוצרים בחנות</li>
            <li>שימוש בשירותים נוספים כמפורט באפליקציה</li>
          </ul>

          <h3 className="text-base font-bold mt-6 mb-3 font-jakarta">תוכן משתמשים</h3>
          <p className="text-muted-foreground font-jakarta leading-relaxed">
            אתם אחראים לתוכן שאתם מעלים. אין להעלות תוכן פוגעני, 
            לא חוקי או מפר זכויות יוצרים.
          </p>

          <h3 className="text-base font-bold mt-6 mb-3 font-jakarta">קניין רוחני</h3>
          <p className="text-muted-foreground font-jakarta leading-relaxed">
            כל הזכויות באפליקציה, כולל עיצוב, לוגו ותוכן, שמורות ל-Petid.
          </p>

          <h3 className="text-base font-bold mt-6 mb-3 font-jakarta">הגבלת אחריות</h3>
          <p className="text-muted-foreground font-jakarta leading-relaxed">
            השירות מסופק "כמות שהוא". איננו אחראים לנזקים הנובעים משימוש באפליקציה.
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

export default Terms;