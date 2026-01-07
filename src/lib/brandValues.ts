/**
 * PetID Brand Values System
 * מערכת ערכי מותג - הליבה של כל החלטה באפליקציה
 * 
 * מבוסס על ספר "לבנות מותג" מאת קובי שמיר
 */

// === ערכי הליבה של PetID ===
export const BRAND_VALUES = {
  // 1. אחריות - הערך המרכזי
  responsibility: {
    name: "אחריות",
    nameEn: "Responsibility",
    description: "אנחנו לא מוכרים - אנחנו מלווים. כל החלטה נבחנת דרך עיני חיית המחמד.",
    principle: "אם יש ספק - לא ממליצים",
    icon: "Shield",
    examples: [
      "לא דוחפים מוצרים לא מתאימים",
      "מעדיפים לומר 'לא מתאים' מאשר למכור",
      "מבקשים מידע לפני המלצה",
    ],
  },

  // 2. קהילה - ביחד, לא לבד
  community: {
    name: "קהילה",
    nameEn: "Community",
    description: "בעלי חיות מחמד תומכים אחד בשני. אף אחד לא צריך להרגיש לבד.",
    principle: "ביחד - קל יותר",
    icon: "Users",
    examples: [
      "שיתוף חוויות וטיפים",
      "תמיכה בעמותות וסיפורי אימוץ",
      "חיבור בין בעלי חיות באזור",
    ],
  },

  // 3. פשטות - קל לדאוג נכון
  simplicity: {
    name: "פשטות",
    nameEn: "Simplicity",
    description: "לטפל בחיית מחמד זה לא מסובך. אנחנו מפשטים את הדרך.",
    principle: "שני צעדים, לא עשרה",
    icon: "Sparkles",
    examples: [
      "הזמנה חוזרת בלחיצה אחת",
      "תזכורות אוטומטיות",
      "המלצות מותאמות אישית",
    ],
  },

  // 4. שקיפות - ללא הפתעות
  transparency: {
    name: "שקיפות",
    nameEn: "Transparency",
    description: "מה שרואים - זה מה שמקבלים. ללא אותיות קטנות.",
    principle: "תמיד אומרים את האמת, גם כשלא נוח",
    icon: "Eye",
    examples: [
      "תזכורת לפני כל חיוב",
      "מחירים ברורים ללא הפתעות",
      "הסבר למה ממליצים או לא",
    ],
  },

  // 5. משמעות - לא רק עסקה
  meaning: {
    name: "משמעות",
    nameEn: "Meaning",
    description: "כל רכישה היא הזדמנות לתרום. כל פעולה יוצרת ערך.",
    principle: "מעבר לעסקה - קשר",
    icon: "Heart",
    examples: [
      "נקודות נאמנות על אחריות",
      "תרומה לעמותות מכל רכישה",
      "חגיגת אבני דרך עם חיית המחמד",
    ],
  },
} as const;

// === הבטחת המותג ===
export const BRAND_PROMISE = {
  short: "אנחנו עוזרים לך להרגיש בטוח שאתה עושה את הדבר הנכון.",
  full: "PetID מלווה בעלי חיות מחמד בכל שלב - מהבחירה הראשונה ועד לתזכורת הבאה. אנחנו לא מוכרים לך - אנחנו דואגים איתך.",
  tagline: "ביחד, דואגים נכון.",
} as const;

// === סיפור המותג ===
export const BRAND_STORY = {
  origin: "PetID נולד מהבנה פשוטה: בעלי חיות מחמד לא צריכים עוד חנות אונליין. הם צריכים מישהו שיעזור להם לדאוג נכון.",
  mission: "להפוך את הטיפול בחיית המחמד מעניין מסובך למשהו פשוט ונעים.",
  vision: "עולם שבו כל בעל חיית מחמד מרגיש בטוח בהחלטות שלו.",
  why: "כי כשדואגים נכון - כולם מרוויחים. חיית המחמד, הבעלים, והקהילה.",
} as const;

// === פרסונת המותג ===
export const BRAND_PERSONA = {
  name: "הידיד המומחה",
  description: "כמו חבר שמבין בחיות מחמד - נותן עצות טובות, לא לוחץ, ותמיד שם כשצריך.",
  traits: [
    "חם ואנושי",
    "אחראי ומקצועי",
    "סבלני ולא דוחף",
    "ישיר ושקוף",
    "מעודד ותומך",
  ],
  voiceTone: {
    is: ["מרגיע", "תומך", "ברור", "אמין", "חם"],
    isNot: ["לוחץ", "מוכר", "פורמלי מדי", "קר", "מתנשא"],
  },
  speaksLike: "חבר שמבין בחיות - לא מוכר בחנות",
} as const;

// === עקרונות הנחיה לכל החלטה ===
export const DECISION_PRINCIPLES = {
  // לפני כל החלטה עסקית
  beforeDecision: [
    "האם זה טוב לחיית המחמד?",
    "האם זה מפשט את החיים של הבעלים?",
    "האם זה בונה אמון או פוגע בו?",
    "האם הייתי ממליץ על זה לחבר?",
  ],
  // כלל ברירת המחדל
  defaultRule: "אם יש ספק - לא לעשות. אם חסר מידע - לשאול. אם לא מתאים - לומר בבירור.",
  // תנאי עצירה
  stopConditions: [
    "אי-ודאות רפואית",
    "מידע סותר",
    "סיכון פוטנציאלי לחיית המחמד",
  ],
} as const;

// === מילים לשימוש ולהימנע ===
export const LANGUAGE_GUIDE = {
  use: [
    "מומלץ",
    "לא חובה",
    "לא מתאים",
    "כדאי לחכות",
    "ביחד",
    "בטוח",
    "פשוט",
    "שקט נפשי",
  ],
  avoid: [
    "Amazing",
    "Must-have",
    "Best",
    "Deal",
    "Hurry",
    "Perfect",
    "מבצע מטורף",
    "חובה",
    "דחוף",
  ],
} as const;

// === Helper: בדיקת התאמה לערכי המותג ===
export const isAlignedWithValues = (action: string, context: {
  benefitsPet?: boolean;
  simplifiesLife?: boolean;
  buildssTrust?: boolean;
  wouldRecommendToFriend?: boolean;
}): boolean => {
  const { benefitsPet, simplifiesLife, buildssTrust, wouldRecommendToFriend } = context;
  
  // כל הקריטריונים צריכים להיות חיוביים או לא רלוונטיים
  const criteria = [benefitsPet, simplifiesLife, buildssTrust, wouldRecommendToFriend];
  const relevantCriteria = criteria.filter(c => c !== undefined);
  
  // אם יש אפילו קריטריון אחד שלילי - לא מתאים
  return relevantCriteria.every(c => c === true);
};

// === Helper: קבלת ערך מותג לפי מפתח ===
export const getBrandValue = (key: keyof typeof BRAND_VALUES) => BRAND_VALUES[key];

// === Helper: קבלת כל ערכי המותג כמערך ===
export const getAllBrandValues = () => Object.values(BRAND_VALUES);

// === Export types ===
export type BrandValueKey = keyof typeof BRAND_VALUES;
export type BrandValue = typeof BRAND_VALUES[BrandValueKey];
