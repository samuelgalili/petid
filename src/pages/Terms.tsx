import { ArrowRight, ScrollText, Users, ShoppingBag, Shield, Scale, FileText, Bell, Lock, AlertTriangle, Building, Heart, Brain, Cookie, Database, Server } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";

const Terms = () => {
  const navigate = useNavigate();

  const sections = [
    {
      icon: ScrollText,
      title: "1. מבוא והגדרות",
      items: [
        "אתר האינטרנט petid.co.il ואפליקציית PetID מהווים יחד פלטפורמה דיגיטלית אחת ומשולבת המופעלת על ידי יובל דיגיטל, ע.פ. 036574564, להלן החברה.",
        "הפלטפורמה משמשת כקהילה חברתית לבעלי חיות מחמד וכן כפלטפורמה להזמנת ורכישת מוצרים פיזיים, לשיתוף תכנים, לניהול פרופילים אישיים ועסקיים, לקבלת תזכורות, המלצות ושירותים חכמים.",
        "כל שימוש בפלטפורמה מהווה הסכמה מלאה ובלתי חוזרת לתקנון זה ולמדיניות הפרטיות.",
        "התקנון מנוסח בלשון זכר מטעמי נוחות בלבד ומתייחס לכל המינים.",
        "החברה רשאית לעדכן את התקנון בכל עת והמשך שימוש בפלטפורמה מהווה הסכמה לנוסח המעודכן."
      ]
    },
    {
      icon: FileText,
      title: "2. מהות השירות",
      items: [
        "PetID פועלת בדומה לרשת חברתית ומאפשרת יצירת פרופילים, שיתוף תכנים, מעקב אחר משתמשים אחרים, פיד תוכן, דירוגים והמלצות.",
        "הפלטפורמה עשויה לכלול אלגוריתמים, בינה מלאכותית, התאמות אישיות והתראות.",
        "החברה אינה מתחייבת להפעיל פונקציה מסוימת או לשמור על מבנה קבוע של השירות."
      ]
    },
    {
      icon: Users,
      title: "3. גיל שימוש וגיל רכישה",
      items: [
        "השימוש בפלטפורמה מותר למשתמשים מגיל 13 ומעלה.",
        "משתמש שטרם מלאו לו 18 שנים מצהיר כי קיבל את הסכמת הוריו או אפוטרופוס חוקי.",
        "רכישת מוצרים ותשלומים מותרים לבני 18 ומעלה בלבד.",
        "קטין רשאי לבצע רכישה רק באמצעות הורה או אפוטרופוס ובאמצעי תשלום השייך להם.",
        "ביצוע רכישה מהווה הצהרה לעמידה בתנאי גיל אלו."
      ]
    },
    {
      icon: Lock,
      title: "4. חשבון משתמש ואחריות",
      items: [
        "המשתמש אחראי לשמירת פרטי ההתחברות לחשבונו.",
        "כל פעולה שתבוצע באמצעות החשבון תיחשב כפעולה שבוצעה על ידי המשתמש.",
        "החברה אינה אחראית לשימוש בלתי מורשה בחשבון."
      ]
    },
    {
      icon: FileText,
      title: "5. תוכן משתמשים ורישיון שימוש",
      items: [
        "המשתמש שומר על זכויות הקניין הרוחני בתכנים שהוא מעלה.",
        "עם העלאת תוכן מעניק המשתמש לחברה רישיון חינמי, עולמי, בלתי בלעדי, ניתן להעברה ובלתי ניתן לביטול להשתמש בתוכן לצורך הפעלת הפלטפורמה, הצגתו, הפצתו, שיתופו וקידומו.",
        "החברה לא תשלם תמורה בגין שימוש בתוכן משתמש.",
        "המשתמש מצהיר כי התוכן חוקי ואינו מפר זכויות צד שלישי."
      ]
    },
    {
      icon: Shield,
      title: "6. כללי קהילה והתנהלות",
      items: [
        "הפלטפורמה נועדה לשמש קהילה מכבדת ובטוחה.",
        "חל איסור לפרסם תכנים פוגעניים, מטעים, אלימים, מסיתים או תכנים הכוללים התעללות או הזנחה של בעלי חיים.",
        "החברה רשאית להסיר תכנים, להגביל חשיפה או לחסום משתמשים לפי שיקול דעתה וללא הודעה מוקדמת."
      ]
    },
    {
      icon: AlertTriangle,
      title: "7. דיווח ובקרה",
      items: [
        "משתמשים רשאים לדווח על תכנים או התנהלות מפרים.",
        "החברה אינה מתחייבת לטפל בכל דיווח או לפעול בעקבותיו."
      ]
    },
    {
      icon: Brain,
      title: "8. פיד, חשיפה ואלגוריתמים",
      items: [
        "הפלטפורמה עושה שימוש בפיד, דירוגים והמלצות, לרבות באמצעות בינה מלאכותית.",
        "החברה אינה מתחייבת לחשיפה, דירוג, סדר הופעה, מספר צפיות או עוקבים.",
        "החברה רשאית לשנות את אופן הצגת התכנים בכל עת."
      ]
    },
    {
      icon: Heart,
      title: "9. אימוץ בעלי חיים",
      items: [
        "הפלטפורמה עשויה לכלול תכנים או פיצ'רים הקשורים לאימוץ בעלי חיים.",
        "החברה אינה צד לתהליך האימוץ ואינה אחראית להתאמה בין הצדדים או למצב הבריאותי של בעלי החיים.",
        "בדיקות התאמה, בדיקות רפואיות ותנאי החזקה הם באחריות הצדדים בלבד."
      ]
    },
    {
      icon: Building,
      title: "10. עסקים ופרופילים עסקיים",
      items: [
        "הפלטפורמה מאפשרת ניהול פרופילים עסקיים.",
        "האחריות למידע, למוצרים, לשירותים, למחירים ולאספקה חלה על העסק בלבד.",
        "החברה אינה צד לעסקאות בין עסקים למשתמשים.",
        "תכנים שיווקיים או פרסום ממומן יוצגו בהתאם לדין ולשיקולי החברה."
      ]
    },
    {
      icon: ShoppingBag,
      title: "11. רכישת מוצרים וסליקה",
      items: [
        "הפלטפורמה מאפשרת רכישת מוצרים פיזיים בלבד.",
        "הרכישות מתבצעות בתוך האפליקציה באמצעות ספק סליקה חיצוני Cardcom באמצעות API.",
        "החברה אינה אחראית לתקלות או כשלים שמקורם בספק הסליקה.",
        "בעתיד, אם יוצעו מוצרים או שירותים דיגיטליים, החיוב יותאם למדיניות חנויות האפליקציות."
      ]
    },
    {
      icon: ShoppingBag,
      title: "12. משלוחים, ביטולים והחזרים",
      items: [
        "אספקת המוצרים תתבצע לכתובת שנמסרה על ידי הלקוח.",
        "זמני האספקה משוערים.",
        "ביטול עסקה והחזר כספי יבוצעו בהתאם לחוק הגנת הצרכן.",
        "מוצרים מתכלים או שנפתחו אינם ניתנים להחזרה."
      ]
    },
    {
      icon: Brain,
      title: "13. מידע, המלצות ובינה מלאכותית",
      items: [
        "תכנים, המלצות ותזכורות ניתנים לצורכי מידע בלבד.",
        "אין בתכנים אלו משום ייעוץ רפואי, וטרינרי או מקצועי.",
        "האחריות להסתמכות על מידע זה חלה על המשתמש בלבד."
      ]
    },
    {
      icon: Cookie,
      title: "14. תקשורת, הודעות ועוגיות",
      items: [
        "החברה רשאית לשלוח הודעות באמצעות Push, דוא\"ל, SMS או WhatsApp.",
        "הפלטפורמה עושה שימוש בקובצי עוגיות וטכנולוגיות דומות לצורך תפעול, אבטחה, אנליטיקה ושיפור חוויית המשתמש.",
        "המשתמש רשאי לנהל את הגדרות העוגיות באמצעות המכשיר או הדפדפן."
      ]
    },
    {
      icon: Database,
      title: "15. פרטיות, גישה לנתונים והזכות להישכח",
      items: [
        "מידע אישי נשמר בהתאם לדין ולמדיניות הפרטיות.",
        "המשתמש רשאי לבקש עיון במידע האישי ולקבל עותק ממנו.",
        "המשתמש רשאי לבקש מחיקת חשבונו והמידע האישי.",
        "מחיקה מלאה עשויה לארוך עד 30 ימים וחלק מהמידע עשוי להישמר לצרכים חוקיים או אבטחתיים."
      ]
    },
    {
      icon: Server,
      title: "16. אבטחת מידע",
      items: [
        "החברה נוקטת באמצעי אבטחת מידע סבירים ומקובלים.",
        "החברה אינה יכולה להבטיח אבטחה מוחלטת ואינה אחראית לנזק שנגרם עקב חדירה שאינה בשליטתה."
      ]
    },
    {
      icon: AlertTriangle,
      title: "17. הגבלת אחריות",
      items: [
        "השימוש בפלטפורמה נעשה על אחריות המשתמש בלבד.",
        "השירותים ניתנים כפי שהם.",
        "החברה לא תישא באחריות לנזק ישיר, עקיף, תוצאתי או כלכלי."
      ]
    },
    {
      icon: Shield,
      title: "18. שיפוי",
      content: "המשתמש מתחייב לשפות את החברה בגין כל נזק או תביעה הנובעים מהפרת התקנון או הדין."
    },
    {
      icon: FileText,
      title: "19. קניין רוחני",
      items: [
        "כל זכויות הקניין הרוחני בפלטפורמה שייכות לחברה.",
        "אין לעשות שימוש בתכנים ללא אישור מראש ובכתב."
      ]
    },
    {
      icon: Scale,
      title: "20. דין וסמכות שיפוט",
      items: [
        "על תקנון זה יחולו דיני מדינת ישראל בלבד.",
        "סמכות השיפוט הבלעדית נתונה לבתי המשפט המוסמכים במחוז תל אביב יפו."
      ]
    }
  ];

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
          <h1 className="text-xl font-bold text-foreground font-jakarta">תקנון ותנאי שימוש</h1>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <ScrollText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground font-jakarta">PetID</h2>
              <p className="text-sm text-muted-foreground font-jakarta">תקנון ותנאי שימוש</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-jakarta leading-relaxed">
            השימוש באפליקציית PetID ובשירותיה כפוף לתנאים המפורטים להלן. 
            אנא קראו אותם בעיון לפני השימוש בפלטפורמה.
          </p>
        </motion.div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((section, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="bg-card rounded-xl border border-border p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <section.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-bold text-foreground font-jakarta">{section.title}</h3>
              </div>
              
              {section.items ? (
                <ul className="space-y-2 text-sm text-muted-foreground font-jakarta">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex gap-2 leading-relaxed">
                      <span className="text-primary/60 flex-shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground font-jakarta leading-relaxed">
                  {section.content}
                </p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Last Updated */}
        <p className="text-center text-xs text-muted-foreground/60 mt-8 font-jakarta">
          עודכן לאחרונה: ינואר 2026
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default Terms;
