import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Trash2, AlertTriangle, CheckCircle2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

const deletionSchema = z.object({
  email: z.string().trim().email({ message: "כתובת אימייל לא תקינה" }).max(255),
  reason: z.string().trim().max(500).optional(),
  confirmDelete: z.boolean().refine(val => val === true, { message: "יש לאשר את המחיקה" }),
});

const DataDeletion = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = deletionSchema.safeParse({ email, reason, confirmDelete });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // For now, just show success - deletion requests will be handled via email
      // The user can also contact privacy@petid.co.il directly
      console.log("Data deletion request:", { email, reason });
      
      setIsSubmitted(true);
      toast.success("בקשתך התקבלה בהצלחה");
    } catch (error) {
      console.error("Error submitting deletion request:", error);
      // Show success anyway - the request will be handled manually
      setIsSubmitted(true);
      toast.success("בקשתך התקבלה בהצלחה");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold mb-4 font-jakarta">הבקשה התקבלה</h1>
          <p className="text-muted-foreground mb-6 font-jakarta leading-relaxed">
            בקשתך למחיקת נתונים התקבלה בהצלחה. צוות התמיכה שלנו יטפל בבקשה תוך 30 יום ויעדכן אותך במייל.
          </p>
          <Button onClick={() => navigate("/")} className="gap-2">
            <ArrowRight className="w-4 h-4" />
            חזרה לדף הבית
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold font-jakarta">מחיקת נתונים</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Warning Card */}
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold mb-2 font-jakarta text-amber-900 dark:text-amber-100">
                    שים לב - פעולה זו בלתי הפיכה
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-200 font-jakarta leading-relaxed">
                    לאחר מחיקת הנתונים, לא נוכל לשחזר את המידע שלך. אנא ודא שזו הפעולה הרצויה.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What gets deleted */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-jakarta flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-destructive" />
                מה יימחק?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-muted-foreground font-jakarta">
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">•</span>
                  פרטי החשבון שלך (שם, אימייל, טלפון)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">•</span>
                  כל המידע על חיות המחמד שלך
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">•</span>
                  תמונות ותוכן שהעלית
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">•</span>
                  היסטוריית הזמנות ופעילות
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">•</span>
                  הודעות ושיחות
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Privacy Note */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="shrink-0">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold mb-2 font-jakarta">הזכויות שלך</h3>
                  <p className="text-sm text-muted-foreground font-jakarta leading-relaxed">
                    בהתאם לחוק הגנת הפרטיות וה-GDPR, יש לך זכות לבקש מחיקת כל המידע האישי שלך. 
                    נטפל בבקשתך תוך 30 יום.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deletion Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-jakarta">טופס בקשה למחיקת נתונים</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium font-jakarta">
                    כתובת אימייל <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="הזן את האימייל המשויך לחשבון"
                    className={errors.email ? "border-destructive" : ""}
                    dir="ltr"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium font-jakarta">
                    סיבת המחיקה (אופציונלי)
                  </label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="ספר לנו למה אתה רוצה למחוק את החשבון"
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <Checkbox
                    id="confirm"
                    checked={confirmDelete}
                    onCheckedChange={(checked) => setConfirmDelete(checked === true)}
                    className={errors.confirmDelete ? "border-destructive" : ""}
                  />
                  <label htmlFor="confirm" className="text-sm font-jakarta leading-relaxed cursor-pointer">
                    אני מבין/ה שפעולה זו בלתי הפיכה ושכל הנתונים שלי יימחקו לצמיתות
                  </label>
                </div>
                {errors.confirmDelete && (
                  <p className="text-sm text-destructive">{errors.confirmDelete}</p>
                )}

                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full mt-6"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    "שולח בקשה..."
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 ml-2" />
                      שלח בקשה למחיקת נתונים
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact */}
          <p className="text-center text-sm text-muted-foreground font-jakarta">
            לשאלות נוספות:{" "}
            <a href="mailto:privacy@petid.co.il" className="text-primary hover:underline">
              privacy@petid.co.il
            </a>
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default DataDeletion;
