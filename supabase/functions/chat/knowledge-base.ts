// ============= Local Knowledge Base =============
// Hardcoded category-specific knowledge to reduce AI token usage.
// The AI references this instead of "re-learning" each session.

export const INSURANCE_KNOWLEDGE = `
=== מאגר ידע: ביטוח חיות מחמד (Libra) ===
סוגי כיסוי:
• בסיסי: תאונות + ניתוחי חירום. מ-49₪/חודש.
• מורחב: תאונות + מחלות + ניתוחים + אשפוז. מ-89₪/חודש.
• פרימיום: כיסוי מלא כולל שיניים, טיפולי שגרה, ובדיקות מעבדה. מ-149₪/חודש.

גורמים שמשפיעים על מחיר:
• גיל (גורים וותיקים יקרים יותר)
• גזע (גזעים עם נטייה למחלות תורשתיות)
• מצב רפואי קיים (Pre-existing conditions לא מכוסים)
• גודל (גדולים יקרים יותר)

תקופת המתנה: 30 יום לממלות, 48 שעות לתאונות.
השתתפות עצמית: 20% ברוב התוכניות.
גיל מקסימלי לצירוף: 8 שנים (כלבים), 10 שנים (חתולים).
חיסונים: לא מכוסים (טיפול שגרתי).
⚠️ אל תציג מחירים ספציפיים — המערכת מציגה כרטיסי תוכניות אוטומטית.
`;

export const TRAINING_KNOWLEDGE = `
=== מאגר ידע: אילוף ===
שיטות מומלצות:
• חיזוק חיובי (Positive Reinforcement) — חטיפים, שבחים, משחק.
• אילוף קליקר — סימון רגע ההצלחה.
• CAT (Constructional Aggression Treatment) — לבעיות תוקפנות.
• BAT (Behavior Adjustment Training) — לפחדים ותגובתיות.

בעיות נפוצות לפי גיל:
• גורים (0-6 חודשים): נשיכות משחק, צרכים בבית, סושיאליזציה.
• נוער (6-18 חודשים): משיכה ברצועה, אי-ציות, קפיצה על אנשים.
• בוגרים: נביחות, תוקפנות, חרדת נטישה.

טיפים לפי גזע:
• גזעי עבודה (רועים, האסקי): צריכים גירוי מנטלי גבוה.
• גזעי ציד (ביגל, פוינטר): ריח חזק, צריכים תעסוקה.
• גזעי חברה (מלטז, שיצו): רגישים, עובדים טוב עם שבחים.
• גזעי שמירה (רוטווילר, דוברמן): צריכים מנהיגות ברורה.

⚠️ כלל ברזל: לעולם לא להמליץ על עונש פיזי, צעקות, או שיטות אברסיביות.
`;

export const GROOMING_KNOWLEDGE = `
=== מאגר ידע: טיפוח ===
סוגי פרוות:
• קצרה וחלקה (לברדור, בוקסר): מברשת גומי פעם בשבוע.
• בינונית (גולדן, שפיץ): מברשת slicker 2-3 פעמים בשבוע.
• ארוכה (שי-טסו, יורקי): הסתרקות יומית, תספורת כל 6-8 שבועות.
• מתולתלת (פודל, ביישון): תספורת כל 4-6 שבועות, מניעת קשרים.
• כפולה (האסקי, שבא): לעולם לא לגלח! מברשת undercoat.

תדירות רחצה:
• כלבים: כל 4-6 שבועות (או כשמלוכלך).
• חתולים: בד"כ לא צריך, אלא אם מלוכלך או בעיות עור.

שירותים נפוצים ומחירים ממוצעים:
• מקלחת + ייבוש: 80-150₪
• תספורת מלאה: 150-300₪ (תלוי בגודל)
• גזיזת ציפורניים: 30-50₪
• חבילה מלאה: 200-400₪

⚠️ אם יש רגישות לרעש/מים — לציין למספרה מראש.
`;

