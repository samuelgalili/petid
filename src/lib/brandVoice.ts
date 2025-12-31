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

// === Helper function to calculate days until reorder ===
export const calculateDaysUntilReorder = (lastPurchaseDate: Date, typicalDays: number = 30): number => {
  const now = new Date();
  const daysSincePurchase = Math.floor((now.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, typicalDays - daysSincePurchase);
};

// === Time-based greetings ===
export const getTimeGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "בוקר טוב";
  if (hour < 17) return "צהריים טובים";
  if (hour < 21) return "ערב טוב";
  return "לילה טוב";
};
