import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen overflow-hidden bg-background" dir="rtl">
      <div className="h-full overflow-y-auto pb-[70px]">
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="חזרה">
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">מדיניות פרטיות</h1>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-7">
          <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground">
            <h2>המידע שנשמר ב-MIPO</h2>
            <p>
              לצורך הפעלת השירות אנו שומרים פרטי חשבון וקשר, פרופיל חיות מחמד, מידע רפואי
              שבחרתם להזין, מסמכים, תביעות ביטוח, פניות שירות ופרטי הזמנות ומשלוח. איננו
              מקבלים או שומרים את מספר כרטיס האשראי המלא; תהליך התשלום מתבצע אצל CardCom.
            </p>

            <h2>כיצד המידע משמש</h2>
            <p>
              המידע משמש להפעלת החשבון, הצגת נתוני החיה, טיפול בהזמנות, תמיכה, אבטחה ושיפור
              תקלות. הודעות שיווקיות נשלחות רק בהתאם לבחירה שנשמרת בחשבון וניתן לבטל אותה
              בהגדרות.
            </p>

            <h2>שירותי צד שלישי</h2>
            <ul>
              <li>AWS Lightsail ו-AWS RDS משמשים להפעלת היישום ומסד הנתונים.</li>
              <li>CardCom מעבד תשלומים, ו-Resend משמש לשליחת הודעות איפוס סיסמה.</li>
              <li>
                Google Gemini מקבל תוכן צ'אט, פרטי חיה או קבצים רק לאחר הסכמה מפורשת לעיבוד
                באמצעות AI. ניתן לבטל את ההסכמה בהגדרות; לאחר הביטול לא נשלחות בקשות AI חדשות.
              </li>
              <li>
                פעולות מיקום אופציונליות עשויות לפנות לשירותי מפה, מזג אוויר או קידוד גאוגרפי,
                ובהם Google Maps, BigDataCloud ו-Open-Meteo, רק לאחר בחירה או הרשאת מיקום בדפדפן.
              </li>
            </ul>

            <h2>הרשאות מיקום וסריקת תג</h2>
            <p>
              פתיחת עמוד של תג חיה אינה מבקשת מיקום מדויק. שיתוף מיקום עם בעלים או פתיחת
              שירות מפות נעשים רק בעקבות פעולה יזומה והרשאת הדפדפן. המערכת עשויה לשמור אירוע
              סריקה בסיסי לצורכי תפעול ומניעת שימוש לרעה, ללא מיקום מדויק.
            </p>

            <h2>אבטחה וגישה</h2>
            <p>
              התעבורה הציבורית מוגשת ב-HTTPS. עוגיות התחברות אינן זמינות לקוד JavaScript,
              ומסמכים רפואיים וקבצים פרטיים נשלחים רק לאחר בדיקת חשבון בצד השרת. אין אמצעי
              אבטחה שמבטיח חסינות מוחלטת, ולכן אנו מצמצמים את המידע שנחשף לכל מסלול.
            </p>

            <h2>שמירה, ייצוא ומחיקה</h2>
            <p>
              ניתן לייצא את נתוני החשבון ולמחוק אותו מתוך מסך ההגדרות. המחיקה מסירה את
              החשבון, פרופילי החיות והקבצים הפרטיים. רשומות הזמנה שנדרשות לתפעול או לחובה
              חוקית נשמרות לאחר הסרת השם, פרטי הקשר, כתובת המשלוח והשיוך לחשבון.
            </p>

            <h2>הבחירות שלכם</h2>
            <p>
              בהגדרות ניתן לשנות חשיפת פרופיל, הסכמה לשיווק והסכמה לעיבוד AI. הרשאות מיקום
              והתראות מנוהלות גם בהגדרות הדפדפן או המכשיר.
            </p>

            <h2>יצירת קשר</h2>
            <p>
              לשאלות פרטיות או לסיוע במחיקה: <a href="mailto:privacy@mipo.pet">privacy@mipo.pet</a>.
            </p>

            <p className="text-xs text-muted-foreground">עודכן לאחרונה: 10 ביולי 2026</p>
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
};

export default Privacy;
