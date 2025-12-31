import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PawPrint, Heart, Stethoscope, Users, ChevronRight } from "lucide-react";

interface OnboardingStep {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  features: { emoji: string; text: string }[];
  socialProof?: string;
}

const steps: OnboardingStep[] = [
  {
    id: 1,
    title: "הכל מתחיל באחריות 🐾",
    subtitle: "כי הם סומכים עליך — ואנחנו כאן לעזור",
    icon: <PawPrint className="w-14 h-14" />,
    iconBg: "bg-gradient-petid",
    features: [
      { emoji: "🐾", text: "ניהול פרופיל מלא לחיית המחמד" },
      { emoji: "📋", text: "מעקב בריאות וחיסונים" },
      { emoji: "💛", text: "קהילה תומכת של בעלי חיות" }
    ],
    socialProof: "50,000+ בעלי חיות כבר איתנו"
  },
  {
    id: 2,
    title: "כרטיס הזהות של החבר שלך",
    subtitle: "כל המידע החשוב במקום אחד",
    icon: <Heart className="w-14 h-14" />,
    iconBg: "bg-gradient-warm",
    features: [
      { emoji: "📸", text: "זיהוי גזע אוטומטי בעזרת AI" },
      { emoji: "📁", text: "שמירת מסמכים וטרינריים" },
      { emoji: "🔔", text: "תזכורות חכמות לטיפולים" }
    ]
  },
  {
    id: 3,
    title: "דאגה לטווח ארוך",
    subtitle: "לא חנות — מערכת ליווי",
    icon: <Stethoscope className="w-14 h-14" />,
    iconBg: "bg-petid-teal",
    features: [
      { emoji: "🎯", text: "המלצות מותאמות לגיל ולגזע" },
      { emoji: "⏰", text: "תזכורות להזמנה חוזרת" },
      { emoji: "💚", text: "ללא לחץ, ללא דחיפות" }
    ]
  },
  {
    id: 4,
    title: "חלק ממשפחה גדולה",
    subtitle: "קהילה שמבינה אותך",
    icon: <Users className="w-14 h-14" />,
    iconBg: "bg-petid-coral",
    features: [
      { emoji: "🌳", text: "מציאת גינות כלבים קרובות" },
      { emoji: "🏥", text: "המלצות על וטרינרים" },
      { emoji: "🐕", text: "אימוץ חיות שמחפשות בית" }
    ]
  }
];

export const OnboardingFlow = ({ onComplete }: { onComplete: () => void }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem("petid-onboarding-complete", "true");
    onComplete();
  };

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col" dir="rtl">
      {/* Header with skip and progress */}
      <div className="flex items-center justify-between px-4 pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          className="text-muted-foreground hover:text-foreground"
        >
          אולי אחר כך
        </Button>
        
        {/* Progress dots */}
        <div className="flex gap-2">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                index === currentStep 
                  ? "bg-primary w-6" 
                  : index < currentStep 
                    ? "bg-primary/50" 
                    : "bg-muted"
              }`}
              layout
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center max-w-sm"
          >
            {/* Icon with gradient background */}
            <motion.div
              className={`w-28 h-28 rounded-full ${step.iconBg} flex items-center justify-center text-white mb-6 shadow-elevated`}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", delay: 0.1, stiffness: 200 }}
            >
              {step.icon}
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-2xl font-bold text-foreground mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {step.title}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-muted-foreground mb-8 text-base"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {step.subtitle}
            </motion.p>

            {/* Features with emojis */}
            <motion.div
              className="space-y-3 w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {step.features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-3 bg-muted/50 rounded-xl p-4 border border-border/50"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <span className="text-xl">{feature.emoji}</span>
                  <span className="text-sm text-foreground font-medium">{feature.text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Social proof */}
            {step.socialProof && (
              <motion.p
                className="mt-6 text-sm text-primary font-medium flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                {step.socialProof}
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom button */}
      <div className="p-6 pb-safe">
        <Button
          onClick={handleNext}
          className="w-full h-14 text-base font-semibold rounded-2xl shadow-button"
          size="xl"
        >
          {isLastStep ? "בואו נתחיל 💛" : "הבא"}
          <ChevronRight className="w-5 h-5 mr-2" />
        </Button>

        {isLastStep && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-xs text-muted-foreground mt-4"
          >
            בלחיצה על "בואו נתחיל" אתה מסכים לתנאי השימוש ומדיניות הפרטיות
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default OnboardingFlow;
