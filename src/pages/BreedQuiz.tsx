/**
 * Breed Quiz - Interactive questionnaire to find the perfect breed match
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, ArrowRight, Home, Baby, Dog, Zap, Clock, 
  Scissors, Volume2, Heart, CheckCircle, RotateCcw, Sparkles,
  Building2, TreePine, Dumbbell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

interface BreedInfo {
  id: string;
  breed_name: string;
  breed_name_he: string | null;
  life_expectancy_years: string | null;
  description_he: string | null;
  affection_family: number | null;
  kids_friendly: number | null;
  dog_friendly: number | null;
  energy_level: number | null;
  trainability: number | null;
  grooming_freq: number | null;
  barking_level: number | null;
  size_category: string | null;
  apartment_friendly: boolean | null;
}

interface QuizAnswer {
  questionId: string;
  value: number | string;
}

interface Question {
  id: string;
  question: string;
  icon: React.ElementType;
  options: { label: string; value: number | string; icon?: React.ElementType }[];
}

const questions: Question[] = [
  {
    id: "living",
    question: "איפה אתה גר?",
    icon: Home,
    options: [
      { label: "דירה קטנה", value: "apartment", icon: Building2 },
      { label: "דירה גדולה", value: "large_apartment", icon: Building2 },
      { label: "בית עם חצר", value: "house", icon: TreePine },
    ]
  },
  {
    id: "kids",
    question: "יש ילדים בבית?",
    icon: Baby,
    options: [
      { label: "כן, קטנים (0-5)", value: 5 },
      { label: "כן, גדולים (6+)", value: 4 },
      { label: "לא", value: 2 },
    ]
  },
  {
    id: "other_pets",
    question: "יש חיות מחמד נוספות?",
    icon: Dog,
    options: [
      { label: "כלב/ים", value: 4 },
      { label: "חתול/ים", value: 3 },
      { label: "אין", value: 2 },
    ]
  },
  {
    id: "activity",
    question: "כמה פעילות גופנית אתה מוכן להשקיע ביום?",
    icon: Dumbbell,
    options: [
      { label: "מעט (15-30 דק')", value: 2 },
      { label: "בינוני (30-60 דק')", value: 3 },
      { label: "הרבה (60+ דק')", value: 5 },
    ]
  },
  {
    id: "time",
    question: "כמה זמן תוכל להקדיש לכלב ביום?",
    icon: Clock,
    options: [
      { label: "1-2 שעות", value: 2 },
      { label: "3-5 שעות", value: 3 },
      { label: "רוב היום בבית", value: 5 },
    ]
  },
  {
    id: "grooming",
    question: "כמה זמן מוכן להשקיע בטיפוח?",
    icon: Scissors,
    options: [
      { label: "מינימלי", value: 1 },
      { label: "פעם בשבוע", value: 3 },
      { label: "יומיומי - בסדר!", value: 5 },
    ]
  },
  {
    id: "noise",
    question: "איך אתה מתייחס לנביחות?",
    icon: Volume2,
    options: [
      { label: "צריך להיות שקט", value: 1 },
      { label: "קצת זה בסדר", value: 3 },
      { label: "לא מפריע לי", value: 5 },
    ]
  },
];

const BreedQuiz = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [showResults, setShowResults] = useState(false);

  const { data: allBreeds } = useQuery({
    queryKey: ["quiz-breeds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("breed_information")
        .select(`
          id, breed_name, breed_name_he, life_expectancy_years, description_he,
          affection_family, kids_friendly, dog_friendly, energy_level,
          trainability, grooming_freq, barking_level, size_category, apartment_friendly
        `)
        .eq("pet_type", "dog")
        .eq("is_active", true);

      if (error) throw error;
      return data as BreedInfo[];
    },
  });

  const progress = ((currentStep + 1) / questions.length) * 100;
  const currentQuestion = questions[currentStep];

  const handleAnswer = (value: number | string) => {
    const newAnswers = [...answers.filter(a => a.questionId !== currentQuestion.id)];
    newAnswers.push({ questionId: currentQuestion.id, value });
    setAnswers(newAnswers);

    if (currentStep < questions.length - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 300);
    } else {
      setShowResults(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getSelectedValue = (questionId: string) => {
    return answers.find(a => a.questionId === questionId)?.value;
  };

  // Calculate breed matches based on answers
  const calculateMatches = () => {
    if (!allBreeds) return [];

    const getAnswer = (id: string) => answers.find(a => a.questionId === id)?.value;

    const living = getAnswer("living");
    const kidsScore = getAnswer("kids") as number || 3;
    const otherPetsScore = getAnswer("other_pets") as number || 3;
    const activityScore = getAnswer("activity") as number || 3;
    const groomingTolerance = getAnswer("grooming") as number || 3;
    const noiseTolerance = getAnswer("noise") as number || 3;

    return allBreeds.map(breed => {
      let score = 0;
      let maxScore = 0;

      // Living situation
      if (living === "apartment" || living === "large_apartment") {
        if (breed.apartment_friendly) score += 20;
        if (breed.size_category === "small" || breed.size_category === "קטן") score += 10;
        maxScore += 30;
      } else {
        score += 20; // Houses work for all breeds
        maxScore += 20;
      }

      // Kids compatibility
      if (breed.kids_friendly) {
        const diff = 5 - Math.abs(breed.kids_friendly - kidsScore);
        score += diff * 4;
      }
      maxScore += 20;

      // Other pets
      if (breed.dog_friendly) {
        const diff = 5 - Math.abs(breed.dog_friendly - otherPetsScore);
        score += diff * 3;
      }
      maxScore += 15;

      // Activity level match
      if (breed.energy_level) {
        const diff = 5 - Math.abs(breed.energy_level - activityScore);
        score += diff * 5;
      }
      maxScore += 25;

      // Grooming tolerance
      if (breed.grooming_freq) {
        if (breed.grooming_freq <= groomingTolerance) {
          score += 15;
        } else {
          score += Math.max(0, 15 - (breed.grooming_freq - groomingTolerance) * 5);
        }
      }
      maxScore += 15;

      // Noise tolerance
      if (breed.barking_level) {
        if (breed.barking_level <= noiseTolerance) {
          score += 15;
        } else {
          score += Math.max(0, 15 - (breed.barking_level - noiseTolerance) * 5);
        }
      }
      maxScore += 15;

      const matchPercentage = Math.round((score / maxScore) * 100);

      return {
        ...breed,
        matchScore: matchPercentage
      };
    }).sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
  };

  const resetQuiz = () => {
    setAnswers([]);
    setCurrentStep(0);
    setShowResults(false);
  };

  if (showResults) {
    const matches = calculateMatches();

    return (
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/30 px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold">הגזעים המתאימים לך</h1>
            <Button variant="ghost" size="icon" onClick={resetQuiz}>
              <RotateCcw className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="px-4 py-6">
          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-1">מצאנו התאמות!</h2>
            <p className="text-sm text-muted-foreground">
              {matches.length} גזעים מתאימים לסגנון החיים שלך
            </p>
          </motion.div>

          {/* Results */}
          <div className="space-y-3">
            {matches.map((breed, index) => (
              <motion.div
                key={breed.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => navigate(`/breeds?search=${breed.breed_name}`)}
                className="bg-card border border-border/30 rounded-2xl p-4 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                      index === 1 ? 'bg-gray-400/20 text-gray-500' :
                      index === 2 ? 'bg-orange-400/20 text-orange-500' :
                      'bg-primary/10 text-primary'
                    }`}>
                      <span className="font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{breed.breed_name_he || breed.breed_name}</h3>
                      {breed.breed_name_he && (
                        <p className="text-xs text-muted-foreground">{breed.breed_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-primary">{breed.matchScore}%</span>
                    <p className="text-xs text-muted-foreground">התאמה</p>
                  </div>
                </div>

                <Progress value={breed.matchScore} className="h-2" />

                {breed.description_he && (
                  <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                    {breed.description_he}
                  </p>
                )}
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-3">
            <Button onClick={() => navigate("/breeds")} className="w-full">
              עיין באנציקלופדיה המלאה
            </Button>
            <Button variant="outline" onClick={resetQuiz} className="w-full gap-2">
              <RotateCcw className="w-4 h-4" />
              התחל מחדש
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/30 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" onClick={() => currentStep === 0 ? navigate(-1) : handleBack()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm text-muted-foreground">
            שאלה {currentStep + 1} מתוך {questions.length}
          </span>
          <div className="w-10" />
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Question */}
      <div className="flex-1 px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Question Icon & Text */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <currentQuestion.icon className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">{currentQuestion.question}</h2>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const isSelected = getSelectedValue(currentQuestion.id) === option.value;
                return (
                  <motion.button
                    key={String(option.value)}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAnswer(option.value)}
                    className={`w-full p-4 rounded-2xl border-2 text-right flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border/50 bg-card hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {option.icon && <option.icon className="w-5 h-5 text-muted-foreground" />}
                      <span className="font-medium">{option.label}</span>
                    </div>
                    {isSelected && <CheckCircle className="w-5 h-5 text-primary" />}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="p-4 border-t border-border/30 flex gap-3">
        {currentStep > 0 && (
          <Button variant="outline" onClick={handleBack} className="gap-2">
            <ArrowRight className="w-4 h-4" />
            הקודם
          </Button>
        )}
        {getSelectedValue(currentQuestion.id) && currentStep < questions.length - 1 && (
          <Button onClick={() => setCurrentStep(currentStep + 1)} className="flex-1 gap-2">
            הבא
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        {getSelectedValue(currentQuestion.id) && currentStep === questions.length - 1 && (
          <Button onClick={() => setShowResults(true)} className="flex-1 gap-2">
            <Sparkles className="w-4 h-4" />
            הצג תוצאות
          </Button>
        )}
      </div>
    </div>
  );
};

export default BreedQuiz;
