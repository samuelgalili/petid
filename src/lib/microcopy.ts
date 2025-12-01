/**
 * Emotional, encouraging micro-copy for pet-care UX
 * Based on behavioral design research and positive reinforcement principles
 */

export const MICROCOPY = {
  // Success messages - celebratory and warm
  success: {
    petAdded: "🐾 איזו חיה מתוקה! הפרופיל נוצר בהצלחה",
    taskCompleted: "כל הכבוד! המשימה הושלמה 🎉",
    pointsEarned: "יופי! צברת {points} נקודות נוספות ✨",
    productAdded: "נוסף לעגלה! 🛒",
    orderPlaced: "ההזמנה בדרך אליכם! 📦",
    profileUpdated: "הפרופיל עודכן בהצלחה 💚",
    photoUploaded: "תמונה מקסימה! 📸",
    reviewSubmitted: "תודה על השיתוף! 🌟",
    followSuccess: "עכשיו אתם עוקבים! 👥",
  },

  // Empty states - encouraging and actionable
  empty: {
    noPets: "בואו נתחיל! הוסיפו את חיית המחמד הראשונה שלכם 🐕🐈",
    noTasks: "אין משימות חדשות כרגע. תחזרו מאוחר יותר! 😊",
    noOrders: "עדיין לא ביצעתם הזמנות. בואו נתחיל לקנות! 🛍️",
    noPhotos: "אין עדיין תמונות. הוסיפו זכרונים מתוקים! 📷",
    emptyCart: "העגלה ריקה. בואו נמצא משהו מיוחד! 🎁",
    noNotifications: "הכל שקט כאן... אין התראות חדשות 🔕",
    noFeed: "עדיין אין פוסטים. בואו נשתף משהו! ✨",
  },

  // Action buttons - clear and inviting
  actions: {
    addPet: "הוסיפו חיית מחמד",
    completeTask: "סמנו כהושלם",
    addToCart: "הוסיפו לעגלה",
    checkout: "המשיכו לתשלום",
    share: "שתפו",
    save: "שמרו",
    edit: "ערכו",
    delete: "מחקו",
    cancel: "ביטול",
    continue: "המשיכו",
    tryAgain: "נסו שוב",
    learnMore: "קראו עוד",
    viewAll: "צפו בהכל",
    upload: "העלו תמונה",
    takePicture: "צלמו",
  },

  // Progress & motivation - encouraging continuous engagement
  progress: {
    dailyStreak: "רצף יומי: {count} ימים! 🔥",
    almostThere: "כמעט סיימתם! עוד {count} משימות 💪",
    wellDone: "עבודה מעולה! המשיכו כך 🌟",
    levelUp: "עליתם דרגה! 🎊",
    milestone: "השגתם אבן דרך חשובה! 🏆",
    keepGoing: "כל הכבוד! המשיכו כך 💫",
  },

  // Guidance - helpful and friendly
  guidance: {
    uploadPhoto: "בחרו תמונה ברורה של חיית המחמד",
    fillRequired: "נא למלא את כל השדות המסומנים",
    selectPetType: "בחרו תחילה: כלב או חתול?",
    confirmAction: "האם אתם בטוחים?",
    unsavedChanges: "יש שינויים שלא נשמרו",
    loading: "רק רגע... 🐾",
    calculating: "מחשבים...",
  },

  // Error messages - empathetic and solution-oriented
  errors: {
    general: "אופס! משהו השתבש. נסו שוב 😕",
    network: "אין חיבור לאינטרנט. בדקו את החיבור שלכם 📡",
    uploadFailed: "העלאת התמונה נכשלה. נסו שוב",
    invalidInput: "נא למלא את השדה בצורה נכונה",
    notFound: "לא מצאנו את מה שחיפשתם 🔍",
    unauthorized: "נדרשת התחברות למערכת 🔐",
    serverError: "השרת לא זמין כרגע. נסו שוב בעוד כמה דקות",
  },

  // Accessibility labels
  a11y: {
    menu: "תפריט ניווט",
    close: "סגור",
    back: "חזור",
    search: "חיפוש",
    filter: "סינון",
    sort: "מיון",
    notifications: "התראות",
    profile: "פרופיל אישי",
    cart: "עגלת קניות",
    settings: "הגדרות",
    help: "עזרה",
  },

  // Pet-specific emotional copy
  pets: {
    newPet: "חבר חדש הצטרף למשפחה! 🎉",
    happyBirthday: "יום הולדת שמח ל-{name}! 🎂",
    anniversary: "{name} איתכם כבר {years} שנים! 💕",
    vaccineReminder: "זמן לחיסון של {name} 💉",
    checkupReminder: "הגיע הזמן לבדיקה של {name} 🏥",
    treatYourPet: "פנקו את {name} היום! 🎁",
  },

  // Community & social
  social: {
    newFollower: "{name} עוקב/ת אחריכם! 👋",
    liked: "{name} אהב/ה את הפוסט שלכם ❤️",
    commented: "{name} הגיב/ה לפוסט שלכם 💬",
    mentioned: "{name} תייג/ה אתכם בפוסט 📣",
    shared: "{name} שיתף/ה את הפוסט שלכם 🔄",
  },
} as const;

// Helper function to replace placeholders
export const formatMicrocopy = (text: string, replacements: Record<string, string | number>): string => {
  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    text
  );
};

// Accessibility: ARIA labels in Hebrew
export const ARIA_LABELS = {
  button: "כפתור",
  link: "קישור",
  image: "תמונה",
  input: "שדה קלט",
  checkbox: "תיבת סימון",
  radio: "בחירה",
  select: "רשימה נפתחת",
  dialog: "חלון קופץ",
  alert: "התראה",
  menu: "תפריט",
  navigation: "ניווט",
  main: "תוכן ראשי",
  search: "חיפוש",
  loading: "טוען",
} as const;
