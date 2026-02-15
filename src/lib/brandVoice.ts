/**
 * PetID Brand Voice Guide
 * ספר שפה מותגית - Tone of Voice
 * 
 * מהות: חם, אנושי, אחראי, מרגיע, לא דוחף, לא מוכר בכוח
 * התחושה: "יש כאן מי שחושב יחד איתי על החבר שלי — ולא רק על העסקה."
 */

// === Success Messages - Celebratory and Warm ===
export const SUCCESS = {
  petAdded: "🐾 איזו חיה מקסימה! הפרופיל נוצר בהצלחה",
  taskCompleted: "כל הכבוד! המשימה הושלמה 🎉",
  pointsEarned: (points: number) => `יופי! צברת ${points} נקודות נוספות ✨`,
  productAdded: "נוסף לעגלה! 🛒",
  orderPlaced: "ההזמנה בדרך אליכם! 📦",
  profileUpdated: "הפרופיל עודכן בהצלחה 💚",
  photoUploaded: "תמונה מקסימה! 📸",
  thankYouPurchase: "תודה שבחרתם לדאוג לחבר שלכם איתנו 💛\nאנחנו כאן אם צריך כל שאלה או התאמה בהמשך.",
  serviceFix: "אנחנו על זה 🙌\nמצטערים על העיכוב — נדאג לעדכן ולפתור בהקדם.",
} as const;

// === Empty States - Encouraging and Actionable ===
export const EMPTY = {
  noPets: "בואו נתחיל! הוסיפו את חיית המחמד הראשונה שלכם 🐕🐈",
  noTasks: "אין משימות חדשות כרגע. תחזרו מאוחר יותר! 😊",
  noOrders: "עדיין לא ביצעתם הזמנות. בואו נמצא משהו מיוחד! 🎁",
  noPhotos: "אין עדיין תמונות. הוסיפו זכרונות מתוקים! 📷",
  emptyCart: "העגלה ריקה. בואו נמצא משהו מיוחד! 🎁",
  noNotifications: "הכל שקט כאן... אין התראות חדשות 🔕",
  noFeed: "עדיין אין פוסטים. בואו נשתף משהו! ✨",
} as const;

// === Reminders - Gentle and Caring ===
export const REMINDERS = {
  foodRenewal: "ראינו שעבר קצת זמן מאז הרכישה האחרונה —\nרק מזכירים בעדינות כדי שלא תישארו בלי 🐾\nאם אתם צריכים עזרה בבחירה — אנחנו כאן.",
  lowStock: (daysLeft: number) => `נשארו עוד כ-${daysLeft} ימים למלאי המזון.\nכדי שלא תגיעו למצב שחסר — אפשר להזמין בלחיצה.`,
  gentleReminder: "נשארים עוד כמה ימים — מזכירים בעדינות 🐾",
  foodChange: "אם אתם שוקלים לעבור למזון אחר —\nנשמח לבדוק יחד מה הכי מתאים לו.",
  vaccination: (petName: string) => `זמן לחיסון של ${petName} 💉`,
  checkup: (petName: string) => `הגיע הזמן לבדיקה של ${petName} 🏥`,
} as const;

// === Actions - Clear and Inviting ===
export const ACTIONS = {
  orderNow: "להזמין עכשיו",
  remindLater: "תזכורת בעוד שבוע",
  notNow: "לא צריך כרגע",
  addToCart: "הוסיפו לעגלה",
  checkout: "המשיכו לתשלום",
  smartOrder: "הזמנה חכמה",
  checkCompatibility: "בדיקת התאמה",
  changeFoodWithSupport: "שינוי מזון בליווי",
  saveForLater: "שמרו להמשך",
  learnMore: "קראו עוד",
  getHelp: "אם אתם מתלבטים — אנחנו כאן לעזור",
} as const;

// === Home Dashboard Messages ===
export const HOME = {
  greeting: (petName: string, daysLeft: number) => 
    `בוקר טוב, ${petName} 🐶 — נשארו כ-${daysLeft} ימים למלאי`,
  betweenPurchases: "אנחנו אתכם — גם בין רכישה לרכישה.",
  tailoredTip: "טיפ מותאם אליכם",
  relevantOffer: "הצעה משלימה רלוונטית",
  communitySection: "קהילה ותרומה",
  orderInClick: "הזמנה חוזרת בלחיצה",
} as const;

// === Pet Card Messages ===
export const PET_CARD = {
  orderSuggestion: "כדאי להזמין בשבוע הקרוב 💛",
  compatibilityScore: "מדד התאמה למוצר נוכחי",
  purchaseHistory: "היסטוריית רכישות",
  sensitivities: "רגישויות",
} as const;

// === Checkout Messages ===
export const CHECKOUT = {
  saveForRecurring: "אפשר לשמור את בחירתכם להזמנה קבועה.\nתמיד תקבלו תזכורת לפני החיוב.",
  transparentPricing: "שקיפות מלאה",
  twoStepsOnly: "2 צעדים בלבד",
  noAutoCharge: "ללא חיוב אוטומטי",
  reminderBeforeCharge: "תזכורת לפני כל חיוב",
} as const;

// === Club & Community ===
export const CLUB = {
  loyalty: "נאמנות",
  consistency: "רצף",
  contribution: "תרומה",
  meaning: "משמעות",
  adoptionStories: "סיפורי אימוץ",
  shelterPartnership: "שיתוף פעולה עם עמותות",
  pointsForFrequency: "נקודות על תדירות",
  responsibilityBoost: "חיזוק אחריות",
} as const;

