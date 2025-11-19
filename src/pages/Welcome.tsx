import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dog, Cat, Sparkles, ArrowLeft } from "lucide-react";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { useLanguage } from "@/contexts/LanguageContext";

const Welcome = () => {
  const [selectedPet, setSelectedPet] = useState<"dog" | "cat" | null>(null);
  const { setPetType } = usePetPreference();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const translations = {
    he: {
      welcome: "ברוכים הבאים",
      subtitle: "בחר את חיית המחמד שלך",
      description: "נתאים את החוויה במיוחד בשבילך",
      dog: "כלב",
      cat: "חתול",
      continue: "בואו נתחיל",
      dogDesc: "חברים נאמנים ומלאי אנרגיה",
      catDesc: "עצמאיים ומלאי קסם",
      skip: "דלג לעכשיו",
    },
    en: {
      welcome: "Welcome",
      subtitle: "Choose your pet",
      description: "We'll personalize your experience",
      dog: "Dog",
      cat: "Cat",
      continue: "Let's Start",
      dogDesc: "Loyal friends full of energy",
      catDesc: "Independent and full of charm",
      skip: "Skip for now",
    },
    ar: {
      welcome: "مرحبا",
      subtitle: "اختر حيوانك الأليف",
      description: "سنخصص تجربتك",
      dog: "كلب",
      cat: "قطة",
      continue: "لنبدأ",
      dogDesc: "أصدقاء مخلصون ومليئون بالطاقة",
      catDesc: "مستقلون ومليئون بالسحر",
      skip: "تخطي الآن",
    },
  };

  const t = translations[language];
  const isRTL = language === "he" || language === "ar";

  const handleContinue = () => {
    if (selectedPet) {
      setPetType(selectedPet);
      navigate("/home");
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-6 overflow-hidden relative"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-primary/10 rounded-full">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-sm font-semibold text-primary">חוויה מותאמת אישית</span>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-l from-foreground to-foreground/70 bg-clip-text">
            {t.welcome}
          </h1>
          <p className="text-xl text-muted-foreground mb-2">{t.subtitle}</p>
          <p className="text-sm text-muted-foreground">{t.description}</p>
        </div>

        {/* Pet Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Dog Card */}
          <Card
            onClick={() => setSelectedPet("dog")}
            className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] animate-slide-up ${
              selectedPet === "dog"
                ? "border-2 border-primary shadow-xl shadow-primary/20 bg-primary/5"
                : "border-2 border-border hover:border-primary/50 hover:shadow-lg"
            }`}
            style={{ animationDelay: '200ms' }}
          >
            <div className="absolute top-4 left-4 z-10">
              {selectedPet === "dog" && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center animate-scale-in">
                  <svg className="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
              <img
                src="https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=600&h=450&fit=crop"
                alt="Dog"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Dog className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">{t.dog}</h3>
              </div>
              <p className="text-muted-foreground">{t.dogDesc}</p>
            </div>
          </Card>

          {/* Cat Card */}
          <Card
            onClick={() => setSelectedPet("cat")}
            className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] animate-slide-up ${
              selectedPet === "cat"
                ? "border-2 border-primary shadow-xl shadow-primary/20 bg-primary/5"
                : "border-2 border-border hover:border-primary/50 hover:shadow-lg"
            }`}
            style={{ animationDelay: '300ms' }}
          >
            <div className="absolute top-4 left-4 z-10">
              {selectedPet === "cat" && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center animate-scale-in">
                  <svg className="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20">
              <img
                src="https://images.unsplash.com/photo-1574158622682-e40e69881006?w=600&h=450&fit=crop"
                alt="Cat"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Cat className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">{t.cat}</h3>
              </div>
              <p className="text-muted-foreground">{t.catDesc}</p>
            </div>
          </Card>
        </div>

        {/* Continue Button */}
        <Button
          onClick={handleContinue}
          disabled={!selectedPet}
          size="lg"
          className="w-full h-16 text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group animate-scale-in"
          style={{ animationDelay: '400ms' }}
        >
          {t.continue}
          <ArrowLeft className={`w-5 h-5 ${isRTL ? 'mr-2' : 'ml-2'} group-hover:translate-x-1 transition-transform`} />
        </Button>

        {/* Skip Option */}
        <div className="text-center mt-6 animate-fade-in" style={{ animationDelay: '500ms' }}>
          <button
            onClick={() => navigate("/home")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            {t.skip}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