export const BOARDING_KNOWLEDGE = `
=== מאגר ידע: פנסיון ===
סוגי פנסיונים:
• פנסיון ביתי: כלב אחד-שניים בבית פרטי. אישי, חם, מתאים לכלבים חרדתיים. 80-150₪/לילה.
• פנסיון מקצועי: מתחם עם צוות. פיקוח 24/7, מצלמות. 100-200₪/לילה.
• דיי-קר: שהייה ביום בלבד (7:00-19:00). 60-100₪/יום.
• Dog Sitter: מטפל מגיע הביתה. 100-200₪/ביקור.

מה לבדוק לפני בחירה:
• האם מגודר לחלוטין?
• יחס מטפל-כלבים (מומלץ: 1:5 מקסימום)
• חיסונים נדרשים (משושה + כלבת חובה)
• האם מפרידים גדולים מקטנים?
• האם יש שירות וטרינרי חירום?

מה לארוז:
• האוכל הרגיל (לא להחליף!)
• צעצוע/שמיכה עם ריח הבית
• תרופות + הוראות (אם רלוונטי)
• פרטי וטרינר
`;

export const BREED_KNOWLEDGE = `
=== מאגר ידע: מידע על גזעים ===
המידע נשלף אוטומטית מבסיס הנתונים (breed_information).
כשמוצגים נתוני BREED_DATA — השתמש בהם ישירות, אל תמציא.

קטגוריות מידע זמינות:
• אופי וטמפרמנט
• בריאות ומחלות נפוצות
• תזונה
• טיפוח ונשירה
• אילוף
• התאמה לילדים/חיות אחרות/דירה
• פעילות גופנית

כשאין נתוני גזע במערכת — שאל מה שם הגזע וחפש.
כשיש מצב בריאותי בפרופיל — התייחס אליו ביחס למחלות הגזע.
`;

export const ADOPTION_KNOWLEDGE = `
=== מאגר ידע: אימוץ ומסירה ===
תהליך מסירה אחראית:
1. פרופיל מלא: גיל, גודל, עיקור, חיסונים, אופי.
2. תמונות איכותיות: פנים ברורות, גוף מלא.
3. סיפור אישי: למה נמסר, מה אוהב, מה צריך.
4. סינון מאמצים: דרישות מבית המאמץ.

דרישות מינימום ממאמצים:
• גיל 21+
• הסכמה לביקור בית
• התחייבות לעיקור/סירוס
• הסכמה למעקב 3 חודשים

⚠️ PetID לא מוכרת חיות. המערכת מחברת בין מוסרים למאמצים.
⚠️ אסור למסור חיה מתחת לגיל 8 שבועות.
`;

export const DOCUMENTS_KNOWLEDGE = `
=== מאגר ידע: מסמכים ===
סוגי מסמכים נתמכים:
• פנקס חיסונים — סריקה אוטומטית של תאריכים, תזכורות חידוש.
• רישיון עירייה — תאריך תוקף, תזכורת חידוש.
• תוצאות מעבדה — שמירה בכרטיס רפואי.
• מרשמים — תזכורות חידוש.
• פוליסת ביטוח — תאריך תוקף, פרטי כיסוי.
• אישור עיקור/סירוס.

פורמטים נתמכים: JPG, PNG, PDF.
האחסון מוצפן ומאובטח.
`;

export const PARKS_KNOWLEDGE = `
=== מאגר ידע: גינות כלבים ===
המידע על גינות נשלף מבסיס הנתונים (dog_parks).
כללי בטיחות בגינה:
• לא להביא כלב לא מחוסן.
• לאסוף צרכים (חובה חוקית).
• לשמור על שליטה — אם הכלב תוקפני, לא להוריד מרצועה.
• להביא מים תמיד.
• לא להביא אוכל/חטיפים שמושכים כלבים אחרים.
`;

export const DELIVERY_KNOWLEDGE = `
=== מאגר ידע: משלוחים וחנות ===
זמני משלוח: 1-3 ימי עסקים.
משלוח חינם: מעל 200₪.
עלות משלוח: 29₪.
מדיניות החזרות: עד 14 יום, מוצר סגור.
הזמנה חוזרת: הנחה 10% על מנוי חודשי.
`;

