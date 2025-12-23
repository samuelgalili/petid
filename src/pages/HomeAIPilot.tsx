import { useLanguage } from "@/contexts/LanguageContext";

const HomeAIPilot = () => {
  const { language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';

  return (
    <div 
      className="min-h-screen bg-background p-4"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-4">
          {isRTL ? 'פיילוט AI - בית' : 'AI Pilot - Home'}
        </h1>
        <p className="text-muted-foreground">
          {isRTL ? 'מסך פיילוט פנימי' : 'Internal pilot screen'}
        </p>
      </div>
    </div>
  );
};

export default HomeAIPilot;
