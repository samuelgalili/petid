import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dog, Cat, Heart, ShoppingBag, Bell, Camera, ChevronRight, Sparkles, X } from "lucide-react";

interface OnboardingStep {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
}

const steps: OnboardingStep[] = [
  {
    id: 1,
    title: "ברוכים הבאים ל-PetID",
    subtitle: "האפליקציה שמקשרת בינך לבין חיית המחמד שלך",
    icon: <Sparkles className="w-16 h-16" />,
    color: "from-primary to-primary-dark",
    features: [
      "ניהול פרופיל לחיית המחמד",
      "מעקב בריאות וחיסונים",
      "קהילה של בעלי חיות"
    ]
  },
  {
    id: 2,
    title: "הוסף את החיה שלך",
    subtitle: "צור פרופיל מלא עם תמונות ופרטים",
    icon: <Dog className="w-16 h-16" />,
    color: "from-amber-500 to-orange-500",
    features: [
      "זיהוי גזע אוטומטי בעזרת AI",
      "שמירת מסמכים וטרינריים",
      "תזכורות לחיסונים וטיפולים"
    ]
  },
  {
    id: 3,
    title: "גלה מוצרים מותאמים",
    subtitle: "חנות מותאמת לסוג ולגיל החיה שלך",
    icon: <ShoppingBag className="w-16 h-16" />,
    color: "from-emerald-500 to-teal-500",
    features: [
      "המלצות מותאמות אישית",
      "מבצעים בלעדיים",
      "משלוח מהיר"
    ]
  },
  {
    id: 4,
    title: "הצטרף לקהילה",
    subtitle: "שתף רגעים עם בעלי חיות אחרים",
    icon: <Heart className="w-16 h-16" />,
    color: "from-pink-500 to-rose-500",
    features: [
      "שיתוף תמונות וסטוריז",
      "מציאת גינות כלבים",
      "אימוץ חיות מחמד"
    ]
  }
];

export const OnboardingFlow = ({ onComplete }: { onComplete: () => void }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

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
      {/* Skip button */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          className="text-muted-foreground"
        >
          דלג
          <X className="w-4 h-4 mr-1" />
        </Button>
      </div>

      {/* Progress dots */}
      <div className="absolute top-4 right-4 flex gap-2">
        {steps.map((_, index) => (
          <motion.div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentStep ? "bg-primary" : "bg-muted"
            }`}
            initial={{ scale: 0.8 }}
            animate={{ scale: index === currentStep ? 1.2 : 1 }}
          />
        ))}
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
              className={`w-32 h-32 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white mb-8 shadow-lg`}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", delay: 0.1 }}
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
              className="text-muted-foreground mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {step.subtitle}
            </motion.p>

            {/* Features */}
            <motion.div
              className="space-y-3 w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {step.features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-3 bg-muted/50 rounded-lg p-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${step.color}`} />
                  <span className="text-sm text-foreground">{feature}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom button */}
      <div className="p-6 pb-safe">
        <Button
          onClick={handleNext}
          className="w-full h-12 text-base font-medium"
          size="lg"
        >
          {isLastStep ? "בואו נתחיל!" : "הבא"}
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