// === Progress & Motivation ===
export const PROGRESS = {
  dailyStreak: (count: number) => `רצף יומי: ${count} ימים! 🔥`,
  almostThere: (count: number) => `כמעט סיימתם! עוד ${count} משימות 💪`,
  wellDone: "עבודה מעולה! המשיכו כך 🌟",
  levelUp: "עליתם דרגה! 🎊",
  milestone: "השגתם אבן דרך חשובה! 🏆",
  keepGoing: "כל הכבוד! המשיכו כך 💫",
} as const;

// === Brand Words - Positive ===
export const BRAND_WORDS = {
  positive: [
    "ליווי",
    "ביחד",
    "דאגה",
    "רצף",
    "רגוע",
    "בטוח",
    "משתלם לטווח ארוך",
    "המלצה מותאמת",
    "שקט נפשי",
  ],
  // Words to AVOID
  forbidden: [
    "חובה",
    "מיידי",
    "דחוף",
    "מבצע מטורף",
    "פספסת",
    "מחיר רצח",
    "זול",
    "Amazing",
    "Must-have",
    "Best",
    "Deal",
    "Hurry",
    "Perfect",
  ],
} as const;

// === Error Messages - Empathetic ===
export const ERRORS = {
  general: "אופס! משהו השתבש. נסו שוב 😕",
  network: "אין חיבור לאינטרנט. בדקו את החיבור שלכם 📡",
  uploadFailed: "העלאת התמונה נכשלה. נסו שוב",
  invalidInput: "נא למלא את השדה בצורה נכונה",
  notFound: "לא מצאנו את מה שחיפשתם 🔍",
  unauthorized: "נדרשת התחברות למערכת 🔐",
} as const;

// === Pet-specific Emotional Copy ===
export const PET_EMOTIONS = {
  newPet: "חבר חדש הצטרף למשפחה! 🎉",
  happyBirthday: (name: string) => `יום הולדת שמח ל-${name}! 🎂`,
  anniversary: (name: string, years: number) => `${name} איתכם כבר ${years} שנים! 💕`,
  treatYourPet: (name: string) => `פנקו את ${name} היום! 🎁`,
} as const;

// === Helper: estimate daily food intake in grams based on pet weight/type ===
export const estimateDailyGrams = (weight: number | null, petType: string): number => {
  if (!weight) return 0;
  if (petType === "cat") {
    if (weight <= 3) return Math.round(weight * 35);
    if (weight <= 6) return Math.round(weight * 28);
    return Math.round(weight * 22);
  }
  if (weight <= 5) return Math.round(weight * 30);
  if (weight <= 15) return Math.round(weight * 25);
  return Math.round(weight * 20);
};

// === Helper: parse bag size in kg from product name ===
export const parseBagKg = (name: string): number => {
  const match = name.match(/(\d+\.?\d*)\s*(?:ק[״"]?ג|kg|קילו)/i);
  if (match) return parseFloat(match[1]);
  const gMatch = name.match(/(\d+)\s*(?:גרם|gr|g)\b/i);
  if (gMatch) return parseInt(gMatch[1]) / 1000;
  return 0;
};

// === Helper function to calculate days until reorder ===
export const calculateDaysUntilReorder = (lastPurchaseDate: Date, typicalDays: number = 30): number => {
  const now = new Date();
  const daysSincePurchase = Math.floor((now.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, typicalDays - daysSincePurchase);
};

// === Smart reorder calculation using pet weight + order items ===
export const calculateSmartReorderDays = (
  lastOrderDate: Date,
  orderItems: Array<{ name: string; quantity: number }>,
  petWeight: number | null,
  petType: string
): number => {
  const dailyG = estimateDailyGrams(petWeight, petType);
  if (dailyG <= 0) return calculateDaysUntilReorder(lastOrderDate);

  let totalFoodGrams = 0;
  for (const item of orderItems) {
    const bagKg = parseBagKg(item.name || "");
    if (bagKg > 0) {
      totalFoodGrams += bagKg * 1000 * (item.quantity || 1);
    }
  }

  if (totalFoodGrams <= 0) return calculateDaysUntilReorder(lastOrderDate);

  const totalDays = Math.round(totalFoodGrams / dailyG);
  const now = new Date();
  const daysSincePurchase = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, totalDays - daysSincePurchase);
};

// === Life stage transition check ===
export const getLifeStageTransition = (
  petType: string,
  birthDate: string | null
): { needsTransition: boolean; message: string; weeksUntil: number } | null => {
  if (!birthDate) return null;
  const ageWeeks = Math.floor((Date.now() - new Date(birthDate).getTime()) / (7 * 24 * 60 * 60 * 1000));

  if (petType === "dog") {
    // Puppy → Junior at ~26 weeks (6 months)
    if (ageWeeks >= 20 && ageWeeks < 26) {
      return {
        needsTransition: true,
        message: "מעבר ממזון גורים למזון ג׳וניור מתקרב",
        weeksUntil: 26 - ageWeeks,
      };
    }
    // Junior → Adult at ~52 weeks (12 months)
    if (ageWeeks >= 44 && ageWeeks < 52) {
      return {
        needsTransition: true,
        message: "מעבר ממזון ג׳וניור למזון בוגרים מתקרב",
        weeksUntil: 52 - ageWeeks,
      };
    }
  }

  if (petType === "cat") {
    if (ageWeeks >= 44 && ageWeeks < 52) {
      return {
        needsTransition: true,
        message: "מעבר ממזון גורים למזון בוגרים מתקרב",
        weeksUntil: 52 - ageWeeks,
      };
    }
  }

  return null;
};

// === Time-based greetings ===
export const getTimeGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "בוקר טוב";
  if (hour < 17) return "צהריים טובים";
  if (hour < 21) return "ערב טוב";
  return "לילה טוב";
};
