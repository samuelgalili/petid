import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const ClubTerms = () => {
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
          <h1 className="text-xl font-bold text-foreground font-jakarta">תנאי המועדון</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="prose prose-sm max-w-none text-foreground">
          <h2 className="text-lg font-bold mb-4 font-jakarta">מועדון הלקוחות של Petid</h2>
          
          <p className="text-muted-foreground mb-4 font-jakarta leading-relaxed">
            ברוכים הבאים למועדון הלקוחות של Petid! להלן תנאי החברות במועדון.
          </p>

          <h3 className="text-base font-bold mt-6 mb-3 font-jakarta">הצטרפות למועדון</h3>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground font-jakarta">
            <li>ההצטרפות למועדון חינמית</li>
            <li>יש להירשם עם פרטים אמיתיים</li>
            <li>החברות אישית ואינה ניתנת להעברה</li>
          </ul>

          <h3 className="text-base font-bold mt-6 mb-3 font-jakarta">צבירת נקודות</h3>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground font-jakarta">
            <li>נקודה אחת על כל ₪1 רכישה</li>
            <li>נקודות בונוס על משימות יומיות</li>
            <li>נקודות על פעילות ברשת החברתית</li>
          </ul>

          <h3 className="text-base font-bold mt-6 mb-3 font-jakarta">מימוש נקודות</h3>
          <p className="text-muted-foreground font-jakarta leading-relaxed">
            ניתן לממש נקודות להנחות על מוצרים, שירותים בלעדיים ומתנות.
            100 נקודות = ₪10 הנחה.
          </p>

          <h3 className="text-base font-bold mt-6 mb-3 font-jakarta">תוקף נקודות</h3>
          <p className="text-muted-foreground font-jakarta leading-relaxed">
            נקודות תקפות למשך 12 חודשים מיום צבירתן.
          </p>

          <h3 className="text-base font-bold mt-6 mb-3 font-jakarta">הטבות חברי מועדון</h3>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground font-jakarta">
            <li>הנחות בלעדיות על מוצרים</li>
            <li>גישה מוקדמת למבצעים</li>
            <li>משלוח חינם בהזמנות מעל ₪150</li>
            <li>הפתעות יום הולדת לחיית המחמד</li>
          </ul>

          <p className="text-xs text-muted-foreground/60 mt-8 font-jakarta">
            עודכן לאחרונה: דצמבר 2025
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ClubTerms;