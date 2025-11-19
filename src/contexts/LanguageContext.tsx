import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "he" | "en" | "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  direction: "rtl" | "ltr";
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved as Language) || "he";
  });

  const direction = language === "en" ? "ltr" : "rtl";

  useEffect(() => {
    localStorage.setItem("language", language);
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [language, direction]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    const keys = key.split(".");
    let value: any = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, direction }}>
      {children}
    </LanguageContext.Provider>
  );
};

const translations = {
  he: {
    settings: {
      title: "הגדרות",
      account: "חשבון",
      preferences: "העדפות",
      privacySecurity: "פרטיות ואבטחה",
      info: "מידע",
      profile: "פרופיל אישי",
      profileDesc: "ערוך את הפרטים האישיים שלך",
      notifications: "התראות",
      notificationsDesc: "קבל עדכונים על חיית המחמד שלך",
      darkMode: "מצב כהה",
      darkModeDesc: "שנה את מראה האפליקציה",
      location: "מיקום",
      locationDesc: "אפשר שירותי מיקום",
      language: "שפה",
      languageDesc: "בחר את שפת האפליקציה",
      privacy: "פרטיות",
      privacyDesc: "נהל את ההגדרות שלך",
      about: "אודות",
      aboutDesc: "גרסה 1.0.0",
      logout: "התנתק",
      edit: "ערוך",
      appName: "Pet Care App",
      version: "גרסה 1.0.0",
    },
    languages: {
      he: "עברית",
      en: "English",
      ar: "العربية",
    },
  },
  en: {
    settings: {
      title: "Settings",
      account: "Account",
      preferences: "Preferences",
      privacySecurity: "Privacy & Security",
      info: "Information",
      profile: "Personal Profile",
      profileDesc: "Edit your personal details",
      notifications: "Notifications",
      notificationsDesc: "Receive updates about your pet",
      darkMode: "Dark Mode",
      darkModeDesc: "Change the app appearance",
      location: "Location",
      locationDesc: "Enable location services",
      language: "Language",
      languageDesc: "Choose your app language",
      privacy: "Privacy",
      privacyDesc: "Manage your settings",
      about: "About",
      aboutDesc: "Version 1.0.0",
      logout: "Logout",
      edit: "Edit",
      appName: "Pet Care App",
      version: "Version 1.0.0",
    },
    languages: {
      he: "עברית",
      en: "English",
      ar: "العربية",
    },
  },
  ar: {
    settings: {
      title: "الإعدادات",
      account: "الحساب",
      preferences: "التفضيلات",
      privacySecurity: "الخصوصية والأمان",
      info: "معلومات",
      profile: "الملف الشخصي",
      profileDesc: "تعديل بياناتك الشخصية",
      notifications: "الإشعارات",
      notificationsDesc: "احصل على تحديثات عن حيوانك الأليف",
      darkMode: "الوضع الداكن",
      darkModeDesc: "تغيير مظهر التطبيق",
      location: "الموقع",
      locationDesc: "تمكين خدمات الموقع",
      language: "اللغة",
      languageDesc: "اختر لغة التطبيق",
      privacy: "الخصوصية",
      privacyDesc: "إدارة إعداداتك",
      about: "حول",
      aboutDesc: "الإصدار 1.0.0",
      logout: "تسجيل الخروج",
      edit: "تعديل",
      appName: "تطبيق رعاية الحيوانات الأليفة",
      version: "الإصدار 1.0.0",
    },
    languages: {
      he: "עברית",
      en: "English",
      ar: "العربية",
    },
  },
};