// ============= Category Detection =============
export function detectCategory(messages: Array<{role: string; content: string}>): string | null {
  const recent = messages.slice(-6).map(m => m.content.toLowerCase()).join(" ");
  
  const patterns: Array<{ category: string; keywords: string[] }> = [
    { category: "insurance", keywords: ["ביטוח", "פוליס", "כיסוי", "libra", "תביע"] },
    { category: "training", keywords: ["אילוף", "נביח", "מושך", "תוקפנ", "חרדת נטיש", "צרכים בבית", "גור"] },
    { category: "grooming", keywords: ["טיפוח", "תספורת", "מקלחת", "ציפורני", "פרווה", "מספרה"] },
    { category: "boarding", keywords: ["פנסיון", "דיי קר", "dog sitter", "חופשה", "נוסע"] },
    { category: "breed", keywords: ["גזע", "מידע על", "אופי", "מחלות", "תוחלת חיים"] },
    { category: "adoption", keywords: ["מסירה", "אימוץ", "למסור", "לאמץ"] },
    { category: "documents", keywords: ["מסמך", "חיסון", "רישיון", "בדיק", "מרשם", "פוליס"] },
    { category: "parks", keywords: ["גינ", "פארק", "dog park"] },
    { category: "delivery", keywords: ["משלוח", "חנות", "לקנות", "מזון", "חטיף", "מוצר"] },
  ];

  for (const { category, keywords } of patterns) {
    if (keywords.some(kw => recent.includes(kw))) return category;
  }
  return null;
}

// ============= Get Knowledge for Category =============
export function getKnowledgeForCategory(category: string | null): string {
  switch (category) {
    case "insurance": return INSURANCE_KNOWLEDGE;
    case "training": return TRAINING_KNOWLEDGE;
    case "grooming": return GROOMING_KNOWLEDGE;
    case "boarding": return BOARDING_KNOWLEDGE;
    case "breed": return BREED_KNOWLEDGE;
    case "adoption": return ADOPTION_KNOWLEDGE;
    case "documents": return DOCUMENTS_KNOWLEDGE;
    case "parks": return PARKS_KNOWLEDGE;
    case "delivery": return DELIVERY_KNOWLEDGE;
    default: return "";
  }
}

// ============= Get Flow Instructions for Category =============
export function getFlowForCategory(category: string | null): string {
  switch (category) {
    case "insurance": return INSURANCE_FLOW;
    case "training": return TRAINING_FLOW;
    case "grooming": return GROOMING_FLOW;
    case "boarding": return BOARDING_FLOW;
    case "breed": return BREED_FLOW;
    case "adoption": return ADOPTION_FLOW;
    case "documents": return DOCUMENTS_FLOW;
    case "parks": return PARKS_FLOW;
    case "delivery": return DELIVERY_FLOW;
    default: return ALL_FLOWS_SUMMARY;
  }
}

// ============= Category-Specific Flow Instructions =============
const INSURANCE_FLOW = `
🛡️ ביטוח (Libra Insurance)
שלב 1 — אימות פרטים: הצג גזע, גיל, מצב בריאותי. שאל "הכל נכון?"
  • אם כן → "מעולה! מחשב הצעה..." + [ACTION:SHOW_INSURANCE_PLANS]
  • אם בעיה רפואית → "נעביר לבדיקה מקצועית" + [ACTION:SHOW_INSURANCE_CALLBACK]
  • אם תיקון → עדכן והצג שוב
⚠️ אל תציג מחירים. המערכת מציגה כרטיסים אוטומטית.
⚠️ medical_conditions קיימים → ישר callback.
`;

const TRAINING_FLOW = `
🎓 אילוף
שלב 1 — "מה הדבר שהיית רוצה לשפר?" + [ACTION:SHOW_TRAINING_CATEGORIES]
שלב 2 — לפי הבחירה, שאלת העמקה + [ACTION:SHOW_TRAINING_OPTIONS:opt1|opt2|opt3]
  משיכה ברצועה: "רק כשיש גירויים או תמיד?"
  נביחות: "על אנשים, כלבים, או בלי סיבה?"
  חרדת נטישה: "נביחות, הרס, או חוסר מנוחה?"
  צרכים בבית: "כל הזמן או רק לפעמים?"
  גורים: "צרכים, קפיצה/נשיכה, או סושיאליזציה?"
שלב 3 — טיפ מעשי מיידי (חיזוק חיובי בלבד!)
שלב 4 — "יש לנו מאלפים מקצועיים. רוצה שאפנה?" + options
שלב 5 — "הפרטים הועברו ✅" + [ACTION:SUBMIT_TRAINING_LEAD]
`;

