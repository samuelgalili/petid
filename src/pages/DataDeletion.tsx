import { AlertTriangle, ArrowRight, LogIn, Settings, Shield, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

const DataDeletion = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="חזרה">
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">מחיקת חשבון ונתונים</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
        <Card className="border-destructive/25 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              פעולה בלתי הפיכה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              מחיקת החשבון מסירה את הפרופיל, חיות המחמד, המסמכים הפרטיים ונתוני החשבון
              המשויכים אליך. לפני המחיקה האפליקציה מכינה קובץ JSON עם הנתונים הזמינים לייצוא.
            </p>
            <p>
              רשומות הזמנה שנדרשות לצורכי תפעול או חובה חוקית נשמרות ללא שיוך לחשבון, לאחר
              הסרת פרטי הקשר וכתובת המשלוח.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              אימות בעלות על החשבון
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              מטעמי אבטחה, מחיקה מתבצעת רק מתוך חשבון מחובר. איננו אוספים כתובת אימייל או
              סיבת מחיקה בטופס ציבורי, ואיננו מציגים אישור לבקשה שלא נשלחה.
            </p>

            {!loading && user ? (
              <Button className="w-full gap-2" onClick={() => navigate("/settings")}>
                <Settings className="h-4 w-4" />
                מעבר להגדרות החשבון
              </Button>
            ) : (
              <Button className="w-full gap-2" onClick={() => navigate("/auth")} disabled={loading}>
                <LogIn className="h-4 w-4" />
                {loading ? "בודק מצב התחברות..." : "התחברות כדי למחוק את החשבון"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-3 pt-6">
            <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-foreground">זקוקים לעזרה לפני הכניסה?</p>
              <p className="text-muted-foreground">
                פנו אלינו בכתובת{" "}
                <a className="font-medium text-primary underline-offset-4 hover:underline" href="mailto:privacy@mipo.pet">
                  privacy@mipo.pet
                </a>
                . אל תשלחו במסר מסמכים רפואיים, סיסמאות או פרטי תשלום.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DataDeletion;
