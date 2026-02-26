import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";

const legalContent: Record<string, { he: { title: string; body: string }; en: { title: string; body: string } }> = {
  accessibility: {
    he: {
      title: "הצהרת נגישות",
      body: `PetID מחויבת להנגשת האפליקציה לכלל המשתמשים, לרבות אנשים עם מוגבלויות.\n\nאנו פועלים בהתאם לתקן הישראלי 5568 ולהנחיות WCAG 2.1 ברמה AA.\n\nאם נתקלתם בבעיית נגישות, אנא פנו אלינו:\nדוא"ל: accessibility@petid.co.il\nטלפון: 03-1234567\n\nאנו מתחייבים לטפל בכל פניה בתוך 7 ימי עסקים.`,
    },
    en: {
      title: "Accessibility Statement",
      body: `PetID is committed to making the application accessible to all users, including people with disabilities.\n\nWe comply with Israeli Standard 5568 and WCAG 2.1 Level AA guidelines.\n\nIf you encounter an accessibility issue, please contact us:\nEmail: accessibility@petid.co.il\nPhone: 03-1234567\n\nWe commit to addressing every inquiry within 7 business days.`,
    },
  },
  "club-terms": {
    he: {
      title: "תנאי המועדון",
      body: `תנאי חברות במועדון PetID\n\n1. הצטרפות למועדון הינה חינמית ופתוחה לכל בעלי חיות המחמד.\n2. חברי המועדון זכאים להטבות ייחודיות, מבצעים ותוכן בלעדי.\n3. צבירת נקודות מתבצעת באמצעות פעילות באפליקציה.\n4. PetID שומרת לעצמה את הזכות לשנות את תנאי המועדון בכל עת.\n5. ניתן לבטל חברות בכל עת דרך ההגדרות.`,
    },
    en: {
      title: "Club Terms",
      body: `PetID Club Membership Terms\n\n1. Club membership is free and open to all pet owners.\n2. Members are entitled to exclusive benefits, promotions, and content.\n3. Points are earned through activity in the application.\n4. PetID reserves the right to modify club terms at any time.\n5. Membership can be canceled at any time through settings.`,
    },
  },
  "privacy-policy": {
    he: {
      title: "מדיניות פרטיות",
      body: `מדיניות הפרטיות של PetID\n\nאנו מכבדים את פרטיותך ומחויבים להגנה על המידע האישי שלך.\n\n1. איסוף מידע: אנו אוספים מידע שאתה מספק לנו ישירות בעת ההרשמה ושימוש באפליקציה.\n2. שימוש במידע: המידע משמש לשיפור השירות, התאמה אישית והתקשרות עמך.\n3. שיתוף מידע: איננו מוכרים או משתפים מידע אישי עם צדדים שלישיים, למעט שותפי ביטוח מורשים — אך ורק בהסכמתך המפורשת.\n4. שיתוף עם שותפי ביטוח: מידע רפואי ובריאותי עשוי להיות משותף עם שותפי הביטוח המורשים שלנו, אך ורק לאחר הסכמתך המפורשת. ברירת המחדל היא ללא שיתוף.\n5. אבטחה: אנו מיישמים אמצעי אבטחה מתקדמים להגנה על המידע שלך.\n6. זכויותיך: באפשרותך לבקש עיון, תיקון או מחיקה של המידע האישי שלך בכל עת.\n7. הזכות להישכח: תוכל/י למחוק את כל הנתונים שלך לצמיתות דרך ההגדרות.`,
    },
    en: {
      title: "Privacy Policy",
      body: `PetID Privacy Policy\n\nWe respect your privacy and are committed to protecting your personal information.\n\n1. Information Collection: We collect information you provide directly during registration and app usage.\n2. Use of Information: Information is used to improve service, personalization, and communication.\n3. Information Sharing: We do not sell or share personal information with third parties, except with our licensed Insurance Partners — only upon your explicit consent.\n4. Insurance Partner Sharing: Data may be shared with our licensed Insurance Partners only upon your explicit consent. The default setting is no sharing.\n5. Security: We implement advanced security measures to protect your information.\n6. Your Rights: You can request access, correction, or deletion of your personal information at any time.\n7. Right to be Forgotten: You may permanently delete all your data through Settings.`,
    },
  },
  terms: {
    he: {
      title: "תנאי שימוש",
      body: `תנאי השימוש של PetID\n\n1. קבלת התנאים: השימוש באפליקציה מהווה הסכמה לתנאים אלו.\n2. שימוש מותר: האפליקציה מיועדת לשימוש אישי ולא מסחרי.\n3. תוכן משתמשים: אתה אחראי לתוכן שאתה מעלה לאפליקציה.\n4. קניין רוחני: כל הזכויות באפליקציה שמורות ל-PetID.\n5. הגבלת אחריות: PetID אינה אחראית לנזקים עקיפים הנובעים משימוש באפליקציה.\n6. שינויים: PetID רשאית לשנות תנאים אלו בכל עת.\n7. דין חל: על תנאים אלו יחולו דיני מדינת ישראל.`,
    },
    en: {
      title: "Terms of Use",
      body: `PetID Terms of Use\n\n1. Acceptance: Using the application constitutes agreement to these terms.\n2. Permitted Use: The application is intended for personal, non-commercial use.\n3. User Content: You are responsible for content you upload to the application.\n4. Intellectual Property: All rights in the application are reserved to PetID.\n5. Limitation of Liability: PetID is not responsible for indirect damages from app usage.\n6. Changes: PetID may modify these terms at any time.\n7. Governing Law: These terms are governed by the laws of the State of Israel.`,
    },
  },
  "consumer-protection": {
    he: {
      title: "זכויות צרכן ומדיניות ביטול",
      body: `מדיניות ביטול והחזרים — בהתאם לחוק הגנת הצרכן, התשמ"א-1981\n\n1. זכות ביטול עסקה:\nבהתאם לסעיף 14ג לחוק, הצרכן רשאי לבטל עסקה תוך 14 ימים מיום קבלת המוצר או מיום קבלת מסמך הגילוי (לפי המאוחר), בתנאי שהמוצר לא נפגם ולא נעשה בו שימוש.\n\n2. ביטול עסקת מרחוק:\nעסקאות שבוצעו באמצעות האפליקציה נחשבות עסקאות מרחוק. ניתן לבטלן תוך 14 ימים מיום קבלת המוצר, בכפוף לדמי ביטול של עד 5% ממחיר העסקה או 100 ש"ח — הנמוך מביניהם.\n\n3. החזרים:\nזיכוי יינתן באמצעי התשלום המקורי תוך 14 ימי עסקים ממועד אישור הביטול.\n\n4. חריגים:\nמוצרים פסידים (מזון לחיות מחמד שנפתח), מוצרים מותאמים אישית, ושירותים שכבר סופקו — אינם ניתנים לביטול.\n\n5. הגשת בקשת ביטול:\nניתן לפנות באמצעות:\n• אימייל: support@petid.co.il\n• טלפון: 03-1234567\n• דרך אזור "הגדרות > ניהול מידע" באפליקציה\n\n6. אחריות על מוצרים:\nכל המוצרים הנמכרים באפליקציה כפופים לתקנות אחריות ושירות לאחר מכירה בהתאם לחוק.\n\n7. מחירים ותשלום:\nכל המחירים כוללים מע"מ (17%). תשלום מבוצע בצורה מאובטחת דרך שער תשלומים מורשה.`,
    },
    en: {
      title: "Consumer Rights & Cancellation Policy",
      body: `Cancellation & Refund Policy — Per Israeli Consumer Protection Law, 5741-1981\n\n1. Right to Cancel:\nPer Section 14C, consumers may cancel within 14 days of receiving the product or disclosure document (whichever is later), provided the product is undamaged and unused.\n\n2. Distance Transactions:\nPurchases made via the app are distance transactions. Cancellation is allowed within 14 days, subject to a fee of up to 5% of the price or NIS 100 — whichever is lower.\n\n3. Refunds:\nCredits are issued to the original payment method within 14 business days of cancellation approval.\n\n4. Exceptions:\nPerishable goods (opened pet food), custom products, and already-delivered services are non-refundable.\n\n5. How to Cancel:\n• Email: support@petid.co.il\n• Phone: 03-1234567\n• In-app: Settings > Data Management\n\n6. Product Warranty:\nAll products are subject to post-sale warranty regulations under the law.\n\n7. Pricing:\nAll prices include VAT (17%). Payment is processed securely through a licensed payment gateway.`,
    },
  },
};

export const LegalDrawer = () => {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const { language, direction } = useLanguage();
  const lang = language === "ar" ? "he" : language;

  const handleOpen = useCallback((e: Event) => {
    const key = (e as CustomEvent).detail?.key;
    if (key) setOpenKey(key);
  }, []);

  useEffect(() => {
    window.addEventListener("open-legal-drawer", handleOpen);
    return () => window.removeEventListener("open-legal-drawer", handleOpen);
  }, [handleOpen]);

  const content = openKey ? legalContent[openKey] : null;
  const localized = content ? content[lang as "he" | "en"] || content.he : null;

  return (
    <AnimatePresence>
      {openKey && localized && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
            onClick={() => setOpenKey(null)}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="fixed bottom-0 inset-x-0 z-[201] max-h-[85vh] rounded-t-3xl bg-background/90 backdrop-blur-xl border-t border-border/40 shadow-2xl flex flex-col"
            dir={direction}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3">
              <h2 className="text-lg font-bold text-foreground">{localized.title}</h2>
              <button
                onClick={() => setOpenKey(null)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              </button>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 px-5 pb-8">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {localized.body}
              </p>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