const GROOMING_FLOW = `
✂️ טיפוח
שלב 1 — "מה [שם] צריך היום?" + [ACTION:SHOW_GROOMING_SERVICES]
שלב 2 — ניתוח פרווה לפי BREED_DATA (grooming_needs, shedding_level)
שלב 3 — "האם רגיש/ה למכונה או מים?"
שלב 4 — "בחר/י תאריך" + [ACTION:SHOW_APPOINTMENT_PICKER]
שלב 5 — "הפנייה הועברה ✅" + [ACTION:SUBMIT_GROOMING_LEAD]
`;

const BOARDING_FLOW = `
🏨 פנסיון
שלב 1 — "מתי נוסעים?" + [ACTION:SHOW_TRAINING_OPTIONS:סופ"ש|שבוע|שבועיים|לא בטוח]
שלב 2 — "מה יגרום להרגיש בנוח?" + [ACTION:SHOW_BOARDING_TYPES]
שלב 3 — "איך מסתדר עם כלבים אחרים?" + options
שלב 4 — הצג 2-3 פנסיונים מומלצים
שלב 5 — "הפרטים הועברו ✅"
`;

const BREED_FLOW = `
🐕 מידע על הגזע
אם יש BREED_DATA — הצג ישירות. אל תמציא.
שאל על מה רוצה לדעת: אופי/תזונה/בריאות/אילוף/טיפוח.
תן מידע מבוסס נתונים → המלץ מוצר [PRODUCTS:uuid] → הצע ביטוח.
`;

const ADOPTION_FLOW = `
🏠 למסירה
שלב 1 — הצג פרטים קיימים. שאל על עיקור אם חסר.
שלב 2 — "ספר על האופי" + [ACTION:SHOW_ADOPTION_TRAITS]
שלב 3 — "העלה תמונה" + [ACTION:UPLOAD_PHOTO]
שלב 4 — "איזה בית מחפש?" + [ACTION:SHOW_ADOPTION_REQUIREMENTS]
שלב 5 — "כרטיס אימוץ מוכן! ✅"
`;

const DOCUMENTS_FLOW = `
📂 מסמכים
שלב 1 — "איזה מסמך נרצה לעדכן?" + [ACTION:SHOW_DOCUMENT_TYPES]
שלב 2 — בקש העלאה לפי סוג + [ACTION:UPLOAD_DOCUMENT]
שלב 3 — "סרקתי! רוצה תזכורת?" + options
שלב 4 — "המסמך שמור ✅"
שלב 5 — בדוק מסמכים חסרים והמלץ.
`;

const PARKS_FLOW = `
🌳 גינות כלבים
שלב 1 — "מה הכי חשוב בגינה?" + [ACTION:SHOW_PARK_OPTIONS]
שלב 2 — הצג 2-3 גינות מומלצות מ-dog_parks
שלב 3 — "מעדיף גדולים או קטנים?" + options
שלב 4 — טיפ + "רוצה ניווט?" + options
`;

const DELIVERY_FLOW = `
📦 משלוחים/חנות
שלב 1 — "מה חסר?" + [ACTION:SHOW_STORE_CATEGORIES]
שלב 2 — המלצות מותאמות לגזע/גיל + [PRODUCTS:uuid1,uuid2]
שלב 3 — "להוסיף מוצר משלים?" + options
שלב 4 — סיכום + כתובת
שלב 5 — "ההזמנה התקבלה! 🎉"
`;

const ALL_FLOWS_SUMMARY = `
הצע למשתמש את הקטגוריות הזמינות:
🛡️ ביטוח | ✂️ טיפוח | 🎓 אילוף | 🌳 גינות כלבים | 📂 מסמכים | 🏨 פנסיון | 📦 משלוחים | 🐕 מידע על הגזע | 🏠 למסירה
`;
