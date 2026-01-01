import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Heart, Stethoscope, Users, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import petidIcon from "@/assets/petid-icon.png";

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
    title: "הכל מתחיל באחריות",
    subtitle: "כי הם סומכים עליך — ואנחנו כאן לעזור",
    icon: <img src={petidIcon} alt="Petid" className="w-12 h-12 object-contain" />,
    iconBg: "bg-white shadow-xl",
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
    icon: <Heart className="w-12 h-12" />,
    iconBg: "bg-gradient-to-br from-rose-400 via-pink-500 to-rose-500",
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
    icon: <Stethoscope className="w-12 h-12" />,
    iconBg: "bg-gradient-to-br from-teal-400 via-cyan-500 to-teal-500",
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
    icon: <Users className="w-12 h-12" />,
    iconBg: "bg-gradient-to-br from-orange-400 via-amber-500 to-orange-500",
    features: [
      { emoji: "🌳", text: "מציאת גינות כלבים קרובות" },
      { emoji: "🏥", text: "המלצות על וטרינרים" },
      { emoji: "🐕", text: "אימוץ חיות שמחפשות בית" }
    ]
  }
];

export const OnboardingFlow = ({ onComplete }: { onComplete: () => void }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
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

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -100 : 100,
      opacity: 0,
    }),
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-background via-background to-muted/30 z-50 flex flex-col" dir="rtl">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 left-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header with skip and progress */}
      <div className="relative flex items-center justify-between px-5 pt-safe pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          className="text-muted-foreground hover:text-foreground text-sm font-normal"
        >
          אולי אחר כך
        </Button>
        
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {steps.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => {
                setDirection(index > currentStep ? 1 : -1);
                setCurrentStep(index);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentStep 
                  ? "bg-primary w-6" 
                  : index < currentStep 
                    ? "bg-primary/40 w-1.5" 
                    : "bg-muted-foreground/20 w-1.5"
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex flex-col items-center text-center max-w-sm w-full"
          >
            {/* Icon with gradient background */}
            <motion.div
              className={`relative w-24 h-24 rounded-3xl ${step.iconBg} flex items-center justify-center text-white mb-8 shadow-lg`}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", delay: 0.1, stiffness: 200 }}
            >
              {step.icon}
              {/* Sparkle effect */}
              <motion.div
                className="absolute -top-1 -right-1"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Sparkles className="w-5 h-5 text-primary" />
              </motion.div>
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-2xl font-bold text-foreground mb-2 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {step.title}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-muted-foreground mb-8 text-base leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {step.subtitle}
            </motion.p>

            {/* Features with emojis */}
            <motion.div
              className="space-y-2.5 w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              {step.features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-4 bg-card rounded-2xl p-4 border border-border/50 shadow-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.08 }}
                  whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                >
                  <span className="text-2xl">{feature.emoji}</span>
                  <span className="text-sm text-foreground font-medium text-right flex-1">{feature.text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Social proof */}
            {step.socialProof && (
              <motion.div
                className="mt-8 flex items-center gap-2 text-sm text-primary font-medium bg-primary/10 px-4 py-2 rounded-full"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
              >
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                {step.socialProof}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom buttons */}
      <div className="relative p-5 pb-safe space-y-3">
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button
              onClick={handlePrev}
              variant="outline"
              className="h-14 px-5 rounded-2xl"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <Button
            onClick={handleNext}
            className="flex-1 h-14 text-base font-semibold rounded-2xl shadow-lg bg-primary hover:bg-primary/90"
          >
            {isLastStep ? "בואו נתחיל" : "הבא"}
            <ChevronRight className="w-5 h-5 mr-2" />
          </Button>
        </div>

        {isLastStep && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-xs text-muted-foreground"
          >
            בלחיצה על "בואו נתחיל" אתה מסכים ל
            <a href="/terms" className="text-primary hover:underline mx-1">תנאי השימוש</a>
            ול
            <a href="/privacy" className="text-primary hover:underline mx-1">מדיניות הפרטיות</a>
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default OnboardingFlow;
